# Saakshya — Technical Requirements Document

Companion to `PRD.md`. This is the document the build session works from.

---

## 1. Architecture

```
 PHONE (browser, installable PWA)
 ┌──────────────────────────────────────────────┐
 │ Camera (getUserMedia)                        │
 │   └─ frame → crop to alignment rect          │
 │        └─ patch sampler   (pure TS)          │
 │             └─ colour pipeline  (pure TS)    │
 │                  └─ classifier  (pure TS)    │
 │                       └─ sealer (noble crypto)│
 │                            ├─ IndexedDB queue │
 │                            └─ device keypair  │
 └──────────────┬───────────────────────────────┘
                │ when online
                ▼
       SUPABASE  ── Storage bucket: test images
                 └─ Postgres: records, reagents, officers
```

No backend service of our own. Supabase is reached directly from the client. Everything that matters — measurement, classification, hashing, signing — happens **on the device, before upload**.

That last point is load-bearing. "Sealed at the scene" is only true if sealing happens at the scene.

## 2. Stack

| Layer | Choice | Why this and not the obvious alternative |
|---|---|---|
| App | React + Vite + TypeScript | Fast HMR, trivial to deploy, easy to test end to end in a real browser |
| Styling | Tailwind | Speed. No design-system bikeshedding inside a 10-hour budget |
| Camera | `getUserMedia` + `<video>` + `<canvas>` | Native APIs. No library |
| Colour maths | Hand-written TypeScript | ~200 lines, fully unit-testable, no WASM, no model. **This is the product's core claim, not an implementation detail** |
| Hashing | `@noble/hashes` | Tiny, audited, pure JS |
| Signing | `@noble/ed25519` | Web Crypto's Ed25519 support is inconsistent across browsers. Do not rely on it |
| Local store | `idb` (IndexedDB wrapper) | Offline queue and device keypair |
| Backend | `@supabase/supabase-js` | Postgres + Storage, no server to write |
| Deploy | Vercel | One command, gives a URL that works on any phone |
| Tests | Vitest | Same toolchain as Vite |

**Explicitly not used:** OpenCV, opencv.js, TensorFlow.js, any ML model, any CV library. See §4.

## 3. Reference card

A 100 × 60 mm card, printed on ordinary paper, shipped in the repo as `public/reference-card.svg`.

```
┌─────────────────────────────────────────────────┐
│ ■                                             ■ │   ■ = 8mm black corner square
│                                                 │
│   ┌────────┬────────┐   ┌───────────────────┐   │
│   │ WHITE  │  GREY  │   │                   │   │
│   │ 25×15  │ 25×15  │   │  PLACE STRIP HERE │   │
│   └────────┴────────┘   │      40 × 30      │   │
│                         │                   │   │
│   ┌──┬──┬──┬──┬──┐      └───────────────────┘   │
│   │A │O │B │P │K │  ← reagent reference strip   │
│   └──┴──┴──┴──┴──┘     5 patches, 12×12 each    │
│ ■                                             ■ │
└─────────────────────────────────────────────────┘
```

Reference strip patches, left to right:
| Key | Name | Approx sRGB | Represents |
|---|---|---|---|
| A | blank-amber | `#E0C877` | no reaction |
| O | amphet-orange | `#D4631F` | amphetamine-type |
| B | scott-blue | `#2D6CB8` | cocaine (Scott) |
| P | marquis-purple | `#7B34A6` | opiates (Marquis) |
| K | reaction-black | `#241029` | strong / MDMA-type |

> These are **design-grade representations of documented reactions**, not spectrophotometric measurements. The repo must say so, and so must the demo. See PRD §9.

The four corner squares are an alignment aid for the officer now, and the hook for automatic detection later.

## 4. Why there is no computer vision

The obvious design detects the card with ArUco markers and computes a homography. It is also the single largest time sink available, and `opencv.js` does not reliably ship the contrib `aruco` module.

**Instead:** the capture screen draws a fixed alignment rectangle at a known position. The officer aligns the card inside it. Patch positions are then known constant fractions of that rectangle, so sampling needs no detection at all.

```ts
// Positions are fractions of the alignment rect — the card's own geometry.
export const PATCH_UV = {
  white:    { u: 0.14, v: 0.30, w: 0.22, h: 0.22 },
  grey:     { u: 0.38, v: 0.30, w: 0.22, h: 0.22 },
  reaction: { u: 0.64, v: 0.28, w: 0.30, h: 0.40 },
  refA:     { u: 0.14, v: 0.62, w: 0.10, h: 0.18 },
  // …refO, refB, refP, refK
} as const;
```

