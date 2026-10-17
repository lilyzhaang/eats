// The Pick screen's logic: what's on offer, who picked what, and lock-in.
//
// The rules (§3 and §4.1 of CLAUDE.md):
// - Every owner (Lily, Andrei) picks one option per slot.
// - A slot is "agreed" when every owner picked the same option.
// - When all four slots are agreed, the week locks in: those options become
//   the final picks, which drive the grocery list and prep plan.
// - Changing a pick after lock-in re-opens the week until you agree again.

import { getDb } from './app-db.ts';
import { transaction } from './db/index.ts';
import { SLOTS, type Week } from './weeks.ts';

export type Owner = { id: number; name: string; initials: string };

/** Everything one option card needs to show. */
export type OptionCard = {
	offerId: number;
	letter: string;
	fromBank: boolean;
	recipe: {
		name: string;
		cuisine: string;
		totalMinutes: number | null;
		servings: number | null;
		sourceUrl: string | null;
	};
	/** History from earlier weeks. Only shown on recipe-bank cards. */
	history: {
		timesOffered: number;
		timesPicked: number;
		avgRating: number | null;
		weeksSinceMade: number | null;
	};
	latestTweak: string | null;
	/** Owners whose current pick is this card. */
	pickedBy: Owner[];
};

export type SlotState = 'open' | 'waiting' | 'disagree' | 'agreed';

export type SlotBoard = {
	key: string;
	label: string;
	options: OptionCard[];
	/** Portions from the agreed pick, or the most common size on offer. */
	portions: number | null;
	state: SlotState;
	/** Owners who haven't picked yet in this slot. */
	waitingOn: Owner[];
};

export function getOwners(): Owner[] {
	return getDb()
		.prepare("SELECT id, name, initials FROM personas WHERE role = 'owner' ORDER BY sort_order, id")
		.all() as Owner[];
}

/** Build the whole Pick screen for a week. */
export function getPickBoard(week: Week): { owners: Owner[]; slots: SlotBoard[] } {
	const db = getDb();
	const owners = getOwners();

	// Each offer with its recipe, plus that recipe's history from *earlier* weeks.
	const offers = db
		.prepare(
			`SELECT o.id, o.slot, o.letter, o.from_bank, o.recipe_id,
			        r.name, r.cuisine, r.total_minutes, r.servings, r.source_url,
			        -- how many earlier weeks offered this recipe, and how many picked it
			        (SELECT count(*) FROM offers o2 JOIN weeks w2 ON w2.id = o2.week_id
			          WHERE o2.recipe_id = r.id AND w2.week_of < :week_of) AS times_offered,
			        (SELECT count(*) FROM offers o2 JOIN weeks w2 ON w2.id = o2.week_id
			          WHERE o2.recipe_id = r.id AND o2.is_final_pick = 1 AND w2.week_of < :week_of) AS times_picked,
			        (SELECT avg(ra.stars) FROM ratings ra JOIN offers o2 ON o2.id = ra.offer_id
			          JOIN weeks w2 ON w2.id = o2.week_id
			          WHERE o2.recipe_id = r.id AND w2.week_of < :week_of) AS avg_rating,
			        (SELECT max(w2.week_of) FROM offers o2 JOIN weeks w2 ON w2.id = o2.week_id
			          WHERE o2.recipe_id = r.id AND o2.is_final_pick = 1 AND w2.week_of < :week_of) AS last_made,
			        -- the most recent "Tweak" note for this recipe
			        (SELECT ra.tweak_text FROM ratings ra JOIN offers o2 ON o2.id = ra.offer_id
			          JOIN weeks w2 ON w2.id = o2.week_id
			          WHERE o2.recipe_id = r.id AND ra.verdict = 'tweak' AND w2.week_of < :week_of
			          ORDER BY w2.week_of DESC, ra.created_at DESC LIMIT 1) AS latest_tweak
			 FROM offers o JOIN recipes r ON r.id = o.recipe_id
			 WHERE o.week_id = :week_id
			 ORDER BY o.slot, o.letter`
		)
		.all({ week_id: week.id, week_of: week.week_of }) as Record<string, unknown>[];

	const picks = db
		.prepare('SELECT slot, persona_id, offer_id FROM picks WHERE week_id = ?')
		.all(week.id) as { slot: string; persona_id: number; offer_id: number }[];

	const slots = SLOTS.map((slot): SlotBoard => {
		const slotPicks = picks.filter((p) => p.slot === slot.key);
		const pickOf = (owner: Owner) => slotPicks.find((p) => p.persona_id === owner.id)?.offer_id;

		const options = offers
			.filter((o) => o.slot === slot.key)
			.map((o): OptionCard => ({
				offerId: o.id as number,
				letter: o.letter as string,
				fromBank: o.from_bank === 1,
				recipe: {
					name: o.name as string,
					cuisine: o.cuisine as string,
					totalMinutes: o.total_minutes as number | null,
					servings: o.servings as number | null,
					sourceUrl: o.source_url as string | null
				},
				history: {
					timesOffered: o.times_offered as number,
					timesPicked: o.times_picked as number,
					avgRating: o.avg_rating as number | null,
					weeksSinceMade: o.last_made ? weeksBetween(o.last_made as string, week.week_of) : null
				},
				latestTweak: o.latest_tweak as string | null,
				pickedBy: owners.filter((owner) => pickOf(owner) === o.id)
			}));

		const chosen = owners.map(pickOf);
		const waitingOn = owners.filter((owner) => pickOf(owner) === undefined);
		let state: SlotState;
		if (waitingOn.length === owners.length) state = 'open';
		else if (waitingOn.length > 0) state = 'waiting';
		else if (new Set(chosen).size > 1) state = 'disagree';
		else state = 'agreed';

		const agreedOption =
			state === 'agreed' ? options.find((o) => o.offerId === chosen[0]) : undefined;
		const portions =
			agreedOption?.recipe.servings ?? mostCommon(options.map((o) => o.recipe.servings));

		return { key: slot.key, label: slot.label, options, portions, state, waitingOn };
	});

	return { owners, slots };
}

