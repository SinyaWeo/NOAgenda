import type { User, Team } from './types';

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin';
}

export function isTeamOwner(user: User | null | undefined, teams: Team[]): boolean {
  if (!user) return false;
  return teams.some((t) => t.ownerId === user.id);
}

export function ownsTeam(user: User | null | undefined, team: Team): boolean {
  if (!user) return false;
  return team.ownerId === user.id;
}
