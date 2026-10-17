// The sign-in screen: passcode + "Who are you?".

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/app-db.ts';
import {
	checkPasscode,
	clearFailedAttempts,
	createSession,
	deleteSession,
	isRateLimited,
	passcodesConfigured,
	recordFailedAttempt,
	SESSION_COOKIE,
	SESSION_DAYS
} from '#lib/server/auth.ts';

type PersonaRow = { id: number; name: string; role: 'owner' | 'viewer' };

function listPersonas(): PersonaRow[] {
	return getDb()
		.prepare('SELECT id, name, role FROM personas ORDER BY sort_order, id')
		.all() as PersonaRow[];
}

/**
 * Only allow redirects to pages inside this app, so a crafted link
 * can't bounce someone to another website after they sign in.
 */
function safeNext(value: string | null): string {
	if (value && value.startsWith('/') && !value.startsWith('//')) return value;
	return '/';
}

export const load: PageServerLoad = ({ url, locals }) => {
	return {
		personas: listPersonas(),
		next: safeNext(url.searchParams.get('next')),
		signedInAs: locals.user?.name ?? null,
		configured: passcodesConfigured()
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		const form = await request.formData();
		const passcode = String(form.get('passcode') ?? '');
		const personaId = Number(form.get('persona'));
		const next = safeNext(String(form.get('next') ?? ''));
		const address = getClientAddress();

		if (isRateLimited(address)) {
			return fail(429, { personaId, message: 'Too many tries. Wait 15 minutes and try again.' });
		}

		const persona = listPersonas().find((p) => p.id === personaId);
		if (!persona) {
			return fail(400, { personaId, message: 'Choose who you are.' });
		}

		const kind = checkPasscode(passcode);
		if (!kind) {
			recordFailedAttempt(address);
			return fail(400, { personaId, message: 'That passcode didn’t work.' });
		}

		// The viewer passcode only ever opens viewer personas.
		if (kind === 'viewer' && persona.role !== 'viewer') {
			return fail(400, {
				personaId,
				message: 'That passcode is for viewing only. Choose Viewer, or use the owner passcode.'
			});
		}

		clearFailedAttempts(address);
		// Signing in again (e.g. switching from Viewer to Lily) replaces the old session.
		const oldToken = cookies.get(SESSION_COOKIE);
		if (oldToken) deleteSession(oldToken);
		const token = createSession(persona.id, kind);
		cookies.set(SESSION_COOKIE, token, {
			path: '/',
			httpOnly: true, // page scripts can't read it
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: SESSION_DAYS * 24 * 60 * 60
		});

		redirect(303, next);
	}
};
