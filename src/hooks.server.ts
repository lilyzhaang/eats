// Runs on the server before every request. Two jobs:
//   1. Work out who is signed in (from the session cookie).
//   2. Enforce the rules: signed-out people go to /signin, and viewers
//      can't change anything. This check happens here, on the server,
//      so hiding buttons in the browser isn't the only protection.

import { error, redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { getSessionUser, SESSION_COOKIE } from '#lib/server/auth.ts';

// Pages you can open without being signed in.
const PUBLIC_PATHS = ['/signin'];

// Things a viewer is allowed to submit (everything else that changes data is blocked).
const VIEWER_ALLOWED_POSTS = ['/signin', '/signout', '/switch'];

const READ_ONLY_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = token ? getSessionUser(token) : null;

	// The cookie pointed at a session that no longer exists (expired, or the passcode changed).
	if (token && !event.locals.user) {
		event.cookies.delete(SESSION_COOKIE, { path: '/' });
	}

	const path = event.url.pathname;
	const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'));

	if (!event.locals.user && !isPublic) {
		// Remember where they were going (e.g. the Shop link in a nudge email).
		const next = path + event.url.search;
		redirect(303, `/signin?next=${encodeURIComponent(next)}`);
	}

	const user = event.locals.user;
	if (
		user?.role === 'viewer' &&
		!READ_ONLY_METHODS.includes(event.request.method) &&
		!VIEWER_ALLOWED_POSTS.some((p) => path.startsWith(p))
	) {
		error(403, 'Viewing only: this account can’t make changes.');
	}

	return resolve(event);
};
