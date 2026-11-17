import { AppSettingsService, DEFAULT_APP_NAME } from '../app-settings.service';

function build(rows: { key: string; value: string }[] = []) {
  const repo: any = {
    find: jest.fn(async () => rows),
    findOne: jest.fn(async ({ where }: any) => rows.find((r) => r.key === where.key) ?? null),
    upsert: jest.fn(async () => undefined),
  };
  return { svc: new AppSettingsService(repo), repo };
}

describe('AppSettingsService', () => {
  it('getAll() maps rows to a key/value object', async () => {
    const { svc } = build([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ]);
    expect(await svc.getAll()).toEqual({ a: '1', b: '2' });
  });

  it('get() returns the value or null', async () => {
    const { svc } = build([{ key: 'a', value: '1' }]);
    expect(await svc.get('a')).toBe('1');
    expect(await svc.get('missing')).toBeNull();
  });

  it.each([
    [[], DEFAULT_APP_NAME],
    [[{ key: 'appName', value: '   ' }], DEFAULT_APP_NAME],
    [[{ key: 'appName', value: '  Acme  ' }], 'Acme'],
  ])('getAppName() %j -> %s', async (rows, expected) => {
    expect(await build(rows as any).svc.getAppName()).toBe(expected);
  });

  it('set() upserts on the key column', async () => {
    const { svc, repo } = build();
    await svc.set('k', 'v');
    expect(repo.upsert).toHaveBeenCalledWith({ key: 'k', value: 'v' }, ['key']);
  });

  it('setMany() upserts every entry', async () => {
    const { svc, repo } = build();
    await svc.setMany({ a: '1', b: '2' });
    expect(repo.upsert).toHaveBeenCalledTimes(2);
    expect(repo.upsert).toHaveBeenCalledWith({ key: 'b', value: '2' }, ['key']);
  });
});
