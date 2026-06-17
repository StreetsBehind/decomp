# Meta-search — P2b results (the scale sweep: the cost×reliability crossover)

> **Status: the predicted COST×RELIABILITY CROSSOVER is OBSERVED.** With the P2a-confirmed deterministic
> integration-gate switched on across the size ladder, the hybrid (cheap coding + a frozen skeleton + the gate)
> behaves exactly as the program predicted: at **N=5 bare-opus wins** (perfect + affordable = the pre-registered
> K1-at-N=5), but at **N≥13 — where bare-opus erodes (X-CUT 78→80%, EPIC✓→0%) and gets pricier ($0.39→$0.43) —
> a $0 hybrid holds X-CUT *above* bare-opus (89–90%) and the gate recovers INTEG to 69–85%, at zero cost.** The
> integration-gate is precisely what holds the hybrid's integration (the bare harness's weak spot) at scale.
> This is a **provisional** win (opus-whole cost proxy; X-CUT sub-metric; 3-round samples) — the strongest
> evidence yet for the north-star thesis, not the final P3 result. Apparatus additive; frozen tree `1580944…`
> untouched. Re-run: `node studies/meta-search/p2b-sweep.mjs`.

## What P2b asked

P2a confirmed the *mechanism* (the cross-surface integration-gate recovers the membership seam). P2b asks the
**program's headline question** with the gate on across the ladder:

> Does the HYBRID (cheap coding + a frozen skeleton + the deterministic integration-gate) **hold the lethal
> quadrant where bare-opus erodes and gets pricier (N≥13), at ≤ cost?**

The bar is MCOH25 Result 4 (the all-frontier reference): bare-opus erodes from EPIC✓ 100%/X-CUT 100%/$0.278 at
N=5 to EPIC✓ 0%/X-CUT 80%/$0.431 at N=17, and the bare (no-gate) harness already holds X-CUT (~95%) but its
EPIC✓ collapses — i.e. its weak spot at scale is **integration**, the exact thing the gate fixes.

## Instrument re-validation at the P2b phase boundary

The `integrationGate` mutation operator (admitted to the type system at P2a, left unwired so P0/K8 stayed
bit-identical) was **wired** at the P2b clean-restart (R2-10). K8 was **re-validated** under the widened
19-operator set: **29/30 (97%) ≥ the frozen 0.90 floor**, worst evals 199/300 — the instrument remains trusted.
P0 GREEN 5/5. (No longer bit-identical to the P1-era trajectory — the operator set legitimately changed at the
phase boundary; the *cross-phase* frozen invariants — fitness weights, per-cell veto, δ/α, TEST policy — are
untouched.)

## Method

