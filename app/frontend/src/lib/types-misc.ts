import type { Permission, SessionInfo, Team, TeamMember, TeamRole, UserSummary } from './types';

export type { Team, TeamMember, ProjectMember, Label, SessionInfo, ApiTokenInfo, WebhookInfo } from './types';

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

/** GET /favorites rows. */
export interface FavoriteRow {
	id: number;
	entityType: 'project' | 'task';
	entityId: number;
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

/** GET /user/settings/general */
export interface GeneralSettings {
	name?: string | null;
	language?: string;
	timezone?: string;
	theme?: string;
	defaultProjectId?: number | null;
}

/** GET and PUT /user/settings/avatar(/upload) */
export interface AvatarSettings {
	avatarUrl?: string | null;
}
