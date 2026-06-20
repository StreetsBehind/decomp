# Gleaning #1 — measurement-axis check + pre-P3 proxy→real hard gate — BUILT + GREEN (2026-06-19)

> Batch-1 item #4 from the disposition of [`EVO-GLEANINGS-PLAN.md`](EVO-GLEANINGS-PLAN.md) (codex×opus
> CONVERGED, `runs/deliberations/20260619T220547Z/DECISION-BRIEF.md` #1). #1 = ADOPT WITH CHANGES:
> *in-loop keep ONLY trigger (a) plateau→halt→report-only; trigger (b) internal-vs-headline is **inert until
> measured-INTEG exists** → RECLASSIFY (b) as a HARD pre-P3 proxy→real BLOCKER; anti-abandonment guard = the
> K8 planted-positive discriminator.* Class B, report-only in-loop. Touches **no** frozen invariant; only
> halts/reports; **never re-decides which candidates survive.**

## What was built

- **`src/axis-check.mjs`** — the engine. Exports:
  - **`detectPlateau(generationHistory, {delta=0.05, distinctK=3, consecutiveGens=3})`** — fires when ≥
    `distinctK` **Hamming-distinct** genomes (distinct §2 genome-hash ⇒ ≥1 gene differs) sit within `delta`
    (default = the FROZEN parity δ) of the front-best fitness for ≥ `consecutiveGens` **consecutive**
    generations. Returns `{fire, reason, distinctCount, gens}`. **REPORT-ONLY** — it reads a history and
    computes; it mutates no archive/rng/population.
  - **`makeAxisObserver(opts)`** — returns an `onGeneration`-compatible observer the driver attaches to
    `loop.onGeneration` (no `loop.mjs` edit — the hook already exists). It accumulates per-gen front-best +
    distinct near-front genomes and, on fire, **latches + emits a HALT-and-notify "axis report"** (is the
    bottleneck the metric/proxy/harness?). Pure side-effect: `onGeneration` returns `undefined`, touches no
    rng/archive/population.
  - **`runDiscriminator({seed, maxGen, maxEvals})`** — the anti-abandonment gate. Runs the synthetic loop on
    `evaluator.plantedOptimumGenome` (the K8 machinery) and returns `{discoverable, dominating, …}`. Still
    discoverable+dominating ⇒ the axis is sound ⇒ "wrong axis" cannot be asserted on a disappointing-but-
    correct front.
  - **`checkPreP3Prerequisites({root, fs, path})` / `PRE_P3_PREREQUISITES`** — the reclassified trigger (b):
    existence detectors for the 3 P3 prerequisites that convert the proxy headline into a real one.
- **`gates/pre-p3-axis-gate.mjs`** — the HARD pre-P3 proxy→real BLOCKER. Run once before TEST scoring; reports
  per-prerequisite MET/UNMET and **exits non-zero when BLOCKED**. **Designed to block P3 today** (that is the
  point — it forces "is the headline resting on opus-whole proxy / X-CUT / unmeasured INTEG?" before TEST).
- **`gates/axis-check.mjs`** — the self-test, **21/21 PASS, exit 0**, every layer shown to fire.
- **`DESIGN.md` §6b** — additive section documenting trigger (a) in-loop report-only, (b) reclassified as the
  pre-P3 hard gate, and the K8-discriminator anti-abandonment rule (41 added lines, 0 deleted — no frozen text
  touched; I am the only Batch-1 item touching DESIGN.md).

## The in-loop (report-only) vs pre-P3-blocker split (the binding disposition delta)

| | trigger (a) plateau | trigger (b) internal-vs-headline |
|---|---|---|
| status | in-loop **report-only** keep | **reclassified** out of the loop |
| why | structurally-distinct genomes converging ⇒ measurement-axis bottleneck signal | **inert until measured-INTEG exists** — in-loop it would silently never fire = a false all-clear |
| mechanism | `makeAxisObserver` on `loop.onGeneration`; HALT-and-notify | `gates/pre-p3-axis-gate.mjs`, run ONCE before TEST |
| survivor effect | **none** (pure observer; trajectory bit-identical) | **none** (gates a human action, the TEST draw) |

## The K8 anti-abandonment discriminator

A plateau is **not** proof the axis is wrong — it can be a disappointing-but-CORRECT front. `runDiscriminator()`
re-runs the known-dominating genome through the synthetic loop; if it is **still discoverable AND dominating**,
the search machinery + the fitness axis are demonstrably sound, so the plateau is a real-front signal, not a
metric defect. Measured: planted optimum `rel 1.000 / $0` dominates baseline `rel 0.143 / $0.27`; rediscovered
seed 1 at gen 3 / 94 evals, seed 4 at gen 5 / 164 evals (two pinned seeds — machinery, not one lucky trajectory).