/**
 * Save one person's pick, then re-check whether the week is locked in.
 * Returns false if the offer isn't part of this week (or the week is finished).
 */
export function savePick(week: Week, personaId: number, offerId: number): boolean {
	if (week.status === 'done') return false;
	const db = getDb();

	const offer = db
		.prepare('SELECT slot FROM offers WHERE id = ? AND week_id = ?')
		.get(offerId, week.id) as { slot: string } | undefined;
	if (!offer) return false;

	transaction(db, () => {
		// "Upsert": add the pick, or replace this person's earlier pick for the slot.
		db.prepare(
			`INSERT INTO picks (week_id, slot, persona_id, offer_id) VALUES (?, ?, ?, ?)
			 ON CONFLICT (week_id, slot, persona_id)
			 DO UPDATE SET offer_id = excluded.offer_id, updated_at = datetime('now')`
		).run(week.id, offer.slot, personaId, offerId);

		updateLockIn(week);
	});
	return true;
}

/** Mark agreed slots as final picks, and lock the week if all four agree. */
function updateLockIn(week: Week): void {
	const db = getDb();
	const owners = getOwners();
	const picks = db
		.prepare('SELECT slot, persona_id, offer_id FROM picks WHERE week_id = ?')
		.all(week.id) as { slot: string; persona_id: number; offer_id: number }[];

	db.prepare('UPDATE offers SET is_final_pick = 0 WHERE week_id = ?').run(week.id);

	let agreedSlots = 0;
	for (const slot of SLOTS) {
		const chosen = owners.map(
			(owner) => picks.find((p) => p.slot === slot.key && p.persona_id === owner.id)?.offer_id
		);
		const everyonePicked = chosen.every((id) => id !== undefined);
		if (everyonePicked && new Set(chosen).size === 1) {
			db.prepare('UPDATE offers SET is_final_pick = 1 WHERE id = ?').run(chosen[0]!);
			agreedSlots += 1;
		}
	}

	const status = agreedSlots === SLOTS.length ? 'locked' : 'picking';
	db.prepare('UPDATE weeks SET status = ? WHERE id = ?').run(status, week.id);
}

/** Whole weeks between two YYYY-MM-DD dates. */
function weeksBetween(from: string, to: string): number {
	const days = (Date.parse(to) - Date.parse(from)) / (24 * 60 * 60 * 1000);
	return Math.round(days / 7);
}

function mostCommon(values: (number | null)[]): number | null {
	const counts = new Map<number, number>();
	for (const v of values) if (v !== null) counts.set(v, (counts.get(v) ?? 0) + 1);
	let best: number | null = null;
	for (const [value, count] of counts) if (best === null || count > counts.get(best)!) best = value;
	return best;
}
