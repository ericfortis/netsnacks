import { runSilently } from './utils/subprocess.js'
import { parseOptions } from './utils/parseOptions.js'


const HTTP_VERSION = 2

const HELP = `
SYNOPSIS
  netsnacks time [options] <url>

DESCRIPTION
  Measures the time taken for each phase of an HTTP request using curl's
  timing variables, including DNS lookup, TCP and TLS handshakes, redirect
  time, time to first byte, and total transfer time.

OPTIONS
  --http-version <1|2|3>  Default: ${HTTP_VERSION}
  -j, --json              Output JSON instead of a table

EXAMPLE
  netsnacks time -H3 https://example.com
`

export default async function main() {
	const { values, positionals } = parseOptions(HELP, {
		'http-version': { short: 'H', type: 'string', default: String(HTTP_VERSION) },
		json: { short: 'j', type: 'boolean' },
	})

	const url = positionals[0]
	const httpVersion = Number(values['http-version'])

	if (!url) throw new Error('No URL specified. See netsnacks time --help')
	if (positionals.length > 1) throw new Error('Too many URLs')
	if (![1, 2, 3].includes(httpVersion)) throw new Error('Invalid --http-version')

	const result = await time(url, httpVersion)
	if (values.json)
		console.log(JSON.stringify(result, null, 2))
	else {
		const { http_version, ...data } = result
		console.log(`http_version: ${http_version}`)
		console.table(data)
	}
}

export async function time(url, httpVersion = HTTP_VERSION) {
	let hFlag = HTTP_VERSION
	if (httpVersion === 1) hFlag = '--http1.1'
	if (httpVersion === 2) hFlag = '--http2'
	if (httpVersion === 3) hFlag = '--http3'

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
	for (const [phase, v] of Object.entries(timings))
		if (v === 0)
			res[phase] = {
				time: 0,
				cumulative: fmt(prevNonZero)
			}
		else {
			res[phase] = {
				time: fmt(v - prevNonZero),
				cumulative: fmt(v)
			}
			prevNonZero = v
		}
	return res
}
