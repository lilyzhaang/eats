// Looking up weeks and what was offered in them.

import { getDb } from './app-db.ts';

export type Week = {
	id: number;
	week_of: string; // YYYY-MM-DD, a Sunday
	status: 'picking' | 'locked' | 'done';
	craving_notes: string | null;
};

export const SLOTS = [
	{ key: 'lunch_1', label: 'Lunch 1' },
	{ key: 'lunch_2', label: 'Lunch 2' },
	{ key: 'dinner_1', label: 'Dinner 1' },
	{ key: 'dinner_2', label: 'Dinner 2' }
] as const;

/** The week being planned right now: the most recent one that isn't finished. */
export function getCurrentWeek(): Week | null {
	const db = getDb();
	return (
		(db
			.prepare("SELECT * FROM weeks WHERE status != 'done' ORDER BY week_of DESC LIMIT 1")
			.get() as Week | undefined) ??
		(db.prepare('SELECT * FROM weeks ORDER BY week_of DESC LIMIT 1').get() as Week | undefined) ??
		null
	);
}

export type OfferSummary = {
	id: number;
	slot: string;
	letter: string;
	from_bank: number;
	is_final_pick: number;
	recipe_name: string;
	cuisine: string;
	total_minutes: number | null;
	servings: number | null;
};

/** Every option offered in a week, in slot and letter order. */
export function getOffers(weekId: number): OfferSummary[] {
	return getDb()
		.prepare(
			`SELECT o.id, o.slot, o.letter, o.from_bank, o.is_final_pick,
			        r.name AS recipe_name, r.cuisine, r.total_minutes, r.servings
			 FROM offers o JOIN recipes r ON r.id = o.recipe_id
			 WHERE o.week_id = ?
			 ORDER BY o.slot, o.letter`
		)
		.all(weekId) as OfferSummary[];
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
