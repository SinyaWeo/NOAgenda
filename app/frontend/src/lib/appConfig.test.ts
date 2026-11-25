import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const apiFetch = vi.fn();
vi.mock('./api', () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));

import { isMultiUserPage, loadAppConfig, singleUserMode } from './appConfig';

const answer = (body: unknown, ok = true) => ({ ok, json: async () => body });

describe('loadAppConfig', () => {
	beforeEach(() => {
		apiFetch.mockReset();
		singleUserMode.set(false);
	});

	it('takes single-user mode from /auth/config', async () => {
		apiFetch.mockResolvedValue(answer({ singleUserMode: true }));
		await loadAppConfig();
		expect(apiFetch).toHaveBeenCalledWith('/auth/config');
		expect(get(singleUserMode)).toBe(true);
	});

	it('stays in multi-user mode when the flag is missing or the call fails', async () => {
		apiFetch.mockResolvedValue(answer({}));
		await loadAppConfig();
		expect(get(singleUserMode)).toBe(false);
		apiFetch.mockResolvedValue(answer({ singleUserMode: true }, false));
		await loadAppConfig();
		expect(get(singleUserMode)).toBe(false);
		apiFetch.mockRejectedValue(new Error('offline'));
		await loadAppConfig();
		expect(get(singleUserMode)).toBe(false);
	});
});

describe('isMultiUserPage', () => {
	it.each(['/teams', '/teams/3', '/teams/new', '/admin/teams', '/projects/5/settings/share'])('%s is', (p) =>
		expect(isMultiUserPage(p)).toBe(true)
	);
	it.each(['/teamsx', '/tasks', '/admin/users', '/projects/5/settings/activity', '/projects/share'])(
		'%s is not',
		(p) => expect(isMultiUserPage(p)).toBe(false)
	);
});
