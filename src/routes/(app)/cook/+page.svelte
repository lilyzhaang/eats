<!--
  Cook: all four recipes woven into one timeline, styled after the prep-plan mockup.
  Each step shows when to do it, what to do, which equipment it uses and
  which recipe it's for. Tap a step to check it off; you both see the ticks.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formatClock, formatDuration } from '#lib/format.ts';
	import type { Lane } from '#lib/server/prep-plan.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canCheck = $derived(data.user.role === 'owner');

	// While Claude is writing the plan, check back every 5 seconds.
	$effect(() => {
		if (data.reason !== 'writing') return;
		const timer = setInterval(() => invalidateAll(), 5000);
		return () => clearInterval(timer);
	});
	const done = $derived(data.plan?.steps.filter((s) => s.checkedBy).length ?? 0);

	const laneLabel: Record<Lane, string> = {
		oven: 'Oven',
		burner_1: 'Burner 1',
		burner_2: 'Burner 2',
		kettle: 'Kettle',
		hands: 'Hands'
	};
	// Color family per lane, matching the equipment tags in the design brief.
	const laneTone: Record<Lane, string> = {
		oven: 'oven',
		burner_1: 'burner',
		burner_2: 'burner',
		kettle: 'hands',
		hands: 'hands'
	};
</script>

<svelte:head>
	<title>Cook · Eats</title>
</svelte:head>

<p class="eyebrow">
	Prep-day plan{#if data.week}{' · '}Week of {data.week.label}{/if}
</p>

{#if data.plan}
	{@const plan = data.plan}
	<h1>Four recipes, one flow.</h1>
	<p class="muted intro">
		All four meals woven into one sequence, so the oven and burners are never sitting idle and the
		hands-on work happens while something else cooks.
	</p>

	<dl class="stats">
		{#if plan.totalMinutes}
			<div class="card">
				<dt>Total time</dt>
				<dd>~{formatDuration(plan.totalMinutes)}</dd>
			</div>
		{/if}
		{#if plan.ovenTempF}
			<div class="card">
				<dt>Oven</dt>
				<dd>
					{plan.ovenTempF}°F{#if plan.ovenMinutes}{' · '}{plan.ovenMinutes} min{/if}
				</dd>
			</div>
		{/if}
		{#if plan.burners}
			<div class="card">
				<dt>Burners</dt>
				<dd>{plan.burners}{plan.usesKettle ? ' + kettle' : ''}</dd>
			</div>
		{/if}
	</dl>

	<p class="progress muted" role="status">
		{done === plan.steps.length
			? 'All done. Time to pack up.'
			: `${done} of ${plan.steps.length} steps done`}
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
		<ol class="timeline">
			{#each plan.steps as step (step.id)}
				<li class:done={Boolean(step.checkedBy)}>
					<button
						type="submit"
						name="toggle"
						value="{step.id}:{step.checkedBy ? 0 : 1}"
						role="checkbox"
						aria-checked={Boolean(step.checkedBy)}
						class="step"
						disabled={!canCheck}
					>
						<span class="clock">{formatClock(step.clockMinute)}</span>
						<span class="body">
							<span class="instruction">{step.instruction}</span>
							{#if step.whyNote}<span class="why">{step.whyNote}</span>{/if}
							<span class="tags">
								{#each step.lanes as lane (lane)}
									<span class="tag lane {laneTone[lane]}">{laneLabel[lane] ?? lane}</span>
								{/each}
								{#if step.recipeLabel}<span class="recipe">{step.recipeLabel}</span>{/if}
							</span>
						</span>
						<span class="box" aria-hidden="true">
							{#if step.checkedBy}{step.checkedBy}{/if}
						</span>
					</button>
				</li>
			{/each}
		</ol>
	</form>
{:else if data.reason === 'writing'}
	<h1>Claude is planning your cook day…</h1>
	<p class="working muted" role="status">
		Weaving your four recipes into one timeline. This usually takes a minute or two, and this page
		updates by itself.
	</p>
{:else if data.reason === 'failed'}
	<h1>The plan didn’t come through.</h1>
	<p class="error" role="alert">{data.error}</p>
	{#if canCheck}
		<form method="POST" action="?/retry" use:enhance>
			<button type="submit" class="button primary">Try again</button>
		</form>
	{/if}
{:else if data.reason === 'picking'}
	<h1>Pick first, then cook.</h1>
	<p class="muted">The prep-day plan appears once you’ve both agreed on all four meals.</p>
	<a class="button primary" href="/pick">Go to Pick</a>
{:else}
	<h1>No plan yet.</h1>
	<p class="muted">
		Claude writes the prep-day plan once you lock in your picks. To turn that on, add your Claude
		API key to the <code>.env</code> file (<code>ANTHROPIC_API_KEY=</code>) and restart the app.
	</p>
{/if}

<style>
	.intro {
		max-width: 60ch;
	}
	.error {
		color: var(--accent);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin: 20px 0 8px;
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
		font-size: clamp(1rem, 4vw, 1.375rem);
	}

	.progress {
		margin: 12px 0 4px;
		font-size: 0.9375rem;
	}

	.timeline {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.timeline li {
		border-bottom: 1px solid var(--border);
	}
	.timeline li:last-child {
		border-bottom: 0;
	}

	/* Each step is one big tappable row */
	.step {
		display: grid;
		grid-template-columns: 3.25rem 1fr auto;
		gap: 12px;
		align-items: start;
		width: 100%;
		padding: 16px 0;
		background: none;
		border: 0;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.step:disabled {
		cursor: default;
	}
	.clock {
		font-family: var(--font-heading);
		font-weight: 800;
		font-size: 1.125rem;
	}
	.body {
		display: grid;
		gap: 6px;
	}
	.why {
		color: var(--ink-secondary);
		font-style: italic;
		font-size: 0.9375rem;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}
	.lane.oven {
		background: var(--tag-oven-bg);
		color: var(--tag-oven-ink);
	}
	.lane.burner {
		background: var(--tag-burner-bg);
		color: var(--tag-burner-ink);
	}
	.lane.hands {
		background: var(--tag-hands-bg);
		color: var(--tag-hands-ink);
	}
	.recipe {
		color: var(--ink-secondary);
		font-size: 0.875rem;
	}

	/* Check circle on the right; shows who checked it */
	.box {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border: 1.5px solid var(--ink-secondary);
		border-radius: 50%;
		font-size: 0.75rem;
		font-weight: 700;
	}
	li.done .box {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--callout-ink);
	}
	li.done .clock,
	li.done .instruction {
		color: var(--ink-secondary);
	}
	li.done .instruction {
		text-decoration: line-through;
	}
</style>
