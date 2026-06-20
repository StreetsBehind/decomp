# GAMING-RISKS — the living gaming-risk register (gleaning #2a) — 2026-06-19

> Batch-1 item #2 from the disposition of [`EVO-GLEANINGS-PLAN.md`](EVO-GLEANINGS-PLAN.md) (codex×opus
> CONVERGED, `runs/deliberations/20260619T220547Z/DECISION-BRIEF.md` #2). #2a = ADOPT WITH CHANGES:
> *"consolidate DESIGN §8 (failure modes designed against) + the §2 anti-gaming constraints into ONE
> maintained table, and ADD evo's named vectors not yet explicit: subsetted-eval, cache short-circuit,
> score-irreproducibility, generic-hypothesis."* Built **LAST** in Batch 1 so it cites the **actual gate
> files** the other items produced. Class A — **pure documentation/consolidation**; touches **no** frozen
> invariant; writes only this file.

This is the single maintained ledger of *every way the meta-search could fool itself into reporting a win
that is not real*, mapped to the **concrete gate** that enforces the mitigation. It folds together two prior
scattered sources:

- [`DESIGN.md`](DESIGN.md) **§8** ("Failure modes designed against") — the prose list.
- [`DESIGN.md`](DESIGN.md) **§2** ("Hard constraints in the type system (anti-gaming)", constraints 1–5).

…and adds **evo's four named vectors** (from [`EVO-HQ-EVALUATION.md`](EVO-HQ-EVALUATION.md) / the method
library) that were *implicit but not explicit* in §8 — `subsetted-eval`, `cache short-circuit`,
`score-irreproducibility`, `generic-hypothesis` — each of which the just-built Batch-1 instruments now address.

**Maintenance rule.** This table is the **canonical index**: when a new gate lands, add/flip its row here.
A `status` of **GREEN** means *a gate file exists in [`gates/`](gates/) AND passes* (verified at the date
above). **PLANNED** = the kill is a clean-restart / Batch-2 event (see the sequencing in the DECISION-BRIEF).
**DOC** = process-only (a discipline a code gate cannot enforce). Every cited gate path below was confirmed to
**exist on disk** before citing it (the disposition's "a check that can't be shown to fire is ABSENT" rule
applies to citations too — a phantom gate is a fake all-clear).

---

## The register

