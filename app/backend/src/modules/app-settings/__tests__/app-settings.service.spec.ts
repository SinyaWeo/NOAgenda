import type { Repository } from 'typeorm';
import { AppSettingsService, DEFAULT_APP_NAME } from '../app-settings.service';
import type { AppSetting } from '../app-setting.entity';
import { asMock } from '../../../common/__tests__/test-utils';

function build(rows: { key: string; value: string }[] = []) {
  const repo = {
    find: jest.fn(async () => rows),
    findOne: jest.fn(async ({ where }: { where: { key: string } }) => rows.find((r) => r.key === where.key) ?? null),
    upsert: jest.fn(async () => undefined),
  };
  return { svc: new AppSettingsService(asMock<Repository<AppSetting>>(repo)), repo };
}

describe('AppSettingsService', () => {
  it('singleUserMode() reads the flag once per cache window and again after clearModeCache()', async () => {
    const rows = [{ key: 'singleUserMode', value: 'true' }];
    const { svc, repo } = build(rows);
    expect(await svc.singleUserMode()).toBe(true);
    rows[0].value = 'false';
    expect(await svc.singleUserMode()).toBe(true); // cached
    expect(repo.findOne).toHaveBeenCalledTimes(1);
    svc.clearModeCache();
    expect(await svc.singleUserMode()).toBe(false);
  });

  it('singleUserMode() is off when unset', async () => {
    expect(await build().svc.singleUserMode()).toBe(false);
  });

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
    expect(await build(rows).svc.getAppName()).toBe(expected);
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
