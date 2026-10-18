// Checks that the database tables build correctly and the sample data matches
// what the brief (§12 of CLAUDE.md) says it should be. Run with `npm test`.

import { describe, expect, it } from 'vitest';
import { openDatabase } from './index.ts';
import { seedSampleData } from './seed.ts';

// ':memory:' makes a throwaway database that disappears after the test.
function freshDatabase() {
	const db = openDatabase(':memory:');
	seedSampleData(db);
	return db;
}

describe('sample data', () => {
	it('creates the three personas', () => {
		const db = freshDatabase();
		const rows = db.prepare('SELECT name, role FROM personas ORDER BY sort_order').all();
		expect(rows).toEqual([
			{ name: 'Lily', role: 'owner' },
			{ name: 'Andrei', role: 'owner' },
			{ name: 'Viewer', role: 'viewer' }
		]);
	});

	it('offers three options in every slot for the week of Oct 18, with one final pick each', () => {
		const db = freshDatabase();
		const rows = db
			.prepare(
				`SELECT o.slot, count(*) AS options, sum(o.is_final_pick) AS picked
				 FROM offers o JOIN weeks w ON w.id = o.week_id
				 WHERE w.week_of = '2026-10-18' GROUP BY o.slot ORDER BY o.slot`
			)
			.all();
		expect(rows).toEqual([
			{ slot: 'dinner_1', options: 3, picked: 1 },
			{ slot: 'dinner_2', options: 3, picked: 1 },
			{ slot: 'lunch_1', options: 3, picked: 1 },
			{ slot: 'lunch_2', options: 3, picked: 1 }
		]);
	});

	it('adds up to the 26-item grocery list from the brief', () => {
		const db = freshDatabase();
		const rows = db
			.prepare(
				`SELECT c.name, sum(ri.quantity) AS total, c.pantry_staple
				 FROM offers o
				 JOIN weeks w ON w.id = o.week_id
				 JOIN recipe_ingredients ri ON ri.recipe_id = o.recipe_id
				 JOIN ingredient_catalog c ON c.id = ri.ingredient_id
				 WHERE w.week_of = '2026-10-18' AND o.is_final_pick = 1
				 GROUP BY c.id`
			)
			.all() as { name: string; total: number | null; pantry_staple: number }[];

		expect(rows).toHaveLength(26);
		const total = (name: string) => rows.find((r) => r.name === name)?.total;
		expect(total('Onion')).toBe(4);
		expect(total('Bell pepper')).toBe(4);
		expect(total('Garlic')).toBe(7);
		expect(total('Sour cream')).toBe(2);
		expect(total('Salt')).toBeNull(); // "to taste"
		expect(rows.filter((r) => r.pantry_staple).length).toBe(11);
	});

	it('refuses a Tweak rating that doesn’t say what to change', () => {
		const db = freshDatabase();
		const offer = db.prepare('SELECT id FROM offers WHERE is_final_pick = 1 LIMIT 1').get()!;
		const lily = db.prepare("SELECT id FROM personas WHERE name = 'Lily'").get()!;
		db.prepare('DELETE FROM ratings WHERE offer_id = ? AND persona_id = ?').run(offer.id, lily.id);
		expect(() =>
			db
				.prepare(
					"INSERT INTO ratings (offer_id, persona_id, stars, verdict, tweak_text) VALUES (?, ?, 3, 'tweak', '  ')"
				)
				.run(offer.id, lily.id)
		).toThrow();
	});
});

describe('sample prep plan', () => {
	it('records which four recipes it was written for', () => {
		const db = freshDatabase();
		const plan = db.prepare('SELECT for_recipe_ids FROM prep_plans').get()!;
		const picks = db
			.prepare(
				`SELECT group_concat(recipe_id) AS ids FROM
				 (SELECT recipe_id FROM offers WHERE week_id = 2 AND is_final_pick = 1 ORDER BY recipe_id)`
			)
			.get()!;
		expect(plan.for_recipe_ids).toBe(picks.ids);
	});
});
