import type { AuthRequest, AuthUser } from '../auth-user';
import { UserRole } from '../../modules/user/user-role.enum';

/** A hand-rolled collaborator: every method is a jest mock. Pass it on through `asMock<T>()`. */
export type Mocks = Record<string, jest.Mock>;

/** Hand a partial mock to code that expects the real type `T` (the one deliberate, typed cast tests need). */
export function asMock<T>(partial: object): T {
  return partial as unknown as T;
}

/** An authenticated request as the controllers see it. */
export function authReq(userId = 2, over: Partial<AuthUser> = {}): AuthRequest {
  const user: AuthUser = { userId, username: `user${userId}`, role: UserRole.USER, ...over };
  return asMock<AuthRequest>({ user });
}

/** A value of the wrong type, for tests that feed invalid input to a typed API on purpose. */
export function invalid<T>(value: unknown): T {
  return value as T;
}
