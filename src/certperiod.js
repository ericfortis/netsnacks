#!/usr/bin/env node
import { parseEnv, parseArgs } from 'node:util'
import { runSilently } from './utils/subprocess.js'


const HELP = `
SYNOPSIS
  netsnacks certperiod [-j | --json] <domain>

DESCRIPTION
  Shows the validity period (the "notBefore" and "notAfter" dates) 
  of a TLS certificate for a given domain.

EXAMPLE
  netsnacks certperiod example.com
`.trim()


async function main() {
	const { values, positionals } = parseArgs({
		options: {
			json: { short: 'j', type: 'boolean' },
			help: { short: 'h', type: 'boolean' },
		},
		allowPositionals: true
	})

	if (values.help) {
		console.log(HELP)
		return
	}

	const domain = positionals[0]
	if (!domain) throw new Error('No domain specified.')

	const output = await certperiod(domain)
	if (values.json)
		console.log(JSON.stringify(output, null, 2))
	else
		console.table(output)
}

async function certperiod(domain) {
	const rawCert = await runSilently('openssl', [
		's_client',
		'-showcerts',
		'-servername', domain,
		'-connect', `${domain}:443`
	], 'Q\n')

	const cert = await runSilently('openssl', [
		'x509',
		'-noout',
		'-dates'
	], rawCert.stdout)

	return parseDates(cert.stdout)
}

function parseDates(cert) {
	const { notBefore, notAfter } = parseEnv(cert)
	const now = new Date()
	const dateBefore = new Date(notBefore)
	const dateAfter = new Date(notAfter)
	return {
		isValid: dateBefore <= now && now <= dateAfter,
		daysRemaining: toDays(dateAfter - now),
		daysDuration: toDays(dateAfter - dateBefore),
		notBefore,
		notAfter,
	}
}

function toDays(ms) {
	return Math.round(ms / (24 * 60 * 60 * 1000))
}

main().catch(err => {
	console.error(err.message)
	process.exit(1)
})
