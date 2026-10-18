// Checks Claude's answer shapes convert to the API's structured-output format,
// and that a well-formed answer parses.

import { describe, expect, it } from 'vitest';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { MenuAnswer, PlanAnswer, SwapAnswer } from './schemas.ts';

describe('answer shapes', () => {
	it('convert to structured-output schemas', () => {
		for (const schema of [MenuAnswer, PlanAnswer, SwapAnswer]) {
			const format = betaZodOutputFormat(schema);
			expect(format.type).toBe('json_schema');
			expect(JSON.stringify(format.schema)).toContain('"additionalProperties":false');
		}
	});

	it('parse a sample prep plan', () => {
		const answer = {
			total_minutes: 95,
			oven_temp_f: 425,
			oven_minutes: 40,
			burners_used: 2,
			uses_kettle: true,
			steps: [
				{
					clock_minute: 0,
					instruction: 'Oven on to 425°F.',
					lanes: ['oven', 'hands'],
					recipe_names: ['Sheet-pan sausage, peppers & potatoes'],
					recipe_label: 'All recipes',
					why_note: null
				}
			]
		};
		expect(betaZodOutputFormat(PlanAnswer).parse(JSON.stringify(answer))).toEqual(answer);
	});

	it('rejects an equipment lane that doesn’t exist', () => {
		const bad = {
			total_minutes: 1,
			oven_temp_f: null,
			oven_minutes: null,
			burners_used: 1,
			uses_kettle: false,
			steps: [
				{
					clock_minute: 0,
					instruction: 'x',
					lanes: ['microwave'],
					recipe_names: [],
					recipe_label: 'x',
					why_note: null
				}
			]
		};
		expect(() => betaZodOutputFormat(PlanAnswer).parse(JSON.stringify(bad))).toThrow();
	});
});
