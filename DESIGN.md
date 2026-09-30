# Saakshya — Design Document

Companion to `PRD.md` and `TRD.md`. Governs the app UI and feeds `STITCH_PROMPTS.md`.

---

## 1. Who this is for, physically

Not a desk app. Design for the actual conditions:

- **Outdoors, in sunlight.** Screen brightness fights you. Low-contrast greys disappear.
- **Gloved hands.** Nitrile gloves lose precision. Small targets get missed.
- **One hand.** The other is holding a test strip, a torch, or a suspect's bag.
- **Under scrutiny.** Someone may be watching, possibly hostile. Hesitation reads badly.
- **No network.** Frequently.

Everything below follows from that list.

## 2. Principles

1. **Sunlight first.** Light ground, near-black text, high contrast. A dark UI looks more "forensic" and is harder to read outdoors — legibility wins over mood.
2. **One decision per screen.** The officer should never have to work out what to do next.
3. **Thumb-reachable.** Primary action at the bottom, full width, 56px minimum.
4. **Numbers never travel alone.** A ΔE without its threshold is meaningless. Show both.
5. **Refusing is a valid outcome.** INCONCLUSIVE and "retake, lighting out of range" are designed states, not error states. They get the same care as success.
6. **Evidentiary data is monospace.** Every hash, coordinate, timestamp, device ID and ΔE. It is the cheapest and strongest signal that this output belongs in a case file.

## 3. Tokens

Carried from the Saakshya design system, light mode.

```css
/* Ground and structure */
--ground:        #F7F8FA;   /* app background */
--surface:       #FFFFFF;   /* cards, sheets */
--surface-sunk:  #EFF1F5;   /* inputs, wells */
--line:          #DDE1E8;
--line-strong:   #C7CDD7;

--ink:           #12151B;   /* primary text */
--ink-2:         #3A424F;   /* secondary */
--muted:         #69707E;   /* labels, captions */

/* Reagent accents — the brand, taken from documented reactions */
--marquis-purple: #7B34A6;
--amphet-orange:  #C2571A;   /* darkened for contrast on light ground */
--scott-blue:     #2D6CB8;
--blank-amber:    #B08A21;   /* darkened; the raw swatch is too pale for text */
--reaction-black: #241029;

/* Semantic — kept separate from accents */
--positive:      #7B34A6;   /* purple. The actual reagent colour, not red */
--negative:      #2E7D5B;
--inconclusive:  #B06A12;
--tamper:        #C4342B;   /* RESERVED. Appears nowhere else in the app */

/* Camera surfaces only */
--viewfinder:    #0B0D11;
--guide:         #4ADE80;   /* alignment rect when valid */
--guide-invalid: #F59E0B;   /* alignment rect when lighting is bad */
```

**Two rules that are not negotiable:**

- **Positive is purple, not red.** It is the real Marquis reaction colour for opiates. Using red would be both wrong and a waste of the one colour that must mean something else.
- **Red means tamper. Only tamper.** If red appears anywhere in the app, a record's integrity has failed. Nothing else gets to use it — not errors, not required fields, not destructive buttons.

### Type
```
Display / headings   Archivo        600, 700
Body / UI            IBM Plex Sans  400, 500, 600
Evidentiary data     IBM Plex Mono  400, 500
```

Scale: 32 / 24 / 20 / 17 / 15 / 13 / 11. Nothing between. Body is 17px minimum — smaller than that is unreadable in sun.

Uppercase labels get `letter-spacing: 0.12em`. Headings get `text-wrap: balance`.

## 4. Components

| Component | What it is |
|---|---|
| `PrimaryAction` | Bottom-anchored, full-width, 56px, one per screen |
| `AlignmentGuide` | SVG overlay on the viewfinder: corner brackets + a live lighting pill |
| `SwatchCompare` | Two squares side by side — measured reaction vs matched reference — with the ΔE between them in mono |
| `VerdictBanner` | Full-width band. Purple POSITIVE / green NEGATIVE / amber INCONCLUSIVE, with the reason beneath |
| `CandidateRow` | One reference candidate: swatch, name, ΔE in mono. Used for the runner-up list |
| `HashText` | Monospace, middle-truncated (`a3f9…c21e`), tap to reveal in full, long-press to copy |
| `ChainView` | Vertical stack of linked blocks, each a short hash, connected by a hairline |
| `CheckRow` | One verification check: icon, name, PASS/FAIL, and what failed if it failed |
| `MetaGrid` | Two-column label/value grid. Values always monospace |
| `OfflineBadge` | Persistent pill, top-right, when queued records exist |

## 5. Screens

### 5.1 Sign-in and device registration
Single field for officer ID. Below it, a short explanation that a signing key will be created on this device and never leaves it. Primary action **Register device**. After registering, an inline card offers **Print reference card** with a small preview of the card artwork.

*First-run friction is acceptable here. Everything after must be fast.*

### 5.2 Home
- Greeting line with officer ID in mono.
- `OfflineBadge` if anything is queued.
- Huge primary action: **New test**.
- Beneath: "Recent tests", the last five as compact rows — case number, reagent, verdict chip, relative time.
- Bottom nav: Home · Log · Settings.

Empty state: an illustration of the reference card and one line — *"No tests yet. Print the reference card before your first capture."*

