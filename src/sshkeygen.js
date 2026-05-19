#!/usr/bin/env node
import fs from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { parseArgs } from 'node:util'
import { runSilently } from './utils/subprocess.js'


const HELP = `
SYNOPSIS
  netsnacks sshkeygen {-H | --host} <host> \\
                      {-a | --addr} <addr> \\
                      [options]

DESCRIPTION
  Creates an SSH key pair (ED25519) and adds a Host entry to ~/.ssh/config
  
OPTIONS
  -u, --user <text>        Default: ${process.env.USER} 
  -p, --port <num>         Default: 22
  -r, --rounds <num>       Default: 32
  -P, --passphrase <text>

EXAMPLE
  netsnacks sshkeygen -H my-server -a 192.168.1.50 \\
    -p 2233 \\
    -u john \\
    -P "mypassphrase"
`.trim()


async function main() {
	const { values } = parseArgs({
		options: {
			host: { short: 'H', type: 'string' },
			addr: { short: 'a', type: 'string' },
			user: { short: 'u', type: 'string', default: process.env.USER || '' },
			port: { short: 'p', type: 'string', default: '22' },
			rounds: { short: 'r', type: 'string', default: '32' },
			passphrase: { short: 'P', type: 'string', default: '' },
			help: { short: 'h', type: 'boolean' },
		}
	})

	if (values.help) {
		console.log(HELP)
		return
	}

	const { host, addr, port, user, passphrase, rounds } = values
	if (!host) throw new Error('--host is required')
	if (!addr) throw new Error('--addr is required')

	const keyPath = join(homedir(), '.ssh', host, 'id_ed25519')
	const sshConfig = join(homedir(), '.ssh', 'config')

	try {
		await sshkeygen(keyPath, rounds, passphrase)
		await fs.appendFile(sshConfig, formatHostEntry(keyPath, host, addr, port, user), { mode: 0o600 })
	}
	catch (err) {
		throw new Error(err.message)
	}
}

async function sshkeygen(keyPath, rounds, new_passphrase) {
	await fs.mkdir(dirname(keyPath), { recursive: true, mode: 0o700 })
	await runSilently('ssh-keygen', [
		'-t', 'ed25519',
		'-f', keyPath,
		'-a', rounds,
		new_passphrase ? ['-N', new_passphrase] : [],
	].flat())
}

function formatHostEntry(keyPath, host, addr, port, user) {
	return `
Host ${host}
HostName ${addr}
Port ${port}
User ${user}
IdentityFile ${keyPath}
`
}


main().catch(err => {
	console.error(err.message)
	process.exit(1)
})
