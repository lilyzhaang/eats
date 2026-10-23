<!--
  Pick: this week's options for Lunch 1, Lunch 2, Dinner 1 and Dinner 2.
  Each owner taps one card per slot. When everyone agrees on all four,
  the week locks in and the grocery list and prep plan are ready.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import NextWeek from '#lib/components/NextWeek.svelte';
	import OptionCard from '#lib/components/OptionCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canPick = $derived(data.user.role === 'owner');
	const slots = $derived(data.board?.slots ?? []);
	const agreedCount = $derived(slots.filter((s) => s.state === 'agreed').length);
	const lockedIn = $derived(slots.length > 0 && agreedCount === slots.length);

	/** The other owner's name for "You two disagree" wording, e.g. "Andrei picked C". */
	function pickSummary(slot: (typeof slots)[number]) {
		return slot.options
			.flatMap((o) => o.pickedBy.map((owner) => `${owner.name} picked ${o.letter}`))
			.join(', ');
	}
</script>

<svelte:head>
	<title>Pick · Eats</title>
</svelte:head>

{#if data.week && data.board}
	<p class="eyebrow">Pick · Week of {data.week.label}</p>
	<h1>Two lunches, two dinners. Your call.</h1>
	<p class="muted intro">
		Tap one card per slot. You’ll see each other’s picks, and any slot where you disagree gets
		flagged.
	</p>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<!-- One form for the whole board. use:enhance saves without reloading the page. -->
	<form
		method="POST"
		action="?/pick"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false, invalidateAll: true })}
	>
		{#each slots as slot (slot.key)}
			<section
				class="slot"
				class:disagree={slot.state === 'disagree'}
				aria-labelledby="slot-{slot.key}"
			>
				<header class="slot-header">
					<h2 id="slot-{slot.key}">{slot.label}</h2>
					{#if slot.portions}<span class="muted portions">Makes {slot.portions} portions</span>{/if}
				</header>

				{#if slot.state === 'disagree'}
					<p class="status disagree-note" role="status">
						<strong>You two disagree.</strong>
						{pickSummary(slot)}.
					</p>
				{:else if slot.state === 'waiting'}
					<p class="status muted" role="status">
						Waiting on {slot.waitingOn.map((o) => o.name).join(' and ')}.
					</p>
				{:else if slot.state === 'agreed'}
					<p class="status agreed" role="status">Agreed.</p>
				{/if}

				<div class="options">
					{#each slot.options as option (option.offerId)}
						<div>
							<OptionCard
								{option}
								{canPick}
								mine={option.pickedBy.some((o) => o.id === data.user.personaId)}
							/>
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</form>

	{#if lockedIn}
		<div class="callout">
			<h3>Locked in</h3>
			<p>You agree on all four. Your grocery list and prep-day plan are ready.</p>
			<div class="actions">
				<a class="button light" href="/shop">Grocery list</a>
				<a class="button light" href="/cook">Prep-day plan</a>
			</div>
		</div>
	{:else}
		<div class="callout">
			<h3>{agreedCount} of {slots.length} slots agreed</h3>
			<p>
				Once you’ve both picked the same option in every slot, the grocery list and prep-day plan
				are ready.
			</p>
		</div>
	{/if}

	{#if data.nextMenu}
		<NextWeek status={data.nextMenu} />
	{/if}
{:else}
	<h1>No menu yet</h1>
	{#if data.nextMenu}
		<p class="muted">Ask Claude for the first menu below.</p>
		<NextWeek status={data.nextMenu} />
	{:else}
		<p class="muted">Lily and Andrei haven’t planned a week yet. Check back soon.</p>
	{/if}
{/if}

<style>
	.intro {
		max-width: 56ch;
	}
	.error {
		color: var(--accent);
	}

	.slot {
		margin-top: 32px;
		border-radius: var(--radius);
	}
	.slot.disagree {
		/* Soft paprika wash so the slot stands out */
		background: var(--tag-bank-bg);
		box-shadow: 0 0 0 10px var(--tag-bank-bg);
	}
	.slot-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}
	.portions {
		font-size: 0.875rem;
	}

	.status {
		margin: 0 0 10px;
		font-size: 0.9375rem;
	}
	.disagree-note {
		color: var(--tag-bank-ink);
	}
	.agreed {
		color: var(--tag-hands-ink);
		font-weight: 600;
	}

	/* Phones: cards stacked. Wider: side by side, like the mockup. */
	.options {
		display: grid;
		gap: 12px;
	}
	@media (min-width: 560px) {
		.options {
			grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
			grid-auto-flow: column;
		}
	}

	.callout {
		margin-top: 40px;
	}
	.callout p {
		margin: 0 0 4px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 14px;
	}
	.button.light {
		background: var(--callout-ink);
		color: var(--ink);
		border-color: var(--callout-ink);
	}
</style>
