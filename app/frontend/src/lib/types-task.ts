import type { RelationKind } from '$lib/types';

export const RELATION_KINDS: RelationKind[] = [
	'related',
	'subtask',
	'blocks',
	'blocked_by',
	'duplicate_of',
	'duplicated_by',
];

/** How a relation reads from the point of view of the task being viewed. */
const OUTGOING: Record<RelationKind, string> = {
	related: 'related to',
	subtask: 'subtask of',
	blocks: 'blocks',
	blocked_by: 'blocked by',
	duplicate_of: 'duplicate of',
	duplicated_by: 'duplicated by',
};
const INCOMING: Record<RelationKind, string> = {
	related: 'related to',
	subtask: 'parent of',
	blocks: 'blocked by',
	blocked_by: 'blocks',
	duplicate_of: 'duplicated by',
	duplicated_by: 'duplicate of',
};

export function relationLabel(kind: RelationKind, incoming: boolean): string {
	return (incoming ? INCOMING : OUTGOING)[kind] ?? kind.replace(/_/g, ' ');
}
