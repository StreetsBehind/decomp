# Meta-search — P1 results (cheaper-author × checker arm at fixed N=5)

> **Status: CONCLUDED 2026-06-17 — loop-closure ✓; the per-surface checker lever is NULL at N=5 (the
> pre-registered K1-at-N=5 outcome).** The research lead accepted this finding (no full multi-seed rigor
> run) and elected to proceed to **P2 (the scale sweep)**, where MCOH25 locates the checker's payoff. The
> apparatus is built, validated, and additive; the frozen tree `studies/build-gap/` (`1580944…`) is
> **untouched**. No frozen invariant was changed → nothing is voided.
>
> Re-run the probe: `node studies/meta-search/p1.mjs --probe --epic scale-d1`. The pilot:
> `node studies/meta-search/p1.mjs --pilot --epic scale-d1`. (Run outputs land in the gitignored
> `runs/`; this file is the committed record.)

## What P1 asked (DESIGN §9 P1 / FREEZE A1)

P1 is the **cheaper-author × checker arm** at fixed N=5 over the anchor pair `{workspace, scale-d1}`. Its
primary question is the **mechanism, not a cost-win**: *does the per-surface checker lever move `crosscut`
(per-surface tenancy/authz/mass-assign) and `integration` (the cross-surface membership seam)?* The cost
arm was pre-registered as **expected to fail K1 at N=5** (MCOH25: opus-author $0.395 > the $0.27 bar).

## What was built (additive under `studies/meta-search/`)

The live cheaper-author × checker arm: `src/skeleton-author.mjs` (tier-sourced cached skeletons + real
metered MCOH25 cost: fusion $0 / sonnet $0.092 / opus $0.395), `src/checker.mjs` (the searched lever —
deterministic + cheap-judge obligation/seam checks + re-prompt repair, **oracle-blind + K3-scanned**),
`src/proposer.mjs` (reflective frontier proposer over the quadrant-only digest + a heuristic stand-in),
`src/baseline.mjs` (the co-measured opus-whole proxy), the live `src/evaluator.mjs`, the `p1.mjs` driver,
and `gates/p1-smoke.mjs`. `mutate`/the loop gained an **async** path + an `onEval` sink.

**Validation before any live run:** the deterministic P1 smoke passes **14/14 with zero spend** (proposer
drives mutation; checker static logic + repair loop + the K3 oracle-leak scan; skeleton sourcing; the
cheaper-author cost ladder). **P0 re-ran GREEN 5/5** after the async change — K8 (30/30) and the §14
round-trip stay **bit-identical**, confirming the change is determinism-preserving.

## Results — the probe (4 cells on scale-d1, K=1)

`{fusion, sonnet} skeleton × {deterministic, cheap-judge} checker`, each vs its own checker-OFF build:

| cell | OFF X-CUT / INTEG | ON X-CUT / INTEG | checker fired? | Δ X-CUT / INTEG |
|---|---|---|---|---|
| fusion / deterministic | 100% / 0% | 100% / 0% | **no** (0 viol, 0 repairs) | 0 / 0 |
| fusion / cheap-judge | 71% / 0% | 100% / 0% | **no** (0 viol, 0 repairs) | +29pp / 0 |
| sonnet / deterministic | 100% / 0% | 71% / 0% | **no** (0 viol, 0 repairs) | −29pp / 0 |
| sonnet / cheap-judge | 100% / 0% | 100% / 0% | **yes** (3 viol, 1 repair) | 0 / 0 |

The pilot's controlled A/B (deterministic, fusion skeleton) matched: OFF and ON both X-CUT 86% / INTEG 0%,
repairs 0; the live loop closed (7 candidates, empty veto-archive as pre-registered, clean halt at max-gen).

## What it means (the honest reading)

1. **INTEG (the seam) is 0% in every cell, OFF and ON — and a per-surface checker structurally cannot fix
   it.** The seam is a cross-surface *shape agreement* (`addMember` writes the membership, `postComment`
   reads it); a checker that inspects **one surface at a time** cannot see a two-surface mismatch. INTEG 0%
   for cheaper authors also reproduces MCOH25 exactly (only opus-authored skeletons restore the seam).
2. **The X-CUT deltas are gateway noise, not the checker.** In the three cells where the checker was
   **inert** (0 violations / 0 repairs), X-CUT scattered +0 / +29 / −29 pp — pure K=1 free-pool lottery. In
   the one cell where the checker actually **fired** (sonnet/cheap-judge), X-CUT moved 0pp. So: when the
   checker did nothing, scores scattered ±29pp; when it did something, nothing moved.
3. **The deterministic checker is inert** (0 violations everywhere): its static token-presence heuristics
   pass code that is superficially correct but semantically wrong. Only the cheap-judge variant has teeth.
4. **K1-at-N=5 is confirmed (pre-registered).** No cheaper-author candidate reaches the per-cell veto vs
   the perfect N=5 opus-whole baseline (X-CUT/INTEG 100%, $0.247): INTEG is 0% and unrecoverable by a
   per-surface lever, and X-CUT is already near-ceiling with no headroom. The cost-win is scale-gated
   (MCOH25 Result 4): the regime where bare-opus *erodes and gets pricier* (N≥13) is where a hybrid win
   could live, not N=5.

## What P1 does NOT claim

The probe is **K=1** (no worst-of-K), so the X-CUT numbers are noise-dominated and no *quantitative*
mechanism magnitude is claimed — only the **qualitative null** (the checker does not move the lethal
buckets at N=5) and **loop-closure**. The full multi-seed worst-of-K rigor run was **not** executed (the
research lead judged a rigorous re-confirmation of a pre-registered null low-value vs. moving to scale).

## Next: P2 (the scale sweep) — kickoff seed

P1 sharpens two things for P2:

- **Add the integration-gate + repair lever to the genome** (build-gap DESIGN §4b: after assembly, run a
  cross-surface consistency check and route each mismatch back to the offending surface). The per-surface
  checker is the *wrong* lever for the seam; INTEG needs a *cross-surface* lever. This is a node-supply
  addition (§11), admitted via the clean-restart rule (R2-10) — clean because P2 is a new phase.
- **Run the scale sweep where the checker pays off.** MCOH25: X-CUT erodes at scale (N=13 → 78%, N=17 →
  80%) and bare-opus EPIC✓ collapses (N=17 → 0%) while costing more ($0.43 > the ~$0.40 orchestration
  term). The cheapest first P2 step = **scale the existing `scale-d{1,2,3,4}` ladder with the checker +
  integration-gate levers on**, and ask: does the hybrid hold the lethal-quadrant where bare-opus erodes,
  at ≤ cost? (External validity still needs the deferred **diverse-template authoring** + the **2nd
  hand-authored oracle** before any "confirmed" promotion — FREEZE §4/§6, DESIGN §5/§10.)
- **Switch on the deferred machinery** (DESIGN §9 P2): celled MAP-Elites, credit-attribution
  (skeleton-first, gated), the surrogate-scorer (under K7), knowledge-conditioning (niching-gated).

The instrument is trusted (K8 passed in P0; the live loop closes). The P2 entry point is in STATE.md
(parallel track, follow-up 8) and the memory ([[workflow-search-m5-fit]]).
