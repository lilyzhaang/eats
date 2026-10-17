// Sign-in: passcode + "Who are you?" (see §10 of CLAUDE.md).
//
// There are two passcodes, both set as environment variables:
//   OWNER_PASSCODE  — shared by Lily and Andrei; can sign in as anyone.
//   VIEWER_PASSCODE — can only sign in as a viewer (read-only).
//
// When someone signs in we create a session: a long random token stored in a
// cookie on their device. The database only keeps a hash of the token.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { OWNER_PASSCODE, VIEWER_PASSCODE } from '$app/env/private';
import { getDb } from './app-db.ts';

export const SESSION_COOKIE = 'eats_session';
export const SESSION_DAYS = 365;

export type PasscodeKind = 'owner' | 'viewer';

export type SessionUser = {
	personaId: number;
	name: string;
	initials: string;
	/** What this person can do right now. A viewer passcode always means 'viewer'. */
	role: 'owner' | 'viewer';
	/** Which passcode they signed in with. */
	passcodeKind: PasscodeKind;
};

function sha256(text: string): Buffer {
	return createHash('sha256').update(text).digest();
}

function passcodeFor(kind: PasscodeKind): string | undefined {
	return kind === 'owner' ? OWNER_PASSCODE : VIEWER_PASSCODE;
}

/**
 * Which passcode (if any) does this match?
 * We compare hashes with timingSafeEqual so the comparison takes the same time
 * whether the guess is close or not — that stops a guesser from learning anything.
 */
export function checkPasscode(guess: string): PasscodeKind | null {
	const guessHash = sha256(guess);
	for (const kind of ['owner', 'viewer'] as const) {
		const real = passcodeFor(kind);
		if (real && timingSafeEqual(guessHash, sha256(real))) return kind;
	}
	return null;
}

/**
 * A short fingerprint of the current passcode. Stored with each session;
 * if the passcode changes, old sessions no longer match and are signed out.
 */
function fingerprint(kind: PasscodeKind): string | null {
	const real = passcodeFor(kind);
	return real ? sha256(`${kind}:${real}`).toString('hex').slice(0, 16) : null;
}

/** Start a session and return the token to put in the cookie. */
export function createSession(personaId: number, kind: PasscodeKind): string {
	const token = randomBytes(32).toString('base64url');
	const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
	getDb()
		.prepare(
			`INSERT INTO sessions (token_hash, persona_id, passcode_kind, passcode_fingerprint, expires_at)
			 VALUES (?, ?, ?, ?, ?)`
		)
		.run(sha256(token).toString('hex'), personaId, kind, fingerprint(kind)!, expires.toISOString());
	return token;
}

/** Look up who a cookie token belongs to. Returns null if it's unknown, expired or stale. */
export function getSessionUser(token: string): SessionUser | null {
	const row = getDb()
		.prepare(
			`SELECT s.passcode_kind, s.passcode_fingerprint, s.expires_at,
			        p.id AS persona_id, p.name, p.initials, p.role
			 FROM sessions s JOIN personas p ON p.id = s.persona_id
			 WHERE s.token_hash = ?`
		)
		.get(sha256(token).toString('hex'));
	if (!row) return null;

	const kind = row.passcode_kind as PasscodeKind;
	const expired = new Date(row.expires_at as string) < new Date();
	const passcodeChanged = row.passcode_fingerprint !== fingerprint(kind);
	if (expired || passcodeChanged) {
		deleteSession(token);
		return null;
	}

	return {
		personaId: row.persona_id as number,
		name: row.name as string,
		initials: row.initials as string,
		// Belt and braces: a viewer passcode can never act as an owner,
		// even if the session somehow points at an owner persona.
		role: kind === 'viewer' ? 'viewer' : (row.role as 'owner' | 'viewer'),
		passcodeKind: kind
	};
}

/** Move an existing session to a different persona (used by "Switch person"). */
export function switchSessionPersona(token: string, personaId: number): void {
	getDb()
		.prepare('UPDATE sessions SET persona_id = ? WHERE token_hash = ?')
		.run(personaId, sha256(token).toString('hex'));
}

export function deleteSession(token: string): void {
	getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token).toString('hex'));
}

// ── Rate limiting ───────────────────────────────────────────────────────
// At most 10 wrong passcodes per device address every 15 minutes.
// Kept in memory: it resets if the app restarts, which is fine for this.

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(address: string): boolean {
	const entry = failures.get(address);
	if (!entry || entry.resetAt < Date.now()) return false;
	return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(address: string): void {
	const now = Date.now();
	const entry = failures.get(address);
	if (!entry || entry.resetAt < now) {
		failures.set(address, { count: 1, resetAt: now + WINDOW_MS });
	} else {
		entry.count += 1;
	}
}

export function clearFailedAttempts(address: string): void {
	failures.delete(address);
}

/** True when both passcodes are set. The sign-in page warns if not. */
export function passcodesConfigured(): boolean {
	return Boolean(passcodeFor('owner') && passcodeFor('viewer'));
}
