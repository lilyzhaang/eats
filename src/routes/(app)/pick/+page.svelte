<!--
  Pick: this week's options for each slot.
  Skeleton version — a plain list to prove the data is flowing.
  The tappable cards, both people's picks and the disagreement state come next.
-->
<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Pick · Eats</title>
</svelte:head>

{#if data.week}
	<p class="eyebrow">Pick · Week of {data.week.label}</p>
	<h1>Two lunches, two dinners. Your call.</h1>

	{#each data.slots as slot (slot.key)}
		<section class="slot">
			<h2>{slot.label}</h2>
			<ul class="card">
				{#each slot.offers as offer (offer.id)}
					<li>
						<strong>{offer.letter}</strong>
						<span class="tag" class:ai={!offer.from_bank} class:bank={offer.from_bank}>
							{offer.from_bank ? 'Recipe bank' : 'New · AI pick'}
						</span>
						<span>{offer.recipe_name}</span>
						{#if offer.is_final_pick}<span class="muted">· picked</span>{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	<p class="muted coming">Coming next: tappable cards, both people’s picks, and lock-in.</p>
{:else}
	<h1>No menu yet</h1>
	<p class="muted">Once a week’s options are imported, they’ll show up here.</p>
{/if}

<style>
	.slot {
		margin-top: 28px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 4px 16px;
	}
	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 12px 0;
		border-bottom: 1px solid var(--border);
	}
	li:last-child {
		border-bottom: 0;
	}
	.coming {
		margin-top: 32px;
	}
</style>
