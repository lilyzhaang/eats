<!-- Cook: placeholder for the skeleton. The real screen is built in the next round. -->
<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Cook · Eats</title>
</svelte:head>

<p class="eyebrow">
	Prep-day plan{#if data.week}{' · '}Week of {data.week.label}{/if}
</p>
<h1>Four recipes, one flow.</h1>
<p class="muted">
	All four meals woven into one sequence, so the oven and burners are never sitting idle and the
	hands-on work happens while something else cooks.
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
