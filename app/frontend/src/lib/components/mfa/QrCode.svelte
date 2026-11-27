<script lang="ts">
	import { encode } from 'uqr';

	let { value, label }: { value: string; label: string } = $props();

	const qr = $derived(encode(value, { border: 2 }));
	/** One path for all dark modules: each is a 1x1 square. */
	const path = $derived(
		qr.data.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ''))).join('')
	);
</script>

<!-- Always dark on white, whatever the theme: that is what scanners read best. -->
<svg
	viewBox="0 0 {qr.size} {qr.size}"
	role="img"
	aria-label={label}
	class="w-48 h-48 rounded"
	shape-rendering="crispEdges"
>
	<rect width={qr.size} height={qr.size} fill="#ffffff" />
	<path d={path} fill="#000000" />
</svg>
