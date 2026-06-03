# The Build-Tolerant Reframe — completeness as cost-of-omission, not coverage

_Authored 2026-06-03. Builds on [`PRIOR-ART-COMPLETENESS.md`](PRIOR-ART-COMPLETENESS.md) (the
cross-discipline survey) and the Step-2 result in [`STAIRCASE-RESULTS.md`](STAIRCASE-RESULTS.md). This
note records a strategic reframe that **sits above the proof-staircase**: it changes what the staircase is
trying to prove, so read it before planning the next staircase step._

## Thesis

We do **not** need to discover every edge before building. People ship software without complete edge
knowledge because **the build process is itself an edge-discovery engine** — a linker's "undefined
symbol," a compiler's type error, a failing integration test are missing-edge detectors that fire
*exactly when the edge binds*, with a stack trace pointing at it. For that whole class of edges, late
discovery is cheap and recovery is local, so discovering them upfront is **redundant with the build**.

The right target is therefore not "find all edges" but "find the edges whose omission the build process
**cannot** cheaply recover from." That is a smaller, typed, more tractable set — and it is the
**obligations** layer of the spec, not the **edges** layer.

## Why this follows from the prior-art finding

The deep-research verdict was unambiguous: **a completeness guarantee does not exist in any discipline.**
Read as an engineering constraint, that has a corollary — *any method that requires completeness before
building waits on a precondition that is unattainable.* So the correct architecture is not one that
achieves completeness; it is one that **tolerates incompleteness and recovers cheaply.** The most
completeness-obsessed disciplines (safety engineering: HAZOP/STPA/FMEA) pay the full completeness tax only
because their misses are **silent and lethal** — never to find missing dataflow wiring. That asymmetry is
the whole lever.

## The cost-of-omission model

The value of discovering an edge *before* building:

```
value(edge) = P(missed) × cost(discover late) × cost(recover late)
```

The build process drives `cost(discover late)` → 0 for **self-revealing** edges (it finds them) and
`cost(recover late)` → 0 for **cheap-recovery** edges (the fix is local). Upfront discovery is only worth
its price where the build does **neither**.

## The 2×2 triage

|  | **Cheap recovery** | **Expensive recovery** |
|---|---|---|
| **Self-revealing** (build catches it) | most dataflow wiring → **don't discover upfront** | architectural / data-model / ordering edges → **discover upfront** (loud, but you don't want to find out after building 10 things on the wrong assumption) |
| **Silent** (ships clean, detonates later) | low priority | **security / privacy / consistency / tenancy / idempotency / compliance obligations → MUST discover upfront** — the lethal quadrant |

- **Top-left** is where the edge debate has been living, and it is the quadrant we can safely skip.
- **Bottom-right** is the lethal quadrant: omissions that pass every test, ship, and corrupt or get
  exploited. Few in number, **typed**, and they *are* the obligations layer.
- The rule: **let the build discover the cheap-recovery edges; spend all upfront effort on the
  expensive-recovery column, prioritizing the silent row.** (Loud-expensive edges at least announce
  themselves; silent-expensive ones don't.)

## Consequence for the Step-2 result

Step 2 (depends_on vs extraction→join) was a contest over **dependency edges** — overwhelmingly the
self-revealing, cheap-recovery quadrant the build recovers for free. So the −17.6 pt loss may be **noise
on a layer the build handles anyway**, and neither arm measured whether the *silent obligations* survived.
If so, the whole join debate (and its "conservation of difficulty" collapse — every join-robustness fix
reduces to depends_on because canonical naming *is* the global relational reasoning the join claimed to
remove) was an argument about the cheap quadrant. The valuable engine is smaller and targets obligations.

## Discipline analogs (this is a known move)

- **AI planning** abandoned *conformant* planning (robust-to-all-unknowns upfront, intractable) for
  *contingent / replanning* (act, observe, replan on divergence). Build-without-all-edges = replanning.
- **Type systems** are a machine for *converting silent edge-omissions into loud, cheap, build-time ones*
  — i.e. moving edges from the lethal quadrant to the top-left. That is their entire value proposition.
- **Walking skeleton / tracer-bullet** builds one thin end-to-end slice first, specifically to force the
  expensive-recovery seams to reveal themselves early and cheaply.
- **Lehman's laws:** software is never complete; the target moves. "Complete decomposition" chases a
  receding horizon.

## Where the reframe does NOT hold

It is **not** "discover nothing upfront." The expensive-recovery *column* survives even when loud: an
architectural or data-model edge self-reveals, but at integration time, after work has been built on the
wrong assumption, when recovery means a rewrite. The compiler tells you — too late to be cheap.

## Kill-tests (no model spend)

1. **Cost-weighted re-scoring on `hearth`.** Re-tag the 162-edge oracle on the 2×2 (would a
   compiler/linker/test catch this if omitted? recovery cost?), then re-score the Step-2/Step-3 runs with
   **cost-weighted recall** instead of uniform recall (reuse the partition scorer — swap "intra vs seam"
   for "lethal vs self-revealing").
   - *Confirms* if method ranking re-orders — a method that found fewer edges but more lethal-quadrant
     ones jumps ahead → uniform edge-recall was measuring the wrong thing.
   - *Kills* if rankings barely move → the quadrants aren't separable on real fixtures; reframe is academic.
2. **Build-batch history as ground truth.** When a builder hit a missing edge in past `build-batch` runs,
   was it caught by the gate (self-revealing) or did it ship (silent)? Free, real-world quadrant
   distribution — tells us how big the lethal quadrant actually is.

## Status

Reframe only — nothing re-scored yet. If the cost-weighted re-score re-orders methods, the staircase's
optimization target changes from **edge recall** to **lethal-quadrant (silent-omission) recall**, and the
obligations layer — not the edges layer — becomes the main event. The convergence/saturation machinery
from `PRIOR-ART-COMPLETENESS.md` (capture-recapture, decorrelated generators) should then be aimed at the
lethal quadrant, not at all edges.
