import { classify, type RefPatch, type Verdict } from './classify';
import { GREY_NEUTRAL_TOLERANCE } from './policy';
import { PATCH_UV, samplePatch, uvToRect, type ImageLike } from './sample';
import { linearRgbToLab, linearToSrgb } from './srgb';
import type { LinearRGB, Lab, RGB } from './types';
import { applyGains, computeGains, greyCheck, validateLighting, type LightingResult } from './whitebalance';

export interface Analysis {
  white_rgb: RGB;
  grey_rgb: RGB;
  gains: LinearRGB;
  reaction_lab: Lab;
  /** Balanced reaction colour back in sRGB 0–255, for display only. */
  reaction_rgb: RGB;
  /** Grey patch neutral after balancing. False = low-confidence capture. */
  greyOk: boolean;
  greySpread: number;
  verdict: Verdict;
}

/** Just the lighting gate, cheap enough to run on every preview frame. */
export function checkLighting(frame: ImageLike): { white: RGB; lighting: LightingResult } {
  const white = samplePatch(frame, uvToRect(PATCH_UV.white, frame.width, frame.height));
  return { white, lighting: validateLighting(white) };
}

/**
 * Full pipeline on a frame already cropped to the alignment rectangle:
 * sample → lighting gate → white balance → Lab → classify.
 * Returns result null when the lighting gate refuses the capture.
 */
export function analyseCard(frame: ImageLike, table: RefPatch[]): { lighting: LightingResult; result: Analysis | null } {
  const { white, lighting } = checkLighting(frame);
  if (!lighting.ok) return { lighting, result: null };

  const at = (uv: (typeof PATCH_UV)[keyof typeof PATCH_UV]) => samplePatch(frame, uvToRect(uv, frame.width, frame.height));
  const grey = at(PATCH_UV.grey);
  const reaction = at(PATCH_UV.reaction);
  const gains = computeGains(white);
  const balanced = applyGains(reaction, gains);
  const grey_check = greyCheck(applyGains(grey, gains), GREY_NEUTRAL_TOLERANCE);
  const reaction_lab = linearRgbToLab(balanced);

  return {
    lighting,
    result: {
      white_rgb: white,
      grey_rgb: grey,
      gains,
      reaction_lab,
      reaction_rgb: balanced.map((c) => Math.round(linearToSrgb(c) * 255)) as RGB,
      greyOk: grey_check.ok,
      greySpread: grey_check.spread,
      verdict: classify(reaction_lab, table),
    },
  };
}
