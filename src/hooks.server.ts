// Runs on the server before every request. Two jobs:
//   1. Work out who this is: a signed-in owner (from the session cookie),
//      or otherwise a read-only viewer. No sign-in is needed to look.
//   2. Enforce the rules: viewers can't change anything. This check happens
//      here, on the server, so hiding buttons in the browser isn't the only
//      protection.

import { error } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { getSessionUser, guestViewer, SESSION_COOKIE } from '#lib/server/auth.ts';

// The only things a viewer may submit: signing in (and out).
const VIEWER_ALLOWED_POSTS = ['/signin', '/signout'];

const READ_ONLY_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	const sessionUser = token ? getSessionUser(token) : null;

	// The cookie pointed at a session that no longer exists (expired, or the passcode changed).
	if (token && !sessionUser) {
		event.cookies.delete(SESSION_COOKIE, { path: '/' });
	}

	event.locals.user = sessionUser ?? guestViewer();

	const path = event.url.pathname;
	if (
		event.locals.user.role === 'viewer' &&
		!READ_ONLY_METHODS.includes(event.request.method) &&
		!VIEWER_ALLOWED_POSTS.some((p) => path === p || path.startsWith(p + '/'))
	) {
		error(403, 'Viewing only. Sign in to make changes.');
	}

	const response = await resolve(event);
	// Ask search engines not to list the app.
	response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	return response;
};
