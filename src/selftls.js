import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { isIPv4, isIPv6 } from 'node:net'
import { runSilently } from './utils/subprocess.js'
import { parseOptions } from './utils/parseOptions.js'


const HELP = `

SYNOPSIS
  netsnacks selftls [options] <domain>

DESCRIPTION
  Creates a self-signed TLS certificate.

OPTIONS
  --alt <domains>   Comma-separated Subject Alternative Names (SANs)
  --outdir <dir>    Output directory for files (defaults to current working directory)

EXAMPLES
  netsnacks selftls localhost
  netsnacks selftls localhost --alt=127.0.0.1
  netsnacks selftls foo.example.com --alt=bar.example.com,*.baz.example.com,192.0.2.3
 
INSTALL ON MACOS
  - Open "Keychain Access" App
  - Drop the generated *.cert file onto the "login" keychains section
  - Double-click that newly added cert item
  - Expand "Trust" > SSL > Select "Always Trust"
`

export default async function main() {
	const { values, positionals } = parseOptions(HELP, {
		alt: { type: 'string' },
		outdir: { type: 'string' },
	})

	const domain = positionals[0]
	const dir = values.outdir || '.'
	const keyFile = join(dir, `${domain}.key`)
	const certFile = join(dir, `${domain}.cert`)

	const altNames = values.alt
		? values.alt.split(',').map(s => s.trim()).filter(Boolean)
		: []

	if (!domain) throw 'Missing domain. See: netsnacks selftls --help' + HELP
	if (positionals.length > 1) throw 'Too many domains' + HELP
	if (existsSync(keyFile)) throw `Found existing key: ${keyFile}` + HELP
	if (existsSync(certFile)) throw `Found existing cert: ${certFile}` + HELP

	await selftls({ keyFile, certFile, domain, altNames })
}

export async function selftls({ keyFile, certFile, domain, altNames }) {
	const conf = config(domain, altNames)
	try {
		await runSilently('openssl', [
			'req',
			'-newkey', 'ec',
			'-pkeyopt', 'ec_paramgen_curve:P-256',
			'-x509',
			'-nodes', // No DES. Don't encrypt private key
			'-config', '/dev/stdin',
			'-keyout', keyFile,
			'-out', certFile,
			'-days', 365 * 3,
		], conf)
	}
	catch (err) {
		throw new Error(err.message)
	}
}

function config(domain, alt) {
	let iDns = 0
	let iIp = 0
	const altNames = [domain, ...alt].map(name =>
		isIPv4(name) || isIPv6(name)
			? `IP.${++iIp} = ${name}`
			: `DNS.${++iDns} = ${name}`
	).join('\n')

	return `
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = ${domain}

[v3_req]
subjectAltName = @alt_names

[alt_names]
${altNames}
`
}
