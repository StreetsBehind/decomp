# Gleaning #5 — aggregate-consistency lint — BUILT + GREEN (2026-06-19)

> Batch-1, highest-leverage-first item from the disposition of [`EVO-GLEANINGS-PLAN.md`](EVO-GLEANINGS-PLAN.md)
> (codex×opus CONVERGED, `runs/deliberations/20260619T220547Z/DECISION-BRIEF.md`). #5 = ADOPT WITH CHANGES:
> *"first task = FULL-TREE ENUMERATION of every K-reducer (not just the three named files); canonicalize on
> `scorecard.worstOfK`; each site consumes it or carries an equivalent assertion."* Class A/B — enforces the
> already-frozen aggregation; touches **no** frozen invariant.

## What was built
- **`src/aggregate-consistency.mjs`** — the static lint engine: `enumerateAggregationSites` (walks every `.mjs`
  under the meta-search tree, excluding `runs/`), `classifySite` against an ordered **REGISTRY** census,
  `findBestReplicateDecisions` (a decision line that reads `.median`/`.best`/`mean()`), and `auditRate` (every
  `rate()` bucket→fraction definition, split into decision-metric vs oracle-gate context).
- **`gates/aggregate-consistency.mjs`** — the gate, three layers each provably able to fire:
  - **A. Static enumeration** — every reduction-shaped site classified; an *unclassified* reducer in any file
    (listed or not) fails; zero best-replicate decisions; zero fail-open decision-metric `rate()`.
  - **B. Behavioural** — the canonical fold is AND-over-runs (a cell that fails in ANY run is FALSE → worst ≠
    best); the **archive lethal veto rejects** a candidate whose best-replicate would pass but whose worst-of-K
    dropped a cell; **credit** picks the worst-lethal candidate off the worst-of-K digest.
  - **C. Self-validation** — planted violations fire (unregistered reducer → unclassified; a verdict reading
    `.best` → flagged; a fail-open `rate()` in a decision-metric file → hard error); no-false-positive = the
    real tree passing layer A.

**Status: 18/18 PASS, exit 0.** Frozen apparatus re-validated: **P0 GREEN 5/5** (K8 29/30, in-loop veto, §14
deterministic resume); label-draw + phase-neg1-manifest gates still pass.

## What the full-tree enumeration found (the disposition's empirical answer to plan-Q5)
`scorecard.mjs` is **NOT** the single aggregation source. 336 reduction-shaped sites across the tree, all
classified. The canonical worst-of-K (`scorecard.mjs:46 worstOfK`, an `.every` AND-fold) is consumed by the
P-series decision paths (`archive` veto/Pareto, `map-elites`, `credit`, `loop`) which reduce over **candidates**
(each already worst-of-K), never over K runs. The side tracks **re-aggregate independently** and were verified:
`coevo-rung1.mjs` (verdict decides on `.worst` only; median/best report-only), `census-classify.mjs`,
`phase-neg1.mjs`, `label-draw.mjs`, `replay-*.mjs` — each folds the K axis by worst (`min`/`every`/`.worst`).
The walk also surfaced an `epics-src/` directory and 8 separate `rate()` definitions a manual three-file check
would have missed.

## Footguns surfaced + fixed (the VOID-92/92 `rate()` family — [[coevo-grader-bug-and-baseline]])
The lint found **two fail-OPEN `rate(): 1` defaults in decision/metric paths** — the exact footgun that produced
the void "92/92" (a crashed/empty grade carries no buckets → `rate(undefined)` → fake 100%). Both **hardened to
`: 0`** (matching the blessed 2026-06-18 coevo/head-to-head fix):
- **`routed-baseline.mjs:66`** — feeds the P3 baseline **reliability** metric. A crashed surface would have read
  100% reliability in the very baseline the cost-vs-reliability comparison rests on.
- **`gen-test-set.mjs:70`** — feeds the test-set **admission** decision (`ok = rate(...) === 1`). A crashed
  reference would have been silently admitted as a clean epic.

**Advisory (not fixed):** 4 oracle self-test gates (`g2-oracle-gate`, `g-oracle2`, `g-diverse-templates`,
`g-template-approval`) keep a fail-open `rate(): 1`, but it is unreachable on the hand-authored **complete**
references they grade. Surfaced by the gate as a non-failing advisory; harden if a reference can ever carry an
absent bucket.

## Coverage note (honest limitation)
The static classifier is a **coverage net**: a NEW reduction in a NEW file → unclassified → fails; a NEW
reduction in an EXISTING file matching a broad rule could be mis-classed benign. The **behavioural layer (B) +
the best-replicate-decision scan** are the non-gameable correctness proofs for the actual danger (a non-worst
aggregate feeding a decision); the registry is the enumeration ledger.
