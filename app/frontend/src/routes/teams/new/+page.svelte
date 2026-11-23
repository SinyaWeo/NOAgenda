<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { errMessage } from '$lib/errors';
	import { writable } from 'svelte/store';
	import { apiPostAuth } from '$lib/api';
	import type { Team } from '$lib/types';
	import { goto } from '$app/navigation';
	import { Alert, Button, Card, Input, Label, Textarea } from 'flowbite-svelte';
	import { t, tr } from '$lib/i18n';

	const name = writable('');
	const description = writable('');
	const error = writable('');
	const loading = writable(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading.set(true);
		error.set('');
		try {
			const team = await apiPostAuth<Team>('/teams', {
				name: $name,
				description: $description
			});
			goto(`/teams/${team.id}`);
		} catch (err: unknown) {
			error.set(errMessage(err, tr('teams.create.failed')));
		} finally {
			loading.set(false);
		}
	}
</script>

<PageHeader title={$t('teams.create.title')} back={{ href: '/teams', label: $t('common.back') }} />
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="max-w-xl">
	<form onsubmit={handleSubmit} class="flex flex-col gap-4">
		<div>
			<Label for="team-name" class="mb-1">
				{$t('common.field.name')} <span class="text-red-500">*</span>
			</Label>
			<Input id="team-name" type="text" bind:value={$name} required />
		</div>
		<div>
			<Label for="team-desc" class="mb-1">{$t('common.field.description')}</Label>
			<Textarea id="team-desc" bind:value={$description} rows={3} />
		</div>
		<div class="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
			<Button type="submit" disabled={$loading}>
				{$loading ? $t('teams.create.submitting') : $t('teams.create.submit')}
			</Button>
			<Button href="/teams" color="light">{$t('common.cancel')}</Button>
		</div>
	</form>
</Card>
