export type UserRole = 'user' | 'admin';

export interface User {
	id: number;
	username: string;
	email: string;
	name?: string;
	role: UserRole;
	language?: string;
	timezone?: string;
	theme?: string;
	defaultProjectId?: number | null;
	avatarUrl?: string;
	isEmailConfirmed: boolean;
	isDeletionRequested: boolean;
	deletionScheduledAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface Team {
	id: number;
	name: string;
	description?: string;
	ownerId?: number;
	createdAt: string;
	updatedAt: string;
}

export interface Quote {
	id: number;
	text: string;
	author?: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// API shapes. These mirror what the backend returns, so pages can be typed instead of `any`.
// ---------------------------------------------------------------------------

export type NodeType = 'project' | 'task';
export type NodeStatus = 'open' | 'in_progress' | 'done';
export type Permission = 'read' | 'write' | 'admin';
export type ViewType = 'list' | 'kanban' | 'table' | 'gantt' | 'timeline' | 'mindmap';
export type RelationKind = 'subtask' | 'blocks' | 'blocked_by' | 'related' | 'duplicate_of' | 'duplicated_by';
export type TokenScope = 'read' | 'write';

/** A project or a task (they share one table; `type` tells them apart). */
export interface Node {
	id: number;
	type: NodeType;
	/** Projects use `name`, tasks use `title`. */
	name?: string;
	title?: string;
	description?: string | null;
	status?: NodeStatus | null;
	priority?: number | null;
	percentDone?: number | null;
	dueDate?: string | null;
	startDate?: string | null;
	repeatAfter?: number | null;
	repeatMode?: string | null;
	position?: number | null;
	isArchived?: boolean;
	ownerId?: number | null;
	createdBy?: number | null;
	parentId?: number | null;
	bucketId?: number | null;
	/** Present on GET /tasks/:id and GET /nodes/:id. */
	parent?: Node | null;
	children?: Node[];
	createdAt: string;
	updatedAt: string;
}
export type Task = Node;
export type Project = Node;

/** The few public fields of another user (never email or hash). */
export interface UserSummary {
	id: number;
	username: string;
	name?: string | null;
	avatarUrl?: string | null;
}

export interface Comment {
	id: number;
	content: string;
	author?: UserSummary;
	createdAt: string;
}

export interface Attachment {
	id: number;
	filename: string;
	uploader?: UserSummary;
	createdAt: string;
}

export interface Reminder {
	id: number;
	reminderDate: string;
	/** When the notification went out; null while it is still pending. */
	sentAt?: string | null;
}

export interface TaskRelation {
	id: number;
	kind: RelationKind;
	node?: Node;
	relatedNode?: Node;
}

export interface Label {
	id: number;
	title: string;
	color?: string | null;
}

export interface TaskLabel {
	id: number;
	label?: Label;
}

export interface TaskAssignee {
	id: number;
	user?: UserSummary;
}

export interface TeamMember {
	id: number;
	user?: UserSummary;
	team?: Team;
}

export interface ProjectMember {
	id: number;
	permission: Permission;
	user?: UserSummary;
}

export interface ProjectView {
	id: number;
	title: string;
	viewType: ViewType;
}

export interface KanbanBucket {
	id: number;
	title: string;
	position: number;
	limit?: number | null;
}

export type NotificationType = 'task_assigned' | 'task_comment' | 'project_added' | 'task_reminder';

export interface AppNotification {
	id: number;
	message: string;
	read: boolean;
	createdAt: string;
	/** Set for system-generated notifications; the text is then built from `params` in the user's language. */
	type?: NotificationType | null;
	/** The task or project it is about. */
	nodeId?: number | null;
	/** JSON: { actor, title, kind }. */
	params?: string | null;
}

export interface SearchResults {
	tasks: Node[];
	projects: Node[];
}

export interface SessionInfo {
	id: number;
	userAgent?: string;
	ipAddress?: string;
	createdAt: string;
	lastUsedAt?: string;
	current: boolean;
}

export interface ApiTokenInfo {
	id: number;
	name: string;
	tokenPrefix?: string;
	scope: TokenScope;
	expiresAt?: string | null;
	lastUsedAt?: string | null;
	createdAt: string;
}

export interface WebhookInfo {
	id: number;
	url: string;
	event: string;
	active: boolean;
	hasSecret?: boolean;
	projectId?: number | null;
	/** Latest delivery: HTTP status (null if none came), error text, time; and the failure streak. */
	lastStatus?: number | null;
	lastError?: string | null;
	lastDeliveryAt?: string | null;
	failureCount?: number;
}

/** What a saved filter stores (validated by the backend; see FilterCriteriaDto). */
export type DuePreset = 'overdue' | 'today' | 'week' | 'month' | 'none';
export interface FilterCriteria {
	status?: NodeStatus;
	priority?: number;
	projectId?: number;
	search?: string;
	due?: DuePreset;
	hideDone?: boolean;
}
export interface SavedFilter {
	id: number;
	name: string;
	description?: string | null;
	filters?: FilterCriteria | null;
}
