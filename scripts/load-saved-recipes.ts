// npm run recipes:load
//
// Adds the recipes in scripts/saved-recipes.json to the database as "saved
// to try". Safe to run again: a recipe whose link is already in the app is
// skipped. On the server:
//   docker compose exec eats node scripts/load-saved-recipes.ts
//
// Each ingredient is matched to the ingredient catalog by name (ignoring
// capitals), so the grocery list adds up. If the catalog uses a different
// unit, the quantity is converted (tsp/tbsp/cup, oz/lb); if it can't be
// converted, nothing is saved and the problem is reported.
//
// Plain Node only (no app code), so it also runs inside the Docker image.

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Ingredient = {
	name: string;
	quantity: number | null;
	unit: string;
	aisle: string;
	pantry_staple: boolean;
	prep_note?: string;
	where_to_buy?: string;
};
type Step = {
	instruction: string;
	equipment: 'oven' | 'stovetop' | 'kettle' | 'none';
	oven_temp_f?: number;
	active_minutes: number;
	passive_minutes: number;
	depends_on_step?: number;
	can_batch_with?: string;
};
type Recipe = {
	name: string;
	source_url: string;
	source_credit: string;
	notes?: string;
	cuisine: string;
	meal_type: 'lunch' | 'dinner' | 'either';
	servings: number;
	total_minutes: number;
	ingredients: Ingredient[];
	steps: Step[];
};

// How many of the smaller unit make one of the bigger one.
const CONVERSIONS: Record<string, Record<string, number>> = {
	tsp: { tbsp: 1 / 3, cup: 1 / 48 },
	tbsp: { tsp: 3, cup: 1 / 16 },
	cup: { tbsp: 16, tsp: 48 },
	oz: { lb: 1 / 16 },
	lb: { oz: 16 }
};

function convert(quantity: number | null, from: string, to: string): number | null | undefined {
	if (from === to || quantity === null) return quantity;
	const factor = CONVERSIONS[from]?.[to];
	return factor === undefined ? undefined : Math.round(quantity * factor * 100) / 100;
}

const here = dirname(fileURLToPath(import.meta.url));
const { recipes } = JSON.parse(readFileSync(join(here, 'saved-recipes.json'), 'utf8')) as {
	recipes: Recipe[];
};

const db = new DatabaseSync(process.env.DATABASE_PATH ?? 'data/eats.db');
db.exec('PRAGMA foreign_keys = ON');

const columns = db.prepare('PRAGMA table_info(recipes)').all().map((c) => c.name);
if (!columns.includes('to_try') || !columns.includes('source_credit')) {
	console.error('The database is missing migration 007. Start the app once (it updates the database), then try again.');
	process.exit(1);
}

const findIngredient = db.prepare('SELECT id, unit FROM ingredient_catalog WHERE lower(name) = lower(?)');
const addIngredient = db.prepare(
	'INSERT INTO ingredient_catalog (name, aisle, unit, pantry_staple, where_to_buy) VALUES (?, ?, ?, ?, ?)'
);

let added = 0;
for (const recipe of recipes) {
	if (db.prepare('SELECT 1 FROM recipes WHERE source_url = ?').get(recipe.source_url)) {
		console.log(`Already in the app: ${recipe.name}`);
		continue;
	}

	db.exec('BEGIN');
	try {
		const recipeId = Number(
			db
				.prepare(
					`INSERT INTO recipes (name, origin, source_url, source_credit, meal_type, cuisine, servings,
					   total_minutes, notes, to_try)
					 VALUES (?, 'own', ?, ?, ?, ?, ?, ?, ?, 1)`
				)
				.run(
					recipe.name, recipe.source_url, recipe.source_credit, recipe.meal_type, recipe.cuisine,
					recipe.servings, recipe.total_minutes, recipe.notes ?? null
				).lastInsertRowid
		);

		for (const item of recipe.ingredients) {
			let row = findIngredient.get(item.name) as { id: number; unit: string } | undefined;
			if (!row) {
				const id = Number(
					addIngredient.run(item.name, item.aisle, item.unit, item.pantry_staple ? 1 : 0, item.where_to_buy ?? null)
						.lastInsertRowid
				);
				row = { id, unit: item.unit };
				console.log(`  new ingredient: ${item.name} (${item.unit}, ${item.aisle})`);
			}
			const quantity = convert(item.quantity, item.unit, row.unit);
			if (quantity === undefined) {
				throw new Error(`${item.name}: the catalog measures it in "${row.unit}", which can't be converted from "${item.unit}".`);
			}
			db.prepare(
				'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, prep_note) VALUES (?, ?, ?, ?)'
			).run(recipeId, row.id, quantity, item.prep_note ?? null);
		}

		recipe.steps.forEach((step, i) =>
			db
				.prepare(
					`INSERT INTO recipe_steps (recipe_id, step_order, instruction, equipment, oven_temp_f,
					   active_minutes, passive_minutes, depends_on_step, can_batch_with)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.run(
					recipeId, i + 1, step.instruction, step.equipment, step.oven_temp_f ?? null,
					step.active_minutes, step.passive_minutes, step.depends_on_step ?? null, step.can_batch_with ?? null
				)
		);

		db.exec('COMMIT');
		added += 1;
		console.log(`Added: ${recipe.name} (credit: ${recipe.source_credit})`);
	} catch (error) {
		db.exec('ROLLBACK');
		console.error(`Couldn't add ${recipe.name}: ${(error as Error).message}`);
		process.exitCode = 1;
	}
}
db.close();
console.log(`${added} recipe(s) added.`);
