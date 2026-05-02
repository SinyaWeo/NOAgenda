<script lang="ts">
	import { onMount } from 'svelte';
	import { getCurrentUser } from '$lib/auth';
	import { goto } from '$app/navigation';
	import {
		UserCircleOutline,
		CogOutline,
		LockOutline,
		EnvelopeOutline,
		ApiKeyOutline,
		DesktopPcOutline,
		LinkOutline,
		ArrowDownToBracketOutline,
		TrashBinOutline,
	} from 'flowbite-svelte-icons';

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) goto('/login');
	});

	const sections = [
		{
			href: '/user/settings/general',
			icon: UserCircleOutline,
			label: 'General',
			desc: 'Name, language, and preferences',
		},
		{
			href: '/user/settings/avatar',
			icon: CogOutline,
			label: 'Avatar',
			desc: 'Change your profile picture',
		},
		{
			href: '/user/settings/email-update',
			icon: EnvelopeOutline,
			label: 'Email',
			desc: 'Update your email address',
		},
		{
			href: '/user/settings/password-update',
			icon: LockOutline,
			label: 'Password',
			desc: 'Change your password',
		},
		{
			href: '/user/settings/api-tokens',
			icon: ApiKeyOutline,
			label: 'API Tokens',
			desc: 'Manage personal access tokens',
		},
		{
			href: '/user/settings/sessions',
			icon: DesktopPcOutline,
			label: 'Active Sessions',
			desc: 'View and revoke sessions',
		},
		{
			href: '/user/settings/webhooks',
			icon: LinkOutline,
			label: 'Webhooks',
			desc: 'Configure outgoing webhooks',
		},
		{
			href: '/user/settings/data-export',
			icon: ArrowDownToBracketOutline,
			label: 'Data Export',
			desc: 'Download your data',
		},
		{
			href: '/user/settings/deletion',
			icon: TrashBinOutline,
			label: 'Account Deletion',
			desc: 'Permanently delete your account',
			danger: true,
		},
	] satisfies {
		href: string;
		icon: any;
		label: string;
		desc: string;
		danger?: true;
	}[];
</script>

<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Settings</h1>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
	{#each sections as s}
		<a
			href={s.href}
			class="flex items-center gap-3 p-4 rounded-lg border {s.danger
				? 'border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20'
				: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'} transition-colors"
		>
			<svelte:component
				this={s.icon}
				class="w-6 h-6 shrink-0 {s.danger
					? 'text-red-600'
					: 'text-primary-600'}"
			/>
			<div>
				<p
					class="font-semibold text-sm m-0 {s.danger
						? 'text-red-600'
						: 'text-gray-900 dark:text-white'}"
				>
					{s.label}
				</p>
				<p class="text-xs text-gray-500 m-0">{s.desc}</p>
			</div>
		</a>
	{/each}
</div>
