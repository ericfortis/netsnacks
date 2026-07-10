import { runSilently } from './utils/subprocess.js'
import { parseOptions } from './utils/parseOptions.js'


const HELP = `
USAGE
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
	const { values, positionals, usage } = parseOptions(HELP, {
		h1: { type: 'boolean', default: false },
		h2: { type: 'boolean', default: false },
		h3: { type: 'boolean', default: false },
		4: { type: 'boolean', default: false },
		6: { type: 'boolean', default: false },
		json: { type: 'boolean', default: false, short: 'j' },
	})

	const [url] = positionals
	if (!url) throw usage('No URL specified')
	if (positionals.length > 1) throw usage('Too many URLs')
	if ((values['4'] + values['6']) > 1) throw usage('Cannot use both -4 and -6')
	if ((values.h1 + values.h2 + values.h3) > 1) throw usage('Cannot use more than one of --h1, --h2, --h3')

	let ipVersion = -1
	if (values['4']) ipVersion = 4
	if (values['6']) ipVersion = 6

	let httpVersion = -1
	if (values.h1) httpVersion = 1
	if (values.h2) httpVersion = 2
	if (values.h3) httpVersion = 3

	const result = await time(url, httpVersion, ipVersion)
	if (values.json)
		console.log(JSON.stringify(result, null, 2))
	else {
		const { times, ...meta } = result
		console.log(meta)
		console.table(times)
	}
}

export async function time(url, httpVersion, ipVersion) {
	const hFlag = {
		1: '--http1.1',
		2: '--http2',
		3: '--http3-only',
	}[httpVersion]

	const ipFlag = {
		4: '-4',
		6: '-6',
	}[ipVersion]

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

	const { stdout } = await runSilently('curl', [
		'-so', '/dev/null',
		'--show-error',
		'-w', format,
		hFlag || [],
		ipFlag || [],
		url
	].flat())
	const { ip, status, http_version, ...cumulative } = JSON.parse(stdout)
	return {
		ip,
		status,
		http_version,
		times: measureCurlTimings(cumulative)
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
