<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { getCurrentUser } from '$lib/auth';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiGetAuth, apiPostAuth, clearToken, API_BASE } from '$lib/api';

	/** Resolve a backend-relative path (e.g. /uploads/...) to a full URL */
	function resolveUrl(path: string | undefined): string {
		if (!path) return '';
		if (path.startsWith('http')) return path;
		return `${API_BASE}${path}`;
	}

	let { children } = $props();

	const user = writable<any>(null);
	const notifications = writable<any[]>([]);
	const showNotifications = writable(false);
	const unreadCount = writable(0);

	// Phase 1 — user menu
	const showUserMenu = writable(false);
	const userTeams = writable<any[]>([]);

	// Phase 5 — collapsible sidebar
	const sidebarCollapsed = writable(false);

	// Phase 3 — quick-add
	const showQuickAdd = writable(false);

	// Phase 2 — search
	const searchResults = writable<{ tasks: any[]; projects: any[] } | null>(
		null,
	);
	const showSearch = writable(false);
	let searchQuery = $state('');
	let searchTimer: ReturnType<typeof setTimeout>;

	onMount(() => {
		// Restore sidebar collapse state
		if (localStorage.getItem('nav-collapsed') === 'true')
			sidebarCollapsed.set(true);

		// Fire-and-forget async init; return cleanup synchronously
		getCurrentUser().then((me) => {
			user.set(me);
			if (me) {
				loadNotifications();
				loadTeams();
				// Phase 4 — apply saved theme
				document.documentElement.setAttribute(
					'data-theme',
					me.theme ?? 'light',
				);
			}
		});

		window.addEventListener('click', handleWindowClick);
		return () => window.removeEventListener('click', handleWindowClick);
	});

	function handleWindowClick() {
		showUserMenu.set(false);
		showNotifications.set(false);
		showQuickAdd.set(false);
		showSearch.set(false);
	}

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
		} catch (_) {
			userTeams.set([]);
		}
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

	// Phase 1 — avatar helpers
	function getInitials(u: any): string {
		const name: string = u.name ?? u.username ?? 'U';
		return name
			.split(' ')
			.map((w: string) => w[0] ?? '')
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Phase 5 — sidebar toggle
	function toggleSidebar() {
		sidebarCollapsed.update((v) => {
			localStorage.setItem('nav-collapsed', String(!v));
			return !v;
		});
	}

	// Phase 4 — theme toggle
	async function toggleTheme() {
		if (!$user) return;
		const next = ($user.theme ?? 'light') === 'light' ? 'dark' : 'light';
		user.update((u) => ({ ...u, theme: next }));
		document.documentElement.setAttribute('data-theme', next);
		try {
			await apiPostAuth('/user/settings/general', { theme: next });
		} catch (_) {}
	}

	// Phase 2 — search with debounce
	function onSearchInput(e: Event) {
		const q = (e.target as HTMLInputElement).value;
		searchQuery = q; // $state — triggers template update
		clearTimeout(searchTimer);
		if (!q.trim()) {
			searchResults.set(null);
			showSearch.set(false);
			return;
		}
		searchTimer = setTimeout(async () => {
			try {
				const result = await apiGetAuth<{
					tasks: any[];
					projects: any[];
				}>(`/search?q=${encodeURIComponent(q)}`);
				searchResults.set(result);
				showSearch.set(
					result.tasks.length + result.projects.length > 0,
				);
			} catch (_) {}
		}, 300);
	}
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={favicon} />
	<title>NOAgenda</title>
</svelte:head>

{#if $user}
	<div class="shell">
		<!-- Sidebar (Phase 5: collapsible) -->
		<nav
			class="sidebar {$sidebarCollapsed
				? 'sidebar-collapsed'
				: 'sidebar-expanded'}"
		>
			<!-- Brand + toggle button -->
			<div class="sidebar-brand">
				{#if !$sidebarCollapsed}
					<a href="/dashboard" class="brand-name">NOAgenda</a>
				{/if}
				<button
					class="collapse-btn"
					onclick={toggleSidebar}
					title={$sidebarCollapsed
						? 'Expand sidebar'
						: 'Collapse sidebar'}
				>
					{#if $sidebarCollapsed}<span class="icon icon-sm"
							>chevron_right</span
						>{:else}<span class="icon icon-sm">chevron_left</span
						>{/if}
				</button>
			</div>

			<!-- Nav links -->
			<ul class="nav-list">
				<li>
					<a
						href="/dashboard"
						class="nav-link"
						class:active={isActive('/dashboard')}
					>
						<span class="nav-icon icon">home</span>
						{#if !$sidebarCollapsed}<span class="nav-label"
								>Dashboard</span
							>{/if}
					</a>
				</li>
				<li>
					<a
						href="/projects"
						class="nav-link"
						class:active={isActive('/projects')}
					>
						<span class="nav-icon icon">folder</span>
						{#if !$sidebarCollapsed}<span class="nav-label"
								>Projects</span
							>{/if}
					</a>
				</li>
				<li>
					<a
						href="/tasks"
						class="nav-link"
						class:active={isActive('/tasks')}
					>
						<span class="nav-icon icon">task_alt</span>
						{#if !$sidebarCollapsed}<span class="nav-label"
								>Tasks</span
							>{/if}
					</a>
				</li>
				<li>
					<a
						href="/upcoming"
						class="nav-link"
						class:active={isActive('/upcoming')}
					>
						<span class="nav-icon icon">event</span>
						{#if !$sidebarCollapsed}<span class="nav-label"
								>Upcoming</span
							>{/if}
					</a>
				</li>
				<li>
					<a
						href="/teams"
						class="nav-link"
						class:active={isActive('/teams')}
					>
						<span class="nav-icon icon">group</span>
						{#if !$sidebarCollapsed}<span class="nav-label"
								>Teams</span
							>{/if}
					</a>
				</li>
				<li>
					<a
						href="/labels"
						class="nav-link"
						class:active={isActive('/labels')}
					>
						<span class="nav-icon icon">label</span>
						{#if !$sidebarCollapsed}<span class="nav-label"
								>Labels</span
							>{/if}
					</a>
				</li>
				<li>
					<a
						href="/filters"
						class="nav-link"
						class:active={isActive('/filters')}
					>
						<span class="nav-icon icon">filter_list</span>
						{#if !$sidebarCollapsed}<span class="nav-label"
								>Saved Filters</span
							>{/if}
					</a>
				</li>
				<li class="nav-spacer"></li>
				<li>
					<a
						href="/about"
						class="nav-link"
						class:active={isActive('/about')}
					>
						<span class="nav-icon icon">info</span>
						{#if !$sidebarCollapsed}<span class="nav-label"
								>About</span
							>{/if}
					</a>
				</li>
			</ul>
		</nav>

		<!-- Main content area -->
		<main class="main">
			<!-- Top bar -->
			<header class="topbar">
				<!-- Phase 2: Search bar -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div class="search-wrap" onclick={(e) => e.stopPropagation()}>
					<input
						type="search"
						class="search-input"
						placeholder="Search tasks & projects…"
						value={searchQuery}
						oninput={onSearchInput}
						onfocus={() => {
							if ($searchResults) showSearch.set(true);
						}}
					/>
					{#if $showSearch && $searchResults}
						<div class="search-dropdown">
							{#if $searchResults.tasks.length > 0}
								<div class="search-section-header">Tasks</div>
								{#each $searchResults.tasks as t}
									<a
										href="/tasks/{t.id}"
										class="search-item"
										onclick={() => showSearch.set(false)}
									>
										<span class="icon icon-sm"
											>task_alt</span
										>
										{t.title}
									</a>
								{/each}
							{/if}
							{#if $searchResults.projects.length > 0}
								<div class="search-section-header">
									Projects
								</div>
								{#each $searchResults.projects as p}
									<a
										href="/projects/{p.id}"
										class="search-item"
										onclick={() => showSearch.set(false)}
									>
										<span class="icon icon-sm">folder</span>
										{p.name}
									</a>
								{/each}
							{/if}
						</div>
					{/if}
				</div>

				<div class="header-actions">
					<!-- Phase 3: Quick-add button -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div class="rel-wrap" onclick={(e) => e.stopPropagation()}>
						<button
							class="quick-add-btn"
							title="Create new…"
							onclick={() => {
								showQuickAdd.update((v) => !v);
								showUserMenu.set(false);
								showNotifications.set(false);
							}}>+</button
						>
						{#if $showQuickAdd}
							<div class="dropdown">
								<a
									href="/tasks/create"
									class="dropdown-item"
									onclick={() => showQuickAdd.set(false)}
								>
									<span class="icon icon-sm">task_alt</span> New
									Task
								</a>
								<a
									href="/projects/new"
									class="dropdown-item"
									onclick={() => showQuickAdd.set(false)}
								>
									<span class="icon icon-sm">folder</span> New
									Project
								</a>
							</div>
						{/if}
					</div>

					<!-- Phase 4: Theme toggle -->
					<button
						class="icon-btn"
						title="Toggle theme"
						onclick={toggleTheme}
					>
						{#if ($user.theme ?? 'light') === 'light'}<span
								class="icon">dark_mode</span
							>{:else}<span class="icon">light_mode</span>{/if}
					</button>

					<!-- Notification bell (existing) -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div class="rel-wrap" onclick={(e) => e.stopPropagation()}>
						<button
							class="icon-btn notif-btn"
							onclick={() => {
								showNotifications.update((v) => !v);
								showUserMenu.set(false);
								showQuickAdd.set(false);
								if ($showNotifications) loadNotifications();
							}}
						>
							🔔
							{#if $unreadCount > 0}
								<span class="badge">{$unreadCount}</span>
							{/if}
						</button>
						{#if $showNotifications}
							<div class="dropdown notif-panel">
								<div class="notif-header">
									<strong>Notifications</strong>
									<button
										class="mark-read-btn"
										onclick={markAllRead}
										>Mark all read</button
									>
								</div>
								{#if $notifications.length === 0}
									<p class="notif-empty">No notifications.</p>
								{:else}
									{#each $notifications as n}
										<div
											class="notif-item"
											class:unread={!n.read}
										>
											<p class="notif-msg">
												{n.message ??
													`Notification #${n.id}`}
											</p>
											<small class="notif-time"
												>{new Date(
													n.createdAt,
												).toLocaleString()}</small
											>
										</div>
									{/each}
								{/if}
							</div>
						{/if}
					</div>

					<!-- Phase 1: User avatar dropdown -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div class="rel-wrap" onclick={(e) => e.stopPropagation()}>
						<button
							class="avatar-btn"
							title="Account menu"
							onclick={() => {
								showUserMenu.update((v) => !v);
								showNotifications.set(false);
								showQuickAdd.set(false);
							}}
						>
							{#if $user.avatarUrl}
								<img
									src={resolveUrl($user.avatarUrl)}
									alt="Avatar"
									class="avatar-img"
								/>
							{:else}
								<div class="avatar-initials">
									{getInitials($user)}
								</div>
							{/if}
						</button>
						{#if $showUserMenu}
							<div class="dropdown user-menu">
								<div class="user-menu-info">
									<span class="user-menu-name"
										>{$user.name ?? $user.username}</span
									>
									<span class="user-menu-username"
										>@{$user.username}</span
									>
								</div>
								<hr class="dropdown-divider" />
								<a
									href="/user/profile"
									class="dropdown-item"
									onclick={() => showUserMenu.set(false)}
								>
									<span class="icon icon-sm">person</span> Profile
								</a>
								{#if $userTeams.length > 0}
									<a
										href="/teams"
										class="dropdown-item"
										onclick={() => showUserMenu.set(false)}
									>
										<span class="icon icon-sm">group</span> Teams
									</a>
								{/if}
								<a
									href="/user/settings"
									class="dropdown-item"
									onclick={() => showUserMenu.set(false)}
								>
									<span class="icon icon-sm">settings</span> Settings
								</a>
								<hr class="dropdown-divider" />
								<button
									class="dropdown-item danger"
									onclick={logout}>🚪 Logout</button
								>
							</div>
						{/if}
					</div>
				</div>
			</header>

			<!-- Page content -->
			<div class="content">
				{@render children?.()}
			</div>
		</main>
	</div>
{:else}
	{@render children?.()}
{/if}
