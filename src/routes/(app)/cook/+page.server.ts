// Cook: the prep-day plan for this week's four picks, with checkable steps.

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { claudeConfigured, latestRun } from '#lib/server/ai/claude.ts';
import { ensurePrepPlan, planNeeded } from '#lib/server/ai/plan-writer.ts';
import { getPrepPlan, setStepChecked } from '#lib/server/prep-plan.ts';
import { getCurrentWeek } from '#lib/server/weeks.ts';

export const load: PageServerLoad = ({ locals }) => {
	const week = getCurrentWeek();
	// Like the grocery list, the plan is for the agreed picks, so wait for lock-in.
	if (!week || week.status === 'picking') return { plan: null, reason: 'picking' as const };

	if (planNeeded(week)) {
		// No plan for these picks yet (or the picks changed): Claude writes one.
		let run = latestRun('prep_plan', week.week_of);
		// Start one if none has run yet, or the last one was for different picks.
		if ((!run || run.status === 'succeeded') && claudeConfigured()) {
			ensurePrepPlan(week, 'lock_in');
			run = latestRun('prep_plan', week.week_of);
		}
		if (run?.status === 'running') return { plan: null, reason: 'writing' as const };
		if (run?.status === 'failed')
			return { plan: null, reason: 'failed' as const, error: run.error };
		return { plan: null, reason: 'no-plan' as const };
	}

	const plan = getPrepPlan(week);
	return plan ? { plan, reason: null } : { plan: null, reason: 'no-plan' as const };
};

export const actions: Actions = {
	// Ask Claude to try writing the plan again after a failure.
	retry: ({ locals }) => {
		if (locals.user.role !== 'owner') return fail(403, { message: 'Viewing only.' });
		const week = getCurrentWeek();
		if (week) ensurePrepPlan(week, 'owner');
	},

	// Each step's button sends "stepId:1" to check or "stepId:0" to uncheck.
	check: async ({ request, locals }) => {
		if (locals.user.role !== 'owner') return fail(403, { message: 'Viewing only.' });

		const [id, checked] = String((await request.formData()).get('toggle')).split(':');
		const week = getCurrentWeek();
		if (!week || !setStepChecked(week, Number(id), locals.user.personaId, checked === '1')) {
			return fail(400, { message: 'That step isn’t in this week’s plan.' });
		}
	}
};
