// Cook: the prep-day plan for this week's four picks, with checkable steps.

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { claudeConfigured, latestRun } from '#lib/server/ai/claude.ts';
import { autoPlanLimitReached, ensurePrepPlan, planNeeded } from '#lib/server/ai/plan-writer.ts';
import { getPrepPlan, setStepChecked } from '#lib/server/prep-plan.ts';
import { formatWeekOf, getCookingWeek, type Week } from '#lib/server/weeks.ts';

export const load: PageServerLoad = ({ locals }) => {
	// Like the grocery list, the plan is for the agreed picks. While a new week
	// is still being picked, last week's plan stays here until it locks in.
	const cooking = getCookingWeek();
	if (!cooking) return { plan: null, reason: 'picking' as const, shownWeek: null };
	const shownWeek = {
		label: formatWeekOf(cooking.week.week_of),
		isPrevious: cooking.isPrevious
	};
	return { ...planFor(cooking.week, locals.user.role), shownWeek };
};

/** The plan to show for a locked-in week, or why there isn't one yet. */
function planFor(week: Week, role: string) {
	if (planNeeded(week)) {
		// No plan for these picks yet (or the picks changed): Claude writes one.
		let run = latestRun('prep_plan', week.week_of);
		// Start one if none has run yet, or the last one was for different picks.
		if ((!run || run.status === 'succeeded') && claudeConfigured()) {
			ensurePrepPlan(week, 'lock_in');
			run = latestRun('prep_plan', week.week_of);
		}
		// A plan stored earlier for these same recipes is put back straight away.
		if (planNeeded(week)) {
			if (run?.status === 'running') return { plan: null, reason: 'writing' as const };
			// Written automatically a few times already this week: wait to be asked.
			// (Checked before failures, which may have been for different picks.)
			if (claudeConfigured() && autoPlanLimitReached(week))
				return { plan: null, reason: 'limit' as const };
			if (run?.status === 'failed') {
				// Claude's error details are for owners only.
				const error = role === 'owner' ? run.error : null;
				return { plan: null, reason: 'failed' as const, error };
			}
			return { plan: null, reason: 'no-plan' as const };
		}
	}

	const plan = getPrepPlan(week);
	return plan ? { plan, reason: null } : { plan: null, reason: 'no-plan' as const };
}

export const actions: Actions = {
	// Ask Claude to try writing the plan again after a failure.
	retry: ({ locals }) => {
		if (locals.user.role !== 'owner') return fail(403, { message: 'Viewing only.' });
		const week = getCookingWeek()?.week;
		if (week) ensurePrepPlan(week, 'owner');
	},

	// Each step's button sends "stepId:1" to check or "stepId:0" to uncheck.
	check: async ({ request, locals }) => {
		if (locals.user.role !== 'owner') return fail(403, { message: 'Viewing only.' });

		const [id, checked] = String((await request.formData()).get('toggle')).split(':');
		const week = getCookingWeek()?.week;
		if (!week || !setStepChecked(week, Number(id), locals.user.personaId, checked === '1')) {
			return fail(400, { message: 'That step isn’t in this week’s plan.' });
		}
	}
};
