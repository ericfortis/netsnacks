#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { existsSync } from 'node:fs'
import { isIPv4, isIPv6 } from 'node:net'
import { runSilently } from './utils/subprocess.js'


const HELP = `
SYNOPSIS
  netsnacks selftls [options] <domain>

DESCRIPTION
  Creates a self-signed TLS certificate.

OPTIONS
  --alt <domains>   Comma-separated Subject Alternative Names (SANs)

EXAMPLES
  netsnacks selftls localhost
  netsnacks selftls localhost --alt=127.0.0.1
  netsnacks selftls foo.example.com --alt=bar.example.com,*.foo.example.com,192.0.2.3
 
INSTALL
  - Open "Keychain Access" App
  - Login section. Drop the generated *.cert
  - Double-click that newly added cert row, and expand "Trust" > SSL > Always Trust
`.trim()


async function main() {
	const { values, positionals } = parseArgs({
		options: {
			alt: { type: 'string' },
			help: { short: 'h', type: 'boolean' },
		},
		allowPositionals: true
	})

	if (values.help) {
		console.log(HELP)
		return
	}

	const domain = positionals[0]
	const keyFile = `${domain}.key`
	const certFile = `${domain}.cert`
	const altNames = values.alt
		? values.alt.split(',').map(s => s.trim()).filter(Boolean)
		: []

	if (!domain) throw new Error('Missing domain. See: netsnacks selftls --help')
	if (positionals.length > 1) throw new Error('Too many CNs')
	if (existsSync(keyFile)) throw new Error(`Found existing key: ${keyFile}`)
	if (existsSync(certFile)) throw new Error(`Found existing cert: ${certFile}`)

	await selftls(keyFile, certFile, config(domain, altNames))
}

async function selftls(keyFile, certFile, conf) {
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
`.trim()
}

main().catch(err => {
	console.error(err.message)
	process.exit(1)
})
