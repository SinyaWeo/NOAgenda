/**
 * Who operates this installation, shown on the Terms and Privacy pages.
 * Set at BUILD time (VITE_OPERATOR_NAME, VITE_CONTACT_EMAIL). Until they are set the
 * pages show a "template" banner, because the texts need to be completed and reviewed.
 */
export const OPERATOR_NAME: string = (import.meta.env.VITE_OPERATOR_NAME as string) || '';
export const CONTACT_EMAIL: string = (import.meta.env.VITE_CONTACT_EMAIL as string) || '';
export const LEGAL_CONFIGURED = !!OPERATOR_NAME && !!CONTACT_EMAIL;
export const LAST_UPDATED = '2026-11-15';
