// The recipe bank: every recipe you've cooked, plus ones you've added
// yourselves, with how it's done (ratings, times made, tweaks).
// Read-only: anyone can browse it.

import { getDb } from './app-db.ts';

export type BankRecipe = {
	id: number;
	name: string;
	cuisine: string;
	mealType: 'lunch' | 'dinner' | 'either';
	totalMinutes: number | null;
	servings: number | null;
	sourceUrl: string | null;
	notes: string | null;
	/** Who created it, shown as a credit with the link. */
	sourceCredit: string | null;
	/** Added by Lily or Andrei as a favourite. */
	addedByYou: boolean;
	/** Saved to try and not cooked yet. */
	savedToTry: boolean;
	timesMade: number;
	timesOffered: number;
	avgRating: number | null;
	lastMade: string | null;
	latestTweak: string | null;
	/** Someone said "Never": it won't be suggested again. */
	retired: boolean;
	/** Good enough to come back in weekly menus. */
	favourite: boolean;
};

// "Made" = the agreed pick in a week that was locked in (or finished).
const STATS = `
	SELECT r.id, r.name, r.cuisine, r.meal_type, r.total_minutes, r.servings, r.source_url, r.notes,
	       r.in_bank, r.to_try, r.source_credit, r.status,
	       (SELECT count(*) FROM offers o JOIN weeks w ON w.id = o.week_id
	         WHERE o.recipe_id = r.id AND w.is_draft = 0) AS times_offered,
	       (SELECT count(*) FROM offers o JOIN weeks w ON w.id = o.week_id
	         WHERE o.recipe_id = r.id AND o.is_final_pick = 1 AND w.status IN ('locked', 'done')) AS times_made,
	       (SELECT max(w.week_of) FROM offers o JOIN weeks w ON w.id = o.week_id
	         WHERE o.recipe_id = r.id AND o.is_final_pick = 1 AND w.status IN ('locked', 'done')) AS last_made,
	       (SELECT avg(ra.stars) FROM ratings ra JOIN offers o ON o.id = ra.offer_id
	         WHERE o.recipe_id = r.id) AS avg_rating,
	       (SELECT ra.tweak_text FROM ratings ra JOIN offers o ON o.id = ra.offer_id
	         JOIN weeks w ON w.id = o.week_id
	         WHERE o.recipe_id = r.id AND ra.verdict = 'tweak'
	         ORDER BY w.week_of DESC, ra.created_at DESC LIMIT 1) AS latest_tweak,
	       EXISTS (SELECT 1 FROM ratings ra JOIN offers o ON o.id = ra.offer_id
	         WHERE o.recipe_id = r.id AND ra.verdict = 'never') AS never
	FROM recipes r`;

function toBankRecipe(row: Record<string, unknown>): BankRecipe {
	const avg = row.avg_rating as number | null;
	const retired = row.never === 1 || row.status === 'retired';
	return {
		id: row.id as number,
		name: row.name as string,
		cuisine: row.cuisine as string,
		mealType: row.meal_type as BankRecipe['mealType'],
		totalMinutes: row.total_minutes as number | null,
		servings: row.servings as number | null,
		sourceUrl: row.source_url as string | null,
		notes: row.notes as string | null,
		sourceCredit: row.source_credit as string | null,
		addedByYou: row.in_bank === 1,
		savedToTry: row.to_try === 1 && (row.times_made as number) === 0,
		timesMade: row.times_made as number,
		timesOffered: row.times_offered as number,
		avgRating: avg,
		lastMade: row.last_made as string | null,
		latestTweak: row.latest_tweak as string | null,
		retired,
		favourite: !retired && (row.in_bank === 1 || (avg !== null && avg >= 4))
	};
}

/** Everything in the bank: recipes you've made, ones you added, and ones saved to try. */
export function listBank(): BankRecipe[] {
	return (
		getDb()
			.prepare(`SELECT * FROM (${STATS}) WHERE times_made > 0 OR in_bank = 1 OR to_try = 1`)
			.all() as Record<string, unknown>[]
	)
		.map(toBankRecipe)
		.sort(
			(a, b) =>
				Number(b.favourite) - Number(a.favourite) ||
				(b.avgRating ?? 0) - (a.avgRating ?? 0) ||
				b.timesMade - a.timesMade ||
				a.name.localeCompare(b.name)
		);
}

/** One recipe with its ingredients, steps and every rating. */
export function getBankRecipe(id: number) {
	const db = getDb();
	const row = db
		.prepare(
			`SELECT * FROM (${STATS}) WHERE id = ? AND (times_made > 0 OR in_bank = 1 OR to_try = 1)`
		)
		.get(id) as Record<string, unknown> | undefined;
	if (!row) return null;

	return {
		...toBankRecipe(row),
		ingredients: (
			db
				.prepare(
					`SELECT c.name, ri.quantity, c.unit, ri.prep_note FROM recipe_ingredients ri
					 JOIN ingredient_catalog c ON c.id = ri.ingredient_id WHERE ri.recipe_id = ? ORDER BY ri.id`
				)
				.all(id) as Record<string, unknown>[]
		).map((i) => ({
			name: i.name as string,
			quantity: i.quantity as number | null,
			unit: i.unit as string,
			prepNote: i.prep_note as string | null
		})),
		steps: db
			.prepare('SELECT instruction FROM recipe_steps WHERE recipe_id = ? ORDER BY step_order')
			.all(id)
			.map((s) => s.instruction as string),
		ratings: (
			db
				.prepare(
					`SELECT w.week_of, p.name AS person, ra.stars, ra.verdict, ra.tweak_text
					 FROM ratings ra JOIN offers o ON o.id = ra.offer_id JOIN weeks w ON w.id = o.week_id
					 JOIN personas p ON p.id = ra.persona_id
					 WHERE o.recipe_id = ? ORDER BY w.week_of DESC, p.sort_order`
				)
				.all(id) as Record<string, unknown>[]
		).map((r) => ({
			weekOf: r.week_of as string,
			person: r.person as string,
			stars: r.stars as number | null,
			verdict: r.verdict as 'again' | 'tweak' | 'never' | null,
			tweakText: r.tweak_text as string | null
		}))
	};
}
