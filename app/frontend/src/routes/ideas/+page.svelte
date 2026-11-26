<script lang="ts">
	import { singleUserMode } from '#lib/appConfig.svelte.js';
	import { confirmDialog } from '#lib/confirm.svelte.js';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { errMessage } from '#lib/errors.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { apiGetAuth, apiPostAuth, apiPutAuth, apiDeleteAuth } from '#lib/api.js';
	import { getCurrentUser } from '#lib/auth.svelte.js';
	import type { Idea, Team } from '#lib/types-misc.js';
	import type { Project } from '#lib/types.js';
	import { Alert, Button, Card, Checkbox, Select, Textarea } from 'flowbite-svelte';
	import TaskVersionHistory from '#lib/components/task/TaskVersionHistory.svelte';
	import { LightbulbOutline } from 'flowbite-svelte-icons';
	import { t, fmt } from '#lib/i18n/index.js';

	let ideas = $state<Idea[]>([]);
	let projects = $state<Project[]>([]);
	let teams = $state<Team[]>([]);
	let loading = $state(true);
	let error = $state('');

	let newText = $state('');
	let newProjectId = $state('');
	let creating = $state(false);

	let editId = $state<number | null>(null);
	let editText = $state('');
	let shareId = $state<number | null>(null);
	let historyId = $state<number | null>(null);
	/** Bumped on every save, so an open history reloads. */
	let historyVersion = $state(0);

	function replace(updated: Idea) {
		ideas = ideas.map((i) => (i.id === updated.id ? updated : i));
	}

	async function createIdea() {
		if (!newText.trim()) return;
		creating = true;
		try {
			const created = await apiPostAuth<Idea>('/ideas', {
				text: newText.trim(),
				...(newProjectId ? { projectId: Number(newProjectId) } : {})
			});
			ideas = [created, ...ideas];
			newText = '';
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			creating = false;
		}
	}

	async function saveEdit(id: number) {
		if (!editText.trim()) return;
		try {
			replace(await apiPutAuth<Idea>(`/ideas/${id}`, { text: editText.trim() }));
			historyVersion++;
			editId = null;
		} catch (e: unknown) {
			error = errMessage(e);
		}
	}

	async function deleteIdea(id: number) {
		if (!(await confirmDialog(t('ideas.confirmDelete')))) return;
		try {
			await apiDeleteAuth(`/ideas/${id}`);
			ideas = ideas.filter((i) => i.id !== id);
		} catch (e: unknown) {
			error = errMessage(e);
		}
	}

	async function toggleTeam(idea: Idea, teamId: number, on: boolean) {
		const teamIds = on ? [...idea.sharedTeamIds, teamId] : idea.sharedTeamIds.filter((id) => id !== teamId);
		try {
			replace(await apiPutAuth<Idea>(`/ideas/${idea.id}/teams`, { teamIds }));
		} catch (e: unknown) {
			error = errMessage(e);
		}
	}

	onMount(async () => {
		if (!(await getCurrentUser())) {
			goto('/user/login');
			return;
		}
		try {
			[ideas, projects, teams] = await Promise.all([
				apiGetAuth<Idea[]>('/ideas'),
				apiGetAuth<Project[]>('/projects'),
				// No teams to share with in single-user mode (the call is refused there).
				singleUserMode.current ? Promise.resolve([]) : apiGetAuth<Team[]>('/teams').catch((): Team[] => [])
			]);
		} catch (e: unknown) {
			error = errMessage(e);
		}
		loading = false;
	});
</script>

<PageHeader title={t('ideas.title')} subtitle={t('ideas.subtitle')} />
{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}

