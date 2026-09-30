/**
 * The one and only serialiser for sealed payloads (rule R4).
 * Used by both the signing path and the verification path.
 *
 * - keys sorted lexicographically, recursively
 * - no whitespace
 * - integers plain, all other numbers fixed to 4 decimal places
 * - null preserved, undefined keys omitted
 * - strings NFC-normalised
 */
export function canonicalJSON(value: unknown): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'number':
      if (!Number.isFinite(value)) throw new Error(`canonicalJSON: non-finite number ${value}`);
      return Number.isInteger(value) ? String(value) : value.toFixed(4);
    case 'string':
      return JSON.stringify(value.normalize('NFC'));
    case 'boolean':
      return value ? 'true' : 'false';
    case 'object': {
      if (Array.isArray(value)) return `[${value.map((v) => canonicalJSON(v === undefined ? null : v)).join(',')}]`;
      const obj = value as Record<string, unknown>;
      const parts = Object.keys(obj)
        .filter((k) => obj[k] !== undefined)
        .sort()
        .map((k) => `${JSON.stringify(k.normalize('NFC'))}:${canonicalJSON(obj[k])}`);
      return `{${parts.join(',')}}`;
    }
    default:
      throw new Error(`canonicalJSON: unsupported type ${typeof value}`);
  }
}
