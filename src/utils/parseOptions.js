import { parseArgs } from 'node:util'

/**
 * @param {string} helpText
 * @param {import('node:util').ParseArgsOptionsConfig} [options]
 * @param {Partial<import('node:util').ParseArgsConfig>} [config]
 */
export function parseOptions(helpText, options = {}, config = {}) {
	options.help = { short: 'h', type: 'boolean' }

	const { values, positionals } = parseArgs({
		args: process.argv.slice(3),
		allowPositionals: true,
		options,
		...config,
	})

	if (values.help) {
		console.log(helpText.trim())
		process.exit(0)
	}

	return { values, positionals }
}
