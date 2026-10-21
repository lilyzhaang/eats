// The weekly menu: Claude writes next week's options as a draft for review.
//
// How a menu is made:
// 1. The app picks recipe-bank favourites for each slot (rule in §7.5).
// 2. It gathers what Claude should know: ratings, tweaks, "never" recipes,
//    recent meals, cravings, the season, the kitchen, the ingredient catalog.
// 3. Claude writes the new options (recipes, ingredients, steps).
// 4. The app checks them and saves a draft week. Nothing is visible for
//    picking until an owner approves it on the review page.

import { getDb } from '../app-db.ts';
import { getKitchen, getSetting } from '../settings.ts';
import { transaction } from '../db/index.ts';
import { SLOTS } from '../weeks.ts';
import { addDays, sundayOnOrAfter } from '../../dates.ts';
import {
	askClaude,
	findUnsavedAnswer,
	isRunning,
	loadPrompt,
	markSaved,
	markSaveFailed,
	type Trigger
} from './claude.ts';
import { MenuAnswer, SwapAnswer, type NewRecipe } from './schemas.ts';

type Slot = (typeof SLOTS)[number]['key'];

// ── Which week ──────────────────────────────────────────────────────────

/**
 * The week a new menu should be for: the coming Sunday, or the week after
 * the newest week already in the app, whichever is later.
 */
export function nextMenuWeekOf(today: string): string {
	const upcoming = sundayOnOrAfter(today);
	const latest = getDb().prepare('SELECT max(week_of) AS w FROM weeks').get() as {
		w: string | null;
	};
	if (latest.w && latest.w >= upcoming) return addDays(latest.w, 7);
	return upcoming;
}

export function weekExists(weekOf: string): boolean {
	return Boolean(getDb().prepare('SELECT 1 FROM weeks WHERE week_of = ?').get(weekOf));
}

// ── Recipe-bank picks (§7.5) ────────────────────────────────────────────

type BankPick = { recipeId: number; name: string; cuisine: string };

/**
 * Favourites eligible to come back, not retired, nobody said "Never", and
 * not made in the last 3 weeks (so favourites rotate instead of repeating):
 * - recipes you added to the bank yourselves, or
 * - recipes you've made that average 4+ stars and were picked at least
 *   half the times they were offered.
 */
function chooseBankPicks(weekOf: string, perSlot: number): Map<Slot, BankPick[]> {
	const candidates = getDb()
		.prepare(
			`SELECT * FROM (
			   SELECT r.id, r.name, r.cuisine, r.meal_type, r.in_bank,
			          (SELECT avg(ra.stars) FROM ratings ra JOIN offers o ON o.id = ra.offer_id
			            JOIN weeks w ON w.id = o.week_id
			            WHERE o.recipe_id = r.id AND w.week_of < :week_of) AS avg_rating,
			          (SELECT count(*) FROM offers o JOIN weeks w ON w.id = o.week_id
			            WHERE o.recipe_id = r.id AND w.week_of < :week_of AND w.is_draft = 0) AS offered,
			          (SELECT count(*) FROM offers o JOIN weeks w ON w.id = o.week_id
			            WHERE o.recipe_id = r.id AND w.week_of < :week_of AND o.is_final_pick = 1) AS picked,
			          (SELECT max(w.week_of) FROM offers o JOIN weeks w ON w.id = o.week_id
			            WHERE o.recipe_id = r.id AND w.week_of < :week_of AND o.is_final_pick = 1) AS last_made
			   FROM recipes r
			   WHERE r.status = 'active'
			     AND NOT EXISTS (SELECT 1 FROM ratings rn JOIN offers on2 ON on2.id = rn.offer_id
			                     WHERE on2.recipe_id = r.id AND rn.verdict = 'never'))
			 WHERE (last_made IS NULL OR last_made <= date(:week_of, '-21 days'))
			   AND (in_bank = 1 OR (picked > 0 AND avg_rating >= 4 AND picked * 2 >= offered))
			 ORDER BY coalesce(avg_rating, 4.5) DESC, last_made ASC`
		)
		.all({ week_of: weekOf }) as { id: number; name: string; cuisine: string; meal_type: string }[];

	const picks = new Map<Slot, BankPick[]>(SLOTS.map((s) => [s.key, []]));
	const used = new Set<number>();
	for (const slot of SLOTS) {
		const mealType = slot.key.startsWith('lunch') ? 'lunch' : 'dinner';
		for (const c of candidates) {
			if (picks.get(slot.key)!.length >= perSlot) break;
			if (used.has(c.id) || (c.meal_type !== mealType && c.meal_type !== 'either')) continue;
			picks.get(slot.key)!.push({ recipeId: c.id, name: c.name, cuisine: c.cuisine });
			used.add(c.id);
		}
	}
	return picks;
}