### 5.3 New test
Two inputs, nothing else. Case number (text, autofocused). Reagent — three large selectable cards, not a dropdown: **Marquis** (opiates, amphetamines), **Mecke** (opiates), **Scott** (cocaine). Each card shows its reagent's reference strip as five small swatches.

Primary action **Open camera**.

### 5.4 Capture — the screen that matters most
Full-bleed dark viewfinder. Overlaid:

- **Alignment rectangle**, centred, 100:60 aspect, drawn as four corner brackets rather than a full box so the card stays visible. Green when lighting is valid, amber when not.
- **Lighting pill**, top centre, live: `LIGHTING OK` / `TOO BRIGHT` / `TOO DARK` / `COLOUR CAST`.
- **One-line instruction**, bottom above the shutter: *"Place the strip on the card. Fit the card inside the brackets."*
- **Shutter**, 72px circle. **Disabled while lighting is invalid** — do not let the officer take a capture the system will reject a moment later.
- Back arrow top-left. Torch toggle top-right if `ImageCapture` supports it.

Disabling the shutter rather than rejecting after the fact is the whole difference between a tool that feels sure of itself and one that feels flaky.

### 5.5 Review capture
The captured frame, cropped to the alignment rect, shown large. Two actions: **Retake** (secondary) and **Analyse** (primary). No processing has happened yet — this is purely "is this photograph any good".

### 5.6 Result
Top to bottom:
1. `VerdictBanner` — e.g. **POSITIVE — Opiates**, purple.
2. `SwatchCompare` — measured reaction beside the matched reference, ΔE between them.
3. "Next closest match" — one `CandidateRow`, so the officer can see how clear-cut it was.
4. `MetaGrid` — reagent, case number, time, GPS, thresholds used. All values mono.
5. Two actions: **Confirm and seal** (primary) and **Override verdict** (secondary, opens a sheet with the three outcomes and a note field).

INCONCLUSIVE variant: amber banner, reason stated plainly (*"Ambiguous between opiates and MDMA — ΔE difference 2.1, below the 4.0 separation margin"*), and the primary action becomes **Seal as inconclusive**. Sealing an inconclusive result is still a real record. Do not treat it as a failure path.

### 5.7 Sealed record
Confirmation state at the top — a lock icon and **Record sealed**. Then:
- `MetaGrid` with everything, values mono.
- `HashText` for the image hash and the record hash.
- `ChainView` showing this record linked to the previous two.
- Actions: **Verify this record** (primary), **Back to home** (secondary).
- Dev builds only: a small **Tamper (dev)** button, set in `--tamper` red, clearly marked as a demo tool.

### 5.8 Verification result
Four `CheckRow`s, revealed in sequence with a brief stagger so each is legible as it lands:
1. Image integrity
2. Record payload
3. Signature
4. Chain position

All pass → a green summary band: **Record intact**.
Any fail → a red band naming exactly what changed: **Image altered — the stored photograph does not match the sealed hash.** The other three still show their own result. Never collapse four checks into one verdict.

### 5.9 Log
Search field pinned to the top (case number, officer). Filter chips beneath: reagent, verdict, date range, sync state. Then rows: case number, reagent, verdict chip, date, plus a small cloud icon if still queued.

Empty search state: *"No records match. Try the case number without its prefix."* — a specific suggestion, not a shrug.

### 5.10 Supervisor dashboard *(P2)*
Counts by verdict, by officer, by day. A list of every INCONCLUSIVE result — the ones worth a human look. A list of any record failing verification, in red.

### 5.11 Settings *(P2)*
Device public key in mono with a copy action. Reagent reference table, read-only, each entry showing its swatch and Lab values. Sync status and a manual **Sync now**. App version. A plainly worded note that this is a prototype and not production security.

## 6. States

Every screen must define all of these. Missing states are where prototypes visibly fall apart.

| State | Treatment |
|---|---|
| Loading | Skeleton rows matching final layout. Never a centred spinner on a blank screen |
| Empty | Illustration + one sentence + the action that resolves it |
| Offline | `OfflineBadge` persists; queued records show a cloud icon; nothing is blocked |
| Lighting invalid | Guide turns amber, pill states which problem, shutter disabled |
| Inconclusive | Amber, reason spelled out, sealing still available |
| Verification failed | Red band, the failing check named, other checks still reported |
| GPS unavailable | Record shows `GPS — unavailable` in mono. **Never fabricate a coordinate** |
| Sync failed | Row keeps the cloud icon, tap explains why, retry offered |

## 7. Field ergonomics

- Touch targets 48px minimum, 56px for primary actions.
- Primary action always bottom-anchored, within thumb reach.
- No horizontal scrolling anywhere.
- No hover-dependent affordances.
- Contrast: body text ≥ 7:1 against its ground. Well above AA, because AA assumes indoor lighting.
- Haptic feedback on capture and on seal, where `navigator.vibrate` exists. Confirmation you can feel through gloves.
- Nothing time-sensitive. No toasts that vanish before they are read. An officer will be interrupted mid-flow.

## 8. What the app must never do

- Show a verdict without its ΔE and the threshold it was judged against.
- Round a ΔE to a whole number. Two decimal places, minimum.
- Use red for anything other than a failed integrity check.
- Fabricate GPS, a timestamp, or an operator ID when the real value is unavailable.
- Let sync alter a sealed record in any way.
- Claim certainty about a borderline reaction. INCONCLUSIVE exists for a reason and using it is a success, not a failure.
