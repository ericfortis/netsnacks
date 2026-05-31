import { test } from 'node:test'
import { deepEqual } from 'node:assert/strict'
import { parseDates } from './certperiod.js'

test('parseDates parses openssl certificate dates correctly', t => {
	t.mock.timers.enable({ apis: ['Date'] })
	t.mock.timers.setTime(new Date('2026-06-15T00:00:00Z').getTime())

	const cert = `
notBefore=May 30 00:00:00 2026 GMT
notAfter=Jun 30 00:00:00 2026 GMT
`
	deepEqual(parseDates(cert), {
		isValid: true,
		daysRemaining: 15,
		daysDuration: 31,
		notBefore: 'May 30 00:00:00 2026 GMT',
		notAfter: 'Jun 30 00:00:00 2026 GMT'
	})
})
