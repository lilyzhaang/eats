import type { PageServerLoad } from './$types';
import { getCurrentWeek, getOffers, SLOTS } from '#lib/server/weeks.ts';

export const load: PageServerLoad = () => {
	const week = getCurrentWeek();
	const offers = week ? getOffers(week.id) : [];
	return {
		slots: SLOTS.map((slot) => ({
			...slot,
			offers: offers.filter((o) => o.slot === slot.key)
		}))
	};
};
