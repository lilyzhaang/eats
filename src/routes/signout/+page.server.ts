// Sign out: forget this device's session.

import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteSession, SESSION_COOKIE } from '#lib/server/auth.ts';

// Visiting /signout directly just goes home; signing out is a button (a POST),
// so a stray link can't sign someone out.
export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) deleteSession(token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/signin');
	}
};
