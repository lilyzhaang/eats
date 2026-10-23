// Shop: the grocery list for this week's four picks, with shared checkboxes.

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getGroceryList, setGroceryCheck } from '#lib/server/grocery.ts';
import { formatWeekOf, getCookingWeek } from '#lib/server/weeks.ts';

export const load: PageServerLoad = () => {
	// The list exists once all four slots are agreed. While a new week is still
	// being picked, last week's list stays here (isPrevious) until it locks in.
	const cooking = getCookingWeek();
	if (!cooking) return { list: null, shownWeek: null };
	return {
		list: getGroceryList(cooking.week),
		shownWeek: { label: formatWeekOf(cooking.week.week_of), isPrevious: cooking.isPrevious }
	};
};

export const actions: Actions = {
	// Each row's button sends "ingredientId:1" to tick or "ingredientId:0" to untick.
	check: async ({ request, locals }) => {
		if (locals.user.role !== 'owner') return fail(403, { message: 'Viewing only.' });

		const [id, checked] = String((await request.formData()).get('toggle')).split(':');
		const week = getCookingWeek()?.week;
		if (!week || !setGroceryCheck(week, Number(id), locals.user.personaId, checked === '1')) {
			return fail(400, { message: 'That item isn’t on this week’s list.' });
		}
	}
};
