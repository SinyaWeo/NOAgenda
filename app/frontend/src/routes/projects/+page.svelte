<script lang="ts">
	import { onMount } from 'svelte';
	import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';

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
		} catch (_) {
			/* non-critical */
		}
	}
</script>

<div class="page-header">
	<h1 class="page-title">Projects</h1>
	<div class="page-actions">
		<a href="/projects/new" class="btn btn-primary"
			><span class="icon icon-sm">add</span> New Project</a
		>
	</div>
</div>

{#if $loading}
	<p class="text-muted">Loading projects...</p>
{:else if $error}
	<div class="alert alert-error">{$error}</div>
{:else if $projects.length}
	<div class="project-grid">
		{#each $projects as project}
			<div class="project-card">
				<div
					class="flex-center"
					style="justify-content:space-between;align-items:flex-start"
				>
					<div style="flex:1;min-width:0">
						<a
							href="/projects/{project.id}"
							class="font-bold truncate"
							style="display:block;text-decoration:none;color:inherit"
							>{project.name ?? project.title}</a
						>
						{#if project.description}
							<p class="text-sm text-muted mb-0">
								{project.description}
							</p>
						{/if}
					</div>
					<button
						onclick={() => toggleFavorite(project.id)}
						class="btn btn-ghost btn-icon"
						title={$favorites.has(project.id)
							? 'Remove from favorites'
							: 'Add to favorites'}
					>
						<span class="icon icon-sm"
							>{$favorites.has(project.id)
								? 'star'
								: 'star_border'}</span
						>
					</button>
				</div>
				{#if project.isArchived}
					<span class="tag">Archived</span>
				{/if}
				<div
					class="flex-center gap-3"
					style="margin-top:auto;padding-top:0.5rem;border-top:1px solid var(--na-border,#f1f5f9)"
				>
					<a
						href="/projects/{project.id}"
						class="text-sm text-primary">Open</a
					>
					<a
						href="/projects/{project.id}/edit"
						class="text-sm text-muted">Settings</a
					>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="empty-state">
		<span class="icon">folder_open</span>
		<p>No projects yet. <a href="/projects/new">Create a project.</a></p>
	</div>
{/if}
