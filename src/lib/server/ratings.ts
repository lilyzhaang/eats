// The Rate screen's logic: the weekly debrief (§4.4 of CLAUDE.md).
//
// For each of the week's four meals, each owner gives 1–5 stars and a
// verdict (Again / Tweak / Never). A Tweak must say what to change, so the
// tweak can show up on the recipe's card next time. Then two closing
// questions: best meal of the week, and cravings for next week.

import { getDb } from './app-db.ts';
import { todayAtHome } from './settings.ts';
import { getOwners, type Owner } from './picks.ts';
import { SLOTS, type Week } from './weeks.ts';

export type Verdict = 'again' | 'tweak' | 'never';
const VERDICTS: Verdict[] = ['again', 'tweak', 'never'];

export type PersonRating = {
	owner: Owner;
	stars: number | null;
	verdict: Verdict | null;
	tweakText: string | null;
};

export type MealDebrief = {
	offerId: number;
	slot: string;
	slotLabel: string;
	recipeName: string;
	fromBank: boolean;
	/** A tweak from an earlier week that this cook already included. */
	priorTweak: { text: string; weekOf: string } | null;
	ratings: PersonRating[];
};

export type Debrief = {
	meals: MealDebrief[];
	bestVotes: { owner: Owner; offerId: number | null }[];
	cravings: string;
	stats: { recipesRated: number; inRecipeBank: number; mostPicked: string | null };
};

/**
 * The week to debrief: the most recent locked-in week whose Sunday has
 * arrived, i.e. the week you're cooking or just cooked. That way you can
 * rate it before asking Claude for next week, so the new menu learns from it.
 * Before the first week's Sunday, the most recent locked-in week.
 */
export function getRateWeek(): Week | null {
	const withPicks =
		'is_draft = 0 AND EXISTS (SELECT 1 FROM offers WHERE week_id = weeks.id AND is_final_pick = 1)';
	const db = getDb();
	return (
		(db
			.prepare(
				`SELECT * FROM weeks WHERE status IN ('locked', 'done') AND week_of <= ? AND ${withPicks}
				 ORDER BY week_of DESC LIMIT 1`
			)
			.get(todayAtHome()) as Week | undefined) ??
		(db
			.prepare(
				`SELECT * FROM weeks WHERE status IN ('locked', 'done') AND ${withPicks}
				 ORDER BY week_of DESC LIMIT 1`
			)
			.get() as Week | undefined) ??
		null
	);
}

/** How many of a week's ratings are filled in (each owner rating each meal). */
export function ratingProgress(week: Week): { done: number; total: number } {
	const row = getDb()
		.prepare(
			`SELECT
			   (SELECT count(*) FROM ratings ra JOIN offers o ON o.id = ra.offer_id
			     WHERE o.week_id = :id AND o.is_final_pick = 1 AND ra.stars IS NOT NULL) AS done,
			   (SELECT count(*) FROM offers WHERE week_id = :id AND is_final_pick = 1)
			     * (SELECT count(*) FROM personas WHERE role = 'owner') AS total`
		)
		.get({ id: week.id }) as { done: number; total: number };
	return row;
}

export function getDebrief(week: Week): Debrief {
	const db = getDb();
	const owners = getOwners();

	const meals = db
		.prepare(
			`SELECT o.id, o.slot, o.from_bank, r.name,
			        -- the latest tweak for this recipe from an earlier week, as "text<sep>week_of"
			        -- (char(31) is an invisible separator character that never appears in text)
			        (SELECT ra.tweak_text || char(31) || w2.week_of
			           FROM ratings ra JOIN offers o2 ON o2.id = ra.offer_id
			           JOIN weeks w2 ON w2.id = o2.week_id
			          WHERE o2.recipe_id = r.id AND ra.verdict = 'tweak' AND w2.week_of < :week_of
			          ORDER BY w2.week_of DESC, ra.created_at DESC LIMIT 1) AS prior_tweak
			 FROM offers o JOIN recipes r ON r.id = o.recipe_id
			 WHERE o.week_id = :week_id AND o.is_final_pick = 1`
		)
		.all({ week_id: week.id, week_of: week.week_of }) as Record<string, unknown>[];

	const ratings = db
		.prepare(
			`SELECT ra.offer_id, ra.persona_id, ra.stars, ra.verdict, ra.tweak_text
			 FROM ratings ra JOIN offers o ON o.id = ra.offer_id WHERE o.week_id = ?`
		)
		.all(week.id) as {
		offer_id: number;
		persona_id: number;
		stars: number | null;
		verdict: Verdict | null;
		tweak_text: string | null;
	}[];

	const slotOrder = SLOTS.map((s) => s.key as string);
	const mealList: MealDebrief[] = meals
		.map((m) => {
			const [text, weekOf] = m.prior_tweak ? (m.prior_tweak as string).split('\u001f') : [];
			return {
				offerId: m.id as number,
				slot: m.slot as string,
				slotLabel: SLOTS.find((s) => s.key === m.slot)!.label,
				recipeName: m.name as string,
				fromBank: m.from_bank === 1,
				priorTweak: text ? { text, weekOf } : null,
				ratings: owners.map((owner) => {
					const r = ratings.find((x) => x.offer_id === m.id && x.persona_id === owner.id);
					return {
						owner,
						stars: r?.stars ?? null,
						verdict: r?.verdict ?? null,
						tweakText: r?.tweak_text ?? null
					};
				})
			};
		})
		.sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot));

	const votes = db
		.prepare('SELECT persona_id, offer_id FROM best_meal_votes WHERE week_id = ?')
		.all(week.id) as { persona_id: number; offer_id: number }[];

	return {
		meals: mealList,
		bestVotes: owners.map((owner) => ({
			owner,
			offerId: votes.find((v) => v.persona_id === owner.id)?.offer_id ?? null
		})),
		cravings: week.craving_notes ?? '',
		stats: getStats()
	};
}

