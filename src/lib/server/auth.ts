// Sign-in (see §10 of CLAUDE.md).
//
// Anyone who opens the app without signing in is a viewer: they can look at
// everything but change nothing (enforced in hooks.server.ts). Lily and
// Andrei sign in with the shared owner passcode, set as an environment
// variable (OWNER_PASSCODE), to make changes.
//
// When an owner signs in we create a session: a long random token stored in a
// cookie on their device. The database only keeps a hash of the token.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { OWNER_PASSCODE } from '$app/env/private';
import { getDb } from './app-db.ts';

export const SESSION_COOKIE = 'eats_session';
export const SESSION_DAYS = 365;

export type SessionUser = {
	personaId: number;
	name: string;
	initials: string;
	/** Owners can change things; viewers can only look. */
	role: 'owner' | 'viewer';
	/** False for visitors who haven't signed in (they're viewers). */
	signedIn: boolean;
};

function sha256(text: string): Buffer {
	return createHash('sha256').update(text).digest();
}

/**
 * Does this match the owner passcode?
 * We compare hashes with timingSafeEqual so the comparison takes the same time
 * whether the guess is close or not; that stops a guesser from learning anything.
 */
export function checkOwnerPasscode(guess: string): boolean {
	return Boolean(OWNER_PASSCODE) && timingSafeEqual(sha256(guess), sha256(OWNER_PASSCODE!));
}

/**
 * A short fingerprint of the current passcode. Stored with each session;
 * if the passcode changes, old sessions no longer match and are signed out.
 */
function fingerprint(): string | null {
	return OWNER_PASSCODE ? sha256(`owner:${OWNER_PASSCODE}`).toString('hex').slice(0, 16) : null;
}

/** The read-only visitor everyone is until they sign in. */
export function guestViewer(): SessionUser {
	const viewer = getDb()
		.prepare(
			"SELECT id, name, initials FROM personas WHERE role = 'viewer' ORDER BY sort_order LIMIT 1"
		)
		.get() as { id: number; name: string; initials: string };
	return {
		personaId: viewer.id,
		name: viewer.name,
		initials: viewer.initials,
		role: 'viewer',
		signedIn: false
	};
}

/** Start an owner session and return the token to put in the cookie. */
export function createSession(personaId: number): string {
	const token = randomBytes(32).toString('base64url');
	const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
	getDb()
		.prepare(
			`INSERT INTO sessions (token_hash, persona_id, passcode_kind, passcode_fingerprint, expires_at)
			 VALUES (?, ?, 'owner', ?, ?)`
		)
		.run(sha256(token).toString('hex'), personaId, fingerprint()!, expires.toISOString());
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

	const expired = new Date(row.expires_at as string) < new Date();
	// Old viewer-passcode sessions, or the owner passcode has changed since.
	const stale = row.passcode_kind !== 'owner' || row.passcode_fingerprint !== fingerprint();
	if (expired || stale || row.role !== 'owner') {
		deleteSession(token);
		return null;
	}

	return {
		personaId: row.persona_id as number,
		name: row.name as string,
		initials: row.initials as string,
		role: 'owner',
		signedIn: true
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

/** True when the owner passcode is set. The sign-in page warns if not. */
export function passcodeConfigured(): boolean {
	return Boolean(OWNER_PASSCODE);
}
