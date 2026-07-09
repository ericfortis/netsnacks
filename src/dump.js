import { spawn } from 'node:child_process'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSilently } from './utils/subprocess.js'
import { parseOptions } from './utils/parseOptions.js'

const INTERFACE = 'en0'
const F_DUMP = 'dump.pcap'
const F_SSLKEY = 'sslkey.log'

const HELP = `

SYNOPSIS
  netsnacks dump [options] <url>

DESCRIPTION
	Lets you analyze encrypted requests in clear text in Wireshark

OPTIONS
  -4                      IPv4
  -6                      IPv6
  --h1                    HTTP/1.1
  --h2                    HTTP/2
  --h3                    HTTP/3
  -i, --interface <name>  Network interface to capture. Default: ${INTERFACE}
  --no-open                Do not open Wireshark after capture

EXAMPLE
  netsnacks dump -i en0 -6 --h2 https://example.com
`

export default async function main() {
	const { values, positionals } = parseOptions(HELP, {
		interface: { short: 'i', type: 'string', default: INTERFACE },
		h1: { type: 'boolean', default: false },
		h2: { type: 'boolean', default: false },
		h3: { type: 'boolean', default: false },
		4: { type: 'boolean', default: false },
		6: { type: 'boolean', default: false },
		'no-open': { type: 'boolean', default: false },
	})

	const url = positionals[0]
	if (!url) throw 'No URL specified' + HELP
	if (positionals.length > 1) throw 'Too many URLs' + HELP
	if (values['4'] && values['6']) throw 'Cannot use both -4 and -6' + HELP
	if ((values.h1 + values.h2 + values.h3) > 1) throw 'Cannot use more than one of -h1, -h2, -h3' + HELP

	let httpVersion = -1
	if (values.h1) httpVersion = 1
	if (values.h2) httpVersion = 2
	if (values.h3) httpVersion = 3

	let ipVersion = -1
	if (values['4']) ipVersion = 4
	if (values['6']) ipVersion = 6

	const dir = await dump(url, httpVersion, ipVersion, values.interface)
	console.log(`Saved in: file://${dir}/`)

	const analyzer = writeWiresharkOpenerScript(dir)
	if (!values['no-open'] && process.platform === 'darwin') {
		spawn('open', [dir], { stdio: 'ignore', detached: true }).unref()
		spawn(analyzer)
	}
}

export async function dump(url, httpVersion = -1, ipVersion = -1, iface = INTERFACE) {
	const dir = mkdtempSync(join(tmpdir(), 'dump'))
	const pcapFile = join(dir, F_DUMP)
	const keylogFile = join(dir, F_SSLKEY)

	let hFlag = ''
	if (httpVersion === 1) hFlag = '--http1.1'
	if (httpVersion === 2) hFlag = '--http2'
	if (httpVersion === 3) hFlag = '--http3-only'

	let ipFlag = ''
	if (ipVersion === 4) ipFlag = '-4'
	if (ipVersion === 6) ipFlag = '-6'


	const tcpdump = spawn('tcpdump', [
		'-i', iface, // root is not needed because we pass an interface
		'--immediate-mode',
		'-w', pcapFile
	], { stdio: ['ignore', 'ignore', 'pipe'] })

	await new Promise((resolve, reject) => {
		tcpdump.on('error', reject)
		tcpdump.stderr.once('data', chunk => {
			if (/^tcpdump: listening on/m.test(chunk.toString()))
				resolve()
		})
	})

	await runSilently('curl', [
		'-so', '/dev/null',
		'--show-error',
		hFlag || [],
		ipFlag || [],
		url
	].flat(), undefined, { SSLKEYLOGFILE: keylogFile })

	tcpdump.kill('SIGTERM')
	await new Promise(resolve => tcpdump.on('close', resolve))
	return dir
}


// This automates configuring: Wireshark -> Preferences -> Protocols -> TLS -> (Pre)-Master-Secret log filename
function writeWiresharkOpenerScript(dir) {
	const scriptPath = join(dir, 'open-in-wireshark.sh')
	writeFileSync(scriptPath, `#!/bin/sh
cd "$(dirname "$0")"
open -a Wireshark --args -r "$PWD/${F_DUMP}" -o "tls.keylog_file:$PWD/${F_SSLKEY}"
`)
	chmodSync(scriptPath, 0o755)
	return scriptPath
}
