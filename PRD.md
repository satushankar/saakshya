# Saakshya — Product Requirements Document

**Problem Statement** SIH26231 · Digital Companion for Field Drug Testing
**Organisation** Ministry of Home Affairs · Narcotics Control Bureau
**Category** Software · **Theme** MedTech / BioTech / HealthTech
**Build budget** 1–2 sessions of 5 hours

---

## 1. Problem

Field drug-testing kits in use today rely on an officer reading a colour-change reaction by eye. The PS states the consequence directly:

> This makes results subjective, difficult to standardise across officers, and leaves no verifiable record that a test was actually conducted at a given place and time. As a result, field test outcomes cannot presently be relied upon as documentary evidence.

Three distinct failures sit inside that sentence:

| Failure | What it means in practice |
|---|---|
| **Subjectivity** | Two officers can read the same strip differently. There is no number, only an opinion. |
| **No provenance** | Nothing ties a result to a place, a time, or a person. |
| **No integrity** | Nothing prevents a record being altered after the fact, and nothing detects it if it is. |

Saakshya addresses all three without asking anyone to buy new hardware.

## 2. What we are building

A web application, installable to a phone's home screen, that works alongside the colorimetric field-test kits officers already carry. It:

1. photographs the test result with a printed reference card in frame,
2. corrects for lighting using that card,
3. classifies the reaction against a reagent reference table and reports the colour distance,
4. seals the outcome into a tamper-evident record carrying time, place, operator and a cryptographic hash of the image,
5. keeps a searchable log, and
6. lets anyone verify a record and see precisely which check failed if one does.

### The framing that matters

The classifier is **not** a machine-learning model. It is colour arithmetic — CIE Lab conversion and a CIEDE2000 distance against a fixed reference table. An expert witness given the same photograph can recompute the verdict by hand and arrive at the same number.

That is a deliberate product decision, not a shortcut. A court can interrogate arithmetic. It cannot interrogate a neural network's weights.

## 3. Users

**Primary — Field officer.** NCB or state anti-narcotics task force. Working outdoors, often in poor light, frequently wearing gloves, possibly with no network. Needs: capture, get a defensible verdict, move on. Cares about speed and not being second-guessed later.

**Secondary — Supervisor.** Reviews tests across officers and districts. Needs oversight and the ability to spot anomalies.

**Tertiary — Prosecutor / court.** Never uses the app. Consumes its output. Needs the record to be checkable by someone who does not trust us.

## 4. Goals and non-goals

### Goals
- G1 — Same strip yields the same verdict regardless of which officer photographs it.
- G2 — Every test carries verifiable place, time and operator.
- G3 — Any alteration to a record or its image is detectable, and the system says *which* part changed.
- G4 — Works with zero network at the scene.
- G5 — Requires no hardware beyond a phone and a printed sheet of paper.

### Non-goals — state these plainly, including in the demo
- **NG1 — This does not replace laboratory confirmatory testing.** Output is a presumptive field result plus a supporting record. The PS says so; we repeat it rather than hide it.
- NG2 — We are not validating against real controlled substances. Prototype validation uses printed colour swatches.
- NG3 — No integration with NCB case-management systems.
- NG4 — Not production security. Prototype RLS is permissive; a real deployment needs proper auth and key custody.
- NG5 — No automatic reference-card detection in v1. Alignment is guided by an on-screen frame.

## 5. User journeys

### J1 — First run
Officer opens the app → enters an officer ID → the app generates an Ed25519 keypair on the device and stores it → shows a one-screen explanation of the reference card and offers it as a printable PDF.
*The device keypair never leaves the device. This is what makes "signed by the officer's device" meaningful.*

### J2 — Conduct a test  *(the core loop)*
Home → **New Test** → enter case number, pick reagent (Marquis / Mecke / Scott) → **Capture** screen: dark viewfinder with a fixed alignment rectangle and a live lighting indicator → officer lays the strip on the printed card, aligns the card in the rectangle, captures → app validates lighting; if the white patch is clipped or too dark it refuses and asks for a retake → **Review**: keep or retake → **Result**: verdict, the reaction swatch beside the matched reference swatch, the ΔE, the runner-up candidate, and Confirm / Override → on confirm, the record is **sealed on the device** (hash, chain link, signature) and queued → **Sealed** confirmation showing the hash, GPS, timestamp and operator.

### J3 — Retrieve a record
Home → **Log** → search by case number, filter by date, reagent or verdict → open a record → full detail with the hash chain rendered as linked blocks.

