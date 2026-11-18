import { NotFoundException } from '@nestjs/common';
import { ApiTokenService, API_TOKEN_PREFIX } from '../api-token.service';
import { sha256 } from '../../../common/tokens';
import type { Repository } from 'typeorm';
import type { ApiToken } from '../api-token.entity';
import { asMock } from '../../../common/__tests__/test-utils';

function build() {
  const repo = {
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(async () => ({})),
    update: jest.fn(async () => ({})),
    create: jest.fn((x: Record<string, unknown>) => x),
    save: jest.fn(async (x: Record<string, unknown>) => ({ id: 5, createdAt: new Date(0), ...x })),
    manager: { query: jest.fn() },
  };
  return { svc: new ApiTokenService(asMock<Repository<ApiToken>>(repo)), repo };
}

describe('ApiTokenService', () => {
  it('findAll scopes to the user and never returns the hash', async () => {
    const { svc, repo } = build();
    repo.find.mockResolvedValue([{ id: 1, userId: 3, name: 'n', token: 'HASH' }]);
    const res = await svc.findAll(3);
    expect(repo.find.mock.calls[0][0].where).toEqual({ userId: 3 });
    expect(res).toEqual([{ id: 1, userId: 3, name: 'n' }]);
    expect(JSON.stringify(res)).not.toContain('HASH');
  });

  describe('create', () => {
    it('returns the raw token once and stores only its hash', async () => {
      const { svc, repo } = build();
      const res = await svc.create(3, 'ci', 'write', new Date(1000));
      expect(res.rawToken.startsWith(API_TOKEN_PREFIX)).toBe(true);
      const stored = repo.create.mock.calls[0][0];
      expect(stored.token).toBe(sha256(res.rawToken));
      expect(stored.token).not.toBe(res.rawToken);
      expect(stored.tokenPrefix).toBe(res.rawToken.slice(0, 8));
      expect(stored).toMatchObject({ userId: 3, name: 'ci', scope: 'write', expiresAt: new Date(1000) });
      expect((res as { token?: string }).token).toBeUndefined();
    });

    it('defaults to read scope and generates unique tokens', async () => {
      const { svc, repo } = build();
      const a = await svc.create(1, 'a');
      const b = await svc.create(1, 'b');
      expect(repo.create.mock.calls[0][0].scope).toBe('read');
      expect(a.rawToken).not.toBe(b.rawToken);
    });
  });

  describe('remove', () => {
    it('deletes only a token owned by the user', async () => {
      const { svc, repo } = build();
      repo.findOne.mockResolvedValue({ id: 4 });
      await svc.remove(4, 3);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 4, userId: 3 } });
      expect(repo.delete).toHaveBeenCalledWith(4);
    });
    it("404s (and does not delete) for someone else's token", async () => {
      const { svc, repo } = build();
      repo.findOne.mockResolvedValue(null);
      await expect(svc.remove(4, 9)).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe('authenticate', () => {
    const row = { id: 2, username: 'ann', role: 'user', tokenId: 8, scope: 'write', lastUsedAt: null };

    it('rejects tokens without the prefix without querying', async () => {
      const { svc, repo } = build();
      expect(await svc.authenticate('eyJjwt')).toBeNull();
      expect(repo.manager.query).not.toHaveBeenCalled();
    });

    it('looks up by hash, not raw value, with an expiry date param', async () => {
      const { svc, repo } = build();
      repo.manager.query.mockResolvedValue([]);
      expect(await svc.authenticate('noa_abc')).toBeNull();
      const [sql, params] = repo.manager.query.mock.calls[0];
      expect(sql).toContain('expiresAt');
      expect(params[0]).toBe(sha256('noa_abc'));
      expect(params[1]).toBeInstanceOf(Date);
    });

    it('returns the user and records first use', async () => {
      const { svc, repo } = build();
      repo.manager.query.mockResolvedValue([{ ...row }]);
      expect(await svc.authenticate('noa_abc')).toEqual({
        id: 2,
        username: 'ann',
        role: 'user',
        tokenId: 8,
        scope: 'write',
      });
      expect(repo.update).toHaveBeenCalledWith(8, { lastUsedAt: expect.any(Date) });
    });

    it('throttles lastUsedAt updates to once a minute', async () => {
      const { svc, repo } = build();
      repo.manager.query.mockResolvedValue([{ ...row, lastUsedAt: new Date(Date.now() - 5_000) }]);
      await svc.authenticate('noa_abc');
      expect(repo.update).not.toHaveBeenCalled();
      repo.manager.query.mockResolvedValue([{ ...row, lastUsedAt: new Date(Date.now() - 120_000) }]);
      await svc.authenticate('noa_abc');
      expect(repo.update).toHaveBeenCalledTimes(1);
    });

    it('treats any unknown scope value as read (least privilege)', async () => {
      const { svc, repo } = build();
      repo.manager.query.mockResolvedValue([{ ...row, scope: 'admin', lastUsedAt: new Date() }]);
      expect((await svc.authenticate('noa_abc'))?.scope).toBe('read');
    });
  });
});