Trade-off, stated honestly: the officer must align the card. In exchange, the whole pipeline is deterministic, dependency-free and unit-testable. Automatic detection is the next increment, not a prerequisite.

## 5. Colour pipeline

Module: `src/colour/`. Every function here is pure and has a unit test **before** it is wired to any UI.

### 5.1 Sampling
```ts
samplePatch(imageData, rect): RGB   // median of the region, not mean
```
Median resists specular highlights, dust specks and paper texture. Mean does not. This matters more than it sounds.

### 5.2 Lighting validity gate
```ts
validateLighting(white: RGB): { ok: boolean; reason?: string }
```
- any channel ≥ 250 → `"Too bright — the white patch is clipped. Move into shade and retake."`
- any channel < 120 → `"Too dark — move into better light and retake."`
- max channel − min channel > 40 → `"Strong colour cast. Retake under different light."`

**Refusing a capture is a feature.** It is the working answer to the ambient-lighting risk the deck promises to handle, and it costs about twenty lines.

### 5.3 White balance
Per-channel gain from the card's white patch, computed in linear space:

```
lin(c)  = c ≤ 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4
gain_ch = lin(TARGET_WHITE) / lin(measured_white_ch)
balanced_ch = clamp(lin(measured_ch) × gain_ch, 0, 1)
```

The grey patch is used as a **check**, not a correction: after balancing, the grey patch should be near-neutral. If its channels diverge by more than a tolerance, flag the capture as low-confidence. Using a second known patch to validate the first is cheap and it catches a whole class of bad captures.

### 5.4 sRGB → Lab
Standard path, D65 illuminant, 2° observer. linear RGB → XYZ via the sRGB matrix → Lab via the CIE `f(t)` function.

Unit-test against published values, e.g. pure red `#FF0000` → `L*≈53.24, a*≈80.09, b*≈67.20`.

### 5.5 ΔE CIEDE2000
Full CIEDE2000, not CIE76. CIE76 is easier but disagrees with human perception badly enough in the blue-purple region — precisely where the opiate reaction lives — to matter here.

Unit-test against the **Sharma, Wu & Dalal (2005)** test-data table, which exists specifically so implementations can prove correctness. This is the single most valuable test in the project: it turns "our classifier works" from an assertion into something checkable.

### 5.6 Classification
```ts
classify(reactionLab, referenceTable): Verdict
```
1. Compute ΔE from the reaction to every reference entry.
2. Sort ascending. Take `nearest` and `runnerUp`.
3. Derive thresholds **from the table itself**:
   ```ts
   const minPairwise = minimumPairwiseDeltaE(referenceTable);
   const T_REJECT = 0.5  * minPairwise;   // nothing matches
   const M_MARGIN = 0.25 * minPairwise;   // too close to separate
   ```
4. Decide:
   - `nearest.dE > T_REJECT` → **INCONCLUSIVE**, reason `"no reference match"`
   - `runnerUp.dE - nearest.dE < M_MARGIN` → **INCONCLUSIVE**, reason `"ambiguous between {a} and {b}"`
   - `nearest.key === 'blank-amber'` → **NEGATIVE**
   - otherwise → **POSITIVE** for `nearest.substance`
5. Always return the full sorted candidate list, not just the winner.

**No numeric literal thresholds in the classifier.** A test asserts this. When a judge asks where the threshold came from, the answer is "computed from the card at runtime", not "we tuned it until it worked".

## 6. Record, sealing and verification

### 6.1 Record schema
```ts
interface TestRecord {
  id: string;                    // uuid v4
  case_number: string;
  reagent: 'marquis' | 'mecke' | 'scott';
  operator_id: string;
  device_id: string;             // sha256 of the device public key, first 16 hex
  captured_at: string;           // ISO 8601 with timezone
  gps: { lat: number; lon: number; accuracy_m: number } | null;
  image_sha256: string;          // hex
  image_path: string;            // Supabase storage path
  measurement: {
    white_rgb: [number, number, number];
    grey_rgb:  [number, number, number];
    gains:     [number, number, number];
    reaction_lab: [number, number, number];
    candidates: { key: string; substance: string; delta_e: number }[]; // sorted
    thresholds: { t_reject: number; m_margin: number };
  };
  verdict: 'POSITIVE' | 'NEGATIVE' | 'INCONCLUSIVE';
  verdict_reason: string;
  officer_decision: 'CONFIRMED' | 'OVERRIDDEN' | null;
  officer_note: string | null;
  prev_hash: string;             // hex, 64 zeros for genesis
  record_hash: string;           // hex
  signature: string;             // base64
  public_key: string;            // base64
}
```

