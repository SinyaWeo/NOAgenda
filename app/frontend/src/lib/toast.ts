import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
	id: number;
	message: string;
	type: ToastType;
	duration: number;
}

let nextId = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const toasts = writable<ToastItem[]>([]);

/** Remove a toast now and cancel its pending auto-dismiss timer. */
export function dismissToast(id: number): void {
	const timer = timers.get(id);
	if (timer !== undefined) {
		clearTimeout(timer);
		timers.delete(id);
	}
	toasts.update((list) => list.filter((t) => t.id !== id));
}

export function showToast(
	message: string,
	type: ToastType = 'success',
	duration = 3000,
): void {
	const id = ++nextId;
	toasts.update((list) => [...list, { id, message, type, duration }]);
	timers.set(id, setTimeout(() => dismissToast(id), duration));
}
