#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { runSilently } from './utils/subprocess.js'


const HELP = `
SYNOPSIS
  netsnacks skipdns [options] <host> <ip>

DESCRIPTION
  Sends a HEAD request to a TLS domain using a specific IP address.
  
OPTIONS
	-t, --timeout <seconds>  Default: 2
	-p, --port <num>         Default: 443

EXAMPLE
  netsnacks skipdns example.com 192.0.2.2
`.trim()


async function main() {
	const { values, positionals } = parseArgs({
		options: {
			help: { short: 'h', type: 'boolean' },
			timeout: { short: 't', default: '2' },
			port: { short: 'p', default: '443' },
		},
		allowPositionals: true
	})

	if (values.help) {
		console.log(HELP)
		return
	}

	const [host, ip] = positionals
	if (!host) throw new Error('No host specified')
	if (!ip) throw new Error('No IP specified')

	console.log(await skipdns(host, ip, values.timeout, values.port))
}

async function skipdns(host, ip, timeout, port) {
	return (await runSilently('curl', [
		'-so', '/dev/null',
		'--max-time', timeout,
		'--head',
		'--write-out', '%{http_code}',
		'--resolve', `${host}:${port}:${ip}`,
		`https://${host}`
	])).stdout
}

main().catch(err => {
	console.error(err.message)
	process.exit(1)
})
