# Plan — run an autonomous genome-mutation search for days (trustworthy, not noise-mining)

> **✅ CONVERGED** (codex/gpt-5.5 × opus, looped: deliberate → update → repeat). Four live deliberations;
> #4 ratified the plan **buildable and trustworthy** for a gated multi-day run, both models verifying the
> reversal condition against the text. This is the plan to let the meta-search run for *several days
> straight* mutating genomes — and have its output be a trustworthy answer to "what is the best way to get
> reliable code out of bad models," not days of gateway-weather noise. Operational SoT: `STATE.md`. Program
> spec: `COEVOLUTION-SPEC.md`. Live pickup: `COEVO-RUNG1-PROGRESS.md`.
>
> **THE SINGLE NEXT ACTION (agreed across all four deliberations):** implement the **instrument self-test
> manifest (check-of-checks)** first — any B5 guard that can't be shown to fire is treated as *absent*, the
> replay-anchored labeler validated gate-critically — then run the **two-axis variance characterization**
> (build-draw temporal blocks + repair-route micro-arm `r≈3`) on the full
> `coevo-rung1.mjs --repairgate --shapegate --contractgate --persistgate --seamgate` stack
> (quota-d1 + approval-d1 + non-gating rider, K=8, best-of-N OFF). GO/HALT reported **provisional** until the
> manifest passes. **Not** MAP-Elites, **not** more lever design, **not** metric softening — until a clean GO.
>
> **Deliberation log:** #1 (`…175339Z/`) **CONVERGED** → the **Phase −1 gate** + **pre-committed GO/HALT
> rule**. #2 (`…180027Z/`) **CONVERGED** → Phase −1 becomes a **TWO-AXIS variance gate** (build-draw temporal
> drift **and** repair-route-luck), disaggregated HALT, non-gating control rider, conservative estimates. #3
> (`…180908Z/`) ran to the round cap one ratification short, surfacing: the **check-of-checks instrument
> self-test manifest** (an *unfired* guard is the `rate()` failure mode), **dump-replay-anchored residual
> labeling** (regex demoted to telemetry), and — load-bearing — **a null replay is `unresolved → human
> adjudication`, never auto-(C)** (`form-unhandled` stays GO-side: an unbuilt lever is a target, not a wall).
> All folded in below; #4 ratifies.

---

## ⚖️ BINDING PREMISE (governs everything below — see STATE.md "BINDING PREMISE")

1. **No control over which model builds.** The fusion gateway pool is adversarial + **non-stationary**;
   route/model selection is **NOT** an admissible fix. Fitness is **worst-of-K-across-routes** for exactly
   this reason — a lucky-route 100% is not a model-agnostic 100%.
2. **Dumb models emitting broken code is the PREMISE and the TARGET, never a wall.** Crashes / missing
   surfaces / drift / over-applied guards are **(B) output-QA to be repaired** (self-repair → best-of-N →
   form levers), not a **(C)** boundary. (C) applies only to a gap that survives the *full* stack across
   routes. The "incompetence is unreachable" verdict was **overturned** by the self-repair lever.
3. **The method is MUTATING genomes** (harness + methodology). The search is the instrument; the frozen
   config is the product. NOT an "optimal mix" search.

The whole point of running for days: **let the search discover the output-QA stack (and orchestration
genes) that turns the worst routes' garbage into reliable software, on the model-agnostic fitness, across
the topology × scale ladder.**

---

## 🔑 THE HEADLINE — characterize before you build, on a pre-committed rule

The deepest risk of a multi-day run is **silently optimizing gateway weather under a metric that *looks*
model-agnostic but is empirically unstable.** The live worst-of-K fitness has *zero* test-retest
characterization, and the self-repair evidence to date is **3 hand-picked deterministic dump-replays** —
which prove a worst draw *can* move, not that repair *generalizes* across the live draw distribution.

So the plan does **not** start by building the search. It starts with **Phase −1**: a cheap, replicated,
**live** characterization of the post-output-QA-stack metric on the harness we *already have*
(`coevo-rung1.mjs` with the full gate stack, post the `rate()` fix), governed by a **decision rule
pre-committed now** so we can't rationalize whatever the gateway returns.

