#!/usr/bin/env node

import { join } from 'node:path'
import { styleText } from 'node:util'
import { spawn } from 'node:child_process'
import pkgJSON from '../package.json' with { type: 'json' }


const COMMANDS = {
	time: ['time.js', 'Measures request response timings'],
	certperiod: ['certperiod.js', 'Shows expiration date of a TLS cert'],
	selftls: ['selftls.js', 'Creates a self-signed TLS certificate'],
	macloop: ['macloop.js', 'Creates a persistent loopback interface on macOS'],
	skipdns: ['skipdns.js', 'HEAD request to a TLS domain by its IP'],
	sshkeygen: ['sshkeygen.js', 'Creates SSH key and its .config entry'],
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


function main() {
	const [, , opt, ...args] = process.argv

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

	const cmd = join(import.meta.dirname, COMMANDS[opt][0])
	spawn(cmd, args, { stdio: 'inherit' })
		.on('exit', process.exit)
}

if (import.meta.main)
	main()
