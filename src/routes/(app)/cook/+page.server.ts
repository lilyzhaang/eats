// Cook: the prep-day plan for this week's four picks, with checkable steps.

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrepPlan, setStepChecked } from '#lib/server/prep-plan.ts';
import { getCurrentWeek } from '#lib/server/weeks.ts';

export const load: PageServerLoad = () => {
	const week = getCurrentWeek();
	// Like the grocery list, the plan is for the agreed picks, so wait for lock-in.
	if (!week || week.status === 'picking') return { plan: null, reason: 'picking' as const };
	const plan = getPrepPlan(week);
	return plan ? { plan, reason: null } : { plan: null, reason: 'no-plan' as const };
};

export const actions: Actions = {
	// Each step's button sends "stepId:1" to check or "stepId:0" to uncheck.
	check: async ({ request, locals }) => {
		if (locals.user?.role !== 'owner') return fail(403, { message: 'Viewing only.' });

		const [id, checked] = String((await request.formData()).get('toggle')).split(':');
		const week = getCurrentWeek();
		if (!week || !setStepChecked(week, Number(id), locals.user.personaId, checked === '1')) {
			return fail(400, { message: 'That step isn’t in this week’s plan.' });
		}
	}
};
