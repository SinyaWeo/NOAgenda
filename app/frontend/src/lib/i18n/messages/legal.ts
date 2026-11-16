import type { Message } from '../core';

// Messages for the "legal" area. Keys are prefixed "legal." (see ../README.md).
// Only the page chrome is translated; the Terms and Privacy bodies are operator-supplied English templates.
export const en = {
	'legal.terms.title': 'Terms of Service',
	'legal.privacy.title': 'Privacy Policy',
	'legal.lastUpdated': 'Last updated {date}',
	'legal.englishOnlyNote': 'The full text is provided in English.'
} as const;

export const cs: Record<keyof typeof en, Message> = {
	'legal.terms.title': 'Podmínky použití',
	'legal.privacy.title': 'Zásady ochrany soukromí',
	'legal.lastUpdated': 'Naposledy aktualizováno {date}',
	'legal.englishOnlyNote': 'Úplné znění je k dispozici v angličtině.'
};
