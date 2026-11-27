import { apiFetch } from './api';

/**
 * The instance runs in single-user mode: no teams, no sharing, no assignees or user pickers (see the
 * admin settings). `singleUserMode.current`; false until `/auth/config` answers; the backend refuses those routes either way.
 */
export const singleUserMode = $state<{ current: boolean }>({ current: false });

/** The public demo (`DEMO_MODE=true`): shared accounts, so account-security changes are off. `demoMode.current`. */
export const demoMode = $state<{ current: boolean }>({ current: false });

/** Load the public instance settings the whole app needs. Failure keeps the defaults. */
export async function loadAppConfig(): Promise<void> {
	try {
		const res = await apiFetch('/auth/config');
		if (!res.ok) return;
		const cfg: { singleUserMode?: boolean; demoMode?: boolean } = await res.json();
		singleUserMode.current = cfg.singleUserMode === true;
		demoMode.current = cfg.demoMode === true;
	} catch {
		// keep the defaults
	}
}

const MULTI_USER_PAGES = [
	/^\/teams(\/|$)/,
	/^\/admin\/teams(\/|$)/,
	/^\/projects\/[^/]+\/settings\/share(\/|$)/
];

/** Pages that only make sense with other people (teams, sharing): redirected away in single-user mode. */
export function isMultiUserPage(path: string): boolean {
	return MULTI_USER_PAGES.some((re) => re.test(path));
}
