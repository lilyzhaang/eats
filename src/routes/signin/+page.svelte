<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Sign in · Eats</title>
</svelte:head>

<main class="signin">
	<p class="eyebrow">Eats · Meal prep for two</p>
	<h1>Who’s cooking?</h1>

	{#if data.signedInAs}
		<p class="muted">You’re signed in as {data.signedInAs}. Sign in again to switch.</p>
	{/if}

	{#if !data.configured}
		<p class="notice" role="alert">
			Passcodes aren’t set up yet. Copy <code>.env.example</code> to <code>.env</code> and fill in
			<code>OWNER_PASSCODE</code> and <code>VIEWER_PASSCODE</code>, then restart the app.
		</p>
	{/if}

	<form method="POST" class="card">
		<input type="hidden" name="next" value={data.next} />

		<label for="persona">Who are you?</label>
		<select id="persona" name="persona" required>
			{#each data.personas as persona (persona.id)}
				<option value={persona.id} selected={form?.personaId === persona.id}>
					{persona.name}{persona.role === 'viewer' ? ' (viewing only)' : ''}
				</option>
			{/each}
		</select>

		<label for="passcode">Passcode</label>
		<input id="passcode" name="passcode" type="password" autocomplete="current-password" required />

		{#if form?.message}
			<p class="error" role="alert">{form.message}</p>
		{/if}

		<button type="submit" class="button primary">Sign in</button>
		<p class="muted small">This device will stay signed in.</p>
	</form>
</main>

<style>
	.signin {
		max-width: 420px;
		margin: 0 auto;
		padding: 48px 16px;
	}
	h1 {
		margin-bottom: 24px;
	}
	form {
		display: grid;
		gap: 8px;
		padding: 20px;
	}
	label {
		font-weight: 600;
		margin-top: 8px;
	}
	.button {
		margin-top: 16px;
	}
	.error {
		color: var(--accent);
		margin: 4px 0 0;
	}
	.notice {
		background: var(--tag-bank-bg);
		color: var(--tag-bank-ink);
		padding: 12px 14px;
		border-radius: var(--radius);
	}
	.small {
		font-size: 0.875rem;
		margin: 4px 0 0;
		text-align: center;
	}
</style>
