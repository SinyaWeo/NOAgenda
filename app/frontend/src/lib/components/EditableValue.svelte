<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { EditOutline } from 'flowbite-svelte-icons';

	/**
	 * A value that opens its editor when clicked (Details tab, Profile page). The pencil is always shown,
	 * so it reads as editable on touch screens too, where there is no hover.
	 */
	interface Props extends Omit<HTMLButtonAttributes, 'children' | 'type'> {
		children: Snippet;
		/** Layout of the value itself, e.g. `flex flex-wrap gap-2` for a list of labels. */
		contentClass?: string;
		/**
		 * Put the pencil inside that layout as its last item. For a wrapping list, so the pencil follows the
		 * last entry instead of sitting at the far edge of the widest line.
		 */
		pencilInside?: boolean;
		/** `lg` for a heading-sized value such as the name on the Profile page. */
		size?: 'sm' | 'lg';
	}
	let {
		children,
		class: cls = '',
		contentClass = '',
		pencilInside = false,
		size = 'sm',
		...rest
	}: Props = $props();
</script>

{#snippet pencil(align: string)}
	<EditOutline
		class="{size === 'lg'
			? 'w-4 h-4'
			: 'w-3.5 h-3.5'} shrink-0 {align} text-gray-400 dark:text-gray-500 group-hover/value:text-primary-600 dark:group-hover/value:text-primary-400"
		aria-hidden="true"
	/>
{/snippet}

<button
	type="button"
	class="group/value inline-flex items-baseline gap-1.5 max-w-full {size === 'lg'
		? 'text-xl font-bold'
		: 'text-sm'} text-left cursor-pointer bg-transparent border-0 p-0 focus:outline-hidden {cls}"
	{...rest}
>
	<span class="min-w-0 group-hover/value:underline group-focus-visible/value:underline {contentClass}">
		{@render children()}
		{#if pencilInside}{@render pencil('self-center')}{/if}
	</span>
	{#if !pencilInside}{@render pencil('')}{/if}
</button>
