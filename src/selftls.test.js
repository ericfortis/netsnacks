import { ok } from 'node:assert/strict'
import { test } from 'node:test'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { mkTempDir, cli } from './utils/test-utils.js'

test('selftls', () => {
	const tmp = mkTempDir('netsnacks-selftls-')
	const res = cli('selftls', 'localhost', '--output-dir', tmp)

	ok(res.status === 0, `cli failed with status: ${res.status}, stderr: ${res.stderr?.toString()}`)
	ok(existsSync(join(tmp, 'localhost.key')), 'localhost.key should exist')
	ok(existsSync(join(tmp, 'localhost.cert')), 'localhost.cert should exist')
})
