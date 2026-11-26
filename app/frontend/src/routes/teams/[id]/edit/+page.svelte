<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { confirmDialog } from '#lib/confirm.svelte.js';
	import { apiGetAuth, apiPutAuth, apiPostAuth, apiPatchAuth, apiDeleteAuth } from '#lib/api.js';
	import { loadOnParamChange } from '#lib/param-loader.svelte.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Alert, Button, Card, Input, Label, Select, Textarea } from 'flowbite-svelte';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import UserPicker from '#lib/components/UserPicker.svelte';
	import { errMessage } from '#lib/errors.js';
	import { showToast } from '#lib/toast.svelte.js';
	import { t, type MessageKey } from '#lib/i18n/index.js';
	import type { Team, TeamMember, UserSummary } from '#lib/types.js';
	import { authSession } from '#lib/auth.svelte.js';
	import { canManageTeam, isAdmin } from '#lib/roles.js';

	let members = $state<TeamMember[]>([]);
	let name = $state('');
	let description = $state('');
	let saving = $state(false);
	const canManage = $derived(canManageTeam(authSession.user, members));
	const admin = $derived(isAdmin(authSession.user));
	let newMember = $state<UserSummary | null>(null);
	let picker: UserPicker | undefined = $state();

	const memberIds = $derived(members.map((m) => m.user?.id).filter((id): id is number => id != null));

	async function fetchMembers(id: string | undefined) {
		members = await apiGetAuth<TeamMember[]>(`/team-members?teamId=${id}`);
	}

	async function loadTeam(id: string, isStale: () => boolean) {
		const [t, m] = await Promise.all([
			apiGetAuth<Team>(`/teams/${id}`),
			apiGetAuth<TeamMember[]>(`/team-members?teamId=${id}`)
		]);
		if (isStale()) return;
		name = t.name ?? '';
		description = t.description ?? '';
		members = m;
	}

	const pageLoad = loadOnParamChange(() => page.params.id ?? '', loadTeam);

	async function handleSave(e: Event) {
		e.preventDefault();
		saving = true;
		try {
			await apiPutAuth(`/teams/${page.params.id}`, {
				name,
				description
			});
			goto(`/teams/${page.params.id}`);
		} catch (e: unknown) {
			showToast(errMessage(e), 'error');
		} finally {
			saving = false;
		}
	}

	async function addMember(e: SubmitEvent) {
		e.preventDefault();
		if (!newMember) return;
		try {
			await apiPostAuth('/team-members', {
				teamId: Number(page.params.id),
				userId: newMember.id
			});
			picker?.reset();
			await fetchMembers(page.params.id);
		} catch (e: unknown) {
			showToast(errMessage(e), 'error');
		}
	}

	/** App admin only: appoint or remove a manager. */
	async function changeRole(member: TeamMember, select: HTMLSelectElement) {
		try {
			await apiPatchAuth(`/admin/teams/${page.params.id}/members/${member.id}/role`, { role: select.value });
			await fetchMembers(page.params.id);
		} catch (e: unknown) {
			select.value = member.role; // the change did not happen: show the role the member really has
			showToast(errMessage(e, t('teams.role.failed')), 'error');
		}
	}

	async function removeMember(memberId: number) {
		try {
			await apiDeleteAuth(`/team-members/${memberId}`);
			await fetchMembers(page.params.id);
		} catch (e: unknown) {
			showToast(errMessage(e), 'error');
		}
	}

	async function handleDelete() {
		if (!(await confirmDialog(t('teams.edit.confirmDelete')))) return;
		try {
			await apiDeleteAuth(`/teams/${page.params.id}`);
			goto('/teams');
		} catch (e: unknown) {
			showToast(errMessage(e), 'error');
		}
	}
</script>

<PageHeader
	title={t('teams.edit.title')}
	back={{ href: `/teams/${page.params.id}`, label: t('common.back') }}
