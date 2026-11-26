import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetchAuth, STEP_UP_PATH } from './api';
import { needsStepUp, pendingStepUp, requestStepUp } from './stepUp.svelte';

const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const STEP_UP = { code: 'STEP_UP_REQUIRED', message: 'Step-up required' };

/** Answer every step-up prompt as soon as it appears, until the returned function is called. */
function answerPrompt(ok: boolean) {
	let stopped = false;
	const poll = () => {
		if (stopped) return;
		const req = pendingStepUp.current;
		if (req) {
			pendingStepUp.current = null;
			req.resolve(ok);
		}
		setTimeout(poll, 0);
	};
	poll();
	return () => {
		stopped = true;
	};
}

describe('needsStepUp', () => {
	it('recognises only a 403 with the step-up code', async () => {
		expect(await needsStepUp(json(403, STEP_UP))).toBe(true);
		expect(await needsStepUp(json(403, { message: 'Forbidden' }))).toBe(false);
		expect(await needsStepUp(json(400, STEP_UP))).toBe(false);
		expect(await needsStepUp(new Response('nope', { status: 403 }))).toBe(false);
	});

	it('leaves the body readable for the caller', async () => {
		const res = json(403, STEP_UP);
		await needsStepUp(res);
		expect(await res.json()).toEqual(STEP_UP);
	});
});

describe('requestStepUp', () => {
	afterEach(() => (pendingStepUp.current = null));

	it('shares one prompt between requests that need it at the same time', async () => {
		const a = requestStepUp();
		const b = requestStepUp();
		expect(a).toBe(b);
		pendingStepUp.current?.resolve(true);
		expect(await a).toBe(true);
		const next = requestStepUp();
		expect(next).not.toBe(a); // the next one asks again
		pendingStepUp.current?.resolve(false);
		expect(await next).toBe(false);
	});
});

describe('apiFetchAuth with a step-up', () => {
	let calls: string[];
	let answers: Response[];
	let stop: () => void = () => undefined;

	beforeEach(() => {
		calls = [];
		vi.stubGlobal('localStorage', {
			getItem: () => 'token',
			setItem: () => undefined,
			removeItem: () => undefined
		});
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				calls.push(url);
				return answers.shift() ?? json(500, {});
			})
		);
	});
	afterEach(() => {
		stop();
		vi.unstubAllGlobals();
		pendingStepUp.current = null;
	});

	it('asks for the password and sends the request once more', async () => {
		answers = [json(403, STEP_UP), new Response(null, { status: 204 })];
		stop = answerPrompt(true);
		const res = await apiFetchAuth('/admin/users/2', { method: 'DELETE' });
		expect(res.status).toBe(204);
		expect(calls).toHaveLength(2);
	});

	it('returns the refusal when the admin cancels', async () => {
		answers = [json(403, STEP_UP)];
		stop = answerPrompt(false);
		const res = await apiFetchAuth('/admin/users/2', { method: 'DELETE' });
		expect(res.status).toBe(403);
		expect(calls).toHaveLength(1);
	});

	it('does not prompt for other refusals or for the step-up call itself', async () => {
		answers = [json(403, { message: 'Forbidden' }), json(403, STEP_UP)];
		stop = answerPrompt(true);
		expect((await apiFetchAuth('/admin/users/2', { method: 'DELETE' })).status).toBe(403);
		expect((await apiFetchAuth(STEP_UP_PATH, { method: 'POST' })).status).toBe(403);
		expect(calls).toHaveLength(2);
		expect(pendingStepUp.current).toBeNull();
	});
});
