import { writable } from 'svelte/store';

/** The open step-up prompt (rendered once by `StepUpDialog.svelte`); `resolve(true)` after a successful step-up. */
export const pendingStepUp = writable<{ resolve: (ok: boolean) => void } | null>(null);

let inFlight: Promise<boolean> | null = null;

/**
 * Ask the admin to re-enter their password (step-up login, needed for admin changes). Resolves `true`
 * once the server accepted it, `false` when they cancelled. Requests that need it at the same time share
 * one prompt.
 */
export function requestStepUp(): Promise<boolean> {
	inFlight ??= new Promise<boolean>((resolve) => pendingStepUp.set({ resolve })).finally(() => {
		inFlight = null;
	});
	return inFlight;
}

/** The server's answer when an admin change needs a step-up first. */
export async function needsStepUp(res: Response): Promise<boolean> {
	if (res.status !== 403) return false;
	try {
		const body = (await res.clone().json()) as { code?: unknown };
		return body?.code === 'STEP_UP_REQUIRED';
	} catch {
		return false;
	}
}
