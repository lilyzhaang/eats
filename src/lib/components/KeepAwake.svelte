<!--
  "Keep screen on" switch for cook day. Stops the phone or laptop screen from
  dimming and locking while you follow the plan, so you don't have to keep
  waking it with messy hands.

  Uses the browser's Screen Wake Lock feature (Safari 16.4+, Chrome, Edge).
  The browser drops the lock when you switch away from the tab, so it's
  taken again automatically when you come back.
-->
<script lang="ts">
	let supported = $state(false);
	let on = $state(false);
	let lock: WakeLockSentinel | null = null;

	$effect(() => {
		supported = 'wakeLock' in navigator;
	});

	async function take() {
		try {
			lock = await navigator.wakeLock.request('screen');
			lock.addEventListener('release', () => {
				lock = null;
			});
		} catch {
			// e.g. battery saver is on; just show the switch as off.
			on = false;
		}
	}

	async function toggle() {
		on = !on;
		if (on) await take();
		else {
			await lock?.release();
			lock = null;
		}
	}

	// Coming back to the tab: take the lock again if the switch is on.
	function onVisibility() {
		if (on && !lock && document.visibilityState === 'visible') take();
	}

	// Leaving the page releases it.
	$effect(() => () => {
		lock?.release();
	});
</script>

<svelte:document onvisibilitychange={onVisibility} />

{#if supported}
	<button type="button" class="keep-awake" role="switch" aria-checked={on} onclick={toggle}>
		<span class="track" aria-hidden="true"><span class="thumb"></span></span>
		<span>
			<strong>Keep screen on</strong>
			<span class="hint"
				>{on
					? 'Your screen won’t sleep while this page is open.'
					: 'Stops the screen sleeping while you cook.'}</span
			>
		</span>
	</button>
{/if}

<style>
	.keep-awake {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 56px;
		padding: 10px 14px;
		margin: 12px 0 4px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.keep-awake > span:last-child {
		display: grid;
	}
	.hint {
		color: var(--ink-secondary);
		font-size: 0.875rem;
	}
	.track {
		flex: none;
		position: relative;
		width: 44px;
		height: 26px;
		border-radius: 999px;
		background: var(--border);
		transition: background 0.15s;
	}
	.thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--card);
		box-shadow: 0 1px 2px rgb(31 36 33 / 0.25);
		transition: transform 0.15s;
	}
	[aria-checked='true'] .track {
		background: var(--tag-hands-ink);
	}
	[aria-checked='true'] .thumb {
		transform: translateX(18px);
	}
	@media (prefers-reduced-motion: reduce) {
		.track,
		.thumb {
			transition: none;
		}
	}
</style>
