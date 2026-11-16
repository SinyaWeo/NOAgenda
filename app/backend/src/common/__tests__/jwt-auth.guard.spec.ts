import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserRole } from '../../modules/user/user-role.enum';

const guard = new JwtAuthGuard(new Reflector());
const ctx = (method: string, roles?: UserRole[]) => {
  class C {}
  const handler = function h() {};
  if (roles) Reflect.defineMetadata('roles', roles, handler);
  return {
    getHandler: () => handler,
    getClass: () => C,
    switchToHttp: () => ({ getRequest: () => ({ method }) }),
  } as any;
};
const token = (scope: 'read' | 'write') => ({
  userId: 1,
  role: UserRole.USER,
  viaApiToken: true,
  apiTokenScope: scope,
});

describe('JwtAuthGuard.handleRequest', () => {
  it('rejects a missing user', () => {
    expect(() => guard.handleRequest(null, false, null, ctx('GET'))).toThrow(UnauthorizedException);
  });
  it('lets an interactive session do anything', () => {
    const u = { userId: 1, role: UserRole.ADMIN };
    expect(guard.handleRequest(null, u, null, ctx('DELETE', [UserRole.ADMIN]))).toBe(u);
  });
  it('a read-only token may read but never change anything', () => {
    for (const m of ['GET', 'HEAD', 'OPTIONS'])
      expect(() => guard.handleRequest(null, token('read'), null, ctx(m))).not.toThrow();
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE'])
      expect(() => guard.handleRequest(null, token('read'), null, ctx(m))).toThrow(ForbiddenException);
  });
  it('a read-write token may change data', () => {
    for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
      expect(() => guard.handleRequest(null, token('write'), null, ctx(m))).not.toThrow();
  });
  it('a token with an unknown scope is treated as read-only', () => {
    expect(() => guard.handleRequest(null, { ...token('write'), apiTokenScope: 'admin' }, null, ctx('POST'))).toThrow(
      ForbiddenException,
    );
  });
  it('no token can reach an admin route, even a read-write token of an admin', () => {
    const t = { ...token('write'), role: UserRole.ADMIN };
    expect(() => guard.handleRequest(null, t, null, ctx('GET', [UserRole.ADMIN]))).toThrow(/interactive login/);
  });
});
