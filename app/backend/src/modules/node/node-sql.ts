import type { SqlRunner } from '../../common/sql';

/**
 * Every hand-written SQL statement on the `nodes` table lives here, and nowhere else (a test enforces
 * it: see `__tests__/no-raw-nodes-sql.spec.ts`). Raw SQL does not get TypeORM's soft-delete filter, so
 * each function says whether it sees trashed rows. Anything that can use the repository or a query
 * builder should, because they hide trashed nodes by themselves.
 */

const CHUNK = 500;
const MAX_TREE_DEPTH = 64;
const marks = (n: number) => Array(n).fill('?').join(',');
function chunks<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Condition for a query builder over `node` with the parameter `:uid`: the node is at or below a
 * project the user owns or was granted (directly or via a team), or below a personal top-level task
 * they created or are assigned to. Same rules as NodeAccessService.level(); any depth; cycle-safe.
 * Trashed rows are skipped on the way down, so a trashed subtree never grants anything.
 */
export const VISIBLE_TO_USER_SQL = `node.id IN (
  WITH RECURSIVE tree (id) AS (
    SELECT p.id FROM nodes p
     WHERE p.deletedAt IS NULL AND ((p.type = 'project' AND (
              p.ownerId = :uid
              OR EXISTS (SELECT 1 FROM project_users pu WHERE pu.projectId = p.id AND pu.userId = :uid)
              OR EXISTS (SELECT 1 FROM project_teams pt JOIN team_members tm ON tm.teamId = pt.teamId
                          WHERE pt.projectId = p.id AND tm.userId = :uid)))
        OR (p.type = 'task' AND p.parentId IS NULL AND (
              p.createdBy = :uid
              OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.nodeId = p.id AND ta.userId = :uid))))
    UNION
    SELECT c.id FROM nodes c JOIN tree t ON c.parentId = t.id WHERE c.type <> 'idea' AND c.deletedAt IS NULL
  )
  SELECT id FROM tree
)`;

/** Which rows a subtree walk follows: only live ones, all of them (trashed too), or those trashed at exactly this moment. */
export type SubtreeScope = 'live' | 'all' | Date;

/** The given nodes and everything below them (ideas are not part of a subtree). Cycle-safe, any depth. */
export async function subtreeIds(q: SqlRunner, roots: number[], scope: SubtreeScope): Promise<number[]> {
  const all = new Set<number>(roots);
  const cond = scope === 'live' ? 'deletedAt IS NULL' : scope === 'all' ? '1 = 1' : 'deletedAt = ?';
  let frontier = [...roots];
  while (frontier.length) {
    const next: number[] = [];
    for (const part of chunks(frontier)) {
      const params = scope instanceof Date ? [scope, ...part] : part;
      const rows = await q<{ id: number }>(
        `SELECT id FROM nodes WHERE type <> 'idea' AND ${cond} AND parentId IN (${marks(part.length)})`,
        params,
      );
      for (const r of rows) {
        if (!all.has(r.id)) {
          all.add(r.id);
          next.push(r.id);
        }
      }
    }
    frontier = next;
  }
  return [...all];
}

/** Done tasks at any depth below the given nodes (live rows only: it is a cycle of a repeating task). */
export async function doneTaskIdsBelow(q: SqlRunner, parentIds: number[]): Promise<number[]> {
  const rows = await q<{ id: number }>(
    `WITH RECURSIVE tree (id, depth) AS (
       SELECT id, 1 FROM nodes WHERE deletedAt IS NULL AND parentId IN (${marks(parentIds.length)})
       UNION
       SELECT n.id, t.depth + 1 FROM nodes n JOIN tree t ON n.parentId = t.id
        WHERE n.deletedAt IS NULL AND t.depth < ${MAX_TREE_DEPTH}
     )
     SELECT n.id FROM nodes n JOIN tree ON tree.id = n.id WHERE n.type = 'task' AND n.status = 'done'`,
    parentIds,
  );
  return rows.map((r) => r.id);
}

export async function reopen(q: SqlRunner, ids: number[]): Promise<void> {
  for (const part of chunks(ids)) {
    await q(`UPDATE nodes SET status = 'open', percentDone = 0 WHERE id IN (${marks(part.length)})`, part);
  }
}

