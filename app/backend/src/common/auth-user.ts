import type { Request } from 'express';
import { UserRole } from '../modules/user/user-role.enum';

/** What the 'jwt' passport strategy attaches to `req.user` (session JWT or API token). */
export interface AuthUser {
  userId: number;
  username: string;
  role: UserRole;
  sessionId?: number;
  apiTokenId?: number;
  apiTokenScope?: string;
  viaApiToken?: boolean;
}

/** An express request that has passed the global JWT guard. */
export type AuthRequest = Request & { user: AuthUser };

/** Set by UploadPrecheckGuard once the `taskId` query parameter has been validated. */
export type UploadRequest = AuthRequest & { uploadTaskId?: number };
