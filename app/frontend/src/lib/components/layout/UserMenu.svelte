<script lang="ts">
	import { singleUserMode } from '#lib/appConfig.svelte.js';
	import type { Snippet } from 'svelte';
	import { authSession, patchCurrentUser } from '#lib/auth.svelte.js';
	import { t } from '#lib/i18n/index.js';
	import { apiGetAuth, apiPostAuth, API_BASE } from '#lib/api.js';
	import { isAdmin } from '#lib/roles.js';
	import type { Team, User } from '#lib/types.js';
	import { Avatar, Dropdown, DropdownItem, DropdownDivider, DropdownHeader } from 'flowbite-svelte';
	import {
		MoonOutline,
		SunOutline,
		UsersGroupOutline,
		CogOutline,
		ArrowRightToBracketOutline
	} from 'flowbite-svelte-icons';

	let { user, onlogout, children }: { user: User; onlogout: () => void | Promise<void>; children?: Snippet } =
		$props();

	let userTeams = $state<Team[]>([]);

	/** Resolve a backend-relative path to a full URL */
	function resolveUrl(path: string | undefined): string {
		if (!path) return '';
		if (path.startsWith('http')) return path;
		return `${API_BASE}${path}`;
	}

	function getInitials(u: User): string {
		const name: string = u.name ?? u.username ?? 'U';
		return name
			.split(' ')
			.map((w) => w[0] ?? '')
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	$effect(() => {
		void user.id;
		userTeams = [];
		if (singleUserMode.current) return;
		(async () => {
			try {
				userTeams = (await apiGetAuth<Team[]>('/teams')) ?? [];
			} catch (_) {
				userTeams = [];
			}
		})();
	});

	async function toggleTheme() {
		if (!authSession.user) return;
		const next = (authSession.user.theme ?? 'light') === 'light' ? 'dark' : 'light';
		patchCurrentUser({ theme: next });
		document.documentElement.classList.toggle('dark', next === 'dark');
		try {
			localStorage.setItem('theme', next);
		} catch (_) {}
		try {
			await apiPostAuth('/user/settings/general', { theme: next });
		} catch (_) {}
	}
</script>

<!-- Theme toggle -->
<button
	onclick={toggleTheme}
	title={t('layout.user.toggleThemeTitle')}
	aria-label={t('layout.user.toggleTheme')}
	class="bg-transparent border-0 cursor-pointer p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
>
	{#if (user.theme ?? 'light') === 'light'}
		<MoonOutline class="w-5 h-5" />
	{:else}
		<SunOutline class="w-5 h-5" />
	{/if}
</button>

<!-- Slot between the theme toggle and the avatar (the notifications bell) -->
{@render children?.()}

<!-- User menu -->
<button
	id="user-menu-btn"
	aria-label={t('layout.user.accountMenu')}
	class="bg-transparent border-0 cursor-pointer p-0 flex items-center rounded-full"
>
	{#if user.avatarUrl}
		<Avatar src={resolveUrl(user.avatarUrl)} size="sm" />
	{:else}
		<Avatar size="sm">{getInitials(user)}</Avatar>
	{/if}
</button>
<Dropdown triggeredBy="#user-menu-btn" placement="bottom-end" class="w-52">
	<DropdownHeader>
		<span class="block text-sm font-semibold text-gray-900 dark:text-white">
			{user.name ?? user.username}
		</span>
		<span class="block text-xs text-gray-500 dark:text-gray-400">@{user.username}</span>
		{#if isAdmin(user)}
			<span class="inline-block mt-1 text-xs font-medium tone-red">{t('layout.user.admin')}</span>
		{/if}
	</DropdownHeader>
	{#if userTeams.length > 0 && !singleUserMode.current}
		<DropdownItem href="/teams" class="flex items-center">
			<UsersGroupOutline class="w-4 h-4 mr-2" />{t('layout.user.teams')}
		</DropdownItem>
	{/if}
	<DropdownItem href="/user/settings" class="flex items-center">
		<CogOutline class="w-4 h-4 mr-2" />{t('layout.user.settings')}
	</DropdownItem>
	<DropdownDivider />
	<DropdownItem onclick={onlogout} class="flex items-center text-red-600 dark:text-red-400">
		<ArrowRightToBracketOutline class="w-4 h-4 mr-2" />{t('layout.user.logout')}
	</DropdownItem>
</Dropdown>
