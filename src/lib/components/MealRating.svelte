<!--
  One meal in the debrief: both people's stars, your verdict, and the tweak box.
  You edit your own rating; the other person's shows read-only.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { MealDebrief, Verdict } from '#lib/server/ratings.ts';

	type Props = {
		meal: MealDebrief;
		/** The signed-in person, or null for a viewer. */
		myId: number | null;
		/** Shown under this card after saving, or when the save failed. */
		saved: boolean;
		error: string | null;
	};
	let { meal, myId, saved, error }: Props = $props();

	const mine = $derived(meal.ratings.find((r) => r.owner.id === myId));

	// What's selected right now in the form (starts from what's saved).
	let stars = $state<number | null>(null);
	let verdict = $state<Verdict | null>(null);
	$effect.pre(() => {
		stars = mine?.stars ?? null;
		verdict = mine?.verdict ?? null;
	});

	const verdictLabel: Record<Verdict, string> = { again: 'Again', tweak: 'Tweak', never: 'Never' };
	const weekLabel = (iso: string) =>
		new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		});
</script>

<section class="card meal">
	<header>
		<h3>{meal.recipeName}</h3>
		<span class="muted small"
			>{meal.slotLabel} · {meal.fromBank ? 'Recipe bank' : 'New · AI pick'}</span
		>
	</header>

	<form
		method="POST"
		action="?/rate"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
	>
		<input type="hidden" name="offer" value={meal.offerId} />

		{#each meal.ratings as rating (rating.owner.id)}
			<div class="row">
				<span class="who">{rating.owner.name}</span>
				{#if rating.owner.id === myId}
					<fieldset class="stars">
						<legend class="visually-hidden">Your stars for {meal.recipeName}</legend>
						{#each [1, 2, 3, 4, 5] as n (n)}
							<label class="pill round" class:on={stars === n}>
								<input type="radio" name="stars" value={n} bind:group={stars} />
								{n}
							</label>
						{/each}
					</fieldset>
				{:else}
					<span class="readonly">
						{#if rating.stars}{rating.stars} of 5{:else}<span class="muted">Not rated yet</span
							>{/if}
						{#if rating.verdict}{' · '}{verdictLabel[rating.verdict]}{/if}
						{#if rating.tweakText}<span class="muted">: “{rating.tweakText}”</span>{/if}
					</span>
				{/if}
			</div>
		{/each}

		{#if mine}
			<div class="row">
				<span class="who">Make again?</span>
				<fieldset class="verdicts">
					<legend class="visually-hidden">Make {meal.recipeName} again?</legend>
					{#each ['again', 'tweak', 'never'] as const as v (v)}
						<label class="pill" class:on={verdict === v}>
							<input type="radio" name="verdict" value={v} bind:group={verdict} />
							{verdictLabel[v]}
						</label>
					{/each}
				</fieldset>
			</div>

			{#if verdict === 'tweak'}
				<div class="row">
					<label class="who" for="tweak-{meal.offerId}">If tweak</label>
					<input
						id="tweak-{meal.offerId}"
						name="tweak"
						type="text"
						placeholder="What should change next time?"
						value={mine.tweakText ?? ''}
						required
					/>
				</div>
			{/if}

			<div class="save">
				<button type="submit" class="button primary">Save</button>
				{#if error}
					<span class="error" role="alert">{error}</span>
				{:else if saved}
					<span class="ok" role="status">Saved</span>
				{/if}
			</div>
		{/if}
	</form>

	{#if meal.priorTweak}
		<p class="prior">
			Already includes your tweak from {weekLabel(meal.priorTweak.weekOf)}: {meal.priorTweak.text}
		</p>
	{/if}
</section>

<style>
	.meal {
		padding: 18px 20px;
	}
	header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 4px 12px;
		margin-bottom: 8px;
	}
	h3 {
		font-family: var(--font-body);
		font-size: 1.0625rem;
		font-weight: 600;
		margin: 0;
	}
	.small {
		font-size: 0.8125rem;
	}

	.row {
		display: grid;
		grid-template-columns: 6.5rem 1fr;
		align-items: center;
		gap: 10px;
		padding: 6px 0;
	}
	.who {
		color: var(--ink-secondary);
	}
	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		border: 0;
		margin: 0;
		padding: 0;
	}

	/* Radio buttons that look like the round pills in the mockup */
	.pill {
		position: relative;
		display: inline-grid;
		place-items: center;
		min-width: 44px;
		height: 44px;
		padding: 0 14px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--card);
		font-weight: 600;
		cursor: pointer;
	}
	.pill.round {
		width: 44px;
		padding: 0;
	}
	.pill input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}
	.pill:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.pill.on {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--callout-ink);
	}

	.readonly {
		font-size: 0.9375rem;
	}

	.save {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 10px;
	}
	.error {
		color: var(--accent);
	}
	.ok {
		color: var(--tag-hands-ink);
		font-weight: 600;
	}

	.prior {
		display: inline-block;
		margin: 12px 0 0;
		padding: 6px 12px;
		border-radius: 8px;
		background: var(--tag-bank-bg);
		color: var(--tag-bank-ink);
		font-size: 0.875rem;
	}

	@media (max-width: 420px) {
		.row {
			grid-template-columns: 1fr;
			gap: 4px;
		}
	}
</style>
