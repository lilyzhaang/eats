// Loads the sample data (sample-data.ts) into an empty database.
// Used by `npm run db:reset` and by tests.

import type { DatabaseSync } from 'node:sqlite';
import { transaction } from './index.ts';
import * as sample from './sample-data.ts';

export function seedSampleData(db: DatabaseSync): void {
	transaction(db, () => {
		// People (created by migration 002), looked up by name
		const personaRows = db.prepare('SELECT id, name, role FROM personas').all() as {
			id: number;
			name: string;
			role: string;
		}[];
		const personaIds = new Map(personaRows.map((p) => [p.name, p.id]));

		// Recipes
		const recipeIds = new Map<string, number>();
		const insertRecipe = db.prepare(
			`INSERT INTO recipes (name, origin, meal_type, cuisine, servings, total_minutes, notes, added_on)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		);
		for (const [key, r] of Object.entries(sample.recipes)) {
			// Recipes from the prior week were added before it; everything else the day before the sample week.
			const addedOn =
				key === 'ciorba' || key === 'tomato_egg_stir_fry' ? '2026-10-10' : '2026-10-17';
			const { lastInsertRowid } = insertRecipe.run(
				r.name,
				r.origin,
				r.meal_type,
				r.cuisine,
				r.servings,
				r.total_minutes,
				r.notes ?? null,
				addedOn
			);
			recipeIds.set(key, Number(lastInsertRowid));
		}

		// Ingredient catalog
		const ingredientIds = new Map<string, number>();
		const insertIngredient = db.prepare(
			'INSERT INTO ingredient_catalog (name, aisle, unit, pantry_staple, where_to_buy) VALUES (?, ?, ?, ?, ?)'
		);
		for (const [name, aisle, unit, pantry, where] of sample.ingredientCatalog) {
			const { lastInsertRowid } = insertIngredient.run(name, aisle, unit, pantry ? 1 : 0, where);
			ingredientIds.set(name, Number(lastInsertRowid));
		}

		// What goes into each recipe
		const insertRecipeIngredient = db.prepare(
			'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, prep_note) VALUES (?, ?, ?, ?)'
		);
		for (const [recipeKey, lines] of Object.entries(sample.recipeIngredients)) {
			for (const [ingredientName, quantity, prepNote] of lines) {
				insertRecipeIngredient.run(
					lookup(recipeIds, recipeKey),
					lookup(ingredientIds, ingredientName),
					quantity,
					prepNote
				);
			}
		}

		// Weeks, offers, picks and ratings
		const insertWeek = db.prepare('INSERT INTO weeks (week_of, status) VALUES (?, ?)');
		const insertOffer = db.prepare(
			`INSERT INTO offers (week_id, slot, letter, recipe_id, from_bank, is_final_pick)
			 VALUES (?, ?, ?, ?, ?, ?)`
		);
		const insertPick = db.prepare(
			'INSERT INTO picks (week_id, slot, persona_id, offer_id) VALUES (?, ?, ?, ?)'
		);
		const insertRating = db.prepare(
			'INSERT INTO ratings (offer_id, persona_id, stars, verdict, tweak_text) VALUES (?, ?, ?, ?, ?)'
		);
		const owners = personaRows.filter((p) => p.role === 'owner');
		const weekIds = new Map<string, number>();

		for (const week of sample.weeks) {
			const weekId = Number(insertWeek.run(week.week_of, week.status).lastInsertRowid);
			weekIds.set(week.week_of, weekId);
			const offerIdByRecipe = new Map<string, number>();

			for (const offer of week.offers) {
				const offerId = Number(
					insertOffer.run(
						weekId,
						offer.slot,
						offer.letter,
						lookup(recipeIds, offer.recipe),
						offer.from_bank ? 1 : 0,
						offer.picked ? 1 : 0
					).lastInsertRowid
				);
				offerIdByRecipe.set(offer.recipe, offerId);
				// In the sample data both owners agreed on every final pick.
				if (offer.picked) {
					for (const owner of owners) {
						insertPick.run(weekId, offer.slot, lookup(personaIds, owner.name), offerId);
					}
				}
			}

			for (const r of week.ratings ?? []) {
				insertRating.run(
					lookup(offerIdByRecipe, r.recipe),
					lookup(personaIds, r.person),
					r.stars,
					r.verdict,
					r.tweak_text ?? null
				);
			}
		}

		// Prep-day plan
		const plan = sample.prepPlan;
		const planId = Number(
			db
				.prepare(
					`INSERT INTO prep_plans (week_id, total_minutes, oven_temp_f, oven_minutes, burners, uses_kettle, for_recipe_ids)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`
				)
				.run(
					lookup(weekIds, plan.week_of),
					plan.total_minutes,
					plan.oven_temp_f,
					plan.oven_minutes,
					plan.burners,
					plan.uses_kettle ? 1 : 0,
					// The sample plan is for the sample week's picks; if they change, Claude rewrites it.
					finalPickKey(db, lookup(weekIds, plan.week_of))
				).lastInsertRowid
		);
		const insertStep = db.prepare(
			`INSERT INTO prep_plan_steps (plan_id, step_order, clock_minute, instruction, equipment_lanes, recipe_label, why_note)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		);
		const insertStepRecipe = db.prepare(
			'INSERT INTO prep_plan_step_recipes (step_id, recipe_id) VALUES (?, ?)'
		);
		plan.steps.forEach((step, index) => {
			const stepId = Number(
				insertStep.run(
					planId,
					index + 1,
					step.at,
					step.text,
					step.lanes,
					step.label,
					step.why ?? null
				).lastInsertRowid
			);
			for (const key of step.recipes) insertStepRecipe.run(stepId, lookup(recipeIds, key));
		});
	});
}

/** Sorted recipe ids of a week's final picks, matching ai/plan-writer.ts. */
function finalPickKey(db: DatabaseSync, weekId: number): string {
	return (
		db
			.prepare(
				'SELECT recipe_id FROM offers WHERE week_id = ? AND is_final_pick = 1 ORDER BY recipe_id'
			)
			.all(weekId) as { recipe_id: number }[]
	)
		.map((r) => r.recipe_id)
		.join(',');
}
/** Get an id from a map, or fail loudly if the sample data has a typo. */
function lookup(map: Map<string, number>, key: string): number {
	const id = map.get(key);
	if (id === undefined) throw new Error(`Sample data refers to "${key}", which doesn't exist`);
	return id;
}
