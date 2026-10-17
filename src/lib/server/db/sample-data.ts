// Sample data for development and tests.
//
// This is the week of Oct 18, 2026 from §12 of CLAUDE.md, plus the prior week's
// debrief. Ingredients come from the Ingredients tab of docs/Meal Prep System.xlsx.
// Recipe steps are written in the app's own words — never copy recipe text
// from websites or books into this file (the repo is public).
//
// Lily, Andrei and Viewer aren't here: every database gets them from
// migrations/002_default_personas.sql.
//
// Recipes are referred to by a short key ("ciorba") so the lists below are
// easy to read; the seed script turns keys into database ids.

type Recipe = {
	name: string;
	origin: 'ai' | 'own';
	meal_type: 'lunch' | 'dinner' | 'either';
	cuisine: string;
	servings: number;
	total_minutes: number | null;
	notes?: string;
};

export const recipes: Record<string, Recipe> = {
	burrito_bowls:         { name: 'Chicken burrito bowls', origin: 'ai', meal_type: 'lunch', cuisine: 'Mexican', servings: 4, total_minutes: 40 },
	sesame_noodles:        { name: 'Cold sesame noodles with smashed cucumber', origin: 'ai', meal_type: 'lunch', cuisine: 'Chinese', servings: 4, total_minutes: 25 },
	tomato_egg_fried_rice: { name: 'Tomato egg fried rice', origin: 'own', meal_type: 'lunch', cuisine: 'Chinese', servings: 4, total_minutes: null },
	greek_orzo:            { name: 'Greek chicken orzo', origin: 'ai', meal_type: 'lunch', cuisine: 'Mediterranean', servings: 4, total_minutes: 35 },
	gochujang_pork:        { name: 'Gochujang pork rice bowls', origin: 'ai', meal_type: 'lunch', cuisine: 'Korean', servings: 4, total_minutes: 30 },
	ciorba:                { name: 'Ciorbă de perișoare', origin: 'own', meal_type: 'lunch', cuisine: 'Romanian', servings: 6, total_minutes: null, notes: 'Even better on day 3' },
	sheet_pan:             { name: 'Sheet-pan sausage, peppers & potatoes', origin: 'ai', meal_type: 'dinner', cuisine: 'American', servings: 4, total_minutes: 45 },
	hong_shao_rou:         { name: 'Red-braised pork belly (hong shao rou)', origin: 'ai', meal_type: 'dinner', cuisine: 'Chinese', servings: 4, total_minutes: 90 },
	mapo_tofu:             { name: 'Mapo tofu with rice', origin: 'own', meal_type: 'dinner', cuisine: 'Chinese', servings: 4, total_minutes: null },
	turkey_meatballs:      { name: 'Turkey meatballs with marinara', origin: 'ai', meal_type: 'dinner', cuisine: 'Italian', servings: 4, total_minutes: 40 },
	papricas:              { name: 'Chicken papricaș with mămăligă', origin: 'ai', meal_type: 'dinner', cuisine: 'Romanian', servings: 4, total_minutes: 60 },
	tomato_egg_stir_fry:   { name: 'Tomato egg stir-fry', origin: 'own', meal_type: 'dinner', cuisine: 'Chinese', servings: 2, total_minutes: null, notes: 'Andrei wants it weekly' }
};

// [name, aisle, unit, pantry staple?, where to buy]
export const ingredientCatalog: [string, string, string, boolean, string | null][] = [
	['Onion', 'Produce', 'each', false, null],
	['Bell pepper', 'Produce', 'each', false, null],
	['Garlic', 'Produce', 'clove', false, null],
	['Baby potatoes', 'Produce', 'lb', false, null],
	['Cucumber', 'Produce', 'each', false, null],
	['Carrot', 'Produce', 'each', false, null],
	['Scallions', 'Produce', 'bunch', false, null],
	['Lovage (leuștean)', 'Produce', 'bunch', false, 'Romanian/Polish deli'],
	['Chicken thighs', 'Meat & Fish', 'lb', false, null],
	['Italian sausage', 'Meat & Fish', 'lb', false, null],
	['Ground pork', 'Meat & Fish', 'lb', false, null],
	['Sour cream', 'Dairy & Eggs', 'cup', false, null],
	['Egg', 'Dairy & Eggs', 'each', false, null],
	['Wheat noodles', 'Grains & Noodles', 'lb', false, 'H Mart'],
	['Borș', 'Eastern European', 'cup', false, 'Romanian/Polish deli'],
	['Rice', 'Grains & Noodles', 'cup', true, null],
	['Cornmeal (mălai)', 'Grains & Noodles', 'cup', true, null],
	['Tomato paste', 'Canned & Jarred', 'tbsp', true, null],
	['Chinese sesame paste', 'Asian Pantry', 'tbsp', true, 'H Mart'],
	['Soy sauce', 'Asian Pantry', 'tbsp', true, null],
	['Chinkiang black vinegar', 'Asian Pantry', 'tbsp', true, null],
	['Chili oil', 'Asian Pantry', 'tbsp', true, null],
	['Sweet paprika', 'Spices', 'tbsp', true, null],
	['Salt', 'Spices', 'to taste', true, null],
	['Olive oil', 'Oils & Vinegars', 'tbsp', true, null],
	['Flour', 'Baking', 'tbsp', true, null]
];