// ── Saved recipes ───────────────────────────────────────────────────────

/**
 * Recipes you saved to try and haven't cooked yet: at most one per slot,
 * matching lunch or dinner, the ones offered least recently first.
 */
function chooseToTry(weekOf: string, alreadyChosen: Set<number>): Map<Slot, BankPick[]> {
	const candidates = getDb()
		.prepare(
			`SELECT r.id, r.name, r.cuisine, r.meal_type,
			        (SELECT max(w.week_of) FROM offers o JOIN weeks w ON w.id = o.week_id
			          WHERE o.recipe_id = r.id AND w.is_draft = 0) AS last_offered
			 FROM recipes r
			 WHERE r.to_try = 1 AND r.status = 'active'
			   AND NOT EXISTS (SELECT 1 FROM offers o JOIN weeks w ON w.id = o.week_id
			                   WHERE o.recipe_id = r.id AND o.is_final_pick = 1 AND w.week_of < :week_of)
			 ORDER BY last_offered IS NOT NULL, last_offered, r.id`
		)
		.all({ week_of: weekOf }) as { id: number; name: string; cuisine: string; meal_type: string }[];

	const picks = new Map<Slot, BankPick[]>(SLOTS.map((s) => [s.key, []]));
	const used = new Set(alreadyChosen);
	for (const slot of SLOTS) {
		const mealType = slot.key.startsWith('lunch') ? 'lunch' : 'dinner';
		const match = candidates.find(
			(c) => !used.has(c.id) && (c.meal_type === mealType || c.meal_type === 'either')
		);
		if (match) {
			picks.get(slot.key)!.push({ recipeId: match.id, name: match.name, cuisine: match.cuisine });
			used.add(match.id);
		}
	}
	return picks;
}

// ── What Claude is told ─────────────────────────────────────────────────

function gatherDetails(weekOf: string) {
	const db = getDb();

	const recentMeals = db
		.prepare(
			`SELECT w.week_of, o.slot, r.name, r.cuisine FROM offers o
			 JOIN weeks w ON w.id = o.week_id JOIN recipes r ON r.id = o.recipe_id
			 WHERE o.is_final_pick = 1 AND w.week_of >= date(:week_of, '-42 days') AND w.week_of < :week_of
			 ORDER BY w.week_of DESC`
		)
		.all({ week_of: weekOf });

	const ratingHistory = db
		.prepare(
			`SELECT r.name, r.cuisine, round(avg(ra.stars), 1) AS average_stars,
			        group_concat(DISTINCT ra.verdict) AS verdicts,
			        group_concat(DISTINCT ra.tweak_text) AS tweaks
			 FROM ratings ra JOIN offers o ON o.id = ra.offer_id JOIN recipes r ON r.id = o.recipe_id
			 GROUP BY r.id ORDER BY max(ra.created_at) DESC LIMIT 40`
		)
		.all();

	const neverAgain = db
		.prepare(
			`SELECT DISTINCT r.name FROM ratings ra JOIN offers o ON o.id = ra.offer_id
			 JOIN recipes r ON r.id = o.recipe_id WHERE ra.verdict = 'never'`
		)
		.all()
		.map((r) => r.name);

	const cravings = db
		.prepare(
			`SELECT craving_notes FROM weeks WHERE craving_notes IS NOT NULL AND week_of < ?
			 ORDER BY week_of DESC LIMIT 1`
		)
		.get(weekOf) as { craving_notes: string } | undefined;

	const catalog = db
		.prepare('SELECT name, unit, aisle, pantry_staple FROM ingredient_catalog ORDER BY name')
		.all()
		.map((c) => ({
			name: c.name,
			unit: c.unit,
			aisle: c.aisle,
			pantry_staple: c.pantry_staple === 1
		}));

	const month = new Date(weekOf + 'T00:00:00Z').toLocaleDateString('en-US', {
		month: 'long',
		timeZone: 'UTC'
	});

	return {
		week_of: weekOf,
		season: `${month}, Northern Hemisphere (US East Coast)`,
		cravings_for_this_week: cravings?.craving_notes ?? null,
		recently_eaten: recentMeals,
		rating_history: ratingHistory,
		never_suggest_again: neverAgain,
		kitchen: getKitchen(),
		ingredient_catalog: catalog
	};
}

