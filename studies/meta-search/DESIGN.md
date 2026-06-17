# Meta-search study — an instrument that searches builder-system configs to test the hybrid thesis

_Pre-registered design **rev.3, 2026-06-16**. Supersedes rev.2 after a second two-round adversarial review
(6 independent red-team lenses + a refute/adjudicate round + a fresh completeness critic; findings
consolidated inline, severities and verdicts preserved in [`REVIEW-LOG.md`](REVIEW-LOG.md)). The framing
survived again; rev.3 folds the confirmed fixes from that round — the **per-cell non-inferiority veto** (the
rev.2 bucket-average veto licensed silent lethal misses), the **staging of credit-attribution / niching /
surrogate / knowledge-capture out of the frozen P1 set**, the **cost-axis honesty pass** (the routed
all-frontier baseline is a separate workstream; interim comparison is the opus-whole proxy), and a cluster
of measurement-layer gates (instrument self-validation, effective-sample-size, harness-error handling,
concrete freeze values). Two new Tier-2 reframes were resolved by the research lead (§13). Read with the
north-star [`../../docs/PROPOSAL-HYBRID.md`](../../docs/PROPOSAL-HYBRID.md), the build-dispatch harness this
wraps ([`../build-gap/DESIGN.md`](../build-gap/DESIGN.md) + [`epic-run.mjs`](../build-gap/epic-run.mjs) +
[`lib/epic-sandbox.mjs`](../build-gap/lib/epic-sandbox.mjs) + [`lib/scale-oracle.mjs`](../build-gap/lib/scale-oracle.mjs)),
the latest crux data ([`../build-gap/MCOH25-RESULTS.md`](../build-gap/MCOH25-RESULTS.md)), and the method
library ([`../../okf/agentic-workflow-optimization/`](../../okf/agentic-workflow-optimization/))._

> **Freeze status: NOT YET TAKEN.** rev.3 is eligible for the freeze after (a) a light re-check that the
> three freeze-blocking edits (per-cell veto §6, the trimmed frozen set §7/freeze line, the concrete freeze
> values §7) read correctly, and (b) the research lead pins the concrete values flagged **`[PIN AT FREEZE]`**
> below. Recommended defaults are given inline; they are recommendations, not commitments.

---

## 0. The question, and why this is an instrument and not the product

The north-star is **fixed by hypothesis** and is explicitly **not a search for an "optimal mix"**
([`PROPOSAL-HYBRID.md`](../../docs/PROPOSAL-HYBRID.md) §"The question"). Building a search now is justified
under **one framing only**:

> **The meta-search is an instrument, not the product.** Its job is to answer falsifiable questions —
> *does any hybrid configuration dominate all-frontier on (cost, reliability); at what N / amortization
> regime does dominance first appear; and which structural mutation is load-bearing?* The winning
> configuration is **frozen and re-tested under the pre-registered fixed-architecture comparison.** The
> search proposes and bounds; the falsifiable test disposes.

**Thesis scope (made explicit; review finding B4).** The thesis claims cheap **runtime coding**, not cheap
**system design**. The reflective mutator is a frontier model — that is legitimate, *amortized, one-time
R&D* (like a human researcher tuning a harness), **provided the frozen winner is a static, human-readable,
human-reproducible config** that runs without the search loop (§7 freeze artifact). A win is a claim about
the *runtime* system, never about the designer. An optional **cheap-mutator control arm** (run the
identical loop with a fusion/sonnet mutator) is a robustness check, not a validity requirement.