| # | Risk (the self-fooling) | Vector (how it would be exploited) | Mitigation | Gate / enforcer | Status |
|---|---|---|---|---|---|
| 1 | **Overfitting** to the seen battery | Tune a genome to the in-loop CORE; report it as general | TRAIN/VAL/sequestered-TEST split; P3 scores **once** on the hashed TEST set via the independent oracle | TEST-set hash in [`FREEZE.md`](FREEZE.md) (frozen invariant); P3 protocol [`DESIGN.md`](DESIGN.md) §5/§7; sequestration tripwire is the pre-P3 gate [`gates/pre-p3-axis-gate.mjs`](gates/pre-p3-axis-gate.mjs) | DOC |
| 2 | **Reward-hacking** the fitness | Buy back a dropped lethal cell with cheap cells; "average over the silent-expensive tail" | **Per-cell** non-inferiority **VETO at insertion** (every `crosscut`/`integration` cell), Pareto (never scalarized), quadrant-only digest | per-cell veto `archive.perCellVetoOk` checked by [`gates/g1-per-cell-metric.mjs`](gates/g1-per-cell-metric.mjs) (G1, P0-blocking) | GREEN |
| 3 | **Aggregate-gaming / lucky-best-replicate** | A non-worst K-reducer (`min`/`mean`/`best`/per-run) silently feeds a decision (the historical VOID `rate()` "92/92") | Canonicalize on `scorecard.worstOfK`; full-tree static enumeration of every K-reducer; AND-over-runs fold | [`gates/aggregate-consistency.mjs`](gates/aggregate-consistency.mjs) (#5, 18/18) | GREEN |
| 4 | **Subsetted-eval** *(evo vector)* | Score only the easy subset of CORE (silent subset / undeclared epic), pass the veto on fewer cells | PRE verifier `assertFullCore`: graded set === declared epoch CORE (no `missing`/`extra`), ≥minK runs per epic; epoch-relative | [`gates/pre-verifier-smoke.mjs`](gates/pre-verifier-smoke.mjs) (#2b PRE, `assertFullCore`, 25/25) | GREEN |
| 5 | **Cache short-circuit / stale-eval** *(evo vector)* | Reuse a stale/cached/empty scorecard instead of actually running the eval | PRE verifier `assertFresh`: `perEpic` non-empty, real bucket footprint, finite `harnessFailRate ∈ [0,1]` | [`gates/pre-verifier-smoke.mjs`](gates/pre-verifier-smoke.mjs) (#2b PRE, `assertFresh`, 25/25) | GREEN |
| 6 | **Score-irreproducibility** *(evo vector)* | A surviving candidate's worst-of-K does not reproduce on a fresh seed set (a noise-lucky survivor) | POST score-repro: re-eval survivors at the phase boundary, require worst-of-K within 2× worst-of-K SE; **active kill is a clean-restart**, every re-eval charged to K5 | POST verifier (deferred per DECISION-BRIEF #2) — engine [`src/pre-verifier.mjs`](src/pre-verifier.mjs) houses the PRE half; POST is Batch-2 | PLANNED |
| 7 | **Oracle / test-set leakage** | The mutated prompt (or a retrieved knowledge record) names the broken seam → oracle→trace→frontier leak (kill K3) | Two-channels-never-crossed (§2 constraint 3): mechanical per-cell channel never rendered to a model; quadrant-and-count-only digest; **oracle-token scan voids the candidate** | `scanOracleLeak` in [`src/checker.mjs`](src/checker.mjs) (the proposer is oracle-blind **by construction** — it is only ever shown a count-only quadrant digest with no cell/seam/oracle names, [`src/proposer.mjs`](src/proposer.mjs):1-12, not a token scan); kill K3 [`DESIGN.md`](DESIGN.md) §2.3/§7 | GREEN |
| 8 | **Search-policy overfit** | A parent-selection policy is silently chosen because it flatters the front (policy-shopping) | Frozen ablation set EXACTLY `{mu_best, pareto_per_cell}` (no stochastic/RNG-confounded strategies); default `mu_best` bit-identical; active strategy = clean-restart with its own pre-registration | scaffolding [`gates/strategy-registry-smoke.mjs`](gates/strategy-registry-smoke.mjs) (#3, 23/23, bit-identical proof + policy-shop rejection); **active ablation = Batch 2** | GREEN (scaffold) / PLANNED (ablation) |
| 9 | **Tunnel-vision / wrong-axis** | Stack levers on the lever-axis while the bottleneck sits on the measurement-axis (opus-whole proxy / X-CUT / unmeasured INTEG); plateau mistaken for a real front | (a) in-loop plateau-detect → HALT-and-report-only (`detectPlateau`/`makeAxisObserver`); (b) reclassified into a HARD pre-P3 proxy→real BLOCKER; anti-abandonment = K8 planted-positive discriminator | [`gates/axis-check.mjs`](gates/axis-check.mjs) (#1, 21/21) + [`gates/pre-p3-axis-gate.mjs`](gates/pre-p3-axis-gate.mjs) (BLOCKS P3 until proxies converted); [`DESIGN.md`](DESIGN.md) §6b | GREEN |
| 10 | **Fitness-defect / grader bug** | A scoring bug mis-scores a known-correct input (the `testsPath undefined → fake 100/100` history); a peek-then-redraw "bump" laundered as a fix | `eval_epoch` stamped on every log/candidate (default 0 → bit-identical) so a confirmed defect partitions logs by epoch; bump = a NEW FREEZE record requiring a **candidate-independent** defect fixture **+** 2nd-oracle confirmation; nulls are K1, never a bump | stamping [`gates/eval-epoch-smoke.mjs`](gates/eval-epoch-smoke.mjs) (#4, 33/33) + protocol [`EVAL-EPOCH-PROTOCOL.md`](EVAL-EPOCH-PROTOCOL.md); **bump op = Batch 2** | GREEN (stamping) / PLANNED (bump) |
| 11 | **Generic-hypothesis** *(evo vector)* | A vague, unfalsifiable "lever" proposal that can't be cleanly attributed or killed | **Typed-gene** requirement: every node/operator is a typed gene the type system guarantees runnable, and every proposal must name a **falsifiable failure-mode**; reflective mutation proposes **one** targeted change | type system & operator list [`DESIGN.md`](DESIGN.md) §2/§3; §11 node-supply vetting (genome-validity → P0-smoke → anti-gaming vet); literature-ideator caps (≤5 typed-gene proposals/trigger, DECISION-BRIEF #6) | DOC |
| 12 | **Cost-hiding via escalation** | Escalate to opus for free (the cheap gateway hardcodes `usd:0`) and claim a cost win from $0 free-riding | Model-priced escalation **ledger** keyed on each node's model gene × pinned published rates; an all-opus-escalation genome is **strictly cost-dominated** (CI guard); ledger reproduces a known metered run | §2.5 ledger + §6 CI guard [`DESIGN.md`](DESIGN.md); ledger [`src/ledger.mjs`](src/ledger.mjs); anchored to MCOH25 ($0.395 / $0.27) | DOC |
| 13 | **Oracle garbage-in** | The single `scale-oracle.mjs` template multiplies correlated error onto the highest-weight lethal cells; trust a battery built on a bad oracle | Oracle self-test as a P0 gate with a numeric per-bucket kill-rate **floor 0.90**; ≥2 independent hand-authored oracles before any "confirmed" promotion / P3 | [`gates/g2-oracle-gate.mjs`](gates/g2-oracle-gate.mjs) (G2/K6, P0-blocking, kill-rate ≥0.90) + 2nd oracle [`src/oracle2.mjs`](src/oracle2.mjs) | GREEN |
| 14 | **Gateway lottery** | Confound genome quality with the unpinned upstream the cheap gateway routes to | Stratify over a fixed route roster; record the route distribution; gate the freeze on route-stable dominance across ≥3 stratified re-draws with per-route CIs | §2.4 route stratification [`DESIGN.md`](DESIGN.md); route distribution recorded in the scorecard ([`src/scorecard.mjs`](src/scorecard.mjs)) | DOC |
| 15 | **Non-stationarity** | Drifting scores re-bin incumbents across generations → non-comparable Pareto fronts | Frozen CORE; quantized recall-signature computed on the FROZEN CORE so cell assignment is stationary; elites carry exact scores | §4.1/§5 MAP-Elites stationary binning [`DESIGN.md`](DESIGN.md); [`src/map-elites.mjs`](src/map-elites.mjs) | DOC |
| 16 | **Harness-error-as-pass** | A timing-out / stub-emitting genome returns no bucket counts → scores as "no failures observed" and games the veto | Any `{harnessError\|timeout\|empty}` is a **hard worst-of-K FAIL** (lethal veto = 0, full cost charged), **never excluded** from the K-aggregation | §4.5 hard-fail [`DESIGN.md`](DESIGN.md); enforced in the worst-of-K fold ([`src/scorecard.mjs`](src/scorecard.mjs)) consumed by [`gates/aggregate-consistency.mjs`](gates/aggregate-consistency.mjs) layer B | GREEN |
| 17 | **Credit mis-attribution** | Blame the wrong gene for a lift (auto-force the skeleton on K-run noise) | Skeleton-first counterfactual reversion on the single worst lethal candidate/gen; restore-margin kill (2× worst-of-K SE) → route to typed-random, never auto-skeleton; reversion evals charged to K5 | §3 credit machinery [`DESIGN.md`](DESIGN.md); [`src/credit.mjs`](src/credit.mjs); self-test [`gates/p2c-credit.mjs`](gates/p2c-credit.mjs) | GREEN |
| 18 | **Surrogate divergence** | The cheap surrogate-scorer decorrelates from the true scorer and the search optimizes a phantom landscape | K7: periodically re-score a held sample with true `evaluateEpic`; halt+recalibrate if Spearman ρ on lethal buckets < **0.80** | §7 K7 [`DESIGN.md`](DESIGN.md); [`src/surrogate.mjs`](src/surrogate.mjs); self-test [`gates/p2c-surrogate.mjs`](gates/p2c-surrogate.mjs) | GREEN |
| 19 | **Capture-induced within-niche collapse** | Knowledge-conditioning accelerates collapse inside a niche → false diversity | Niching-gated knowledge store + per-niche entropy collapse-kill; leak-scanned retrieved records | §10 entropy kill [`DESIGN.md`](DESIGN.md) (knowledge-conditioning DEFERRED until the 2nd oracle exists, P2c-RESULTS) | PLANNED |
| 20 | **Collapse** to a single niche | The archive degenerates to one cell; a "winner" rests on a collapsed front | Celled MAP-Elites; K4 no-collapse (median-cell-count floor) | §4.1/§7 K4 [`DESIGN.md`](DESIGN.md); [`src/map-elites.mjs`](src/map-elites.mjs); self-test [`gates/p2c-map-elites.mjs`](gates/p2c-map-elites.mjs) | GREEN |
| 21 | **Baseline drift** | Compare against a stored/stale baseline that has drifted from the current epics/seeds | Baseline is **co-measured per generation** on the same epics/seeds (interim opus-whole proxy), never a stored constant | §4.3/§6 co-measurement [`DESIGN.md`](DESIGN.md); [`src/baseline.mjs`](src/baseline.mjs) | DOC |
| 22 | **Judge variance** | Treat a noisy non-deterministic judge as if its output were pinned | Pinned judge **model** (never searchable); re-judge a held set, report intra-model disagreement so judge noise is bounded not assumed-zero | §2 constraint 1 + §6 finding #6 [`DESIGN.md`](DESIGN.md) (judge pinned, NOT in the searchable genome §2 table) | DOC |
| 23 | **Search-cost confound** | Fold the search's own frontier R&D spend into a candidate's product cost (or vice-versa) | Search spend (reflective mutation + judge) is amortized R&D — **reported, never charged** to a candidate's product cost | §6 "Search-cost vs product-cost — strictly separate" [`DESIGN.md`](DESIGN.md) | DOC |
| 24 | **Freezing a blank** | Ship a freeze record with un-pinned `[PIN AT FREEZE]` placeholders → an unfalsifiable pre-registration | Concrete pinned values required (δ=α=0.05, weights 1.0/1.0/0.1/0.0, K5=250, K6≥0.90, K7 ρ≥0.80, K8 budget); freeze-consistency gate | [`gates/k8-instrument-validation.mjs`](gates/k8-instrument-validation.mjs) (K8, P0-blocking) + G0 freeze-consistency in [`p0.mjs`](p0.mjs); all values pinned in [`FREEZE.md`](FREEZE.md) | GREEN |
| 25 | **Mid-run gene admission breaking comparability** | Admit a new gene / flip a strategy mid-run → a non-comparable front laundered as continuous progress | Clean-restart rule (§11 R2-10): every survivor-changing change is a new epoch with a new FREEZE record; default-off / default-0 / default-`mu_best` keep the frozen trajectory bit-identical; label every trace `(eval_epoch, strategy)` | §11 clean-restart [`DESIGN.md`](DESIGN.md); `eval_epoch` stamping [`gates/eval-epoch-smoke.mjs`](gates/eval-epoch-smoke.mjs); `(eval_epoch, strategy)` labeling rule (DECISION-BRIEF cross-cutting rule) | GREEN (stamp) / DOC (discipline) |
| 26 | **Uninterpretable null** | Report a K1 null when the instrument itself is broken (can't find a known winner) | K8 instrument self-validation: re-discover the hand-built known-dominating genome from a handicapped pool within budget; **no K1 may be reported until K8 passes** | [`gates/k8-instrument-validation.mjs`](gates/k8-instrument-validation.mjs) (K8, P0-blocking, 29/30 ≥0.90) | GREEN |
| 27 | **Curation bottleneck as a silent cap** | Human promotion silently caps throughput; dropped candidates vanish unlogged | Mechanized triage: a human reviews only the **bounded Pareto-front queue**; anything dropped is **logged**; off the live loop's critical path | §8 / §10 / §14.3 [`DESIGN.md`](DESIGN.md) (off-critical-path, bounded queue) | DOC |
| 28 | **Crash / hang / silent spin** | An unattended run hangs / spins / dies and is silently treated as "no result" | Checkpoint→resume (deterministic) + watchdog halts-to-checkpoint on a planted hang and emits a notification | §14.1–14.2 [`DESIGN.md`](DESIGN.md); [`src/watchdog.mjs`](src/watchdog.mjs) + [`src/checkpoint.mjs`](src/checkpoint.mjs); §14 round-trip in [`p0.mjs`](p0.mjs) (P0-blocking) + [`gates/autonomy-roundtrip.mjs`](gates/autonomy-roundtrip.mjs) | GREEN |

---

## Coverage check (the disposition's acceptance bar)

**Every DESIGN §8 failure mode is represented** (one or more rows):

| DESIGN §8 phrase | row(s) |
|---|---|
| Overfitting (TRAIN/VAL/TEST) | 1 |
| reward-hacking | 2 |
| cost-hiding via escalation | 12 |
| oracle garbage-in (G2/K6) | 13 |
| gateway lottery | 14 |
| non-stationarity | 15 |
| search-cost confound | 23 |
| collapse (MAP-Elites, K4) | 20 |
| baseline drift | 21 |
| judge variance | 22 |
| harness-error-as-pass (§4.5) | 16 |
| credit mis-attribution (§3) | 17 |
| surrogate divergence (K7) | 18 |
| capture-induced within-niche collapse (§10) | 19 |
| freezing a blank | 24 |
| mid-run gene admission breaking comparability (§11) | 25 |
| uninterpretable null (K8) | 26 |
| the curation bottleneck as a silent cap | 27 |
| crash / hang / silent spin (§14) | 28 |

**Every DESIGN §2 anti-gaming constraint is represented:**

| §2 constraint | row(s) |
|---|---|
| 1. judge pinned (search games its own grader) | 22 |
| 2. checker may never read the oracle | 7 |
| 3. two channels never crossed (per-cell + quadrant digest; oracle-token scan) | 2, 7 |
| 4. gateway route stratified & reported | 14 |
| 5. cost metered, escalation model-priced & ledgered | 12 |

**Evo's four extra vectors (added, not previously explicit in §8):**
subsetted-eval (**row 4**), cache short-circuit (**row 5**), score-irreproducibility (**row 6**),
generic-hypothesis (**row 11**). *(Oracle/test-set leakage — evo's fifth named vector — was already covered
via the K3 §2.3 oracle-token scan, so it is row 7, not a new addition; noted per the DECISION-BRIEF.)*

---

## Cross-links (house style)

- The historical `rate()` → "92/92" footgun (rows 3, 16) — the demonstrated failure the aggregate-consistency
  lint hardens: [[coevo-grader-bug-and-baseline]], [`GLEANING5-RESULTS.md`](GLEANING5-RESULTS.md).
- The Batch-1 disposition + sequencing: [`EVO-GLEANINGS-PLAN.md`](EVO-GLEANINGS-PLAN.md),
  `runs/deliberations/20260619T220547Z/DECISION-BRIEF.md`, [[evo-hq-tool]].
- Per-item build records: [`GLEANING1-AXIS-RESULTS.md`](GLEANING1-AXIS-RESULTS.md) (#1),
  [`GLEANING2B-PRE-RESULTS.md`](GLEANING2B-PRE-RESULTS.md) (#2b PRE),
  [`GLEANING3-STRATEGY-RESULTS.md`](GLEANING3-STRATEGY-RESULTS.md) (#3),
  [`GLEANING4-EPOCH-RESULTS.md`](GLEANING4-EPOCH-RESULTS.md) (#4),
  [`GLEANING5-RESULTS.md`](GLEANING5-RESULTS.md) (#5).
- Frozen invariants & instrument self-validation: [`FREEZE.md`](FREEZE.md), [`DESIGN.md`](DESIGN.md) §6/§7,
  [`P0-RESULTS.md`](P0-RESULTS.md), [[workflow-search-m5-fit]].

---

## Freeze posture

Class A — **pure documentation/consolidation**. This item writes **only** `GAMING-RISKS.md`; it runs no code
that can change a live run's survivors. No frozen invariant is touched (`git diff -- src/config.mjs` is
**EMPTY**; `studies/build-gap/**` and `epics/**` are untouched). Every cited gate file was verified to **exist
on disk** in [`gates/`](gates/) before citing it. The frozen apparatus was re-confirmed green after all prior
Batch-1 items: **P0 GREEN 5/5** (`node p0.mjs`, exit 0 — G0/G1/G2, **K8 29/30 ≥0.90**, §14 deterministic
resume + watchdog halt) and the prior Batch-1 lint **`gates/aggregate-consistency.mjs` 18/18** (exit 0).

**Status legend.** GREEN = a gate file exists in `gates/` AND passes (verified 2026-06-19). PLANNED = the
active kill is a clean-restart / Batch-2 event (POST score-repro, active strategy ablation, epoch bump,
knowledge-conditioning collapse-kill). DOC = a discipline a single code gate cannot enforce (it lives in the
pre-registered protocol / freeze record). The register is **maintained**: flip a row to GREEN when its gate
lands.
