import { describe, expect, it } from 'vitest';
import { addDays, localTime, sundayOnOrAfter } from './dates.ts';

describe('week dates', () => {
	it('finds the coming Sunday', () => {
		expect(sundayOnOrAfter('2026-10-24')).toBe('2026-10-25'); // Saturday → next day
		expect(sundayOnOrAfter('2026-10-25')).toBe('2026-10-25'); // Sunday → same day
		expect(sundayOnOrAfter('2026-10-20')).toBe('2026-10-25'); // Tuesday
		expect(addDays('2026-12-27', 7)).toBe('2027-01-03');
	});
});

describe('New York time', () => {
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
});
