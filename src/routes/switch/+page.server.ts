// "Switch person": a signed-in owner switches between Lily and Andrei
// without typing the passcode again. Visitors who aren't signed in go to sign-in.

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/app-db.ts';
import { SESSION_COOKIE, switchSessionPersona } from '#lib/server/auth.ts';

function listOwners() {
	return getDb()
		.prepare("SELECT id, name FROM personas WHERE role = 'owner' ORDER BY sort_order, id")
		.all() as { id: number; name: string }[];
}

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user.signedIn) redirect(303, '/signin');
	return { owners: listOwners(), currentId: locals.user.personaId };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		if (!locals.user.signedIn) redirect(303, '/signin');

		const personaId = Number((await request.formData()).get('persona'));
		if (!listOwners().some((o) => o.id === personaId))
			return fail(400, { message: 'Unknown person.' });

		switchSessionPersona(cookies.get(SESSION_COOKIE)!, personaId);
		redirect(303, '/');
	}
};
