// The Shop screen's logic: one grocery list for the week's four final picks.
//
// The rules (§7.4 of CLAUDE.md):
// - Add up each ingredient across all four recipes (onions from three
//   recipes become one line). A recipe picked twice counts twice.
// - "To taste" items still appear, just without a number.
// - Non-pantry items first, by aisle in shopping order; then pantry staples.
// - Checkboxes are shared: either person ticks, both see it.

import { getDb } from './app-db.ts';
import { SLOTS, type Week } from './weeks.ts';

export type GroceryItem = {
	ingredientId: number;
	name: string;
	/** Total across recipes, in the catalog's unit. null = to taste. */
	quantity: number | null;
	unit: string;
	aisle: string;
	whereToBuy: string | null;
	/** Initials of whoever ticked it off, or null if not checked. */
	checkedBy: string | null;
};

export type GroceryList = {
	picks: { slot: string; recipe: string }[];
	/** Items you need to buy, grouped by aisle in store order. */
	aisles: { aisle: string; items: GroceryItem[] }[];
	/** Things you probably have already. */
	pantry: GroceryItem[];
	itemCount: number;
};

export function getGroceryList(week: Week): GroceryList {
	const db = getDb();

	const picks = db
		.prepare(
			`SELECT o.slot, r.name AS recipe FROM offers o JOIN recipes r ON r.id = o.recipe_id
			 WHERE o.week_id = ? AND o.is_final_pick = 1`
		)
		.all(week.id) as { slot: string; recipe: string }[];
	const slotOrder = SLOTS.map((s) => s.key as string);
	picks.sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot));

	// One row per ingredient. sum() adds up the quantities; because we join
	// through every final-pick offer, a recipe picked twice is counted twice.
	const rows = db
		.prepare(
			`SELECT c.id, c.name, c.unit, c.aisle, c.pantry_staple, c.where_to_buy,
			        sum(ri.quantity) AS quantity,
			        p.initials AS checked_by
			 FROM offers o
			 JOIN recipe_ingredients ri ON ri.recipe_id = o.recipe_id
			 JOIN ingredient_catalog c ON c.id = ri.ingredient_id
			 JOIN aisles a ON a.name = c.aisle
			 LEFT JOIN grocery_checks gc ON gc.week_id = o.week_id AND gc.ingredient_id = c.id
			 LEFT JOIN personas p ON p.id = gc.checked_by
			 WHERE o.week_id = ? AND o.is_final_pick = 1
			 GROUP BY c.id
			 ORDER BY c.pantry_staple, a.sort_order, c.id`
		)
		.all(week.id) as Record<string, unknown>[];

	const items = rows.map((r) => ({
		pantry: r.pantry_staple === 1,
		item: {
			ingredientId: r.id as number,
			name: r.name as string,
			quantity: r.quantity as number | null,
			unit: r.unit as string,
			aisle: r.aisle as string,
			whereToBuy: r.where_to_buy as string | null,
			checkedBy: r.checked_by as string | null
		}
	}));

	const aisles: GroceryList['aisles'] = [];
	for (const { pantry, item } of items) {
		if (pantry) continue;
		const last = aisles.at(-1);
		if (last?.aisle === item.aisle) last.items.push(item);
		else aisles.push({ aisle: item.aisle, items: [item] });
	}

	return {
		picks,
		aisles,
		pantry: items.filter((i) => i.pantry).map((i) => i.item),
		itemCount: items.length
	};
}

/**
 * Tick or untick an item for everyone. Only ingredients that are actually
 * on this week's list can be checked.
 */
export function setGroceryCheck(
	week: Week,
	ingredientId: number,
	personaId: number,
	checked: boolean
): boolean {
	const db = getDb();
	const onList = db
		.prepare(
			`SELECT 1 FROM offers o JOIN recipe_ingredients ri ON ri.recipe_id = o.recipe_id
			 WHERE o.week_id = ? AND o.is_final_pick = 1 AND ri.ingredient_id = ?`
		)
		.get(week.id, ingredientId);
	if (!onList) return false;

	if (checked) {
		db.prepare(
			`INSERT INTO grocery_checks (week_id, ingredient_id, checked_by) VALUES (?, ?, ?)
			 ON CONFLICT (week_id, ingredient_id) DO NOTHING`
		).run(week.id, ingredientId, personaId);
	} else {
		db.prepare('DELETE FROM grocery_checks WHERE week_id = ? AND ingredient_id = ?').run(
			week.id,
			ingredientId
		);
	}
	return true;
}
