<script lang="ts">
	import '../assets/app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { getCurrentUser } from '$lib/auth';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiGetAuth, apiPostAuth, clearToken, API_BASE } from '$lib/api';
	import {
		Avatar,
		Badge,
		Dropdown,
		DropdownItem,
		DropdownDivider,
		DropdownHeader,
	} from 'flowbite-svelte';
	import {
		HomeOutline,
		HomeSolid,
		FolderOutline,
		FolderSolid,
		CheckCircleOutline,
		CheckCircleSolid,
		CalendarMonthOutline,
		UsersGroupOutline,
		TagOutline,
		FilterOutline,
		InfoCircleOutline,
		ChevronRightOutline,
		ChevronLeftOutline,
		MoonOutline,
		SunOutline,
		UserCircleOutline,
		CogOutline,
		PlusOutline,
		BellOutline,
		ArrowRightToBracketOutline,
		SearchOutline,
	} from 'flowbite-svelte-icons';

	/** Resolve a backend-relative path to a full URL */
	function resolveUrl(path: string | undefined): string {
		if (!path) return '';
		if (path.startsWith('http')) return path;
		return `${API_BASE}${path}`;
	}

	let { children } = $props();

	const user = writable<any>(null);
	const notifications = writable<any[]>([]);
	const unreadCount = writable(0);
	const userTeams = writable<any[]>([]);
	const sidebarCollapsed = writable(false);
	const searchResults = writable<{ tasks: any[]; projects: any[] } | null>(null);

	let showSearch = $state(false);
	let searchQuery = $state('');
	let searchTimer: ReturnType<typeof setTimeout>;

	onMount(() => {
		if (localStorage.getItem('nav-collapsed') === 'true')
			sidebarCollapsed.set(true);

		getCurrentUser().then((me) => {
			user.set(me);
			if (me) {
				loadNotifications();
				loadTeams();
				document.documentElement.classList.toggle(
					'dark',
					(me.theme ?? 'light') === 'dark',
				);
			}
		});
	});

	async function loadNotifications() {
		try {
			const list = await apiGetAuth<any[]>('/notifications');
			notifications.set(list);
			unreadCount.set(list.filter((n: any) => !n.read).length);
		} catch (_) {}
	}

	async function loadTeams() {
		try {
			const teams = await apiGetAuth<any[]>('/teams');
			userTeams.set(teams ?? []);
		} catch (_) { userTeams.set([]); }
	}

	async function markAllRead() {
		try {
			await apiPostAuth('/notifications/read/all', {});
			await loadNotifications();
		} catch (_) {}
	}

	function logout() {
		clearToken();
		goto('/login');
	}

	function isActive(path: string): boolean {
		return $page.url.pathname.startsWith(path);
	}

	function getInitials(u: any): string {
		const name: string = u.name ?? u.username ?? 'U';
		return name.split(' ').map((w: string) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
	}

	function toggleSidebar() {
		sidebarCollapsed.update((v) => {
			localStorage.setItem('nav-collapsed', String(!v));
			return !v;
		});
	}

	async function toggleTheme() {
		if (!$user) return;
		const next = ($user.theme ?? 'light') === 'light' ? 'dark' : 'light';
		user.update((u) => ({ ...u, theme: next }));
		document.documentElement.classList.toggle('dark', next === 'dark');
		try {
			await apiPostAuth('/user/settings/general', { theme: next });
		} catch (_) {}
	}

	function onSearchInput(e: Event) {
		const q = (e.target as HTMLInputElement).value;
		searchQuery = q;
		clearTimeout(searchTimer);
		if (!q.trim()) { searchResults.set(null); showSearch = false; return; }
		searchTimer = setTimeout(async () => {
			try {
				const result = await apiGetAuth<{ tasks: any[]; projects: any[] }>(
					`/search?q=${encodeURIComponent(q)}`,
				);
				searchResults.set(result);
				showSearch = result.tasks.length + result.projects.length > 0;
			} catch (_) {}
		}, 300);
	}
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={favicon} />
	<title>NOAgenda</title>
</svelte:head>

{#if $user}
	<div class="sidebar-shell">
		<!-- ── Sidebar ── -->
		<nav class="sidebar-nav {$sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}">
			<div class="sidebar-brand">
				{#if !$sidebarCollapsed}
					<a href="/dashboard" class="text-white font-bold text-base no-underline whitespace-nowrap overflow-hidden flex-1">NOAgenda</a>
				{/if}
				<button
					onclick={toggleSidebar}
					title={$sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					class="bg-transparent border-0 text-slate-400 cursor-pointer p-1 rounded opacity-70 hover:bg-white/10 hover:opacity-100 flex items-center"
				>
					{#if $sidebarCollapsed}
						<ChevronRightOutline class="w-5 h-5" />
					{:else}
						<ChevronLeftOutline class="w-5 h-5" />
					{/if}
				</button>
			</div>

			<ul class="nav-list">
				<li>
					<a href="/dashboard" class="nav-link" class:active={isActive('/dashboard')}>
						<span class="nav-icon">
							{#if isActive('/dashboard')}<HomeSolid class="w-5 h-5" />{:else}<HomeOutline class="w-5 h-5" />{/if}
						</span>
						{#if !$sidebarCollapsed}<span>Dashboard</span>{/if}
					</a>
				</li>
				<li>
					<a href="/projects" class="nav-link" class:active={isActive('/projects')}>
						<span class="nav-icon">
							{#if isActive('/projects')}<FolderSolid class="w-5 h-5" />{:else}<FolderOutline class="w-5 h-5" />{/if}
						</span>
						{#if !$sidebarCollapsed}<span>Projects</span>{/if}
					</a>
				</li>
				<li>
					<a href="/tasks" class="nav-link" class:active={isActive('/tasks')}>
						<span class="nav-icon">
							{#if isActive('/tasks')}<CheckCircleSolid class="w-5 h-5" />{:else}<CheckCircleOutline class="w-5 h-5" />{/if}
						</span>
						{#if !$sidebarCollapsed}<span>Tasks</span>{/if}
					</a>
				</li>
				<li>
					<a href="/upcoming" class="nav-link" class:active={isActive('/upcoming')}>
						<span class="nav-icon"><CalendarMonthOutline class="w-5 h-5" /></span>
						{#if !$sidebarCollapsed}<span>Upcoming</span>{/if}
					</a>
				</li>
				<li>
					<a href="/teams" class="nav-link" class:active={isActive('/teams')}>
						<span class="nav-icon">
							{#if isActive('/teams')}<UsersGroupOutline class="w-5 h-5" />{:else}<UsersGroupOutline class="w-5 h-5" />{/if}
						</span>
						{#if !$sidebarCollapsed}<span>Teams</span>{/if}
					</a>
				</li>
				<li>
					<a href="/labels" class="nav-link" class:active={isActive('/labels')}>
						<span class="nav-icon">
							{#if isActive('/labels')}<TagOutline class="w-5 h-5" />{:else}<TagOutline class="w-5 h-5" />{/if}
						</span>
						{#if !$sidebarCollapsed}<span>Labels</span>{/if}
					</a>
				</li>
				<li>
					<a href="/filters" class="nav-link" class:active={isActive('/filters')}>
						<span class="nav-icon"><FilterOutline class="w-5 h-5" /></span>
						{#if !$sidebarCollapsed}<span>Saved Filters</span>{/if}
					</a>
				</li>
				<li class="nav-spacer"></li>
				<li>
					<a href="/about" class="nav-link" class:active={isActive('/about')}>
						<span class="nav-icon"><InfoCircleOutline class="w-5 h-5" /></span>
						{#if !$sidebarCollapsed}<span>About</span>{/if}
					</a>
				</li>
			</ul>
		</nav>

		<!-- ── Main area ── -->
		<main class="flex-1 min-w-0 flex flex-col bg-gray-50 dark:bg-gray-900">
			<!-- Top bar -->
			<header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 flex items-center gap-3 h-[52px] shrink-0">
				<!-- Search -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div class="relative flex-1 max-w-sm" onclick={(e) => e.stopPropagation()}>
					<div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
						<SearchOutline class="w-4 h-4 text-gray-400" />
					</div>
					<input
						type="search"
						class="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:border-primary-500 dark:focus:border-primary-400"
						placeholder="Search tasks & projects…"
						value={searchQuery}
						oninput={onSearchInput}
						onfocus={() => { if ($searchResults) showSearch = true; }}
					/>
					{#if showSearch && $searchResults}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div class="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[300] max-h-80 overflow-y-auto">
							{#if $searchResults.tasks.length > 0}
								<div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasks</div>
								{#each $searchResults.tasks as t}
									<a href="/tasks/{t.id}" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 no-underline" onclick={() => (showSearch = false)}>
										<CheckCircleOutline class="w-4 h-4 shrink-0" />{t.title}
									</a>
								{/each}
							{/if}
							{#if $searchResults.projects.length > 0}
								<div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Projects</div>
								{#each $searchResults.projects as p}
									<a href="/projects/{p.id}" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 no-underline" onclick={() => (showSearch = false)}>
										<FolderOutline class="w-4 h-4 shrink-0" />{p.name}
									</a>
								{/each}
							{/if}
						</div>
					{/if}
				</div>

				<div class="flex items-center gap-1 ml-auto">
					<!-- Quick-add -->
					<button
						id="quick-add-btn"
						class="w-7 h-7 rounded-full bg-primary-600 text-white border-0 cursor-pointer flex items-center justify-content-center hover:opacity-85 transition-opacity"
						title="Create new…"
					>
						<PlusOutline class="w-4 h-4 m-auto" />
					</button>
					<Dropdown triggeredBy="#quick-add-btn" placement="bottom-end">
						<DropdownItem href="/tasks/create">
							<CheckCircleOutline class="w-4 h-4 mr-2" />New Task
						</DropdownItem>
						<DropdownItem href="/projects/new">
							<FolderOutline class="w-4 h-4 mr-2" />New Project
						</DropdownItem>
					</Dropdown>

					<!-- Theme toggle -->
					<button
						onclick={toggleTheme}
						title="Toggle theme"
						class="bg-transparent border-0 cursor-pointer p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
					>
						{#if ($user.theme ?? 'light') === 'light'}
							<MoonOutline class="w-5 h-5" />
						{:else}
							<SunOutline class="w-5 h-5" />
						{/if}
					</button>

					<!-- Notifications -->
					<button
						id="notif-btn"
						class="relative bg-transparent border-0 cursor-pointer p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
						onclick={loadNotifications}
					>
						<BellOutline class="w-5 h-5" />
						{#if $unreadCount > 0}
							<Badge color="red" class="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 text-[10px] px-1 flex items-center justify-center">{$unreadCount}</Badge>
						{/if}
					</button>
					<Dropdown triggeredBy="#notif-btn" placement="bottom-end" class="w-80 max-h-[420px] overflow-y-auto">
						<div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-600">
							<strong class="text-sm text-gray-900 dark:text-white">Notifications</strong>
							<button onclick={markAllRead} class="text-xs text-primary-600 dark:text-primary-400 bg-transparent border-0 cursor-pointer">Mark all read</button>
						</div>
						{#if $notifications.length === 0}
							<p class="px-4 py-3 text-sm text-gray-500">No notifications.</p>
						{:else}
							{#each $notifications as n}
								<div class="px-4 py-2 border-b border-gray-100 dark:border-gray-700 {n.read ? '' : 'bg-primary-50 dark:bg-primary-900/20'}">
									<p class="text-sm text-gray-800 dark:text-gray-200 m-0">{n.message ?? `Notification #${n.id}`}</p>
									<small class="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</small>
								</div>
							{/each}
						{/if}
					</Dropdown>

					<!-- User menu -->
					<button id="user-menu-btn" class="bg-transparent border-0 cursor-pointer p-0 flex items-center rounded-full">
						{#if $user.avatarUrl}
							<Avatar src={resolveUrl($user.avatarUrl)} size="sm" />
						{:else}
							<Avatar size="sm">{getInitials($user)}</Avatar>
						{/if}
					</button>
					<Dropdown triggeredBy="#user-menu-btn" placement="bottom-end" class="w-52">
						<DropdownHeader>
							<span class="block text-sm font-semibold text-gray-900 dark:text-white">{$user.name ?? $user.username}</span>
							<span class="block text-xs text-gray-500">@{$user.username}</span>
						</DropdownHeader>
						<DropdownItem href="/user/profile">
							<UserCircleOutline class="w-4 h-4 mr-2" />Profile
						</DropdownItem>
						{#if $userTeams.length > 0}
							<DropdownItem href="/teams">
								<UsersGroupOutline class="w-4 h-4 mr-2" />Teams
							</DropdownItem>
						{/if}
						<DropdownItem href="/user/settings">
							<CogOutline class="w-4 h-4 mr-2" />Settings
						</DropdownItem>
						<DropdownDivider />
						<DropdownItem onclick={logout} class="text-red-600 dark:text-red-400">
							<ArrowRightToBracketOutline class="w-4 h-4 mr-2" />Logout
						</DropdownItem>
					</Dropdown>
				</div>
			</header>

			<!-- Page content -->
			<div class="flex-1 p-6 overflow-auto text-gray-900 dark:text-gray-100">
				{@render children?.()}
			</div>
		</main>
	</div>
{:else}
	{@render children?.()}
{/if}
