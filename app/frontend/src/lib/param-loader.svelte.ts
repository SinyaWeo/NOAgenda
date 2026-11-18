import { goto } from '$app/navigation';
import type { Writable } from 'svelte/store';
import { getCurrentUser } from '$lib/auth';
import { errMessage } from '$lib/errors';

/**
 * Load a page's data on mount AND whenever `key()` changes.
 *
 * SvelteKit reuses the page component when only a route param changes (task 5 -> task 6,
 * view 1 -> view 2), so `onMount` alone leaves the old data on screen. This runs `load`
 * for every key, handles the sign-in redirect and the loading/error state, and tells
 * `load` (via `isStale`) when it has been superseded so a slow response for the previous
 * key can never overwrite the current page.
 *
 * `error` is for LOAD failures only. Report failures of user actions with a toast, never
 * with this store: showing it replaces the whole page.
 *
 * Must be called during component initialisation.
 */
export function loadOnParamChange(
	key: () => string,
	load: (key: string, isStale: () => boolean) => Promise<void>,
	loading: Writable<boolean>,
	error: Writable<string>
): void {
	// A $derived only notifies when the VALUE changes. Reading `page.params.id` straight in the effect
	// re-ran it on every navigation that merely replaced the params object (e.g. `?tab=activity`),
	// which reloaded the task and unmounted the tab, wiping whatever the user had just typed.
	const current = $derived(key());
	$effect(() => {
		const k = current; // the only reactive read: re-run only when the key itself changes
		let stale = false;
		loading.set(true);
		error.set('');
		(async () => {
			const me = await getCurrentUser();
			if (stale) return;
			if (!me) {
				goto('/user/login');
				return;
			}
			try {
				await load(k, () => stale);
			} catch (e: unknown) {
				if (!stale) error.set(errMessage(e));
			} finally {
				if (!stale) loading.set(false);
			}
		})();
		return () => {
			stale = true;
		};
	});
}
