import type { MessageKey } from '$lib/i18n';
import type { RelationKind } from '$lib/types';

export const RELATION_KINDS: RelationKind[] = [
	'related',
	'subtask',
	'blocks',
	'blocked_by',
	'duplicate_of',
	'duplicated_by'
];

/** Message key for the option label of a relation kind in the "add relation" select. */
export function relationKindKey(kind: RelationKind): MessageKey {
	return `tasks.relationKind.${kind}` as MessageKey;
}

/** How a relation reads from the point of view of the task being viewed (a message key: translate it with $t). */
const OUTGOING: Record<RelationKind, MessageKey> = {
	related: 'tasks.relation.related',
	subtask: 'tasks.relation.subtaskOf',
	blocks: 'tasks.relation.blocks',
	blocked_by: 'tasks.relation.blockedBy',
	duplicate_of: 'tasks.relation.duplicateOf',
	duplicated_by: 'tasks.relation.duplicatedBy'
};
const INCOMING: Record<RelationKind, MessageKey> = {
	related: 'tasks.relation.related',
	subtask: 'tasks.relation.parentOf',
	blocks: 'tasks.relation.blockedBy',
	blocked_by: 'tasks.relation.blocks',
	duplicate_of: 'tasks.relation.duplicatedBy',
	duplicated_by: 'tasks.relation.duplicateOf'
};

export function relationLabel(kind: RelationKind, incoming: boolean): MessageKey {
	return (incoming ? INCOMING : OUTGOING)[kind] ?? 'tasks.relation.related';
}

/** A future cycle of a repeating task, from GET /tasks/occurrences. Read-only: the task row holds only its current cycle. */
export interface TaskOccurrence {
	taskId: number;
	title: string | null;
	dueDate: string;
	startDate: string | null;
	status: 'open' | 'in_progress' | 'done' | null;
	priority: number | null;
	projectId: number | null;
}
