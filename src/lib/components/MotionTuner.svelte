<!--
  Motion tuner: sliders for every animation setting, applied live.
  Only shown on the dev copy (npm run dev), never on the live site.

  Tune, try it out with "Next tab" or by tapping tabs, then press
  "Copy settings" and paste the result to make it permanent.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		DEFAULTS,
		RANGES,
		motion,
		reduced,
		resetTuning,
		saveTuning,
		type MotionSettings
	} from '#lib/motion.svelte.ts';

	type Props = { tabs: readonly { href: string }[] };
	let { tabs }: Props = $props();

	let open = $state(false);
	let copied = $state(false);
	const keys = Object.keys(RANGES) as (keyof MotionSettings)[];

	function nextTab(step: number) {
		const current = tabs.findIndex((t) => page.url.pathname.startsWith(t.href));
		const next = (Math.max(current, 0) + step + tabs.length) % tabs.length;
		goto(tabs[next].href);
	}

	async function copy() {
		const changed = Object.fromEntries(keys.map((k) => [k, motion[k]]));
		await navigator.clipboard.writeText(JSON.stringify(changed, null, '\t'));
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	const isDefault = (k: keyof MotionSettings) => motion[k] === DEFAULTS[k];
</script>

<div class="tuner" class:open>
	{#if open}
		<section class="panel" aria-label="Motion tuner">
			<header>
				<strong>Motion</strong>
				<span class="dev">dev only</span>
				<button
					type="button"
					class="close"
					aria-label="Close motion tuner"
					onclick={() => (open = false)}>×</button
				>
			</header>

			{#if reduced()}
				<p class="warn">
					Your device asks for reduced motion, so animations are off. Turn off “Reduce motion” in
					your system settings to try these.
				</p>
			{/if}

			{#each keys as key (key)}
				{@const range = RANGES[key]}
				<label class="row">
					<span class="name">
						{range.label}
						{#if !isDefault(key)}<span class="changed" title="Changed from the default">•</span
							>{/if}
					</span>
					<output>{motion[key]}</output>
					<input
						type="range"
						min={range.min}
						max={range.max}
						step={range.step}
						bind:value={motion[key]}
						onchange={saveTuning}
					/>
				</label>
			{/each}

			<div class="actions">
				<button type="button" onclick={() => nextTab(-1)}>← Tab</button>
				<button type="button" onclick={() => nextTab(1)}>Tab →</button>
				<button type="button" onclick={resetTuning}>Reset</button>
				<button type="button" class="primary" onclick={copy}
					>{copied ? 'Copied' : 'Copy settings'}</button
				>
			</div>
		</section>
	{:else}
		<button type="button" class="launcher" onclick={() => (open = true)}>Motion</button>
	{/if}
</div>

<style>
	.tuner {
		position: fixed;
		right: 12px;
		bottom: calc(80px + env(safe-area-inset-bottom));
		z-index: 50;
		font-size: 0.8125rem;
	}
	@media (min-width: 768px) {
		.tuner {
			bottom: 16px;
		}
	}
	.launcher {
		min-height: 40px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px dashed var(--accent);
		background: var(--card);
		color: var(--accent);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 4px 14px rgb(31 36 33 / 0.12);
	}
	.panel {
		width: min(320px, calc(100vw - 24px));
		max-height: calc(100dvh - 140px);
		overflow: auto;
		padding: 12px 14px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: 0 10px 30px rgb(31 36 33 / 0.18);
	}
	header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
	}
	.dev {
		color: var(--accent);
		font-weight: 600;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.close {
		margin-left: auto;
		width: 32px;
		height: 32px;
		border: 0;
		background: none;
		font-size: 1.25rem;
		cursor: pointer;
		color: var(--ink-secondary);
	}
	.warn {
		background: var(--tag-bank-bg);
		color: var(--tag-bank-ink);
		padding: 8px 10px;
		border-radius: 8px;
		margin: 0 0 8px;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2px 8px;
		padding: 6px 0;
		border-bottom: 1px solid var(--border);
	}
	.name {
		font-weight: 600;
	}
	.changed {
		color: var(--accent);
	}
	output {
		font-variant-numeric: tabular-nums;
		color: var(--ink-secondary);
	}
	input[type='range'] {
		grid-column: 1 / -1;
		min-height: 28px;
		padding: 0;
		border: 0;
		background: none;
		accent-color: var(--accent);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
	}
	.actions button {
		flex: 1 1 auto;
		min-height: 36px;
		padding: 0 10px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--card);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.actions .primary {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--callout-ink);
	}
</style>
