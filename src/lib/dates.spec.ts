import { describe, expect, it } from 'vitest';
import { addDays, isMenuTime, localTime, sundayOnOrAfter } from './dates.ts';

describe('week dates', () => {
	it('finds the coming Sunday', () => {
		expect(sundayOnOrAfter('2026-10-24')).toBe('2026-10-25'); // Saturday → next day
		expect(sundayOnOrAfter('2026-10-25')).toBe('2026-10-25'); // Sunday → same day
		expect(sundayOnOrAfter('2026-10-20')).toBe('2026-10-25'); // Tuesday
		expect(addDays('2026-12-27', 7)).toBe('2027-01-03');
	});
});

describe('Saturday 9am Eastern', () => {
	const ny = (iso: string) => localTime('America/New_York', new Date(iso));

	it('reads New York time, including daylight saving', () => {
		// 13:00 UTC on Oct 24 = 9:00 EDT (summer time)
		expect(ny('2026-10-24T13:00:00Z')).toEqual({
			weekday: 'saturday',
			date: '2026-10-24',
			time: '09:00'
		});
		// 14:00 UTC on Dec 5 = 9:00 EST (winter time)
		expect(ny('2026-12-05T14:00:00Z')).toEqual({
			weekday: 'saturday',
			date: '2026-12-05',
			time: '09:00'
		});
	});

	it('is menu time from 9:00 on Saturday, not before, not other days', () => {
		expect(isMenuTime(ny('2026-10-24T12:59:00Z'), 'saturday', '09:00')).toBe(false); // 8:59
		expect(isMenuTime(ny('2026-10-24T13:00:00Z'), 'saturday', '09:00')).toBe(true); // 9:00
		expect(isMenuTime(ny('2026-10-24T20:00:00Z'), 'saturday', '09:00')).toBe(true); // afternoon catch-up
		expect(isMenuTime(ny('2026-10-25T13:00:00Z'), 'saturday', '09:00')).toBe(false); // Sunday
	});
});