`p2b-sweep.mjs`: a **paired** measurement (build each surface ONCE per round, grade gate-OFF, then copy +
deterministic-gate + grade gate-ON → the gate's effect with zero build-noise), 3 rounds/cell, over
scale-d{1..4} (N=5,9,13,17) × {fusion, opus} skeleton. **Cost is analytic** (all builds/repairs run on the free
gateway = $0; the skeleton is cached so its authoring cost is the metered MCOH25 anchor: fusion $0, opus $0.395,
amortizable over M same-topology epics). Cheap-judge gate omitted (P2a-null). Provisional baseline = opus-whole
proxy (the routed all-frontier baseline is the external workstream, STATE.md #3).

## Results — the full ladder

`X-CUT`/`INTEG` = pooled lethal-bucket pass-fractions (mean over 3 paired rounds); `EPIC✓` = fraction of rounds
all-four-buckets-perfect (coarse at 3 rounds). Hybrid is gate-OFF → gate-ON.

| N | tier | X-CUT OFF→ON | INTEG OFF→ON (Δ) | EPIC✓ ON | cost (M1 / M12) | bare-opus bar | read |
|---|---|---|---|---|---|---|---|
| 5  | fusion | 100→100% | 0→**89%** (+89) | 67% | **$0** | EPIC✓100% X-CUT100% **$0.278** | bare-opus wins (perfect) |
| 5  | opus | 100→100% | 100→100% (0) | 67% | $0.395 / $0.033 | — | gate inert (opus already pins seam) |
| 9  | fusion | 89→89% | 0→**72%** (+72) | 0% | **$0** | EPIC✓67% X-CUT94% $0.361 | transition (X-CUT just below bar) |
| 9  | opus | 97→**100%** | 72→83% (+11) | **67%** | $0.395 / $0.033 | — | X-CUT +6pp, EPIC✓=bar |
| 13 | fusion | 88→**90%** | 30→**85%** (+56) | 0% | **$0** | EPIC✓33% X-CUT**78%** **$0.387** | **hybrid: X-CUT +12pp, free** |
| 13 | opus | 92→94% | 63→67% (+4) | 0% | $0.395 / $0.033 | — | X-CUT +16pp |
| 17 | fusion | 89→89% | 33→**69%** (+36) | 0% | **$0** | EPIC✓**0%** X-CUT**80%** **$0.431** | **hybrid: X-CUT +9pp, free** |
| 17 | opus | 86→86% | 61→64% (+3) | **33%** | $0.395 / $0.033 | — | **EPIC✓ 33% vs bare-opus 0%** |

The driver's own per-cell verdict (X-CUT-hold within δ=0.05 + cheaper): **WIN at N=13 fusion, N=17 fusion, N=17
opus** (and a degenerate "X-CUT-win" at N=5 fusion that the strict-bar reading below corrects); "cheaper,
check-X-CUT" at the opus-M1 cells (opus authoring $0.395 ≈ the bar at M=1, clearly cheaper at M≥2) and at N=9
fusion (X-CUT 89% just under the bar's 94%). Machine record: `runs/p2b-sweep.json`.

## The crossover (the honest reading)

1. **N=5 — bare-opus wins.** It is perfect (EPIC✓ 100%) and affordable ($0.278); the hybrid recovers INTEG to
   89–100% but doesn't beat perfection. This is the **pre-registered K1-at-N=5** (the hybrid does not win at
   small N), reproduced.
2. **N≥13 — the hybrid wins on the lethal sub-metric at lower cost.** Where bare-opus erodes (X-CUT 78→80%,
   EPIC✓ 33→0%) and gets pricier ($0.387→$0.431), the **$0 fusion+gate hybrid holds X-CUT *above* bare-opus
   (89–90%)** and the gate **recovers INTEG to 69–85%** (from a 30–33% gate-off floor) — at **zero cost**. The
   opus+gate hybrid even clears the strict **EPIC✓ at 33% where bare-opus is 0%** (N=17), at a cost that
   amortizes to $0.033 (M=12) far below the $0.431 bar.
3. **The integration-gate is the load-bearing lever for the win.** Gate-OFF, the cheap hybrid's INTEG is
   0–33% (the harness's collapse); gate-ON it is 69–85%. Without the gate there is no reliability hold at
   scale; with it, the lethal quadrant holds where bare-opus cannot — at $0.
4. **Cheapest skeleton is strongest at scale.** Counter-intuitively, fusion+gate INTEG (69–85%) ≥ opus+gate
   INTEG (64–67%) at N≥13. The opus skeleton already pins the seam (gate-OFF INTEG 61–63%) so the gate adds
   little; the cheap skeleton fails the seam in the *clean init-crash* way the gate fixes outright → the gate
   delivers most where the skeleton is cheapest. So the **$0 hybrid is the headline winner.**

## What P2b claims — and what it does NOT

**Claims (provisional):** with the integration-gate on, the **hybrid holds the lethal sub-metric (X-CUT) above
an eroding bare-opus at strictly lower cost in the N≥13 regime**, and the gate recovers the integration bucket
that the bare harness loses at scale. The cost×reliability crossover the program hypothesized is **observed on
the lethal-quadrant sub-metrics** for the first time.

**Does NOT claim (the gaps to a P3 result):**
1. **Not the strict EPIC✓ win.** All-four-buckets-perfect is mostly 0% for the hybrid at N≥13 (X-CUT ~90% and
   INTEG ~85%, not 100%) — the hybrid is *better than eroding bare-opus*, not *perfect*. The FREEZE win is the
   per-cell lethal non-inferiority + cost-weighted parity, not EPIC✓; that exact test is reserved for the
   sequestered TEST at P3.
2. **The X-CUT comparison is a sub-metric.** MCOH25 gives bare-opus X-CUT + EPIC✓ + cost per N, but not its
   per-bucket INTEG, so the *full* lethal-quadrant non-inferiority (hybrid INTEG vs bare-opus INTEG) is not yet
   computable here — it needs the routed-baseline workstream.
3. **Provisional cost** (opus-whole proxy, not the routed all-frontier baseline) and **3-round samples** (the
   X-CUT/INTEG fractions are stable; EPIC✓ is coarse). Not run through the per-cell veto / non-inferiority test.
4. **External validity unchanged** — one seam-topology (size-variants of one template); the deferred
   diverse-template authoring + 2nd hand-authored oracle remain prerequisites for any "confirmed" promotion.

## Next: P2b-continued / P3

- **Run the evolutionary SEARCH** (not just this controlled measurement): switch on the deferred machinery —
  celled MAP-Elites, gated credit-attribution, the surrogate-scorer (K7), niching-gated knowledge-conditioning
  — and let the loop *discover* the dominating config at scale, then **freeze and re-test it** as the fixed
  architecture (the instrument→product step). The operator is now wired for this.
- **Tighten the lever** (P2a/P2b flags): make the route-back repair preserve existing obligation guards (the
  small X-CUT −3pp seen at d3 in P2a); push INTEG past ~85% (repairDepth tuning; the gate fixes most-but-not-all
  seams per round at high N).
- **The routed all-frontier baseline** (external workstream) — to convert the provisional X-CUT-sub-metric win
  into the full lethal-quadrant cost win.
- **External validity:** diverse-template authoring + the 2nd hand-authored oracle, before any "confirmed"
  promotion (FREEZE §4/§6), then the sequestered-TEST P3 falsification.
