<!--
  The app shell around Pick, Shop, Cook and Rate.
  Phones: tab bar along the bottom. Wider screens: the same links across the top.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import Icon from '#lib/components/Icon.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const tabs = [
		{ href: '/pick', label: 'Pick', icon: 'pick' },
		{ href: '/shop', label: 'Shop', icon: 'shop' },
		{ href: '/cook', label: 'Cook', icon: 'cook' },
		{ href: '/rate', label: 'Rate', icon: 'rate' }
	] as const;

	let menuOpen = $state(false);

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

		<nav class="desktop-tabs" aria-label="Main">
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={page.url.pathname.startsWith(tab.href) ? 'page' : undefined}
				>
					{tab.label}
				</a>
			{/each}
		</nav>

		<div class="who">
			{#if data.user.role === 'viewer'}
				<span class="viewing-only">Viewing only</span>
			{/if}
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
					<!-- Owner-passcode sessions can switch freely; viewer sessions sign in again. -->
					<a class="button" href={data.user.passcodeKind === 'owner' ? '/switch' : '/signin'}>
						Switch person
					</a>
					<form method="POST" action="/signout">
						<button type="submit" class="button">Sign out</button>
					</form>
				</div>
			{/if}
		</div>
	</header>

	<main class="content">
		{@render children()}
	</main>

	<nav class="bottom-tabs" aria-label="Main">
		{#each tabs as tab (tab.href)}
			<a href={tab.href} aria-current={page.url.pathname.startsWith(tab.href) ? 'page' : undefined}>
				<Icon name={tab.icon} />
				<span>{tab.label}</span>
			</a>
		{/each}
	</nav>
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

	.content {
		max-width: 760px;
		margin: 0 auto;
		/* Leave room at the bottom for the phone tab bar */
		padding: 24px 16px calc(96px + env(safe-area-inset-bottom));
	}

	/* Phone: tabs along the bottom */
	.bottom-tabs {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		background: var(--surface);
		border-top: 1px solid var(--border);
		padding-bottom: env(safe-area-inset-bottom);
	}
	.bottom-tabs a {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 8px 0 10px;
		min-height: 56px;
		color: var(--ink-secondary);
		text-decoration: none;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.bottom-tabs a[aria-current='page'] {
		color: var(--accent);
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
			display: flex;
			gap: 4px;
			margin-left: 16px;
		}
		.desktop-tabs a {
			padding: 10px 16px;
			border-radius: 999px;
			color: var(--ink-secondary);
			text-decoration: none;
			font-weight: 600;
		}
		.desktop-tabs a[aria-current='page'] {
			background: var(--ink);
			color: var(--callout-ink);
		}
		.content {
			padding-bottom: 48px;
		}
	}
</style>
