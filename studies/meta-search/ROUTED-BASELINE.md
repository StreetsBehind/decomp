# Routed all-frontier baseline — first live results (P3 prerequisite #3)

> **Status (2026-06-18): BUILT + FIRST LIVE RESULTS IN — and they CHALLENGE the provisional hybrid win.**
> The cost-optimized routed baseline (per-surface: haiku→CRUD, sonnet→writers, opus→seam; + opus skeleton
> anchor), graded by the SAME independent oracles, **builds at 100% crosscut / 100% integration through D=3
> with no erosion.** This is the proper (non-strawman) baseline the win condition names, and it is strong.
> Harness: `routed-baseline.mjs`. Raw: `runs/routed-baseline-live.json` (NB: overwritten per run — the d1
> rows below are preserved here because that file now holds only the d2/d3 run).

## Measured epics (live `claude` CLI, real $; K=1)

| epic | routes (haiku/sonnet/opus) | crosscut | integration | surface $ | total $ (incl. $0.395 opus skeleton anchor) |
|---|---|---|---|---|---|
| approval-d1 | 2 / 1 / 1 | 100% | 100% | 0.416 | 0.811 |
| lifecycle-d1 | 2 / 1 / 1 | 100% | 100% | 0.306 | 0.701 |
| quota-d1 | 2 / 1 / 1 | 100% | 100% | 0.347 | 0.742 |
| membership-d1 (graded by 2nd oracle) | 2 / 2 / 1 | 100% | 100% | 0.390 | 0.785 |
| approval-d2 | 4 / 2 / 2 | 100% | 100% | 0.774 | 1.169 |
| approval-d3 | 6 / 3 / 3 | 100% | 100% | 1.130 | 1.525 |
| lifecycle-d2 | 4 / 2 / 2 | 100% | 100% | 0.631 | 1.026 |
| lifecycle-d3 | 6 / 3 / 3 | 100% | 100% | 0.921 | 1.316 |
| quota-d2 | 4 / 3 / 1 | 100% | 100% | 0.551 | 0.946 |
| quota-d3 | 6 / 4 / 2 | 100% | 100% | 0.921 | 1.316 |

10 epics, all lethal buckets 100%. Measured spend ≈ **$10.34** (d1 batch $3.04 + d2/d3 batch $7.30).
Full 86-epic battery projected ≈ **$90** from real per-surface cost (~$0.073/surface + $0.395 skeleton/epic).

## Why this challenges the provisional win (the honest read)

- The P2b/P2c "cost×reliability crossover / hybrid win" was scored against the **opus-WHOLE proxy** — one opus
  call building the *whole* epic monolithically, which eroded at scale (X-CUT 78→80%, EPIC✓ 33→0% at N≥13).
- That erosion was a **monolithic** failure, NOT a frontier-capability failure. The proper cost-optimized
  baseline routes **per-surface**, and per-surface frontier coding nails every obligation (100% through D=3).
- So the provisional win was measured against a **weak monolithic proxy that flattered the hybrid.** Against
  the real routed baseline: **cost** favors the hybrid (coding $0 vs routed $0.35–1.1/epic, gap widens with
  scale), but **reliability** favors the baseline (100% vs the hybrid+gate's 69–85% INTEG). That is a
  cost/reliability **TRADE, not the pre-registered DOMINANCE** (parity AND cheaper).

## Not yet settled (do not over-claim the reverse either)

1. **Only D≤3 tested.** Opus-whole eroded at N≥13 (D≥4). The routed baseline may still break at D=4,5 — untested.
2. **The hybrid's 69–85% INTEG was proxy/landscape, NOT live.** The live gate hit 100% at d1 (P2a). A fair
   verdict needs a **live HEAD-TO-HEAD**: hybrid (cheap+gate) vs routed baseline on **identical** epics,
   co-measured.
3. K=1 single runs (no worst-of-K yet).

## Next (decisive, untested-live) — surfaced to the research lead as a thesis-level fork

- **(recommended) Live head-to-head** — run the hybrid cheap+gate on the same epics the baseline just aced,
  co-measured. The real P3 comparison; directly answers "does cheap+gate reach parity at ≤cost."
- **Push the baseline to D≥4,5** — find where, if ever, per-surface routed frontier coding erodes.
- **Reframe** — the honest framing may be "equal-reliability at lower cost only holds where frontier coding
  itself degrades." Whether/where that regime exists is exactly (a)+(b).

Routing policy + harness were decided autonomously; the experiment choice is the lead's (thesis-level).