// Per-recipe ingredients: [ingredient name, quantity per batch (null = to taste), prep note]
// Only recipes that have actually been picked have ingredient lists so far.
export const recipeIngredients: Record<string, [string, number | null, string | null][]> = {
	sesame_noodles: [
		['Wheat noodles', 1, null],
		['Cucumber', 2, 'smashed'],
		['Chinese sesame paste', 3, null],
		['Soy sauce', 3, null],
		['Chinkiang black vinegar', 1, null],
		['Chili oil', 1, null],
		['Garlic', 3, 'grated'],
		['Scallions', 1, null]
	],
	ciorba: [
		['Ground pork', 1, null],
		['Rice', 0.33, null],
		['Onion', 1, 'diced'],
		['Carrot', 2, null],
		['Lovage (leuștean)', 1, null],
		['Borș', 2, null],
		['Egg', 1, null],
		['Sour cream', 1, 'to serve'],
		['Tomato paste', 2, null]
	],
	sheet_pan: [
		['Italian sausage', 1.5, null],
		['Bell pepper', 3, 'strips'],
		['Onion', 1, 'wedges'],
		['Baby potatoes', 1.5, 'halved'],
		['Olive oil', 3, null],
		['Garlic', 4, null]
	],
	papricas: [
		['Chicken thighs', 2, null],
		['Onion', 2, null],
		['Sweet paprika', 2, null],
		['Sour cream', 1, null],
		['Bell pepper', 1, null],
		['Flour', 2, null],
		['Cornmeal (mălai)', 1.5, null],
		['Salt', null, null]
	],
	tomato_egg_stir_fry: [
		['Egg', 4, null],
		['Scallions', 1, null]
	]
};

type Slot = 'lunch_1' | 'lunch_2' | 'dinner_1' | 'dinner_2';
type Offer = { slot: Slot; letter: string; recipe: string; from_bank?: boolean; picked?: boolean };

type Rating = {
	recipe: string;
	person: string;
	stars: number;
	verdict: 'again' | 'tweak' | 'never';
	tweak_text?: string;
};

type Week = {
	week_of: string;
	status: 'picking' | 'locked' | 'done';
	offers: Offer[];
	ratings?: Rating[];
};

export const weeks: Week[] = [
	{
		// The prior week. Only the two meals rated in the brief are recorded.
		week_of: '2026-10-11',
		status: 'done',
		offers: [
			{ slot: 'lunch_1', letter: 'A', recipe: 'ciorba', picked: true },
			{ slot: 'dinner_1', letter: 'A', recipe: 'tomato_egg_stir_fry', picked: true }
		],
		ratings: [
			{ recipe: 'ciorba', person: 'Lily', stars: 4, verdict: 'tweak', tweak_text: 'Extra lovage, more borș' },
			{ recipe: 'ciorba', person: 'Andrei', stars: 5, verdict: 'tweak', tweak_text: 'Extra lovage, more borș' },
			{ recipe: 'tomato_egg_stir_fry', person: 'Lily', stars: 5, verdict: 'again' },
			{ recipe: 'tomato_egg_stir_fry', person: 'Andrei', stars: 4, verdict: 'again' }
		]
	},
	{
		// The sample week: both people have picked and agree, so it's locked in.
		week_of: '2026-10-18',
		status: 'locked',
		offers: [
			{ slot: 'lunch_1', letter: 'A', recipe: 'burrito_bowls' },
			{ slot: 'lunch_1', letter: 'B', recipe: 'sesame_noodles', picked: true },
			{ slot: 'lunch_1', letter: 'C', recipe: 'tomato_egg_fried_rice', from_bank: true },
			{ slot: 'lunch_2', letter: 'A', recipe: 'greek_orzo' },
			{ slot: 'lunch_2', letter: 'B', recipe: 'gochujang_pork' },
			{ slot: 'lunch_2', letter: 'C', recipe: 'ciorba', from_bank: true, picked: true },
			{ slot: 'dinner_1', letter: 'A', recipe: 'sheet_pan', picked: true },
			{ slot: 'dinner_1', letter: 'B', recipe: 'hong_shao_rou' },
			{ slot: 'dinner_1', letter: 'C', recipe: 'mapo_tofu', from_bank: true },
			{ slot: 'dinner_2', letter: 'A', recipe: 'turkey_meatballs' },
			{ slot: 'dinner_2', letter: 'B', recipe: 'papricas', picked: true },
			{ slot: 'dinner_2', letter: 'C', recipe: 'tomato_egg_stir_fry', from_bank: true }
		]
	}
];

