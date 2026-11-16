import { describe, expect, it } from 'vitest';
import type { Message } from './core';
import { cs, en } from './messages';

const placeholders = (m: Message): string[] => {
	const texts = typeof m === 'string' ? [m] : Object.values(m);
	return [...new Set(texts.flatMap((t) => [...t.matchAll(/\{(\w+)\}/g)].map((x) => x[1])))].sort();
};
const keys = Object.keys(en) as (keyof typeof en)[];

describe('message catalogs', () => {
	it('English and Czech have exactly the same keys', () => {
		expect(Object.keys(cs).sort()).toEqual([...keys].sort());
	});

	it('no message is empty', () => {
		for (const k of keys) {
			for (const [lang, cat] of [['en', en], ['cs', cs]] as const) {
				const m = (cat as Record<string, Message>)[k];
				const texts = typeof m === 'string' ? [m] : Object.values(m);
				expect(texts.every((t) => t.trim().length > 0), `${lang}:${k} is empty`).toBe(true);
			}
		}
	});

	it('both languages use the same {placeholders} for every key', () => {
		for (const k of keys) {
			expect(placeholders((cs as Record<string, Message>)[k]), `placeholders of ${k}`).toEqual(placeholders((en as Record<string, Message>)[k]));
		}
	});

	it('plural messages define "other"; Czech ones define every form Czech needs', () => {
		for (const k of keys) {
			const e = (en as Record<string, Message>)[k];
			const c = (cs as Record<string, Message>)[k];
			if (typeof e !== 'string') expect(typeof e === 'object' && 'other' in e, `en:${k} needs "other"`).toBe(true);
			if (typeof c !== 'string') {
				expect(['one', 'few', 'many', 'other'].every((f) => f in c), `cs:${k} needs one/few/many/other`).toBe(true);
			}
		}
	});

	it('keys follow the "area.name" convention', () => {
		for (const k of keys) expect(/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/.test(k), k).toBe(true);
	});
});
