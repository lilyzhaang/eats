<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Switch person · Eats</title>
</svelte:head>

<main class="switch">
	<h1>Switch person</h1>
	<form method="POST" class="choices">
		{#each data.personas as persona (persona.id)}
			<button
				type="submit"
				name="persona"
				value={persona.id}
				class="button"
				class:primary={persona.id === data.currentId}
				aria-current={persona.id === data.currentId ? 'true' : undefined}
			>
				{persona.name}{persona.role === 'viewer' ? ' (viewing only)' : ''}
			</button>
		{/each}
	</form>
	<p><a href="/">Back</a></p>
</main>

<style>
	.switch {
		max-width: 420px;
		margin: 0 auto;
		padding: 48px 16px;
	}
	.choices {
		display: grid;
		gap: 12px;
		margin: 24px 0;
	}
</style>
