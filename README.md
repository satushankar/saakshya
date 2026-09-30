# Saakshya — field drug-test companion

SIH26231 · Narcotics Control Bureau · prototype

Saakshya works alongside the colorimetric field-test kits officers already carry. It photographs the
test strip on a printed reference card, corrects for lighting using the card, classifies the reaction
by colour arithmetic, and seals the result on the device into a tamper-evident, signed record that
anyone can verify later.

## What it does

1. **Capture** — guided alignment frame; the shutter is disabled while the white patch is clipped,
   too dark, or colour-cast.
2. **Measure** — per-channel white balance from the card, sRGB → CIE Lab (D65), CIEDE2000 distance to
   every reference patch.
3. **Classify** — thresholds are derived at runtime from the card's own minimum pairwise ΔE
   (reject = ½, margin = ¼). Nothing is tuned. Too far from every reference, or too close between
   two, is sealed as **INCONCLUSIVE**.
4. **Seal on the device** — SHA-256 of the exact image bytes, per-device hash chain, Ed25519 signature.
   Sealing happens at capture time, before any upload.
5. **Sync later** — offline queue in IndexedDB; sync uploads exactly what was sealed and recomputes nothing.
6. **Verify** — four independent checks (image, payload, signature, chain), each reported separately,
   against the copy on the device or the copy in the cloud.

No computer-vision library and no ML model. Given the same photograph (stored as PNG so it decodes
identically everywhere), an expert can recompute every number by hand.

## Honest limits

- **Presumptive only.** This does not replace laboratory confirmatory testing.
- **Reference colours are design-grade representations** of documented Marquis / Mecke / Scott
  reactions, not spectrophotometric measurements. Validation uses printed colour swatches, not
  controlled substances.
- **The printed card is the ground truth.** Printers differ; measure the printed card once and update
  `src/colour/reference.ts`. The table is print-specific.
- **Access control.** The Supabase anon key is public by design (it ships in the browser bundle)
  and grants nothing on its own. Row-level security (`supabase/002_auth_rls.sql`) requires a
  signed-in officer: officers read only their own records and images, and can insert only from a
  device registered to them whose key matches the record's key. Nothing can be updated or deleted.
  Accounts are provisioned by an administrator; public sign-up is disabled.
- **Still not production security.** No supervisor role yet, and the device signing key lives in
  browser storage rather than hardware-backed key custody.
- Card alignment is manual (guided frame). Automatic card detection is out of scope for v1.

## Run

```bash
npm install
cp .env.example .env.local   # add your Supabase URL and anon key (optional; app works fully offline without it)
npm run dev                  # http://localhost:5173  (camera needs HTTPS or localhost)
npm test                     # colour + seal unit tests, incl. all 34 Sharma et al. CIEDE2000 pairs
npm run build && npm run preview
```

Supabase setup: run `supabase/schema.sql`, then `supabase/002_auth_rls.sql`, in the SQL editor. Disable public sign-ups and create officer accounts as described at the end of `002_auth_rls.sql`.

Print `public/reference-card.svg` at 100% scale on plain white paper.

## Layout

```
src/colour/   srgb · ciede2000 · whitebalance · classify · sample · analyse   (pure, tested)
src/seal/     canonical · hash · keys · chain · verify                        (pure, tested)
src/data/     supabase · queue · sync · seal-flow · evidence
src/screens/  SignIn Home NewTest Capture Review Result Record Verify Log Settings
```

Dev builds show a synthetic test-card button on the capture screen and tamper buttons on the record
screen, for demonstrating verification. Neither exists in production builds.
