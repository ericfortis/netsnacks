import { runSilently } from './utils/subprocess.js'
import { parseOptions } from './utils/parseOptions.js'


const HELP = `

SYNOPSIS
  netsnacks time [options] <url>

DESCRIPTION
  Measures the time taken for each phase of an HTTP request using curl's
  timing variables, including DNS lookup, TCP and TLS handshakes, redirect
  time, time to first byte, and total transfer time.

OPTIONS
  -4          IPv4
  -6          IPv6
  --h1        HTTP/1.1
  --h2        HTTP/2
  --h3        HTTP/3
  -j, --json  Output JSON instead of a table

EXAMPLE
  netsnacks time -6 --h2 https://example.com
`

export default async function main() {
	const { values, positionals } = parseOptions(HELP, {
		h1: { type: 'boolean' },
		h2: { type: 'boolean' },
		h3: { type: 'boolean' },
		4: { type: 'boolean' },
		6: { type: 'boolean' },
		json: { short: 'j', type: 'boolean' },
	})

	const url = positionals[0]
	if (!url) throw 'No URL specified' + HELP
	if (positionals.length > 1) throw 'Too many URLs' + HELP
	if (values['4'] && values['6']) throw 'Cannot use both -4 and -6' + HELP
	if ((values.h1 + values.h2 + values.h3) > 1) throw 'Cannot use more than one of -h1, -h2, -h3' + HELP

	let httpVersion = ''
	if (values.h1) httpVersion = 1
	if (values.h2) httpVersion = 2
	if (values.h3) httpVersion = 3

	let ipVersion = ''
	if (values['4']) ipVersion = 4
	if (values['6']) ipVersion = 6

	const result = await time(url, httpVersion, ipVersion)
	if (values.json)
		console.log(JSON.stringify(result, null, 2))
	else {
		const { ip, http_version, status, ...data } = result
		console.table({ ip, status, http_version })
		console.table(data)
	}
}

export async function time(url, httpVersion, ipVersion) {
	let hFlag = ''
	if (httpVersion === 1) hFlag = '--http1.1'
	if (httpVersion === 2) hFlag = '--http2'
	if (httpVersion === 3) hFlag = '--http3-only'

	let ipFlag = ''
	if (ipVersion === 4) ipFlag = '-4'
	if (ipVersion === 6) ipFlag = '-6'

	const format = `{
  "ip": "%{remote_ip}",
  "status": %{http_code},
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
		hFlag || [],
		ipFlag || [],
		url
	].flat()))
	const { ip, http_version, status, ...cumulative } = JSON.parse(stdout)
	return {
		ip,
		status,
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
				time: fmt(Math.max(0, v - prevNonZero)),
				cumulative: fmt(v)
			}
			prevNonZero = v
		}
	return res
}
