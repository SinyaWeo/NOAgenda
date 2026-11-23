import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Raw SQL does not get TypeORM's soft-delete filter, so a hand-written statement on `nodes` silently
 * includes trashed nodes. All of it therefore lives in node-sql.ts, where each function says whether
 * it sees the trash. Use the repository or a query builder anywhere else: they hide trashed nodes by
 * themselves.
 */
const ALLOWED = ['modules/node/node-sql.ts'];
const SRC = join(__dirname, '..', '..', '..');
const SKIP = new Set(['migrations', '__tests__']);
const RAW_ON_NODES = /\b(?:FROM|JOIN|UPDATE|INTO)\s+`?nodes\b`?/i;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return SKIP.has(name) ? [] : sources(path);
    return name.endsWith('.ts') && !name.endsWith('.spec.ts') ? [path] : [];
  });
}

describe('raw SQL on the nodes table', () => {
  it('appears only in node-sql.ts', () => {
    const offenders = sources(SRC)
      .map((f) => relative(SRC, f).split(sep).join('/'))
      .filter((f) => !ALLOWED.includes(f))
      .filter((f) => RAW_ON_NODES.test(readFileSync(join(SRC, f), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the pattern catches the usual spellings', () => {
    for (const sql of ['SELECT * FROM nodes', 'join nodes n', 'UPDATE `nodes` SET', 'INSERT INTO nodes (a)']) {
      expect(RAW_ON_NODES.test(sql)).toBe(true);
    }
    expect(RAW_ON_NODES.test('SELECT * FROM node_revisions')).toBe(false);
  });
});
