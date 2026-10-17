// npm run db:migrate
//
// Applies any new files in migrations/ to the database. The app also does
// this automatically when it starts, so you rarely need to run it by hand.

import { openDatabase } from '../src/lib/server/db/index.ts';

const path = process.env.DATABASE_PATH ?? 'data/eats.db';
const db = openDatabase(path);
db.close();
console.log(`${path} is up to date.`);