### J4 — Verify a record
Record detail → **Verify** → four independent checks run and each reports pass or fail:
1. image hash matches the stored image
2. record hash matches the stored payload
3. signature is valid for that record hash
4. the chain links correctly to the previous record on this device

Each failure names what changed. "Something is wrong" is not an acceptable output.

## 6. Features

### P0 — must exist for the prototype to be real
| ID | Feature |
|---|---|
| F1 | Camera capture with a fixed alignment rectangle |
| F2 | Lighting validity gate — refuse clipped or underexposed captures |
| F3 | White balance from the card's white and grey patches |
| F4 | sRGB → CIE Lab conversion |
| F5 | CIEDE2000 classification against the reagent reference table, with ΔE reported |
| F6 | INCONCLUSIVE when nothing matches, or when two candidates are too close to separate |
| F7 | On-device sealing — SHA-256 image hash, per-device hash chain, Ed25519 signature |
| F8 | Capture of GPS, timestamp, operator ID and device ID |
| F9 | Offline queue; records seal at capture time and sync later |
| F10 | Searchable test log |
| F11 | Four-check verification with per-check results |
| F12 | Printable reference card, shipped as SVG |

### P1 — build if session 2 has room
| F13 | Confirm / override on the result, with the officer's decision recorded |
| F14 | Record detail with the chain rendered visually |
| F15 | PWA install — manifest, service worker, offline shell |
| F16 | Dev-only tamper button for the demo |

### P2 — only if everything above is done
| F17 | Supervisor dashboard across officers |
| F18 | Settings — view reagent table, device public key, sync status |
| F19 | Export a record as a PDF for case files |

## 7. Screens

| # | Screen | Priority |
|---|---|---|
| 1 | Officer sign-in and device registration | P0 |
| 2 | Home — recent tests, New Test | P0 |
| 3 | New test — case number, reagent picker | P0 |
| 4 | Capture — viewfinder, alignment guide, lighting indicator | P0 |
| 5 | Review capture | P0 |
| 6 | Result — verdict, swatches, ΔE, confirm/override | P0 |
| 7 | Sealed record detail — chain, Verify | P0 |
| 8 | Verification result — four checks | P0 |
| 9 | Test log — search and filters | P0 |
| 10 | Supervisor dashboard | P2 |
| 11 | Settings | P2 |

## 8. Success criteria

The prototype is done when all of these hold:

1. A test conducted on a printed purple swatch returns **POSITIVE** with a ΔE under the reject threshold, and the same swatch photographed three times under reasonable light returns the same verdict every time.
2. The same swatch photographed under harsh direct sun and in near-darkness is **refused** by the lighting gate rather than guessed at.
3. A test conducted with the network disabled produces a fully sealed, signed record; re-enabling the network syncs it unchanged, and it still verifies.
4. Tampering with one byte of a stored image causes **check 1 only** to fail. Tampering with a payload field causes **check 2 only** to fail. The other checks stay green in each case.
5. The colour unit tests pass against published reference values for sRGB→Lab and against the Sharma et al. CIEDE2000 test data.
6. The app is reachable at a deployed URL and runs on a phone that has never seen it before.
7. The full demo runs end to end, timed, without touching code.

Criterion 4 is the one to protect. It is the demo's strongest thirty seconds and it is the claim that distinguishes this from a colour-picker app.

## 9. Assumptions

- The officer has a printed reference card. It is plain paper, and reprinting is free.
- Phone cameras vary in colour rendition, which is exactly why every measurement is relative to the card rather than absolute.
- Reagent reference colours come from documented sources (UNODC rapid-testing guidance and standard Marquis / Mecke / Scott reaction descriptions), not from our own laboratory measurement. **Say this out loud in the demo.** Claiming spectrophotometric measurement we did not perform is the fastest way to lose a forensics-literate judge.
- GPS may be unavailable indoors; the record stores null rather than a fabricated coordinate.

## 10. Open questions

- Should an override by the officer invalidate the automated verdict in the record, or sit alongside it? *Current answer: sit alongside. Both are stored; neither overwrites the other. The record shows what the machine said and what the human decided.*
- Should the chain be per-device or per-officer? *Current answer: per-device — simpler, no concurrency problem, and it maps to the physical reality that a device is what does the sealing.*
- How many reagents to seed? *Current answer: three — Marquis, Mecke, Scott. Enough to demonstrate the table is data, not code.*
