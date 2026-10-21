// One recipe from the bank: ingredients, steps and every rating. Read-only.

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getBankRecipe } from '#lib/server/bank.ts';

export const load: PageServerLoad = ({ params }) => {
	const recipe = getBankRecipe(Number(params.id));
	if (!recipe) error(404, 'That recipe isn’t in the bank.');
	return { recipe };
};
