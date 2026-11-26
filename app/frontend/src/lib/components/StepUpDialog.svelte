<script lang="ts">
	import { Alert, Button, Input, Label, Modal } from 'flowbite-svelte';
	import { apiPostAuth, STEP_UP_PATH } from '#lib/api.js';
	import { authSession } from '#lib/auth.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import { t } from '#lib/i18n/index.js';
	import { pendingStepUp } from '#lib/stepUp.svelte.js';

	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	let open = $derived(pendingStepUp.current !== null);

	$effect(() => {
		if (open) {
			password = '';
			error = '';
		}
	});

	function finish(ok: boolean) {
		const req = pendingStepUp.current;
		pendingStepUp.current = null;
		req?.resolve(ok);
	}

	async function submit(e: Event) {
		e.preventDefault();
		if (!password || busy) return;
		busy = true;
		error = '';
		try {
			await apiPostAuth(STEP_UP_PATH, { password });
			password = '';
			finish(true);
		} catch (err: unknown) {
			error = errMessage(err, t('errors.requestFailed'));
		} finally {
			busy = false;
		}
	}
</script>

<Modal
	title={t('auth.stepUp.title')}
	{open}
	oncancel={(ev: Event) => {
		ev.preventDefault();
		if (!busy) finish(false);
	}}
	size="xs"
	outsideclose
>
	<form onsubmit={submit} class="space-y-3">
		<p class="text-sm text-gray-600 dark:text-gray-300 m-0">{t('auth.stepUp.text')}</p>
		{#if error}
			<Alert color="red">{error}</Alert>
		{/if}
		<!-- Lets password managers know which account the password is for. -->
		<input
			type="text"
			class="hidden"
			autocomplete="username"
			value={authSession.user?.username ?? ''}
			readonly
			tabindex="-1"
			aria-hidden="true"
		/>
		<div>
			<Label for="step-up-password" class="mb-1">{t('common.field.password')}</Label>
			<Input
				id="step-up-password"
				type="password"
				autocomplete="current-password"
				bind:value={password}
				disabled={busy}
				data-autofocus
				required
			/>
		</div>
		<div class="flex justify-end gap-2">
			<Button color="light" type="button" onclick={() => finish(false)} disabled={busy}>
				{t('common.cancel')}
			</Button>
			<Button type="submit" data-testid="step-up-confirm" disabled={busy || !password}>
				{t('auth.stepUp.confirm')}
			</Button>
		</div>
	</form>
</Modal>
