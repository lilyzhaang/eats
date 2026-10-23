// Pick: load this week's options and save each person's choice.

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPickBoard, savePick } from '#lib/server/picks.ts';
import { getNextMenuStatus } from '#lib/server/review.ts';
import { getCurrentWeek } from '#lib/server/weeks.ts';

export const load: PageServerLoad = ({ locals }) => {
	const week = getCurrentWeek();
	// Owners get the "Next week" button at the bottom of the page.
	const nextMenu = locals.user.role === 'owner' ? getNextMenuStatus() : null;
	if (!week) return { board: null, nextMenu };
	return { board: getPickBoard(week), nextMenu };
};

export const actions: Actions = {
	// Tapping a card submits its offer id here.
	pick: async ({ request, locals }) => {
		// hooks.server.ts already blocks viewers; this double-checks.
		if (locals.user.role !== 'owner') return fail(403, { message: 'Viewing only.' });

		const week = getCurrentWeek();
		const offerId = Number((await request.formData()).get('offer'));
		if (!week || !savePick(week, locals.user.personaId, offerId)) {
			return fail(400, { message: 'That option isn’t on this week’s menu.' });
		}
	}
};
