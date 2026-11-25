<script lang="ts">
	import type { Snippet } from 'svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';

	interface Props {
		title: string;
		subtitle?: string;
		/** Link to the parent page, shown to the left of the title. */
		back?: { href: string; label: string };
		/** Buttons on the right of the title (e.g. a "New …" button). */
		actions?: Snippet;
		/** Replaces the title heading (e.g. an inline editor); it must render its own <h1>. */
		titleContent?: Snippet;
	}
	let { title, subtitle, back, actions, titleContent }: Props = $props();
</script>

<header class="mb-6">
	<!-- min-h keeps the title at the same height whether or not there is an action button -->
	<div class="flex items-center justify-between gap-x-4 gap-y-2 flex-wrap min-h-10">
		<div class="flex items-center gap-3 min-w-0">
			{#if back}
				<a
					href={back.href}
					class="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
				>
					<CaretLeftSolid class="w-4 h-4 inline mr-1" />
					{back.label}
				</a>
			{/if}
			{#if titleContent}
				<div class="min-w-0 flex-1">{@render titleContent()}</div>
			{:else}
				<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0 break-words min-w-0">{title}</h1>
			{/if}
		</div>
		{#if actions}<div class="flex items-center justify-end gap-2 flex-wrap">{@render actions()}</div>{/if}
	</div>
	{#if subtitle}<p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0">{subtitle}</p>{/if}
</header>
