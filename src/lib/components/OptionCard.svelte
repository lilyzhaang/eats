<!--
  One option on the Pick screen (A, B or C), styled after the menu mockup.
  The whole card is a button: tapping it saves your pick.
-->
<script lang="ts">
	import type { OptionCard } from '#lib/server/picks.ts';

	type Props = {
		option: OptionCard;
		/** Is this the signed-in person's current pick? */
		mine: boolean;
		/** False for viewers: the card shows, but can't be tapped. */
		canPick: boolean;
	};
	let { option, mine, canPick }: Props = $props();

	const { recipe, history } = $derived(option);
	const madeBefore = $derived(history.timesPicked > 0);
</script>

<button
	type="submit"
	name="offer"
	value={option.offerId}
	class="option card"
	class:mine
	class:picked={option.pickedBy.length > 0}
	disabled={!canPick}
	aria-pressed={mine}
>
	<span class="letter">{option.letter}</span>
	<span class="tag" class:ai={!option.fromBank} class:bank={option.fromBank}>
		{option.fromBank ? 'Recipe bank' : 'New · AI pick'}
	</span>
	<span class="name">{recipe.name}</span>

	<span class="meta">
		{recipe.cuisine}{#if recipe.totalMinutes}{' · '}{recipe.totalMinutes} min{/if}
		{#if option.fromBank && madeBefore}
			{#if history.avgRating !== null}{' · '}★ {history.avgRating.toFixed(1)}{/if}
			{' · '}picked {history.timesPicked} of {history.timesOffered}
			{#if history.weeksSinceMade !== null}
				{' · '}last made {history.weeksSinceMade === 1 ? '1 wk' : `${history.weeksSinceMade} wks`} ago
			{/if}
		{/if}
	</span>

	{#if option.latestTweak}
		<span class="tweak">With your tweak: {option.latestTweak}</span>
	{/if}

	{#if option.pickedBy.length > 0}
		<span class="pickers" aria-label="Picked by {option.pickedBy.map((o) => o.name).join(' and ')}">
			{#each option.pickedBy as owner (owner.id)}
				<span class="initial" title={owner.name}>{owner.initials}</span>
			{/each}
		</span>
	{/if}
</button>

<!-- Recipe link sits outside the button, so tapping it opens the recipe instead of picking. -->
{#if recipe.sourceUrl}
	<a class="source" href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
		{recipe.name} recipe
	</a>
{/if}

<style>
	.option {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
		width: 100%;
		min-height: 100%;
		padding: 16px;
		text-align: left;
		font: inherit;
		color: inherit;
		cursor: pointer;
		position: relative;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	.option:hover:not(:disabled) {
		border-color: var(--ink-secondary);
	}
	.option:disabled {
		cursor: default;
	}
	/* Your pick: a heavier ink outline */
	.option.mine {
		border-color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--ink);
	}

	.letter {
		font-family: var(--font-heading);
		font-weight: 800;
		font-size: 1.375rem;
		line-height: 1;
	}
	.name {
		font-weight: 600;
		font-size: 1.0625rem;
		line-height: 1.3;
	}
	.meta {
		color: var(--ink-secondary);
		font-size: 0.875rem;
	}
	.tweak {
		color: var(--accent);
		font-size: 0.875rem;
	}

	.pickers {
		display: flex;
		gap: 4px;
		margin-top: auto;
		padding-top: 6px;
	}
	.initial {
		display: inline-grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--ink);
		color: var(--callout-ink);
		font-size: 0.8125rem;
		font-weight: 700;
	}

	.source {
		display: inline-block;
		margin-top: 6px;
		font-size: 0.875rem;
	}
</style>
