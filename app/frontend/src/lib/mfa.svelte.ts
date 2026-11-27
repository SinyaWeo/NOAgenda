/**
 * The signed-in account must set up two-factor authentication before it can use the app (an admin setting
 * or one of its teams requires it). Set from `/users/me` and whenever the API answers
 * `MFA_ENROLLMENT_REQUIRED`; the root layout then shows only the setup. `mfaGate.current`.
 */
export const mfaGate = $state<{ current: boolean }>({ current: false });

/** The server's answer when the account has to set up 2FA first. */
export async function needsMfaEnrollment(res: Response): Promise<boolean> {
	if (res.status !== 403) return false;
	try {
		const body = (await res.clone().json()) as { code?: unknown };
		return body?.code === 'MFA_ENROLLMENT_REQUIRED';
	} catch {
		return false;
	}
}

/** Recovery codes as a text file (a heading line, then one code per line), for saving them. */
export function recoveryCodesFile(heading: string, codes: string[]): Blob {
	return new Blob([`${heading}\n\n${codes.join('\n')}\n`], { type: 'text/plain' });
}
