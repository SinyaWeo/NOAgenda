<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { CloseOutline } from 'flowbite-svelte-icons';
	import { t } from '#lib/i18n/index.js';

	interface Props {
		/** "A has to be finished before B starts" */
		label: string;
		/** The user may remove it (write access to the tasks it is stored on). */
		removable: boolean;
		onremove: () => void;
	}
	let { label, removable, onremove }: Props = $props();
</script>

<!-- The selected dependency on a mind map, with a way to remove it besides the Delete key. -->
<div
	class="flex items-center gap-3 max-w-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-md text-sm text-gray-700 dark:text-gray-200"
>
	<span class="min-w-0">{label}</span>
	{#if removable}
		<Button size="xs" color="light" class="shrink-0" onclick={onremove}>
			<CloseOutline class="w-3.5 h-3.5 me-1" />
			{t('views.dependency.removeDependency')}
		</Button>
	{/if}
</div>
