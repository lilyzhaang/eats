// Writes the prep-day plan once a week's picks lock in.
//
// Claude gets the four chosen recipes (ingredients, structured steps, any
// saved tweaks) and the kitchen equipment, and returns one timeline that
// follows the sequencing rules in prompts/prep-plan.md (§8 of CLAUDE.md).

import { getDb } from '../app-db.ts';
import { getKitchen } from '../settings.ts';
import { transaction } from '../db/index.ts';
import { SLOTS, type Week } from '../weeks.ts';
import {
	askClaude,
	claudeConfigured,
	countRuns,
	findStoredAnswer,
	isRunning,
	loadPrompt,
	markSaved,
	markSaveFailed,
	type Trigger
} from './claude.ts';
import { PlanAnswer } from './schemas.ts';

/** Sorted ids of the week's final picks, e.g. "3,7,12,15". */
function finalPickKey(weekId: number): string {
	return (
		getDb()
			.prepare(
				'SELECT recipe_id FROM offers WHERE week_id = ? AND is_final_pick = 1 ORDER BY recipe_id'
			)
			.all(weekId) as { recipe_id: number }[]
	)
		.map((r) => r.recipe_id)
		.join(',');
}

/** Does this week need a (new) plan written? */
export function planNeeded(week: Week): boolean {
	if (week.status !== 'locked') return false;
	const plan = getDb()
		.prepare('SELECT for_recipe_ids FROM prep_plans WHERE week_id = ?')
		.get(week.id) as { for_recipe_ids: string | null } | undefined;
	if (!plan) return true;
	// A hand-imported plan (no recipe list) is kept as is.
	return plan.for_recipe_ids !== null && plan.for_recipe_ids !== finalPickKey(week.id);
}

/**
 * Start writing the plan in the background if it's needed. Safe to call
 * often: it does nothing if a plan is current or already being written.
 */
/**
 * Plans are written automatically (at lock-in, or opening Cook) at most this
 * many times a week. Flipping picks back and forth can't run up a bill;
 * after this, someone taps "Write the plan" on Cook to ask again.
 */
const AUTO_PLAN_LIMIT = 3;

export function autoPlanLimitReached(week: Week): boolean {
	return countRuns('prep_plan', week.week_of, 'lock_in') >= AUTO_PLAN_LIMIT;
}

export function ensurePrepPlan(week: Week, triggeredBy: Trigger): void {
	if (!claudeConfigured() || !planNeeded(week) || isRunning('prep_plan', week.week_of)) return;
	// A plan Claude already wrote for these same four recipes is reused for free,
	// so only count against the limit when Claude would actually be asked.
	const free = findStoredAnswer('prep_plan', week.week_of, finalPickKey(week.id), PlanAnswer);
	if (!free && triggeredBy === 'lock_in' && autoPlanLimitReached(week)) return;
	writePrepPlan(week, triggeredBy).catch((error) => {
		console.error(`Prep plan for ${week.week_of} failed:`, error.message);
	});
}

export async function writePrepPlan(week: Week, triggeredBy: Trigger): Promise<void> {
	const db = getDb();
	const key = finalPickKey(week.id);

	const recipes = db
		.prepare(
			`SELECT r.id, r.name, r.servings, o.slot,
			        (SELECT ra.tweak_text FROM ratings ra JOIN offers o2 ON o2.id = ra.offer_id
			          JOIN weeks w2 ON w2.id = o2.week_id
			          WHERE o2.recipe_id = r.id AND ra.verdict = 'tweak' AND w2.week_of < ?
			          ORDER BY w2.week_of DESC LIMIT 1) AS tweak
			 FROM offers o JOIN recipes r ON r.id = o.recipe_id
			 WHERE o.week_id = ? AND o.is_final_pick = 1`
		)
		.all(week.week_of, week.id) as {
		id: number;
		name: string;
		servings: number;
		slot: string;
		tweak: string | null;
	}[];

	const details = {
		kitchen: getKitchen(),
		recipes: recipes.map((r) => ({
			name: r.name,
			slot: SLOTS.find((s) => s.key === r.slot)?.label,
			servings: r.servings,
			saved_tweak: r.tweak,
			ingredients: db
				.prepare(
					`SELECT c.name, ri.quantity, c.unit, ri.prep_note FROM recipe_ingredients ri
					 JOIN ingredient_catalog c ON c.id = ri.ingredient_id WHERE ri.recipe_id = ?`
				)
				.all(r.id),
			steps: db
				.prepare(
					`SELECT step_order, instruction, equipment, oven_temp_f, active_minutes, passive_minutes,
					        depends_on_step, can_batch_with
					 FROM recipe_steps WHERE recipe_id = ? ORDER BY step_order`
				)
				.all(r.id)
		})),
		note: 'If a recipe has no steps listed, plan it from its name and ingredients the way a home cook would.'
	};

	// If Claude already wrote a plan for exactly these four recipes this week
	// (e.g. the picks changed and then changed back), reuse it: never pay twice.
	const result =
		findStoredAnswer('prep_plan', week.week_of, key, PlanAnswer) ??
		(await askClaude({
			kind: 'prep_plan',
			weekOf: week.week_of,
			triggeredBy,
			prompt: loadPrompt('prep-plan'),
			schema: PlanAnswer,
			details,
			forKey: key
		}));
	const plan = result.answer;

	// The picks may have changed while Claude was writing. If so, this plan is out of date.
	if (finalPickKey(week.id) !== key) return;

	const idByName = new Map(recipes.map((r) => [r.name.toLowerCase(), r.id]));
	const steps = [...plan.steps].sort((a, b) => a.clock_minute - b.clock_minute);

	try {
		transaction(db, () => {
			db.prepare('DELETE FROM prep_plans WHERE week_id = ?').run(week.id);
			const planId = Number(
				db
					.prepare(
						`INSERT INTO prep_plans (week_id, total_minutes, oven_temp_f, oven_minutes, burners, uses_kettle, for_recipe_ids)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`
					)
					.run(
						week.id,
						plan.total_minutes,
						plan.oven_temp_f,
						plan.oven_minutes,
						plan.burners_used,
						plan.uses_kettle ? 1 : 0,
						key
					).lastInsertRowid
			);
			const insertStep = db.prepare(
				`INSERT INTO prep_plan_steps (plan_id, step_order, clock_minute, instruction, equipment_lanes, recipe_label, why_note)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
			);
			const linkRecipe = db.prepare(
				'INSERT OR IGNORE INTO prep_plan_step_recipes (step_id, recipe_id) VALUES (?, ?)'
			);
			steps.forEach((step, i) => {
				const stepId = Number(
					insertStep.run(
						planId,
						i + 1,
						Math.max(0, step.clock_minute),
						step.instruction,
						(step.lanes.length ? step.lanes : ['hands']).join(','),
						step.recipe_label,
						step.why_note
					).lastInsertRowid
				);
				for (const name of step.recipe_names) {
					const id = idByName.get(name.toLowerCase());
					if (id) linkRecipe.run(stepId, id);
				}
			});
		});
	} catch (error) {
		throw new Error(markSaveFailed(result.runId, error));
	}
	markSaved(result.runId);
}
