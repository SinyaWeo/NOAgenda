import type { Message } from '../../core';
import type { messages as en } from '../en/legal';

// Messages for the "legal" area. Keys are prefixed "legal." (see ../README.md).
export const messages: Record<keyof typeof en, Message> = {
	'legal.terms.title': 'Podmínky použití',
	'legal.privacy.title': 'Zásady ochrany soukromí',
	'legal.lastUpdated': 'Naposledy aktualizováno {date}',
	'legal.englishOnlyNote': 'Úplné znění je k dispozici v angličtině.'
};
