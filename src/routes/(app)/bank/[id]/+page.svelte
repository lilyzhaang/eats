<!--
  One recipe from the bank: what's in it, how to make it, and how it's been rated.
-->
<script lang="ts">
	import { formatQuantity } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const r = $derived(data.recipe);

	const verdictLabel = { again: 'Again', tweak: 'Tweak', never: 'Never' } as const;
	const weekLabel = (iso: string) =>
		new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		});
</script>

<svelte:head>
	<title>{r.name} · Eats</title>
</svelte:head>

<p class="back"><a href="/bank">← Recipe bank</a></p>

<div class="tags">
	{#if r.favourite}<span class="tag bank">Favourite</span>{/if}
	{#if r.addedByYou}<span class="tag saved">Your recipe</span>{/if}
	{#if r.savedToTry}<span class="tag saved">Saved to try</span>{/if}
	{#if r.retired}<span class="tag muted-tag">Not again</span>{/if}
</div>
<h1>{r.name}</h1>
<p class="muted">
	{r.cuisine}{#if r.totalMinutes}{' · '}{r.totalMinutes} min{/if}{#if r.servings}{' · '}makes
		{r.servings}{/if}
</p>
{#if r.sourceUrl}
	<p class="credit">
		Recipe by <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer"
			>{r.sourceCredit ?? 'the original creator'}</a
		>. The ingredients and steps below are this app’s own version; follow the link for the original.
	</p>
{/if}

<dl class="stats">
	<div class="card">
		<dt>Rating</dt>
		<dd>{r.avgRating !== null ? `★ ${r.avgRating.toFixed(1)}` : '—'}</dd>
	</div>
	<div class="card">
		<dt>Times made</dt>
		<dd>{r.timesMade}</dd>
	</div>
	<div class="card">
		<dt>Last made</dt>
		<dd>{r.lastMade ? weekLabel(r.lastMade) : '—'}</dd>
	</div>
</dl>

{#if r.latestTweak}
	<p class="tweak">Your latest tweak: {r.latestTweak}</p>
{/if}
{#if r.notes}
	<p class="notes">{r.notes}</p>
{/if}

<div class="columns">
	{#if r.ingredients.length}
		<section>
			<h2>Ingredients</h2>
			<ul class="ingredients">
				{#each r.ingredients as item, i (i)}
					<li>
						<span
							>{item.name}{#if item.prepNote}<span class="muted">, {item.prepNote}</span>{/if}</span
						>
						<span class="qty">{formatQuantity(item.quantity, item.unit)}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if r.steps.length}
		<section>
			<h2>Steps</h2>
			<ol class="steps">
				{#each r.steps as step, i (i)}<li>{step}</li>{/each}
			</ol>
		</section>
	{/if}
</div>

{#if r.ratings.length}
	<section>
		<h2>How it went</h2>
		<ul class="ratings card">
			{#each r.ratings as rating, i (i)}
				<li>
					<span class="muted">{weekLabel(rating.weekOf)}</span>
					<span
						><strong>{rating.person}</strong>{#if rating.stars}{' · '}{rating.stars} of 5{/if}{#if rating.verdict}{' · '}{verdictLabel[
								rating.verdict
							]}{/if}</span
					>
					{#if rating.tweakText}<span class="muted">“{rating.tweakText}”</span>{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.back {
		margin: 0 0 16px;
	}
	.tags {
		display: flex;
		gap: 6px;
		margin-bottom: 8px;
	}
	.credit {
		color: var(--ink-secondary);
		font-size: 0.9375rem;
		max-width: 62ch;
	}
	.tag.muted-tag {
		background: var(--border);
		color: var(--ink-secondary);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin: 20px 0;
	}
	.stats .card {
		padding: 12px 14px;
	}
	dt {
		color: var(--ink-secondary);
		font-size: 0.8125rem;
	}
	dd {
		margin: 2px 0 0;
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 1.125rem;
	}

	.tweak {
		display: inline-block;
		padding: 6px 12px;
		border-radius: 8px;
		background: var(--tag-bank-bg);
		color: var(--tag-bank-ink);
	}
	.notes {
		max-width: 62ch;
	}

	.columns {
		display: grid;
		gap: 8px 32px;
	}
	@media (min-width: 700px) {
		.columns {
			grid-template-columns: 1fr 1.3fr;
		}
	}
	section {
		margin-top: 20px;
	}
	.ingredients {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.ingredients li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 0;
		border-bottom: 1px solid var(--border);
	}
	.qty {
		font-weight: 600;
		white-space: nowrap;
	}
	.steps {
		margin: 0;
		padding-left: 20px;
		display: grid;
		gap: 10px;
	}

	.ratings {
		list-style: none;
		margin: 0;
		padding: 4px 16px;
	}
	.ratings li {
		display: grid;
		gap: 2px;
		padding: 10px 0;
		border-bottom: 1px solid var(--border);
	}
	.ratings li:last-child {
		border-bottom: 0;
	}
</style>
