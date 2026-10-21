<!--
  Simple line icons for the tab bar (no emoji, per the design brief).
  Usage: <Icon name="pick" />
-->
<script lang="ts">
	type Props = { name: 'pick' | 'shop' | 'cook' | 'rate' | 'bank'; size?: number };
	let { name, size = 22 }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === 'pick'}
		<!-- Menu card with a check -->
		<rect x="4" y="3" width="16" height="18" rx="2" />
		<path d="M8 12l2.5 2.5L16 9" />
	{:else if name === 'shop'}
		<!-- Shopping bag -->
		<path d="M5 8h14l-1 12H6L5 8z" />
		<path d="M9 8V6a3 3 0 0 1 6 0v2" />
	{:else if name === 'cook'}
		<!-- Pot with steam -->
		<path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-3z" />
		<path d="M2 11h20" />
		<path d="M9 7c0-1.5 1.5-1.5 1.5-3M14 7c0-1.5 1.5-1.5 1.5-3" />
	{:else if name === 'rate'}
		<!-- Star -->
		<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />
	{:else if name === 'bank'}
		<!-- Open recipe book -->
		<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
		<path d="M12 6.5v13" />
	{/if}
</svg>
