# Saakshya — Engineering Rules

These are not preferences. Violating one breaks the product's central claim.

## R1 — No computer vision library, no ML model
No OpenCV, no `opencv.js`, no TensorFlow.js, no trained classifier, no model weights.
Classification is hand-written colour arithmetic in TypeScript.

This is the product's core claim: an expert witness given the same photograph can
recompute the verdict by hand and get the same number. A court can interrogate
arithmetic; it cannot interrogate a neural network. If you find yourself reaching for
a CV library, you have misunderstood the design — re-read `TRD.md` §4.

## R2 — Card detection is a guided frame, not automatic
The capture screen draws a fixed alignment rectangle. The officer aligns the card.
Patch positions are constant fractions of that rectangle (`PATCH_UV` in `TRD.md` §4).
Do not attempt homography, contour detection or marker detection. It is out of scope
for v1 and it will consume the entire budget.

## R3 — Sealing happens on-device, before upload
Hash, chain link and Ed25519 signature are all computed in the browser at capture time.
Never server-side, never during sync. "Sealed at the scene" must be literally true.

Sync uploads exactly what was sealed and recomputes nothing. If sync could alter a
record, the signature would be worthless.

## R4 — One canonical JSON serialiser
`src/seal/canonical.ts` exports exactly one function. Both the signing path and the
verification path use it. Never write a second serialiser, never inline
`JSON.stringify` in either path.

Serialiser drift — where signing and verifying disagree on float formatting or key
order — is the number-one cause of "verification mysteriously fails" in systems like
this. It has a byte-exact unit test. Keep it passing.

## R5 — No hardcoded thresholds in the classifier
`T_REJECT` and `M_MARGIN` are derived at runtime from the minimum pairwise ΔE of the
reference table. No numeric literal thresholds anywhere in `src/colour/classify.ts`.

There is a test asserting this. When a judge asks where the threshold came from, the
answer must be "computed from the card at runtime", not "we tuned it".

## R6 — Tests before UI for the pure modules
Every function in `src/colour/` and `src/seal/` has a unit test written **before** it is
wired to a screen. These two directories import nothing from `src/screens/`. Ever.

The CIEDE2000 test against the Sharma et al. table is the single most valuable test in
the project. It converts "our classifier works" from an assertion into something
checkable. Do not skip it, do not stub it.

## R7 — Never fabricate evidentiary data
If GPS is unavailable, store `null` and display "unavailable". Never a default
coordinate, never a placeholder timestamp, never a guessed operator ID. A fabricated
field in an evidence record is worse than a missing one.

## R8 — Red means tamper, and nothing else
`--tamper` red `#C4342B` appears only when an integrity check fails. Not for form
errors, not for destructive buttons, not for required fields. If red is on screen, a
record's integrity has failed.

## R9 — INCONCLUSIVE is a success path
When two candidates are too close to separate, or nothing matches, the system says so
and seals that result. Do not add fallback logic that forces a verdict. Refusing to
guess is the behaviour that makes the confident verdicts credible.

## R10 — Be honest about what is simulated
The reagent reference colours are design-grade representations of documented reactions,
not spectrophotometric measurements. Validation uses printed colour swatches, not real
controlled substances. Say so in the README, in the UI's prototype notice, and in the
demo. Never claim measurement that was not performed.

---

## Definition of Done

A task is complete when **all** of these hold:

1. `npm test` passes.
2. The change is manually verified in a browser — not assumed to work.
3. `tasks/todo.md` is updated.
4. No rule R1–R10 is violated.

