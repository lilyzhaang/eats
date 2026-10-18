// The Saturday-morning menu.
//
// Once a minute, the app checks: is it Saturday, 9:00 or later in New York
// (both set in the settings table), and is there no menu yet for tomorrow's
// week? If so, it asks Claude for one. Because it checks the database rather
// than counting on running at exactly 9:00, a restart at 9:00 doesn't miss
// the week, and nothing is ever made twice. If Claude fails, it tries again
// 30 minutes later, up to 3 times that day.

import { MENU_SCHEDULE } from '$app/env/private';
import { getDb } from '../app-db.ts';
import { getSetting } from '../settings.ts';
import { claudeConfigured, isRunning } from './claude.ts';
import { isMenuTime, localTime, sundayOnOrAfter } from '../../dates.ts';
import { generateMenu, weekExists } from './menu.ts';

const MAX_TRIES = 3;
const RETRY_AFTER_MINUTES = 30;

/** Describe the schedule for the screen: "Saturdays at 9:00 AM Eastern". */
export function scheduleSummary() {
	const day = getSetting('menu_day', 'saturday');
	const [hour, minute] = getSetting('menu_time', '09:00').split(':').map(Number);
	const zone = getSetting('menu_timezone', 'America/New_York');
	const clock = new Date(Date.UTC(2000, 0, 1, hour, minute)).toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'UTC'
	});
	const zoneName = zone === 'America/New_York' ? 'Eastern' : zone;
	return {
		on: Boolean(MENU_SCHEDULE) && claudeConfigured(),
		text: `${day[0].toUpperCase()}${day.slice(1)}s at ${clock} ${zoneName}`
	};
}

/** One check: make the menu if it's time and it hasn't been made. */
export async function checkSchedule(now = new Date()): Promise<void> {
	if (!MENU_SCHEDULE || !claudeConfigured()) return;

	const local = localTime(getSetting('menu_timezone', 'America/New_York'), now);
	if (!isMenuTime(local, getSetting('menu_day', 'saturday'), getSetting('menu_time', '09:00')))
		return;

	// Saturday's menu is for the week starting the next day (Sunday).
	const weekOf = sundayOnOrAfter(local.date);
	if (weekExists(weekOf) || isRunning(['menu'], weekOf)) return;

	const failures = getDb()
		.prepare(
			`SELECT count(*) AS n, max(started_at) AS last FROM ai_runs
			 WHERE kind = 'menu' AND week_of = ? AND triggered_by = 'schedule' AND status = 'failed'`
		)
		.get(weekOf) as { n: number; last: string | null };
	if (failures.n >= MAX_TRIES) return;
	if (
		failures.last &&
		Date.parse(failures.last.replace(' ', 'T') + 'Z') > now.getTime() - RETRY_AFTER_MINUTES * 60_000
	)
		return;

	console.log(`Asking Claude for the menu for the week of ${weekOf}…`);
	await generateMenu(weekOf, 'schedule')
		.then(() => console.log(`Menu for the week of ${weekOf} is ready for review.`))
		.catch((error) => console.error(`Menu for the week of ${weekOf} failed:`, error.message));
}

let timer: ReturnType<typeof setInterval> | undefined;

/** Start checking once a minute. Called when the server starts. */
export function startSchedule(): void {
	if (timer) return;
	timer = setInterval(() => void checkSchedule(), 60_000);
	void checkSchedule();
}
