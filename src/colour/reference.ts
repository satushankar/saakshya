import type { RefPatch } from './classify';
import { hexToRgb, rgbToLab } from './srgb';

export interface ReferenceSwatch {
  /** Single-letter code printed on the card. */
  code: 'A' | 'O' | 'B' | 'P' | 'K';
  key: string;
  name: string;
  hex: string;
  substance: string;
}

/**
 * Reagent reference strip, left to right (TRD §3).
 *
 * These are DESIGN-GRADE REPRESENTATIONS of documented reagent reactions, not
 * spectrophotometric measurements (docs/RULES.md R10). The printed card is the
 * ground truth: once printed, measure each patch and replace these values.
 */
export const REFERENCE_SWATCHES: readonly ReferenceSwatch[] = [
  { code: 'A', key: 'blank-amber', name: 'Blank amber', hex: '#E0C877', substance: 'no reaction' },
  { code: 'O', key: 'amphet-orange', name: 'Amphetamine orange', hex: '#D4631F', substance: 'amphetamine-type' },
  { code: 'B', key: 'scott-blue', name: 'Scott blue', hex: '#2D6CB8', substance: 'cocaine' },
  { code: 'P', key: 'marquis-purple', name: 'Marquis purple', hex: '#7B34A6', substance: 'opiates' },
  { code: 'K', key: 'reaction-black', name: 'Reaction black', hex: '#241029', substance: 'MDMA-type / strong' },
];

/** Reference table in Lab, ready for `classify`. */
export const referenceTable = (): RefPatch[] =>
  REFERENCE_SWATCHES.map(({ key, substance, hex }) => ({ key, substance, lab: rgbToLab(hexToRgb(hex)) }));