/** Footer numbers: recipes rated, recipes good enough for the bank, most picked. */
function getStats(): Debrief['stats'] {
	const db = getDb();
	const rated = db
		.prepare(
			`SELECT count(DISTINCT o.recipe_id) AS n FROM ratings ra JOIN offers o ON o.id = ra.offer_id
			 WHERE ra.stars IS NOT NULL`
		)
		.get() as { n: number };
	// Same bar as the recipe-bank rule in §7.5: average rating of 4 or more, not retired.
	const bank = db
		.prepare(
			`SELECT count(*) AS n FROM (
			   SELECT o.recipe_id FROM ratings ra
			   JOIN offers o ON o.id = ra.offer_id JOIN recipes r ON r.id = o.recipe_id
			   WHERE r.status = 'active' GROUP BY o.recipe_id HAVING avg(ra.stars) >= 4)`
		)
		.get() as { n: number };
	const most = db
		.prepare(
			`SELECT r.name FROM offers o JOIN recipes r ON r.id = o.recipe_id
			 WHERE o.is_final_pick = 1 GROUP BY r.id ORDER BY count(*) DESC, max(o.id) DESC LIMIT 1`
		)
		.get() as { name: string } | undefined;
	return { recipesRated: rated.n, inRecipeBank: bank.n, mostPicked: most?.name ?? null };
}

/**
 * Save one person's rating for one meal. Returns an error message,
 * or null if it saved.
 */
export function saveRating(
	week: Week,
	personaId: number,
	input: { offerId: number; stars: number | null; verdict: string | null; tweakText: string }
): string | null {
	const db = getDb();
	const meal = db
		.prepare('SELECT 1 FROM offers WHERE id = ? AND week_id = ? AND is_final_pick = 1')
		.get(input.offerId, week.id);
	if (!meal) return 'That meal isn’t part of this week.';

	if (
		input.stars !== null &&
		!(Number.isInteger(input.stars) && input.stars >= 1 && input.stars <= 5)
	) {
		return 'Stars go from 1 to 5.';
	}
	const verdict =
		input.verdict && VERDICTS.includes(input.verdict as Verdict) ? input.verdict : null;
	const tweakText = input.tweakText.trim();
	if (verdict === 'tweak' && !tweakText) {
		return 'Say what should change next time, so the tweak isn’t lost.';
	}

	db.prepare(
		`INSERT INTO ratings (offer_id, persona_id, stars, verdict, tweak_text) VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT (offer_id, persona_id) DO UPDATE SET
		   stars = excluded.stars, verdict = excluded.verdict, tweak_text = excluded.tweak_text`
	).run(input.offerId, personaId, input.stars, verdict, verdict === 'tweak' ? tweakText : null);
	return null;
}

/** Save the closing questions: your best-meal vote, and the shared cravings note. */
export function saveClosing(
	week: Week,
	personaId: number,
	input: { bestOfferId: number | null; cravings: string }
): string | null {
	const db = getDb();
	if (input.bestOfferId !== null) {
		const meal = db
			.prepare('SELECT 1 FROM offers WHERE id = ? AND week_id = ? AND is_final_pick = 1')
			.get(input.bestOfferId, week.id);
		if (!meal) return 'That meal isn’t part of this week.';
		db.prepare(
			`INSERT INTO best_meal_votes (week_id, persona_id, offer_id) VALUES (?, ?, ?)
			 ON CONFLICT (week_id, persona_id) DO UPDATE SET offer_id = excluded.offer_id`
		).run(week.id, personaId, input.bestOfferId);
	}
	db.prepare('UPDATE weeks SET craving_notes = ? WHERE id = ?').run(
		input.cravings.trim() || null,
		week.id
	);
	return null;
}
