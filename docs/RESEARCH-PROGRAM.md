# Research Program v2 — Optimal Granularity & Deferred Decomposition

_Drafted 2026-06-11. This document extends [`CHARTER.md`](CHARTER.md) and builds on the state in
[`FINDINGS.md`](FINDINGS.md). It is the pre-registered design for the next phase of the battery: the
assumptions, the constructs, the hypotheses, the harness extensions, and the experiments that will
answer the sharpened question below. Nothing here invalidates the charter; it re-aims the apparatus._

> **⚠ Pre-registered, with SUBSTANTIATED revisions (2026-06-11).** This program was drafted **blind** to
> the archetype-premise evidence now merged onto the trunk. The cross-review in
> [`RECONCILIATION.md`](RECONCILIATION.md) found the spine corroborated but **seven strategies in need of
> revision** — most importantly, the repair premium **ρ is quadrant-censored**, so the §2.6 / H3 median
> rule would falsely crown deferral. The revisions are catalogued in **§10**. Their gating $0 kill-tests
> have now **run and confirmed the quadrant structure** ([`KILL-TESTS.md`](KILL-TESTS.md): 37% of hearth's
> edges are lethal; ~11 shipped lethal-quadrant misses in real build history, all past a green gate), so
> §10 is no longer conditional. The pre-registered §0–§9 text is left intact (pre-registration discipline);
> read it **through** §10.

---

## 0. The question, sharpened

The charter asks *"what is the best method for decomposing a plan into atomic packets?"* The L1 sweep
exposed why that framing is incomplete:

1. **"Atomic" is not a fixed bar.** Every method was graded against one implicit granularity (1–6
   acceptance criteria per bead). But *how far to decompose* is itself the most consequential choice a
   decomposer makes, and we have never varied it.
2. **The static artifact is not the end state.** The keystone asks "if a builder built every packet,
   would outcomes be achieved?" — but a real builder doesn't execute packets blindly; it discovers
   gaps, repairs, and improvises. A decomposition with known residual gaps may still be *optimal* if
   the build loop catches those gaps more cheaply than plan-time enumeration would have.
3. **The production precondition is cheap models.** The systems that will consume this research will
   run decomposition *and* building on OSS or lightweight commercial models (haiku-class and below,
   ~7B–70B OSS). Frontier models are out of bounds for the methods under test; they are permitted only
   inside the measurement apparatus (judges, calibration), whose cost is amortized and reported
   separately.

So the sharpened question this program answers:

> **For a thin plan that will be decomposed AND built by cheap models, what decomposition *policy* —
> method × granularity × risk-threshold × build-time-deferral rule — maximizes realized outcome
> coverage per dollar?**

