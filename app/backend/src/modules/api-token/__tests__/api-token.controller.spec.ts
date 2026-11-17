import 'reflect-metadata';
import { ApiTokenController } from '../api-token.controller';
import { NoApiTokenGuard } from '../../auth/no-api-token.guard';

function build() {
  const service: any = {
    findAll: jest.fn(async () => []),
    create: jest.fn(async () => ({ id: 1, rawToken: 'noa_x' })),
    remove: jest.fn(async () => undefined),
  };
  return { ctrl: new ApiTokenController(service), service };
}
const req = { user: { userId: 7 } };

describe('ApiTokenController', () => {
  it('cannot be used with an API token itself (NoApiTokenGuard)', () => {
    expect(Reflect.getMetadata('__guards__', ApiTokenController)).toContain(NoApiTokenGuard);
  });

  it('findAll is scoped to the caller', async () => {
    const { ctrl, service } = build();
    await ctrl.findAll(req);
    expect(service.findAll).toHaveBeenCalledWith(7);
  });

  it('create defaults scope to read and converts expiresAt to a Date', async () => {
    const { ctrl, service } = build();
    await ctrl.create({ name: 'a' } as any, req);
    expect(service.create).toHaveBeenCalledWith(7, 'a', 'read', undefined);
    await ctrl.create({ name: 'b', scope: 'write', expiresAt: '2030-01-01T00:00:00.000Z' } as any, req);
    expect(service.create).toHaveBeenLastCalledWith(7, 'b', 'write', new Date('2030-01-01T00:00:00.000Z'));
  });

  it('remove passes the caller id for ownership checks', async () => {
    const { ctrl, service } = build();
    await ctrl.remove(3, req);
    expect(service.remove).toHaveBeenCalledWith(3, 7);
  });
});
