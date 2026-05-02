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
			icon: 'person',
			label: 'General',
			desc: 'Name, language, and preferences',
		},
		{
			href: '/user/settings/avatar',
			icon: 'image',
			label: 'Avatar',
			desc: 'Change your profile picture',
		},
		{
			href: '/user/settings/email-update',
			icon: 'mail',
			label: 'Email',
			desc: 'Update your email address',
		},
		{
			href: '/user/settings/password-update',
			icon: 'lock',
			label: 'Password',
			desc: 'Change your password',
		},
		{
			href: '/user/settings/api-tokens',
			icon: 'key',
			label: 'API Tokens',
			desc: 'Manage personal access tokens',
		},
		{
			href: '/user/settings/sessions',
			icon: 'devices',
			label: 'Active Sessions',
			desc: 'View and revoke sessions',
		},
		{
			href: '/user/settings/webhooks',
			icon: 'webhook',
			label: 'Webhooks',
			desc: 'Configure outgoing webhooks',
		},
		{
			href: '/user/settings/data-export',
			icon: 'download',
			label: 'Data Export',
			desc: 'Download your data',
		},
		{
			href: '/user/settings/deletion',
			icon: 'delete_forever',
			label: 'Account Deletion',
			desc: 'Permanently delete your account',
			danger: true,
		},
	];
</script>

<div class="page-header">
	<h1 class="page-title">Settings</h1>
</div>

<div class="settings-grid">
	{#each sections as s}
		<a href={s.href} class="settings-card" class:danger={s.danger}>
			<span class="settings-card-icon icon" class:text-danger={s.danger}
				>{s.icon}</span
			>
			<div>
				<p class="settings-card-title" class:text-danger={s.danger}>
					{s.label}
				</p>
				<p class="settings-card-desc">{s.desc}</p>
			</div>
		</a>
	{/each}
</div>
