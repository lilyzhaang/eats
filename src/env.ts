// The settings Eats reads from the environment (your .env file on your Mac,
// or the hosting service's settings in production). See .env.example.
//
// SvelteKit checks these when the app starts. Server code reads them with
// `import { OWNER_PASSCODE } from '$app/env/private'`.

import { defineEnvVars } from '@sveltejs/kit/env';

/** Optional text: missing or blank both count as "not set". */
const optionalText = (value: string | undefined) => (value?.trim() ? value : undefined);

export const variables = defineEnvVars({
	OWNER_PASSCODE: {
		description: 'Passcode Lily and Andrei share. Unlocks Lily, Andrei and Viewer.',
		schema: optionalText
	},
	VIEWER_PASSCODE: {
		description: 'Passcode for read-only guests. Only unlocks Viewer.',
		schema: optionalText
	},
	ANTHROPIC_API_KEY: {
		description:
			'Key for the Claude API (console.anthropic.com). Without it, menus and prep plans are not written.',
		schema: optionalText
	},
	MENU_SCHEDULE: {
		description:
			'"on" to have Claude write next week\'s menu every Saturday 9am ET. Off unless set.',
		schema: (value) => value?.trim().toLowerCase() === 'on'
	},
	DATABASE_PATH: {
		description: 'Where the SQLite database file lives.',
		schema: (value) => optionalText(value) ?? 'data/eats.db'
	}
});
