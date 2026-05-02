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
			class="sidebar"
			style="width: {$sidebarCollapsed ? '56px' : '220px'}"
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
					{$sidebarCollapsed ? '→' : '←'}
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
						<span class="nav-icon">🏠</span>
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
						<span class="nav-icon">📋</span>
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
						<span class="nav-icon">✅</span>
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
						<span class="nav-icon">📅</span>
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
						<span class="nav-icon">👥</span>
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
						<span class="nav-icon">🏷️</span>
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
						<span class="nav-icon">🔍</span>
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
						<span class="nav-icon">ℹ️</span>
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
										✅ {t.title}
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
										📋 {p.name}
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
									✅ New Task
								</a>
								<a
									href="/projects/new"
									class="dropdown-item"
									onclick={() => showQuickAdd.set(false)}
								>
									📋 New Project
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
						{($user.theme ?? 'light') === 'light' ? '🌙' : '☀️'}
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
									👤 Profile
								</a>
								{#if $userTeams.length > 0}
									<a
										href="/teams"
										class="dropdown-item"
										onclick={() => showUserMenu.set(false)}
									>
										👥 Teams
									</a>
								{/if}
								<a
									href="/user/settings"
									class="dropdown-item"
									onclick={() => showUserMenu.set(false)}
								>
									⚙️ Settings
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

<style>
	/* ── CSS custom properties (light/dark theme) ── */
	:global(:root),
	:global([data-theme='light']) {
		--na-surface: #ffffff;
		--na-bg: #f8fafc;
		--na-border: #e2e8f0;
		--na-text: #1e293b;
		--na-text-muted: #64748b;
		--na-sidebar-bg: #1e293b;
		--na-sidebar-text: #cbd5e1;
		--na-sidebar-active: #60a5fa;
		--na-primary: #6366f1;
		--na-hover-bg: #f1f5f9;
	}
	:global([data-theme='dark']) {
		--na-surface: #1e293b;
		--na-bg: #0f172a;
		--na-border: #334155;
		--na-text: #e2e8f0;
		--na-text-muted: #94a3b8;
		--na-sidebar-bg: #020617;
		--na-sidebar-text: #94a3b8;
		--na-sidebar-active: #93c5fd;
		--na-primary: #818cf8;
		--na-hover-bg: #1e293b;
	}

	/* ── Shell ── */
	.shell {
		display: flex;
		min-height: 100vh;
		background: var(--na-bg);
	}

	/* ── Sidebar ── */
	.sidebar {
		background: var(--na-sidebar-bg);
		color: var(--na-sidebar-text);
		flex-shrink: 0;
		overflow: hidden;
		transition: width 0.2s ease;
		display: flex;
		flex-direction: column;
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.75rem;
		height: 52px;
		flex-shrink: 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.brand-name {
		color: #fff;
		font-weight: 700;
		font-size: 1.05rem;
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		flex: 1;
	}

	.collapse-btn {
		background: none;
		border: none;
		color: var(--na-sidebar-text);
		cursor: pointer;
		font-size: 0.85rem;
		padding: 4px 6px;
		border-radius: 4px;
		flex-shrink: 0;
		opacity: 0.7;
	}
	.collapse-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		opacity: 1;
	}

	.nav-list {
		list-style: none;
		padding: 0.5rem 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
		flex: 1;
	}

	.nav-spacer {
		flex: 1;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.45rem 0.75rem;
		color: var(--na-sidebar-text);
		text-decoration: none;
		border-radius: 4px;
		white-space: nowrap;
		overflow: hidden;
		font-size: 0.875rem;
		margin: 0 0.25rem;
		transition: background 0.1s;
	}
	.nav-link:hover {
		background: rgba(255, 255, 255, 0.08);
	}
	.nav-link.active {
		color: var(--na-sidebar-active);
		background: rgba(255, 255, 255, 0.06);
	}

	.nav-icon {
		font-size: 1rem;
		flex-shrink: 0;
		width: 20px;
		text-align: center;
	}

	/* ── Main area ── */
	.main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		background: var(--na-bg);
	}

	/* ── Top bar ── */
	.topbar {
		background: var(--na-surface);
		border-bottom: 1px solid var(--na-border);
		padding: 0.4rem 1.25rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
		height: 52px;
	}

	/* ── Search ── */
	.search-wrap {
		position: relative;
		flex: 1;
		max-width: 380px;
	}

	.search-input {
		width: 100%;
		padding: 0.35rem 0.85rem;
		border: 1px solid var(--na-border);
		border-radius: 20px;
		font-size: 0.875rem;
		outline: none;
		background: var(--na-bg);
		color: var(--na-text);
		transition: border-color 0.15s;
	}
	.search-input:focus {
		border-color: var(--na-primary);
	}

	.search-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--na-surface);
		border: 1px solid var(--na-border);
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
		z-index: 300;
		max-height: 320px;
		overflow-y: auto;
	}

	.search-section-header {
		padding: 0.4rem 0.85rem 0.2rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--na-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.search-item {
		display: block;
		padding: 0.45rem 0.85rem;
		color: var(--na-text);
		text-decoration: none;
		font-size: 0.875rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.search-item:hover {
		background: var(--na-hover-bg);
	}

	/* ── Header action group ── */
	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: auto;
	}

	/* ── Shared relative wrapper for dropdowns ── */
	.rel-wrap {
		position: relative;
	}

	/* ── Icon buttons ── */
	.icon-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 6px 8px;
		border-radius: 6px;
		font-size: 1.05rem;
		position: relative;
		color: var(--na-text-muted);
		line-height: 1;
	}
	.icon-btn:hover {
		background: var(--na-hover-bg);
	}

	.notif-btn {
		font-size: 1.1rem;
	}

	/* ── Quick-add round button ── */
	.quick-add-btn {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: var(--na-primary);
		color: #fff;
		border: none;
		cursor: pointer;
		font-size: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		transition: opacity 0.15s;
	}
	.quick-add-btn:hover {
		opacity: 0.85;
	}

	/* ── Notification badge ── */
	.badge {
		position: absolute;
		top: 2px;
		right: 2px;
		background: #ef4444;
		color: #fff;
		border-radius: 50%;
		font-size: 0.6rem;
		width: 14px;
		height: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* ── Shared dropdown panel ── */
	.dropdown {
		position: absolute;
		right: 0;
		top: calc(100% + 6px);
		background: var(--na-surface);
		border: 1px solid var(--na-border);
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
		z-index: 200;
		min-width: 170px;
	}

	/* ── Dropdown items ── */
	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		color: var(--na-text);
		text-decoration: none;
		font-size: 0.875rem;
		background: none;
		border: none;
		cursor: pointer;
		width: 100%;
		text-align: left;
		transition: background 0.1s;
	}
	.dropdown-item:hover {
		background: var(--na-hover-bg);
	}
	.dropdown-item.danger {
		color: #ef4444;
	}
	.dropdown-item.danger:hover {
		background: #fff1f2;
	}

	.dropdown-divider {
		border: none;
		border-top: 1px solid var(--na-border);
		margin: 0.25rem 0;
	}

	/* ── Notification panel ── */
	.notif-panel {
		width: 320px;
		max-height: 420px;
		overflow-y: auto;
	}

	.notif-header {
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--na-border);
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--na-text);
	}

	.mark-read-btn {
		font-size: 0.8rem;
		color: var(--na-primary);
		background: none;
		border: none;
		cursor: pointer;
	}

	.notif-empty {
		padding: 1rem;
		color: var(--na-text-muted);
		margin: 0;
		font-size: 0.875rem;
	}

	.notif-item {
		padding: 0.6rem 1rem;
		border-bottom: 1px solid var(--na-border);
	}
	.notif-item.unread {
		background: #f0f9ff;
	}

	.notif-msg {
		margin: 0;
		font-size: 0.875rem;
		color: var(--na-text);
	}

	.notif-time {
		color: var(--na-text-muted);
		font-size: 0.75rem;
	}

	/* ── User menu ── */
	.user-menu {
		min-width: 200px;
	}

	.user-menu-info {
		padding: 0.6rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.user-menu-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--na-text);
	}

	.user-menu-username {
		font-size: 0.78rem;
		color: var(--na-text-muted);
	}

	/* ── Avatar button ── */
	.avatar-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		border-radius: 50%;
	}

	.avatar-img {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		object-fit: cover;
	}

	.avatar-initials {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--na-primary);
		color: #fff;
		font-size: 0.8rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		user-select: none;
	}

	/* ── Page content ── */
	.content {
		flex: 1;
		padding: 1.5rem;
		overflow: auto;
		color: var(--na-text);
	}
</style>
