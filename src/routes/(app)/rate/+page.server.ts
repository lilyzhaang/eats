// Rate: the weekly debrief for the most recently locked-in week.

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDebrief, getRateWeek, saveClosing, saveRating } from '#lib/server/ratings.ts';
import { formatWeekOf } from '#lib/server/weeks.ts';

export const load: PageServerLoad = () => {
	const week = getRateWeek();
	if (!week) return { debrief: null, rateWeek: null };
	return {
		debrief: getDebrief(week),
		rateWeek: { label: formatWeekOf(week.week_of) }
	};
};

/** Read an optional whole number from a form field ("" → null). */
function optionalNumber(value: FormDataEntryValue | null): number | null {
	return value === null || value === '' ? null : Number(value);
}

export const actions: Actions = {
	// Save the signed-in person's stars, verdict and tweak for one meal.
	rate: async ({ request, locals }) => {
		if (locals.user?.role !== 'owner') return fail(403, { message: 'Viewing only.' });
		const form = await request.formData();
		const offerId = Number(form.get('offer'));
		const week = getRateWeek();
		const error = week
			? saveRating(week, locals.user.personaId, {
					offerId,
					stars: optionalNumber(form.get('stars')),
					verdict: (form.get('verdict') as string | null) ?? null,
					tweakText: String(form.get('tweak') ?? '')
				})
			: 'There’s no week to rate yet.';
		if (error) return fail(400, { offerId, message: error });
		return { savedOfferId: offerId };
	},

	// Save the two closing questions.
	closing: async ({ request, locals }) => {
		if (locals.user?.role !== 'owner') return fail(403, { message: 'Viewing only.' });
		const form = await request.formData();
		const week = getRateWeek();
		const error = week
			? saveClosing(week, locals.user.personaId, {
					bestOfferId: optionalNumber(form.get('best')),
					cravings: String(form.get('cravings') ?? '')
				})
			: 'There’s no week to rate yet.';
		if (error) return fail(400, { closing: true, message: error });
		return { closingSaved: true };
	}
};
