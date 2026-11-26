<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { confirmDialog } from '#lib/confirm.svelte.js';
	import { onMount } from 'svelte';
	import { t } from '#lib/i18n/index.js';
	import { apiGetAuth, apiPostAuth, apiPutAuth, apiDeleteAuth } from '#lib/api.js';
	import {
		Button,
		Checkbox,
		Input,
		Label,
		Modal,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Textarea
	} from 'flowbite-svelte';
	import { PlusOutline, EditOutline, TrashBinOutline, QuoteOutline } from 'flowbite-svelte-icons';
	import type { Quote } from '#lib/types.js';

	let quotes = $state<Quote[]>([]);
	let error = $state('');
	let loading = $state(true);
	let showModal = $state(false);
	let saving = $state(false);
	let editingId = $state<number | null>(null);

	let formText = $state('');
	let formAuthor = $state('');
	let formActive = $state(true);

	onMount(async () => {
		await loadQuotes();
	});

	async function loadQuotes() {
		loading = true;
		error = '';
		try {
			const list = await apiGetAuth<Quote[]>('/quotes');
			quotes = list;
		} catch (_) {
			error = t('admin.quotes.loadFailed');
		} finally {
			loading = false;
		}
	}

	function openNew() {
		editingId = null;
		formText = '';
		formAuthor = '';
		formActive = true;
		showModal = true;
	}

	function openEdit(q: Quote) {
		editingId = q.id;
		formText = q.text;
		formAuthor = q.author ?? '';
		formActive = q.isActive;
		showModal = true;
	}

	async function save() {
		saving = true;
		try {
			const body = {
				text: formText,
				author: formAuthor || undefined,
				isActive: formActive
			};
			const id = editingId;
			if (id) {
				const updated = await apiPutAuth<Quote>(`/quotes/${id}`, body);
				quotes = quotes.map((q) => (q.id === updated.id ? updated : q));
			} else {
				const created = await apiPostAuth<Quote>('/quotes', body);
				quotes = [...quotes, created];
			}
			showModal = false;
		} catch (_) {
			error = t('admin.quotes.saveFailed');
		} finally {
			saving = false;
		}
	}

	async function remove(q: Quote) {
		if (
			!(await confirmDialog(
				t('admin.quotes.confirmDelete', { author: q.author ?? t('admin.quotes.unknownAuthor') })
			))
		)
			return;
		try {
			await apiDeleteAuth(`/quotes/${q.id}`);
			quotes = quotes.filter((x) => x.id !== q.id);
		} catch (_) {
			error = t('admin.quotes.deleteFailed');
		}
	}
</script>

<svelte:head>
	<title>{t('admin.quotes.pageTitle')}</title>
</svelte:head>

<div class="max-w-4xl">
	<PageHeader title={t('admin.quotes.title')} back={{ href: '/admin', label: t('admin.back') }}>
		{#snippet actions()}
			<Button size="sm" onclick={openNew}>
				<PlusOutline class="w-4 h-4 mr-1" />{t('admin.quotes.new')}
			</Button>
		{/snippet}
	</PageHeader>

	{#if loading}
		<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
	{:else if error}
		<p class="text-sm text-gray-500 dark:text-gray-400">{error}</p>
	{:else if quotes.length === 0}
		<div class="text-center py-12 text-gray-500 dark:text-gray-400">
			<QuoteOutline class="w-12 h-12 mx-auto mb-3" />
			<p>
				{t('admin.quotes.empty')}
				<button
					type="button"
					onclick={openNew}
					class="text-primary-600 dark:text-primary-400 hover:underline"
				>
					{t('admin.quotes.createOne')}
				</button>
			</p>
		</div>
	{:else}
		<Table striped>
			<TableHead>
				<TableHeadCell>{t('admin.quotes.col.quote')}</TableHeadCell>
				<TableHeadCell class="hidden sm:table-cell">{t('admin.quotes.col.author')}</TableHeadCell>
				<TableHeadCell class="hidden sm:table-cell">{t('admin.quotes.col.active')}</TableHeadCell>
				<TableHeadCell></TableHeadCell>
			</TableHead>
			<TableBody>
				{#each quotes as q (q.id)}
					<TableBodyRow>
						<TableBodyCell class="max-w-sm whitespace-normal">
							<p class="line-clamp-2 text-sm">{q.text}</p>
							<!-- the Author and Active columns are hidden on phones: show them under the quote -->
							<p class="sm:hidden text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
								{q.author ?? '—'} · {q.isActive ? t('admin.quotes.active') : t('admin.quotes.inactive')}
							</p>
						</TableBodyCell>
						<TableBodyCell class="hidden sm:table-cell">{q.author ?? '—'}</TableBodyCell>
						<TableBodyCell class="hidden sm:table-cell">
							<span class="text-xs font-medium {q.isActive ? 'tone-green' : 'tone-gray'}">
								{q.isActive ? t('admin.quotes.active') : t('admin.quotes.inactive')}
							</span>
						</TableBodyCell>
						<TableBodyCell>
							<div class="flex items-center gap-2">
								<Button size="xs" color="light" onclick={() => openEdit(q)}>
									<EditOutline class="w-3.5 h-3.5" />
								</Button>
								<Button size="sm" color="red" outline onclick={() => remove(q)}>
									<TrashBinOutline class="w-3.5 h-3.5" />
								</Button>
							</div>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</div>

<Modal title={editingId ? t('admin.quotes.edit') : t('admin.quotes.new')} bind:open={showModal} size="md">
	<div class="flex flex-col gap-4">
		<div>
			<Label for="q-text" class="mb-1">{t('admin.quotes.form.text')}</Label>
			<Textarea
				id="q-text"
				rows={4}
				bind:value={formText}
				placeholder={t('admin.quotes.form.textPlaceholder')}
				required
			/>
		</div>
		<div>
			<Label for="q-author" class="mb-1">{t('admin.quotes.form.author')}</Label>
			<Input id="q-author" bind:value={formAuthor} placeholder={t('admin.quotes.form.authorPlaceholder')} />
		</div>
		<Checkbox bind:checked={formActive}>{t('admin.quotes.form.active')}</Checkbox>
	</div>
	{#snippet footer()}
		<Button onclick={save} disabled={!formText.trim() || saving}>
			{saving ? t('common.saving') : t('common.save')}
		</Button>
		<Button color="light" onclick={() => (showModal = false)}>{t('common.cancel')}</Button>
	{/snippet}
</Modal>
