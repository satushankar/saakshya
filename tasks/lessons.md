# Lessons

Append after any correction. Each entry: what went wrong, and the rule that prevents it.

Format:
```
## YYYY-MM-DD — short title
**What happened:** …
**Rule:** …
```

---

## Seeded before the first session

## Serialiser drift breaks verification
**What happened:** (pre-emptive) Systems like this fail when the signing path and the
verification path disagree about float formatting or key order, producing a hash
mismatch that looks like tampering.
**Rule:** One `canonicalJSON` function, byte-exact unit test, used by both paths. Never
inline `JSON.stringify` in a sign or verify path.

## The printed card is the ground truth
**What happened:** (pre-emptive) Printer colour differs from the SVG hex values, so a
reference table built from the file will not match what the camera actually sees.
**Rule:** Measure the printed card once, use those measured values as the reference
table, and note in the README that the table is print-specific.

## Reaching for OpenCV
**What happened:** (pre-emptive) Automatic card detection is the intuitive design and it
will consume the entire build budget.
**Rule:** Guided alignment frame only. If you are writing homography code, stop and
re-read `docs/RULES.md` R1 and R2.

## 2026-09-30 — Shell heredocs mangle escape sequences in TS source
**What happened:** A test literal `'a"b\n'` written via a bash heredoc lost its `\n` escape and broke the test.
**Rule:** Write TypeScript/JSON source with the Write tool, not shell heredocs or sed, whenever the text contains backslashes.

## 2026-09-30 — Sealed image must be re-analysable byte-for-byte
**What happened:** JPEG decoding can differ between decoders, so an expert re-running the arithmetic on the sealed JPEG might not reproduce the exact ΔE.
**Rule:** Seal the capture as PNG and run the colour pipeline on the decoded sealed bytes, not on the live canvas.

## 2026-09-30 — Stored precision must equal hashed precision
**What happened:** Canonical JSON hashes floats at 4 dp; storing GPS at full precision would leave unsealed digits that could be edited undetected.
**Rule:** Round every float field to 4 dp before sealing so the stored record is exactly what was hashed.

## 2026-09-30 — `vercel link` writes into .env.local
**What happened:** Linking the Vercel project pulled remote env into `.env.local` (it appended a VERCEL_OIDC_TOKEN). Supabase keys survived, but a pull could have overwritten them.
**Rule:** Back up `.env.local` before any `vercel link` / `vercel env pull`. Vercel also refuses credential-looking `VITE_` vars unless `--type config` is passed; the Supabase anon key is public by design, so config is correct.
