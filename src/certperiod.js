import { parseEnv } from 'node:util'
import { runSilently } from './utils/subprocess.js'
import { parseOptions } from './utils/parseOptions.js'


const HELP = `

SYNOPSIS
  netsnacks certperiod [-j | --json] <domain>

DESCRIPTION
  Shows the validity period (the "notBefore" and "notAfter" dates) 
  of a TLS certificate for a given domain.

EXAMPLE
  netsnacks certperiod example.com
`


export default async function main() {
	const { values, positionals } = parseOptions(HELP, {
		json: { short: 'j', type: 'boolean' },
	})

	const domain = positionals[0]
	if (!domain) throw 'No domain specified.' + HELP

	const output = await certperiod(domain)
	if (values.json)
		console.log(JSON.stringify(output, null, 2))
	else
		console.table(output)
}

export async function certperiod(domain) {
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

export function parseDates(cert) {
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
