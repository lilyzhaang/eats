// Date and time helpers. Dates are plain "YYYY-MM-DD" strings throughout the app.

/** Add days to a YYYY-MM-DD date. */
export function addDays(isoDate: string, days: number): string {
	const date = new Date(isoDate + 'T00:00:00Z');
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

/** The Sunday on or after a date. */
export function sundayOnOrAfter(isoDate: string): string {
	const day = new Date(isoDate + 'T00:00:00Z').getUTCDay(); // 0 = Sunday
	return addDays(isoDate, (7 - day) % 7);
}

export type LocalTime = { weekday: string; date: string; time: string };

/** What day and time is it right now in a time zone? */
export function localTime(timeZone: string, now = new Date()): LocalTime {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone,
			weekday: 'long',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		})
			.formatToParts(now)
			.map((p) => [p.type, p.value])
	);
	return {
		weekday: parts.weekday.toLowerCase(),
		date: `${parts.year}-${parts.month}-${parts.day}`,
		time: `${parts.hour}:${parts.minute}`
	};
}
