import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classify } from './classify';
import { referenceTable } from './reference';
import { hexToRgb, rgbToLab } from './srgb';

// The printable test sheet (public/print.html) states an expected verdict under each swatch.
// These must match what the classifier actually returns, or the sheet makes a false claim.
const SHEET: [hex: string, verdict: string, substance?: string][] = [
  ['#7B34A6', 'POSITIVE', 'opiates'],
  ['#2D6CB8', 'POSITIVE', 'cocaine'],
  ['#D4631F', 'POSITIVE', 'amphetamine-type'],
  ['#E0C877', 'NEGATIVE'],
  ['#5450AF', 'INCONCLUSIVE'],
  ['#3AA655', 'INCONCLUSIVE'],
];

describe('printable test sheet', () => {
  it.each(SHEET)('%s classifies as %s', (hex, verdict, substance) => {
    const v = classify(rgbToLab(hexToRgb(hex)), referenceTable());
    expect(v.verdict).toBe(verdict);
    if (substance) expect(v.nearest.substance).toBe(substance);
  });

  it('green is refused as no reference match', () => {
    expect(classify(rgbToLab(hexToRgb('#3AA655')), referenceTable()).reason).toBe('no reference match');
  });

  it('every swatch in the sheet is covered by this test', () => {
    const html = readFileSync('public/print.html', 'utf8');
    const hexes = [...html.matchAll(/class="sw" style="background:(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase());
    expect(hexes.sort()).toEqual(SHEET.map(([h]) => h).sort());
  });
});
