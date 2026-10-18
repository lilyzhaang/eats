// Small helpers for showing numbers the way a recipe would.

const FRACTIONS: [number, string][] = [
	[1 / 4, '¼'],
	[1 / 3, '⅓'],
	[1 / 2, '½'],
	[2 / 3, '⅔'],
	[3 / 4, '¾']
];

/** 0.33 → "⅓", 1.5 → "1½", 2 → "2". Falls back to one decimal place. */
export function formatNumber(value: number): string {
	const whole = Math.floor(value);
	const rest = value - whole;
	if (rest < 0.05) return String(whole);
	const fraction = FRACTIONS.find(([f]) => Math.abs(rest - f) < 0.04);
	if (fraction) return whole === 0 ? fraction[1] : `${whole}${fraction[1]}`;
	return String(Math.round(value * 10) / 10);
}

// How each catalog unit reads, singular and plural. "each" has no word: "Onion · 4".
const UNITS: Record<string, [string, string]> = {
	each: ['', ''],
	clove: ['clove', 'cloves'],
	cup: ['cup', 'cups'],
	bunch: ['bunch', 'bunches'],
	lb: ['lb', 'lb'],
	tbsp: ['tbsp', 'tbsp'],
	tsp: ['tsp', 'tsp'],
	oz: ['oz', 'oz'],
	can: ['can', 'cans']
};

/** (4, "each") → "4", (7, "clove") → "7 cloves", (null, "to taste") → "to taste". */
export function formatQuantity(quantity: number | null, unit: string): string {
	if (quantity === null || unit === 'to taste') return 'to taste';
	const [singular, plural] = UNITS[unit] ?? [unit, unit];
	const word = quantity > 1 ? plural : singular;
	return word ? `${formatNumber(quantity)} ${word}` : formatNumber(quantity);
}

/** Minutes from the start of cook day → clock style: 0 → "0:00", 95 → "1:35". */
export function formatClock(minutes: number): string {
	return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** 95 → "1 hr 35", 40 → "40 min", 60 → "1 hr". */
export function formatDuration(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	if (hours === 0) return `${rest} min`;
	return rest === 0 ? `${hours} hr` : `${hours} hr ${rest}`;
}
