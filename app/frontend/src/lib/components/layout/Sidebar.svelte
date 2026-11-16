<script lang="ts">
	import { onMount } from 'svelte';
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
		CogOutline,
	} from 'flowbite-svelte-icons';

	let {
		currentPath,
		showAdmin,
		isMobile,
		mobileOpen = $bindable(false),
	}: {
		currentPath: string;
		showAdmin: boolean;
		isMobile: boolean;
		mobileOpen?: boolean;
	} = $props();

	type Icon = typeof HomeOutline;
	interface NavItem {
		href: string;
		label: string;
		icon?: Icon; // omitted: the custom mind-map glyph
		activeIcon?: Icon;
	}

	const WORK: NavItem[] = [
		{ href: '/dashboard', label: 'Dashboard', icon: HomeOutline, activeIcon: HomeSolid },
		{ href: '/projects', label: 'Projects', icon: FolderOutline, activeIcon: FolderSolid },
		{ href: '/tasks', label: 'Tasks', icon: CheckCircleOutline, activeIcon: CheckCircleSolid },
		{ href: '/upcoming', label: 'Upcoming', icon: CalendarMonthOutline },
	];
	const ORGANIZE: NavItem[] = [
		{ href: '/mindmap', label: 'MindMap' },
		{ href: '/teams', label: 'Teams', icon: UsersGroupOutline },
		{ href: '/labels', label: 'Labels', icon: TagOutline },
		{ href: '/filters', label: 'Saved Filters', icon: FilterOutline },
	];
	const ADMIN: NavItem = { href: '/admin', label: 'Admin', icon: CogOutline };
	const ABOUT: NavItem = { href: '/about', label: 'About', icon: InfoCircleOutline };

	let collapsed = $state(false);
	const compact = $derived(collapsed && !isMobile);

	onMount(() => {
		try {
			if (localStorage.getItem('nav-collapsed') === 'true') collapsed = true;
		} catch (_) {}
	});

	function isActive(path: string): boolean {
		return currentPath.startsWith(path);
	}

	function toggleSidebar() {
		collapsed = !collapsed;
		try { localStorage.setItem('nav-collapsed', String(collapsed)); } catch (_) {}
	}
</script>

{#snippet navItem(item: NavItem)}
	{@const active = isActive(item.href)}
	{@const Icon = active && item.activeIcon ? item.activeIcon : item.icon}
	<li>
		<a href={item.href} class="nav-link" class:active>
			<span class="nav-icon">
				{#if Icon}
					<Icon class="w-5 h-5" />
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-5 h-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<circle cx="12" cy="12" r="2" fill="currentColor"></circle>
						<circle cx="4" cy="6" r="2" fill="currentColor"></circle>
						<circle cx="20" cy="6" r="2" fill="currentColor"></circle>
						<circle cx="4" cy="18" r="2" fill="currentColor"></circle>
						<circle cx="20" cy="18" r="2" fill="currentColor"></circle>
						<line x1="12" y1="10" x2="4" y2="8" stroke="currentColor"></line>
						<line x1="12" y1="10" x2="20" y2="8" stroke="currentColor"></line>
						<line x1="12" y1="14" x2="4" y2="16" stroke="currentColor"></line>
						<line x1="12" y1="14" x2="20" y2="16" stroke="currentColor"></line>
					</svg>
				{/if}
			</span>
			{#if !compact}<span>{item.label}</span>{/if}
		</a>
	</li>
{/snippet}

{#snippet sectionTitle(title: string)}
	{#if !compact}
		<li class="px-3 mt-4 mb-1 text-xs text-slate-400 uppercase tracking-wider select-none">
			{title}
		</li>
	{/if}
{/snippet}

<!-- Dim the page behind the mobile drawer; clicking it closes the drawer -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="mobile-backdrop {mobileOpen ? 'open' : ''}" onclick={() => (mobileOpen = false)}></div>

<nav
	aria-label="Main"
	id="main-nav"
	class="sidebar-nav {compact ? 'sidebar-collapsed' : 'sidebar-expanded'} {mobileOpen
		? 'mobile-open'
		: ''}"
>
	<div class="sidebar-brand">
		{#if !compact}
			<a
				href="/dashboard"
				class="text-white font-bold text-base no-underline whitespace-nowrap overflow-hidden flex-1"
				>NOAgenda</a
			>
		{/if}
		<button
			onclick={toggleSidebar}
			title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
			aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
			aria-expanded={!compact}
			aria-controls="main-nav"
			class="hidden md:flex bg-transparent border-0 text-slate-400 cursor-pointer p-1 rounded opacity-70 hover:bg-white/10 hover:opacity-100 items-center"
		>
			{#if compact}
				<ChevronRightOutline class="w-5 h-5" />
			{:else}
				<ChevronLeftOutline class="w-5 h-5" />
			{/if}
		</button>
	</div>

	<ul class="nav-list">
		{@render sectionTitle('Work')}
		{#each WORK as item (item.href)}{@render navItem(item)}{/each}
		{@render sectionTitle('Organize')}
		{#each ORGANIZE as item (item.href)}{@render navItem(item)}{/each}
		<li class="nav-spacer"></li>
		{#if showAdmin}{@render navItem(ADMIN)}{/if}
		{@render navItem(ABOUT)}
	</ul>
</nav>
