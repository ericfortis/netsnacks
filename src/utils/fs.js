import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'


export function mkTempDir(prefix = 'test-') {
	return mkdtempSync(join(tmpdir(), prefix))
}


// TODO Linux and Win
export function openFileExplorer(dir) {
	if (process.platform === 'darwin')
		spawn('open', [dir], { stdio: 'ignore', detached: true }).unref()
}
