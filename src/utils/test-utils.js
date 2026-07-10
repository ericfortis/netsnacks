import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const rel = f => join(import.meta.dirname, f)

export function cli(...args) {
	return spawnSync(rel('../cli.js'), args)
}
