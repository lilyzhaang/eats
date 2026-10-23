<!--
  "Next week" at the bottom of Pick (owners only): the one place to ask
  Claude for next week's menu, or to get to it once it's written.
-->
<script lang="ts">
	type Status = {
		claudeReady: boolean;
		nextWeekLabel: string;
		hasDraft: boolean;
		working: boolean;
		lastError: string | null;
		waitingOn: string | null;
		rateFirst: { label: string; done: number; total: number } | null;
	};
	let { status }: { status: Status } = $props();
</script>

<section class="next-week card" aria-labelledby="next-week-title">
	<p class="eyebrow">Next week · Week of {status.nextWeekLabel}</p>

	{#if status.hasDraft}
		<h2 id="next-week-title">Claude’s menu is ready.</h2>
		<p class="muted">Look it over, swap anything you don’t fancy, then approve it for picking.</p>
		<a class="button primary" href="/review">Review next week’s menu</a>
	{:else if status.working}
		<h2 id="next-week-title">Claude is writing next week’s menu…</h2>
		<p class="muted">It usually takes a few minutes.</p>
		<a class="button" href="/review">Watch it arrive</a>
	{:else if status.waitingOn}
		<h2 id="next-week-title">Finish picking this week first.</h2>
		<p class="muted">
			Once you’ve both locked in your picks for the week of {status.waitingOn}, you can ask Claude
			for the next one here.
		</p>
	{:else if status.claudeReady}
		<h2 id="next-week-title">Ready for next week?</h2>
		{#if status.rateFirst}
			<p class="nudge">
				Rate the week of {status.rateFirst.label} first, so Claude can learn from it ({status
					.rateFirst.done} of {status.rateFirst.total} ratings done).
				<a href="/rate">Rate it</a>
			</p>
		{/if}
		<p class="muted">
			Claude writes a fresh menu from your ratings, tweaks and cravings. You review it before it
			shows up here.
		</p>
		{#if status.lastError}
			<p class="error" role="alert">The last attempt didn’t work: {status.lastError}</p>
		{/if}
		<form method="POST" action="/review?/generate">
			<button type="submit" class="button primary">Write next week’s menu</button>
		</form>
		<p class="muted small">Takes a few minutes and uses a little Claude API credit.</p>
	{:else}
		<h2 id="next-week-title">Next week’s menu</h2>
		<p class="muted">
			To have Claude write menus, add your Claude API key to the server’s settings.
		</p>
	{/if}
</section>

<style>
	.next-week {
		margin-top: 28px;
		padding: 20px;
	}
	h2 {
		font-size: 1.25rem;
	}
	p {
		margin: 0 0 12px;
	}
	.small {
		font-size: 0.875rem;
		margin: 10px 0 0;
	}
	.error {
		color: var(--accent);
	}
	.nudge {
		background: var(--tag-bank-bg);
		color: var(--tag-bank-ink);
		padding: 10px 14px;
		border-radius: 10px;
	}
	.nudge a {
		font-weight: 600;
	}
</style>
