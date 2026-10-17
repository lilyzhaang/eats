// "Switch person".
//
// Signed in with the owner passcode → switch freely between Lily, Andrei and Viewer.
// Signed in with the viewer passcode → you have to go through sign-in again,
// so the owner passcode is needed to become Lily or Andrei.

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/app-db.ts';
import { SESSION_COOKIE, switchSessionPersona } from '#lib/server/auth.ts';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user?.passcodeKind !== 'owner') redirect(303, '/signin');

	const personas = getDb()
		.prepare('SELECT id, name, role FROM personas ORDER BY sort_order, id')
		.all() as { id: number; name: string; role: string }[];
	return { personas, currentId: locals.user.personaId };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		if (locals.user?.passcodeKind !== 'owner') redirect(303, '/signin');

		const personaId = Number((await request.formData()).get('persona'));
		const exists = getDb().prepare('SELECT 1 FROM personas WHERE id = ?').get(personaId);
		if (!exists) return fail(400, { message: 'Unknown person.' });

		switchSessionPersona(cookies.get(SESSION_COOKIE)!, personaId);
		redirect(303, '/');
	}
};
