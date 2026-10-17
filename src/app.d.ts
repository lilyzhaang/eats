// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SessionUser } from '#lib/server/auth.ts';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Who is signed in on this request, or null if nobody. Set in hooks.server.ts. */
			user: SessionUser | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
