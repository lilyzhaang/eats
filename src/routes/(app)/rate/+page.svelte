<!--
  Rate: the weekly debrief, styled after the debrief mockup.
  Rate each meal, then answer two quick questions.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import MealRating from '#lib/components/MealRating.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const myId = $derived(data.user.role === 'owner' ? data.user.personaId : null);
	const myBest = $derived(
		data.debrief?.bestVotes.find((v) => v.owner.id === myId)?.offerId ?? null
	);
</script>

<svelte:head>
	<title>Rate · Eats</title>
</svelte:head>

{#if data.debrief && data.rateWeek}
	{@const debrief = data.debrief}
	<p class="eyebrow">Weekly debrief · Week of {data.rateWeek.label}</p>
	<h1>Rate the week, shape the next one.</h1>
	<p class="muted intro">
		Two minutes each. Anything you both rate highly joins your recipe bank and comes back as a
		favourite. “Never” means it won’t be suggested again.
	</p>

	<div class="meals">
		{#each debrief.meals as meal (meal.offerId)}
			<MealRating
				{meal}
				{myId}
				saved={form?.savedOfferId === meal.offerId}
				error={form && 'offerId' in form && form.offerId === meal.offerId ? (form.message ?? null) : null}
			/>
		{/each}
	</div>

	<section class="card closing">
		<h2>Two quick ones</h2>
		<form
			method="POST"
			action="?/closing"
			use:enhance={() =>
				({ update }) =>
					update({ reset: false })}
		>
			<fieldset>
				<legend>1. Best meal of the week?</legend>
				{#each debrief.meals as meal (meal.offerId)}
					<label class="choice">
						<input
							type="radio"
							name="best"
							value={meal.offerId}
							checked={myBest === meal.offerId}
							disabled={!myId}
						/>
						{meal.recipeName}
						{#each debrief.bestVotes.filter((v) => v.offerId === meal.offerId) as vote (vote.owner.id)}
							<span class="initial" title="{vote.owner.name}’s pick">{vote.owner.initials}</span>
						{/each}
					</label>
				{/each}
			</fieldset>

			<label for="cravings" class="question">2. Anything you’re craving for next week?</label>
			<textarea
				id="cravings"
				name="cravings"
				rows="3"
				placeholder="Something with dumplings? More soup?"
				disabled={!myId}>{debrief.cravings}</textarea
			>

			{#if myId}
				<div class="save">
					<button type="submit" class="button primary">Save</button>
					{#if form && 'closing' in form}
						<span class="error" role="alert">{form.message}</span>
					{:else if form?.closingSaved}
						<span class="ok" role="status">Saved</span>
					{/if}
				</div>
			{/if}
		</form>
	</section>

	<dl class="stats">
		<div class="card">
			<dt>Recipes rated so far</dt>
			<dd>{debrief.stats.recipesRated}</dd>
		</div>
		<div class="card">
			<dt>In your recipe bank</dt>
			<dd>{debrief.stats.inRecipeBank}</dd>
		</div>
		<div class="card">
			<dt>Most picked</dt>
			<dd>{debrief.stats.mostPicked ?? '—'}</dd>
		</div>
	</dl>
{:else}
	<p class="eyebrow">Weekly debrief</p>
	<h1>Nothing to rate yet.</h1>
	<p class="muted">Once a week’s meals are locked in and cooked, you’ll rate them here.</p>
{/if}

<style>
	.intro {
		max-width: 60ch;
	}
	.meals {
		display: grid;
		gap: 16px;
		margin-top: 20px;
	}

	.closing {
		margin-top: 24px;
		padding: 18px 20px;
	}
	.closing h2 {
		font-size: 1.25rem;
	}
	fieldset {
		border: 0;
		margin: 0 0 16px;
		padding: 0;
		display: grid;
		gap: 4px;
	}
	legend,
	.question {
		display: block;
		font-weight: 600;
		margin-bottom: 6px;
	}
	.choice {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		cursor: pointer;
	}
	.choice input {
		width: 20px;
		height: 20px;
		min-height: 0;
		accent-color: var(--ink);
	}
	.initial {
		display: inline-grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--ink);
		color: var(--callout-ink);
		font-size: 0.75rem;
		font-weight: 700;
	}
	textarea {
		resize: vertical;
	}
	.save {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 12px;
	}
	.error {
		color: var(--accent);
	}
	.ok {
		color: var(--tag-hands-ink);
		font-weight: 600;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin: 24px 0 0;
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
		overflow-wrap: anywhere;
	}
</style>
