export type ToastType = 'success' | 'error' | 'info';

/** A button in the toast, e.g. Undo. Running it dismisses the toast. */
export interface ToastAction {
	label: string;
	run: () => void | Promise<void>;
}

export interface ToastItem {
	id: number;
	message: string;
	type: ToastType;
	duration: number;
	action?: ToastAction;
}

let nextId = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

/** The toasts on screen, oldest first (rendered once by `Toast.svelte`). */
export const toasts = $state<ToastItem[]>([]);

/** Remove a toast now and cancel its pending auto-dismiss timer. */
export function dismissToast(id: number): void {
	const timer = timers.get(id);
	if (timer !== undefined) {
		clearTimeout(timer);
		timers.delete(id);
	}
	const index = toasts.findIndex((t) => t.id === id);
	if (index !== -1) toasts.splice(index, 1);
}

/**
 * Show a toast and return its id (for `dismissToast`). With an `action`, the toast stays longer by default
 * (8 s) so there is time to use it.
 */
export function showToast(
	message: string,
	type: ToastType = 'success',
	duration?: number,
	action?: ToastAction
): number {
	const id = ++nextId;
	duration ??= action ? 8000 : 3000;
	toasts.push({ id, message, type, duration, ...(action ? { action } : {}) });
	timers.set(
		id,
		setTimeout(() => dismissToast(id), duration)
	);
	return id;
}
