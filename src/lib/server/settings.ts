// Read a value from the settings table (kitchen equipment, menu schedule…).

import { getDb } from './app-db.ts';

export function getSetting(key: string, fallback: string): string {
	const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
		{ value: string } | undefined;
	return row?.value ?? fallback;
}

/** The kitchen, as Claude is told about it. */
export function getKitchen() {
	return {
		ovens: Number(getSetting('ovens', '1')),
		burners: Number(getSetting('burners', '2')),
		kettle: getSetting('has_kettle', '1') === '1',
		rice_cooker: getSetting('has_rice_cooker', '0') === '1'
	};
}
