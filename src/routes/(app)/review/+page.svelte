<!--
  Review: the menu Claude wrote for next week, before it opens for picking.
  Open a card to see its ingredients and steps, swap any option, then approve.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formatQuantity } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const review = $derived(data.review);

	// While Claude is writing, check back every 5 seconds.
	$effect(() => {
		if (!review.working) return;
		const timer = setInterval(() => invalidateAll(), 5000);
		return () => clearInterval(timer);
	});

	const keepForm =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<svelte:head>
	<title>Review next week · Eats</title>
</svelte:head>

<p class="eyebrow">Next week · Week of {review.draft?.label ?? review.nextWeekLabel}</p>

{#if form?.message}
	<p class="error" role="alert">{form.message}</p>
{/if}

{#if review.draft}
	{@const draft = review.draft}
	<h1>Claude’s menu is in.</h1>
	{#if draft.note}<p class="note">{draft.note}</p>{/if}
	<p class="muted">
		Open a card to see the ingredients and steps. Swap anything that doesn’t appeal, then approve to
		open it for picking.
	</p>

	{#if review.working}
		<p class="working" role="status">
			<span class="dot" aria-hidden="true"></span> Claude is writing a replacement…
		</p>
	{:else if review.lastError}
		<p class="error" role="alert">The last swap didn’t work: {review.lastError}</p>
	{/if}

	{#each draft.slots as slot (slot.key)}
		<section class="slot">
			<h2>{slot.label}</h2>
			<div class="options">
				{#each slot.options as option (option.offerId)}
					<article class="card option">
						<span class="letter">{option.letter}</span>
						<span class="tag" class:ai={!option.fromBank} class:bank={option.fromBank}>
							{option.fromBank ? 'Recipe bank' : 'New · AI pick'}
						</span>
						<h3>{option.name}</h3>
						<p class="meta">
							{option.cuisine}{#if option.totalMinutes}{' · '}{option.totalMinutes} min{/if}{#if option.servings}{' · '}{option.servings}
								portions{/if}
							{#if option.sourceUrl}
								{' · '}<a href={option.sourceUrl} target="_blank" rel="noopener noreferrer"
									>source</a
								>
							{/if}
						</p>

						{#if option.ingredients.length || option.steps.length}
							<details>
								<summary>Ingredients & steps</summary>
								<ul class="ingredients">
									{#each option.ingredients as item, i (i)}
										<li>
											<span
												>{item.name}{#if item.prepNote}<span class="muted">, {item.prepNote}</span
													>{/if}</span
											>
											<span class="qty">{formatQuantity(item.quantity, item.unit)}</span>
										</li>
									{/each}
								</ul>
								<ol class="steps">
									{#each option.steps as step, i (i)}<li>{step}</li>{/each}
								</ol>
							</details>
						{/if}

						<form method="POST" action="?/swap" use:enhance={keepForm}>
							<input type="hidden" name="offer" value={option.offerId} />
							<button
								type="submit"
								class="button small"
								disabled={review.working || !review.claudeReady}
							>
								Swap for something else
							</button>
						</form>
					</article>
				{/each}
			</div>
		</section>
	{/each}

	<div class="callout">
		<h3>Happy with it?</h3>
		<p>Approving opens it on the Pick tab for both of you.</p>
		<div class="actions">
			<form method="POST" action="?/approve">
				<input type="hidden" name="week" value={draft.id} />
				<button type="submit" class="button light" disabled={review.working}>Approve menu</button>
			</form>
			<form
				method="POST"
				action="?/discard"
				onsubmit={(e) => {
					if (!confirm('Throw this menu away? You can ask Claude for a new one afterwards.'))
						e.preventDefault();
				}}
			>
				<input type="hidden" name="week" value={draft.id} />
				<button type="submit" class="button ghost" disabled={review.working}>Discard</button>
			</form>
		</div>
	</div>
{:else if review.working}
	<h1>Claude is writing your menu…</h1>
	<p class="working" role="status">
		<span class="dot" aria-hidden="true"></span> This usually takes a minute or two. This page updates
		by itself.
	</p>
{:else}
	<h1>Ready for next week?</h1>
	<p class="muted intro">
		Claude will write a fresh menu for the week of {review.nextWeekLabel}, using your ratings,
		tweaks and cravings. You’ll review it here before it opens for picking.
	</p>

	{#if review.lastError}
		<p class="error" role="alert">The last attempt didn’t work: {review.lastError}</p>
	{/if}

	{#if review.claudeReady}
		<form method="POST" action="?/generate" use:enhance={keepForm}>
			<button type="submit" class="button primary">Generate next week’s menu</button>
		</form>
		<p class="muted small">Takes a few minutes. Uses about $0.66 of Claude API credit.</p>
	{:else}
		<p class="notice">
			To turn this on, add your Claude API key to the <code>.env</code> file (<code
				>ANTHROPIC_API_KEY=</code
			>) and restart the app.
		</p>
	{/if}
{/if}

<style>
	.intro {
		max-width: 60ch;
	}
	.note {
		font-size: 1.0625rem;
		max-width: 62ch;
		border-left: 3px solid var(--accent);
		padding-left: 14px;
	}
	.error {
		color: var(--accent);
	}
	.notice {
		background: var(--tag-bank-bg);
		color: var(--tag-bank-ink);
		padding: 12px 14px;
		border-radius: var(--radius);
	}
	.small {
		font-size: 0.875rem;
	}

	.working {
		display: flex;
		align-items: center;
		gap: 10px;
		font-weight: 600;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--accent);
		animation: pulse 1.2s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			opacity: 0.25;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
		}
	}

	.slot {
		margin-top: 28px;
	}
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
	.option {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
		padding: 16px;
	}
	.letter {
		font-family: var(--font-heading);
		font-weight: 800;
		font-size: 1.375rem;
		line-height: 1;
	}
	.option h3 {
		font-family: var(--font-body);
		font-size: 1.0625rem;
		font-weight: 600;
		margin: 0;
	}
	.meta {
		color: var(--ink-secondary);
		font-size: 0.875rem;
		margin: 0;
	}

	details {
		width: 100%;
		font-size: 0.875rem;
	}
	summary {
		cursor: pointer;
		color: var(--accent);
		font-weight: 600;
		min-height: 32px;
		display: flex;
		align-items: center;
	}
	.ingredients {
		list-style: none;
		margin: 6px 0 10px;
		padding: 0;
	}
	.ingredients li {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		padding: 3px 0;
		border-bottom: 1px solid var(--border);
	}
	.qty {
		font-weight: 600;
		white-space: nowrap;
	}
	.steps {
		margin: 0;
		padding-left: 18px;
		display: grid;
		gap: 4px;
	}

	.option form {
		margin-top: auto;
		padding-top: 8px;
	}
	.button.small {
		min-height: 40px;
		padding: 0 14px;
		font-size: 0.875rem;
	}

	.callout {
		margin-top: 36px;
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
	.button.ghost {
		background: transparent;
		color: var(--callout-ink);
		border-color: rgb(251 250 247 / 0.4);
	}
</style>
