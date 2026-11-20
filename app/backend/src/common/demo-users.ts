import { UserRole } from '../modules/user/user-role.enum';

/**
 * The example accounts. `npm run seed` creates them and, when DEMO_MODE=true, the login page lists
 * them (with the password) so visitors of the public demo can sign in.
 */
export interface DemoUser {
  username: string;
  name: string;
  language: 'en' | 'cs';
  role?: UserRole;
}

export const DEMO_PASSWORD = 'password123';

export const DEMO_USERS: DemoUser[] = [
  { username: 'alice', name: 'Alice Novak', language: 'en', role: UserRole.ADMIN },
  { username: 'bob', name: 'Bob Svoboda', language: 'cs' },
  { username: 'carol', name: 'Carol Dvorak', language: 'en' },
  { username: 'dave', name: 'Dave Cerny', language: 'en' },
  { username: 'erin', name: 'Erin Prochazka', language: 'cs' },
];

export const isDemoMode = (env: NodeJS.ProcessEnv = process.env): boolean => env.DEMO_MODE === 'true';

/** What the login page shows; only ever returned when DEMO_MODE=true. */
export const demoUserList = () =>
  DEMO_USERS.map((u) => ({
    username: u.username,
    name: u.name,
    password: DEMO_PASSWORD,
    role: u.role ?? UserRole.USER,
  }));
