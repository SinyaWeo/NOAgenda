import { describe, expect, it } from 'vitest';
import { fieldChanges, pluginName, pluginText, textKey } from './plugins';
import type { PluginFieldView } from './types-misc';

const fields: PluginFieldView[] = [
	{ key: 'url', kind: 'secret', value: null, isSet: true },
	{ key: 'format', kind: 'select', options: ['auto', 'slack'], value: 'auto' },
	{ key: 'note', kind: 'text', value: 'hi' }
];

describe('fieldChanges', () => {
	it('sends nothing for untouched fields, so a saved secret is kept', () => {
		expect(fieldChanges(fields, { url: '', format: 'auto', note: 'hi' }, new Set())).toEqual({});
	});
	it('sends a newly typed secret, changed values, and null for emptied or removed ones', () => {
		expect(fieldChanges(fields, { url: 'https://x', format: 'slack', note: '' }, new Set())).toEqual({
			url: 'https://x',
			format: 'slack',
			note: null
		});
		expect(fieldChanges(fields, { url: '' }, new Set(['url']))).toMatchObject({ url: null });
	});
});

describe('pluginText', () => {
	it('uses the catalog when it has the text, otherwise the registered fallback', () => {
		expect(textKey('chat-webhook')).toBe('chatWebhook');
		expect(pluginName({ key: 'chat-webhook', name: 'x' })).toBe('Chat webhook');
		expect(pluginText('plugins.someday.name', 'Someday plugin')).toBe('Someday plugin');
	});
});
