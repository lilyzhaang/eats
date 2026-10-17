<!--
  Shop: everything for the four picks, added up and sorted by aisle,
  with pantry staples at the bottom. Ticks are shared between you both.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatQuantity } from '#lib/format.ts';
	import type { GroceryItem } from '#lib/server/grocery.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canCheck = $derived(data.user.role === 'owner');
	const slotLabel: Record<string, string> = {
		lunch_1: 'Lunch 1',
		lunch_2: 'Lunch 2',
		dinner_1: 'Dinner 1',
		dinner_2: 'Dinner 2'
	};
	const left = $derived(
		data.list
			? [...data.list.aisles.flatMap((a) => a.items), ...data.list.pantry].filter(
					(i) => !i.checkedBy
				).length
			: 0
	);
</script>

<svelte:head>
	<title>Shop · Eats</title>
</svelte:head>

<p class="eyebrow">
	Grocery list{#if data.week}{' · '}Week of {data.week.label}{/if}
</p>

{#if data.list}
	<h1>Here’s the haul.</h1>
	<p class="muted intro">
		Everything for your four picks, with shared ingredients added up and sorted by aisle. Pantry
		staples are at the bottom, so cross off what you already have.
	</p>

	<section class="card picked">
		<h2>You picked</h2>
		<dl>
			{#each data.list.picks as pick (pick.slot)}
				<dt class="muted">{slotLabel[pick.slot]}</dt>
				<dd>{pick.recipe}</dd>
			{/each}
		</dl>
	</section>

	<p class="count muted" role="status">
		{left === 0 ? 'All done.' : `${left} of ${data.list.itemCount} items left`}
	</p>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<form
		method="POST"
		action="?/check"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
	>
		{#snippet row(item: GroceryItem)}
			<li>
				<button
					type="submit"
					name="toggle"
					value="{item.ingredientId}:{item.checkedBy ? 0 : 1}"
					role="checkbox"
					aria-checked={Boolean(item.checkedBy)}
					class="item"
					class:done={Boolean(item.checkedBy)}
					disabled={!canCheck}
				>
					<span class="box" aria-hidden="true">
						{#if item.checkedBy}
							<svg viewBox="0 0 16 16" width="14" height="14"
								><path
									d="M3 8.5l3 3 7-7"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/></svg
							>
						{/if}
					</span>
					<span class="name">
						{item.name}
						{#if item.whereToBuy}<span class="where"> · {item.whereToBuy}</span>{/if}
					</span>
					{#if item.checkedBy}<span class="by" title="Checked off">{item.checkedBy}</span>{/if}
					<span class="qty">{formatQuantity(item.quantity, item.unit)}</span>
				</button>
			</li>
		{/snippet}

		{#each data.list.aisles as group (group.aisle)}
			<section class="aisle">
				<h3 class="eyebrow">{group.aisle}</h3>
				<ul>
					{#each group.items as item (item.ingredientId)}
						{@render row(item)}
					{/each}
				</ul>
			</section>
		{/each}

		{#if data.list.pantry.length > 0}
			<section class="pantry">
				<header>
					<h2>Pantry check</h2>
					<span class="muted small">Probably at home already</span>
				</header>
				<ul>
					{#each data.list.pantry as item (item.ingredientId)}
						{@render row(item)}
					{/each}
				</ul>
			</section>
		{/if}
	</form>

	<a class="button primary next" href="/cook">See your prep-day plan</a>
{:else}
	<h1>Pick first, then shop.</h1>
	<p class="muted">
		The grocery list appears once you’ve both agreed on all four meals for the week.
	</p>
	<a class="button primary next" href="/pick">Go to Pick</a>
{/if}

<style>
	.intro {
		max-width: 60ch;
	}
	.error {
		color: var(--accent);
	}

	.picked {
		padding: 16px 20px;
		margin: 20px 0;
	}
	.picked h2 {
		font-size: 1.125rem;
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 20px;
		margin: 0;
	}
	dd {
		margin: 0;
	}

	.count {
		margin: 0 0 8px;
		font-size: 0.9375rem;
	}

	.aisle {
		margin-top: 20px;
	}
	.aisle h3 {
		margin: 0;
		padding-bottom: 6px;
		border-bottom: 1px solid var(--border);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		border-bottom: 1px solid var(--border);
	}
	li:last-child {
		border-bottom: 0;
	}

	/* Each row is one big tappable button */
	.item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 48px;
		padding: 8px 0;
		background: none;
		border: 0;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.item:disabled {
		cursor: default;
	}
	.box {
		flex: none;
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border: 1.5px solid var(--ink-secondary);
		border-radius: 5px;
		background: var(--card);
	}
	.item.done .box {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--callout-ink);
	}
	.item.done .name,
	.item.done .qty {
		color: var(--ink-secondary);
		text-decoration: line-through;
	}
	.name {
		flex: 1;
	}
	.where {
		color: var(--ink-secondary);
		font-size: 0.8125rem;
	}
	.qty {
		font-weight: 600;
		white-space: nowrap;
	}
	.by {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--ink-secondary);
	}

	.pantry {
		margin-top: 28px;
		padding: 16px 20px 8px;
		background: #efebe4;
		border-radius: var(--radius);
	}
	.pantry header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		border-bottom: 1px solid var(--border);
		padding-bottom: 8px;
	}
	.pantry h2 {
		font-size: 1.125rem;
		margin: 0;
	}
	.pantry .box {
		background: transparent;
	}
	.small {
		font-size: 0.8125rem;
	}

	.next {
		margin-top: 28px;
	}
</style>
