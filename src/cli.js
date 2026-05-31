#!/usr/bin/env node
import { styleText } from 'node:util'
import pkgJSON from '../package.json' with { type: 'json' }


const COMMANDS = {
	time: ['./time.js', 'Measures request response timings'],
	certperiod: ['./certperiod.js', 'Shows expiration date of a TLS cert'],
	selftls: ['./selftls.js', 'Creates a self-signed TLS certificate'],
	macloop: ['./macloop.js', 'Creates a persistent loopback interface on macOS'],
	skipdns: ['./skipdns.js', 'HEAD request to a TLS domain by its IP'],
	sshkeygen: ['./sshkeygen.js', 'Creates SSH key and its .config entry'],
}

export function commandsSummary() {
	return Object.entries(COMMANDS).map(([cmd, [, desc]]) => [cmd, desc])
}

const HELP = `
SYNOPSIS
  netsnacks <command> <args>

COMMANDS
${commandsSummary().map(([cmd, desc]) =>
	`  ${styleText('bold', cmd.padEnd(12, ' '))}\t${desc}`).join('\n')}
`.trim()


async function main() {
	const [, , opt] = process.argv

	if (opt === '-v' || opt === '--version') {
		console.log(pkgJSON.version)
		return
	}
	if (opt === '-h' || opt === '--help') {
		console.log(HELP)
		return
	}

	if (!opt) {
		console.log(HELP)
		process.exit(1)
	}
	if (!Object.hasOwn(COMMANDS, opt)) {
		console.error(`'${opt}' is not a command. See netsnacks --help\n`)
		process.exit(1)
	}

	(await import(COMMANDS[opt][0])).default()
}

if (import.meta.main)
	main().catch(err => {
		console.error(err?.message || err)
		process.exit(1)
	})
