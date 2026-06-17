# Meta-search — pre-registration freeze record

> **FROZEN 2026-06-17.** This is the immutable pre-registration artifact for the meta-search instrument
> ([`DESIGN.md`](DESIGN.md) rev.3). It pins, by content hash and by value, everything the decision rule
> depends on, *before* the P1 search runs. After **P1 start**, any change to the weights vector, the
> per-cell veto definition, the parity test (δ/α), or the committed TEST-set hash **voids the run** rather
> than amends it. Pre-P1 amendments are still allowed and are logged in [`AMENDMENTS.md`](AMENDMENTS.md).
>
> Taken after the rev.3 **freeze-readiness re-check** returned **GO-WITH-FIXES**; all three fixes were
> applied before this freeze (TEST-hash staged; anchor pair named + hashed; K8 budget and amortization
> max-M pinned to explicit numbers). Review history: [`REVIEW-LOG.md`](REVIEW-LOG.md).

---

## 1. Content pins (apparatus + anchor epics)

Git tree object hashes (content-addressed; stable independent of later doc commits):

| Artifact | path | git tree hash |
|---|---|---|
| Apparatus (build-dispatch harness this wraps) | `studies/build-gap/` | `1580944116743dce55e42c2ffb77341c258d9e65` |
| P1 anchor epic #1 | `studies/build-gap/epics/workspace/` | `e568b06fc2dc7a84e36e87f3f8ca241ab2694b96` |
| P1 anchor epic #2 | `studies/build-gap/epics/scale-d1/` | `4793d89d2992cb52d10bb61538903a9c6c842e20` |

Spec frozen as of the freeze commit (the commit that adds this file). The apparatus/epic tree hashes above
are the authoritative content pins; the commit SHA is convenience only.

**P1 frozen CORE = the anchor pair `{workspace, scale-d1}`.** Both N=5, identical EXPECTS surface set
(`createProject, listProjects, addMember, postComment, updateProfile`). They are **one seam-topology in two
skeleton-provenance variants — NOT epic diversity.** The pair is adequate for P1 (loop-closure + the checker
mechanism at fixed N=5) and must never be cited as external validity. Selection mechanism: `epic-run.mjs
--epic <name>` loads `epics/<name>/{preamble.md, skeleton.md, surfaces/*, tests.mjs}`; `tests.mjs` EXPECTS is
the single source of truth for the surface set/order.

## 2. Frozen invariants (changing these after P1 start voids the run)

- **Genome** (§2): the typed agent-graph node set + gene domains; the judge is pinned/non-searchable; the
  two-channel rule (per-cell pass-vector at insertion; quadrant-and-count-only mutator digest).
- **Operators** (§3): model-swap · toggle checker · change K · set/move escalation trigger · add/remove
  decomposer lens · adjust amortization regime · reflective prompt-edit · typed-random.
  **Credit-assignment is explicitly NOT a frozen invariant** — it is a P2 mechanism (round-2 R2-7).
- **Battery / seed / split policy** (§5): frozen CORE = the anchor pair at P1; worst-of-K aggregation over
  logged seeds; TRAIN/VAL inside CORE; harness-failure → hard worst-of-K FAIL (never excluded).
- **Fitness** (§6): the **per-cell** bucket scorer + the **weights vector** + the **per-cell
  non-inferiority lethal veto** (dominate the co-measured baseline cell-by-cell on every `crosscut`/
  `integration` cell; non-inferiority, NOT an absolute bar).
- **Decision rule** (§7): WIN = per-cell lethal non-inferiority ≥ baseline ∧ cost-weighted reliability
  parity (non-inferiority test) ∧ `total_cost < baseline`, on the sequestered TEST, route-stable, at a
  stated N + amortization regime. Interim cost comparison = the opus-whole proxy → provisional.

## 3. Pinned values (formerly `[PIN AT FREEZE]`)

| Quantity | FROZEN value | §/kill |
|---|---|---|
| Parity non-inferiority margin **δ** | **0.05** | §7 |
| Parity test level **α** (one-sided) | **0.05** | §7 |
| Fitness **weights vector** `(crosscut, integration, happy, wire)` | **(1.0, 1.0, 0.1, 0.0)** | §6 |
| Lethal veto | **per-cell non-inferiority** vs co-measured baseline on every `crosscut`/`integration` cell | §6/§4.4 |
| **K5** P1 eval-count cap | **250** | §7 |
| **K6** oracle self-test kill-rate floor (lethal buckets) | **0.90** | §6/§7 |
| **K7** surrogate–true-scorer Spearman ρ floor (lethal buckets) | **0.80** | §7 |
| **K8** instrument self-validation budget (standalone) | **≤ 8 generations AND ≤ 300 evals** | §7 |
| Amortization **max-M** | **12** (P2 quantity; M_distinct=1 at P1 → uncredited at P1 by construction) | §6 |
| Credit-attribution restore-margin | **2× worst-of-K standard error** on the bucket (a rule) | §3 |

## 4. STAGED — the TEST-set hash (policy frozen now, hash committed pre-P3)

The sequestered ≥80-epic TEST set **cannot exist at freeze time**: `gen-epic.mjs` over `lib/scale-oracle.mjs`
emits only D-count size-variants of one 5-lexical-clone template (zero seam-topology degrees of freedom;
round-2 R2-7). So the **TEST POLICY is frozen now** — ≥80 epics, an `n_eff` distinct-seam-topology floor,
scored **exactly once** at P3, design-effect-adjusted bootstrap CI, mixed model `cost-gap ~ N + (1|epic)`,
physically sequestered from workers. The **TEST-set content HASH is committed as a pre-registered amendment
in `AMENDMENTS.md` when the TEST set is authored (pre-P3)** and is void-on-change from that point. This
preserves the integrity the void-rule defends (no peek-then-redraw): the policy is locked pre-P1; the hash is
locked before the set is ever scored.

## 5. NOT frozen (operational / P2+ machinery — tunable, logged as amendments)

- **§14 operational autonomy** — checkpoint/resume, watchdog, mechanized off-path curation, the
  Phase-1-mechanism-only boundary. Freeze-compatible; tuned and logged, not pinned.
- **P2+ mechanisms** — counterfactual credit-attribution, the celled MAP-Elites archive, the
  surrogate-scorer, knowledge-conditioning, the escalation-policy gene, the diverse epic-template authoring,
  and the cost-optimized routed all-frontier baseline (the external workstream, STATE.md #3).

## 6. Open pre-P1 choice (deliberately defaulted, freely amendable until P1 starts)

**The 2nd P1 anchor epic** was defaulted to `scale-d1` (→ anchor pair = one seam-topology, two
skeleton-provenance variants) because P1 is **fixed-N by design** and the scale sweep is P2; adding a second
N-point at P1 would blur the P1/P2 boundary. A research lead who prefers a second N-point at P1 may swap the
second anchor for a `scale-d{2,4}` variant via a pre-P1 amendment.

---

## 7. Next: P0

P0 (no conclusions) proves genome → worker → scorecard → archive end-to-end and validates: the §6 per-cell
metric is wired; the G2 oracle gate fires (per-bucket kill-rate ≥ 0.90); the K8 planted-positive
instrument-validation passes (loop rediscovers a hand-built known-dominating genome within ≤ 8 gen / ≤ 300
evals); and the §14 autonomy harness round-trips (checkpoint→kill→resume is deterministic; the watchdog
halts-to-checkpoint on a planted hang).
