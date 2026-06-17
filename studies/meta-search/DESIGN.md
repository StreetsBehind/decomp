# Meta-search study — an instrument that searches builder-system configs to test the hybrid thesis

_Pre-registered design **rev.2, 2026-06-16**. Supersedes rev.1 after a two-round adversarial review (5
independent red-team lenses + a refute/adjudicate round + a completeness critic; findings consolidated
inline, severities and verdicts preserved). The framing survived; the **fitness was re-wired** (rev.1
pointed at a scorer the epic battery does not run — see §6/G1), and a cluster of pre-registration fixes
that are cheap now and near-impossible to retrofit were folded in. Read with the north-star
[`../../docs/PROPOSAL-HYBRID.md`](../../docs/PROPOSAL-HYBRID.md), the build-dispatch harness this wraps
([`../build-gap/DESIGN.md`](../build-gap/DESIGN.md) + [`epic-run.mjs`](../build-gap/epic-run.mjs) +
[`lib/epic-sandbox.mjs`](../build-gap/lib/epic-sandbox.mjs) + [`lib/scale-oracle.mjs`](../build-gap/lib/scale-oracle.mjs)),
the latest crux data ([`../build-gap/MCOH25-RESULTS.md`](../build-gap/MCOH25-RESULTS.md)), and the method
library ([`../../okf/agentic-workflow-optimization/`](../../okf/agentic-workflow-optimization/))._

> **Three Tier-2 reframes remain open for the research lead** — flagged inline as **`DECISION:`** and
> collected in §13. They are judgment calls, not defects.

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
| ready-bead selection | parent selection from the **MAP-Elites archive** (§4) |
| worktree per builder | isolated **eval sandbox** per candidate (frozen apparatus SHA) |
| `beads-builder` worker | **candidate-eval worker** — runs `epic-run.mjs` over the frozen CORE battery |
| in-worktree quality gate | per-candidate **scorecard** (bucket reliability + cost ledger + co-measured baseline) |
| `BUILD_COMPLETE` marker | **schema-bounded scorecard** (cost vec + bucket recall + EPIC✓ + route dist + trace digest) |
| serialized merge to main | serialized **archive insert** (niche cell, §4) |
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
| **escalation policy** *(currently MISSING — must be built)* | new | `→ sonnet \| → opus` | trigger condition, budget cap |
| judge | [`runner/judge.mjs`](../../runner/judge.mjs) | **pinned, NOT searchable** | — |

