#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { runSilently } from './utils/subprocess.js'


const HELP = `
SYNOPSIS
  netsnacks time [options] <url>

DESCRIPTION
  Measures the time taken for each phase of an HTTP request using curl's
  timing variables, including DNS lookup, TCP and TLS handshakes, redirect
  time, time to first byte, and total transfer time.

OPTIONS
  --h1          Use HTTP/1.1
  --h2          Use HTTP/2 (default)
  --h3          Use HTTP/3
  -j, --json    Output JSON instead of a table
  -h, --help

EXAMPLE
  netsnacks time -h3 https://example.com
`.trim()


async function main() {
	const { values, positionals } = parseArgs({
		options: {
			h1: { type: 'boolean' },
			h2: { type: 'boolean' },
			h3: { type: 'boolean' },
			json: { short: 'j', type: 'boolean' },
			help: { short: 'h', type: 'boolean' },
		},
		allowPositionals: true
	})

	if (values.help) {
		console.log(HELP)
		return
	}

	const { h1, h2, h3, json } = values
	const url = positionals[0]
	if (!url) throw new Error('No URL specified. See netsnacks time --help')
	if (positionals.length > 1) throw new Error('Too many URLs')
	if ([h1, h2, h3].filter(Boolean).length > 1) throw new Error('--h1, --h2, --h3 are mutually exclusive')

	const result = await time(url, values)
	if (json)
		console.log(JSON.stringify(result, null, 2))
	else {
		const { http_version, ...data } = result
		console.log(`http_version: ${http_version}`)
		console.table(data)
	}
}

async function time(url, opts = {}) {
	let hFlag = '--http2'
	if (opts.h1) hFlag = '--http1.1'
	if (opts.h3) hFlag = '--http3'

	const format = `{
  "http_version": "%{http_version}",
  "dns_lookup": %{time_namelookup},
  "tcp_handshake": %{time_connect},
  "tls_handshake": %{time_appconnect},
  "wait": %{time_pretransfer},
  "first_byte": %{time_starttransfer},
  "download": %{time_total}
}` // https://stackoverflow.com/a/47944496

	const { stdout } = (await runSilently('curl', [
		'-so', '/dev/null',
		'--show-error',
		'-w', format,
		hFlag,
		url
	]))
	const { http_version, ...cumulative } = JSON.parse(stdout)
	return {
		http_version,
		...measureCurlTimings(cumulative)
	}
}

export function measureCurlTimings(timings) {
	const fmt = n => Number(n.toFixed(6))

	const res = {}
	let prevNonZero = 0 // because tls_handshake=0 in non-https requests
	for (const [k, v] of Object.entries(timings))
		if (v === 0)
			res[k] = {
				time: 0,
				cumulative: fmt(prevNonZero)
			}
		else {
			res[k] = {
				time: fmt(v - prevNonZero),
				cumulative: fmt(v)
			}
			prevNonZero = v
		}
	return res
}


if (import.meta.main)
	main().catch(err => {
		console.error(err.message)
		process.exit(1)
	})
