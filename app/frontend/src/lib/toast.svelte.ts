export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
	id: number;
	message: string;
	type: ToastType;
	duration: number;
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

export function showToast(message: string, type: ToastType = 'success', duration = 3000): void {
	const id = ++nextId;
	toasts.push({ id, message, type, duration });
	timers.set(
		id,
		setTimeout(() => dismissToast(id), duration)
	);
}