Note `officer_decision` sits **alongside** the verdict, never overwriting it. The record shows what the machine said and what the human decided. Both are evidence.

### 6.2 Canonical JSON — read this twice
```ts
canonicalJSON(payload): string
```
- keys sorted lexicographically, recursively
- no whitespace
- numbers: all floats fixed to **4 decimal places**, integers plain
- `null` preserved, `undefined` keys omitted entirely
- strings NFC-normalised

**One function, used by both the signing path and the verification path.** Serialiser drift — where signing and verifying disagree about float formatting or key order — is the number-one cause of "verification mysteriously fails" in systems like this. It gets its own unit test asserting a byte-exact output for a fixed input.

### 6.3 Sealing
```
payload      = record minus { prev_hash, record_hash, signature, public_key }
record_hash  = SHA256( prev_hash || image_sha256 || canonicalJSON(payload) )
signature    = Ed25519_sign( device_private_key, record_hash )
```
- `prev_hash` = the `record_hash` of the previous record **on this device**. Per-device chain: no coordination, no concurrency problem, and it maps to physical reality — the device is what seals.
- Genesis `prev_hash` = `"0".repeat(64)`.
- Keypair generated on first run, private key in IndexedDB, **never transmitted**.

### 6.4 Verification
Four independent checks, each reported separately:

| # | Check | Fails when |
|---|---|---|
| 1 | Re-download image, recompute SHA-256, compare to `image_sha256` | **IMAGE ALTERED** |
| 2 | Recompute `record_hash` from the stored payload | **PAYLOAD ALTERED** |
| 3 | Verify `signature` over `record_hash` with `public_key` | **SIGNATURE INVALID** |
| 4 | Walk the device chain, confirm each `prev_hash` links | **CHAIN BROKEN AT RECORD N** |

Independence matters. A UI that says "verification failed" is useless; one that says "the image was altered but the payload and signature are intact" tells an investigator exactly what happened.

### 6.5 Tamper demo
A dev-only button, visible when `import.meta.env.DEV`, that flips one byte of the stored image. Seal → verify green → tamper → verify red, with only check 1 failing.

Build this early. It is the most persuasive thirty seconds available and you do not want to be improvising it at hour 10.

## 7. Offline

- Records seal **at capture time**, on the device, fully signed.
- Sealed records go into an IndexedDB queue with `sync_state: 'pending'`.
- A sync worker drains the queue when `navigator.onLine` and on a `window.online` event.
- Sync uploads the image to Supabase Storage, then inserts the record row.
- **Sync never re-computes anything.** It uploads exactly what was sealed. If sync could alter the record, the signature would be meaningless.
- Conflict handling: none needed. Records are immutable and keyed by uuid.

## 8. Supabase

```sql
create table officers (
  id text primary key,
  name text not null,
  created_at timestamptz default now()
);

create table devices (
  id text primary key,              -- device_id
  officer_id text references officers(id),
  public_key text not null,
  registered_at timestamptz default now()
);

create table reagents (
  key text primary key,             -- 'marquis' | 'mecke' | 'scott'
  name text not null,
  reference_patches jsonb not null  -- [{ key, substance, lab: [L,a,b] }]
);

create table records (
  id uuid primary key,
  case_number text not null,
  reagent text references reagents(key),
  operator_id text references officers(id),
  device_id text references devices(id),
  captured_at timestamptz not null,
  gps jsonb,
  image_sha256 text not null,
  image_path text not null,
  measurement jsonb not null,
  verdict text not null,
  verdict_reason text not null,
  officer_decision text,
  officer_note text,
  prev_hash text not null,
  record_hash text not null unique,
  signature text not null,
  public_key text not null,
  synced_at timestamptz default now()
);

create index on records (case_number);
create index on records (device_id, synced_at);
```

Storage bucket `test-images`, path `{device_id}/{record_id}.jpg`.

**RLS posture:** for the prototype, permissive policies with the anon key. This is not production security and the repo README must say so. A real deployment needs authenticated officers, per-device write scoping, and read access gated by role. Do not let this slide silently into the demo narrative.

## 9. Test plan

