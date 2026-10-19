// The sign-in screen for Lily and Andrei: "Who are you?" + the owner passcode.
// Everyone else can use the app read-only without signing in.

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/app-db.ts';
import {
	checkOwnerPasscode,
	clearFailedAttempts,
	createSession,
	deleteSession,
	isRateLimited,
	passcodeConfigured,
	recordFailedAttempt,
	SESSION_COOKIE,
	SESSION_DAYS
} from '#lib/server/auth.ts';

type Owner = { id: number; name: string };

function listOwners(): Owner[] {
	return getDb()
		.prepare("SELECT id, name FROM personas WHERE role = 'owner' ORDER BY sort_order, id")
		.all() as Owner[];
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
		owners: listOwners(),
		next: safeNext(url.searchParams.get('next')),
		signedInAs: locals.user.signedIn ? locals.user.name : null,
		configured: passcodeConfigured()
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

		const owner = listOwners().find((p) => p.id === personaId);
		if (!owner) {
			return fail(400, { personaId, message: 'Choose who you are.' });
		}

		if (!checkOwnerPasscode(passcode)) {
			recordFailedAttempt(address);
			return fail(400, { personaId, message: 'That passcode didn’t work.' });
		}

		clearFailedAttempts(address);
		// Signing in again (e.g. switching from Andrei to Lily) replaces the old session.
		const oldToken = cookies.get(SESSION_COOKIE);
		if (oldToken) deleteSession(oldToken);
		const token = createSession(owner.id);
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
