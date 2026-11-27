import { en, type MessageKey } from '#lib/i18n/messages/index.js';
import { t } from '#lib/i18n/index.js';
import type { PluginFieldView } from '#lib/types-misc.js';

/** The catalog segment of a plugin key: `chat-webhook` -> `chatWebhook` (catalog keys have no dashes). */
export const textKey = (pluginKey: string) =>
	pluginKey.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/**
 * Texts of a built-in plugin live in the catalog under `plugins.<camelCased key>.*`. A plugin added on the server
 * without frontend texts still shows something: the English text it registered with.
 */
export function pluginText(key: string, fallback: string): string {
	return key in en ? t(key as MessageKey) : fallback;
}

export const pluginName = (p: { key: string; name: string }) =>
	pluginText(`plugins.${textKey(p.key)}.name`, p.name);
export const pluginDescription = (p: { key: string; description: string }) =>
	pluginText(`plugins.${textKey(p.key)}.description`, p.description);
export const fieldLabel = (plugin: string, f: Pick<PluginFieldView, 'key'>) =>
	pluginText(`plugins.${textKey(plugin)}.field.${f.key}.label`, f.key);
export const fieldHelp = (plugin: string, f: Pick<PluginFieldView, 'key'>) =>
	pluginText(`plugins.${textKey(plugin)}.field.${f.key}.help`, '');
export const optionLabel = (plugin: string, f: Pick<PluginFieldView, 'key'>, option: string) =>
	pluginText(`plugins.${textKey(plugin)}.field.${f.key}.option.${option}`, option);

/**
 * The changes to send for a field form: only what the user touched. A secret is sent when a new value
 * was typed (or it was explicitly removed); left empty, it keeps the saved one.
 */
export function fieldChanges(
	fields: PluginFieldView[],
	draft: Record<string, string>,
	cleared: ReadonlySet<string>
): Record<string, string | null> {
	const out: Record<string, string | null> = {};
	for (const f of fields) {
		const v = draft[f.key] ?? '';
		if (f.kind === 'secret') {
			if (v) out[f.key] = v;
			else if (cleared.has(f.key)) out[f.key] = null;
		} else if (v !== (f.value ?? '')) {
			out[f.key] = v === '' ? null : v;
		}
	}
	return out;
}