/** Put the (live) nodes in the trash, all with the same moment. */
export async function markTrashed(q: SqlRunner, ids: number[], at: Date, by: number | null): Promise<void> {
  for (const part of chunks(ids)) {
    await q(`UPDATE nodes SET deletedAt = ?, deletedBy = ? WHERE deletedAt IS NULL AND id IN (${marks(part.length)})`, [
      at,
      by,
      ...part,
    ]);
  }
}

export async function unmarkTrashed(q: SqlRunner, ids: number[]): Promise<void> {
  for (const part of chunks(ids)) {
    await q(`UPDATE nodes SET deletedAt = NULL, deletedBy = NULL WHERE id IN (${marks(part.length)})`, part);
  }
}

/** Ids of nodes that went to the trash before `cutoff`. */
export async function trashedBefore(q: SqlRunner, cutoff: Date, limit: number): Promise<number[]> {
  const rows = await q<{ id: number }>('SELECT id FROM nodes WHERE deletedAt < ? ORDER BY id LIMIT ?', [cutoff, limit]);
  return rows.map((r) => r.id);
}

/** Remove the rows for good (trashed or not). Callers delete what hangs off them first. */
export async function deleteNodes(q: SqlRunner, ids: number[]): Promise<void> {
  for (const part of chunks(ids)) await q(`DELETE FROM nodes WHERE id IN (${marks(part.length)})`, part);
}

export interface TrashRow {
  id: number;
  type: 'task' | 'project';
  name: string | null;
  title: string | null;
  parentId: number | null;
  deletedAt: Date;
  deletedBy: number | null;
  deletedByName: string | null;
}

/**
 * Candidates for a user's trash: the top of each deleted set (its parent is live, or was trashed at
 * another moment) that the user deleted, created or owns, or that sits directly in a live project
 * they belong to. The caller still checks access per row.
 */
export async function trashRoots(q: SqlRunner, userId: number, limit: number): Promise<TrashRow[]> {
  return q<TrashRow>(
    `SELECT n.id, n.type, n.name, n.title, n.parentId, n.deletedAt, n.deletedBy, u.username AS deletedByName
       FROM nodes n
       LEFT JOIN users u ON u.id = n.deletedBy
       LEFT JOIN nodes p ON p.id = n.parentId
      WHERE n.deletedAt IS NOT NULL AND n.type <> 'idea'
        AND (p.id IS NULL OR p.deletedAt IS NULL OR p.deletedAt <> n.deletedAt)
        AND (n.deletedBy = ? OR n.ownerId = ? OR n.createdBy = ?
             OR (p.type = 'project' AND p.deletedAt IS NULL AND (
                   p.ownerId = ?
                   OR EXISTS (SELECT 1 FROM project_users pu WHERE pu.projectId = p.id AND pu.userId = ?)
                   OR EXISTS (SELECT 1 FROM project_teams pt JOIN team_members tm ON tm.teamId = pt.teamId
                               WHERE pt.projectId = p.id AND tm.userId = ?))))
      ORDER BY n.deletedAt DESC, n.id DESC
      LIMIT ?`,
    [userId, userId, userId, userId, userId, userId, limit],
  );
}

// ---- account export and deletion: these see trashed rows on purpose (it is all the user's data)

/** Projects the user owns and their personal (top-level) tasks, trashed ones included. */
export async function ownedRootIds(q: SqlRunner, userId: number): Promise<number[]> {
  const rows = await q<{ id: number }>(
    `SELECT id FROM nodes
      WHERE (type = 'project' AND ownerId = ?) OR (type = 'task' AND createdBy = ? AND parentId IS NULL)`,
    [userId, userId],
  );
  return rows.map((r) => r.id);
}

export async function rowsByIds(q: SqlRunner, ids: number[]): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (const part of chunks(ids)) {
    out.push(...(await q(`SELECT * FROM nodes WHERE id IN (${marks(part.length)}) ORDER BY id`, part)));
  }
  return out;
}

export function createdBy(q: SqlRunner, userId: number): Promise<{ id: number }[]> {
  return q<{ id: number }>('SELECT * FROM nodes WHERE createdBy = ? ORDER BY id', [userId]);
}

export async function deleteIdeasOf(q: SqlRunner, userId: number): Promise<void> {
  await q("DELETE FROM nodes WHERE type = 'idea' AND createdBy = ?", [userId]);
}

/** Shared work a deleted user created in other people's projects stays, without an author. */
export async function anonymizeCreator(q: SqlRunner, userId: number): Promise<void> {
  await q('UPDATE nodes SET createdBy = NULL WHERE createdBy = ?', [userId]);
}
