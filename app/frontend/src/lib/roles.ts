import type { User, TeamMember, TeamRole } from './types';

export function isAdmin(user: User | null | undefined): boolean {
	return user?.role === 'admin';
}

/** The user's role inside one team (from its member list), or null when they are not a member. */
export function teamRoleOf(
	user: User | null | undefined,
	members: Pick<TeamMember, 'role' | 'user'>[]
): TeamRole | null {
	if (!user) return null;
	return members.find((m) => m.user?.id === user.id)?.role ?? null;
}

/** Managers run their own team; the app admin runs every team. */
export function canManageTeam(
	user: User | null | undefined,
	members: Pick<TeamMember, 'role' | 'user'>[]
): boolean {
	return isAdmin(user) || teamRoleOf(user, members) === 'manager';
}
