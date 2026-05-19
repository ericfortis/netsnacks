import { test } from 'node:test'
import { deepEqual } from 'node:assert/strict'
import { measureCurlTimings } from './time.js'

test('measureSteps skips zero-val steps when computing the time each step took', () => {
	const result = measureCurlTimings({
		step0: 1,
		step1: 0,
		step2: 6,
		step3: 0,
		step4: 9
	})
	deepEqual(result, {
		step0: { time: 1, cumulative: 1 },
		step1: { time: 0, cumulative: 1 },
		step2: { time: 5, cumulative: 6 },
		step3: { time: 0, cumulative: 6 },
		step4: { time: 3, cumulative: 9 }
	})
})

