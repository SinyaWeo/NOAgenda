import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opt a route out of the global authentication guard. Every route is protected unless it
 * carries this decorator, so a forgotten guard can no longer expose an endpoint. Keep the
 * list short: see the allow-list in common/__tests__/public-routes.spec.ts.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
