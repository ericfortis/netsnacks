import fs from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { runSilently } from './utils/subprocess.js'
import { parseOptions } from './utils/parseOptions.js'

const ROUNDS = 32

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
`

export default async function main() {
	const { values } = parseOptions(HELP, {
		host: { short: 'H', type: 'string' },
		addr: { short: 'a', type: 'string' },
		user: { short: 'u', type: 'string', default: process.env.USER || '' },
		port: { short: 'p', type: 'string', default: '22' },
		rounds: { short: 'r', type: 'string', default: String(ROUNDS) },
		passphrase: { short: 'P', type: 'string', default: '' },
	})

	const { host, addr, port, user, passphrase, rounds } = values
	if (!host) throw '--host is required' + HELP
	if (!addr) throw '--addr is required' + HELP

	const outPath = join(homedir(), '.ssh', host, 'id_ed25519')
	const sshConfig = join(homedir(), '.ssh', 'config')

	try {
		await sshkeygen({ outPath, rounds, passphrase })
		await fs.appendFile(sshConfig, formatHostEntry(outPath, host, addr, port, user), { mode: 0o600 })
	}
	catch (err) {
		throw new Error(err.message)
	}
}

export async function sshkeygen({ outPath, rounds = ROUNDS, passphrase = '' }) {
	await fs.mkdir(dirname(outPath), { recursive: true, mode: 0o700 })
	await runSilently('ssh-keygen', [
		'-t', 'ed25519',
		'-f', outPath,
		'-a', rounds,
		passphrase ? ['-N', passphrase] : [],
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
