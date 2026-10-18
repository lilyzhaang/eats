// Data every main screen needs: who's signed in, and which week it is.
// The (app) folder name in brackets groups these pages without adding to the URL.

import type { LayoutServerLoad } from './$types';
import { formatWeekOf, getCurrentWeek, getDraftWeek } from '#lib/server/weeks.ts';

export const load: LayoutServerLoad = ({ locals }) => {
	const week = getCurrentWeek();
	const draft = getDraftWeek();
	return {
		// hooks.server.ts has already sent signed-out visitors to /signin.
		user: locals.user!,
		week: week ? { ...week, label: formatWeekOf(week.week_of) } : null,
		// Owners see a banner when Claude's next menu is waiting for review.
		draftLabel: draft && locals.user!.role === 'owner' ? formatWeekOf(draft.week_of) : null
	};
};
