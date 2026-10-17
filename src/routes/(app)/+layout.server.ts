// Data every main screen needs: who's signed in, and which week it is.
// The (app) folder name in brackets groups these pages without adding to the URL.

import type { LayoutServerLoad } from './$types';
import { formatWeekOf, getCurrentWeek } from '#lib/server/weeks.ts';

export const load: LayoutServerLoad = ({ locals }) => {
	const week = getCurrentWeek();
	return {
		// hooks.server.ts has already sent signed-out visitors to /signin.
		user: locals.user!,
		week: week ? { ...week, label: formatWeekOf(week.week_of) } : null
	};
};