<!-- Same width as the dashboard's quick-add card: full width, half from lg up. -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
	<Card class="max-w-none p-4 h-full">
		<form
			onsubmit={(e) => {
				e.preventDefault();
				createIdea();
			}}
			class="flex w-full flex-col gap-2"
		>
			<Textarea
				bind:value={newText}
				rows={4}
				placeholder={t('ideas.newPlaceholder')}
				aria-label={t('ideas.newPlaceholder')}
				required
			/>
			<div class="flex gap-2 items-center flex-wrap">
				<Select
					placeholder=""
					bind:value={newProjectId}
					aria-label={t('ideas.project')}
					class="flex-1 min-w-36"
				>
					<option value="">{t('ideas.noProject')}</option>
					{#each projects as p (p.id)}<option value={String(p.id)}>{p.name}</option>{/each}
				</Select>
				<Button type="submit" disabled={creating || !newText.trim()}>
					{creating ? t('ideas.adding') : t('ideas.add')}
				</Button>
			</div>
		</form>
	</Card>
</div>

{#if loading}
	<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
{:else if ideas.length === 0}
	<div class="text-center py-12 text-gray-500 dark:text-gray-400">
		<LightbulbOutline class="w-12 h-12 mx-auto mb-3" />
		<p>{t('ideas.empty')}</p>
	</div>
{:else}
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each ideas as idea (idea.id)}
			<Card class="max-w-none p-4 flex flex-col gap-3">
				<div class="flex items-start justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
					<span class="min-w-0 truncate">
						{#if !idea.isMine}
							{t('ideas.sharedBy', {
								name: idea.owner?.name || idea.owner?.username || ''
							})}
						{:else if idea.project}
							<a href="/projects/{idea.project.id}" class="hover:underline">{idea.project.name}</a>
						{/if}
					</span>
					<time class="shrink-0" datetime={idea.createdAt}>{fmt.date(idea.createdAt)}</time>
				</div>

				{#if editId === idea.id}
					<Textarea bind:value={editText} rows={4} aria-label={t('common.edit')} />
					<div class="flex gap-2">
						<Button size="sm" onclick={() => saveEdit(idea.id)}>{t('common.save')}</Button>
						<Button size="sm" color="light" onclick={() => (editId = null)}>
							{t('common.cancel')}
						</Button>
					</div>
				{:else}
					<p class="whitespace-pre-wrap break-words text-gray-900 dark:text-white">{idea.text}</p>
					{#if idea.isMine}
						{#if idea.sharedTeamIds.length}
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{t('ideas.sharedWithCount', { count: idea.sharedTeamIds.length })}
							</p>
						{/if}
						<div class="flex gap-2 flex-wrap mt-auto">
							<Button
								size="xs"
								color="light"
								onclick={() => {
									editId = idea.id;
									editText = idea.text;
								}}
							>
								{t('common.edit')}
							</Button>
							{#if !singleUserMode.current}
								<Button
									size="xs"
									color="light"
									onclick={() => (shareId = shareId === idea.id ? null : idea.id)}
								>
									{t('ideas.share')}
								</Button>
							{/if}
							<Button
								size="xs"
								color="light"
								onclick={() => (historyId = historyId === idea.id ? null : idea.id)}
							>
								{t('tasks.history.title')}
							</Button>
							<Button size="sm" color="red" outline onclick={() => deleteIdea(idea.id)}>
								{t('common.delete')}
							</Button>
						</div>
						{#if historyId === idea.id}
							<div class="border-t border-gray-100 dark:border-gray-700 pt-2">
								<TaskVersionHistory
									taskId={idea.id}
									version={historyVersion}
									listPath="/ideas/{idea.id}/history"
									restorePath={(rev) => `/ideas/${idea.id}/history/${rev}/restore`}
									showTitle={false}
									onRestored={(updated: Idea) => {
										replace(updated);
										historyVersion++;
									}}
								/>
							</div>
						{/if}
						{#if shareId === idea.id}
							<div class="border-t border-gray-100 dark:border-gray-700 pt-2">
								<p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									{t('ideas.shareWith')}
								</p>
								{#if teams.length === 0}
									<p class="text-sm text-gray-500 dark:text-gray-400">{t('ideas.noTeams')}</p>
								{:else}
									<div class="flex flex-col gap-1">
										{#each teams as team (team.id)}
											<Checkbox
												checked={idea.sharedTeamIds.includes(team.id)}
												onchange={(e) =>
													toggleTeam(idea, team.id, (e.currentTarget as HTMLInputElement).checked)}
											>
												{team.name}
											</Checkbox>
										{/each}
									</div>
								{/if}
							</div>
						{/if}
					{/if}
				{/if}
			</Card>
		{/each}
	</div>
{/if}
