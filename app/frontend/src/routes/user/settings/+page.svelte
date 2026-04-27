<script lang="ts">
	import { onMount } from 'svelte';
	import { getCurrentUser } from '$lib/auth';
	import { goto } from '$app/navigation';

	// User settings index page — links to all settings sub-pages.

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/login');
		}
	});

	const sections = [
		{
			href: '/user/settings/general',
			icon: '👤',
			label: 'General',
			desc: 'Name, language, and preferences',
		},
		{
			href: '/user/settings/avatar',
			icon: '🖼️',
			label: 'Avatar',
			desc: 'Change your profile picture',
		},
		{
			href: '/user/settings/email-update',
			icon: '✉️',
			label: 'Email',
			desc: 'Update your email address',
		},
		{
			href: '/user/settings/password-update',
			icon: '🔒',
			label: 'Password',
			desc: 'Change your password',
		},
		{
			href: '/user/settings/api-tokens',
			icon: '🔑',
			label: 'API Tokens',
			desc: 'Manage personal access tokens',
		},
		{
			href: '/user/settings/sessions',
			icon: '💻',
			label: 'Active Sessions',
			desc: 'View and revoke sessions',
		},
		{
			href: '/user/settings/webhooks',
			icon: '🔗',
			label: 'Webhooks',
			desc: 'Configure outgoing webhooks',
		},
		{
			href: '/user/settings/data-export',
			icon: '📦',
			label: 'Data Export',
			desc: 'Download your data',
		},
		{
			href: '/user/settings/deletion',
			icon: '🗑️',
			label: 'Account Deletion',
			desc: 'Permanently delete your account',
			danger: true,
		},
	];
</script>

<h1 style="margin-bottom:1.5rem">Settings</h1>

<div
	style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.875rem"
>
	{#each sections as s}
		<a
			href={s.href}
			style="display:flex;align-items:flex-start;gap:0.875rem;background:#fff;border:1px solid {s.danger
				? '#fecaca'
				: '#e2e8f0'};border-radius:8px;padding:1rem 1.125rem;text-decoration:none;box-shadow:0 1px 3px rgba(0,0,0,0.04);transition:border-color 0.15s"
		>
			<span style="font-size:1.25rem;line-height:1">{s.icon}</span>
			<div>
				<p
					style="margin:0;font-weight:600;color:{s.danger
						? '#ef4444'
						: '#1e293b'};font-size:0.95rem"
				>
					{s.label}
				</p>
				<p style="margin:0.2rem 0 0;color:#64748b;font-size:0.8rem">
					{s.desc}
				</p>
			</div>
		</a>
	{/each}
</div>
