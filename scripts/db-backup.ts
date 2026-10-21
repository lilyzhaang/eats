// npm run db:backup
//
// Makes a safe copy of the database while the app keeps running, as
// data/backups/eats-YYYY-MM-DD-HHMM.db. On the server:
//   docker compose exec eats node scripts/db-backup.ts

import { backup, DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const path = process.env.DATABASE_PATH ?? 'data/eats.db';
const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
const target = join(dirname(path), 'backups', `eats-${stamp}.db`);

mkdirSync(dirname(target), { recursive: true });
const db = new DatabaseSync(path);
await backup(db, target);
db.close();
console.log(`Backed up ${path} to ${target}`);
