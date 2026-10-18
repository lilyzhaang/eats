// The exact shape Claude's answers must take. The API enforces these shapes,
// and the app checks them again before saving anything.

import { z } from 'zod';

export const CUISINES = [
	'Chinese',
	'Romanian',
	'American',
	'Italian',
	'Mexican',
	'Korean',
	'Japanese',
	'Mediterranean',
	'Other'
] as const;

// Must match the aisles table (migrations/001_initial_schema.sql).
export const AISLES = [
	'Produce',
	'Meat & Fish',
	'Dairy & Eggs',
	'Tofu & Refrigerated',
	'Bakery',
	'Frozen',
	'Grains & Noodles',
	'Canned & Jarred',
	'Asian Pantry',
	'Eastern European',
	'Spices',
	'Oils & Vinegars',
	'Baking',
	'Other'
] as const;

export const UNITS = [
	'each',
	'lb',
	'oz',
	'cup',
	'tbsp',
	'tsp',
	'clove',
	'bunch',
	'can',
	'to taste'
] as const;

export const SLOT_KEYS = ['lunch_1', 'lunch_2', 'dinner_1', 'dinner_2'] as const;

// ── Weekly menu ─────────────────────────────────────────────────────────

const Ingredient = z.object({
	name: z.string().describe('Exact catalog name if it exists; otherwise a plain singular name'),
	quantity: z.number().nullable().describe("Per batch, in the catalog's unit. null = to taste"),
	prep_note: z.string().nullable(),
	new_catalog_entry: z
		.object({
			aisle: z.enum(AISLES),
			unit: z.enum(UNITS),
			pantry_staple: z.boolean(),
			where_to_buy: z.string().nullable()
		})
		.nullable()
		.describe('Only for ingredients not already in the catalog; null otherwise')
});

const Step = z.object({
	instruction: z.string(),
	equipment: z.enum(['oven', 'stovetop', 'kettle', 'none']),
	oven_temp_f: z.number().int().nullable(),
	active_minutes: z.number().int(),
	passive_minutes: z.number().int(),
	depends_on_step: z.number().int().nullable().describe('1-based number of an earlier step'),
	can_batch_with: z.string().nullable()
});

export const NewRecipe = z.object({
	name: z.string(),
	cuisine: z.enum(CUISINES),
	meal_type: z.enum(['lunch', 'dinner', 'either']),
	servings: z.number().int(),
	total_minutes: z.number().int(),
	source_url: z.string().nullable(),
	ingredients: z.array(Ingredient),
	steps: z.array(Step)
});
export type NewRecipe = z.infer<typeof NewRecipe>;

export const MenuAnswer = z.object({
	options: z.array(z.object({ slot: z.enum(SLOT_KEYS), recipe: NewRecipe })),
	note_to_owners: z.string()
});
export type MenuAnswer = z.infer<typeof MenuAnswer>;

/** For "swap this option": just one new recipe. */
export const SwapAnswer = z.object({ recipe: NewRecipe });

// ── Prep-day plan ───────────────────────────────────────────────────────

export const LANES = [
	'oven',
	'burner_1',
	'burner_2',
	'burner_3',
	'burner_4',
	'kettle',
	'hands'
] as const;

export const PlanAnswer = z.object({
	total_minutes: z.number().int(),
	oven_temp_f: z.number().int().nullable(),
	oven_minutes: z.number().int().nullable(),
	burners_used: z.number().int(),
	uses_kettle: z.boolean(),
	steps: z.array(
		z.object({
			clock_minute: z.number().int(),
			instruction: z.string(),
			lanes: z.array(z.enum(LANES)),
			recipe_names: z.array(z.string()),
			recipe_label: z.string(),
			why_note: z.string().nullable()
		})
	)
});
export type PlanAnswer = z.infer<typeof PlanAnswer>;
