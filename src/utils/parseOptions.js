import { parseArgs } from 'node:util'

export function parseOptions(options = {}, config = {}) {
	return parseArgs({
		args: process.argv.slice(3),
		allowPositionals: true,
		options,
		...config,
	})
}
