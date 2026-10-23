<!--
  The app shell around Pick, Shop, Cook, Rate and Bank.
  Phones: tab bar along the bottom. Wider screens: the same links across the top.
  Switching tabs springs the tab pill over and slides the page in from the
  side you're heading toward (see motion.svelte.ts for the settings).
-->
<script lang="ts">
	import { dev } from '$app/env';
	import { page } from '$app/state';
	import { beforeNavigate, invalidateAll } from '$app/navigation';
	import MotionTuner from '#lib/components/MotionTuner.svelte';
	import TabBar from '#lib/components/TabBar.svelte';
	import { loadTuning } from '#lib/motion.svelte.ts';
	import { pageIn, pageOut } from '#lib/page-transition.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const tabs = [
		{ href: '/pick', label: 'Pick', icon: 'pick' },
		{ href: '/shop', label: 'Shop', icon: 'shop' },
		{ href: '/cook', label: 'Cook', icon: 'cook' },
		{ href: '/rate', label: 'Rate', icon: 'rate' },
		{ href: '/bank', label: 'Bank', icon: 'bank' }
	] as const;

	let menuOpen = $state(false);

	/** Which tab a path belongs to (-1 for pages outside the tabs, like Review). */
	const tabIndex = (path: string | undefined) =>
		path ? tabs.findIndex((t) => path === t.href || path.startsWith(t.href + '/')) : -1;
	const active = $derived(tabIndex(page.url.pathname));

	// Which way pages slide: toward the tab you're going to, and "forward"
	// when going deeper within a tab (Bank → a recipe).
	let direction = $state(1);
	beforeNavigate(({ from, to }) => {
		const a = tabIndex(from?.url.pathname);
		const b = tabIndex(to?.url.pathname);
		if (a !== b) direction = b > a ? 1 : -1;
		else direction = (to?.url.pathname.length ?? 0) >= (from?.url.pathname.length ?? 0) ? 1 : -1;
		menuOpen = false;
	});

	// On the dev copy, pick up any values saved from the Motion tuner.
	$effect(() => {
		if (dev) loadTuning();
	});

	// When you come back to the app (switch tabs, unlock your phone), reload the
	// data so you see what the other person picked or checked off meanwhile.
	function refreshIfVisible() {
		if (document.visibilityState === 'visible') invalidateAll();
	}
</script>

<svelte:document onvisibilitychange={refreshIfVisible} />

<div class="shell">
	<header class="topbar">
		<a href="/pick" class="brand">Eats</a>

		<div class="desktop-tabs">
			<TabBar {tabs} {active} variant="top" />
		</div>

		<div class="who">
			{#if !data.user.signedIn}
				<!-- Visitors can look around; Lily and Andrei sign in to make changes. -->
				<span class="viewing-only">Viewing only</span>
				<a class="button sign-in" href="/signin?next={encodeURIComponent(page.url.pathname)}"
					>Sign in</a
				>
			{:else}
				<button
					type="button"
					class="avatar"
					aria-haspopup="true"
					aria-expanded={menuOpen}
					onclick={() => (menuOpen = !menuOpen)}
				>
					<span aria-hidden="true">{data.user.initials}</span>
					<span class="visually-hidden">Signed in as {data.user.name}. Open menu</span>
				</button>
				{#if menuOpen}
					<div class="menu card">
						<p class="muted">Signed in as <strong>{data.user.name}</strong></p>
						<a class="button" href="/switch" onclick={() => (menuOpen = false)}>Switch person</a>
						<form method="POST" action="/signout">
							<button type="submit" class="button">Sign out</button>
						</form>
					</div>
				{/if}
			{/if}
		</div>
	</header>

	<main class="content">
		{#if data.draftLabel && !page.url.pathname.startsWith('/review')}
			<a class="draft-banner" href="/review">
				<strong>Next week’s menu is ready.</strong>
				<span>Claude’s picks for the week of {data.draftLabel} are waiting for your review →</span>
			</a>
		{/if}
		<!-- Old and new pages overlap here for a moment while one slides out and the other in. -->
		<div class="stage">
			{#key page.url.pathname}
				<div class="page" in:pageIn={{ dir: direction }} out:pageOut={{ dir: direction }}>
					{@render children()}
				</div>
			{/key}
		</div>
	</main>

	<div class="bottom-tabs">
		<TabBar {tabs} {active} variant="bottom" />
	</div>

	{#if dev}
		<MotionTuner {tabs} />
	{/if}
</div>

<style>
	.shell {
		min-height: 100dvh;
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 10px 16px;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}
	.brand {
		font-family: var(--font-heading);
		font-weight: 800;
		font-size: 1.375rem;
		color: var(--ink);
		text-decoration: none;
	}

	.who {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 10px;
		position: relative;
	}
	.viewing-only {
		background: var(--tag-ai-bg);
		color: var(--tag-ai-ink);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 999px;
	}
	.sign-in {
		min-height: 40px;
		padding: 0 16px;
	}
	.avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--card);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.menu {
		position: absolute;
		right: 0;
		top: 52px;
		width: 220px;
		padding: 14px;
		display: grid;
		gap: 8px;
		box-shadow: 0 8px 24px rgb(31 36 33 / 0.12);
	}
	.menu p {
		margin: 0 0 4px;
	}
	.menu .button,
	.menu form button {
		width: 100%;
	}

	.draft-banner {
		display: grid;
		gap: 2px;
		margin-bottom: 24px;
		padding: 14px 16px;
		border-radius: var(--radius);
		background: var(--callout-bg);
		color: var(--callout-ink);
		text-decoration: none;
	}
	.draft-banner span {
		opacity: 0.85;
		font-size: 0.9375rem;
	}

	.content {
		max-width: 760px;
		margin: 0 auto;
		/* Leave room at the bottom for the phone tab bar */
		padding: 24px 16px calc(96px + env(safe-area-inset-bottom));
	}

	.stage {
		display: grid;
	}
	.page {
		/* Both pages sit in the same spot while they cross over. */
		grid-area: 1 / 1;
		min-width: 0;
		transform-origin: 50% 0;
	}

	/* Phone: tabs along the bottom */
	.bottom-tabs {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 10;
		background: var(--surface);
		border-top: 1px solid var(--border);
		padding-bottom: env(safe-area-inset-bottom);
	}

	.desktop-tabs {
		display: none;
	}

	/* Wider screens: tabs move up into the top bar */
	@media (min-width: 768px) {
		.bottom-tabs {
			display: none;
		}
		.desktop-tabs {
			display: block;
			margin-left: 16px;
		}
		.content {
			padding-bottom: 48px;
		}
	}
	/* Keep the sliding pages from making the window scroll sideways. */
	.shell {
		overflow-x: clip;
	}
</style>