// ── Making the menu ─────────────────────────────────────────────────────

/**
 * Ask Claude for a full menu and save it as a draft week.
 * Returns the new week's date. Throws if something goes wrong.
 */
export async function generateMenu(weekOf: string, triggeredBy: Trigger): Promise<string> {
	if (weekExists(weekOf)) throw new Error(`There’s already a menu for the week of ${weekOf}.`);
	if (isRunning(['menu'], weekOf)) throw new Error('A menu is already being written.');

	const aiPerSlot = Number(getSetting('ai_options_per_slot', '2'));
	const bankPerSlot = Number(getSetting('bank_options_per_slot', '1'));
	const bankPicks = chooseBankPicks(weekOf, bankPerSlot);
	// Saved-to-try recipes take one of the new-recipe spots in a slot.
	const toTryPicks = chooseToTry(
		weekOf,
		new Set([...bankPicks.values()].flat().map((b) => b.recipeId))
	);

	// Claude writes the rest. If the bank doesn't have enough favourites yet,
	// Claude fills those spots too.
	const newOptionsPerSlot = Object.fromEntries(
		SLOTS.map((s) => [
			s.key,
			aiPerSlot - toTryPicks.get(s.key)!.length + (bankPerSlot - bankPicks.get(s.key)!.length)
		])
	);

	// Reuse an answer that arrived but couldn't be saved, rather than paying twice.
	const result =
		findUnsavedAnswer('menu', weekOf, MenuAnswer) ??
		(await askClaude({
			kind: 'menu',
			weekOf,
			triggeredBy,
			prompt: loadPrompt('menu'),
			schema: MenuAnswer,
			details: {
				...gatherDetails(weekOf),
				new_options_needed_per_slot: newOptionsPerSlot,
				recipe_bank_picks_already_chosen: Object.fromEntries(
					SLOTS.map((s) => [s.key, bankPicks.get(s.key)!.map((b) => `${b.name} (${b.cuisine})`)])
				),
				saved_recipes_already_chosen: Object.fromEntries(
					SLOTS.map((s) => [s.key, toTryPicks.get(s.key)!.map((b) => `${b.name} (${b.cuisine})`)])
				)
			}
		}));
	const answer = result.answer;

	// Check Claude gave each slot the right number of options.
	for (const slot of SLOTS) {
		const count = answer.options.filter((o) => o.slot === slot.key).length;
		if (count !== newOptionsPerSlot[slot.key]) {
			const problem = `Claude wrote ${count} options for ${slot.label} instead of ${newOptionsPerSlot[slot.key]}.`;
			throw new Error(markSaveFailed(result.runId, problem, false));
		}
	}

	try {
		saveMenu(weekOf, answer, bankPicks, toTryPicks);
	} catch (error) {
		throw new Error(markSaveFailed(result.runId, error));
	}
	markSaved(result.runId);
	return weekOf;
}

