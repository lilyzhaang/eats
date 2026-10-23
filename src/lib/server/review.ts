// Data for the review page: the draft menu Claude wrote, or the status of
// the next one (being written, or failed).

import { getDb } from './app-db.ts';
import { claudeConfigured, latestRun } from './ai/claude.ts';
import { nextMenuWeekOf } from './ai/menu.ts';
import { localTime } from '../dates.ts';
import { getSetting } from './settings.ts';
import { formatWeekOf, getDraftWeek, SLOTS } from './weeks.ts';

export type ReviewOption = {
	offerId: number;
	letter: string;
	fromBank: boolean;
	savedToTry: boolean;
	name: string;
	cuisine: string;
	totalMinutes: number | null;
	servings: number | null;
	sourceUrl: string | null;
	sourceCredit: string | null;
	ingredients: { name: string; quantity: number | null; unit: string; prepNote: string | null }[];
	steps: string[];
};

/** Today's date where the household is (for working out "next week"). */
export function todayAtHome(): string {
	return localTime(getSetting('menu_timezone', 'America/New_York')).date;
}

/**
 * Where next week's menu stands, for the button at the bottom of Pick:
 * not started, being written by Claude, or a draft waiting for review.
 */
export function getNextMenuStatus() {
	const draft = getDraftWeek();
	const nextWeekOf = draft?.week_of ?? nextMenuWeekOf(todayAtHome());
	const run = latestRun(['menu', 'swap'], nextWeekOf);
	return {
		claudeReady: claudeConfigured(),
		nextWeekLabel: formatWeekOf(nextWeekOf),
		hasDraft: Boolean(draft),
		working: run?.status === 'running',
		lastError: run?.status === 'failed' ? run.error : null
	};
}

export function getReview() {
	const db = getDb();
	const draft = getDraftWeek();
	const { hasDraft: _hasDraft, ...base } = getNextMenuStatus();
	if (!draft) return { ...base, draft: null };

	const note = db.prepare('SELECT note FROM week_notes WHERE week_id = ?').get(draft.id) as
		{ note: string } | undefined;

	const offers = db
		.prepare(
			`SELECT o.id, o.slot, o.letter, o.from_bank, r.id AS recipe_id, r.name, r.cuisine,
			        r.total_minutes, r.servings, r.source_url, r.source_credit, r.to_try
			 FROM offers o JOIN recipes r ON r.id = o.recipe_id
			 WHERE o.week_id = ? ORDER BY o.slot, o.letter`
		)
		.all(draft.id) as Record<string, unknown>[];

	const ingredientsOf = db.prepare(
		`SELECT c.name, ri.quantity, c.unit, ri.prep_note FROM recipe_ingredients ri
		 JOIN ingredient_catalog c ON c.id = ri.ingredient_id WHERE ri.recipe_id = ? ORDER BY ri.id`
	);
	const stepsOf = db.prepare(
		'SELECT instruction FROM recipe_steps WHERE recipe_id = ? ORDER BY step_order'
	);

	const slots = SLOTS.map((slot) => ({
		key: slot.key,
		label: slot.label,
		options: offers
			.filter((o) => o.slot === slot.key)
			.map((o): ReviewOption => ({
				offerId: o.id as number,
				letter: o.letter as string,
				fromBank: o.from_bank === 1,
				savedToTry: o.from_bank !== 1 && o.to_try === 1,
				name: o.name as string,
				cuisine: o.cuisine as string,
				totalMinutes: o.total_minutes as number | null,
				servings: o.servings as number | null,
				sourceUrl: o.source_url as string | null,
				sourceCredit: o.source_credit as string | null,
				ingredients: (ingredientsOf.all(o.recipe_id as number) as Record<string, unknown>[]).map(
					(i) => ({
						name: i.name as string,
						quantity: i.quantity as number | null,
						unit: i.unit as string,
						prepNote: i.prep_note as string | null
					})
				),
				steps: stepsOf.all(o.recipe_id as number).map((s) => s.instruction as string)
			}))
	}));

	return {
		...base,
		draft: { id: draft.id, label: formatWeekOf(draft.week_of), note: note?.note ?? null, slots }
	};
}