/>
{#if pageLoad.error}<Alert color="red" class="mb-4">{pageLoad.error}</Alert>{/if}

{#if pageLoad.loading}
	<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
{:else if !canManage}
	<Alert color="yellow">{t('teams.edit.managerOnly')}</Alert>
{:else}
	<Card class="max-w-xl mb-4">
		<form onsubmit={handleSave} class="flex flex-col gap-4">
			<div>
				<Label for="team-name" class="mb-1">
					{t('common.field.name')} <span class="text-red-500">*</span>
				</Label>
				<Input id="team-name" type="text" bind:value={name} required />
			</div>
			<div>
				<Label for="team-desc" class="mb-1">{t('common.field.description')}</Label>
				<Textarea id="team-desc" bind:value={description} rows={3} />
			</div>
			<div class="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
				<Button type="submit" disabled={saving}>
					{saving ? t('common.saving') : t('teams.edit.saveChanges')}
				</Button>
				<Button href="/teams/{page.params.id}" color="light">{t('common.cancel')}</Button>
			</div>
		</form>
	</Card>

	<Card class="max-w-xl mb-4">
		<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
			{t('teams.members')}
		</h2>
		<p class="text-xs text-gray-500 dark:text-gray-400 mt-0 mb-3">{t('teams.edit.managerHint')}</p>
		<form onsubmit={addMember} class="flex gap-2 mb-4 items-start">
			<UserPicker
				id="team-member-picker"
				label={t('teams.edit.addMemberLabel')}
				bind:selected={newMember}
				excludeIds={memberIds}
				bind:this={picker}
			/>
			<Button type="submit" size="sm" disabled={!newMember} class="self-start mt-6">
				{t('common.add')}
			</Button>
		</form>
		{#if members.length}
			{#each members as member, i (member.id)}
				<div
					class="flex items-center gap-3 py-2 {i < members.length - 1
						? 'border-b border-gray-100 dark:border-gray-700'
						: ''}"
				>
					<span class="flex-1 text-sm text-gray-800 dark:text-gray-200">
						{member.user
							? member.user.name || member.user.username || t('teams.userFallback', { id: member.user.id })
							: t('teams.memberFallback', { id: member.id })}
					</span>
					{#if admin}
						<Select
							placeholder=""
							size="sm"
							class="w-auto"
							value={member.role}
							aria-label={t('teams.role.change', { name: member.user?.name || member.user?.username || '' })}
							onchange={(e: Event) => changeRole(member, e.currentTarget as HTMLSelectElement)}
						>
							<option value="member">{t('teams.role.member')}</option>
							<option value="manager">{t('teams.role.manager')}</option>
						</Select>
					{:else}
						<span
							class="text-xs font-medium {member.role === 'manager' ? 'tone-blue' : 'tone-gray'}"
							data-team-role={member.role}
						>
							{t(`teams.role.${member.role}` as MessageKey)}
						</span>
					{/if}
					{#if member.role !== 'manager' || admin}
						<Button size="sm" color="red" outline onclick={() => removeMember(member.id)}>
							{t('common.remove')}
						</Button>
					{/if}
				</div>
			{/each}
		{:else}
			<p class="text-sm text-gray-500 dark:text-gray-400">{t('teams.noMembers')}</p>
		{/if}
	</Card>

	<div class="max-w-xl border-2 border-red-200 dark:border-red-900 rounded-lg p-4">
		<h2 class="flex items-center gap-2 text-base font-semibold text-red-600 mb-3">
			<ExclamationCircleOutline class="w-5 h-5" />{t('teams.edit.dangerZone')}
		</h2>
		<div class="flex items-center justify-between gap-3">
			<div>
				<p class="text-sm font-bold text-red-600 m-0">{t('teams.edit.deleteTitle')}</p>
				<p class="text-xs text-gray-500 dark:text-gray-400 m-0">
					{t('teams.edit.deleteDesc')}
				</p>
			</div>
			<Button color="red" size="sm" onclick={handleDelete}>{t('common.delete')}</Button>
		</div>
	</div>
{/if}