**An instrument must be calibrated before its null is believed (round-2 finding R2C-3, RESOLVED §13.4).**
The most consequential possible outcome is a **K1 null** ("no hybrid reaches parity at ≤ cost at any tested
N"). A null is only interpretable if the search *can* find a winner when one exists; otherwise "thesis
false" is confounded with "search/mutator/credit-assignment broken." So **P0/P1 includes a hard
planted-positive instrument-validation gate** (§9, K8): seed a deliberately-handicapped pool plus one
hand-built **known-dominating** genome and require the loop to **rediscover it** within a pre-registered
generation budget. No K1 null may be reported until this gate passes.

**Near-term payoff.** The live crux is the per-surface checker lever × scale/amortization
([`STATE.md`](../../STATE.md)). v1 is, concretely, an **automated multi-config ablation of that lever across
N** — turning a hand-guessed crux into a searched result: *does a cheaper skeleton-author + checker reach
reliability parity at a cost below the all-frontier bar, and at what N?*

---

## 1. The build-dispatch → meta-search mapping (this study "is build-dispatch, one level up")

The apparatus already **is** a build-dispatch system: [`epic-run.mjs`](../build-gap/epic-run.mjs) fans out
N isolated cheap surface-builds, each returns `{files:{…}}`, then `evaluateEpic`
([`lib/epic-sandbox.mjs`](../build-gap/lib/epic-sandbox.mjs)) grades the assembled epic into
`{wire, happy, crosscut, integration}`. The meta-search wraps a **search loop** around it, mirroring
`/build-batch` one level up:

| build-dispatch (the harness) | meta-search analog |
|---|---|
| bead = unit of work | **genome** = one builder-system config (§2) |
| ready-bead selection | parent selection from the **MAP-Elites archive** (§4; flat Pareto list at P1) |
| worktree per builder | isolated **eval sandbox** per candidate (frozen apparatus SHA) |
| `beads-builder` worker | **candidate-eval worker** — runs `epic-run.mjs` over the frozen CORE battery |
| in-worktree quality gate | per-candidate **scorecard** (per-cell reliability + cost ledger + co-measured baseline) |
| `BUILD_COMPLETE` marker | **schema-bounded scorecard** (cost vec + per-cell pass-vector + EPIC✓ + route dist + trace digest) |
| serialized merge to main | serialized **archive insert** (per-cell veto + niche cell, §4) |
| post-merge gate | **dominance check** + (niching-gated) reflective mutation → next generation |
| the bead DAG | the **generation lineage** (search tree) |
| decompose report (human gate) | **pre-registered decision rule** (§7) + freeze-and-retest on a sequestered TEST set |

**Context discipline (load-bearing).** The meta-orchestrator (frontier) holds **only the archive + the
generation log on disk** — never a worker transcript. Orchestrator = decisions + pointers; workers =
ephemeral. Every scorecard returns schema-bounded.

---

## 2. Nodes — the genome (what a candidate *is*)

A candidate builder-system is a **typed agent graph**; each node carries genes; the type system guarantees
every genome is runnable.

| Node | apparatus seam | gene: model | other genes |
|---|---|---|---|
| skeleton-author | [`gen-skeleton.mjs`](../build-gap/gen-skeleton.mjs) | `opus \| sonnet \| fusion` | shapes-included, obligation-contract depth |
| decomposer | strategies | `opus \| sonnet \| fusion` | lens-ensemble on/off, # lenses |
| per-surface builder | [`epic-run.mjs`](../build-gap/epic-run.mjs) | `fusion` (cheap) | K (builds/surface) |
| retry / re-router | `epic-run.mjs` `isValidSurface` | `fusion` | retry count, gate strictness |
| **per-surface checker** *(live lever)* | `lib/validate-surface.mjs` + [DESIGN §4b](../build-gap/DESIGN.md) | `deterministic \| +cheap-judge` | **on/off**, obligation-classes, repair depth |
| integration gate | `epic-run.mjs` `isValidSurface` | `deterministic` | (fixed) |
| integrator / union | `mergeSnapshots` | `fusion` | recurrence threshold |
| **escalation policy** *(MISSING — built at P2, not P1)* | new | `→ sonnet \| → opus` | trigger condition, budget cap |
| judge | [`runner/judge.mjs`](../../runner/judge.mjs) | **pinned, NOT searchable** | — |

**The all-frontier baseline is a co-measured REFERENCE, not a searchable node (round-2 R2-2; §13.3
RESOLVED).** The WIN reference point is a **cost-optimized all-frontier** config (routes haiku/sonnet for
easy work, opus for hard). Building that routed policy is its own routing problem and is tracked as the
**separate crux workstream** [`STATE.md`](../../STATE.md) #3, **outside this instrument**. Until it lands,
the instrument co-measures cost/reliability against the **admissible reliable proxy = opus-whole**
(MCOH25's $0.27 bar), and **all interim cost-WIN claims are explicitly provisional** (§6, §7). The freeze
gates the *final* cost-WIN on the routed baseline once that workstream delivers it.

**Hard constraints in the type system (anti-gaming):**
1. **The judge is pinned** (sonnet/opus, never the free pool) — the search cannot game its own grader. Its
   *output* is still non-deterministic; budget its variance (§6, finding #6).
2. **The checker may never read the oracle** — authored only from the skeleton's typed obligation contract.
3. **Two channels, never crossed (round-2 R2-1).** (a) The **insertion veto** consumes the full
   **per-cell pass-vector** — mechanical, on disk, never rendered to any model. (b) The **mutator's
   failure-trace digest is quadrant-and-count only** — never per-edge identifiers or seam names (finding
   A3). The reflective mutator is frontier and has seen many oracles; naming the exact broken seam in the
   digest is an oracle→trace→frontier→prompt leak. Every mutated prompt **and every retrieved knowledge
   record (§10)** is mechanically scanned for oracle-token overlap; a hit voids the candidate (§7, K3). The
   per-cell veto is therefore computable at insertion **without** weakening the digest.
4. **The gateway route is stratified and reported, not "pinned" (round-2 R2-5, downgrades finding #3).** The
   cheap supply `jnoccio/jnoccio-fusion` routes to a gateway-selected upstream and only *records* it
   ([`runner/model-client.mjs`](../../runner/model-client.mjs) ~L446) — there is no request-level pin
   field. Unpinned, fitness confounds genome quality with the upstream lottery. So: **stratify over a fixed
   roster, record the route distribution in the scorecard, and gate the freeze on route-stable dominance
   verified across ≥3 route-stratified re-draws with per-route bootstrap CIs.** A literal upstream pin is
   used **only if** a future gateway exposes a real override — **verify that capability before P1, else
   "route-stable" means stratification-stable, not pinned.**
5. **Cost is metered, escalation is model-priced and ledgered (round-2 R2-2 / finding A2).** Per-call `usd`
   accrues for real frontier calls (`epic-run.mjs` sums `g.usd`), but the cheap gateway hardcodes `usd:0`
   ([`model-client.mjs`](../../runner/model-client.mjs) ~L444) — so the cheap *coding* term is legitimately
   ~$0 (that is the thesis), with the [`STATE.md`](../../STATE.md) caveat that $0 is a Phase-1 **upper-bound
   proxy** for the eventual owned-hardware amortized cost. The gap is a **model-priced escalation ledger**:
   keyed on each node's model gene, charging tokens × **pinned published per-token rates** (recorded in the
   freeze), so an opus escalation is never free. A self-test asserts the ledger **reproduces a known metered
   opus run** (MCOH25 anchors: opus $0.395, opus-whole $0.27); the all-opus-domination CI guard (§6) then
   tests a *grounded* price table, not its own constants.

---

## 3. Mutations — the operators and the engine

**Operators** (each preserves genome validity): model-swap · toggle checker on/off · change K · set/move
the escalation trigger · add/remove a decomposer lens · adjust amortization regime · reflective prompt-edit.

**Engine — GEPA-first (reflective), ADAS deferred** (the method library prefers GEPA because ADAS "maximally
exposes reward-hacking"; [`okf/…/methods/adas.md`](../../okf/agentic-workflow-optimization/methods/adas.md)).

- **Reflective mutation (default).** The frontier model reads a candidate's **quadrant-and-count digest**
  (constraint 3) and proposes **one** targeted change.
- **Typed-random (small budget, ON from P1).** A small exploration budget runs from P1 — not "once
  reflective plateaus" — because the plateau detector is unreliable until the battery is frozen (finding B5).
- **Credit assignment (finding B1) — a P2 mechanism, NOT a frozen P1 invariant (round-2 R2-3/R2-7).** At
  **P1 there is one lever** (the checker), so the attributed gene is **the checker by construction** — no
  attribution machinery is needed or run. Counterfactual single-node reversion is **introduced at P2**, when
  the gene pool is wide enough that blame is ambiguous, with three corrections from the round-2 review:
  - **Skeleton-first, not single-node.** MCOH25 showed the membership-seam fix was a *skeleton* clause owned
    by no leaf node; the `crosscut`/`integration` buckets are precisely the cross-surface obligations no
    single node owns. So **revert the skeleton gene first**; single-node reversion is reserved for `wire`/
    `happy` regressions. Reflective mutation is then restricted to the attributed gene.
  - **Bounded compute (round-2 R2-3, re-opening B2 otherwise).** Reversion is O(#nodes) extra evals; run it
    **only on the single worst lethal-bucket candidate per generation**, gated behind the digest, and
    **charge every reversion eval to the §7-K5 eval-count budget** so it cannot silently blow it.
  - **A mis-attribution kill (round-2 R2-5/L6-5).** The attributed reversion must restore the bucket by a
    margin **above K-run noise**; below that margin, log **"unattributable" → route to typed-random**, never
    auto-force the skeleton (auto-skeleton-on-noise is the rev.1 behavior B1 was raised against). Pin the
    margin `[PIN AT FREEZE]` (recommended: 2× the worst-of-K standard error on the bucket).
- **Knowledge-conditioning** (§10) is a **P2+ enhancement, gated behind niching** (it accelerates collapse;
  finding B3 + the capture review's open-Q3), with its own leak-scan and collapse kill (§10).

---

## 4. Evolutions — the search loop (the dispatch)

Per generation, mirroring `/build-batch`. **At P1 the archive is a flat Pareto list** (P≤6 candidates —
celled MAP-Elites is unnecessary and is introduced at P2; round-2 R2-7/L4-5):

1. **Select** parents. At P2+, from the **MAP-Elites archive** (finding B3). The archive is celled by a
   concrete **behavioral descriptor**: `(genotype-Hamming bucket, per-bucket-recall signature
   [wire/happy/crosscut/integration], cost bucket)`. **The recall signature is quantized into fixed bins and
   computed on the FROZEN CORE** (with elites re-evaluated or carrying exact scores, §5) so cell assignment
   is **stationary** across generations (round-2 L2-niching); without this, drifting scores would re-bin
   incumbents. An insert into an occupied cell is rejected unless it dominates the incumbent. This makes "no
   collapse" *measurable*, not aspirational (§7, K4).
2. **Mutate** via the reflective engine (+ small typed-random) → K children. (Credit-assignment-gating
   applies at P2+, §3.)
3. **Dispatch** K candidate-evals as isolated workers (worktree isolation; they mutate apparatus files).
   Each worker runs its genome over the **frozen CORE battery** (§5) via `epic-run.mjs`, scores with the
   per-cell reliability metric (§6) **and re-measures the all-frontier baseline (interim: opus-whole proxy)
   on the same epics/seeds** (finding #5 — the baseline is co-measured per generation, never a stored
   constant). Returns only the schema-bounded scorecard.
4. **Insert** survivors into the archive over **(cost, reliability)**, never scalarized — and apply the
   **per-cell lethal veto at insertion**, not only at WIN (finding A4; round-2 R2-1). A candidate must
   **dominate the co-measured baseline cell-by-cell on the lethal buckets** (every `crosscut` and
   `integration` cell: `passes(candidate, cell) ≥ passes(baseline, cell)`); a candidate that lifts
   `wire`/`happy` while dropping **any** lethal cell below baseline is **rejected**. _**RESOLVED
   (2026-06-16):** veto-at-insertion is the chosen default; the WIN-only alternative is rejected. See
   `AMENDMENTS.md` A2. The **per-cell** form (vs the rev.2 bucket-average) is the round-2 R2-1 fix._
5. **Harness failures are hard fails, never exclusions (round-2 R2C-5).** `evaluateEpic` can return
   `{harnessError | timeout | empty}` with no bucket counts ([`lib/epic-sandbox.mjs`](../build-gap/lib/epic-sandbox.mjs)).
   Any such result is a **hard worst-of-K FAIL** (lethal veto = 0 for that epic, full cost still charged),
   **never excluded** from the K-aggregation — otherwise a slow/timing-out or stub-emitting genome scores as
   "no failures observed" and games the veto. The per-genome harness-failure rate is logged as a separate
   reliability signal.
6. **Loop-until-dry.** Stop when the front fails to advance on the **fixed CORE** for **G** generations, or
   the **pre-registered eval-count budget** exhausts (finding B2 — see §5). Silent caps are logged.

---

## 5. The battery, seeds, and splits (unified policy)

This section resolves findings A5 + B5 + C1 + C2 + C3 + B2 (and round-2 R2-7 / R2C-1) into **one** coherent
policy. The rev.1 spec left the battery as a "rotating held-out" set — which simultaneously caused
cherry-picking, cross-generation leakage, non-stationary (non-comparable) Pareto fronts, and a circular
freeze-and-retest.

- **Epic population (finding C2 — CRITICAL; round-2 R2-7/L4-2 sharpens it).** Today's evidence base
  (workspace + the `scale-d1..d4` ladder) is **size-variants of one epic**, and the generator
  ([`gen-epic.mjs`](../build-gap/gen-epic.mjs) over [`lib/scale-oracle.mjs`](../build-gap/lib/scale-oracle.mjs))
  currently emits only **D-count size-variants of one template** — its `DOMAIN_CATALOG` is **5 lexical
  clones** sharing the *same* hidden obligations (tenancy/authz/mass-assignment), the *same* membership
  seam, the *same* obligation classes. **Surface-count varies; obligation-class and seam-topology have zero
  degrees of freedom.** Therefore: genuine diversity (the "vary domain / obligation classes / seam
  topology" claim) is an **epic-authoring task — building N new templates — not something the generator does
  today.** That authoring is **a P2/P3 prerequisite for external validity and must NOT ride inside the
  freeze as if `gen-epic.mjs` already produced it.**
- **CORE battery (frozen, in-loop).** **P1 uses the 2 anchor epics only** (the loop-closure test needs no
  more; round-2 R2-7). The full CORE — ~8–12 *independent* epics, **≥10 per N-bucket** for the scale-gate
  model (finding C3) — is assembled at P2 from the authored templates above. Frozen for the whole run →
  fitness is comparable across generations (finding B5).
- **K-run aggregation = worst-of-K** (finding A5) for both cost and reliability, over logged seeds; elites
  are **re-evaluated** (or carry exact scores) each generation on the same CORE. No best-seed cherry-pick.
- **TRAIN / VAL split inside CORE** — TRAIN drives mutation feedback, VAL drives archive selection + early
  stop. (Applies once CORE > the P1 anchor pair.)
- **Sequestered TEST set (finding C1 — CRITICAL).** A large, **independent** hold-out (**≥80 epics**),
  hash-gated and physically inaccessible to workers, **scored exactly once at P3** on the frozen winner.
  Any second look **voids** it. Dominance on TEST is reported with a **bootstrap CI across epics**, and the
  scale-gate is attributed to N via a mixed model `cost-gap ~ N + (1|epic)` (finding C3). "Rotation" is
  demoted from an in-loop mechanism to *this one-time TEST draw*.
- **Effective sample size / power (round-2 R2C-1 — the CI must not over-state confidence).** The bootstrap
  CI and the mixed model assume independent draws; with templated clones the **effective N collapses toward
  the number of distinct seam-topologies, not 80**. So: (a) pre-register an **intraclass-correlation /
  design-effect estimate** and a **power analysis fixing N_needed** for the target δ at α; (b) require the
  TEST set to span a **pre-registered minimum count of distinct seam-topologies (an n_eff floor)** — not
  just surface-count strata; (c) report the design-effect-adjusted CI, never the naïve one.
- **Compute budget (finding B2 — CRITICAL).** Do **not** cross-product P×G×K×N-sweep×battery. P1 runs tiny
  (e.g. P≤6, G≤6, K=2, N=5, 2 anchor epics ≈ ~150 evals) purely to confirm the loop closes and the checker
  lever moves the front. The full N-sweep × high-K × TEST runs **only on the frozen winner**. The
  **surrogate-scorer node** (§11; AgentSquare-style, ~0.025% eval cost) cuts in-loop dispatch cost **at P2**,
  under its own calibration kill (§7, K7). Pre-register an **eval-count kill** (§7, K5).

---

## 6. Fitness — the non-gameable crux (per-cell, re-wired to the bucket scorer)

**G1 (the rev.1 foundational bug, verified).** rev.1 anchored fitness on
[`eval/generative-coverage.mjs`](../../eval/generative-coverage.mjs) (`costWeightedEdgeRecall`,
quadrant-tagged manifest, `lethalRecall` veto). That scorer is imported only by the `runner/battery.mjs`
"hearth" lineage — **never by `studies/build-gap/`** — and `costWeightedEdgeRecall` returns `undefined` on
an untagged manifest (line 101); the epics carry no `quadrant` tags. The epic battery grades with
`evaluateEpic` → `{wire, happy, crosscut, integration}`. **Resolution: define the lethal veto and
cost-weighting over the buckets the harness already produces — and (round-2 R2-1) at PER-CELL granularity,
because the original per-edge recall the rev.1 veto inherited operated per-edge, and a bucket *average*
re-opens exactly the silent-miss gaming it was built to catch.**

**The quadrant↔bucket mapping** (grounded in [`lib/scale-oracle.mjs`](../build-gap/lib/scale-oracle.mjs)):

| bucket | what it tests | quadrant | weight |
|---|---|---|---|
| `crosscut` (5D+2) | per-(surface×concern) tenancy/authz/mass-assignment; conflates ≥3 obligation classes | **lethal** (silent + expensive) | **1.0** |
| `integration` (3D) | membership seam + cross-org isolation (silent cross-tenant leak) | **lethal/seam** | **1.0** |
| `happy` (3D+1) | stated behaviour per surface (mostly test-caught, self-revealing) | silent-cheap | 0.1 |
| `wire` (4D+1) | modules link/import (won't-link throws → self-revealing) | cheap (build recovers free) | 0.0 |

- **Reliability (cost-weighted, the reported scalar)** `= Σ w_b·passfrac_b / Σ w_b` over the four buckets —
  the bucket analog of cost-weighted recall, used for the parity *report* and the Pareto cost-vs-reliability
  axis. **It is NOT the veto.**
- **Lethal veto (hard, PER-CELL — round-2 R2-1).** A candidate must satisfy `passes(candidate, cell) ≥
  passes(baseline, cell)` for **every** `crosscut` and `integration` cell (the per-cell pass-vector is on
  the mechanical insertion channel, constraint §2.3 — never shown to the mutator). A candidate that lifts
  `wire`/`happy` while dropping **any** lethal cell below the co-measured baseline is **rejected at archive
  insertion** (§4.4). This closes the rev.2 hole: a bucket *average* let a candidate pass *different* lethal
  cells than the baseline (e.g. break `authz@addMember` on one domain, "buy it back" with cheaper cells
  elsewhere) while leaving a specific silent-expensive obligation broken. Per-cell non-inferiority is the
  bucket form of "never average over the silent-expensive tail." (Note: this is **non-inferiority to the
  co-measured baseline, NOT an absolute 100% bar** — the baseline itself erodes at scale, MCOH25 X-CUT
  100→94→78→80%; holding a hybrid to a standard the all-frontier reference cannot meet would contradict the
  parity thesis, C5. We dominate the baseline cell-by-cell; we do not demand perfection. If a CORE epic has
  no `crosscut`/`integration` cells it is excluded from the veto, per finding A1 — and the population is
  stratified so this exclusion cannot be exploited, R2-1/L3-5.)
- **The load-bearing seam lives in `integration` (weight 1.0, inside the veto).** `happy@addMember` only
  asserts "a membership is added" (self-revealing, test-caught); the cross-surface membership seam is the
  `integration` cells. So the `happy` weight is **not load-bearing once the per-cell lethal veto is in
  force** (round-2 L3-4 absorbed).
- **EPIC✓** (all buckets 100%) remains a separate headline binary outcome, reported alongside.

**Cost (two-term Pareto, never scalarized).** `total_cost` = skeleton-author + retries + checker +
**every escalation** (model-priced ledger, §2.5) + judge. A CI test asserts an all-opus-escalation genome is
**strictly cost-dominated** against the **grounded** price table (finding A2; the table is validated against
a known metered run, §2.5). Cost is co-measured against the baseline per generation (#5). **Interim, the
baseline is the opus-whole proxy** (§2 / §13.3); **all interim cost-WIN claims are provisional and the final
cost-WIN is gated on the routed baseline workstream** (STATE.md #3). On the Phase-1 free gateway the cheap
*coding* term is ~$0 by design; a candidate may **not** claim a cost win purely from $0 free-riding — the
per-cell veto requires it to actually be reliable (which MCOH25 shows needs a non-cheap author → nonzero
cost), and the model-priced ledger charges its real frontier terms.
- **Amortization (round-2 R2-9).** Scored in the regime the candidate claims (skeleton reuse across M
  epics) — the direct attack on "hybrid loses at N=5." **Bounded:** pin a **max M** `[PIN AT FREEZE]`
  (recommended: M ≤ the CORE size), and **credit the amortized cost only if the claimed-M skeleton
  demonstrates per-cell lethal-veto parity on M *distinct* CORE epics** — otherwise the amortization is
  uncredited (a candidate cannot claim M=∞ to vanish its orchestration term).

**G2 — oracle validity (finding #2, blocking).** Every epic's ground truth instances one
`scale-oracle.mjs` template, so scaling multiplies *correlated* error, concentrated on the highest-weight
`crosscut`/`integration` cells. Before any battery number is trusted: (a) make the existing oracle self-test
([`tools/scale-oracle-selftest.mjs`](../build-gap/tools/scale-oracle-selftest.mjs), already a mutation test
that kills interface-drift / fragmented-guards / spurious-credit) a **pre-registered gate with a numeric
per-bucket kill-rate floor** `[PIN AT FREEZE]` (recommended: ≥0.90 on the lethal buckets) — a P0 gate
(round-2 R2-4/L4-3); and (b) **hand-author ≥2 independent oracles**. The 2nd oracle's independence is the
*only* thing that makes a re-coded grader genuinely independent (round-2 R2-4/L2-4) and "confirmed"-knowledge
promotion non-vacuous (§10) — it is **required before the first P2 "confirmed" promotion AND before P3 TEST
scoring**, not deferrable to "P3 only."

**Search-cost vs product-cost — strictly separate.** The search's own frontier spend (reflective mutation +
judge) is amortized R&D: **reported, never charged to a candidate's product cost.** Only a candidate's
*runtime* orchestration enters fitness.

**Judge variance (finding #6).** Pinning the judge model does not pin its output. Re-judge a held set;
report intra-model disagreement so judge noise is bounded, not assumed zero.

---

## 7. Decision rule and kill conditions (pre-registered)

Output: a Pareto front of hybrid candidates with the **co-measured all-frontier baseline** as the reference
point. **Interim that baseline is the admissible reliable proxy (opus-whole); the final cost-WIN is gated on
the cost-optimized routed baseline** (STATE.md #3) once that workstream delivers it (§13.3).

- **WIN** = a hybrid candidate that **dominates** the baseline: **per-cell lethal non-inferiority ≥
  baseline** (every lethal cell, §6) **and** cost-weighted reliability ≥ parity (non-inferiority test below)
  **and** `total_cost < baseline`, on the **sequestered TEST set**, **route-stable** (≥3 route-stratified
  re-draws + per-route CI, §2.4), stable across seeds, **at a stated N and amortization regime.** A WIN
  whose cost comparison is only against the interim opus-whole proxy is reported as **provisional**.
- **Parity is a test, not a glance (finding C5).** Pre-register parity as a **one-sided non-inferiority
  test** on the cost-weighted reliability (margin **δ**, level **α**), fixed before P1. `[PIN AT FREEZE]`
  (recommended: δ = 0.05, α = 0.05).
- **Scale-gate / mechanism (deliverables).** Report the smallest N (+ regime) where dominance appears
  (mixed model, §5, with the design-effect-adjusted CI, R2C-1). Ablate the load-bearing mutation: *does the
  per-surface checker lever flip a candidate from dominated → dominating, and at what N?*
- **Instrument-output reproducibility (round-2 R2C-4).** The reflective mutator is non-deterministic, so a
  one-trajectory result is suspect. Pre-register **≥2 independent end-to-end loop runs** (distinct mutator
  seeds); the **load-bearing-mutation identity and the scale-gate N must agree** before either is reported as
  a finding.
- **Freeze artifact (finding #4).** The freeze is a concrete **genome JSON + apparatus git SHA + route
  roster + pinned price table**, runnable outside the search loop; the confirmation is run through a
  **separately-implemented grader whose ground truth is an independent hand-authored oracle** (§6 G2) — not
  merely a re-coded runner over the same `scale-oracle.mjs`, which would inherit the same correlated bug
  (round-2 R2-4/L2-4).

**Kill conditions:**
- **K1** — no hybrid candidate reaches parity at ≤ cost at any tested N → report the best front + the gap (a
  useful lower bound; also the trigger to widen the gene pool, §11). **Not reportable until K8 passes.**
- **K2** — dominance only beyond realistic epic sizes with no amortization regime → scope shrinks.
- **K3** — the load-bearing mutation is the judge/grader or an oracle leak (prompt-scan hit on a mutated
  prompt **or a retrieved knowledge record**, §2.3 / §10) → void.
- **K4** — archive collapses to a single niche → diversity machinery failed; fix before trusting a winner.
- **K5** — eval-count exceeds the pre-registered budget (§5; **includes** P2 credit-attribution reversion
  evals, §3) → halt and re-scope. `[PIN AT FREEZE]` (recommended P1 cap: ~250 evals).
- **K6 (G2)** — oracle self-test kill-rate below the per-bucket floor, or the two hand-authored oracles
  disagree with the generator on lethal buckets → battery untrustworthy; fix the oracle first.
- **K7 (surrogate calibration — round-2 R2-8).** When the surrogate-scorer is on (P2+), periodically re-score
  a held sample with the true `evaluateEpic`; if surrogate rank-correlation (Spearman ρ) on the lethal
  buckets drops below threshold → halt and recalibrate. `[PIN AT FREEZE]` (recommended ρ ≥ 0.8).
- **K8 (instrument self-validation — round-2 R2C-3 / §13.4 RESOLVED).** If the loop fails to rediscover the
  hand-built **known-dominating** genome from the handicapped pool within the pre-registered generation
  budget (§9 P0/P1), the instrument is **untrusted**: no K1 null may be reported until this gate passes.
  `[PIN AT FREEZE]` (recommended budget: ≤ the P1 G cap).

---

## 8. Failure modes designed against

Overfitting (TRAIN/VAL/TEST, §5) · reward-hacking (Pareto + **per-cell** veto at insertion + pinned judge +
can't-read-oracle + quadrant-only digest) · cost-hiding via escalation (model-priced ledger + grounded CI
guard) · oracle garbage-in (G2/K6) · gateway lottery (route stratification + per-route CI) · non-stationarity
(frozen CORE + quantized recall-signature) · search-cost confound (reported separately) · collapse
(MAP-Elites, K4) · baseline drift (co-measured) · judge variance (measured) · **harness-error-as-pass**
(hard worst-of-K FAIL, never excluded, §4.5) · **credit mis-attribution** (skeleton-first + restore-margin
kill → typed-random, §3) · **surrogate divergence** (K7) · **capture-induced within-niche collapse** (§10
entropy kill) · **freezing a blank** (concrete `[PIN AT FREEZE]` values, §7) · **mid-run gene admission
breaking comparability** (clean-restart rule, §11) · **uninterpretable null** (instrument self-validation,
K8) · **the curation bottleneck as a silent cap** (finding #6 — promotion is human-curated; mechanize triage
so a human reviews only the Pareto front as a bounded queue, and log anything dropped — **off the live
loop's critical path, §14.3**) · **crash / hang / silent spin** (checkpoint-resume + watchdog, §14.1–14.2).

---

## 9. Phasing (pre-registered; Stage-0 gates the full run)

- **P0 — smoke + wiring + instrument self-validation.** 1 epic, 2 hand-built genomes. Proves genome →
  worker → scorecard → archive end-to-end **and validates the §6 per-cell metric + the G2 oracle gate
  (with its per-bucket kill-rate floor) are actually wired.** **Adds the hard K8 gate (round-2 R2C-3 / §13.4):
  a handicapped pool + one hand-built known-dominating genome; the loop must rediscover it within budget.**
  **Also validates the autonomy harness (§14): a checkpoint→kill→resume round-trip is deterministic and the
  watchdog halts-to-checkpoint on a planted hang.** No conclusions.
- **P1 — reflective search at fixed N=5 (flat Pareto, 2 anchor epics, no credit-attribution, no celled
  archive).** _**RESOLVED (2026-06-16, finding C4; `AMENDMENTS.md` A1):** P1 with an *opus-only*
  skeleton-author is cost-DOA (MCOH25: opus $0.395 vs $0.27 bar, flat orchestration). The live P1 is the
  **cheaper-author × checker arm** — can a sonnet/fusion author (~$0.092) + checker reach the per-cell
  lethal veto at a total below the bar? Pre-register that the opus-author arm is **expected to fail K1 at
  N=5** (so a null isn't reinterpreted as success), and frame P1's primary question as the **mechanism**
  (does the checker lever move `crosscut`/`integration` at fixed N=5)._ At P1 the attributed gene = the
  checker by construction (§3).
- **P2 — scale sweep + the deferred machinery.** Frozen-CORE-of-record assembled from **authored diverse
  templates** (§5); ≥10 independent epics per N-bucket; locate the scale-gate; test cross-epic amortization.
  **Now switch on:** celled MAP-Elites (§4.1), credit-attribution (skeleton-first, gated, §3), the
  surrogate-scorer (under K7), and knowledge-conditioning (§10, niching-gated + leak-scanned + collapse
  kill). The **2nd hand-authored oracle must exist before the first "confirmed" promotion.**
- **P3 — freeze & falsify.** Winner → genome JSON + SHA + route roster + price table → scored **once** on
  the sequestered TEST set (≥80 epics spanning the n_eff seam-topology floor) via the **independent-oracle
  grader**; reproducibility check (≥2 loop runs agree on the load-bearing mutation + scale-gate N); promote
  load-bearing mutations into [`PROPOSAL-HYBRID.md`](../../docs/PROPOSAL-HYBRID.md).

---

## 10. Capturing what we learn (knowledge capture)

Two knowledge streams must compound; both emit **OKF-conformant** records (mirroring the existing
[`okf/agentic-workflow-optimization/`](../../okf/agentic-workflow-optimization/) conventions: YAML
frontmatter with required `type`, `# Citations` footer, per-section `index.md`, a bundle `log.md`).

- **`okf/meta-search-learnings/`** (stream a — the agentic-workflow domain): which mutations help, dead-end
  genes, reward-hacks discovered, measured scale-gates, credit-assignment lessons. Frontmatter adds
  `status` (`speculative|confirmed|refuted`), `recurrence`, `provenance[]`, `gene`.
- **`okf/hybrid-builder-domain/`** (stream b — the product domain): lethal-bucket failure classes, seam
  patterns (e.g. the membership seam as a *reusable pattern*, not one instance), obligation classes, what
  makes a skeleton hold. Frontmatter adds `edge_class`, `obligation`.
- **`studies/meta-search/generation-log.jsonl` + `candidates/`** — the raw, append-only capture (one
  scorecard + quadrant digest per candidate); the by-design dumping ground. Curated **reference** bundles
  are never polluted with run output.

**The feedback loop — knowledge-conditioned reflective mutation (P2+, niching-gated), leak-hardened
(round-2 R2-6).** This repo has already proved an accumulate-and-reuse loop can *smuggle wrong assumptions
and edges* past a weak literal lint (the archetype-premise finding,
[`okf/agentic-workflow-optimization/findings/archetype-premise.md`](../../okf/agentic-workflow-optimization/findings/archetype-premise.md)).
So the retrieval is **structured-only**, not free-text: before proposing, the mutator builds a retrieval key
`{attributed_gene, failed_bucket, N_bucket}` and retrieves **top-k ≤ 5 confirmed** findings (frontmatter is
the index; rank by `recurrence` then recency), passing **only the structured fields `{gene, failed_bucket,
recurrence}` + a quadrant-only verdict** — **never** the free-text `description`/`# Scope` (which carries
semantic seam knowledge a frontier model reconstructs the seam from). `refuted` findings are passed as an
explicit don't-repeat list (structured-only). **Every retrieved record is run through the §2.3 oracle-token
scan** (a hit voids the candidate, K3), and a **paraphrase-leak audit** is pre-registered on a held set.
Conditioning is **only within a niche** (§4); and because within-niche conditioning shrinks within-niche
variance in a way K4 (single-cell collapse) cannot see, a **capture-specific collapse kill** is
pre-registered: measure within-niche genotype entropy with conditioning ON vs the knowledge-blind P1
baseline; if it drops below the blind band, **revert conditioning** (it is an optional enhancement, so
reverting is free).

**Anti-rot (promotion gate) — provenance defined mechanically (round-2 R2-4/L5-3).** Under a *single
generator*, "two seeds + a held-out epic" are **correlated repeats, not distinct provenance** — promoting on
them risks confirming a generator artifact (which then feeds the mutator above). So a **provenance class** is
defined mechanically as one of: a **distinct hand-authored oracle**, a **distinct seam-topology stratum**, or
the **sequestered TEST draw**. A record reaches `confirmed` only on recurrence across **≥2 distinct
provenance classes** so defined. Because the independent oracle is the only generator-independent axis
available before P3, **"confirmed" promotion is BLOCKED until the G2 ≥2 hand-authored oracles exist (tied to
K6).** Promotion is human-curated but **triaged mechanically** (auto-rank by Pareto contribution; human
reviews only the front — see the curation-cap failure mode, §8). Schema build is deferred to **after P1**.

_Open questions: an explicit `explains:` cross-link between a meta-finding and the product-finding that
mechanizes it; whether the novelty branch should stay knowledge-blind._

---

## 11. Where new nodes come from (node supply / research arm)

**The ceiling is real but non-binding now — stated honestly (round-2 R2-4/L5-4).** A search over the fixed
~8-gene set finds the best *combination* of known levers; it cannot *invent* a 9th. The honest claim is
**not** "the existing genes provably span the useful space" (MASS's "good topologies are rare" speaks to
search *difficulty*, not primitive *sufficiency*; CodeEvolve's "component interaction drives results" if
anything cuts the other way — an absent primitive can't be recovered by combining the eight). The honest
claim is: **the ceiling is non-binding only IF the two unbuilt on-thesis genes (escalation, checker) close
the gap MCOH25 isolated; if P1's checker arm fails K1, that failure IS the ceiling binding before K1**, and
triggers the research arm.

**Supply models.** (a) combinatorial search over fixed genes — what this spec does (interpretable,
anti-gaming, on-thesis); (b) open-ended ADAS/OpenEvolve code-level invention — uncaps the ceiling but
"maximally exposes reward-hacking" and violates cheapest-first/interpretable discipline → **banned from the
product, allowed only as a probe under K1**; (c) an external **research arm** (humans + the OKF methods
library + the repo's own failure traces) that proposes new typed genes.

**Recommendation: (a) as the engine + a thin, EVENT-DRIVEN research arm (c) + (b) banned.** The arm fires on
archive collapse/plateau (K4), K1, or a new method-card landing — not continuously. **Admission pipeline for
a new node:** proposal (one line: which failure-mode it addresses) → encode as a typed gene preserving
genome validity → **cheap P0-style smoke-test** → **anti-gaming vet** (judge untouched, can't-read-oracle,
escalation charged) → admit to the type system. **No mid-run admission (round-2 R2-10/L5-5):** adding a gene
changes the search space and silently breaks frozen-CORE comparability and the co-measured baseline, so a new
gene takes effect **only at a CLEAN RESTART** — a new frozen-CORE epoch logged as a **new pre-registered
run**, never an in-flight amendment to a live run. Every proposal is routed through the §8 bounded-queue
triage so the arm's human-throughput limit is visible, not hidden. GEPA-first by construction: a new node
only widens what reflective mutation may turn; it never changes the engine.

**Starter candidate nodes (not in §2), each with what it would test:** critic/debate node (cheap adversarial
second opinion vs escalation) · test-generation node (cheap per-surface tests catching silent misses the
checker can't) · spec/skeleton-repair node (repair the obligation contract mid-run — attacks the seam
failure directly) · plan-verification node (frontier checks the decomposition before any build) ·
retrieval/knowledge-injection node (amortization as a *node*, not just a regime) · multi-sample
self-consistency vote node (cheap redundancy vs escalation on the cost axis) · decomposition-granularity
controller (where the N≈9 break moves under cheap builders) · obligation-lens-ensemble decomposer (promote
the existing gene to a node) · **surrogate-scorer node** (AgentSquare-style in-context surrogate, ~0.025%
eval cost — the fix for the §5 compute blowup, switched on at P2 under K7; search-cost only, never
product-charged).

---

## 12. Reuse map

**~80% reuse.** `epic-run.mjs` + `lib/epic-sandbox.mjs` (worker harness + bucket scorer = the fitness),
`makeGatewayInvoke` (cheap supply, now route-stratified), `gen-skeleton.mjs` (skeleton-author node),
`gen-epic.mjs` + `lib/scale-oracle.mjs` (epic + oracle generator — now self-tested with a kill-rate floor,
G2), `tools/scale-oracle-selftest.mjs` (existing mutation test, upgraded with per-bucket kill-rate),
`runner/judge.mjs` (pinned grader),
[`okf/agentic-workflow-optimization/`](../../okf/agentic-workflow-optimization/) (GEPA method + node ideas).

**New.** Genome schema · eval-worker wrapper · **flat Pareto list (P1)** then MAP-Elites archive +
generation log (P2) · **per-cell veto + the split mechanical/digest channels** · **harness-failure
hard-fail handling** · the **model-priced escalation ledger** + grounded all-opus CI guard · the oracle
self-test **kill-rate floor** + the **2nd hand-authored oracle** · the **route-stratification + per-route-CI
wrapper** · the sequestered-TEST harness + **independent-oracle grader** + **power/n_eff analysis** · the
**instrument self-validation (planted-positive) harness (K8)** · counterfactual credit-attribution
(P2, skeleton-first) · reflective-mutation step · the surrogate-scorer (P2, K7) · the two OKF bundles (§10,
structured-only retrieval) · the **autonomy harness** (checkpoint/resume + watchdog + async curation queue,
§14) · and the two unbuilt genes (escalation policy, per-surface checker).

**Outside this instrument (separate workstream).** The **cost-optimized routed all-frontier baseline**
(STATE.md #3); interim comparison uses the opus-whole proxy (§2 / §13.3).

---

## 13. Resolved decisions (Tier-2)

Decisions 1–3 confirmed 2026-06-16 (rev.2 review); 4–5 confirmed 2026-06-16 (rev.3 review, research lead).
All logged in `AMENDMENTS.md`.

1. **P1 framing (§9, finding C4) — RESOLVED.** P1 = the cheaper-author × checker arm; the opus-author arm is
   pre-registered as expected-to-fail-K1-at-N=5; P1's primary question is the **mechanism** (does the checker
   lever move `crosscut`/`integration` at fixed N=5), not a cost-claim at N=5.
2. **Veto timing (§4.4, finding A4) — RESOLVED.** Lethal veto applied at **archive insertion** (rejects
   degenerate parents); the WIN-only alternative is rejected. _(rev.3: the veto is **per-cell**, R2-1.)_
3. **Cheap-mutator control arm (§0, finding B4) — RESOLVED.** **Optional** robustness check, not required for
   validity.
4. **Cost-optimized baseline scope (§2/§6/§7, round-2 R2-2) — RESOLVED.** The routed all-frontier baseline
   is an **external prerequisite workstream** (STATE.md #3), not built inside the instrument; **interim
   comparison uses the admissible reliable proxy (opus-whole)** and interim cost-WIN claims are
   **provisional**; the freeze gates the final cost-WIN on the routed baseline once it lands.
5. **Instrument self-validation (§0/§9, round-2 R2C-3) — RESOLVED.** A **hard P0/P1 planted-positive
   gate** (K8): the loop must rediscover a hand-built known-dominating genome within budget; **no K1 null is
   reportable until it passes.**

---

## 14. Operational autonomy — running unattended *within* the freeze

The instrument is meant to run long stretches without a babysitter, but the governing principle is
**run-until-a-guardrail-then-halt-and-notify, never run-past-one** — that is exactly how "runs unsupervised"
is reconciled with "won't deviate." Four operational mechanisms, all **freeze-COMPATIBLE** (they touch no
frozen invariant — genome, operators, per-cell fitness+weights, TEST-hash, parity δ/α — and are tuned/logged
via `AMENDMENTS.md`, not pinned at the freeze):

- **14.1 Checkpoint / resume (crash-safe).** The orchestrator already holds only the archive + generation
  log on disk (§1). Formalize it: every generation **atomically checkpoints** `{archive snapshot, RNG/seed
  state, eval-count + cost ledger, route distribution, budget spent, generation index}`. A resume reads the
  latest checkpoint and continues **deterministically** (seeds are logged, §5 worst-of-K). Workers are
  ephemeral and **idempotent** — a killed worker is re-dispatched, never half-counted. A crash costs at most
  one generation, not the run.
- **14.2 Watchdog / liveness.** A separate watchdog enforces the validity kills automatically (K4 collapse,
  K5 eval-budget, K7 surrogate drift, K8 instrument-validity) **and** adds two distinct **liveness** guards:
  a **per-candidate-eval timeout** (above the per-surface 15 s SIGKILL the sandbox already has) and a
  **per-generation wall-clock stall** guard. On any trip it **halts cleanly to a resumable checkpoint and
  emits a notification** — it never silently spins, and it never pushes past a guardrail.
- **14.3 Mechanized curation — the human gate is OFF the critical path (the §8 silent-cap fix).** The live
  loop runs entirely on **automatic** signals (per-cell veto, Pareto insertion, kill conditions) and
  **never blocks on a human verdict.** Knowledge promotion to `confirmed` (§10) stays human-curated, but
  **asynchronously**: the loop appends candidates to the bounded review queue and keeps going. Because
  knowledge-conditioning only ever *retrieves* `confirmed` records, an un-reviewed queue simply means the
  loop proceeds **knowledge-blind** (the safe default) — human curation shapes *future* runs' priors, never
  *this* run's progress. No human action can stall a run; no run waits on a human.
- **14.4 What an unattended run may conclude (the Phase boundary).** On the Phase-1 free gateway the cost
  axis is ~$0 / un-metered, so a long unattended run's **legitimate output is the MECHANISM + reliability
  front** (does the checker lever move `crosscut`/`integration`; does the loop close; K8 calibration) —
  **not** a cost-WIN, which is gated to Phase-2 owned hardware (§2 / §6 / §13.4). The cost-WIN guard makes
  this mechanical: an unattended Phase-1 run **cannot emit a cost-dominance claim**, only a provisional
  mechanism/reliability result.

**Out of scope by design (the won't-deviate guarantee).** No open-ended gene invention mid-run (clean-restart
only, §11 / R2-10); no self-modification of the engine, fitness, weights, judge, or oracle (frozen); no
*autonomous* promotion of knowledge to `confirmed` (human, but off the critical path, §14.3). Autonomy here
is **bounded running between guardrails, not open-ended adaptation.**

**P0 validates the autonomy harness** (§9): a checkpoint→kill→resume round-trip is deterministic, and the
watchdog trips + halts-to-checkpoint on a planted hang — proven before any long unattended P1/P2 run is
trusted.

---

_Pre-registration freeze (NOT YET TAKEN): the genome (§2), operators (§3 — **credit-assignment is a P2
mechanism, NOT in the frozen set**, round-2 R2-7), the battery/seed/split policy (§5), the **per-cell** bucket
fitness + **weights vector** + the **per-cell veto definition** (§6), the **TEST-set hash**, and the
decision rule incl. the **parity non-inferiority margin δ/α** (§7) are fixed before P1. **All `[PIN AT
FREEZE]` quantities (δ, α, K5 eval cap, K6 kill-rate floor, K7 ρ floor, K8 budget, amortization max-M,
credit-attribution restore-margin) must be set to concrete values at the freeze ceremony — a freeze of
unspecified values is void (round-2 R2C-2).** Changes to weights, the per-cell veto definition, the TEST
hash, or the parity test after P1 start **void** the run rather than amend it; all other changes are logged
in an append-only `studies/meta-search/AMENDMENTS.md` ledger with rationale. The five §13 decisions are
**RESOLVED**; the spec is **eligible for the pre-registration freeze** after a light re-check of the three
freeze-blocking edits (per-cell veto §6, the trimmed frozen set §7, the concrete `[PIN AT FREEZE]` values)._
