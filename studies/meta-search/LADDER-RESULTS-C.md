# LADDER-RESULTS-C — the OBLIGATION-INJECT (A) half on the approval cells (inject-ON vs inject-OFF)

> **Run:** `coevo-rung1.mjs --epics approval-d1,approval-d2,approval-d3,approval-d4,lifecycle-d1 --repairgate
> --shapegate --contractgate --obligation --bestofn 3 --seamgate --semantic --behavioural --inject --floor
> --retry 3 --k 8` — the full stack + **`--inject`** (the obligation-INJECT (A) half: each surface's
> skeleton-declared semantic obligation appended to its FIRST build prompt). $0, ~3.5h, exit 0. Narrowed to the 4
> approval cells (the experiment) + `lifecycle-d1` (a deliberate inject-NO-OP control). Comparator = the inject-OFF
> [`LADDER-RESULTS-B.md`](LADDER-RESULTS-B.md) (same baseline, same stack minus `--inject`). Date 2026-06-27.

## Headline — the prompt-level inject is a NULL; the approve→execute seam still walls

| Cell | base c/i | B inject-OFF c/i | C inject-ON c/i | Δi (C−B) | verdict | worst residual (C) |
|---|---|---|---|---|---|---|
| approval-d1 | 100/100 | 71/50 | 100/50 | 0 | FAIL | authz-over (+ `status advanced to executed`) |
| approval-d2 | 100/100 | 79/50 | 57/50 | 0 | FAIL | coding-bug (B) |
| approval-d3 | 100/100 | 67/33 | 71/50 | +17 | FAIL | **approval/idempotency (semantics)** |
| approval-d4 | 93/100 | 89/44 | 100/63 | +19 | FAIL | **approval/idempotency (semantics)** |
| lifecycle-d1 *(inject no-op control)* | 80/0 | 100/100 | 40/25 | **−75** | FAIL | coding-bug (B) |

**All four approval cells still FAIL.** Integration stays i50–63 vs a baseline holding i100; the d3/d4 worst-of-K
residual is **still the approve→execute/idempotency semantic class**; `status advanced to executed` (the seam
violation) persists across all four cells with inject ON.

## Why the d3/d4 upticks are NOT attributable to inject — the control settles it

`lifecycle-d1` declares **no** Lever-B semantic obligation (`semanticRules → NONE`), so `--inject` produces an
EMPTY addendum there → its build prompt is **byte-identical** to an inject-OFF run. Yet it swung **100/100 → 40/25**
between the two runs — a **−75pp integration / −60pp crosscut** move from the **non-stationary route pool alone**.
That is the instrument's noise floor on a single cell, and it is **larger than the approval integration upticks**
(d3 +17, d4 +19). So those upticks are **within route noise — not a credible inject lift**; the crosscut changes
are mixed (d1 +29, d4 +11, d2 −22) and equally noise-bound. This is the **third** sighting of the worst-of-K=8
non-stationarity footgun (after VOID-92/92 and Lever A) — and exactly the Session-9 lesson: a per-lever **LIFT**
is variance-fragile and illegible on this instrument.

## The legitimate read is the variance-ROBUST one — and inject fails it

A (C) verdict does not need a clean lift; it needs **every above-floor route to FAIL the invariant** (a universal
quantifier — non-stationarity changes *which* route is worst, it cannot manufacture unanimous correctness). On
that read: with the approve→execute/idempotency obligation **injected at authorship time** (not merely re-prompted
post-hoc), the cheap pool **still** writes a wrong/absent gate across the zoo — approval d1–d4 all fail,
integration walls at i50–63, the semantic residual persists. **The prompt-level inject does not clear the seam.**
This is consistent with — and strengthens — the LEVER-B-DIAGNOSTIC finding that re-prompting with the declared
rule fails: handing the cheap pool the rule *earlier* (at first authorship) changes nothing.

## Verdict — Rule 2(e): the PROMPT-level lever menu is exhausted; one thesis-faithful lever remains

- **NOT a confirmed (C) yet, by the program's own Rule 2(e)** — one named, admissible, unbuilt lever remains: the
  **frontier-AUTHORED seam scaffold** (the *strong* inject). The prompt-inject still leaves the **cheap pool**
  authoring the approve→execute state-machine (with a hint); it does **not** test the M-coh-2.5 claim that the seam
  needs **frontier authorship**. The strong form = the frozen skeleton/orchestration layer **provides the
  approve→execute idempotency mechanism as importable code** (authored from the PUBLIC contract, generic across
  the template zoo), which the cheap surface calls — exactly "the orchestration artifact carries both the shared
  shapes AND the hard obligation seam" (M-coh-2 / M-coh-2.5).
- **This strong lever is BOTH the genuine final (C)-adjudication test AND the candidate PRODUCT FIX** — they
  converge: "frontier authors the seam, cheap wires the rest" is the thesis working as designed, not a cheat
  (M-coh-2.5 established the seam needs opus-class authorship; the skeleton is the frozen artifact that carries it).
- **Honest meta-caveat:** we are now five+ levers deep on one obligation class, and the noise floor (≥60pp/cell)
  makes per-lever LIFT reads illegible — only the unanimous-failure read is trustworthy here. The strong inject is
  worth building because it is the *product direction*, not because another worst-of-K lift would be legible.

## Decision

Two honest options (a USER call — the strong inject is a substantial, admissibility-sensitive build):
1. **Build the frontier-authored seam scaffold (the strong inject).** The real M-coh-2.5 test + the candidate
   product fix for the approve→execute seam. If it clears the seam → the thesis holds *with the orchestration layer
   authoring the seam* (a sharpened, still-winning claim). If it still walls → Rule 2(e) genuinely exhausted →
   a clean, defensible (C)/SCOPE-SHRINK.
2. **Declare the SCOPE-SHRINK now.** Treat the cumulative evidence (LEVER-B-DIAGNOSTIC unanimity + B-ladder
   live-confirmation + C-ladder prompt-inject null) as sufficient to conclude: the cheap pool cannot author the
   approve→execute/idempotency seam; claim the win on the obligation classes the hybrid holds (membership/lifecycle
   authz + shapes), and flag approve→execute as requiring frontier/skeleton authorship — which option 1 would then
   simply *implement*.

## Provenance / invariants

Frozen tree (`build-gap`/DESIGN/FREEZE) untouched; no frozen invariant touched. `--inject` default OFF =
byte-identical (inject-smoke 39/39; lifecycle no-op demonstrated live). Apparatus UNCOMMITTED. Artifacts
`runs/coevo-ladder-stack-C.json` + `runs/dump-ladder-C/` (gitignored).
