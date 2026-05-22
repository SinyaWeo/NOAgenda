<script lang="ts">
	import { onMount } from 'svelte';
	import { getCurrentUser } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { isAdmin } from '$lib/roles';
	import type { User } from '$lib/types';
	import { Card } from 'flowbite-svelte';
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
		QuoteOutline,
	} from 'flowbite-svelte-icons';

	let me: User | null = $state(null);

	onMount(async () => {
		me = await getCurrentUser();
		if (!me) goto('/user/login');
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

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
	{#each sections as s}
		<a href={s.href} class="no-underline h-full">
			<Card
				class="hover:shadow-md transition-shadow cursor-pointer h-full {s.danger
					? 'border-red-200 dark:border-red-800'
					: ''}"
			>
				<div class="flex items-center gap-3">
					<s.icon
						class="w-8 h-8 shrink-0 {s.danger
							? 'text-red-600'
							: 'text-primary-600'}"
					/>
					<div>
						<p
							class="font-semibold m-0 {s.danger
								? 'text-red-600'
								: 'text-gray-900 dark:text-white'}"
						>
							{s.label}
						</p>
						<p class="text-sm text-gray-500 m-0">{s.desc}</p>
					</div>
				</div>
			</Card>
		</a>
	{/each}
</div>

{#if isAdmin(me)}
	<h2
		class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-8 mb-3"
	>
		Admin
	</h2>
	<div
		class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch"
	>
		<a href="/admin/quotes" class="no-underline h-full">
			<Card
				class="hover:shadow-md transition-shadow cursor-pointer h-full"
			>
				<div class="flex items-center gap-3">
					<QuoteOutline class="w-8 h-8 shrink-0 text-primary-600" />
					<div>
						<p
							class="font-semibold m-0 text-gray-900 dark:text-white"
						>
							Quotes
						</p>
						<p class="text-sm text-gray-500 m-0">
							Manage motivational quotes
						</p>
					</div>
				</div>
			</Card>
		</a>
	</div>
{/if}
