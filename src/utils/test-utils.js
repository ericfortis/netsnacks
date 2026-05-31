import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'

const rel = f => join(import.meta.dirname, f)

export function mkTempDir(prefix = 'test-') {
	return mkdtempSync(join(tmpdir(), prefix))
}

export function cli(...args) {
	return spawnSync(rel('../cli.js'), args)
}
