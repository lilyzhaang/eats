<!-- Rate: placeholder for the skeleton. The real screen is built in the next round. -->
<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Rate · Eats</title>
</svelte:head>

<p class="eyebrow">
	Weekly debrief{#if data.week}{' · '}Week of {data.week.label}{/if}
</p>
<h1>Rate the week, shape the next one.</h1>
<p class="muted">
	Two minutes each. Anything you both rate highly joins your recipe bank and comes back as a
	favourite.
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
