import 'reflect-metadata';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/** Collect every *.controller.ts under src (the app is default-deny, so we only list the exceptions). */
function controllerFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== '__tests__') controllerFiles(p, out); }
    else if (/\.controller\.ts$/.test(name)) out.push(p);
  }
  return out;
}

function publicRoutes(): string[] {
  const routes: string[] = [];
  for (const file of controllerFiles(join(__dirname, '..', '..'))) {
    const mod = require(file);
    for (const cls of Object.values<any>(mod).filter((v) => typeof v === 'function')) {
      const prefix = Reflect.getMetadata(PATH_METADATA, cls);
      if (prefix === undefined) continue; // not a controller
      const classPublic = !!Reflect.getMetadata(IS_PUBLIC_KEY, cls);
      for (const key of Object.getOwnPropertyNames(cls.prototype)) {
        const handler = cls.prototype[key];
        const method = Reflect.getMetadata(METHOD_METADATA, handler);
        if (method === undefined) continue;
        if (classPublic || Reflect.getMetadata(IS_PUBLIC_KEY, handler)) {
          const sub = Reflect.getMetadata(PATH_METADATA, handler);
          const path = `/${[prefix, sub].filter((x) => x && x !== '/').join('/')}`;
          routes.push(`${RequestMethod[method]} ${path}`);
        }
      }
    }
  }
  return routes.sort();
}

describe('public routes (everything else needs a session or API token)', () => {
  it('is exactly this allow-list: adding an open endpoint must be a conscious decision', () => {
    expect(publicRoutes()).toEqual([
      'GET /',
      'GET /auth/config',
      'GET /health',
      'GET /info',
      'GET /quotes/random',
      'POST /auth/email/resend',
      'POST /auth/email/verify',
      'POST /auth/login',
      'POST /auth/logout',
      'POST /auth/password/reset',
      'POST /auth/password/token',
      'POST /auth/refresh',
      'POST /users',
    ]);
  });
});
