// Review: look over the menu Claude wrote for next week, swap options you
// don't fancy, then approve it so it opens for picking. Owners only.

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	approveDraft,
	discardDraft,
	generateMenu,
	nextMenuWeekOf,
	swapOption
} from '#lib/server/ai/menu.ts';
import { claudeConfigured } from '#lib/server/ai/claude.ts';
import { getReview, todayAtHome } from '#lib/server/review.ts';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user.role !== 'owner') redirect(303, '/pick');
	return { review: getReview() };
};

/**
 * Claude takes a minute or two, so these start the work and return straight
 * away. The page checks back every few seconds until it's done. Problems
 * show up on the page from the ai_runs log.
 */
async function inBackground(work: Promise<unknown>): Promise<string | null> {
	work.catch((error) => console.error('Claude request failed:', error.message));
	// If it fails right away (e.g. a menu is already being written), say why.
	const quickResult = await Promise.race([
		work.then(
			() => null,
			(error: Error) => error.message
		),
		new Promise<null>((resolve) => setTimeout(() => resolve(null), 300))
	]);
	return quickResult;
}

export const actions: Actions = {
	generate: async ({ locals }) => {
		if (locals.user.role !== 'owner') return fail(403, { message: 'Viewing only.' });
		if (!claudeConfigured()) return fail(400, { message: 'Add your Claude API key first.' });
		const error = await inBackground(generateMenu(nextMenuWeekOf(todayAtHome()), 'owner'));
		if (error) return fail(400, { message: error });
		// Started from the Pick page: go to the review page to watch it arrive.
		redirect(303, '/review');
	},

	swap: async ({ request, locals }) => {
		if (locals.user.role !== 'owner') return fail(403, { message: 'Viewing only.' });
		if (!claudeConfigured()) return fail(400, { message: 'Add your Claude API key first.' });
		const offerId = Number((await request.formData()).get('offer'));
		const error = await inBackground(swapOption(offerId, 'owner'));
		if (error) return fail(400, { message: error });
	},

	approve: async ({ request, locals }) => {
		if (locals.user.role !== 'owner') return fail(403, { message: 'Viewing only.' });
		const weekId = Number((await request.formData()).get('week'));
		if (!approveDraft(weekId)) return fail(400, { message: 'That menu isn’t waiting for review.' });
		redirect(303, '/pick');
	},

	discard: async ({ request, locals }) => {
		if (locals.user.role !== 'owner') return fail(403, { message: 'Viewing only.' });
		const weekId = Number((await request.formData()).get('week'));
		if (!discardDraft(weekId)) return fail(400, { message: 'That menu isn’t waiting for review.' });
	}
};
