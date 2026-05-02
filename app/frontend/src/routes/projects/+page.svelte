<script lang="ts">
	import { onMount } from 'svelte';
	import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { Alert, Badge, Button, Card } from 'flowbite-svelte';
	import {
		FolderOutline,
		PlusOutline,
		StarOutline,
		StarSolid,
	} from 'flowbite-svelte-icons';

	const projects = writable<any[]>([]);
	const favorites = writable<Set<number>>(new Set());
	const loading = writable(true);
	const error = writable('');

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/login');
			return;
		}
		try {
			const [ps, favs] = await Promise.all([
				apiGetAuth<any[]>('/projects'),
				apiGetAuth<any[]>('/favorites').catch(() => []),
			]);
			projects.set(ps);
			favorites.set(
				new Set(
					(favs as any[])
						.filter((f: any) => f.entityType === 'project')
						.map((f: any) => f.entityId),
				),
			);
		} catch (e: any) {
			error.set(e.message);
		} finally {
			loading.set(false);
		}
	});

	async function toggleFavorite(projectId: number) {
		const isFav = $favorites.has(projectId);
		try {
			if (isFav) {
				await apiDeleteAuth(`/favorites/project/${projectId}`);
				favorites.update((s) => {
					const n = new Set(s);
					n.delete(projectId);
					return n;
				});
			} else {
				await apiPostAuth('/favorites', {
					entityType: 'project',
					entityId: projectId,
				});
				favorites.update((s) => new Set([...s, projectId]));
			}
		} catch (_) {}
	}
</script>

<div class="flex items-center justify-between mb-6">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
		Projects
	</h1>
	<Button href="/projects/new"
		><PlusOutline class="w-4 h-4 mr-1" />New Project</Button
	>
</div>

{#if $loading}
	<p class="text-gray-400">Loading projects...</p>
{:else if $error}
	<Alert color="red">{$error}</Alert>
{:else if $projects.length}
	<div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
		{#each $projects as project}
			<Card class="flex flex-col gap-2">
				<div class="flex items-start gap-2">
					<div class="flex-1 min-w-0">
						<a
							href="/projects/{project.id}"
							class="font-bold text-gray-900 dark:text-white hover:underline block truncate"
							>{project.name ?? project.title}</a
						>
						{#if project.description}<p
								class="text-sm text-gray-500 dark:text-gray-400 m-0 truncate"
							>
								{project.description}
							</p>{/if}
					</div>
					<button
						onclick={() => toggleFavorite(project.id)}
						class="p-1 text-gray-400 hover:text-amber-400 transition-colors shrink-0"
						title={$favorites.has(project.id)
							? 'Remove from favorites'
							: 'Add to favorites'}
					>
						{#if $favorites.has(project.id)}<StarSolid
								class="w-4 h-4 text-amber-400"
							/>{:else}<StarOutline class="w-4 h-4" />{/if}
					</button>
				</div>
				{#if project.isArchived}<Badge color="gray">Archived</Badge
					>{/if}
				<div
					class="flex items-center gap-3 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700"
				>
					<a
						href="/projects/{project.id}"
						class="text-sm text-primary-600 dark:text-primary-400 no-underline hover:underline"
						>Open</a
					>
					<a
						href="/projects/{project.id}/edit"
						class="text-sm text-gray-400 no-underline hover:underline"
						>Settings</a
					>
				</div>
			</Card>
		{/each}
	</div>
{:else}
	<div class="text-center py-12 text-gray-400">
		<FolderOutline class="w-12 h-12 mx-auto mb-3" />
		<p>
			No projects yet. <a
				href="/projects/new"
				class="text-primary-600 hover:underline">Create a project.</a
			>
		</p>
	</div>
{/if}
