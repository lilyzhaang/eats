// Shop: the grocery list for this week's four picks, with shared checkboxes.

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getGroceryList, setGroceryCheck } from '#lib/server/grocery.ts';
import { getCurrentWeek } from '#lib/server/weeks.ts';

export const load: PageServerLoad = () => {
	const week = getCurrentWeek();
	// The list only exists once all four slots are agreed (the week is locked in).
	if (!week || week.status === 'picking') return { list: null };
	return { list: getGroceryList(week) };
};

export const actions: Actions = {
	// Each row's button sends "ingredientId:1" to tick or "ingredientId:0" to untick.
	check: async ({ request, locals }) => {
		if (locals.user.role !== 'owner') return fail(403, { message: 'Viewing only.' });

		const [id, checked] = String((await request.formData()).get('toggle')).split(':');
		const week = getCurrentWeek();
		if (!week || !setGroceryCheck(week, Number(id), locals.user.personaId, checked === '1')) {
			return fail(400, { message: 'That item isn’t on this week’s list.' });
		}
	}
};
