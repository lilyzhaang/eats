<!--
  The main tabs (Pick · Shop · Cook · Rate · Bank), with a pill that springs
  over to the tab you tap and an icon that gives a little bounce.

  variant="bottom": the phone tab bar along the bottom (icons + labels).
  variant="top":    the desktop tabs in the top bar (labels only).

  How springy it is comes from the motion settings (motion.svelte.ts).
-->
<script lang="ts">
	import { Spring } from 'svelte/motion';
	import Icon from './Icon.svelte';
	import { DEFAULTS, motion, reduced } from '#lib/motion.svelte.ts';

	type Tab = { href: string; label: string; icon: 'pick' | 'shop' | 'cook' | 'rate' | 'bank' };
	type Props = { tabs: readonly Tab[]; active: number; variant: 'top' | 'bottom' };
	let { tabs, active, variant }: Props = $props();

	let nav: HTMLElement | undefined = $state();
	const links: HTMLAnchorElement[] = $state([]);

	// Where the pill is (left edge and width, in pixels). It springs between tabs.
	// Starts with the defaults; the effect below keeps it in step with the sliders.
	const pill = new Spring(
		{ x: 0, w: 0 },
		{ stiffness: DEFAULTS.tabStiffness, damping: DEFAULTS.tabDamping }
	);

	// Follow the sliders live.
	$effect(() => {
		pill.stiffness = motion.tabStiffness;
		pill.damping = motion.tabDamping;
	});

	// Until the pill has measured itself (right after the page loads), the active
	// tab shows its own background so it never flashes blank.
	let placed = $state(false);
	function moveTo(index: number, instant: boolean) {
		const link = links[index];
		if (!link || link.offsetWidth === 0) return;
		pill.set({ x: link.offsetLeft, w: link.offsetWidth }, { instant: instant || reduced() });
		placed = true;
	}

	// The tab you just tapped. The pill heads there straight away, rather than
	// waiting for that page to load; once it has, `active` catches up.
	let tapped: number | null = $state(null);
	const shown = $derived(tapped ?? active);
	$effect(() => {
		void active; // whenever the page actually changes…
		tapped = null; // …stop overriding it.
	});
	function onTap(event: MouseEvent, index: number) {
		// Opening in a new tab or window doesn't change this page.
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
		tapped = index;
		// If the page never changes (e.g. the link was cancelled), let go after a bit.
		setTimeout(() => {
			if (tapped === index) tapped = null;
		}, 4000);
	}

	// Spring over whenever the shown tab changes (jump on first appearance).
	$effect(() => {
		moveTo(shown, !placed);
	});

	// Re-measure without animating if the bar changes size (rotation, resize,
	// or switching between the phone and desktop layouts).
	$effect(() => {
		if (!nav) return;
		const observer = new ResizeObserver(() => moveTo(shown, true));
		observer.observe(nav);
		return () => observer.disconnect();
	});
</script>

<nav
	bind:this={nav}
	class="tabs {variant}"
	class:measured={placed}
	aria-label="Main"
	style="--pop: {motion.tabIconPop}"
>
	<span
		class="pill"
		class:hidden={shown < 0}
		aria-hidden="true"
		style="transform: translateX({pill.current.x}px); width: {pill.current.w}px"
	></span>
	{#each tabs as tab, i (tab.href)}
		<a
			href={tab.href}
			bind:this={links[i]}
			aria-current={i === active ? 'page' : undefined}
			class:on={i === shown}
			onclick={(e) => onTap(e, i)}
		>
			{#if variant === 'bottom'}
				<span class="icon"><Icon name={tab.icon} /></span>
			{/if}
			<span>{tab.label}</span>
		</a>
	{/each}
</nav>

<style>
	.tabs {
		position: relative;
	}
	a {
		position: relative; /* above the pill */
		z-index: 1;
		text-decoration: none;
		font-weight: 600;
		color: var(--ink-secondary);
		transition: color 0.2s;
		-webkit-tap-highlight-color: transparent;
	}
	.pill {
		position: absolute;
		left: 0;
		border-radius: 999px;
		pointer-events: none;
		transition: opacity 0.2s;
	}
	.pill.hidden {
		opacity: 0;
	}

	/* ── Desktop: dark pill behind the label ── */
	.top {
		display: flex;
		gap: 4px;
	}
	.top a {
		padding: 10px 16px;
		border-radius: 999px;
	}
	.top a.on {
		color: var(--callout-ink);
	}
	.top:not(.measured) a.on {
		background: var(--ink);
	}
	.top .pill {
		top: 0;
		bottom: 0;
		background: var(--ink);
	}

	/* ── Phone: soft paprika pill behind icon + label ── */
	.bottom {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		padding: 6px 6px 0;
	}
	.bottom a {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 6px 0 8px;
		min-height: 52px;
		font-size: 0.75rem;
	}
	.bottom a.on {
		color: var(--accent);
	}
	.bottom:not(.measured) a.on {
		background: var(--tag-bank-bg);
		border-radius: 16px;
	}
	.bottom .pill {
		top: 6px;
		height: 52px;
		background: var(--tag-bank-bg);
		border-radius: 16px;
	}
	.icon {
		display: inline-flex;
	}
	/* The little bounce when a tab becomes active. */
	.bottom a.on .icon {
		animation: pop 0.45s cubic-bezier(0.3, 1.6, 0.5, 1);
	}
	@keyframes pop {
		0% {
			transform: scale(1);
		}
		40% {
			transform: scale(var(--pop)) translateY(-2px);
		}
		100% {
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bottom a.on .icon {
			animation: none;
		}
		.pill,
		a {
			transition: none;
		}
	}
</style>
