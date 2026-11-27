/** A tiny in-memory stand-in for a TypeORM repository: enough for the plugin services' queries. */
type Row = Record<string, unknown> & { id: number };

const matches = (row: Row, where: Record<string, unknown>) =>
  Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && '_type' in v && (v as { _type: string })._type === 'in') {
      return ((v as unknown as { _value: unknown[] })._value ?? []).includes(row[k]);
    }
    return row[k] === v;
  });

export function fakeRepo<T extends Row>(initial: Partial<T>[] = []) {
  let next = 1;
  const rows: T[] = initial.map((r) => ({ createdAt: new Date(), ...r, id: r.id ?? next++ }) as unknown as T);
  next = Math.max(next, ...rows.map((r) => r.id + 1));
  const where = (w: unknown): ((r: T) => boolean) => {
    if (!w) return () => true;
    const list = Array.isArray(w) ? w : [w];
    return (r) => list.some((x) => matches(r, x as Record<string, unknown>));
  };
  return {
    rows,
    find: jest.fn(async (opts: { where?: unknown } = {}) => rows.filter(where(opts.where)).map((r) => ({ ...r }))),
    findOneBy: jest.fn(async (w: unknown) => {
      const r = rows.find(where(w));
      return r ? { ...r } : null;
    }),
    create: jest.fn((data: Partial<T>) => ({ ...data }) as T),
    save: jest.fn(async (data: Partial<T>) => {
      const row = { createdAt: new Date(), ...data, id: next++ } as unknown as T;
      rows.push(row);
      return { ...row };
    }),
    update: jest.fn(async (criteria: number | Record<string, unknown>, data: Partial<T>) => {
      for (const r of rows.filter(typeof criteria === 'number' ? (x) => x.id === criteria : where(criteria)))
        Object.assign(r, data);
      return { affected: 1 };
    }),
    delete: jest.fn(async (criteria: Record<string, unknown>) => {
      for (const r of rows.filter(where(criteria))) rows.splice(rows.indexOf(r), 1);
      return { affected: 1 };
    }),
  };
}
