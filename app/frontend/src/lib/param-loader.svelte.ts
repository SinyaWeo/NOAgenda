import { goto } from '$app/navigation';
import { getCurrentUser } from '#lib/auth.svelte.js';
import { errMessage } from '#lib/errors.js';

/**
 * Load a page's data on mount AND whenever `key()` changes.
 *
 * SvelteKit reuses the page component when only a route param changes (task 5 -> task 6,
 * view 1 -> view 2), so `onMount` alone leaves the old data on screen. This runs `load`
 * for every key, handles the sign-in redirect and the loading/error state, and tells
 * `load` (via `isStale`) when it has been superseded so a slow response for the previous
 * key can never overwrite the current page.
 *
 * Returns reactive `{ loading, error }` state for the page to render (and, for its own
 * form submissions, to write). `error` is for LOAD failures: showing it replaces the whole
 * page, so report failures of other user actions with a toast.
 *
 * Must be called during component initialisation.
 */
export interface LoadState {
	loading: boolean;
	error: string;
}

export function loadOnParamChange(
	key: () => string,
	load: (key: string, isStale: () => boolean) => Promise<void>
): LoadState {
	const state = $state<LoadState>({ loading: true, error: '' });
	// A $derived only notifies when the VALUE changes. Reading `page.params.id` straight in the effect
	// re-ran it on every navigation that merely replaced the params object (e.g. `?tab=activity`),
	// which reloaded the task and unmounted the tab, wiping whatever the user had just typed.
	const current = $derived(key());
	$effect(() => {
		const k = current; // the only reactive read: re-run only when the key itself changes
		let stale = false;
		state.loading = true;
		state.error = '';
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
				if (!stale) state.error = errMessage(e);
			} finally {
				if (!stale) state.loading = false;
			}
		})();
		return () => {
			stale = true;
		};
	});
	return state;
}