The keystone (CHARTER §2) survives but moves up one level: from a property of the *artifact*
("would building every packet achieve the plan?") to a property of the *policy* ("does this
decompose-then-build pipeline achieve the plan, and at what total cost?"). Static build-completeness
becomes an intermediate variable — predictive, cheap to measure, but no longer the final word.

### The central hunch, stated as a falsifiable claim

There is an interesting middle ground: decompose only to the level where each packet is within the
builder's one-shot envelope, decompose *ahead of time* only the risky parts, and let the build loop
discover the rest. Formally: the optimum is **not** at "smallest possible parts." It is an interior
point, bounded on both sides:

- **Too coarse** → packets exceed the cheap builder's executable envelope → build failures, drift,
  expensive rework.
- **Too fine** → plan-time cost explodes; the edge surface grows super-linearly with bead count (and
  L1 already shows edges are the universal weak point, 0.27–0.57); each packet loses the whole-plan
  context; the judge and the builder both drown in coordination overhead.

Why this might be true *now* when it wasn't for humans: the software-engineering shift-left doctrine
(defects cost 10–100× more downstream) was priced in human rework. For an LLM builder, regeneration
is nearly free and the bottleneck is context, not labor — so the build-time repair premium **ρ** (§2.6)
may be small enough that deferral wins. That ratio has, to our knowledge, never been measured. We will
measure it.

---

## 1. Assumptions (pre-registered, each with its risk and its check)

| # | Assumption | Risk if false | How the design checks it |
| --- | --- | --- | --- |
| A1 | **Methods are restricted to the cheap tier.** Decomposers and builders run on haiku-class or OSS (≤~70B) models only. Strong models appear only as judges/calibrators (apparatus, not method). | Results wouldn't transfer to the production condition. | Enforced by the registry: cheap-tier model allowlist for `ctx.invoke`; judge wired separately (already the case). |
| A2 | **Quality = realized outcome coverage after a build**, not artifact tidiness. Executable acceptance tests in the oracle bundle are the ground truth; static scores are predictors. | We optimize a proxy and crown the wrong policy. | Tier-2 micro-builds (§4.5) are the primary endpoint of Phase 2; static scores are calibrated against them. |
| A3 | **An interior granularity optimum exists** and its position depends on builder capability and plan thinness — i.e. the answer is a *surface* G\*(builder, thinness), not a single number. | If quality is monotone in fineness, the answer is trivially "decompose maximally" and only cost caps it. Still a publishable answer. | E1–E3 sweep granularity as a dose; E5 varies builder tier. Monotone results falsify A3 cleanly. |
| A4 | **Build-time discovery is a legitimate part of the policy** and its cost is measurable and chargeable. A gap is a defect only if the policy as a whole fails to cover it or covers it at excess cost. | Deferral could mask unrecoverable failures (silent scope loss). | The build record (§4.6) logs every discovered/repaired item with provenance to the manifest; unrecovered latent items still score as misses. |
| A5 | **Granularity can be measured method-independently** from the snapshot (G, §2.1), so "how decomposed" is an observed dose, not a prompt wish. | Knobs are leaky — models don't obey "make 12 beads"; arms would collapse together. | `eval/granularity.mjs` computes G on every snapshot; analysis regresses on *measured* G; a deterministic post-pass (§4.2) enforces level bounds. |
| A6 | **The judge's error is independent of granularity.** A strong-model judge grading "is requirement r covered?" is equally accurate over 12 big beads and 120 tiny ones. | The entire dose-response curve could be a grader artifact (verbosity / needle-in-haystack bias). | E0.4 calibrates the judge on synthetic snapshots with known ground truth at 3 granularity bins; report accuracy per bin. Tier-2 endpoints (executable tests) bypass the judge entirely — the decisive curve does not depend on A6. |
| A7 | **Fixtures can be kept small enough that a full micro-build terminates and the oracle bundle stays hand-auditable**, while still containing real latent structure (10–20 latent requirements, 15–25 required edges). | Builds don't terminate cleanly or oracles can't be trusted; Tier-2 verdicts become noise. | Corpus growth (§4.7) authors fixtures with an executable acceptance suite sized for auditability; a pilot build (E0.8) validates the loop before the mass grids. |
| A8 | **Cheap-model formatting fragility is part of the phenomenon, not noise.** JSON failures, truncations, and retries are properties of the method under the production condition. | Silently re-rolling failures would overstate cheap-tier reliability. | Retries are budgeted and billed to the method; exhausted retries score zero and feed the Reliability axis (fail-closed, as the judge already does). |
| A9 | **Total policy cost is the right denominator**: $(decompose) + $(build) + $(repair), with judge/grader cost reported separately and never charged to the policy. | Mixing grader cost into the policy would penalize nothing in production. | Cost record extension (§4.6); FINDINGS §7 judge-cost accounting fix is a Phase-0 gate. |

---

## 2. Constructs & operational definitions

### 2.1 Granularity (G) — the measured dose

Computed deterministically from any snapshot + its manifest (`eval/granularity.mjs`):

- **G.atoms** = beadCount(non-epic) / |manifest.requirements| — atoms per latent requirement (primary).
- **G.acMedian** = median acceptance-criteria count per bead (size proxy).
- **G.edgeDensity** = |edges| / beadCount.
- **G.depth** = max parent-chain depth.

Analyses regress endpoints on **measured G.atoms**, never on the requested level alone.

### 2.2 Granularity levels (the knob)

Five operational levels, enforced by prompt contract + deterministic post-pass (§4.2):

| Level | Definition | Expected G.atoms |
| --- | --- | --- |
| **L0** outcome | 1 bead per *stated* outcome; no expansion | ≪ 1 |
| **L1** epic | 2–4 feature-slice beads per outcome | ~0.5–1 |
| **L2** task | PR-sized changes, 3–6 ACs each (≈ today's implicit bar) | ~1–2 |
| **L3** atomic | smallest independently buildable+testable unit, 1–3 ACs | ~2–4 |
| **L4** micro | single-file/single-function edits, 1 AC | ~4+ |

### 2.3 Deferral policies (D) — what the builder may do

| Policy | Builder behavior on a gap or failure |
| --- | --- |
| **D0** strict | Execute the bead as written; failure is final. (The current keystone's implicit builder.) |
| **D1** local repair | May fix issues *within the bead's scope*, retry budget R per bead. |
| **D2** JIT decomposition | May additionally emit **discovered beads** into the queue (bounded discovery budget), i.e. decomposition continues at build time. |

### 2.4 Risk-targeted partial decomposition (τ)

A two-pass strategy: decompose to L1; score each bead's **risk** ∈ [0,1] with one bounded cheap-model
call (ambiguity / novelty / integration fan-in-out / state-security sensitivity, equally weighted);
recursively decompose only beads with risk > τ; defer the rest to the build loop. τ = 0 → uniform
fine decomposition; τ = 1 → pure coarse + JIT. **The user's hunch lives on this dial.**

### 2.5 Realized outcome coverage (the Phase-2 endpoint)

Fraction of the fixture's **executable acceptance suite** passing after the build loop terminates
(plus, secondarily, the judge-scored latent coverage of the *final* state). Granularity-blind,
judge-free, directly answers the keystone.

### 2.6 The repair premium (ρ)

For latent requirement r: **ρ(r) = marginal cost to discover-and-cover r at build time ÷ marginal
cost to cover r at plan time.** Build-side numerator measured from build-record repair events
attributed to r (via manifest provenance); plan-side denominator estimated from the Δ$/Δcoverage slope
between adjacent G levels in E1. The human-era doctrine says ρ ≈ 10–100. **Pre-registered decision
rule: if median ρ < 3, deferral-heavy policies should appear on the Pareto frontier; if ρ > 10,
shift-left holds and fine plan-time decomposition should dominate.**

---

## 3. Hypotheses (pre-registered)

- **H1 (static dose-response).** Judge-scored generative coverage rises with G from L0, then flattens;
  **edge coverage peaks earlier and then falls** (edge surface grows faster than the methods can wire
  it). Static quality-per-dollar peaks at L2±1.
- **H2 (build-mediated inverted-U — the central claim).** Realized-coverage-per-total-dollar is an
  interior maximum in G: the optimum bead is "the largest unit the builder reliably one-shots," not
  the smallest expressible part. Falsified if realized quality-per-dollar is monotone in G in either
  direction across fixtures.
- **H3 (deferral wins at the margin).** At the H2 optimum, (risk-targeted partial decomposition + D2)
  achieves realized coverage ≥ uniform-fine + D0 at materially (≥30%) lower total cost. Equivalent
  claim: median ρ < 3 for the latent items a coarse decomposition misses.
- **H4 (builder-relativity).** The optimal G shifts **finer as the builder weakens** (the one-shot
  envelope shrinks). Hence the deliverable is the policy surface G\*(builder, thinness), not a point.
- **H5 (method × granularity interaction is weak).** Once granularity and iteration budget are
  controlled, the method families (single-session / swarm / expand-audit) compress toward each other
  — i.e. much of L1's method spread was granularity-and-budget in disguise. (L1 hint: expensive
  methods did not out-earn `single-session@haiku`.)

---

## 4. Harness extensions (what we build, in dependency order)

All extensions obey the charter's design rules: determinism-first, one blessed scorer, injected
models, fresh workspaces, hash-pinned fixtures, selftests before trust.

### 4.1 Transport & accounting repairs (FINDINGS §6.1, §7)
Prompt via **stdin** (kills the argv ceiling); judge $ aggregated into run reports as a separate
`graderCost` field; `runs/` namespaced `mock/` vs `live/` so the leaderboard reads clean.

### 4.2 The granularity knob — `strategies/*` + `eval/granularity.mjs`
- Prompt-contract variants for L0–L4 (shared blocks in `prompt-contract.mjs`, one paragraph each,
  pinned).
- **Deterministic post-pass** (pure code): validates level bounds; out-of-band beads are
  merged/split mechanically (merge = union ACs/files/tests, OR edges; split only on AC boundaries).
  This makes the dose *enforced*, not requested.
- **Derived-G merger** (pure code): given an L4 snapshot, produce L3/L2/L1/L0 by deterministic
  merging up the parent tree (edges collapse canonically). One generation yields the whole dose
  ladder with **generative content held constant** — the clean control that separates "how it's
  sliced" from "what got generated."
- `eval/granularity.mjs` computes §2.1 metrics on every snapshot; selftested.

### 4.3 Cheap-tier transport — `runner/model-client.mjs`
Add `openaiCompatInvoke` (plain HTTPS to any OpenAI-compatible endpoint: vLLM, Ollama, OpenRouter)
alongside `claudeInvoke`, same `{text, outputTokens, usd, durationMs}` contract. Registry gains a
cheap-tier allowlist (A1). Retry budget + fail-closed scoring per A8.

### 4.4 Judge upgrades — `runner/judge.mjs`
- **Calibration set**: ~100 synthetic (snapshot, latent-item, true-label) triples spanning 3
  granularity bins, authored once, selftest-style. Report judge accuracy overall and per bin (gates
  A6). Re-run whenever the judge prompt or model changes.
- **Ensemble judge**: each latent item is graded by an odd panel (≥3 independent per-item calls,
  strongest available judge model, majority vote; disagreement rate recorded per item). Spend on the
  grader is not a constraint — measurement quality is. The per-item, bounded, fail-closed semantics
  are unchanged; the ensemble narrows the only stochastic component of the scoring pipeline.

### 4.5 Tier-2 micro-build harness — `runner/builder.mjs` (the big one)
A bounded build loop, itself part of the *apparatus* (pinned prompt/tooling, held constant unless D
is the manipulated variable):

1. Topologically order ready beads; execute each with one cheap-builder call (bead + typed
   neighborhood as context) in the run workspace.
2. After each bead: run the fixture's executable acceptance suite (cheap, local, deterministic).
3. Apply the deferral policy D0/D1/D2 (§2.3) on failure or self-reported gap; D2 discovered beads
   enter the queue with provenance `discovered@build`.
4. Terminate on queue-empty or budget cap; emit a **build record** (§4.6).

### 4.6 New artifacts & schemas
- `schemas/build-record.schema.json` — `{ beadsAttempted, beadsCompleted, testsPassed/total,
  discoveredBeads[], repairEvents[{beadRef, manifestRef?, usd, wallClockSec}],
  cost{decompose, build, repair}, graderCost, wallClockSec }`.
- `scorecard` gains `realizedCoverage`, `totalPolicyCost`, `granularity{...}` — all optional so
  existing rows stay valid.

### 4.7 Corpus growth — `fixtures/`
Target **≥12 thin fixtures**: {3 sizes: ~10 / ~15 / ~20 latent requirements} × {4 domains:
CRUD/service, CLI tool, data pipeline, event-driven/realtime} — `sso-greenfield` and
`ingest-pipeline` seed two cells. Each new oracle bundle adds an **executable acceptance suite**
(the Tier-2 ground truth; plain node test scripts, no deps, sized for hand-auditability per A7),
plus: thin **clean controls** (zero planted gaps → false-positive rate), and planted-gaps variants
(finally exercising catch-rate end-to-end). **Four further fixtures** are authored **after**
Phase-2 tuning and held out for the confirmation run (E6) — authored blind to the tuned policy,
used once.

---

## 5. The experiment battery

**Spend is not a constraint; only outcomes are.** Phasing below is **instrument-validation
ordering**, not spend-gating: a phase is entered when the instruments it depends on are proven
(calibrated judge, selftested knob, validated build loop), never deferred to save money. The
operating default from Phase 1 onward: **every decomposition that is scored is also built** —
Tier-2 realized coverage is the primary endpoint everywhere, and static scores ride along as
diagnostics and calibration targets. (Note A9 still stands: the *policy's* cost remains a measured
endpoint, because the production condition is cheap models — unconstrained experiment spend does not
change what we are measuring, only how precisely we measure it.)

### Phase 0 — instrument repairs & calibration
| ID | What | Validity gate it satisfies |
| --- | --- | --- |
| E0.1 | stdin transport fix; rerun the two L1 holes | unblocks sonnet swarm/noaudit rows |
| E0.2 | De-confound the audit A/B: equal iteration budgets **and** a generative-gap audit variant (FINDINGS §6.2, second option) | makes "amount of iterations" a controlled knob |
| E0.3 | Judge + builder $ in aggregates; namespace `runs/` | A9 |
| E0.4 | Judge calibration set (~100 labeled triples) + per-granularity-bin accuracy; ensemble-judge disagreement baseline | A6 — no grid runs until per-bin accuracy is known |
| E0.5 | OSS transport + cheap-tier smoke (≥4 OSS models + haiku produce valid snapshots on 2 fixtures) | A1, A8 |
| E0.6 | Corpus to **≥12 thin fixtures** ({3 sizes} × {4 domains}) w/ executable suites + clean controls + planted gaps; **4 held-out fixtures** authored after tuning | A7, statistics |
| E0.7 | Granularity knob + post-pass + derived-G merger + `eval/granularity.mjs`, all selftested | A5 |
| E0.8 | Builder-loop pilot: 2 fixtures × {L1, L3} × {D0, D2} × K=3 full micro-builds; verify termination, repair-event attribution, and build-record integrity by hand | A4, A7 — gates the mass grids |

### Phase 1 — dose-response, built end-to-end
- **E1 — native-G sweep (H1, H5, and the backbone of H2).** Methods: `single-session`, de-confounded
  `expand-audit` (iteration budget N∈{1,3,5} explicit), and `swarm` — granularity may interact with
  fan-out, so keep all three families. Dose: L0–L4. Models: haiku + ≥4 OSS spanning ~8B–70B.
  Fixtures: all 12 thin. **K=10.** Every run is judge-scored *and* micro-built (fixed builder,
  D1). Endpoints: realized coverage, genCov (presence & sufficiency), edge coverage, readiness,
  total policy $, measured G.
- **E2 — derived-G control.** Generate L4 once per (method × model × fixture × K=10); derive
  L3→L0 deterministically; score **and build** every rung. Generative content constant ⇒ any
  endpoint movement is pure slicing. The E1-vs-E2 delta isolates *"does asking for fine granularity
  change what gets generated, not just how it's cut?"*

### Phase 2 — the policy factorials (the decisive phase)
- **E3 — granularity × builder factorial (H2, H4).** Decompositions from E1/E2 at all 5 G levels →
  Tier-2 micro-build under **4 builder tiers** (~8B OSS, ~30B OSS, ~70B OSS, haiku-class), fixed D1.
  All 12 fixtures × 5 levels × 4 builders × K=10. This merges the old E3/E5 slices into one full
  factorial: the dose-response curve *per builder tier* is the H2/H4 deliverable in a single design.
  Also yields the (static score → build outcome) calibration: a Tier-1.5 per-bead "would this
  builder one-shot this bead?" predictor with reported Brier/AUC — kept as a *diagnostic*, since
  with unconstrained spend the real builds remain the endpoint everywhere.
- **E4 — deferral × risk-threshold factorial (H3, ρ).** Full crossing: G∈{L1, L2, G\*-so-far} ×
  D∈{D0, D1, D2} × τ∈{0, 0.25, 0.5, 0.75, 1} (τ only meaningful under D2; D0/D1 arms carry τ=0) on
  all 12 fixtures, K=10, at ≥2 builder tiers. Endpoint: realized coverage vs total policy $;
  **measure ρ per recovered latent item** and report its full distribution per builder tier. This
  is the experiment the deferral hunch lives or dies on, and the factorial is what lets us see the
  G × D interaction (deferral may only win at coarse G).

### Phase 3 — synthesis & confirmation
- **E6 — confirmation run.** The tuned policy (method × G\* × τ\* × D\*) vs the two strongest
  incumbents (uniform-fine + D0; `single-session@cheap` at L2 + D1) on the **4 held-out fixtures**,
  K=10, full Tier-2, ≥2 builder tiers. Pre-registered: the tuned policy must sit on the
  realized-coverage × total-policy-cost Pareto frontier on **all four** held-out fixtures for the
  headline claim to stand; 3-of-4 downgrades the claim to "promising, corpus-sensitive."

---

## 6. Statistics & decision rules

- **Primary endpoint** (Phase 2+): realized outcome coverage and total policy $; everything
  judge-scored is secondary/predictive.
- **Paired designs**: every comparison is within-fixture; report per-fixture deltas plus the pooled
  bootstrap 95% CI over (fixtures × K). A claim stands only if the CI excludes zero **and** the sign
  agrees on ≥9 of 12 fixtures (sign-consistency guard against subset-driven wins).
- **Dose-response**: fit realized-coverage-per-dollar vs measured G.atoms per (fixture × builder
  tier) with a mixed-effects model (fixture as random intercept + slope); H2 is confirmed if the
  fitted peak is interior (not at the swept boundary) with CI support on both sides; H4 is confirmed
  if the peak location decreases monotonically in builder capability across tiers.
- **Power note**: with σ(genCov)≈0.10 (L1-era), paired K=10 across 12 fixtures gives SE≈0.009 on a
  mean delta — resolving effects of ~0.02, well below the ≥0.05 effects we care about. Tier-2 cells
  at K=10 are individually adequately powered, so per-cell contrasts are reportable in addition to
  the dose-response fits.
- **Ledger discipline** continues: every live scored run is one append-only row; new series headers
  per phase; fixture-hash pinning unchanged.

## 7. Threats to validity (and where the design answers them)

1. **Judge–granularity confound** → E0.4 calibration bins; decisive endpoints are judge-free (A6).
2. **Effort confound** (finer = more tokens = more "trying") → E2 derived-G holds generation
   constant; native-vs-derived delta quantifies the rest.
3. **Harness-as-confound** (the build loop is itself an agent system) → builder prompt/tooling
   pinned and identical across arms except where D is the variable; build loop is apparatus.
4. **Overfitting the corpus** → held-out fixtures authored after tuning, used once (E6).
5. **Cheap-model flakiness laundered as quality** → A8: retries billed, exhausted retries score 0.
6. **Granularity knob doesn't bite** → measured-G regression + deterministic post-pass (A5).
7. **Deferral masking scope loss** → unrecovered latent items always score as misses; D2 discovery
   budget is capped and billed (A4).

## 8. Scale & sequencing

**Budget is explicitly not a design input — only outcomes are.** Run sizes above are set by
statistical power and decisiveness, not spend (for scheduling: the program is on the order of
10⁴ micro-builds and 10⁵–10⁶ judge calls; wall-clock, rate limits, and compute scheduling are the
real resources to manage, and the runner's concurrency pool + fresh-workspace isolation are what
make the grids parallelizable). Sequencing is **validity ordering only**: no grid runs on an
uncalibrated judge (E0.4), an unproven knob (E0.7), or an unvalidated build loop (E0.8) — because a
wrong number at any scale is worse than a late one. If any instrument fails its gate, fix the
instrument; never shrink the question to fit it.

Two disciplines matter *more* without a budget constraint, not less:
1. **Pre-registration bites harder.** With this much data, post-hoc subgroup stories become easy to
   find; only the §3 hypotheses and §6 decision rules count as confirmatory, everything else is
   labeled exploratory in the ledger.
2. **The policy-cost endpoint survives.** Unconstrained *experiment* spend does not change the
   production condition (A1/A9): the thing being optimized is still realized coverage per policy
   dollar on cheap models, because that is what the consuming systems will pay.

## 9. Definition of done

The program is finished when the repo can state, with ledger-backed evidence:

> *"For thin plans decomposed and built by cheap models: decompose with method M to granularity G\*
> (beads of measured size s), pre-decompose only beads with risk > τ\*, and run the builder with
> deferral policy D\*. This policy achieved realized outcome coverage X% at total cost $Y per plan on
> held-out fixtures, sat on the Pareto frontier against uniform-fine and uniform-coarse incumbents,
> and the measured build-time repair premium was ρ̃ (median) — [supporting | refuting] deferred
> decomposition. The optimum shifted [finer | not at all] for weaker builders."*

— with every bracketed clause filled by E1–E6, not by intuition. If H2/H3 are falsified, that *is*
the result: "decompose maximally; shift-left holds for LLM builders too" is just as publishable, and
the apparatus will have been the thing that could tell the difference.

## 10. Revisions (reconciliation 2026-06-11) — SUBSTANTIATED by the kill-tests; read §0–§9 *through* these

These are pre-registered **revisions**. Their gating $0 kill-tests
([`RECONCILIATION.md`](RECONCILIATION.md) §6, [`KILL-TESTS.md`](KILL-TESTS.md)) have now **both run and
confirmed the quadrant structure** (KT#1: 37% of hearth's edges are lethal, separable; KT#2: ~11 shipped
lethal-quadrant misses in real build history, all past a green gate). The revisions are no longer
conditional — they govern the campaign. Where §10 conflicts with §0–§9, §10 wins. Severity: **CORRECT** =
§0–§9 as written would yield a wrong result; **RE-SPEC** = right instrument, wrong target; **HARDEN** =
inherited failure mode with a known mitigation.

| # | Revises | Change | Severity |
| --- | --- | --- | --- |
| A | §2.6, H3, §6 | **ρ is quadrant-censored.** Silent+expensive omissions produce no build-record repair event, so they never enter ρ; the median over a cheap-only sample mechanically "confirms" deferral. Report ρ **per quadrant**; decide on the silent-expensive tail, never the median. | CORRECT |
| B | §2.5, A2 | **Partition the primary endpoint.** A thin-fixture acceptance suite tests dataflow (the self-revealing quadrant) and is blind to silent obligations. Add lethal-quadrant (obligation/**seam**) recall as a **veto** endpoint — a deferral policy that lifts aggregate coverage while dropping seam coverage is *rejected*. | CORRECT |
| C | §2.4 | Retarget **τ** at the lethal quadrant (silent+expensive obligations, [`OBLIGATIONS.md`](OBLIGATIONS.md)) instead of an equal-weighted 4-factor risk blend. | RE-SPEC |
| D | (the deletion) | The **obligations layer is restored** to the trunk ([`OBLIGATIONS.md`](OBLIGATIONS.md)) — the typed definition the deferral economics depend on. The edge-*join* mechanism stays parked (Step 2, [`../archive/`](../archive/)). | DONE (reshape) |
| E | §4.7 | Corpus must be **multi-feature with intra/seam partition tags** — seams *are* the lethal quadrant; single-feature fixtures under-sample it. `hearth` seeds this. | RE-SPEC |
| F | §0, A2 | A static completeness predictor, if kept, must be the **capture-recapture residual over ≥4 decorrelated generators** ([`PRIOR-ART-COMPLETENESS.md`](PRIOR-ART-COMPLETENESS.md)), not a manifest-coverage ratio (which biases toward false completeness). | HARDEN |
| G | A7 | Treat the hand oracle as **incomplete by construction** (all 6 authored archetypes smuggled edges). Grow-the-manifest with an adversarial verifier + a confirmed-real-beyond-manifest rate. | HARDEN |

Full argument + evidence per row: [`RECONCILIATION.md`](RECONCILIATION.md) §2–§4.