**Hard constraints in the type system (anti-gaming):**
1. **The judge is pinned** (sonnet/opus, never the free pool) — the search cannot game its own grader. Its
   *output* is still non-deterministic; budget its variance (§6, finding #6).
2. **The checker may never read the oracle** — authored only from the skeleton's typed obligation contract.
3. **The failure-trace digest is quadrant-and-count only** — never per-edge identifiers or seam names
   (finding A3). The reflective mutator is frontier and has seen many oracles; naming the exact broken seam
   in the digest is an oracle→trace→frontier→prompt leak. Every mutated prompt is mechanically scanned for
   oracle-token overlap; a hit voids the candidate (§7, K3).
4. **The gateway route is pinned/stratified per run** (finding #3). The cheap supply `jnoccio/jnoccio-fusion`
   routes to a gateway-selected upstream and only *records* it ([`runner/model-client.mjs`](../../runner/model-client.mjs)).
   Unpinned, fitness confounds genome quality with the upstream lottery and the frozen winner won't
   reproduce. Pin (or stratify over a fixed roster and report per-route); record the route distribution in
   the scorecard; the freeze gates on **route-stable** dominance.
5. **Cost is metered, escalation is ledgered.** Per-call `usd` already accrues
   (`epic-run.mjs` sums `g.usd`); the gap is an **escalation ledger** keyed on each node's model gene, so an
   opus escalation is never free (finding A2).

---

## 3. Mutations — the operators and the engine

**Operators** (each preserves genome validity): model-swap · toggle checker on/off · change K · set/move
the escalation trigger · add/remove a decomposer lens · adjust amortization regime · reflective prompt-edit.

**Engine — GEPA-first (reflective), ADAS deferred** (the method library prefers GEPA because ADAS "maximally
exposes reward-hacking"; [`okf/…/methods/adas.md`](../../okf/agentic-workflow-optimization/methods/adas.md)).

- **Reflective mutation (default).** The frontier model reads a candidate's **quadrant-and-count digest**
  (constraint 3) and proposes **one** targeted change.
- **Credit assignment (finding B1 — CRITICAL).** Many lethal failures are *emergent across nodes* (the
  `crosscut`/`integration` buckets are precisely the cross-surface obligations no single node owns; MCOH25
  showed the membership-seam fix was a *skeleton* clause, not a local node). A narrated digest cannot
  localize blame. So before the mutator proposes, run **mechanical node-attribution by counterfactual
  single-node reversion**: revert each node to a known-good gene; the node whose reversion most restores the
  `crosscut`/`integration` score is the attributed cause. Reflective mutation is then restricted to the
  attributed gene; if no single node localizes, the operator is **forced onto the skeleton** (the only node
  that can express cross-surface invariants).
- **Typed-random (small budget, ON from P1).** A small exploration budget runs from P1 — not "once
  reflective plateaus" — because the plateau detector is unreliable until the battery is frozen (finding B5).
- **Knowledge-conditioning** (§10) is a **P2+ enhancement, gated behind niching** (it accelerates collapse;
  finding B3 + the capture review's open-Q3).

---

## 4. Evolutions — the search loop (the dispatch)

Per generation, mirroring `/build-batch`:

1. **Select** parents from the **MAP-Elites archive** (finding B3 — the rev.1 "novelty term" was named but
   unspecified; collapse was the default). The archive is celled by a concrete **behavioral descriptor**:
   `(genotype-Hamming bucket, per-bucket-recall signature [wire/happy/crosscut/integration], cost bucket)`.
   An insert into an occupied cell is rejected unless it dominates the incumbent. This makes "no collapse"
   *measurable*, not aspirational (§7, K4).
2. **Mutate** via the credit-assignment-gated reflective engine (+ small typed-random) → K children.
3. **Dispatch** K candidate-evals as isolated workers (worktree isolation; they mutate apparatus files).
   Each worker runs its genome over the **frozen CORE battery** (§5) via `epic-run.mjs`, scores with the
   bucket reliability metric (§6) **and re-measures the all-frontier baseline on the same epics/seeds**
   (finding #5 — the baseline is co-measured per generation, never a stored constant). Returns only the
   schema-bounded scorecard.
4. **Insert** survivors into the archive over **(cost, reliability)**, never scalarized — and apply the
   **lethal veto at insertion**, not only at WIN (finding A4: otherwise a degenerate low-cost corner
   survives as a parent and steers reflection toward cheap-but-useless designs). _**RESOLVED
   (2026-06-16):** veto-at-insertion is the chosen default; the WIN-only alternative is rejected (it admits
   degenerate parents). See `AMENDMENTS.md` A2._
5. **Loop-until-dry.** Stop when the front fails to advance on the **fixed CORE** for **G** generations, or
   the **pre-registered eval-count budget** exhausts (finding B2 — see §5). Silent caps are logged.

---

## 5. The battery, seeds, and splits (unified policy)

This section resolves findings A5 + B5 + C1 + C2 + C3 + B2 into **one** coherent policy. The rev.1 spec
left the battery as a "rotating held-out" set — which simultaneously caused cherry-picking, cross-generation
leakage, non-stationary (non-comparable) Pareto fronts, and a circular freeze-and-retest.

- **Epic population (finding C2 — CRITICAL).** Today's evidence base (workspace + the `scale-d1..d4` ladder)
  is **size-variants of one epic** — near-zero degrees of freedom. Define the target population via the epic
  generator ([`gen-epic.mjs`](../build-gap/gen-epic.mjs)): vary domain, surface count, obligation classes,
  and seam topology. Sample **independent** epics from it, stratified by surface-count and seam-type.
- **CORE battery (frozen, in-loop).** ~8–12 *independent* epics, **≥10 per N-bucket** for the scale-gate
  model (finding C3). Used for **all** selection / archive / stop-rule decisions. Frozen for the whole run →
  fitness is comparable across generations (finding B5).
- **K-run aggregation = worst-of-K** (finding A5) for both cost and reliability, over logged seeds; elites
  are **re-evaluated** (or carry exact scores) each generation on the same CORE. No best-seed cherry-pick.
- **TRAIN / VAL split inside CORE** — TRAIN drives mutation feedback, VAL drives archive selection + early
  stop.
- **Sequestered TEST set (finding C1 — CRITICAL).** A large, **independent** hold-out (**≥80 epics**),
  hash-gated and physically inaccessible to workers, **scored exactly once at P3** on the frozen winner.
  Any second look **voids** it. Dominance on TEST is reported with a **bootstrap CI across epics**, and the
  scale-gate is attributed to N via a mixed model `cost-gap ~ N + (1|epic)` (finding C3). "Rotation" is
  demoted from an in-loop mechanism to *this one-time TEST draw*.
- **Compute budget (finding B2 — CRITICAL).** Do **not** cross-product P×G×K×N-sweep×battery. P1 runs tiny
  (e.g. P≤6, G≤6, K=2, N=5, 2 anchor epics ≈ ~150 evals) purely to confirm the loop closes and the checker
  lever moves the front. The full N-sweep × high-K × TEST runs **only on the frozen winner**. The
  **surrogate-scorer node** (§11; AgentSquare-style, ~0.025% eval cost) cuts in-loop dispatch cost.
  Pre-register an **eval-count kill** (§7, K5).

---

## 6. Fitness — the non-gameable crux (re-wired to the bucket scorer)

**G1 (the rev.1 foundational bug, verified).** rev.1 anchored fitness on
[`eval/generative-coverage.mjs`](../../eval/generative-coverage.mjs) (`costWeightedEdgeRecall`,
quadrant-tagged manifest, `lethalRecall` veto). That scorer is imported only by the `runner/battery.mjs`
"hearth" lineage — **never by `studies/build-gap/`** — and `costWeightedEdgeRecall` returns `undefined` on
an untagged manifest (line 101); the epics carry no `quadrant` tags. The epic battery grades with
`evaluateEpic` → `{wire, happy, crosscut, integration}`. **Resolution (chosen): define the lethal veto and
cost-weighting over the buckets the harness already produces.**

**The quadrant↔bucket mapping** (grounded in [`lib/scale-oracle.mjs`](../build-gap/lib/scale-oracle.mjs)):

| bucket | what it tests | quadrant | weight |
|---|---|---|---|
| `crosscut` (5D+2) | per-(surface×concern) tenancy/authz/mass-assignment; pass-fraction = uniformity | **lethal** (silent + expensive) | **1.0** |
| `integration` (3D) | membership seam + cross-org isolation (silent cross-tenant leak) | **lethal/seam** | **1.0** |
| `happy` (3D+1) | stated behaviour per surface (mostly test-caught) | silent-cheap | 0.1 |
| `wire` (4D+1) | modules link/import (won't-link throws → self-revealing) | cheap (build recovers free) | 0.0 |

- **Reliability (cost-weighted)** `= Σ w_b·passfrac_b / Σ w_b` over the four buckets — the bucket analog of
  cost-weighted recall. Concentrates the score on `crosscut`+`integration`, exactly the lethal column.
- **Lethal veto (hard)** `= min(crosscut_passfrac, integration_passfrac)`; a candidate must hold this **≥
  the co-measured frontier baseline**, and a candidate that lifts `wire`/`happy` while dropping it is
  **rejected at archive insertion** (§4.4). This is the bucket form of "never average over the
  silent-expensive tail." (Note: unlike the rev.1 scalar, this veto has no zero-edge degeneracy — but if a
  CORE epic happens to have no `crosscut`/`integration` tests, it is excluded from the veto, per finding A1.)
- **EPIC✓** (all buckets 100%) remains a separate headline binary outcome, reported alongside.

**Cost (two-term Pareto, never scalarized).** `total_cost` = skeleton-author + retries + checker +
**every escalation** (ledgered per node's model gene, §2.5) + judge. A CI test asserts an
all-opus-escalation genome is **strictly cost-dominated** (finding A2). Cost is co-measured against the
baseline per generation (#5). **Amortization** is scored in the regime the candidate claims (skeleton reuse
across M epics) — the direct attack on "hybrid loses at N=5."

**G2 — oracle validity (finding #2, blocking).** Every epic's ground truth instances one
`scale-oracle.mjs` template, so scaling multiplies *correlated* error, concentrated on the highest-weight
`crosscut`/`integration` assertions. Before any battery number is trusted: make
`tools/scale-oracle-selftest.mjs` a **pre-registered mutation-test gate** (report kill-rate per bucket),
and **hand-author ≥2 independent oracles** to cross-check the generator.

**Search-cost vs product-cost — strictly separate.** The search's own frontier spend (reflective mutation +
judge) is amortized R&D: **reported, never charged to a candidate's product cost.** Only a candidate's
*runtime* orchestration enters fitness.

**Judge variance (finding #6).** Pinning the judge model does not pin its output. Re-judge a held set;
report intra-model disagreement so judge noise is bounded, not assumed zero.

---

## 7. Decision rule and kill conditions (pre-registered)

Output: a Pareto front of hybrid candidates with the **co-measured, cost-optimized all-frontier baseline**
as the reference point (routes haiku/sonnet for easy work, opus for hard — no strawman).

- **WIN** = a hybrid candidate that **dominates** all-frontier: lethal-veto ≥ baseline (non-inferiority,
  below) **and** cost-weighted reliability ≥ parity **and** `total_cost < baseline`, on the **sequestered
  TEST set**, **route-stable**, stable across seeds, **at a stated N and amortization regime.**
- **Parity is a test, not a glance (finding C5).** Pre-register parity as a **one-sided non-inferiority
  test** on the lethal veto (margin δ, level α), fixed before P1.
- **Scale-gate / mechanism (deliverables).** Report the smallest N (+ regime) where dominance appears
  (mixed model, §5). Ablate the load-bearing mutation: *does the per-surface checker lever flip a candidate
  from dominated → dominating, and at what N?*
- **Freeze artifact (finding #4).** The freeze is a concrete **genome JSON + apparatus git SHA + pinned
  routes**, runnable outside the search loop; the confirmation is run through a **separately-implemented
  grader/runner** so a shared apparatus bug cannot pass both search and confirmation.

**Kill conditions:**
- **K1** — no hybrid candidate reaches parity at ≤ cost at any tested N → report the best front + the gap
  (a useful lower bound; also the trigger to widen the gene pool, §11).
- **K2** — dominance only beyond realistic epic sizes with no amortization regime → scope shrinks.
- **K3** — the load-bearing mutation is the judge/grader or an oracle leak (prompt-scan hit, §2.3) → void.
- **K4** — archive collapses to a single niche → diversity machinery failed; fix before trusting a winner.
- **K5** — eval-count exceeds the pre-registered budget (§5) → halt and re-scope.
- **K6 (G2)** — oracle self-test kill-rate below threshold, or the two hand-authored oracles disagree with
  the generator on lethal buckets → battery untrustworthy; fix the oracle first.

---

## 8. Failure modes designed against

Overfitting (TRAIN/VAL/TEST, §5) · reward-hacking (Pareto + bucket veto at insertion + pinned judge +
can't-read-oracle + quadrant-only digest) · cost-hiding via escalation (ledger + CI guard) · oracle
garbage-in (G2/K6) · gateway lottery (route pinning) · non-stationarity (frozen CORE) · search-cost
confound (reported separately) · collapse (MAP-Elites, K4) · baseline drift (co-measured) · judge variance
(measured) · **the curation bottleneck as a silent cap** (finding #6 — promotion is human-curated; mechanize
triage so a human reviews only the Pareto front as a bounded queue, and log anything dropped).

---

## 9. Phasing (pre-registered; Stage-0 gates the full run)

- **P0 — smoke + wiring.** 1 epic, 2 hand-built genomes. Proves genome → worker → scorecard → archive
  end-to-end **and validates the G1 bucket metric + the G2 oracle gate are actually wired**. No conclusions.
- **P1 — reflective search at fixed N=5.** _**RESOLVED (2026-06-16, finding C4 — confirmed as recommended; `AMENDMENTS.md` A1):** P1 with an *opus-only*
  skeleton-author is cost-DOA (MCOH25: opus $0.395 vs $0.27 bar, flat orchestration). The live P1 is the
  **cheaper-author × checker arm** — can a sonnet/fusion author (~$0.092) + checker reach the lethal veto
  at a total below the bar? Pre-register that the opus-author arm is **expected to fail K1 at N=5** (so a
  null isn't reinterpreted as success), and frame P1's primary question as the **mechanism** (does the
  checker lever move `crosscut`/`integration` at fixed N=5)._
- **P2 — scale sweep.** Frozen winner across N ∈ {5, 9, 13, …}, ≥10 independent epics per N-bucket; locate
  the scale-gate; test cross-epic amortization. Knowledge-conditioning (§10) may switch on here, niching-gated.
- **P3 — freeze & falsify.** Winner → genome JSON + SHA + routes → scored **once** on the sequestered TEST
  set via the independent grader; promote load-bearing mutations into
  [`PROPOSAL-HYBRID.md`](../../docs/PROPOSAL-HYBRID.md).

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

**The feedback loop — knowledge-conditioned reflective mutation (P2+, niching-gated).** Before proposing,
the mutator builds a retrieval key `{attributed_gene, failed_bucket, N_bucket}` and retrieves **top-k ≤ 5
confirmed** findings (frontmatter is the index; rank by `recurrence` then recency), passing **only
`title + description + the # Scope/kill section`** — bounded retrieval, never a dump. `refuted` findings are
retrieved as an explicit don't-repeat list. This is conditioned **only within a niche** (§4) so it cannot
defeat the diversity machinery (the collapse risk, finding B3 + open-Q3).

**Anti-rot (promotion gate).** A record reaches `confirmed` only on **recurrence across ≥2 distinct
provenance classes** (e.g. two seeds *and* a held-out epic — correlated same-genome repeats don't count),
per the repo's source-diversity recurrence discipline. Promotion is human-curated but **triaged
mechanically** (auto-rank by Pareto contribution; human reviews only the front — see the curation-cap
failure mode, §8). Schema build is deferred to **after P1**.

_Open questions: an explicit `explains:` cross-link between a meta-finding and the product-finding that
mechanizes it; the provenance unit under a generated population ("distinct epic-family"); whether the
novelty branch should stay knowledge-blind._

---

## 11. Where new nodes come from (node supply / research arm)

**The ceiling is real but non-binding now.** A search over the fixed ~8-gene set finds the best
*combination* of known levers; it cannot *invent* a 9th. But the thesis win is **structural** — MCOH25
already isolated where it must come from (checker × scale/amortization); MASS finds good topologies are rare
(so the existing genes likely span the useful space); CodeEvolve finds *component interaction*, not any
single operator, drives results; and the genome still has **unbuilt** levers (escalation, checker). The
ceiling becomes binding **only at K1**.

**Supply models.** (a) combinatorial search over fixed genes — what this spec does (interpretable,
anti-gaming, on-thesis); (b) open-ended ADAS/OpenEvolve code-level invention — uncaps the ceiling but
"maximally exposes reward-hacking" and violates cheapest-first/interpretable discipline → **banned from the
product, allowed only as a probe under K1**; (c) an external **research arm** (humans + the OKF methods
library + the repo's own failure traces) that proposes new typed genes.

**Recommendation: (a) as the engine + a thin, EVENT-DRIVEN research arm (c) + (b) banned.** The arm fires on
archive collapse/plateau (K4), K1, or a new method-card landing — not continuously. **Admission pipeline for
a new node:** proposal (one line: which failure-mode it addresses) → encode as a typed gene preserving
genome validity → **cheap P0-style smoke-test** → **anti-gaming vet** (judge untouched, can't-read-oracle,
escalation charged) → admit to the type system, **logged as a pre-registration amendment**. GEPA-first by
construction: a new node only widens what reflective mutation may turn; it never changes the engine.

**Starter candidate nodes (not in §2), each with what it would test:** critic/debate node (cheap adversarial
second opinion vs escalation) · test-generation node (cheap per-surface tests catching silent misses the
checker can't) · spec/skeleton-repair node (repair the obligation contract mid-run — attacks the seam
failure directly) · plan-verification node (frontier checks the decomposition before any build) ·
retrieval/knowledge-injection node (amortization as a *node*, not just a regime) · multi-sample
self-consistency vote node (cheap redundancy vs escalation on the cost axis) · decomposition-granularity
controller (where the N≈9 break moves under cheap builders) · obligation-lens-ensemble decomposer (promote
the existing gene to a node) · **surrogate-scorer node** (AgentSquare-style in-context surrogate, ~0.025%
eval cost — the fix for the §5 compute blowup; search-cost only, never product-charged).

---

## 12. Reuse map

**~80% reuse.** `epic-run.mjs` + `lib/epic-sandbox.mjs` (worker harness + bucket scorer = the fitness),
`makeGatewayInvoke` (cheap supply, now route-pinned), `gen-skeleton.mjs` (skeleton-author node),
`gen-epic.mjs` + `lib/scale-oracle.mjs` (epic + oracle generator — now self-tested, G2),
`runner/judge.mjs` (pinned grader),
[`okf/agentic-workflow-optimization/`](../../okf/agentic-workflow-optimization/) (GEPA method + node ideas).

**New.** Genome schema · eval-worker wrapper · MAP-Elites archive + generation log · counterfactual
credit-attribution step · reflective-mutation step · the escalation ledger + all-opus CI guard · the
oracle self-test gate · the route-pinning wrapper · the sequestered-TEST harness + independent grader · the
two OKF bundles (§10) · and the two unbuilt genes (escalation policy, per-surface checker).

---

## 13. Resolved decisions (Tier-2) — confirmed 2026-06-16

All three confirmed as recommended (research lead, 2026-06-16); logged in `AMENDMENTS.md`.

1. **P1 framing (§9, finding C4) — RESOLVED.** P1 = the cheaper-author × checker arm; the opus-author arm is
   pre-registered as expected-to-fail-K1-at-N=5; P1's primary question is the **mechanism** (does the checker
   lever move `crosscut`/`integration` at fixed N=5), not a cost-claim at N=5.
2. **Veto timing (§4.4, finding A4) — RESOLVED.** Lethal veto applied at **archive insertion** (rejects
   degenerate parents); the WIN-only alternative is rejected.
3. **Cheap-mutator control arm (§0, finding B4) — RESOLVED.** **Optional** robustness check, not required for
   validity.

---

_Pre-registration freeze: the genome (§2), operators + credit-assignment (§3), the battery/seed/split policy
(§5), the bucket fitness + **weights vector** (§6), the **TEST-set hash**, and the decision rule incl. the
**parity non-inferiority margin δ/α** (§7) are fixed before P1. Changes to weights, the TEST hash, or the
parity test after P1 start **void** the run rather than amend it; all other changes are logged in an
append-only `studies/meta-search/AMENDMENTS.md` ledger with rationale. The three §13 decisions are
**RESOLVED** (2026-06-16; `AMENDMENTS.md`); the spec is **eligible for the pre-registration freeze**, which
is taken after the next adversarial review of rev.2 (`NEXT-REVIEW.md`)._
