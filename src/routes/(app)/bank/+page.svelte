<!--
  Recipe bank: every recipe you've cooked, plus ones you've added yourselves,
  with how each one has gone. Read-only for everyone. Favourites come back
  in weekly menus.
-->
<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let cuisine = $state('all');
	let meal = $state<'all' | 'lunch' | 'dinner'>('all');

	const cuisines = $derived([...new Set(data.recipes.map((r) => r.cuisine))].sort());
	const shown = $derived(
		data.recipes.filter(
			(r) =>
				(cuisine === 'all' || r.cuisine === cuisine) &&
				(meal === 'all' || r.mealType === meal || r.mealType === 'either')
		)
	);
	const favourites = $derived(shown.filter((r) => r.favourite));
	const others = $derived(shown.filter((r) => !r.favourite && !r.retired));
	const retired = $derived(shown.filter((r) => r.retired));

	function lastMadeLabel(iso: string | null) {
		if (!iso) return null;
		const weeks = Math.round(
			(Date.now() - Date.parse(iso + 'T00:00:00Z')) / (7 * 24 * 3600 * 1000)
		);
		if (weeks <= 0) return 'made this week';
		return weeks === 1 ? 'made 1 wk ago' : `made ${weeks} wks ago`;
	}
</script>

<svelte:head>
	<title>Recipe bank · Eats</title>
</svelte:head>

<p class="eyebrow">Recipe bank</p>
<h1>The ones worth making again.</h1>
<p class="muted intro">
	Everything you’ve cooked, plus favourites you’ve added yourselves. Recipes you both rate highly
	come back as options in future weeks.
</p>

{#if data.recipes.length === 0}
	<div class="callout">
		<h3>Nothing here yet</h3>
		<p>
			Recipes join the bank once you’ve cooked them, so after your first prep day they’ll start to
			show up.
		</p>
	</div>
{:else}
	<div class="filters" role="group" aria-label="Filter recipes">
		<label>
			<span class="visually-hidden">Cuisine</span>
			<select bind:value={cuisine}>
				<option value="all">All cuisines</option>
				{#each cuisines as c (c)}<option value={c}>{c}</option>{/each}
			</select>
		</label>
		<div class="segmented" role="radiogroup" aria-label="Meal">
			{#each [['all', 'All'], ['lunch', 'Lunch'], ['dinner', 'Dinner']] as [value, label] (value)}
				<button
					type="button"
					role="radio"
					aria-checked={meal === value}
					onclick={() => (meal = value as typeof meal)}>{label}</button
				>
			{/each}
		</div>
	</div>

	{#snippet card(r: (typeof data.recipes)[number])}
		<a class="card recipe" href="/bank/{r.id}">
			<span class="tags">
				{#if r.favourite}<span class="tag bank">Favourite</span>{/if}
				{#if r.addedByYou}<span class="tag hands">Your recipe</span>{/if}
				{#if r.retired}<span class="tag muted-tag">Not again</span>{/if}
			</span>
			<span class="name">{r.name}</span>
			<span class="meta">
				{r.cuisine}{#if r.totalMinutes}{' · '}{r.totalMinutes} min{/if}
			</span>
			<span class="meta">
				{#if r.avgRating !== null}★ {r.avgRating.toFixed(1)}{' · '}{/if}
				{#if r.timesMade > 0}made {r.timesMade}×{:else}not made in the app yet{/if}
				{#if lastMadeLabel(r.lastMade)}{' · '}{lastMadeLabel(r.lastMade)}{/if}
			</span>
			{#if r.latestTweak}<span class="tweak">Your tweak: {r.latestTweak}</span>{/if}
		</a>
	{/snippet}

	{#if favourites.length}
		<section>
			<h2>Favourites <span class="count">{favourites.length}</span></h2>
			<div class="grid">
				{#each favourites as r (r.id)}{@render card(r)}{/each}
			</div>
		</section>
	{/if}
	{#if others.length}
		<section>
			<h2>Tried <span class="count">{others.length}</span></h2>
			<div class="grid">
				{#each others as r (r.id)}{@render card(r)}{/each}
			</div>
		</section>
	{/if}
	{#if retired.length}
		<section>
			<h2>Not again <span class="count">{retired.length}</span></h2>
			<p class="muted small">Someone said “Never”, so these won’t be suggested again.</p>
			<div class="grid">
				{#each retired as r (r.id)}{@render card(r)}{/each}
			</div>
		</section>
	{/if}
	{#if shown.length === 0}
		<p class="muted">No recipes match those filters.</p>
	{/if}
{/if}

<style>
	.intro {
		max-width: 60ch;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin: 20px 0 8px;
	}
	.filters select {
		width: auto;
		min-width: 170px;
	}
	.segmented {
		display: inline-flex;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--card);
		padding: 3px;
	}
	.segmented button {
		min-height: 38px;
		padding: 0 16px;
		border: 0;
		border-radius: 999px;
		background: none;
		font: inherit;
		font-weight: 600;
		color: var(--ink-secondary);
		cursor: pointer;
	}
	.segmented button[aria-checked='true'] {
		background: var(--ink);
		color: var(--callout-ink);
	}

	section {
		margin-top: 28px;
	}
	h2 {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.count {
		font-family: var(--font-body);
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--ink-secondary);
	}
	.small {
		font-size: 0.875rem;
		margin-top: 0;
	}
	.grid {
		display: grid;
		gap: 12px;
	}
	@media (min-width: 560px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.recipe {
		display: grid;
		align-content: start;
		gap: 4px;
		padding: 16px;
		color: inherit;
		text-decoration: none;
	}
	.recipe:hover {
		border-color: var(--ink-secondary);
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		min-height: 4px;
	}
	.tag.hands {
		background: var(--tag-hands-bg);
		color: var(--tag-hands-ink);
	}
	.tag.muted-tag {
		background: var(--border);
		color: var(--ink-secondary);
	}
	.name {
		font-weight: 600;
		font-size: 1.0625rem;
		line-height: 1.3;
		margin-top: 4px;
	}
	.meta {
		color: var(--ink-secondary);
		font-size: 0.875rem;
	}
	.tweak {
		color: var(--accent);
		font-size: 0.875rem;
	}
	.callout {
		margin-top: 24px;
	}
	.callout p {
		margin: 0;
	}
</style>
