import type { Permission, SessionInfo, Team, TeamMember, TeamRole, UserSummary } from './types';

export type { Team, TeamMember, ProjectMember, Label, SessionInfo, ApiTokenInfo, WebhookInfo } from './types';

/** A private note (GET /ideas): the creator's own, or one shared with the viewer through a team. */
export interface Idea {
	id: number;
	text: string;
	createdAt: string;
	isMine: boolean;
	owner: { id: number; username: string; name: string | null } | null;
	/** Omitted (null) when the viewer cannot read the project. */
	project: { id: number; name: string } | null;
	/** Teams it is shared with; only reported to its creator. */
	sharedTeamIds: number[];
}

/** GET /ideas/trash items. */
export interface IdeaTrashEntry {
	id: number;
	text: string;
	deletedAt: string;
	/** When it will be deleted for good. */
	purgeAt: string;
}

/** GET /teams items; `members` is only present when the backend joined them. */
/** A team with its members, as the app admin sees every team. */
export interface AdminTeam extends Team {
	members: { id: number; role: TeamRole; user: UserSummary }[];
}

export interface TeamWithMembers extends Team {
	members?: TeamMember[];
}

/** GET /projects/:id/teams rows. */
export interface ProjectTeamMember {
	id: number;
	permission: Permission;
	team?: Team;
}

/** GET /info */
export interface AppInfo {
	name?: string;
	version?: string;
}

/** POST /tokens: the raw token is only returned once. */
export interface CreatedApiToken {
	rawToken?: string;
}

export type { UserSummary };

/** GET /user/sessions rows (SessionInfo plus the expiry the backend adds). */
export interface SessionRow extends SessionInfo {
	expiresAt?: string | null;
}

/** GET and PUT /user/settings/avatar(/upload) */
export interface AvatarSettings {
	avatarUrl?: string | null;
}

/** A one-line dashboard note (GET /notes). */
export interface Note {
	id: number;
	text: string;
	done: boolean;
	doneAt: string | null;
	position: number;
	createdAt: string;
}

export type NoteTarget = 'project' | 'task' | 'idea';

/** A plugin setting as the API shows it; a secret never comes back, only whether it is set. */
export interface PluginFieldView {
	key: string;
	kind: 'text' | 'secret' | 'select';
	required?: boolean;
	options?: string[];
	default?: string;
	maxLength?: number;
	value: string | null;
	isSet?: boolean;
}

/** GET /admin/plugins */
export interface AdminPlugin {
	key: string;
	name: string;
	description: string;
	enabled: boolean;
	hasUserSettings: boolean;
	isChannel: boolean;
	fields: PluginFieldView[];
}

/** The notification types a channel can carry (same list as the backend). */
export const NOTIFICATION_TYPES = [
	'task_assigned',
	'task_comment',
	'task_reminder',
	'project_added',
	'project_transferred',
	'project_transferred_away'
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** GET /user/plugins: the signed-in user's own settings for one enabled plugin. */
export interface UserPlugin {
	key: string;
	name: string;
	description: string;
	isChannel: boolean;
	configured: boolean;
	enabled: boolean;
	types: NotificationType[];
	fields: PluginFieldView[];
	lastDeliveryAt: string | null;
	lastError: string | null;
}
