<script lang="ts">
	import { appName } from '$lib/appName';
	import Logo from '$lib/components/Logo.svelte';
	import { onMount } from 'svelte';
	import { t, type MessageKey } from '$lib/i18n';
	import {
		HomeOutline,
		HomeSolid,
		FolderOutline,
		FolderSolid,
		CheckCircleOutline,
		CheckCircleSolid,
		CalendarMonthOutline,
		LightbulbOutline,
		UsersGroupOutline,
		TagOutline,
		TrashBinOutline,
		FilterOutline,
		InfoCircleOutline,
		ChevronRightOutline,
		ChevronLeftOutline,
		CogOutline
	} from 'flowbite-svelte-icons';

	let {
		currentPath,
		showAdmin,
		isMobile,
		mobileOpen = $bindable(false)
	}: {
		currentPath: string;
		showAdmin: boolean;
		isMobile: boolean;
		mobileOpen?: boolean;
	} = $props();

	type Icon = typeof HomeOutline;
	interface NavItem {
		href: string;
		label: MessageKey;
		icon?: Icon; // omitted: the custom mind-map glyph
		activeIcon?: Icon;
		/** Active only on this exact path, not on pages below it (the admin overview vs. the other admin pages). */
		exact?: boolean;
	}

	const WORK: NavItem[] = [
		{ href: '/dashboard', label: 'layout.nav.dashboard', icon: HomeOutline, activeIcon: HomeSolid },
		{ href: '/projects', label: 'layout.nav.projects', icon: FolderOutline, activeIcon: FolderSolid },
		{ href: '/tasks', label: 'layout.nav.tasks', icon: CheckCircleOutline, activeIcon: CheckCircleSolid },
		{ href: '/ideas', label: 'layout.nav.ideas', icon: LightbulbOutline },
		{ href: '/upcoming', label: 'layout.nav.upcoming', icon: CalendarMonthOutline }
	];
	const ORGANIZE: NavItem[] = [
		{ href: '/mindmap', label: 'layout.nav.mindmap' },
		{ href: '/teams', label: 'layout.nav.teams', icon: UsersGroupOutline },
		{ href: '/labels', label: 'layout.nav.labels', icon: TagOutline },
		{ href: '/filters', label: 'layout.nav.filters', icon: FilterOutline },
		{ href: '/activity', label: 'layout.nav.activity' },
		{ href: '/trash', label: 'layout.nav.trash', icon: TrashBinOutline }
	];
	const ADMIN: NavItem = { href: '/admin', label: 'layout.nav.adminOverview', icon: CogOutline, exact: true };
	const AUDIT: NavItem = { href: '/admin/activity', label: 'layout.nav.auditLog' };
	const ABOUT: NavItem = { href: '/about', label: 'layout.nav.about', icon: InfoCircleOutline };

	let collapsed = $state(false);
	const compact = $derived(collapsed && !isMobile);

	onMount(() => {
		try {
			if (localStorage.getItem('nav-collapsed') === 'true') collapsed = true;
		} catch (_) {}
	});

	function isActive(item: NavItem): boolean {
		if (item.exact) return currentPath.replace(/\/+$/, '') === item.href;
		return currentPath.startsWith(item.href);
	}

	function toggleSidebar() {
		collapsed = !collapsed;
		try {
			localStorage.setItem('nav-collapsed', String(collapsed));
		} catch (_) {}
	}
</script>

{#snippet navItem(item: NavItem)}
	{@const active = isActive(item)}
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
			{#if !compact}<span>{$t(item.label)}</span>{/if}
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
	aria-label={$t('layout.nav.main')}
	id="main-nav"
	class="sidebar-nav {compact ? 'sidebar-collapsed' : 'sidebar-expanded'} {mobileOpen ? 'mobile-open' : ''}"
>
	<div class="sidebar-brand">
		{#if !compact}
			<a
				href="/dashboard"
				class="flex items-center gap-2 brand-text font-bold text-base no-underline whitespace-nowrap overflow-hidden flex-1"
			>
				<Logo size={28} /><span class="truncate">{$appName}</span>
			</a>
		{/if}
		<button
			onclick={toggleSidebar}
			title={compact ? $t('layout.nav.expand') : $t('layout.nav.collapse')}
			aria-label={compact ? $t('layout.nav.expand') : $t('layout.nav.collapse')}
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
		{@render sectionTitle($t('layout.nav.work'))}
		{#each WORK as item (item.href)}{@render navItem(item)}{/each}
		{@render sectionTitle($t('layout.nav.organize'))}
		{#each ORGANIZE as item (item.href)}{@render navItem(item)}{/each}
		{#if showAdmin}
			{@render sectionTitle($t('layout.nav.admin'))}
			{@render navItem(ADMIN)}
			{@render navItem(AUDIT)}
		{/if}
		<li class="nav-spacer"></li>
		{@render navItem(ABOUT)}
	</ul>
</nav>
