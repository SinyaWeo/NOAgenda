import { goto } from '$app/navigation';
import type { Writable } from 'svelte/store';
import { getCurrentUser } from '$lib/auth';

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
	error: Writable<string>,
): void {
	$effect(() => {
		const k = key(); // the only reactive read: re-run when the route params change
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
			} catch (e: any) {
				if (!stale) error.set(e?.message ?? 'Failed to load');
			} finally {
				if (!stale) loading.set(false);
			}
		})();
		return () => {
			stale = true;
		};
	});
}
