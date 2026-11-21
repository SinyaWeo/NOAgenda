import { describe, expect, it } from 'vitest';
import { cs, en } from './i18n/messages';
import { TIMELINE } from './timeline';

describe('about timeline', () => {
	it('has unique ids and valid dates, newest first', () => {
		expect(new Set(TIMELINE.map((e) => e.id)).size).toBe(TIMELINE.length);
		for (const e of TIMELINE) expect(Number.isNaN(Date.parse(e.date)), e.id).toBe(false);
		const dates = TIMELINE.map((e) => e.date);
		expect(dates).toEqual([...dates].sort().reverse());
	});

	it('has English and Czech texts for every entry', () => {
		for (const e of TIMELINE) {
			for (const part of ['title', 'body']) {
				const key = `auth.about.timeline.${e.id}.${part}`;
				expect(key in en, `en:${key}`).toBe(true);
				expect(key in cs, `cs:${key}`).toBe(true);
			}
		}
	});
});
