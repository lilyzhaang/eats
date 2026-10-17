// The app's single shared database connection.
// Opened the first time something asks for it, then reused.

import { DATABASE_PATH } from '$app/env/private';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase } from './db/index.ts';

let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
	db ??= openDatabase(DATABASE_PATH);
	return db;
}
