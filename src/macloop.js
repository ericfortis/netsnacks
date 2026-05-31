#!/usr/bin/env node
import { join, dirname } from 'node:path'
import { isIPv4 } from 'node:net'
import { parseArgs } from 'node:util'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'

// TODO allow IPv6 too?

const HELP = `
SYNOPSIS
	sudo netsnacks macloop --label <name> --addr <ip>

DESCRIPTION
  Creates a persistent loopback interface 

EXAMPLE
	sudo netsnacks macloop --label alias1  --addr 127.2.2.2
`.trim()


async function main() {
	const { values } = parseArgs({
		options: {
			label: { short: 'l', type: 'string' },
			addr: { short: 'a', type: 'string' },
			help: { short: 'h', type: 'boolean' },
		},
	})

	if (values.help) {
		console.log(HELP)
		return
	}

	const { label, addr } = values
	const id = 'com.netsnacks.macloop.loopback.' + label
	const f = join('/Library/LaunchDaemons', id) + '.plist'

	if (process.platform !== 'darwin') throw new Error('This command is for macOS')
	if (process.getuid?.() !== 0) throw new Error('This command must be run as root')
	if (!label) throw new Error('Missing --label')
	if (!addr) throw new Error('Missing --addr')
	if (!isIPv4(addr)) throw new Error('--addr must be IPv4')
	if (!addr.startsWith('127.')) throw new Error('--addr must be in the loopback range (127.x.x.x)')
	if (existsSync(f)) throw new Error(`Found existing: ${f}`)

	await mkdir(dirname(f), { recursive: true })
	await writeFile(f, macloop(id, addr))
	console.log(`Saved: ${f}\nPlease reboot`)
}

export function macloop(label, addr) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>${label}</string>
	
	<key>ProgramArguments</key>
	<array>
		<string>/sbin/ifconfig</string>
		<string>lo0</string>
		<string>alias</string>
		<string>${addr}</string>
	</array>
	
	<key>RunAtLoad</key>
	<true/>
</dict>
</plist>
`
}

if (import.meta.main)
	main().catch(err => {
		console.error(err.message)
		process.exit(1)
	})

