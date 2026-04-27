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

<h1>Projects</h1>
<a
	href="/projects/new"
	style="background:#6366f1;color:#fff;padding:0.4rem 1rem;border-radius:4px;text-decoration:none;display:inline-block;margin-bottom:1.5rem"
	>+ New Project</a
>

{#if $loading}
	<p>Loading projects...</p>
{:else if $error}
	<p style="color: red">{$error}</p>
{:else if $projects.length}
	<div
		style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem"
	>
		{#each $projects as project}
			<div
				style="border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;background:#fff;display:flex;flex-direction:column;gap:0.75rem;box-shadow:0 1px 4px rgba(0,0,0,0.04)"
			>
				<div
					style="display:flex;justify-content:space-between;align-items:flex-start"
				>
					<div style="flex:1;min-width:0">
						<a
							href="/projects/{project.id}"
							style="font-size:1.05rem;font-weight:600;color:#1e293b;text-decoration:none"
							>{project.name ?? project.title}</a
						>
						{#if project.description}
							<p
								style="margin:0.25rem 0 0;color:#64748b;font-size:0.85rem;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"
							>
								{project.description}
							</p>
						{/if}
					</div>
					<button
						onclick={() => toggleFavorite(project.id)}
						style="background:none;border:none;cursor:pointer;font-size:1.1rem;padding:0;flex-shrink:0;margin-left:0.5rem"
						title={$favorites.has(project.id)
							? 'Remove from favorites'
							: 'Add to favorites'}
						>{$favorites.has(project.id) ? '★' : '☆'}</button
					>
				</div>
				{#if project.isArchived}
					<span
						style="font-size:0.75rem;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;align-self:flex-start"
						>Archived</span
					>
				{/if}
				<div
					style="display:flex;gap:0.75rem;margin-top:auto;padding-top:0.5rem;border-top:1px solid #f1f5f9"
				>
					<a
						href="/projects/{project.id}"
						style="font-size:0.85rem;color:#6366f1">Open</a
					>
					<a
						href="/projects/{project.id}/edit"
						style="font-size:0.85rem;color:#64748b">Settings</a
					>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<p>No projects found. <a href="/projects/new">Create a project.</a></p>
{/if}
