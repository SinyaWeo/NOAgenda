const IGNORED = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'position',
  'createdBy',
  'ownerId',
  'type',
  'parent',
  'children',
]);
const MAX_TEXT = 200;

export type FieldChanges = Record<string, { from: unknown; to: unknown }>;

/** Dates (or date strings from the API) compare by instant; null and undefined are the same. */
function comparable(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? value : t;
  }
  return value;
}

function shown(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.length > MAX_TEXT) return value.slice(0, MAX_TEXT) + '…';
  return value;
}

/** The fields of `change` that differ from `before`: `{ field: { from, to } }`. Long text is shortened for display only. */
export function diffFields(before: object, change: object): FieldChanges {
  const out: FieldChanges = {};
  const old = before as Record<string, unknown>;
  for (const [key, value] of Object.entries(change as Record<string, unknown>)) {
    if (IGNORED.has(key) || value === undefined) continue;
    const a = comparable(old[key]);
    const b = comparable(value);
    if (a !== b && JSON.stringify(a) !== JSON.stringify(b)) out[key] = { from: shown(old[key]), to: shown(value) };
  }
  return out;
}
