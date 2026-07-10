import { ok } from 'node:assert/strict'
import { test } from 'node:test'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { cli } from './utils/test-utils.js'
import { mkTempDir } from './utils/fs.js'

test('selftls', () => {
	const tmp = mkTempDir('netsnacks-selftls-')
	const res = cli('selftls', 'localhost', '--outdir', tmp)

	ok(res.status === 0, `cli failed with status: ${res.status}, stderr: ${res.stderr?.toString()}`)
	ok(existsSync(join(tmp, 'localhost.key')), 'localhost.key should exist')
	ok(existsSync(join(tmp, 'localhost.cert')), 'localhost.cert should exist')
})
