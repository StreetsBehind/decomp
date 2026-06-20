# Batch-2 epoch #3 — ACTIVE STRATEGY ABLATION (gleaning #3) — RESULTS

**Status: BUILT + GREEN + RAN.** Verdict on the deterministic P2a/P2b-calibrated landscape: **ROBUST** —
the P2c rediscovery survives the parent-selection-policy swap. This is an **instrument validation**, NOT a
new economics claim (same anti-circularity caveat as P2c; the economics claim remains P2b's, live/measured).

- driver:  `studies/meta-search/strategy-ablation.mjs`
- gate:    `studies/meta-search/gates/strategy-ablation.mjs`  (**32/32 GREEN**, every layer shown to fire with a trip + a no-false-positive control)
- run out: `studies/meta-search/runs/strategy-ablation.{json,log}`

---

## What was built

The P2c evolutionary search (MAP-Elites + credit-attribution + surrogate, all ON) rediscovers the
cost-dominating config under ONE parent-SELECTION policy: μ-best (the celled default). DECISION-BRIEF #3
asks whether that finding is **robust** to the selection policy, or a μ-best artifact. The driver REUSES the
P2c machinery VERBATIM and parameterises **the one thing that varies** — `selectParents = getStrategy(name)`
from `src/strategy-registry.mjs` — over the **frozen ablation set `{mu_best, pareto_per_cell}`**, across both
mutator seeds and the full N ladder `{5,9,13,17}`. Everything else (naive seed pool, discoveryProposer,
MAP-Elites archive, credit step, surrogate, scale-economics evaluator, bare-opus baseline, the dominance
predicate) is identical to `p2c-search.mjs:runOneSeed`, so the ablation isolates the **selection-policy
effect** and nothing else.

### The pre-registered agreement rule (DECISION-BRIEF #3)
Implemented as the pure, testable `applyAgreementRule(arms)`:
> a result is a FINDING (`robust`) iff the **load-bearing-mutation identity** AND the **scale-gate N-bucket**
> are IDENTICAL across BOTH strategies × BOTH seeds. ANY disagreement → `strategy-sensitive`, NOT a finding.

- **load-bearing-mutation identity** = a canonical signature DERIVED from the actual winner genome (never
  hardcoded): `tier:{cheap|opus}|shapes:{bool}|gate:{kind}|checker:{bool}`. `none` when no winner-config emerges.
  It is taken at each trajectory's OWN scale-gate N (the gene config that earned the lowest-N dominance).
- **scale-gate N-bucket** = the LOWEST N at which dominance holds (`dominatesBaseline`: winner.cost < bar.cost
  ∧ per-cell lethal non-inf — already guaranteed at insertion — ∧ rel ≥ baseline.reliability − DELTA), or
  `none` if it never dominates.
- A `strategy-sensitive` result is reported **faithfully as a valid honest outcome**, never "fixed".

---

## Freeze-safety (verified)

- **`node p0.mjs` → GREEN 5/5** (the frozen P0/K8 path is bit-identical — the default `selectParents` is still
  absent/`mu_best`, the registry is unchanged, and no frozen driver constructs the non-default strategy).
- **`git diff -- studies/meta-search/src/config.mjs` is EMPTY** (no frozen constant touched).
- **`git diff -- studies/build-gap/ epics/` is EMPTY** (frozen apparatus untouched).
- **`eval_epoch` stays 0** — there is no fitness defect; the STRATEGY label is the discriminator. Every arm
  record AND the run summary are labelled `(eval_epoch, strategy)` via `stampEpoch`/`stampEach`.
- This is **ONE clean-restart epoch**; the ACTIVE STRATEGY is the **only** trajectory-perturbing change
  (no #2b-POST / #4-bump / #6-ideator co-batched, per the cross-cutting rule).
- `pareto_per_cell` is parent **selection**, never the frozen per-cell insertion **veto** (selection ≠
  survival → freeze-safe; the gate's VETO layer proves a selection call performs ZERO `archive.insert`).

---

## The gate — every layer shown to fire (32/32)

| layer | what it proves | trip case | no-false-positive control |
|---|---|---|---|
| AGREE | `applyAgreementRule` FLIPS `robust ⇄ strategy-sensitive` (non-gameable) | planted scale-gate-N disagreement → sensitive; planted load-bearing-identity disagreement → sensitive; never-dominates → sensitive | planted AGREEING set → robust, zero disagreements |
| FROZEN | frozen ablation set = exactly `{mu_best, pareto_per_cell}` | `getStrategy(top_k\|softmax\|epsilon_greedy\|argmax)` REJECTED/absent | both frozen members resolve |
| STAMP | every arm + summary carry `(eval_epoch, strategy)` | un-stamped arm has NO `eval_epoch`; `stampEpoch` refuses a bare array | stamped arm has epoch 0 + strategy; summary carries strategies list |
| VETO | selection ≠ survival | (n/a — structural) | a SELECTION call → 0 inserts; veto still rejects a lethal drop AND still admits a non-dropper |
| E2E | `runOneArm` runs under BOTH strategies on N=5 | (n/a) | well-formed arm record; load-bearing identity DERIVED from the actual winner (not hardcoded) |

---

## Run results — the full ladder (deterministic landscape; instrument validation, NOT a new economics claim)

`node studies/meta-search/strategy-ablation.mjs` (N=5,9,13,17 × seeds 1,2 × {mu_best, pareto_per_cell}):

**Per-arm: the two strategies produce IDENTICAL winners at every (N, seed).** On this landscape the
cost-dominating config strictly dominates its MAP-Elites cell, so the converged winner does not depend on the
parent-selection policy — `mu_best` and `pareto_per_cell` agree arm-for-arm (same winner label, cost, rel,
load-bearing identity). The pre-registered `dominatesBaseline` reads true from N=5 upward (winner $0 vs the bar's
$0.278–0.431, rel ≥ baseline − DELTA, lethal non-inf guaranteed at insertion) — but see the **reconciliation
below**: the N=5/9 dominance is a small-N rounding tie, not real erosion, and does NOT overturn P2b's N≥13 crossover.

Per-trajectory derivation:

| trajectory | scale-gate N | load-bearing identity at gate-N |
|---|---|---|
| `mu_best#1` | 5 | `tier:cheap\|shapes:true\|gate:deterministic\|checker:false` |
| `mu_best#2` | 5 | `tier:cheap\|shapes:true\|gate:deterministic\|checker:false` |
| `pareto_per_cell#1` | 5 | `tier:cheap\|shapes:true\|gate:deterministic\|checker:false` |
| `pareto_per_cell#2` | 5 | `tier:cheap\|shapes:true\|gate:deterministic\|checker:false` |

**AGREEMENT VERDICT: ROBUST** — all 4 trajectories agree on scale-gate N = 5 and on the load-bearing identity
`cheap-skeleton + shapes + deterministic integration-gate` (checker off at the gate-N). The P2c rediscovery
(cheap-build skeleton + shapes + the deterministic integration-gate, $0, dominating the eroding bare-opus bar)
**survives the selection-policy swap** — it is not a μ-best artifact.

> Note on the rule's mechanism: at the higher N=13 cell, one seed's *winner* incidentally also turns the
> checker on (`checker:true`) — but the agreement rule pre-registeredly compares the identity at each
> trajectory's **scale-gate N** (the lowest dominating N = 5 for all), where every trajectory carries the same
> `checker:false` load-bearing config. This is the rule working as specified, not a special case.

### Reconciliation with P2b/P2c — the scale-gate N=5 is a small-N quantization artifact (NOT a new crossover)

The pre-registered **scale-gate N** axis reads **5** because `dominatesBaseline` is true on **cost alone** once a
small-N `Math.round` count-tie erases the integration deficit — it does **not** mean the hybrid genuinely beats
bare-opus at N=5. Verified per-N (integration cells, winner vs bare-opus):

| N | cells | winner INTEG | bare-opus INTEG | why "dominates" | genuine erosion? |
|---|---|---|---|---|---|
| 5  | 3  | `round(0.89×3)=3` | `round(1.00×3)=3` | **tie 3/3** → cost-only win | no (rounding tie) |
| 9  | 6  | `round(0.72×6)=4` | `round(0.70×6)=4` | **tie 4/6** → cost-only win | no (rounding tie) |
| 13 | 9  | `round(0.85×9)=8` | `round(0.55×9)=5` | **8 > 5** → real erosion | **YES** |
| 17 | 12 | `round(0.69×12)=8` | `round(0.50×12)=6` | **8 > 6** → real erosion | **YES** |

The driver now emits an additive **`strictErosionCrossover`** diagnostic (lowest N where the winner passes
*strictly more* integration cells than bare-opus). It reports **N=13 for all four trajectories** — consistent
with the established **P2b/P2c crossover (N≥13)** where bare-opus erodes. This **does not change the ROBUST
verdict**: both strategies see the identical quantization, so they still agree; the agreement is genuine. It
only prevents the `scale-gate N=5` number from being misread as overturning the measured N≥13 crossover. (Catching
a count-quantization that masquerades as a win is the same discipline as the worst-of-K / `rate()` / lucky-replicate
guards — a metric that looks like a win must survive a strict-erosion check.)

### Limitations (the standing anti-circularity caveat — IDENTICAL to P2c)
- Runs on the **deterministic P2a/P2b-calibrated** scale-economics landscape (one live N=13 eval exceeds 150s),
  so this is an **instrument validation** (does the search's conclusion survive a selection-policy swap?), NOT
  a new economics claim. The economics claim remains **P2b's** (live, measured).
- Opus-whole cost proxy + bare-opus INTEG proxy (the routed-baseline gap, STATE.md #3); one seam-topology;
  the winner is **PROPOSED, not frozen**. The full live multi-seed sequestered-TEST search is **P3**.
- On this landscape the two strategies converge to the same winner, so the ablation confirms **insensitivity**
  rather than exercising a regime where the policies diverge to different winners. A regime that genuinely
  separates the policies (multiple non-dominated cheap-cell optima) would be a stronger test — out of scope
  here (P3, live).
- The **scale-gate-N agreement axis is non-discriminating below N=13** on this landscape (a small-N `Math.round`
  integration count-tie makes every policy "dominate" on cost from N=5) — see the Reconciliation table. So the
  robustness evidence rests on the **load-bearing-mutation identity** agreement + the **byte-identical winners at
  every cell** (the critic independently confirmed identical winner hash/gens/evals at all 16 cells), not on the
  scale-gate-N number. The genuine erosion crossover (`strictErosionCrossover`) is N≥13, matching P2b/P2c.

---

## Reproduce

```
node studies/meta-search/gates/strategy-ablation.mjs        # 32/32 GREEN (every layer shown to fire)
node studies/meta-search/p0.mjs                             # P0 GREEN 5/5 (frozen path bit-identical)
node studies/meta-search/strategy-ablation.mjs              # full ladder → ROBUST
node studies/meta-search/strategy-ablation.mjs --N 5 --seeds 1   # quick smoke
```
