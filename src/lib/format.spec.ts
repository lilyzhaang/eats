import { describe, expect, it } from 'vitest';
import { formatQuantity } from './format.ts';

describe('formatQuantity', () => {
	it('matches how the grocery-list mockup reads', () => {
		expect(formatQuantity(4, 'each')).toBe('4');
		expect(formatQuantity(7, 'clove')).toBe('7 cloves');
		expect(formatQuantity(1.5, 'lb')).toBe('1½ lb');
		expect(formatQuantity(2, 'cup')).toBe('2 cups');
		expect(formatQuantity(1.5, 'cup')).toBe('1½ cups');
		expect(formatQuantity(0.33, 'cup')).toBe('⅓ cup');
		expect(formatQuantity(1, 'bunch')).toBe('1 bunch');
		expect(formatQuantity(3, 'tbsp')).toBe('3 tbsp');
		expect(formatQuantity(null, 'to taste')).toBe('to taste');
	});
});
