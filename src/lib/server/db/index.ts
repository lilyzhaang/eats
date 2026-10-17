// The database connection.
//
// Eats stores everything in one SQLite file (by default data/eats.db).
// SQLite is built into Node, so there's no database server to install —
// moving the app means copying this file along with the code.
//
// This file uses only plain Node (no SvelteKit imports) so the command-line
// scripts in scripts/ can share it with the app.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'migrations');

/** Open (or create) the database file and bring its tables up to date. */
export function openDatabase(path: string): DatabaseSync {
	mkdirSync(dirname(resolve(path)), { recursive: true });
	const db = new DatabaseSync(path);

	// WAL lets reads happen while a write is in progress — friendlier when
	// two phones are using the app at once.
	db.exec('PRAGMA journal_mode = WAL');
	// SQLite doesn't enforce REFERENCES unless you ask it to.
	db.exec('PRAGMA foreign_keys = ON');

	runMigrations(db);
	return db;
}

/**
 * Apply any migration files in migrations/ that haven't run yet.
 * Each file runs once, in filename order (001_…, 002_…), inside a transaction,
 * so a broken migration leaves the database as it was.
 */
export function runMigrations(db: DatabaseSync): string[] {
	db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		filename   TEXT PRIMARY KEY,
		applied_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`);

	const alreadyRun = new Set(
		db
			.prepare('SELECT filename FROM schema_migrations')
			.all()
			.map((row) => row.filename as string)
	);

	const pending = readdirSync(MIGRATIONS_DIR)
		.filter((file) => file.endsWith('.sql') && !alreadyRun.has(file))
		.sort();

	for (const file of pending) {
		const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
		db.exec('BEGIN');
		try {
			db.exec(sql);
			db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file);
			db.exec('COMMIT');
		} catch (error) {
			db.exec('ROLLBACK');
			throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
		}
	}
	return pending;
}

/** Run `work` inside a transaction: all of it is saved, or none of it. */
export function transaction<T>(db: DatabaseSync, work: () => T): T {
	db.exec('BEGIN');
	try {
		const result = work();
		db.exec('COMMIT');
		return result;
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}
}
