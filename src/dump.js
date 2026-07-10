import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { chmodSync, writeFileSync } from 'node:fs'
import { mkTempDir, openFileExplorer } from './utils/fs.js'
import { runSilently } from './utils/subprocess.js'
import { parseOptions } from './utils/parseOptions.js'


const INTERFACE = 'en0'
const F_DUMP = 'dump.pcap'
const F_SSLKEY = 'sslkey.log'

const HELP = `
USAGE
  netsnacks dump [-i interface] [-4 | -6] [--h1 | --h2 | --h3] [--no-open] <url>

DESCRIPTION
  Lets you analyze encrypted requests in clear text in Wireshark.
  It’s like Wireshark > Tools > TLS Keylog Launcher. 
  But organizes runs in folders, and lets you capture in systems without Wireshark.
  
  It runs tcpdump and curl, and creates a folder with three files:
    1. The captured traffic
    2. The TLS secrets needed for decryption
    3. A script to load them in Wireshark

OPTIONS
  -i, --interface <name>  Default: ${INTERFACE}
  -4                      IPv4
  -6                      IPv6
  --h1                    HTTP/1.1
  --h2                    HTTP/2
  --h3                    HTTP/3
  --no-open               Do not open Wireshark after capture

EXAMPLE
  netsnacks dump -i en0 -6 --h2 https://example.com
`

export default async function main() {
	const { values, positionals, usage } = parseOptions(HELP, {
		interface: { short: 'i', type: 'string', default: INTERFACE },
		h1: { type: 'boolean', default: false },
		h2: { type: 'boolean', default: false },
		h3: { type: 'boolean', default: false },
		4: { type: 'boolean', default: false },
		6: { type: 'boolean', default: false },
		open: { type: 'boolean', default: true },
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

	const dir = await dump(url, httpVersion, ipVersion, values.interface)
	console.log('Saved in:')
	console.log(dir)

	const analyzer = writeWiresharkOpenerScript(dir)
	if (values.open && process.platform === 'darwin') {
		openFileExplorer(dir)
		spawn(analyzer)
	}
}

export async function dump(url, httpVersion = -1, ipVersion = -1, iface = INTERFACE) {
	const dir = mkTempDir('netsnacks-dump-')
	const pcapFile = join(dir, F_DUMP)
	const keylogFile = join(dir, F_SSLKEY)

	const hFlag = {
		1: '--http1.1',
		2: '--http2',
		3: '--http3-only',
	}[httpVersion]

	const ipFlag = {
		4: '-4',
		6: '-6',
	}[ipVersion]

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


// Automates: Wireshark > Preferences > Protocols > TLS > (Pre)-Master-Secret log filename
function writeWiresharkOpenerScript(dir) {
	const scriptPath = join(dir, 'open-in-wireshark.sh')
	writeFileSync(scriptPath, `#!/bin/sh
cd "$(dirname "$0")"
open -na Wireshark --args -r "$PWD/${F_DUMP}" -o "tls.keylog_file:$PWD/${F_SSLKEY}"
`)
	chmodSync(scriptPath, 0o755)
	return scriptPath
}
