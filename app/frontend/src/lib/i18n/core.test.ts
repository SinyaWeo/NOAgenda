import { describe, expect, it } from 'vitest';
import { detectLocale, format, isLocale } from './core';

describe('format', () => {
	it('fills {name} placeholders and leaves unknown ones visible', () => {
		expect(format('en', 'Hello {name}', { name: 'Ann' })).toBe('Hello Ann');
		expect(format('en', 'Hello {name}', {})).toBe('Hello {name}');
		expect(format('en', 'Plain')).toBe('Plain');
	});

	it('picks English plural forms', () => {
		const m = { one: '{count} task', other: '{count} tasks' };
		expect(format('en', m, { count: 1 })).toBe('1 task');
		expect(format('en', m, { count: 0 })).toBe('0 tasks');
		expect(format('en', m, { count: 5 })).toBe('5 tasks');
	});

	it('picks Czech plural forms: 1 / 2-4 / fractions / 5+', () => {
		const m = { one: '{count} úkol', few: '{count} úkoly', many: '{count} úkolu', other: '{count} úkolů' };
		expect(format('cs', m, { count: 1 })).toBe('1 úkol');
		expect(format('cs', m, { count: 2 })).toBe('2 úkoly');
		expect(format('cs', m, { count: 4 })).toBe('4 úkoly');
		expect(format('cs', m, { count: 5 })).toBe('5 úkolů');
		expect(format('cs', m, { count: 0 })).toBe('0 úkolů');
		expect(format('cs', m, { count: 1.5 })).toBe('1.5 úkolu');
	});

	it('falls back to "other" when a form is missing', () => {
		expect(format('cs', { other: '{count}×' }, { count: 3 })).toBe('3×');
	});
});

describe('locale helpers', () => {
	it('detects Czech and English from the browser language list, in order of preference', () => {
		expect(detectLocale(['cs-CZ', 'en-US'])).toBe('cs');
		expect(detectLocale(['de-DE', 'en-GB'])).toBe('en');
		expect(detectLocale(['de-DE', 'cs'])).toBe('cs');
	});
	it('defaults to English when nothing matches or nothing is known', () => {
		expect(detectLocale(['fr-FR'])).toBe('en');
		expect(detectLocale([])).toBe('en');
		expect(detectLocale(undefined)).toBe('en');
	});
	it('isLocale only accepts supported codes', () => {
		expect(isLocale('cs')).toBe(true);
		expect(isLocale('en')).toBe(true);
		expect(isLocale('de')).toBe(false);
		expect(isLocale(null)).toBe(false);
	});
});