/** Save Claude's menu as a draft week. */
function saveMenu(
	weekOf: string,
	answer: MenuAnswer,
	bankPicks: Map<Slot, BankPick[]>,
	toTryPicks: Map<Slot, BankPick[]>
) {
	transaction(getDb(), () => {
		// Saved as a draft: not visible for picking until an owner approves it.
		const weekId = Number(
			getDb()
				.prepare("INSERT INTO weeks (week_of, status, is_draft) VALUES (?, 'picking', 1)")
				.run(weekOf).lastInsertRowid
		);
		saveNote(weekId, answer.note_to_owners);

		for (const slot of SLOTS) {
			// New picks get the first letters (A, B…), then saved-to-try, then favourites.
			const recipeIds = [
				...answer.options
					.filter((o) => o.slot === slot.key)
					.map((o) => ({ id: saveRecipe(o.recipe), bank: false })),
				...toTryPicks.get(slot.key)!.map((b) => ({ id: b.recipeId, bank: false })),
				...bankPicks.get(slot.key)!.map((b) => ({ id: b.recipeId, bank: true }))
			];
			recipeIds.forEach((r, i) =>
				getDb()
					.prepare(
						'INSERT INTO offers (week_id, slot, letter, recipe_id, from_bank) VALUES (?, ?, ?, ?, ?)'
					)
					.run(weekId, slot.key, 'ABCD'[i], r.id, r.bank ? 1 : 0)
			);
		}
	});
}

/** Replace one option in a draft with a different new recipe. */
export async function swapOption(offerId: number, triggeredBy: Trigger): Promise<void> {
	const db = getDb();
	const offer = db
		.prepare(
			`SELECT o.id, o.slot, o.week_id, o.recipe_id, w.week_of, r.name
			 FROM offers o JOIN weeks w ON w.id = o.week_id JOIN recipes r ON r.id = o.recipe_id
			 WHERE o.id = ? AND w.is_draft = 1`
		)
		.get(offerId) as
		| { id: number; slot: Slot; week_id: number; recipe_id: number; week_of: string; name: string }
		| undefined;
	if (!offer) throw new Error('That option isn’t in a draft menu.');
	if (isRunning(['menu', 'swap'], offer.week_of))
		throw new Error('Claude is already working on this menu.');

	const otherOptions = db
		.prepare(
			`SELECT o.slot, r.name, r.cuisine FROM offers o JOIN recipes r ON r.id = o.recipe_id
			 WHERE o.week_id = ? AND o.id != ?`
		)
		.all(offer.week_id, offer.id);

	const { answer, runId } = await askClaude({
		kind: 'swap',
		weekOf: offer.week_of,
		triggeredBy,
		prompt: loadPrompt('menu'),
		schema: SwapAnswer,
		details: {
			...gatherDetails(offer.week_of),
			task:
				`Write ONE new recipe to replace "${offer.name}" in ${SLOTS.find((s) => s.key === offer.slot)!.label}. ` +
				'They want something different from it. Keep the week varied against the other options listed. ' +
				'Return just the recipe (no note_to_owners needed).',
			other_options_this_week: otherOptions
		}
	});

	try {
		transaction(db, () => {
			const recipeId = saveRecipe(answer.recipe);
			db.prepare('UPDATE offers SET recipe_id = ?, from_bank = 0 WHERE id = ?').run(
				recipeId,
				offer.id
			);
			deleteIfUnused(offer.recipe_id);
		});
	} catch (error) {
		throw new Error(markSaveFailed(runId, error));
	}
}

/** Approve a draft: it becomes the current week, open for picking. */
export function approveDraft(weekId: number): boolean {
	const db = getDb();
	const draft = db
		.prepare('SELECT week_of FROM weeks WHERE id = ? AND is_draft = 1')
		.get(weekId) as { week_of: string } | undefined;
	if (!draft) return false;
	transaction(db, () => {
		db.prepare('UPDATE weeks SET is_draft = 0 WHERE id = ?').run(weekId);
		// Earlier weeks are finished once the new one starts.
		db.prepare("UPDATE weeks SET status = 'done' WHERE week_of < ? AND is_draft = 0").run(
			draft.week_of
		);
	});
	return true;
}

/** Throw away a draft (and the recipes written only for it). */
export function discardDraft(weekId: number): boolean {
	const db = getDb();
	const recipeIds = db
		.prepare(
			'SELECT o.recipe_id FROM offers o JOIN weeks w ON w.id = o.week_id WHERE w.id = ? AND w.is_draft = 1'
		)
		.all(weekId)
		.map((r) => r.recipe_id as number);
	const deleted = transaction(db, () => {
		const result = db.prepare('DELETE FROM weeks WHERE id = ? AND is_draft = 1').run(weekId);
		for (const id of recipeIds) deleteIfUnused(id);
		return result.changes > 0;
	});
	return deleted;
}

