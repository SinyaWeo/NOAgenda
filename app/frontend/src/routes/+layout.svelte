<script lang="ts">
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import StepUpDialog from '#lib/components/StepUpDialog.svelte';
	import MfaEnrollGate from '#lib/components/mfa/MfaEnrollGate.svelte';
	import { mfaGate } from '#lib/mfa.svelte.js';
	import { appName, loadAppName } from '#lib/appName.svelte.js';
	import { isMultiUserPage, loadAppConfig, singleUserMode } from '#lib/appConfig.svelte.js';
	import '../assets/app.css';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { authSession, clearAuthSession, initializeAuth, logout as signOut } from '#lib/auth.svelte.js';
	import { isAdmin } from '#lib/roles.js';
	import ToastContainer from '#lib/components/Toast.svelte';
	import Sidebar from '#lib/components/layout/Sidebar.svelte';
	import SearchBox from '#lib/components/layout/SearchBox.svelte';
	import QuickAdd from '#lib/components/layout/QuickAdd.svelte';
	import NotificationsMenu from '#lib/components/layout/NotificationsMenu.svelte';
	import UserMenu from '#lib/components/layout/UserMenu.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { t, type MessageKey } from '#lib/i18n/index.js';
	import { ThemeProvider } from 'flowbite-svelte';
	import { BarsOutline } from 'flowbite-svelte-icons';

	let { children }: { children?: Snippet } = $props();

	const user = $derived(authSession.user);
	const currentPath = $derived(page.url.pathname);

	// Pages anyone may open without being signed in. Everything else needs a session.
	const PUBLIC_ROUTES = [
		'/',
		'/user/login',
		'/user/register',
		'/user/get-password-reset',
		'/user/password-reset',
		'/user/verify-email',
		'/terms',
		'/privacy'
	];
	const isPublicRoute = $derived(PUBLIC_ROUTES.includes(currentPath.replace(/\/+$/, '') || '/'));

	// Browser-tab titles. A page can still set its own <title>.
	const TITLES: [string, MessageKey][] = [
		['/dashboard', 'layout.title.dashboard'],
		['/projects/new', 'layout.title.newProject'],
		['/projects', 'layout.title.projects'],
		['/tasks/create', 'layout.title.newTask'],
		['/tasks', 'layout.title.tasks'],
		['/ideas', 'layout.title.ideas'],
		['/upcoming', 'layout.title.upcoming'],
		['/teams', 'layout.title.teams'],
		['/activity', 'layout.title.activity'],
		['/labels', 'layout.title.labels'],
		['/filters', 'layout.title.filters'],
		['/mindmap', 'layout.title.mindmap'],
		['/about', 'layout.title.about'],
		['/admin', 'layout.title.admin'],
		['/user/settings', 'layout.title.settings'],
		['/user/login', 'layout.title.login'],
		['/user/register', 'layout.title.register'],
		['/user/get-password-reset', 'layout.title.resetRequest'],
		['/user/password-reset', 'layout.title.resetPassword'],
		['/user/verify-email', 'layout.title.verifyEmail'],
		['/terms', 'layout.title.terms'],
		['/privacy', 'layout.title.privacy']
	];
	const pageTitle = $derived.by(() => {
		const key = TITLES.find(
			([prefix]) => currentPath === prefix || currentPath.startsWith(prefix + '/')
		)?.[1];
		return key ? t(key) : undefined;
	});

	// Mobile: the sidebar becomes a slide-in drawer.
	let isMobile = $state(false);
	let mobileNavOpen = $state(false);
	let signingOut = $state(false);

	onMount(() => {
		void loadAppName();
		void loadAppConfig();
		const mq = window.matchMedia('(max-width: 767px)');
		const sync = () => {
			isMobile = mq.matches;
			if (!mq.matches) mobileNavOpen = false;
		};
		sync();
		mq.addEventListener('change', sync);

		// Sign-in state is shared between tabs through localStorage: follow a logout (or login)
		// done in another tab instead of staying "signed in" until the next failing request.
		const onStorage = (e: StorageEvent) => {
			if (e.key !== 'access_token') return;
			if (!e.newValue && authSession.status === 'authenticated') clearAuthSession();
			else if (e.newValue && authSession.status === 'unauthenticated') void initializeAuth();
		};
		window.addEventListener('storage', onStorage);

		initializeAuth();
		return () => {
			mq.removeEventListener('change', sync);
			window.removeEventListener('storage', onStorage);
		};
	});

	// Close the drawer after navigating.
	$effect(() => {
		void currentPath;
		mobileNavOpen = false;
	});

	// Central route guard: no session on a protected page -> sign in, then come back here.
	$effect(() => {
		if (authSession.status !== 'unauthenticated' || isPublicRoute || signingOut) return;
		const back = page.url.pathname + page.url.search;
		goto(`/user/login?redirect=${encodeURIComponent(back)}`, { replace: true });
	});

	// Single-user mode: no teams and no sharing pages.
	$effect(() => {
		if (singleUserMode.current && isMultiUserPage(currentPath)) goto('/dashboard', { replace: true });
	});

	// Apply the signed-in user's theme.
	$effect(() => {
		const session = authSession;
		if (session.status !== 'authenticated' || !session.user) return;
		const theme = session.user.theme ?? 'light';
		document.documentElement.classList.toggle(
			'dark',
			theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
		);
		try {
			localStorage.setItem('theme', theme);
		} catch (_) {} // read by app.html before first paint
	});

	async function logout() {
		signingOut = true; // an explicit logout should not be remembered as a "come back here" redirect
		try {
			await signOut();
			await goto('/user/login');
		} finally {
			signingOut = false;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="48x48" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<title
		>{pageTitle
			? t('layout.titleWithApp', { title: pageTitle, app: appName.current })
			: appName.current}</title
	>
</svelte:head>

<ThemeProvider theme={{ card: { base: 'p-5' } }}>
	{#if user !== null && mfaGate.current}
		<!-- 2FA is required for this account and not set up yet: nothing else works until it is. -->
		<MfaEnrollGate onlogout={logout} />
	{:else if user !== null}
		<a
			href="#main-content"
			class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-500 focus:bg-white focus:text-primary-700 focus:px-3 focus:py-2 focus:rounded focus:shadow"
		>
			{t('layout.skipToContent')}
		</a>
		<div class="sidebar-shell">
			<Sidebar {currentPath} showAdmin={isAdmin(user)} {isMobile} bind:mobileOpen={mobileNavOpen} />

			<main
				id="main-content"
				tabindex="-1"
				class="flex-1 min-w-0 flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
			>
				<!-- Top bar -->
				<header
					class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 md:px-5 flex items-center gap-2 md:gap-3 h-[52px] shrink-0"
				>
					<!-- Mobile menu button -->
					<button
						type="button"
						class="md:hidden bg-transparent border-0 cursor-pointer p-1.5 -ml-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
						aria-label={t('layout.openMenu')}
						aria-controls="main-nav"
						aria-expanded={mobileNavOpen}
						onclick={() => (mobileNavOpen = true)}
					>
						<BarsOutline class="w-6 h-6" />
					</button>
					<SearchBox />
					<div class="flex items-center gap-1 ml-auto">
						<QuickAdd />
						<UserMenu {user} onlogout={logout}>
							<NotificationsMenu userId={user.id} />
						</UserMenu>
					</div>
				</header>

				<!-- Page content -->
				<div class="flex-1 p-3 sm:p-6 overflow-auto text-gray-900 dark:text-gray-100">
					<div class="page-narrow h-full">
						{@render children?.()}
					</div>
				</div>
			</main>
		</div>
	{:else if isPublicRoute}
		{@render children?.()}
	{:else}
		<!-- Protected page and no session (yet): show nothing of the page. The guard above
		     redirects to sign-in once it is known that there is no session. -->
		<div
			class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500"
			role="status"
		>
			<p>{authSession.status === 'loading' ? t('common.loading') : t('layout.redirecting')}</p>
		</div>
	{/if}
	<ToastContainer />
	<ConfirmDialog />
	<StepUpDialog />
</ThemeProvider>
