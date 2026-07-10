import { request } from 'node:https'
import { parseOptions } from './utils/parseOptions.js'

const PORT = 443
const TIMEOUT_SEC = 2
const FAMILY = 4
const METHOD = 'HEAD'

const HELP = `
USAGE
  netsnacks skipdns [options] <host> <ip>

DESCRIPTION
  Sends a HEAD request to a TLS domain using a specific IP address.
  
OPTIONS
	-t, --timeout <seconds>  Default: ${TIMEOUT_SEC}
	-p, --port <num>         Default: ${PORT}
	-m, --method <string>    Default: ${METHOD}
	-f, --family <num>       Default: ${FAMILY}

EXAMPLE
  netsnacks skipdns example.com 192.0.2.2
`

export default async function main() {
	const { values, positionals, usage } = parseOptions(HELP, {
		timeout: { short: 't', default: String(TIMEOUT_SEC) },
		family: { short: 'f', default: String(FAMILY) },
		port: { short: 'p', default: String(PORT) },
		method: { short: 'm', default: METHOD },
	})

	const [host, ip] = positionals
	if (!host) throw usage('No host specified')
	if (!ip) throw usage('No IP specified')

	const port = parseInt(values.port, 10)
	const timeout = parseInt(values.timeout, 10) * 1000
	const family = parseInt(values.family, 10)
	const method = values.method

	console.log(await skipdns({
		url: `https://${host}`,
		ip,
		port,
		timeout,
		family,
		method
	}))
}

export function skipdns({
	url,
	ip,
	port = PORT,
	family = FAMILY,
	method = METHOD,
	timeout = TIMEOUT_SEC * 1000
}) {
	return new Promise((resolve, reject) => {
		const req = request(url, {
				method,
				timeout,
				port,
				lookup(_, options, resolveDNS) {
					resolveDNS(null, [{ address: ip, family }])
				}
			},
			response => {
				resolve(response.statusCode)
			}
		)
		req.on('error', reject)
		req.on('timeout', () => req.destroy())
		req.end()
	})
}
