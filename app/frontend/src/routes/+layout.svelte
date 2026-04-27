<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { getCurrentUser } from '$lib/auth';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiGetAuth, apiPostAuth, clearToken } from '$lib/api';

	let { children } = $props();

	const user = writable<any>(null);
	const notifications = writable<any[]>([]);
	const showNotifications = writable(false);
	const unreadCount = writable(0);

	onMount(async () => {
		const me = await getCurrentUser();
		user.set(me);
		if (me) loadNotifications();
	});

	async function loadNotifications() {
		try {
			const list = await apiGetAuth<any[]>('/notifications');
			notifications.set(list);
			unreadCount.set(list.filter((n: any) => !n.read).length);
		} catch (_) {
			/* non-critical */
		}
	}

	async function markAllRead() {
		try {
			await apiPostAuth('/notifications/read/all', {});
			await loadNotifications();
		} catch (_) {
			/* non-critical */
		}
	}

	function logout() {
		clearToken();
		goto('/login');
	}

	function isActive(path: string): boolean {
		return $page.url.pathname.startsWith(path);
	}
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={favicon} />
	<title>NOAgenda</title>
</svelte:head>

{#if $user}
	<div style="display:flex;min-height:100vh">
		<nav
			style="width:220px;background:#1e293b;color:#fff;padding:1rem;flex-shrink:0"
		>
			<div style="font-size:1.2rem;font-weight:bold;margin-bottom:1.5rem">
				<a href="/dashboard" style="color:#fff;text-decoration:none"
					>NOAgenda</a
				>
			</div>
			<ul
				style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.25rem"
			>
				<li>
					<a
						href="/dashboard"
						style="color:{isActive('/dashboard')
							? '#60a5fa'
							: '#cbd5e1'};text-decoration:none;padding:0.4rem 0.5rem;display:block;border-radius:4px"
						>Dashboard</a
					>
				</li>
				<li>
					<a
						href="/projects"
						style="color:{isActive('/projects')
							? '#60a5fa'
							: '#cbd5e1'};text-decoration:none;padding:0.4rem 0.5rem;display:block;border-radius:4px"
						>Projects</a
					>
				</li>
				<li>
					<a
						href="/tasks"
						style="color:{isActive('/tasks')
							? '#60a5fa'
							: '#cbd5e1'};text-decoration:none;padding:0.4rem 0.5rem;display:block;border-radius:4px"
						>Tasks</a
					>
				</li>
				<li>
					<a
						href="/upcoming"
						style="color:{isActive('/upcoming')
							? '#60a5fa'
							: '#cbd5e1'};text-decoration:none;padding:0.4rem 0.5rem;display:block;border-radius:4px"
						>Upcoming</a
					>
				</li>
				<li>
					<a
						href="/teams"
						style="color:{isActive('/teams')
							? '#60a5fa'
							: '#cbd5e1'};text-decoration:none;padding:0.4rem 0.5rem;display:block;border-radius:4px"
						>Teams</a
					>
				</li>
				<li>
					<a
						href="/labels"
						style="color:{isActive('/labels')
							? '#60a5fa'
							: '#cbd5e1'};text-decoration:none;padding:0.4rem 0.5rem;display:block;border-radius:4px"
						>Labels</a
					>
				</li>
				<li>
					<a
						href="/filters"
						style="color:{isActive('/filters')
							? '#60a5fa'
							: '#cbd5e1'};text-decoration:none;padding:0.4rem 0.5rem;display:block;border-radius:4px"
						>Saved Filters</a
					>
				</li>
				<li
					style="margin-top:auto;padding-top:1rem;border-top:1px solid #334155;margin-top:1rem"
				>
					<a
						href="/user/settings"
						style="color:#cbd5e1;text-decoration:none;padding:0.4rem 0.5rem;display:block;border-radius:4px"
						>⚙ Settings</a
					>
				</li>
				<li>
					<a
						href="/about"
						style="color:#94a3b8;text-decoration:none;padding:0.4rem 0.5rem;display:block;border-radius:4px;font-size:0.85rem"
						>About</a
					>
				</li>
			</ul>
		</nav>
		<main style="flex:1;overflow:auto;display:flex;flex-direction:column">
			<!-- Top bar -->
			<header
				style="background:#fff;border-bottom:1px solid #e2e8f0;padding:0.5rem 1.5rem;display:flex;justify-content:flex-end;align-items:center;gap:1rem;flex-shrink:0"
			>
				<!-- Notification bell -->
				<div style="position:relative">
					<button
						onclick={() => {
							showNotifications.update((v) => !v);
							if (!$showNotifications) loadNotifications();
						}}
						style="background:none;border:none;cursor:pointer;font-size:1.2rem;position:relative;padding:0"
					>
						🔔{#if $unreadCount > 0}<span
								style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;font-size:0.65rem;width:16px;height:16px;display:flex;align-items:center;justify-content:center"
								>{$unreadCount}</span
							>{/if}
					</button>
					{#if $showNotifications}
						<div
							style="position:absolute;right:0;top:2rem;width:320px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:100;max-height:400px;overflow:auto"
						>
							<div
								style="padding:0.5rem 1rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center"
							>
								<strong>Notifications</strong>
								<button
									onclick={markAllRead}
									style="font-size:0.8rem;color:#6366f1;background:none;border:none;cursor:pointer"
									>Mark all read</button
								>
							</div>
							{#if $notifications.length === 0}
								<p style="padding:1rem;color:#64748b;margin:0">
									No notifications.
								</p>
							{:else}
								{#each $notifications as n}
									<div
										style="padding:0.6rem 1rem;border-bottom:1px solid #f1f5f9;background:{n.read
											? '#fff'
											: '#f0f9ff'}"
									>
										<p style="margin:0;font-size:0.9rem">
											{n.message ??
												`Notification #${n.id}`}
										</p>
										<small style="color:#94a3b8"
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
				<!-- User menu -->
				<span style="font-size:0.9rem;color:#475569"
					>{$user.username ?? $user.name ?? 'User'}</span
				>
				<a
					href="/user/settings"
					style="font-size:0.85rem;color:#6366f1;text-decoration:none"
					>Settings</a
				>
				<button
					onclick={logout}
					style="font-size:0.85rem;color:#ef4444;background:none;border:none;cursor:pointer;padding:0"
					>Logout</button
				>
			</header>
			<div style="flex:1;padding:1.5rem;overflow:auto">
				{@render children?.()}
			</div>
		</main>
	</div>
{:else}
	{@render children?.()}
{/if}