// The prep-day plan for the week of Oct 18, matching the prep-plan mockup.
// Lanes: oven, burner_1, burner_2, kettle, hands.
export const prepPlan = {
	week_of: '2026-10-18',
	total_minutes: 95,
	oven_temp_f: 425,
	oven_minutes: 40,
	burners: 2,
	uses_kettle: true,
	steps: [
		{ at: 0, lanes: 'oven,hands', recipes: ['sesame_noodles', 'ciorba', 'sheet_pan', 'papricas'], label: 'All recipes',
		  text: 'Oven on to 425°F. Do all the chopping in one go: 4 onions, 4 bell peppers, 7 garlic cloves, 2 carrots. Split into bowls by recipe.' },
		{ at: 15, lanes: 'oven', recipes: ['sheet_pan'], label: 'Sheet-pan sausage',
		  text: 'Potatoes into the oven on their own.', why: 'Your tweak from last time: a 10-minute head start makes them crispy.' },
		{ at: 15, lanes: 'burner_1', recipes: ['ciorba'], label: 'Ciorbă',
		  text: 'Start the ciorbă broth: onion and carrot into water with tomato paste, bring to a simmer.' },
		{ at: 20, lanes: 'hands', recipes: ['ciorba'], label: 'Ciorbă',
		  text: 'While the broth heats, mix the meatballs: ground pork, rice, egg. Roll small.' },
		{ at: 25, lanes: 'oven', recipes: ['sheet_pan'], label: 'Sheet-pan sausage',
		  text: 'Sausage, peppers and onion join the potatoes. Roast 30 min.' },
		{ at: 25, lanes: 'burner_1', recipes: ['ciorba'], label: 'Ciorbă',
		  text: 'Drop the meatballs into the broth. Simmer 30 min.' },
		{ at: 30, lanes: 'burner_2', recipes: ['papricas'], label: 'Papricaș',
		  text: 'Brown the chicken thighs, then onion, paprika and pepper. Cover and braise 35 min.' },
		{ at: 40, lanes: 'hands', recipes: ['sesame_noodles'], label: 'Sesame noodles',
		  text: "Everything's cooking. Whisk the sesame dressing, smash the cucumbers, slice the scallions. Wash up as you go.",
		  why: 'Passive window: the best time for the no-heat recipe.' },
		{ at: 55, lanes: 'oven,burner_1', recipes: ['sheet_pan', 'ciorba'], label: 'Sheet-pan sausage · Ciorbă',
		  text: 'Sheet pan out; let it cool before packing. Ciorbă: stir in borș and lovage, then off the heat.' },
		{ at: 60, lanes: 'burner_1,kettle', recipes: ['sesame_noodles', 'papricas'], label: 'Noodles · Mămăligă',
		  text: 'Kettle-boil the noodles for 5 min, rinse cold, toss with the dressing. Meanwhile start the mămăligă on Burner 1, stirring often for 20 min.' },
		{ at: 70, lanes: 'burner_2', recipes: ['papricas'], label: 'Papricaș',
		  text: 'Papricaș off the heat: whisk the flour into the sour cream, stir it in.' },
		{ at: 85, lanes: 'hands', recipes: ['sesame_noodles', 'ciorba', 'sheet_pan', 'papricas'], label: 'All recipes',
		  text: 'Pack it up: 4 lunches and 4 dinners into containers, labelled. Done by about 1:35.' }
	] as { at: number; lanes: string; recipes: string[]; label: string; text: string; why?: string }[]
};
