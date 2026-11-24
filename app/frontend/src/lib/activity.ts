import type { MessageKey, Params } from '$lib/i18n';
import type { ActivityEntry } from '$lib/types';

/** `$t` (in a component) or `tr` (anywhere else), so these helpers stay pure and testable. */
export type Translate = (key: MessageKey, params?: Params) => string;

const k = (key: string) => key as MessageKey;

type Change = { from: unknown; to: unknown };

function isChange(v: unknown): v is Change {
	return typeof v === 'object' && v !== null && 'from' in v && 'to' in v;
}

function change(e: ActivityEntry, field: string): Change | null {
	const c = e.changes?.[field];
	return isChange(c) ? c : null;
}

function text(v: unknown): string {
	return typeof v === 'string' ? v : v == null ? '' : String(v);
}

/** One sentence: who did what to which task or project. Names come from the entry itself, so they survive deletions. */
export function describeActivity(e: ActivityEntry, t: Translate): string {
	const actor = e.actor.username ?? t('common.unknown');
	const title = e.nodeTitle ?? t('activity.untitled');
	const base: Params = { actor, title };
	const say = (key: string, extra: Params = {}) => t(k(`activity.action.${key}`), { ...base, ...extra });
	const type = e.nodeType;
	const keys = Object.keys(e.changes ?? {});

	switch (e.action) {
		case `${type}.created`:
			return say(`${type}.created`);
		case `${type}.updated`: {
			if (keys.length === 1 && keys[0] === 'isArchived') {
				return say(`${type}.${change(e, 'isArchived')?.to ? 'archived' : 'restored'}`);
			}
			if (keys.length === 1 && keys[0] === 'parentId') return say(`${type}.moved`);
			return say(`${type}.updated`);
		}
		case `${type}.restored`:
			return say(`${type}.undeleted`);
		case `${type}.deleted`: {
			const n = Number(change(e, 'descendants')?.from ?? 0);
			return n > 0 ? say(`${type}.deletedWith`, { count: n }) : say(`${type}.deleted`);
		}
		case 'comment.created':
		case 'comment.updated':
		case 'comment.deleted':
			return say(e.action);
		case 'task.assignee_changed': {
			const c = change(e, 'assignee');
			const from = text(c?.from) || t('common.unknown');
			const to = text(c?.to) || t('common.unknown');
			if (!c?.from) return say('assignee.set', { to });
			if (!c.to) return say('assignee.cleared', { from });
			return say('assignee.changed', { from, to });
		}
		case 'project.owner_changed': {
			const c = change(e, 'owner');
			return say('owner.changed', {
				from: text(c?.from) || t('common.unknown'),
				to: text(c?.to) || t('common.unknown')
			});
		}
		case 'task.label_changed': {
			const c = change(e, 'label');
			return c?.to
				? say('label.added', { label: text(c.to) })
				: say('label.removed', { label: text(c?.from) });
		}
		case 'task.relation_changed': {
			const c = change(e, 'relation');
			const added = !!c?.to;
			const rel = (added ? c?.to : c?.from) as
				{ kind?: string; taskId?: number; title?: string | null } | undefined;
			return say(added ? 'relation.added' : 'relation.removed', {
				kind: rel?.kind ? t(k(`tasks.relationKind.${rel.kind}`)) : '',
				other: rel?.title ?? `#${rel?.taskId ?? ''}`
			});
		}
		case 'task.attachment_changed': {
			const c = change(e, 'attachment');
			return c?.to
				? say('attachment.added', { file: text(c.to) })
				: say('attachment.removed', { file: text(c?.from) });
		}
		default:
			return say('unknown');
	}
}

const DATE_FIELDS = new Set(['dueDate', 'startDate', 'repeatUntil']);
const TEXT_FIELDS = new Set(['description']);
const KNOWN_FIELDS = new Set([
	'title',
	'name',
	'description',
	'status',
	'priority',
	'dueDate',
	'startDate',
	'percentDone',
	'parentId',
	'isArchived',
	'bucketId'
]);

function fieldKey(field: string): string {
	return field.startsWith('repeat') ? 'repeat' : field;
}

function valueText(field: string, v: unknown, t: Translate, dateTime: (v: string) => string): string {
	if (v == null || v === '') return t('activity.noValue');
	if (field === 'status') return t(k(`common.status.${text(v)}`));
	if (field === 'priority') return t(k(`common.priority.${text(v)}`));
	if (DATE_FIELDS.has(field)) return dateTime(text(v));
	if (field === 'percentDone') return `${text(v)} %`;
	if (field === 'parentId') return `#${text(v)}`;
	return text(v);
}

/** The field-by-field details of an edit ("Priority: Low → High"). Empty for entries that say it all in the sentence. */
export function changeLines(e: ActivityEntry, t: Translate, dateTime: (v: string) => string): string[] {
	if (e.action === 'project.owner_changed') {
		const reason = text(e.changes?.reason);
		return reason ? [t('activity.reason', { reason })] : [];
	}
	if (!e.action.endsWith('.updated') || !e.changes) return [];
	const keys = Object.keys(e.changes);
	if (keys.length === 1 && (keys[0] === 'isArchived' || keys[0] === 'parentId')) return [];
	const lines: string[] = [];
	const seen = new Set<string>();
	for (const [field, value] of Object.entries(e.changes)) {
		if (!isChange(value)) continue;
		const label = fieldKey(field);
		if (seen.has(label)) continue; // several repeat* fields read as one line
		const name = KNOWN_FIELDS.has(label) || label === 'repeat' ? t(k(`activity.field.${label}`)) : label;
		if (TEXT_FIELDS.has(field) || label === 'repeat') {
			seen.add(label);
			lines.push(t('activity.valueChanged', { field: name }));
			continue;
		}
		lines.push(
			t('activity.change', {
				field: name,
				from: valueText(field, value.from, t, dateTime),
				to: valueText(field, value.to, t, dateTime)
			})
		);
	}
	return lines;
}
