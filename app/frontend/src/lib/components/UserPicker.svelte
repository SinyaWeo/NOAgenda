<script lang="ts">
	import { apiGetAuth, API_BASE } from '$lib/api';
	import type { UserSummary } from '$lib/types';
	import { t } from '$lib/i18n';

	let {
		id = 'user-picker',
		label,
		selected = $bindable<UserSummary | null>(null),
		excludeIds = [],
		onselect
	}: {
		id?: string;
		/** Visible label; defaults to a translated "Find a user". */
		label?: string;
		/** The user the person picked (null until one is chosen). */
		selected?: UserSummary | null;
		/** Users to hide from the results (e.g. existing members). */
		excludeIds?: number[];
		onselect?: (user: UserSummary) => void;
	} = $props();

	const MIN_CHARS = 3;
	const DEBOUNCE_MS = 300;

	let query = $state('');
	let results = $state<UserSummary[]>([]);
	let searching = $state(false);
	let failed = $state(false);
	let searchedFor = $state('');
	let open = $state(false);
	let active = $state(-1);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let seq = 0;

	const trimmed = $derived(query.trim());
	const shown = $derived(results.filter((u) => !excludeIds.includes(u.id)));
	const tooShort = $derived(trimmed.length < MIN_CHARS);
	const labelText = $derived(label ?? $t('projects.userPicker.label'));
	const listId = $derived(`${id}-listbox`);

	function resolveUrl(path: string): string {
		return path.startsWith('http') ? path : `${API_BASE}${path}`;
	}
	function initials(u: UserSummary): string {
		return (u.name || u.username || 'U')
			.split(' ')
			.map((w) => w[0] ?? '')
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	async function search(q: string) {
		const mine = ++seq;
		searching = true;
		failed = false;
		try {
			const found = await apiGetAuth<UserSummary[]>(`/users?q=${encodeURIComponent(q)}`);
			if (mine !== seq) return; // a newer search superseded this one
			results = found;
			searchedFor = q;
			active = -1;
		} catch {
			if (mine !== seq) return;
			results = [];
			failed = true;
			searchedFor = q;
		} finally {
			if (mine === seq) searching = false;
		}
	}

	function oninput() {
		selected = null;
		clearTimeout(timer);
		seq++; // drop any response still in flight for the previous text
		if (trimmed.length < MIN_CHARS) {
			results = [];
			searching = false;
			searchedFor = '';
			failed = false;
			active = -1;
			return;
		}
		open = true;
		searching = true;
		const q = trimmed;
		timer = setTimeout(() => search(q), DEBOUNCE_MS);
	}

	function pick(u: UserSummary) {
		selected = u;
		query = u.name ? `${u.name} (${u.username})` : u.username;
		open = false;
		results = [];
		searchedFor = '';
		seq++;
		onselect?.(u);
	}

	/** Called by the parent after it consumed the selection. */
	export function reset() {
		clearTimeout(timer);
		seq++;
		query = '';
		results = [];
		selected = null;
		searching = false;
		searchedFor = '';
		failed = false;
		open = false;
		active = -1;
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			if (!shown.length) return;
			e.preventDefault();
			open = true;
			active = (active + 1) % shown.length;
		} else if (e.key === 'ArrowUp') {
			if (!shown.length) return;
			e.preventDefault();
			open = true;
			active = active <= 0 ? shown.length - 1 : active - 1;
		} else if (e.key === 'Enter') {
			if (open && active >= 0 && shown[active]) {
				e.preventDefault();
				pick(shown[active]);
			}
		} else if (e.key === 'Escape') {
			open = false;
		}
	}

	function onfocusout(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (!next || !(e.currentTarget as HTMLElement).contains(next)) open = false;
	}

	const showList = $derived(open && !tooShort && !searching && !failed && shown.length > 0);
	const showEmpty = $derived(
		open && !tooShort && !searching && !failed && searchedFor === trimmed && shown.length === 0
	);
</script>

<div class="relative flex-1 min-w-48" {onfocusout}>
	<label for={id} class="block mb-1 text-sm font-medium text-gray-900 dark:text-gray-300">{labelText}</label>
	<input
		{id}
		type="text"
		role="combobox"
		autocomplete="off"
		aria-autocomplete="list"
		aria-expanded={showList}
		aria-controls={listId}
		aria-activedescendant={active >= 0 ? `${id}-opt-${shown[active]?.id}` : undefined}
		aria-describedby="{id}-hint"
		bind:value={query}
		{oninput}
		{onkeydown}
		onfocus={() => (open = true)}
		placeholder={$t('projects.userPicker.placeholder')}
		class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
	/>
	<p id="{id}-hint" class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0" role="status">
		{#if selected}
			{$t('projects.userPicker.selected', { name: selected.name || selected.username })}
		{:else if tooShort}
			{$t('projects.userPicker.tooShort', { min: MIN_CHARS })}
		{:else if searching}
			{$t('projects.userPicker.searching')}
		{:else if failed}
			{$t('projects.userPicker.failed')}
		{:else if showEmpty}
			{$t('projects.userPicker.noMatches')}
		{:else}
			{$t('projects.userPicker.pick')}
		{/if}
	</p>
	<ul
		id={listId}
		role="listbox"
		aria-label={$t('projects.userPicker.results', { label: labelText })}
		class="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 p-0 list-none"
		hidden={!showList}
	>
		{#each shown as u, i (u.id)}
			<li
				id="{id}-opt-{u.id}"
				role="option"
				aria-selected={active === i}
				class="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm {active === i
					? 'bg-primary-50 dark:bg-gray-700'
					: 'hover:bg-gray-50 dark:hover:bg-gray-700'}"
				onmousedown={(e) => {
					e.preventDefault();
					pick(u);
				}}
			>
				{#if u.avatarUrl}
					<img src={resolveUrl(u.avatarUrl)} alt="" class="w-7 h-7 rounded-full object-cover shrink-0" />
				{:else}
					<span
						class="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 shrink-0"
						aria-hidden="true">{initials(u)}</span
					>
				{/if}
				<span class="font-medium text-gray-900 dark:text-white">{u.username}</span>
				{#if u.name}<span class="text-gray-500 dark:text-gray-400">{u.name}</span>{/if}
			</li>
		{/each}
	</ul>
</div>
