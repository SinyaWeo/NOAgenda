import { SetMetadata } from '@nestjs/common';

export const MULTI_USER_ONLY_KEY = 'multiUserOnly';

/**
 * The route (or every route of the controller) is about other people: teams, sharing, assignees, user
 * pickers. In single-user mode it answers 403 (see SingleUserModeGuard).
 */
export const MultiUserOnly = () => SetMetadata(MULTI_USER_ONLY_KEY, true);
