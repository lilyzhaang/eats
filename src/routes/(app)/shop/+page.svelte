<!-- Shop: placeholder for the skeleton. The real screen is built in the next round. -->
<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Shop · Eats</title>
</svelte:head>

<p class="eyebrow">
	Grocery list{#if data.week}{' · '}Week of {data.week.label}{/if}
</p>
<h1>Here’s the haul.</h1>
<p class="muted">
	Everything for your four picks, with shared ingredients added up and sorted by aisle. Pantry
	staples are at the bottom, so you can cross off what you already have.
</p>

<div class="callout">
	<h3>Coming next</h3>
	<p>This screen is a placeholder while the app’s foundations go in.</p>
</div>

<style>
	.callout {
		margin-top: 24px;
	}
	.callout p {
		margin: 0;
	}
</style>
