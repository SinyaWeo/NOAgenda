<script lang="ts">
	// App logo, generated from src/assets/logo.png by scripts/generate-icons.sh.
	// Two variants: the original blue for light mode, recoloured to the dark-mode primary for dark mode.
	let { size = 28, alt = '' }: { size?: number; alt?: string } = $props();
</script>

<span class="inline-flex shrink-0" style="width: {size}px; height: {size}px">
	<img src="/logo-light.png" {alt} width={size} height={size} class="block dark:hidden" />
	<img src="/logo-dark.png" {alt} width={size} height={size} class="hidden dark:block" />
</span>