| Module | Test | Why it matters |
|---|---|---|
| `colour/srgb` | `#FF0000` → `L*53.24 a*80.09 b*67.20` | Proves the conversion chain |
| `colour/ciede2000` | Sharma et al. test-data table, all 34 pairs | **Proves the distance metric.** The single most valuable test here |
| `colour/whitebalance` | A synthetic warm-cast image balances to neutral grey | Proves the correction works |
| `colour/classify` | Exact reference colour → that reference, ΔE ≈ 0 | Sanity |
| `colour/classify` | Midpoint between two references → INCONCLUSIVE, reason `ambiguous` | Proves the margin rule |
| `colour/classify` | Far-off colour → INCONCLUSIVE, reason `no reference match` | Proves the reject rule |
| `colour/classify` | **No numeric literal thresholds in the module source** | Proves thresholds are derived |
| `seal/canonical` | Fixed input → byte-exact expected string | Prevents serialiser drift |
| `seal/chain` | Seal three records, verify all four checks pass | Round trip |
| `seal/chain` | Corrupt image → only check 1 fails | Independence of checks |
| `seal/chain` | Corrupt payload → only check 2 fails | Independence of checks |
| `seal/chain` | Break a chain link → only check 4 fails, naming the record | Independence of checks |

## 10. Ten-hour build sequence

### Session 1
| Hour | Work | Done when |
|---|---|---|
| 1 | Scaffold Vite + React + TS + Tailwind + Vitest. Supabase project, schema, seed reagents. Routing. Screens as static stubs from the Stitch exports. | `npm run dev` shows all screens, navigable |
| 2 | `src/colour/` — sRGB→Lab, CIEDE2000, white balance, classify. **Tests first.** No UI. | All colour tests green, incl. the Sharma table |
| 3 | Camera capture, alignment guide overlay, lighting gate, patch sampling. | Capturing a printed card logs correct patch RGBs |
| 4 | Wire capture → pipeline → Result screen. | Photographing a purple swatch shows POSITIVE with a real ΔE |
| 5 | `src/seal/` — canonical JSON, hash chain, Ed25519. Device keypair in IndexedDB. **Tests first.** | All seal tests green, round trip verifies |

### Session 2
| Hour | Work | Done when |
|---|---|---|
| 6 | Supabase persistence — Storage upload, record insert, IndexedDB queue, sync worker. | A sealed record appears in Supabase and still verifies |
| 7 | Record detail with the chain rendered, plus the Verify flow showing four checks. | Verify shows four green ticks |
| 8 | Log screen with search and filters. Dev-only tamper button. | Tamper → verify shows check 1 red, others green |
| 9 | PWA manifest, service worker, deploy to Vercel, test on a real phone. | The URL works on a phone that has never seen the app |
| 10 | Print the card. Full end-to-end run against printed swatches under varied light. Fix what breaks. Record the demo video. | All seven PRD success criteria hold |

If you are behind at hour 5, cut the supervisor dashboard, settings and PDF export — they are P2 for exactly this reason. Do not cut the tamper demo or the verification screen; those are the point.

## 11. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Phone camera auto-white-balance fights our correction | High | Request `whiteBalanceMode: 'manual'` where supported; the card correction handles the rest; the grey-patch check catches the residue |
| Printed swatch colours differ from the SVG spec | High | Measure the *printed* card once and use those values as the reference table. The card is the ground truth, not the file |
| Canonical JSON drift between sign and verify | Medium | One function, byte-exact unit test |
| Ed25519 unavailable / inconsistent in Web Crypto | Medium | Use `@noble/ed25519`, never Web Crypto, for signing |
| `getUserMedia` requires HTTPS | Certain | Works on `localhost` and on the Vercel URL. Never demo from a plain-HTTP LAN address |
| Supabase RLS misconfigured and left permissive | Medium | Documented as a known prototype limitation, stated in the demo |
| Session 1 overruns into the colour work | Medium | Hours 2 and 5 are pure functions with no UI dependency — they can be built in parallel while UI work proceeds |

## 12. Repository layout

```
saakshya/
├── docs/RULES.md
├── tasks/
│   ├── todo.md
│   └── lessons.md
├── public/
│   ├── reference-card.svg
│   └── manifest.webmanifest
└── src/
    ├── colour/      srgb.ts  ciede2000.ts  whitebalance.ts  classify.ts  sample.ts
    ├── seal/        canonical.ts  hash.ts  keys.ts  chain.ts  verify.ts
    ├── data/        supabase.ts  queue.ts  sync.ts  reagents.ts
    ├── screens/     SignIn  Home  NewTest  Capture  Review  Result  Record  Verify  Log
    ├── components/  AlignmentGuide  SwatchCompare  ChainView  CheckRow  HashText
    └── test/        fixtures/  sharma-ciede2000.json
```

`src/colour/` and `src/seal/` import nothing from `src/screens/`. Ever. They are pure and portable, which is what makes them testable — and what makes the "an expert witness can recompute this" claim true rather than aspirational.
