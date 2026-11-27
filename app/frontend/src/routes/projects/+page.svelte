<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { errMessage } from '#lib/errors.js';
	import { onMount } from 'svelte';
	import { apiGetAuth } from '#lib/api.js';
	import type { Project } from '#lib/types.js';
	import { Alert, Button, Card, Progressbar } from 'flowbite-svelte';
	import { t } from '#lib/i18n/index.js';
	import { FolderOutline, PlusOutline } from 'flowbite-svelte-icons';
	import { projectTree, type ProjectTreeRow } from '#lib/project-tree.js';

	let projects = $state<Project[]>([]);
	let taskStats = $state<Record<number, { total: number; done: number }>>({});
	let loading = $state(true);
	let error = $state('');
	/** Top-level projects as cards, each with its subprojects (any depth, in tree order) listed inside. */
	const groups = $derived.by(() => {
		const out: { project: Project; below: ProjectTreeRow[] }[] = [];
		for (const row of projectTree(projects)) {
			if (row.depth === 0) out.push({ project: row.project, below: [] });
			else out[out.length - 1]?.below.push(row);
		}
		return out;
	});

	onMount(async () => {
		try {
			const [ps, stats] = await Promise.all([
				apiGetAuth<Project[]>('/projects'),
				apiGetAuth<Record<number, { total: number; done: number }>>('/projects/stats').catch(() => ({}))
			]);
			projects = ps;
			taskStats = stats ?? {};
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			loading = false;
		}
	});
</script>

<PageHeader title={t('projects.title')}>
	{#snippet actions()}
		<Button href="/projects/new"><PlusOutline class="w-4 h-4 mr-1" />{t('projects.new')}</Button>
	{/snippet}
</PageHeader>

{#if loading}
	<p class="text-gray-500 dark:text-gray-400">{t('projects.loading')}</p>
{:else if error}
	<Alert color="red">{error}</Alert>
{:else if projects.length}
	<div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 items-stretch">
		{#each groups as { project, below } (project.id)}
			<Card class="flex flex-col gap-2 h-full">
				<div class="flex items-start gap-2">
					<div class="flex-1 min-w-0">
						<a
							href="/projects/{project.id}"
							class="font-bold text-gray-900 dark:text-white hover:underline block truncate"
						>
							{project.name ?? project.title}
						</a>
						{#if project.owner}<p class="text-xs text-gray-500 dark:text-gray-400 m-0 truncate">
								{t('projects.ownedBy', { name: project.owner.name || project.owner.username })}
							</p>{/if}
						{#if project.description}<p class="text-sm text-gray-500 dark:text-gray-400 m-0 truncate">
								{project.description}
							</p>{/if}
					</div>
				</div>
				{#if project.isArchived}<span class="text-xs font-medium tone-gray">
						{t('projects.archived')}
					</span>{/if}
				{@const stats = taskStats[project.id]}
				{#if stats && stats.total > 0}
					<div class="mt-1">
						<div class="flex justify-between items-center mb-1">
							<span class="text-xs text-gray-500 dark:text-gray-400">
								{t('projects.taskStats', { done: stats.done, count: stats.total })}
							</span>
							<span class="text-xs text-gray-500 dark:text-gray-400">
								{Math.round((stats.done / stats.total) * 100)}%
							</span>
						</div>
						<Progressbar
							progress={Math.round((stats.done / stats.total) * 100)}
							size="h-1.5"
							color="indigo"
						/>
					</div>
				{/if}
				{#if below.length}
					<div>
						<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide m-0 mb-1">
							{t('projects.sub.title')}
						</p>
						<ul class="m-0 p-0 list-none flex flex-col gap-0.5">
							{#each below as row (row.project.id)}
								<li class="text-sm truncate" style:padding-left="{(row.depth - 1) * 0.75}rem">
									<a
										href="/projects/{row.project.id}"
										class="text-gray-700 dark:text-gray-300 hover:underline"
									>
										<span aria-hidden="true" class="text-gray-400">└</span>
										{row.project.name ?? row.project.title}
									</a>
									{#if row.project.owner && row.project.owner.id !== project.owner?.id}<span
											class="text-xs text-gray-500 dark:text-gray-400"
										>
											· {t('projects.ownedBy', {
												name: row.project.owner.name || row.project.owner.username
											})}
										</span>{/if}
									{#if row.project.isArchived}<span class="text-xs tone-gray">
											{t('projects.archived')}
										</span>{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				<div class="flex items-center gap-3 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
					<a
						href="/projects/{project.id}"
						class="text-sm text-primary-600 dark:text-primary-400 no-underline hover:underline"
					>
						{t('projects.open')}
					</a>
					<a
						href="/projects/{project.id}/edit"
						class="text-sm text-gray-500 dark:text-gray-400 no-underline hover:underline"
					>
						{t('projects.settings')}
					</a>
				</div>
			</Card>
		{/each}
	</div>
{:else}
	<div class="text-center py-12 text-gray-500 dark:text-gray-400">
		<FolderOutline class="w-12 h-12 mx-auto mb-3" />
		<p>
			{t('projects.empty.text')}
			<a href="/projects/new" class="text-primary-600 hover:underline">{t('projects.empty.link')}</a>
		</p>
	</div>
{/if}
