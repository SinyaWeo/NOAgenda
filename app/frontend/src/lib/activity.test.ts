import { describe, expect, it } from 'vitest';
import { translate } from '$lib/i18n/translate';
import type { MessageKey, Params } from '$lib/i18n';
import type { ActivityEntry } from '$lib/types';
import { changeLines, describeActivity } from './activity';

const en = (key: MessageKey, params?: Params) => translate('en', key, params);
const cs = (key: MessageKey, params?: Params) => translate('cs', key, params);
const date = (v: string) => v.slice(0, 10);

const entry = (over: Partial<ActivityEntry>): ActivityEntry => ({
	id: 1,
	createdAt: '2026-11-22T10:00:00Z',
	action: 'task.updated',
	nodeId: 5,
	nodeType: 'task',
	nodeTitle: 'Write docs',
	projectId: 10,
	actor: { id: 2, username: 'alice' },
	changes: null,
	...over
});

describe('describeActivity', () => {
	it('names the actor and the item', () => {
		expect(describeActivity(entry({ action: 'task.created' }), en)).toBe('alice created task “Write docs”');
	});

	it('survives a deleted user and an untitled item', () => {
		const e = entry({
			action: 'project.created',
			nodeType: 'project',
			nodeTitle: null,
			actor: { id: null, username: null }
		});
		expect(describeActivity(e, en)).toBe('Unknown created project “untitled”');
	});

	it('reads archive, restore and move as such', () => {
		const archived = entry({ changes: { isArchived: { from: false, to: true } } });
		const restored = entry({ changes: { isArchived: { from: true, to: false } } });
		const moved = entry({ changes: { parentId: { from: 1, to: 2 } } });
		expect(describeActivity(archived, en)).toBe('alice archived task “Write docs”');
		expect(describeActivity(restored, en)).toBe('alice restored task “Write docs”');
		expect(describeActivity(moved, en)).toBe('alice moved task “Write docs”');
	});

	it('says what went with a deleted item, with plurals in both languages', () => {
		const e = (n: number) =>
			entry({ action: 'project.deleted', nodeType: 'project', changes: { descendants: { from: n, to: 0 } } });
		expect(describeActivity(e(0), en)).toBe('alice deleted project “Write docs”');
		expect(describeActivity(e(1), en)).toBe('alice deleted project “Write docs” and 1 item in it');
		expect(describeActivity(e(4), en)).toBe('alice deleted project “Write docs” and 4 items in it');
		expect(describeActivity(e(3), cs)).toContain('3 položky');
		expect(describeActivity(e(7), cs)).toContain('7 položek');
	});

	it('describes assignee, label, relation and attachment changes', () => {
		const a = (from: string | null, to: string | null) =>
			entry({ action: 'task.assignee_changed', changes: { assignee: { from, to } } });
		expect(describeActivity(a(null, 'bob'), en)).toBe('alice assigned “Write docs” to bob');
		expect(describeActivity(a('ann', 'bob'), en)).toBe('alice reassigned “Write docs” from ann to bob');
		expect(describeActivity(a('ann', null), en)).toBe('alice unassigned ann from “Write docs”');
		expect(
			describeActivity(
				entry({ action: 'task.label_changed', changes: { label: { from: null, to: 'Bug' } } }),
				en
			)
		).toBe('alice added label Bug to “Write docs”');
		expect(
			describeActivity(
				entry({
					action: 'task.relation_changed',
					changes: { relation: { from: null, to: { kind: 'blocks', taskId: 9, title: 'Deploy' } } }
				}),
				en
			)
		).toBe('alice added to “Write docs” the relation: blocks “Deploy”');
		expect(
			describeActivity(
				entry({ action: 'task.attachment_changed', changes: { attachment: { from: 'a.pdf', to: null } } }),
				en
			)
		).toBe('alice removed attachment a.pdf from “Write docs”');
	});

	it('falls back to a generic sentence for an unknown action', () => {
		expect(describeActivity(entry({ action: 'task.teleported' }), en)).toBe('alice changed “Write docs”');
	});
});

describe('changeLines', () => {
	it('shows field by field what changed, translating states and dates', () => {
		const e = entry({
			changes: {
				status: { from: 'open', to: 'done' },
				priority: { from: 1, to: 3 },
				dueDate: { from: null, to: '2026-12-01T00:00:00.000Z' },
				description: { from: 'a', to: 'b' }
			}
		});
		expect(changeLines(e, en, date)).toEqual([
			'Status: Open → Done',
			'Priority: Low → High',
			'Due date: — → 2026-12-01',
			'Description changed'
		]);
	});

	it('folds the repeat settings into one line and has none for archive or move', () => {
		const e = entry({
			changes: { repeatMode: { from: 'default', to: 'weekly' }, repeatAfter: { from: 1, to: 2 } }
		});
		expect(changeLines(e, en, date)).toEqual(['Repeat changed']);
		expect(changeLines(entry({ changes: { isArchived: { from: false, to: true } } }), en, date)).toEqual([]);
		expect(changeLines(entry({ action: 'task.created' }), en, date)).toEqual([]);
	});
});
