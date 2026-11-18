import type { EntityManager } from 'typeorm';

export type SqlParam = string | number | boolean | Date | null;

/** Runs raw SQL and returns the rows as `R` (name the columns you select, e.g. `q<{ id: number }>(...)`). */
export type SqlRunner = <R extends object = Record<string, unknown>>(sql: string, params?: SqlParam[]) => Promise<R[]>;

/** Wrap a manager/data source so raw queries come back typed instead of `any`. */
export function sqlRunner(source: Pick<EntityManager, 'query'>): SqlRunner {
  return <R extends object>(sql: string, params: SqlParam[] = []) => source.query<R[]>(sql, params);
}
