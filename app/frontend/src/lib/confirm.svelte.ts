export interface ConfirmRequest {
	message: string;
	/** Label of the confirming button; defaults to "Delete". */
	confirmLabel?: string;
	resolve: (ok: boolean) => void;
}

/** The dialog currently waiting for an answer (rendered once by `ConfirmDialog.svelte`). */
export const pendingConfirm = $state<{ current: ConfirmRequest | null }>({ current: null });

/**
 * In-app replacement for `window.confirm`: resolves `true` when the user confirms and `false` on cancel,
 * Escape or a click outside. A second call while one is open cancels the first.
 */
export function confirmDialog(message: string, opts: { confirmLabel?: string } = {}): Promise<boolean> {
	return new Promise((resolve) => {
		pendingConfirm.current?.resolve(false);
		pendingConfirm.current = { message, confirmLabel: opts.confirmLabel, resolve };
	});
}
