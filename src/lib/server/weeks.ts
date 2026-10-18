// Looking up weeks and what was offered in them.

import { getDb } from './app-db.ts';

export type Week = {
	id: number;
	week_of: string; // YYYY-MM-DD, a Sunday
	status: 'picking' | 'locked' | 'done';
	craving_notes: string | null;
	is_draft: number; // 1 = waiting for review
};

export const SLOTS = [
	{ key: 'lunch_1', label: 'Lunch 1' },
	{ key: 'lunch_2', label: 'Lunch 2' },
	{ key: 'dinner_1', label: 'Dinner 1' },
	{ key: 'dinner_2', label: 'Dinner 2' }
] as const;

/**
 * The week being planned right now: the most recent one that isn't finished.
 * Drafts (menus waiting for review) don't count until they're approved.
 */
export function getCurrentWeek(): Week | null {
	const db = getDb();
	return (
		(db
			.prepare(
				"SELECT * FROM weeks WHERE status != 'done' AND is_draft = 0 ORDER BY week_of DESC LIMIT 1"
			)
			.get() as Week | undefined) ??
		(db.prepare('SELECT * FROM weeks WHERE is_draft = 0 ORDER BY week_of DESC LIMIT 1').get() as
			Week | undefined) ??
		null
	);
}

/** A menu Claude wrote that's waiting for an owner to review, if any. */
export function getDraftWeek(): Week | null {
	return (
		(getDb().prepare('SELECT * FROM weeks WHERE is_draft = 1 ORDER BY week_of LIMIT 1').get() as
			Week | undefined) ?? null
	);
}

/** "2026-10-18" → "Oct 18" */
export function formatWeekOf(isoDate: string): string {
	const [year, month, day] = isoDate.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	});
}
