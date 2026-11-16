<script lang="ts">
	import type { Snippet } from 'svelte';
	import { authSession } from '$lib/auth';
	import { apiGetAuth, apiPostAuth, API_BASE } from '$lib/api';
	import { isAdmin } from '$lib/roles';
	import type { Team, User } from '$lib/types';
	import { Avatar, Dropdown, DropdownItem, DropdownDivider, DropdownHeader } from 'flowbite-svelte';
	import {
		MoonOutline,
		SunOutline,
		UserCircleOutline,
		UsersGroupOutline,
		CogOutline,
		ArrowRightToBracketOutline,
	} from 'flowbite-svelte-icons';

	let {
		user,
		onlogout,
		children,
	}: { user: User; onlogout: () => void | Promise<void>; children?: Snippet } = $props();

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
		(async () => {
			try {
				userTeams = (await apiGetAuth<Team[]>('/teams')) ?? [];
			} catch (_) {
				userTeams = [];
			}
		})();
	});

	async function toggleTheme() {
		if (!$authSession.user) return;
		const next = ($authSession.user.theme ?? 'light') === 'light' ? 'dark' : 'light';
		authSession.update((session) => ({
			...session,
			user: session.user ? { ...session.user, theme: next } : session.user,
		}));
		document.documentElement.classList.toggle('dark', next === 'dark');
		try { localStorage.setItem('theme', next); } catch (_) {}
		try {
			await apiPostAuth('/user/settings/general', { theme: next });
		} catch (_) {}
	}
</script>

<!-- Theme toggle -->
<button
	onclick={toggleTheme}
	title="Toggle theme"
	aria-label="Toggle light/dark theme"
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
	aria-label="Account menu"
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
		<span class="block text-sm font-semibold text-gray-900 dark:text-white"
			>{user.name ?? user.username}</span
		>
		<span class="block text-xs text-gray-500">@{user.username}</span>
		{#if isAdmin(user)}
			<span
				class="inline-block mt-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded"
				>Admin</span
			>
		{/if}
	</DropdownHeader>
	<DropdownItem href="/user/profile" class="flex items-center">
		<UserCircleOutline class="w-4 h-4 mr-2" />Profile
	</DropdownItem>
	{#if userTeams.length > 0}
		<DropdownItem href="/teams" class="flex items-center">
			<UsersGroupOutline class="w-4 h-4 mr-2" />Teams
		</DropdownItem>
	{/if}
	<DropdownItem href="/user/settings" class="flex items-center">
		<CogOutline class="w-4 h-4 mr-2" />Settings
	</DropdownItem>
	<DropdownItem href="/terms" class="flex items-center text-xs text-gray-500">
		Terms of Service
	</DropdownItem>
	<DropdownItem href="/privacy" class="flex items-center text-xs text-gray-500">
		Privacy Policy
	</DropdownItem>
	<DropdownDivider />
	<DropdownItem onclick={onlogout} class="flex items-center text-red-600 dark:text-red-400"
		><ArrowRightToBracketOutline class="w-4 h-4 mr-2" />Logout
	</DropdownItem>
</Dropdown>
