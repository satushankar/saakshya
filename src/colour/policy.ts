/**
 * Classification policy ratios (TRD §5.6).
 *
 * These are NOT colour thresholds. They are fractions of the reference card's
 * own minimum pairwise ΔE00, which is computed from the card at runtime. The
 * actual thresholds therefore scale with whatever card is in use:
 *
 *   T_REJECT = REJECT_RATIO × minPairwise  — farther than this from every
 *              reference means "no reference match".
 *   M_MARGIN = MARGIN_RATIO × minPairwise  — nearest and runner-up closer
 *              together than this means "ambiguous".
 */
export const REJECT_RATIO = 0.5;
export const MARGIN_RATIO = 0.25;

/**
 * After white balance the grey patch should be neutral. If its linear channels
 * spread by more than this, the capture is flagged low-confidence (not refused).
 */
export const GREY_NEUTRAL_TOLERANCE = 0.03;
