/** A shallow copy of `obj` without `keys` (e.g. dropping `password` before a user leaves the API). */
export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const copy: T = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
}
