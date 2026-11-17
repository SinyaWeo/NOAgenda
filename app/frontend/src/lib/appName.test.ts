import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const apiFetch = vi.fn();
vi.mock('./api', () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));

import { appName, DEFAULT_APP_NAME, loadAppName } from './appName';

const answer = (body: unknown, ok = true) => ({ ok, json: async () => body });

describe('loadAppName', () => {
	beforeEach(() => {
		apiFetch.mockReset();
		appName.set(DEFAULT_APP_NAME);
	});

	it('starts with the default name', () => {
		expect(get(appName)).toBe('NOAgenda');
	});

	it('takes the configured name from /info', async () => {
		apiFetch.mockResolvedValue(answer({ name: '  Acme Tasks ' }));
		await loadAppName();
		expect(apiFetch).toHaveBeenCalledWith('/info');
		expect(get(appName)).toBe('Acme Tasks');
	});

	it.each([
		['a blank name', answer({ name: '   ' })],
		['no name', answer({})],
		['a failed response', answer({ name: 'X' }, false)]
	])('keeps the default for %s', async (_label, res) => {
		apiFetch.mockResolvedValue(res);
		await loadAppName();
		expect(get(appName)).toBe('NOAgenda');
	});

	it('keeps the default when the request fails', async () => {
		apiFetch.mockRejectedValue(new Error('offline'));
		await expect(loadAppName()).resolves.toBeUndefined();
		expect(get(appName)).toBe('NOAgenda');
	});
});
