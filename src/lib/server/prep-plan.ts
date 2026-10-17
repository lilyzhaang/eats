// The Cook screen's logic: the stored prep-day plan for a week.
//
// In phase 1 plans are imported (hand- or Claude-written), not generated.
// Each step has a clock time, one or more equipment lanes, the recipes it's
// for, and an optional "why" note. Steps can be checked off by either owner.

import { getDb } from './app-db.ts';
import type { Week } from './weeks.ts';

export type Lane = 'oven' | 'burner_1' | 'burner_2' | 'kettle' | 'hands';

export type PlanStep = {
	id: number;
	clockMinute: number;
	instruction: string;
	lanes: Lane[];
	recipeLabel: string | null;
	whyNote: string | null;
	/** Initials of whoever checked it off, or null. */
	checkedBy: string | null;
};

export type PrepPlan = {
	totalMinutes: number | null;
	ovenTempF: number | null;
	ovenMinutes: number | null;
	burners: number | null;
	usesKettle: boolean;
	steps: PlanStep[];
};

export function getPrepPlan(week: Week): PrepPlan | null {
	const db = getDb();
	const plan = db.prepare('SELECT * FROM prep_plans WHERE week_id = ?').get(week.id) as
		Record<string, unknown> | undefined;
	if (!plan) return null;

	const steps = db
		.prepare(
			`SELECT s.id, s.clock_minute, s.instruction, s.equipment_lanes, s.recipe_label, s.why_note,
			        p.initials AS checked_by
			 FROM prep_plan_steps s LEFT JOIN personas p ON p.id = s.checked_by
			 WHERE s.plan_id = ? ORDER BY s.step_order`
		)
		.all(plan.id as number) as Record<string, unknown>[];

	return {
		totalMinutes: plan.total_minutes as number | null,
		ovenTempF: plan.oven_temp_f as number | null,
		ovenMinutes: plan.oven_minutes as number | null,
		burners: plan.burners as number | null,
		usesKettle: plan.uses_kettle === 1,
		steps: steps.map((s) => ({
			id: s.id as number,
			clockMinute: s.clock_minute as number,
			instruction: s.instruction as string,
			lanes: (s.equipment_lanes as string).split(',').map((l) => l.trim()) as Lane[],
			recipeLabel: s.recipe_label as string | null,
			whyNote: s.why_note as string | null,
			checkedBy: s.checked_by as string | null
		}))
	};
}

/** Check or uncheck a step. Only steps from this week's plan can be changed. */
export function setStepChecked(
	week: Week,
	stepId: number,
	personaId: number,
	checked: boolean
): boolean {
	const result = getDb()
		.prepare(
			`UPDATE prep_plan_steps
			 SET checked_by = ?, checked_at = CASE WHEN ? THEN datetime('now') END
			 WHERE id = ? AND plan_id = (SELECT id FROM prep_plans WHERE week_id = ?)`
		)
		.run(checked ? personaId : null, checked ? 1 : 0, stepId, week.id);
	return result.changes > 0;
}
