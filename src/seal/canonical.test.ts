import { describe, expect, it } from 'vitest';
import { canonicalJSON } from './canonical';

describe('canonicalJSON', () => {
  it('produces byte-exact output for a fixed input', () => {
    const input = {
      z: 1,
      a: { y: [3, 1.5, -0.123456], b: null, u: undefined },
      m: 'Café',
      f: 2.0,
      n: 80.0925,
      t: true,
    };
    expect(canonicalJSON(input)).toBe(
      '{"a":{"b":null,"y":[3,1.5000,-0.1235]},"f":2,"m":"Café","n":80.0925,"t":true,"z":1}',
    );
  });

  it('is independent of key insertion order', () => {
    expect(canonicalJSON({ b: 1, a: 2 })).toBe(canonicalJSON({ a: 2, b: 1 }));
  });

  it('NFC-normalises strings so composed and decomposed forms match', () => {
    expect(canonicalJSON('é')).toBe(canonicalJSON('é'));
  });

  it('escapes quotes and control characters', () => {
    expect(canonicalJSON('a"b\n')).toBe('"a\\"b\\n"');
  });

  it('rejects non-finite numbers', () => {
    expect(() => canonicalJSON({ x: NaN })).toThrow();
    expect(() => canonicalJSON(Infinity)).toThrow();
  });
});