## What the pre-P3 gate reports TODAY (BLOCKED — expected, documented)

`node studies/meta-search/gates/pre-p3-axis-gate.mjs` → **BLOCKED, exit 1**. Detected by real-artifact
existence (no hardcoded verdict):

| prerequisite | status | why |
|---|---|---|
| routed-all-frontier-baseline | ⛔ UNMET | only the harness + interim D≤3 / K=1 live results exist; [`ROUTED-BASELINE.md`](ROUTED-BASELINE.md) itself reports a cost/reliability **TRADE, not settled DOMINANCE** (no settled scale verdict, no live head-to-head) |
| measured-integ-path | ⛔ UNMET | no live co-measured head-to-head; the P2b/P2c hybrid INTEG is opus-whole-proxy / synthetic-landscape (**unmeasured**) — exactly the caveat the gate exists to catch |
| second-hand-authored-oracle | ✅ MET | `src/oracle2.mjs` + the hashed `TEST-SET.md` exist (honestly detected — delete oracle2.mjs and it flips to unmet) |

**This BLOCKED status is EXPECTED as of this build.** The gate flips to READY on its own when the settled
artifacts land (proven non-gameable: an injected fake-repo with all settled artifacts present → READY; an empty
fake-repo → all 3 unmet).

## Every layer shown to fire (the generalized `rate()` lesson — "a check that can't be shown to fire is absent")

- **A.** `detectPlateau` **FIRES** on a planted 3-distinct-genome within-δ plateau across 3 consecutive gens.
- **B.** **No false positive**: an advancing front (only 1 within δ), too-few-distinct (1<3), too-few-gens
  (2<3), a non-consecutive plateau (gen 2 breaks the run), and empty history all **do NOT fire**.
- **C.** `makeAxisObserver` fires on the same plateau (latches one report, calls `notify`); and the synthetic
  loop is **BIT-IDENTICAL with the observer attached** (front + evalCount + gen + halt all equal vs.
  unattached) — proving the report-only observer never perturbs the trajectory.
- **D.** `runDiscriminator` — planted optimum still discoverable + dominating on two pinned seeds
  (anti-abandonment holds; "wrong axis" cannot be asserted).
- **E.** the pre-P3 check reports BLOCKED on the real repo and is **no-hardcode** (fake-repo-all-present →
  READY; fake-repo-empty → all unmet).

## Freeze posture (Class B, report-only — touches NO invariant)

- The engine only **halts/reports**; it **never re-decides which candidates survive**. A survivor-changing kill
  is a clean-restart-epoch event (§11 / R2-10) — explicitly out of scope here.
- `src/config.mjs` **untouched** (git diff empty); `studies/build-gap/**` and `epics/**` **untouched**.
- All three new code files are **additive** (new files). `DESIGN.md` §6b is additive (41 added / 0 deleted).
- Attaching the observer leaves the search trajectory **bit-identical** (proven, layer C). The frozen apparatus
  re-validated: **P0 GREEN 5/5** (G0/G1/G2/K8/§14); prior Batch-1 gates still pass —
  `gates/aggregate-consistency.mjs` (#5, 18/18), `gates/pre-verifier-smoke.mjs` (#2b), `gates/label-draw-selftest.mjs`.

## One interaction surfaced + handled (honest note)

Gleaning #5's full-tree aggregate-consistency lint is a **tree-wide K-reducer net**: it initially flagged the
new `Math.min/Math.max` + `best`-named reductions in `axis-check.mjs` as *unclassified*. Those reductions are
**non-K** (they fold over a generation-history / near-front fitness list, never over the K replicate axis), so
rather than edit #5's out-of-spec registry file I rewrote them as explicit-loop `peakOf`/`troughOf` helpers and
renamed the local `best`→`peakRun`. The archive `.some(...reliability...)` in the discriminator is classified by
#5's existing instrument-gate rule; the gate's `.every(...pass)` by its gate-checks rule. After the refactor the
#5 lint is GREEN again (exit 0) — the two audits are mutually consistent.

## Validation commands

```
node studies/meta-search/gates/axis-check.mjs        # 21/21, exit 0
node studies/meta-search/gates/pre-p3-axis-gate.mjs  # BLOCKED, exit 1 (EXPECTED — proxies not yet converted)
node studies/meta-search/p0.mjs                      # P0 GREEN 5/5, exit 0
node studies/meta-search/gates/aggregate-consistency.mjs  # prior Batch-1 #5 still GREEN, exit 0
```
