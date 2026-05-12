import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
	id: number;
	message: string;
	type: ToastType;
	duration: number;
}

let nextId = 0;

export const toasts = writable<ToastItem[]>([]);

export function showToast(
	message: string,
	type: ToastType = 'success',
	duration = 3000,
): void {
	const id = ++nextId;
	toasts.update((list) => [...list, { id, message, type, duration }]);
	setTimeout(() => {
		toasts.update((list) => list.filter((t) => t.id !== id));
	}, duration);
}
