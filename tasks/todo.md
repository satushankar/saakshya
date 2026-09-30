# Saakshya — Build Plan

Ten hours across two sessions. Read `../PRD.md` and `../TRD.md` first.
Rules R1–R10 in `../docs/RULES.md` are not negotiable.

**Cut order if behind:** supervisor dashboard → settings → PDF export → officer override.
**Never cut:** the verification screen or the tamper demo. Those are the point.

---

## Session 1

### Hour 1 — Scaffold
- [x] `npm create vite@latest` — React + TypeScript. Add Tailwind, Vitest.
- [x] Supabase project. Run the schema from `TRD.md` §8.
- [x] Seed the `reagents` table with Marquis, Mecke, Scott reference patches.
- [x] Create the `test-images` storage bucket.
- [x] Routing skeleton, all nine P0 screens reachable as stubs.
- [x] `public/reference-card.svg` per `TRD.md` §3.
- **Done when:** `npm run dev` shows every screen and they navigate.

### Hour 2 — Colour module (tests first, no UI)
- [x] `src/colour/srgb.ts` — sRGB → linear → XYZ → Lab.
- [x] Test: `#FF0000` → `L*53.24 a*80.09 b*67.20`.
- [x] `src/colour/ciede2000.ts` — full CIEDE2000.
- [x] Test: all 34 pairs from the Sharma, Wu & Dalal (2005) table. **Highest-value test in the project.**
- [x] `src/colour/whitebalance.ts` — per-channel gain, grey-patch check.
- [x] Test: a synthetic warm-cast image balances to neutral.
- [x] `src/colour/classify.ts` — derived thresholds, nearest + margin rule.
- [x] Test: exact reference → that reference, ΔE ≈ 0.
- [x] Test: midpoint between two references → INCONCLUSIVE `ambiguous`.
- [x] Test: far-off colour → INCONCLUSIVE `no reference match`.
- [x] Test: **no numeric literal thresholds in the module source** (R5).
- **Done when:** all colour tests green.

### Hour 3 — Capture
- [x] `getUserMedia` viewfinder (needs real-phone check), rear camera, request manual white balance where supported.
- [x] `AlignmentGuide` — four corner brackets, 100:60, green/amber.
- [x] `src/colour/sample.ts` — median of a 20×20 region at each `PATCH_UV` position.
- [x] Live lighting gate: clipped / underexposed / colour cast. Shutter disabled while invalid.
- **Done when:** photographing the printed card logs correct patch RGBs.

### Hour 4 — Capture → Result
- [x] Wire capture → sample → white balance → Lab → classify.
- [x] Result screen: verdict banner, `SwatchCompare`, ΔE, runner-up, meta grid.
- [x] Inconclusive variant with its reason spelled out.
- **Done when:** photographing a printed purple swatch shows POSITIVE with a real ΔE.

### Hour 5 — Sealing (tests first)
- [x] `src/seal/canonical.ts` — one serialiser (R4).
- [x] Test: fixed input → byte-exact expected string.
- [x] `src/seal/keys.ts` — Ed25519 keypair on first run, private key in IndexedDB, never transmitted.
- [x] `src/seal/hash.ts` — SHA-256 of image bytes.
- [x] `src/seal/chain.ts` — `record_hash = SHA256(prev_hash || image_sha256 || canonicalJSON(payload))`, per-device chain.
- [x] `src/seal/verify.ts` — four independent checks.
- [x] Test: seal three records, all four checks pass.
- [x] Test: corrupt image → only check 1 fails.
- [x] Test: corrupt payload → only check 2 fails.
- [x] Test: break a chain link → only check 4 fails, naming the record.
- **Done when:** all seal tests green, round trip verifies.

---

## Session 2

### Hour 6 — Persistence
- [x] `src/data/supabase.ts` — client, typed table helpers.
- [x] `src/data/queue.ts` — IndexedDB queue, `sync_state: pending`.
- [x] `src/data/sync.ts` — drain on `navigator.onLine` and the `online` event.
- [x] Sync uploads image to Storage, inserts the record. **Recomputes nothing** (R3).
- [x] `OfflineBadge` when the queue is non-empty.
- **Done when:** a sealed record appears in Supabase and still verifies after syncing.

### Hour 7 — Record and verification
- [x] Record detail screen: provenance grid, `HashText`, `ChainView`.
- [x] Verification screen: four `CheckRow`s, staggered reveal, per-check results.
- [x] Failure state names exactly what changed (R8 — red only here).
- **Done when:** Verify on a clean record shows four green checks.

### Hour 8 — Log and tamper demo
- [x] Log screen: search, filter chips, rows with verdict chips and queue icons.
- [x] Empty and no-results states.
- [x] Dev-only tamper button (`import.meta.env.DEV`) that flips one byte of the stored image.
- **Done when:** tamper → verify shows check 1 red, checks 2–4 green.

### Hour 9 — Ship it
- [x] PWA manifest, icons, service worker, offline shell.
- [x] Deploy to Vercel (https://saakshya-omega.vercel.app). Set Supabase env vars.
- [x] Open the URL on a phone that has never seen the app. Test the full flow.
- **Done when:** the deployed URL works end to end on a real phone.

### Hour 10 — Validate and record
- [ ] Print the reference card. **Measure the printed swatches and update the reference table** — the print is the ground truth, not the SVG.
- [ ] Full run against printed swatches in good light, harsh sun, near-dark. Confirm the gate rejects the bad two.
- [ ] Airplane mode: conduct a test, confirm it seals; re-enable, confirm it syncs and still verifies.
- [ ] Walk all seven PRD §8 success criteria.
- [ ] Record the demo video.
- **Done when:** every success criterion holds without touching code.

---

## Review

*(Fill in at the end of each session: what shipped, what was cut, what surprised you.)*
