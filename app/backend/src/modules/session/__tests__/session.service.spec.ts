import { UnauthorizedException } from '@nestjs/common';
import { SessionService } from '../session.service';
import { Repository } from 'typeorm';
import { UserSession } from '../session.entity';
import { asMock } from '../../../common/__tests__/test-utils';
import { sha256 } from '../../../common/tokens';

/** Minimal in-memory stand-in for the TypeORM repository. */
function fakeRepo() {
  type Row = Record<string, unknown> & { id?: number; createdAt?: Date; updatedAt?: Date };
  const rows: Row[] = [];
  let seq = 1;
  const matches = (r: Row, where: Row) => Object.entries(where).every(([k, v]) => r[k] === v);
  return {
    rows,
    create: (x: Row) => ({ ...x }),
    save: jest.fn(async (x: Row) => {
      if (!x.id) {
        x.id = seq++;
        x.createdAt = new Date();
        rows.push(x);
      }
      x.updatedAt = new Date();
      return x;
    }),
    // Like a real database, hand out copies: two concurrent readers must not share one object.
    findOne: jest.fn(async ({ where }: { where: Row }) => {
      const r = rows.find((x) => matches(x, where));
      return r ? { ...r } : null;
    }),
    update: jest.fn(async (where: Row, set: Row) => {
      let affected = 0;
      for (const r of rows)
        if (matches(r, where)) {
          Object.assign(r, set);
          affected++;
        }
      return { affected };
    }),
    delete: jest.fn(async (where: number | Row) => {
      const w: Row = typeof where === 'number' ? { id: where } : where;
      for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], w)) rows.splice(i, 1);
    }),
  };
}

const make = () => {
  const repo = fakeRepo();
  return { repo, svc: new SessionService(asMock<Repository<UserSession>>(repo)) };
};

describe('SessionService refresh-token rotation', () => {
  it('stores only the hash of the refresh token', async () => {
    const { repo, svc } = make();
    const { refreshToken } = await svc.create(1, { userAgent: 'UA', ip: '1.1.1.1' });
    expect(repo.rows[0].tokenHash).toBe(sha256(refreshToken));
    expect(JSON.stringify(repo.rows)).not.toContain(refreshToken);
  });

  it('rotates: the new token works, the old one is remembered, ids stay stable', async () => {
    const { repo, svc } = make();
    const first = await svc.create(1);
    const second = await svc.rotate(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.session.id).toBe(first.session.id);
    expect(repo.rows[0].prevTokenHash).toBe(sha256(first.refreshToken));
    await expect(svc.rotate(second.refreshToken!)).resolves.toBeDefined();
  });

  it('replaying an old token right after rotation is treated as a parallel request (no logout)', async () => {
    const { svc } = make();
    const first = await svc.create(1);
    await svc.rotate(first.refreshToken);
    const raced = await svc.rotate(first.refreshToken);
    expect(raced.refreshToken).toBeNull();
  });

  it('replaying an old token later means theft: the whole session is revoked', async () => {
    const { repo, svc } = make();
    const first = await svc.create(1);
    const second = await svc.rotate(first.refreshToken);
    repo.rows[0].rotatedAt = new Date(Date.now() - 60_000); // outside the grace window
    await expect(svc.rotate(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repo.rows).toHaveLength(0);
    await expect(svc.rotate(second.refreshToken!)).rejects.toBeInstanceOf(UnauthorizedException); // thief AND victim are out
  });

  it('two parallel rotations: exactly one wins, the loser does not overwrite it', async () => {
    const { repo, svc } = make();
    const first = await svc.create(1);
    const [a, b] = await Promise.all([svc.rotate(first.refreshToken), svc.rotate(first.refreshToken)]);
    const winners = [a, b].filter((r) => r.refreshToken !== null);
    expect(winners).toHaveLength(1);
    expect(repo.rows[0].tokenHash).toBe(sha256(winners[0].refreshToken!)); // the winner's token is the live one
  });

  it('rejects unknown tokens and expired sessions', async () => {
    const { repo, svc } = make();
    await expect(svc.rotate('nope')).rejects.toBeInstanceOf(UnauthorizedException);
    const s = await svc.create(1);
    repo.rows[0].expiresAt = new Date(Date.now() - 1000);
    await expect(svc.rotate(s.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repo.rows).toHaveLength(0);
  });

  it('revoking by refresh token ends the session', async () => {
    const { repo, svc } = make();
    const s = await svc.create(1);
    await svc.revokeByRefreshToken(s.refreshToken);
    expect(repo.rows).toHaveLength(0);
  });
});
