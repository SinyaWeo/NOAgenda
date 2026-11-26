import { apiFetch } from './api';

export const DEFAULT_APP_NAME = 'NOAgenda';

/** The admin-configured display name (`appName.current`). Starts as the default and is replaced once `/info` answers. */
export const appName = $state<{ current: string }>({ current: DEFAULT_APP_NAME });

/** Load the name from the public `/info` endpoint. Failure keeps the default. */
export async function loadAppName(): Promise<void> {
	try {
		const res = await apiFetch('/info');
		if (!res.ok) return;
		const info: { name?: string } = await res.json();
		if (info.name?.trim()) appName.current = info.name.trim();
	} catch {
		// keep the default
	}
}
