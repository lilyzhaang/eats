// npm run db:reset
//
// Deletes the local database and rebuilds it with the sample data.
// For your Mac only — it refuses to run when NODE_ENV is "production",
// so it can never wipe the real database on the live server.

import { rmSync } from 'node:fs';
import { openDatabase } from '../src/lib/server/db/index.ts';
import { seedSampleData } from '../src/lib/server/db/seed.ts';

if (process.env.NODE_ENV === 'production') {
	console.error('Refusing to reset: NODE_ENV is "production".');
	process.exit(1);
}

const path = process.env.DATABASE_PATH ?? 'data/eats.db';
for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });

const db = openDatabase(path);
seedSampleData(db);
db.close();
console.log(`Rebuilt ${path} with the sample data.`);