// ── Saving recipes ──────────────────────────────────────────────────────

/** Save one of Claude's recipes, matching its ingredients to the catalog. */
function saveRecipe(recipe: NewRecipe): number {
	const db = getDb();
	const recipeId = Number(
		db
			.prepare(
				`INSERT INTO recipes (name, origin, source_url, meal_type, cuisine, servings, total_minutes)
				 VALUES (?, 'ai', ?, ?, ?, ?, ?)`
			)
			.run(
				recipe.name.trim(),
				safeUrl(recipe.source_url),
				recipe.meal_type,
				recipe.cuisine,
				recipe.servings,
				recipe.total_minutes
			).lastInsertRowid
	);

	// Combine any ingredient listed twice, after matching it to the catalog.
	const totals = new Map<number, { quantity: number | null; prepNote: string | null }>();
	for (const ingredient of recipe.ingredients) {
		const id = findOrAddIngredient(ingredient);
		const existing = totals.get(id);
		if (!existing) {
			totals.set(id, { quantity: ingredient.quantity, prepNote: ingredient.prep_note });
		} else if (existing.quantity !== null && ingredient.quantity !== null) {
			existing.quantity += ingredient.quantity;
		}
	}
	const insertIngredient = db.prepare(
		'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, prep_note) VALUES (?, ?, ?, ?)'
	);
	for (const [id, line] of totals) insertIngredient.run(recipeId, id, line.quantity, line.prepNote);

	const insertStep = db.prepare(
		`INSERT INTO recipe_steps (recipe_id, step_order, instruction, equipment, oven_temp_f,
		   active_minutes, passive_minutes, depends_on_step, can_batch_with)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);
	recipe.steps.forEach((step, i) =>
		insertStep.run(
			recipeId,
			i + 1,
			step.instruction,
			step.equipment,
			step.equipment === 'oven' ? step.oven_temp_f : null,
			Math.max(0, step.active_minutes),
			Math.max(0, step.passive_minutes),
			step.depends_on_step && step.depends_on_step <= i ? step.depends_on_step : null,
			step.can_batch_with
		)
	);
	return recipeId;
}

/**
 * Match an ingredient to the catalog by name (ignoring capitals and a plural
 * "s"), or add it as a new catalog entry when Claude marked it as new.
 */
function findOrAddIngredient(ingredient: NewRecipe['ingredients'][number]): number {
	const db = getDb();
	const name = ingredient.name.trim();
	const singular = name.replace(/e?s$/i, '');
	const match = db
		.prepare(
			`SELECT id FROM ingredient_catalog
			 WHERE lower(name) IN (lower(?), lower(?), lower(?) || 's', lower(?) || 'es') LIMIT 1`
		)
		.get(name, singular, singular, singular) as { id: number } | undefined;
	if (match) return match.id;

	const entry = ingredient.new_catalog_entry ?? {
		// Claude used a name we don't know but didn't describe it: file under Other.
		aisle: 'Other' as const,
		unit: 'each' as const,
		pantry_staple: false,
		where_to_buy: null
	};
	return Number(
		db
			.prepare(
				'INSERT INTO ingredient_catalog (name, aisle, unit, pantry_staple, where_to_buy) VALUES (?, ?, ?, ?, ?)'
			)
			.run(name, entry.aisle, entry.unit, entry.pantry_staple ? 1 : 0, entry.where_to_buy)
			.lastInsertRowid
	);
}

/** Delete a recipe if no week offers it anymore (e.g. after a swap). */
function deleteIfUnused(recipeId: number) {
	getDb()
		.prepare(
			'DELETE FROM recipes WHERE id = ? AND NOT EXISTS (SELECT 1 FROM offers WHERE recipe_id = ?)'
		)
		.run(recipeId, recipeId);
}

/** Only keep http(s) links. */
function safeUrl(url: string | null): string | null {
	return url && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

// Claude's note about the week is kept with the week, shown on the review page.
function saveNote(weekId: number, note: string) {
	getDb()
		.prepare('INSERT OR REPLACE INTO week_notes (week_id, note) VALUES (?, ?)')
		.run(weekId, note.trim());
}
