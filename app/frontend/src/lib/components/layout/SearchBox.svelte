<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import { apiGetAuth } from '$lib/api';
	import type { SearchResults } from '$lib/types';
	import { CheckCircleOutline, FolderOutline, SearchOutline } from 'flowbite-svelte-icons';

	interface SearchOption {
		id: string;
		href: string;
		label: string;
		kind: 'task' | 'project';
	}

	const LISTBOX_ID = 'search-listbox';

	let container: HTMLDivElement | undefined = $state();
	let query = $state('');
	let results = $state<SearchResults | null>(null);
	let open = $state(false);
	let activeIndex = $state(-1);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let seq = 0; // answers to older keystrokes must not overwrite newer ones

	const taskOptions = $derived<SearchOption[]>(
		(results?.tasks ?? []).map((t) => ({
			id: `search-opt-task-${t.id}`,
			href: `/tasks/${t.id}`,
			label: t.title ?? t.name ?? '',
			kind: 'task'
		}))
	);
	const projectOptions = $derived<SearchOption[]>(
		(results?.projects ?? []).map((p) => ({
			id: `search-opt-project-${p.id}`,
			href: `/projects/${p.id}`,
			label: p.name ?? p.title ?? '',
			kind: 'project'
		}))
	);
	const options = $derived([...taskOptions, ...projectOptions]);
	const expanded = $derived(open && results !== null && options.length > 0);
	const activeId = $derived(expanded && activeIndex >= 0 ? options[activeIndex]?.id : undefined);

	function close() {
		open = false;
		activeIndex = -1;
	}

	// Close when navigating (including picking a result).
	$effect(() => {
		void page.url.pathname;
		close();
	});

	onMount(() => () => clearTimeout(timer));

	function onInput(e: Event) {
		const q = (e.target as HTMLInputElement).value;
		query = q;
		clearTimeout(timer);
		seq++; // also invalidates a request that is already in flight
		if (!q.trim()) {
			results = null;
			close();
			return;
		}
		const mySeq = ++seq;
		timer = setTimeout(async () => {
			try {
				const result = await apiGetAuth<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
				if (mySeq !== seq) return; // a newer search superseded this one
				results = result;
				activeIndex = -1;
				open = result.tasks.length + result.projects.length > 0;
			} catch (_) {}
		}, 300);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			if (options.length === 0) return;
			e.preventDefault();
			if (!open) {
				open = true;
				activeIndex = e.key === 'ArrowDown' ? 0 : options.length - 1;
				return;
			}
			const step = e.key === 'ArrowDown' ? 1 : -1;
			activeIndex = (activeIndex + step + options.length) % options.length;
		} else if (e.key === 'Enter') {
			const opt = expanded && activeIndex >= 0 ? options[activeIndex] : undefined;
			if (opt) {
				e.preventDefault();
				void goto(opt.href);
			}
		} else if (e.key === 'Escape') {
			close();
		}
	}

	$effect(() => {
		if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
	});
</script>

<!-- Outside click / Escape close the dropdown. -->
<svelte:window
	onclick={(e) => {
		if (container && !container.contains(e.target as Node)) close();
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') close();
	}}
/>

<div class="relative flex-1 max-w-sm" bind:this={container}>
	<div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
		<SearchOutline class="w-4 h-4 text-gray-400" />
	</div>
	<input
		type="search"
		role="combobox"
		aria-expanded={expanded}
		aria-controls={expanded ? LISTBOX_ID : undefined}
		aria-activedescendant={activeId}
		aria-autocomplete="list"
		aria-haspopup="listbox"
		autocomplete="off"
		class="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:border-primary-500 dark:focus:border-primary-400"
		placeholder={$t('layout.search.placeholder')}
		aria-label={$t('layout.search.label')}
		value={query}
		oninput={onInput}
		onkeydown={onKeydown}
		onfocus={() => {
			if (results) open = true;
		}}
	/>
	{#if expanded}
		<div
			id={LISTBOX_ID}
			role="listbox"
			aria-label={$t('layout.search.results')}
			class="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[300] max-h-80 overflow-y-auto"
		>
			{#each [{ key: 'tasks', title: $t('layout.search.tasks'), items: taskOptions }, { key: 'projects', title: $t('layout.search.projects'), items: projectOptions }] as group (group.key)}
				{#if group.items.length > 0}
					<div
						role="presentation"
						class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide"
					>
						{group.title}
					</div>
					{#each group.items as opt (opt.id)}
						<a
							id={opt.id}
							role="option"
							aria-selected={options[activeIndex]?.id === opt.id}
							href={opt.href}
							class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 no-underline {options[
								activeIndex
							]?.id === opt.id
								? 'bg-gray-100 dark:bg-gray-700'
								: ''}"
							onclick={close}
						>
							{#if opt.kind === 'task'}
								<CheckCircleOutline class="w-4 h-4 shrink-0" />
							{:else}
								<FolderOutline class="w-4 h-4 shrink-0" />
							{/if}
							{opt.label}
						</a>
					{/each}
				{/if}
			{/each}
		</div>
	{/if}
</div>
