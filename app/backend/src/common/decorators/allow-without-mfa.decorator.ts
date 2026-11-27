import { SetMetadata } from '@nestjs/common';

export const ALLOW_WITHOUT_MFA_KEY = 'allowWithoutMfa';

/**
 * The route stays usable by someone who must set up two-factor authentication and has not yet: the setup
 * itself and what the UI needs to show it (see MfaEnrollmentGuard). Keep the list short.
 */
export const AllowWithoutMfa = () => SetMetadata(ALLOW_WITHOUT_MFA_KEY, true);
