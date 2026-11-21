import { UserRole } from '../modules/user/user-role.enum';

/**
 * The example accounts. `npm run seed` creates them and, when DEMO_MODE=true, the login page lists
 * them (with the password) so visitors of the public demo can sign in.
 */
export interface DemoUser {
  username: string;
  name: string;
  language: 'en' | 'cs';
  /** App-wide role; omitted means a regular user. */
  role?: UserRole;
  /** Role inside the user's team (the admin belongs to no team). */
  teamRole?: 'manager' | 'member';
}

export const DEMO_PASSWORD = 'password123';

/** 1 app admin, 3 team managers (one team each) and 6 members (two per team). */
export const DEMO_USERS: DemoUser[] = [
  { username: 'alice', name: 'Alice Novak', language: 'en', role: UserRole.ADMIN },
  { username: 'bob', name: 'Bob Svoboda', language: 'cs', teamRole: 'manager' },
  { username: 'carol', name: 'Carol Dvorak', language: 'en', teamRole: 'manager' },
  { username: 'dave', name: 'Dave Cerny', language: 'en', teamRole: 'manager' },
  { username: 'erin', name: 'Erin Prochazka', language: 'cs', teamRole: 'member' },
  { username: 'frank', name: 'Frank Vesely', language: 'en', teamRole: 'member' },
  { username: 'grace', name: 'Grace Horakova', language: 'en', teamRole: 'member' },
  { username: 'heidi', name: 'Heidi Kralova', language: 'cs', teamRole: 'member' },
  { username: 'ivan', name: 'Ivan Pokorny', language: 'en', teamRole: 'member' },
  { username: 'judy', name: 'Judy Marek', language: 'cs', teamRole: 'member' },
];

export const isDemoMode = (env: NodeJS.ProcessEnv = process.env): boolean => env.DEMO_MODE === 'true';

/** What the login page shows; only ever returned when DEMO_MODE=true. */
export const demoUserList = () =>
  DEMO_USERS.map((u) => ({
    username: u.username,
    name: u.name,
    password: DEMO_PASSWORD,
    role: u.role ?? UserRole.USER,
    teamRole: u.teamRole ?? null,
  }));