### ✅ The pre-committed GO / HALT rule — a TWO-AXIS variance gate (write it in stone before Phase −1)
The post-stack metric is a **compound statistic**: `min over K build-draws of (stochastic repair-route-back
outcome)` — and the load-bearing lever for the incompetence tail (model-routed self-repair) is *itself* a
single stochastic gateway draw. So Phase −1 estimates variance on **both** axes and gates GO on the **larger**
instability:
- **Build-draw axis (temporal drift):** within-block raw-min SD **and** block-to-block raw-min drift, across
  two temporally separated blocks.
- **Repair-draw axis (repair-route-luck):** post-repair grade spread from re-running the model route-back
  `r≈3×` on each worst draw. **This replaces the unmeasurable "best-of-N stabilizes it" clause** (best-of-N
  is OFF in Phase −1, so it could never be the evidence).
- **GO** to stack-wiring (B4) + the multi-day search **iff BOTH**:
  1. **Rankable above all instability.** A real lever's effect size **exceeds
     `max(2×within-block SD, block-to-block raw-min drift, repair-route spread)`**, using conservative
     range/upper-CI estimates (n≈6 per cell is too small to trust a bare point SD).
  2. **Repair generalizes — labeled by DUMP-REPLAY OUTCOME, never by regex or hand-inspection.** Residual
     worst draws are **repairable form** in **BOTH** blocks. The form/semantics label is anchored to whether
     a replay *actually moves the grade* — never the brittle test-name regex or code-inspection (both proven
     unreliable on this line; the persistence episode *over-counted* form). Pinned definitions:
     - `det-form-repairable` = a **deterministic** replay moves the grade (≥1 lethal bucket FAIL→PASS, 0 regressions);
     - `model-route-back-only` = only the **replicated** (r≈3) model-stack replay moves it (a single lucky route-back can't mint this label);
     - `route-incompetence` = not smoke-clean ∧ below the parse∧export floor;
     - `form-unhandled` = the full stack doesn't move it *yet*, but an admissible oracle-blind transform **is definable** → counts on the **GO / build-the-next-lever** side, **NOT** HALT (binding premise: an unbuilt lever is a target, not a wall — the repo just overturned exactly this with the self-repair gate; e.g. the tenancy `organizationId`-vs-`orgId` field-drift is unhandled form, not semantics);
     - `semantics-oracle-needed` = a residual a **human adjudicates** as needing the oracle (no admissible oracle-blind transform is even *definable*).
     **A null full-stack replay is `unresolved → human adjudication`, NEVER auto-`(C)`** — silence is not evidence of unrepairability (positive replay confirms repairability; it cannot negatively confirm semantics). The regex classifier is demoted to advisory telemetry.
  *(Conjunctive by design — the anti-gaming defense: an incompetence-pinned cell has near-zero raw-min SD
  that could fake "rankable", but it FAILS condition 2 → HALT.)*
- **HALT — and DISAGGREGATE the reason, because each routes to a DIFFERENT user decision:**
  - *raw-min unrankable* (effect ≤ instability) → a **statistic / instrument** problem;
  - *worst draw pinned at `route-incompetence`* (repair doesn't generalize) → the **route-pool-FLOOR
    pre-registration** call (Deliberation #1/#2 fork);
  - *human-adjudicated `semantics-oracle-needed`* → a genuine **(C)** finding.
  `form-unhandled` and `unresolved` are **NOT** HALT — they are GO-side (build the next lever). On a HALT:
  **stop building the search**; do **NOT** wire B4; do **NOT** soften the statistic; do **NOT** auto-derive
  (C) from a null replay. A HALT is a real finding, not a failure.

### 🎯 The fitness statistic is a WIN-CONDITION decision, not a tuning knob
- **Default = raw-min over K=8** — premise-faithful (the worst route must be handled; averaging it against
  the second-worst blunts exactly the signal the premise makes load-bearing).
- Any softening (e.g. `mean-of-worst-m`) **changes the claim** (population-worst → low-quantile/trimmed) and
  must be **explicitly ratified by the user as a win-condition redefinition** — never slipped in as a
  Phase-1 variance fix.
- **One identical statistic across search, freeze, and sequestered TEST.** Report raw-min, median, and
  pass-count always; optimize and falsify on the *same* one.

---

## The goal, stated as a falsifiable target

Run the MAP-Elites co-evolution search hands-off for days under §14 checkpoint/resume + watchdog, against
the **live** fusion gateway, and produce an archive of champion genomes per (topology × scale) cell whose
**worst-of-K-across-routes** reliability (under the pre-registered statistic) clears parity with the routed
all-frontier baseline at lower cost — with a defensible claim that the result is **gene quality, not pool
drift.** Gated by a clean Phase −1 GO.

---

## The plan (sequence — Phase −1 gates everything)

### Phase −1 — TWO-AXIS variance characterization on the EXISTING harness (cheap, live, d1) — THE GATE
Run on `coevo-rung1.mjs --repairgate --shapegate --contractgate --persistgate --seamgate` (post-`rate()`-fix;
the live, honest, full-stack post-repair worst-of-K evaluator we already have). **No new wiring first** —
characterize the *true product metric* before paying for `src/evaluator.mjs`/`genome.mjs` changes.
- **Gating cells:** **quota-d1 + approval-d1** (d1 grades through head-to-head-validated graders → the
  overdue K6 does **not** block this). **+ one NON-GATING low-incompetence rider** (membership/lifecycle-d1)
  — NOT a positive control (under honest grading *all 12 cells FAIL* worst-of-K=8); it only **disambiguates a
  HALT**: uniform-HALT-everywhere ⇒ the instrument can't register a GO anywhere, vs control-GOes /
  hard-cells-HALT ⇒ repair doesn't generalize on the hard cells. That sharpens the floor call the HALT
  escalates to. It never gates GO.
- **Build-draw axis:** **two temporally separated blocks** (different sessions/days), **≥3 reps/cell each,
  interleaved cell order, full stack ON, best-of-N OFF.** Compute within-block raw-min SD **and**
  block-to-block raw-min drift. (Back-to-back reps measure only within-session draw noise; the multi-day run
  lives in between-session drift — the census already showed the worst-draw *class* is stable while the
  specific mode/route drifts.)
- **Repair-draw axis (micro-arm):** on each block's worst draw, **re-run the model route-back `r≈3×`** and
  re-grade through the same post-stack classifier → the **repair-route spread** (quota-B d5's
  run1-admin-over / run2-tenancy split says this variance is real).
- **Per-draw log:** `{route, raw c/i, post-stack c/i, residual-worst bucket ∈ {det-form-repairable |
  model-route-back-only | route-incompetence | semantics-oracle-needed | unknown}, repair-fired,
  regressions}` + per-eval **wall-clock + gateway call count**, plus **one N=13 post-stack timing sample**.
- **Instability band** = `max(2×within-block SD, block-to-block raw-min drift, repair-route spread)`, each a
  **conservative range / upper-CI** estimate (n≈6/cell is too small to trust a bare point SD). This band is
  what the GO rule tests against **and** what the Phase-2 drift-aware stop must inherit.
- **Gate-critical precondition — the instrument self-test manifest (check-of-checks).** Before Phase −1's
  GO/HALT is trusted, a planted-fixture manifest must prove **every** B5 guard actually FIRES (the
  generalized `rate()` lesson: an *unfired* check, not a missing one, was the bug). Because GO-condition-2
  rests on the residual labeling, the **replay-anchored labeler is validated here, gate-critically** (its
  labels come from replay OUTCOME, above). Until the manifest passes, Phase −1 may run but its GO/HALT is
  reported **provisional**.
- **Output → the two-axis GO/HALT rule above.** Converts the N=3 dump-replay evidence into a distributional
  answer and gates all downstream building.

> **Structural note (opus, #2):** worst-of-K=8 is a min over an *unbounded-below* non-stationary pool → absent
> a route-pool floor the min trends to the worst route's incompetence *by construction*. So the GO branch is
> reachable only if model-routed repair **reliably clears incompetence across the distribution** — i.e. this
> whole experiment is, in effect, a **generalization test of the self-repair lever**, and the route-pool-floor
> decision is closer to a **prerequisite** than a downstream consequence. That is why the HALT branch
> escalates the floor pre-registration call.

### Phase 0 — pre-run build & instrument re-validation (ONLY on a clean GO)
1. Wire the output-QA stack + genome nodes (B4); R2-10 clean-restart keeps the synthetic path bit-identical.
2. Build the paired/CRN harness (B2) and the full silent-failure instrumentation (B5).
3. Re-validate K6/K7/K8/P0 on the new genome/graders. GREEN gate before anything live.

### Phase 1 — full characterization & calibration (~1 day)
4. Measure gateway concurrency + per-eval wall-clock with the stack ON; map eval-budget → wall-clock (B1).
5. Confirm the Phase −1 noise floor at scale; lock K and the (pre-registered) statistic. Admit the surrogate
   **only now** — trained on characterized post-stack data, K7-gated (a surrogate over drifting/pre-stack
   data just accelerates noise-mining).

### Phase 2 — the multi-day search
6. Run MAP-Elites celled by (topology × scale), fitness = the pre-registered post-stack worst-of-K
   statistic, surrogate-screened, tiered ladder, per-cell cumulative veto, §14 checkpoint/resume + watchdog
   + canaries + budget ledger. Seed from the naive pool; climb the ladder. **Credit-attribution
   counterfactuals must be REPLICATED (≥r) or restricted to deterministic levers** — a single-draw
   counterfactual reversion mis-charges a gene's credit under the observed repair-route-luck.

**Stop / convergence rule (drift-aware).** Halt when any of: (a) the archive holds worst-of-K parity across
the full ladder; (b) **no new cell cleared in M generations AND** the reference genome's post-stack tail
statistic stayed within the **Phase −1 two-axis instability band** (NOT the underestimated within-session SD
— inheriting that would re-introduce the false-stability bug) **AND** the survivor queue hasn't improved by
more than the trustworthy effect size (a stall only counts as convergence if it isn't drift — if drift
exceeds the band, **pause/rebaseline**, do not call convergence). **Phase 2 NEVER autonomously emits a
(C)/scope-shrink:** a worst residual that survives the full stack is **parked as `unresolved`/`form-unhandled`
telemetry and the run continues** (build-the-next-lever side); promotion to a genuine **(C)** kill happens
only by **human adjudication at a checkpoint review** (consistent with the never-auto-(C) rule — an
autonomous (C) inside an unattended window is forbidden). Watchdog/canary halt-to-checkpoint on any
instrument failure.

**"Signal not noise" acceptance test.** Trustworthy iff: every claimed cell improvement exceeds the noise
floor under paired/CRN comparison; FAIL **and** PASS canaries held; budget ledger reconciles; K7 held (or
killed correctly); the drift monitor shows the reference genome moved less than the noise floor; sampled
"improvements" survived a deterministic replay (route-luck did not masquerade as causal repair); and
credit-attribution explains each champion as a specific (A)/(B) lever, not luck.

---

## The blockers, with converged resolutions

### B1 — Live eval throughput (one N=13 eval is >150s; the QA stack adds gateway calls)
- **Measure post-stack cost FIRST** (in Phase −1): one d1 + one N=13 *post-stack* eval's wall-clock and
  gateway-call count, with repair-depth and best-of-N caps. Set the eval budget from observed p50/p90, not
  the stale >150s number. Then a concurrency sweep with a fixed reference genome. **Admit the surrogate only
  after** post-stack characterization. **Do not promise "several days"** until evals/hour at the chosen K is
  observed (repair call distribution + surrogate kill rate on post-stack data).

### B2 — Non-stationary pool + worst-of-K is an extreme order statistic + ZERO characterization
- Resolved by the **two-axis Phase −1** (above): two temporally separated blocks (build-draw drift) + a
  repair-route micro-arm (repair-draw luck) → the instability band and whether raw-min is rankable above it.
  The statistic is the premise-faithful **raw-min** by default; softening is a user win-condition call.

### B3 — The bar mismatch (optimize per-mode lift; freeze on worst-of-K)
- "Worst-of-K over post-output-QA-stack outputs" is **necessary but NOT sufficient.** Best-of-N makes
  fitness a **compound order statistic** — `min over K build-draws of (best over N repair-draws)` — and
  repair-route-luck (observed) means a *single* draw's post-stack grade is itself stochastic — so the
  **repair-draw axis is the load-bearing variance**, and Phase −1's micro-arm measures it directly. The 3
  deterministic dump-replays do **not** characterize this. **Phase −1 must classify residual worst draws**
  to confirm repair *generalizes* (the worst draw *moves*, not merely *relocates* to an unrepairable
  residual). If the post-stack worst draw stays pinned at incompetence/semantics → HALT (→ floor call).

### B4 — The genome lacks the repair class; the QA stack isn't wired into the live evaluator
- **Confirmed mandatory, but GATED behind a clean Phase −1 GO.** When building:
  1. Add genome nodes `selfRepair {on, depth}`, `bestOfN {on, N}`, plus form levers (shape, contract,
     extraction, seam, tenancy/field) — **off-state canonical compatibility** (synthetic path bit-identical).
  2. Wire the **ordered** stack into `makeEpicEvaluator`: extraction/surface-normalization (if present) →
     **smoke / self-repair** → **best-of-N repair selection** → deterministic form gates → model-routed
     form gates *only if selected* → grade. **Repair runs first** (it unblocks the form modes underneath).
  3. Log every intermediate artifact + call count; add credit-attribution *after* the stack is observable.
- Update `validateGenome` + `canonical()` (R2-10 clean-restart).

### B5 — Anti-gaming / oracle-blindness / instrument re-validation (a multi-day run must not silently rot)
Full required in-loop check set (the draft list **plus** Deliberation #1's additions):
- **FAIL canary** — a planted broken surface that must grade FAIL every generation (catches no-op graders).
- **PASS canary** — a planted known-good surface that must stay PASS (catches a break-everything-**red**
  grader, which a FAIL-only canary misses).
- `harnessError` / timeout / absent / empty buckets all score **FAIL** (never the old `rate()=1.0`).
- **Oracle-leak scan** on every gene prompt **and every repair prompt** (provenance-blind).
- **Reference-genome drift monitor** (post-stack tail score over time).
- **K7 surrogate decorrelation kill** (ρ ≥ 0.80).
- **Repair-route-luck monitor** + **compound-metric variance monitor**.
- **Post-stack residual classifier** (the 5 buckets above), retained per draw.
- **Periodic deterministic replay of sampled live "improvements"** — so live route-luck isn't mistaken for
  causal repair.
- **Per-cell cumulative non-inferiority veto** over the ladder (no curriculum-forgetting).
- **Strict budget ledger** for gateway calls; **intermediate artifact retention.**
- **Instrument self-test manifest (check-of-checks) — the generalized `rate()` defense.** A planted-fixture
  suite that deliberately trips EACH guard above and asserts the expected red/kill/counter: FAIL canary
  fails · PASS canary passes · harnessError/timeout/empty → 0 · oracle leak in build **and** repair prompts
  rejected · K7 kill fires on decorrelated data · drift monitor flags a moved reference · repair-route-luck
  monitor records spread · **replay-anchored labeler routes known det-form / model-only / incompetence draws
  correctly** · deterministic replay rejects a planted fake improvement · cumulative veto blocks a regression
  · budget-ledger mismatch halts. **A check that can't be shown to fire is treated as absent.** (The labeler
  test is gate-critical and runs in Phase −1; the rest gate Phase 0→1→2.)
- **Re-validate K6/K7/K8/P0** after the genome/grader changes (currently DUE/overdue) — in Phase 0.

### B6 — The route-pool floor (reframed by "incompetence is the target") — still needs an explicit pre-reg floor
- Best-of-N within the same pool is **admissible as a bounded, pre-registered output-QA gene** — capped,
  charged to cost, selected by **content-independent structural checks** (smoke-clean ∧ exports all surfaces
  ∧ no free-id crash ∧ passes structural/contract lint ∧ preserves declared obligations), **never** by
  oracle score, and used **identically in search/freeze/TEST**. It is orchestration/output-QA, NOT route
  selection.
- **It does NOT dissolve the floor** — it moves it to "after bounded output-QA." An **explicit pre-registered
  floor is still required:** *a valid draw = parses ∧ exports the surface ∧ smoke-runs without a free-id
  crash, after ≤depth repair / ≤N redraws.* **Pre-register what happens when no candidate is admissible:**
  the cell is **(A) under-specified** (orchestration target) or, only if (A) is exhausted, a genuine **(C)**.
- The freeze claim must state plainly: *"the product includes up to N same-pool repair/redraw attempts
  selected by this predicate."*

---

## Open questions — status after Deliberation #1

- **Q1 (fitness reconciliation).** ⏳ **Answered by Phase −1, not by assertion.** Necessary-not-sufficient;
  the residual-bucket classification across replicates decides whether repair generalizes or relocates.
- **Q2 (statistic + K).** ✅ **raw-min over K=8 default**; softening = user pre-registration call; one metric
  across search/freeze/TEST. (Revisit only if Phase −1 shows raw-min unrankable → forces the user call.)
- **Q3 (floor / best-of-N admissibility).** ✅ best-of-N admissible as a bounded same-pool gene; **explicit
  floor still required** (B6).
- **Q4 (throughput).** ⏳ **Unknown until measured** — Phase −1 timing + one N=13 post-stack sample; no
  "days" promise until evals/hour observed.
- **Q5 (silent-failure surface).** ✅ Complete set in B5 (added PASS canary, budget ledger, deterministic
  replay of sampled improvements, residual classifier, compound-variance monitor).
- **Q6 (stop rule).** ✅ **Drift-aware** stall (above) — a stall only counts as convergence if the reference
  genome stays within the noise band.
- **Q7 (sequence).** ✅ **Phase −1 gates Phase 0.** Characterize on the existing harness first; build the
  search only on a clean GO.

---

## Apparatus pointers
Existing post-stack harness (Phase −1): `coevo-rung1.mjs` (worst-of-K + A/B/C attribution + all gate flags),
`replay-repair.mjs` / `replay-persist.mjs` (deterministic dump-replay causality). Engine (Phase 0+):
`src/{loop,map-elites,operators,proposer,credit,surrogate,scorecard,config,genome,evaluator}.mjs`. Levers:
`src/{repair-gate,shape-gate,contract-gate,persistence-gate,seam-gate,integration-gate}.mjs`. Gateway:
`runner/model-client.mjs` (`makeGatewayInvoke`). Frozen (do not edit): `DESIGN.md`, `FREEZE.md`,
`studies/build-gap/`.

---

## 🚧 BUILD HANDOFF — Phase −1 (pick up COLD in a new session)

> The deliberation loop is **done**; this is the execution guide. The GO/HALT rule, the statistic, and the
> labeling definitions above are **pre-committed — do not re-derive or soften them.** Build, run, then apply
> the rule. Apparatus is additive/dev; the frozen tree (`DESIGN.md`, `FREEZE.md`, `studies/build-gap/`) and
> the committed P0/K8 synthetic path stay untouched.

### Verified ready (2026-06-19)
- `coevo-rung1.mjs` has all 5 gate flags (`--repairgate --shapegate --contractgate --persistgate
  --seamgate`) + `--dump <dir>` + `--out <name>` + `--mock`, and the **hardened grade path**
  (`isGrade`/`relOf` → empty / `harnessError` / `timeout` = **FAIL**, not the old `rate()=1.0`).
- **5 gate smokes GREEN:** repair 18/18 · shape 32 · contract 26 · persistence 33 · seam 22.
- **Replay instruments exist:** `replay-repair.mjs` (`--stack`, model + deterministic route-back causal
  replay — the labeler's engine and the repair micro-arm), `replay-persist.mjs` (deterministic, $0).
- Census/REPAIR-LEVER **dumps** for the labeler self-test live under `runs/dump/` (gitignored, local).
- Deliberation harness needs `CODEX_HOME=/home/cstaulbee/.codex` (memory: `codex-deliberation-auth-fix`).

### Build, in order
1. **Replay-anchored residual labeler + its gate-critical accuracy self-test (BUILD FIRST).** Label each
   worst draw by **replay OUTCOME** (engine = `replay-repair.mjs`): `det-form-repairable` (deterministic
   replay moves grade, 0 regressions) · `model-route-back-only` (only the **replicated r≈3** model replay
   moves it) · `route-incompetence` (below the parse∧export∧smoke floor) · `form-unhandled` (stack doesn't
   move it *yet* but an admissible oracle-blind transform is **definable** → GO-side) · `unresolved` (null
   replay, no definable transform → **human adjudication, never auto-(C)**). Demote `census-classify.mjs`
   regex to **advisory telemetry**. Self-test: feed known draws of each class from `runs/dump/` and assert
   correct routing — **gate-critical; until it passes, Phase −1 GO/HALT is provisional.**
2. **Instrument self-test manifest (check-of-checks), Phase −1 subset.** Plant fixtures that force each
   guard to FIRE: FAIL-canary→FAIL · PASS-canary→PASS · empty/`harnessError`/`timeout`→0 · `scanOracleLeak`
   rejects a leak in **build AND repair** prompts · deterministic replay rejects a planted fake improvement ·
   the labeler routes the known draws (from #1). **A guard that can't be shown to fire is treated as
   ABSENT.** ⚠️ Audit `coevo-rung1.mjs:306 rateNum` (`b ? a/b : 1` — defaults to *pass* on `b=0`): confirm
   it is display-only and **not** in the grade/gate path (it's a second `rate()`-class footgun if it is).
3. **Two-axis characterization harness** (wrap `coevo-rung1.mjs`):
   - Cells: **quota-d1 + approval-d1** (gating) **+ one non-gating rider** (membership-d1 or lifecycle-d1).
   - K=8, full stack ON, **best-of-N OFF** (not built — consistent). `--dump` every draw, `--out` per block.
   - **Build-draw axis:** **two temporally separated blocks** (≥3 reps/cell each, interleaved order). This
     is why it **spans sessions** — run block A now; **block B is a later session/day.** Compute within-block
     raw-min SD **and** block-to-block raw-min drift.
   - **Repair-draw axis (micro-arm):** on each block's worst draw, re-run the model route-back **r≈3×**
     (`replay-repair.mjs --stack` on the dumped worst-draw artifact), re-grade → **repair-route spread**.
   - Per-draw log: `{route, raw c/i, post-stack c/i, residual bucket (from #1), repair-fired, regressions}`
     + per-eval wall-clock + gateway call count + **one N=13 post-stack timing sample**.
   - **Instability band** = `max(2×within-block SD, block-to-block drift, repair-route spread)`, conservative
     upper-CI.

### Then apply the pre-committed GO/HALT rule (above) — do not re-derive
GO iff (lever effect > band) ∧ (residual worst draws are repairable-form — `det-form-repairable` ∨
`model-route-back-only` ∨ `form-unhandled` — in **both** blocks). Else **HALT**, disaggregated:
unrankable→statistic call · `route-incompetence`-pinned→route-pool-FLOOR pre-registration (user) ·
human-adjudicated `semantics-oracle-needed`→(C). **Until a clean GO, do NOT** wire B4 (`src/genome.mjs`,
`src/evaluator.mjs`), run MAP-Elites, soften the statistic, or emit (C). If the micro-arm spread exceeds
plausible lever effects → raw-min unrankable → **escalate the statistic as a USER win-condition call.**

### Re-validate before any Phase 0 wiring (not needed for Phase −1 itself)
K6 (overdue) / K7 / K8 / P0 must re-GREEN after B4 genome/grader changes. Phase −1 runs on d1, which grades
through head-to-head-validated graders, so it is **not** blocked by the overdue K6.
