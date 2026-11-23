<script lang="ts">
	import { t } from '$lib/i18n';
	import { Button, Card, Input, Label, Select } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';
	import ActivityLog from '$lib/components/ActivityLog.svelte';

	const ACTIONS = [
		'task.created',
		'task.updated',
		'task.deleted',
		'project.created',
		'project.updated',
		'project.deleted',
		'comment.created',
		'comment.updated',
		'comment.deleted',
		'task.assignee_changed',
		'task.label_changed',
		'task.relation_changed',
		'task.attachment_changed'
	];

	let actorId = $state('');
	let projectId = $state('');
	let action = $state('');
	let from = $state('');
	let to = $state('');
	/** The filters that are applied (the inputs only take effect on "Apply"). */
	let applied = $state('');

	function apply(e?: Event) {
		e?.preventDefault();
		const q = new URLSearchParams();
		if (/^\d+$/.test(actorId.trim())) q.set('actorId', actorId.trim());
		if (/^\d+$/.test(projectId.trim())) q.set('projectId', projectId.trim());
		if (action) q.set('action', action);
		if (from) q.set('from', new Date(from).toISOString());
		if (to) q.set('to', new Date(to + 'T23:59:59').toISOString());
		applied = q.toString();
	}

	function reset() {
		actorId = projectId = action = from = to = '';
		applied = '';
	}
</script>

<svelte:head>
	<title>{$t('activity.admin.pageTitle')}</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-2">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{$t('activity.admin.title')}</h1>
		<a href="/admin" class="text-sm text-primary-600 dark:text-primary-400">
			<CaretLeftSolid class="w-4 h-4 inline mr-1" />
			{$t('admin.back')}
		</a>
	</div>
	<p class="text-sm text-gray-500 mt-0 mb-6">{$t('activity.admin.hint')}</p>

	<Card class="max-w-none mb-4">
		<form onsubmit={apply} class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
			<div>
				<Label for="aud-actor" class="mb-1">{$t('activity.admin.filterActor')}</Label>
				<Input id="aud-actor" type="text" inputmode="numeric" bind:value={actorId} />
			</div>
			<div>
				<Label for="aud-project" class="mb-1">{$t('activity.admin.filterProject')}</Label>
				<Input id="aud-project" type="text" inputmode="numeric" bind:value={projectId} />
			</div>
			<div>
				<Label for="aud-action" class="mb-1">{$t('activity.admin.filterAction')}</Label>
				<Select id="aud-action" bind:value={action}>
					<option value="">{$t('activity.admin.anyAction')}</option>
					{#each ACTIONS as a (a)}
						<option value={a}>{a}</option>
					{/each}
				</Select>
			</div>
			<div>
				<Label for="aud-from" class="mb-1">{$t('activity.admin.filterFrom')}</Label>
				<Input id="aud-from" type="date" bind:value={from} />
			</div>
			<div>
				<Label for="aud-to" class="mb-1">{$t('activity.admin.filterTo')}</Label>
				<Input id="aud-to" type="date" bind:value={to} />
			</div>
			<div class="flex gap-2">
				<Button type="submit" size="sm">{$t('activity.admin.apply')}</Button>
				<Button type="button" size="sm" color="light" onclick={reset}>{$t('activity.admin.reset')}</Button>
			</div>
		</form>
	</Card>

	<Card class="max-w-none">
		<ActivityLog endpoint="/admin/activity{applied ? `?${applied}` : ''}" showProject />
	</Card>
</div>
