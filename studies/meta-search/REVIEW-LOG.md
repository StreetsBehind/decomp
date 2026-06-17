# Meta-search — adversarial review log

_Records the adversarial review of `DESIGN.md` **rev.1** (2026-06-16). Purpose: let a fresh session
**verify rev.2's fixes** instead of re-finding the problems, and **not re-raise the two downgraded
findings** as if new. The next review targets **rev.2** — see [`NEXT-REVIEW.md`](NEXT-REVIEW.md)._

**Method.** Round 1 = 5 independent red-team lenses (A fitness/reward-hacking · B search-dynamics ·
C methodology/falsifiability · D knowledge-capture design · E node-supply). Round 2 = a refute/adjudicate
pass + a completeness critic (gaps G/#). Load-bearing code findings were verified directly.

---

## Ground truth established (verified against the code — rely on these, don't re-derive)

- **Two parallel, UNCONNECTED scorers exist in the repo.** `eval/generative-coverage.mjs`
  (`costWeightedEdgeRecall` + `lethalRecall` veto, quadrant-weighted) is imported **only** by the
  `runner/battery.mjs` "hearth" lineage; it returns `undefined` on an untagged manifest (L101) and
  `lethalRecall` returns `1` when there are zero lethal edges (L120). The **epic battery** grades via
  `studies/build-gap/epic-run.mjs` → `lib/epic-sandbox.mjs` `evaluateEpic`, returning
  `{wire, happy, crosscut, integration}` (or `{harnessError|timeout|empty}`). **The epics carry no
  `quadrant` tags.** This is the G1 disconnect.
- **Bucket meanings** (`lib/scale-oracle.mjs`): `wire` (4D+1, modules link) · `happy` (3D+1, stated
  behaviour) · `crosscut` (5D+2, per-(surface×concern) tenancy/authz/mass-assignment; pass-fraction =
  uniformity) · `integration` (3D, membership seam + cross-org isolation).
- **Cost is metered** (`epic-run.mjs` sums per-call `g.usd`), but the cheap gateway returns `usd:0` and
  there is no escalation ledger.
- **Gateway route is recorded, not pinned** (`runner/model-client.mjs` ~L446) — `jnoccio/jnoccio-fusion`
  selects an upstream per call.

---

## Master findings table

Verdict legend: **CONF** confirmed · **OVER** overstated/narrowed · **DOWN** downgraded · **GAP** found by
completeness critic. "Addressed" = where rev.2 handles it.

| ID | Lens | Sev | Verdict | Addressed in rev.2 |
|---|---|---|---|---|
| **G1** | completeness #1 | **blocking** | CONF (verified) | §6 — fitness re-wired to the bucket scorer; quadrant↔bucket map |
| **G2** | completeness #2 | **blocking** | CONF | §6 oracle-validity gate + §7 K6 (oracle self-test + ≥2 hand-authored oracles) |
| A1 | fitness | high | CONF (L120) | §6 — bucket veto has no zero-edge degeneracy; zero-bucket epics excluded |
| A2 | fitness | high | OVER (metering exists) | §2.5 escalation ledger + §6 all-opus cost-domination CI guard |
| A3 | fitness | high | CONF | §2.3 quadrant-and-count-only digest + prompt-scan; §7 K3 |
| A4 | fitness | med | OVER (veto helps; timing is the gap) | §4.4 veto-at-insertion (RESOLVED) |
| A5 | fitness | med | CONF | §5 worst-of-K + frozen CORE + sequestered TEST |
| B1 | search | **crit** | CONF | §3 counterfactual single-node credit-attribution; else force onto skeleton |
| B2 | search | **crit** | CONF | §5 no cross-product + tiny P1 + surrogate-scorer; §7 K5 eval-count kill |
| B3 | search | high | CONF | §4.1 MAP-Elites niching + concrete descriptor |
| B4 | search | high | **DOWN** | §0 thesis-scope + human-reproducible winner; control arm **optional** (§13.3) |
| B5 | search | med-high | CONF | §5 frozen CORE; §3 typed-random ON from P1 |
| C1 | methodology | **crit** | CONF | §5 TRAIN/VAL/TEST, sequestered hash-gated TEST scored once; §7 freeze via separate grader |
| C2 | methodology | **crit** | CONF | §5 epic-population definition; ≥80 independent TEST; bootstrap CI |
| C3 | methodology | high | CONF | §5 ≥10 independent epics/N-bucket; mixed model `cost-gap ~ N + (1|epic)` |
| C4 | methodology | high | **DOWN** | §9 P1 reframe (RESOLVED): cheaper-author × checker arm; opus arm expected-fail |
| C5 | methodology | med-high | CONF | §7 parity non-inferiority test; frozen weights + TEST-hash; freeze line void-on-change; AMENDMENTS.md |
| #3 | completeness | high | CONF | §2.4 gateway route pinning/stratification; route-stable freeze |
| #4 | completeness | high | CONF | §7 freeze artifact (genome JSON + SHA + routes) run through a separate grader |
| #5 | completeness | med | CONF | §4.3 / §6 baseline co-measured per generation |
| #6 | completeness | med | CONF | §6 judge-variance budget; §8 mechanized curation triage (anti silent-cap) |
| D | capture | — | proposal | §10 (two OKF bundles + raw log + niching-gated knowledge-conditioning) |
| E | node-supply | — | analysis | §11 (ceiling non-binding till K1; engine + event-driven research arm; ADAS banned) |

**Every confirmed finding maps to a rev.2 section.** That mapping is the next review's *verify-adequacy*
checklist (not a re-find list).

---

## Two findings DOWNGRADED on cross-examination — do NOT re-raise as new

- **C4 "P1 dead on arrival" → softened.** DOA only with an *opus-only* author. The checker gene exists
  precisely to make a *sonnet* author (~$0.092) + checker clear the veto below the $0.27 bar → a cost-win is
  **live at N=5**. rev.2 reframes P1 around the cheaper-author × checker arm and pre-registers the opus arm
  as expected-to-fail-K1.
- **B4 "frontier-mutator confound" → nice-to-have, not a validity hole.** The thesis claims cheap *runtime
  coding*, not cheap *system design*; a frontier mutator is amortized one-time R&D, fine **provided the
  frozen winner is a static, human-reproducible config**. The cheap-mutator control arm is optional.

---

## Three cross-cutting reconciliations (now baked into rev.2)

1. **Validity (≥80 epics) vs compute (astronomical):** tiered battery — small frozen in-loop **CORE** +
   large sequestered **TEST** scored once + **surrogate-scorer** to cut in-loop cost (§5).
2. **Knowledge-conditioning vs collapse:** diversity is structurally prior — MAP-Elites first, condition
   only *within a niche*, gated to P2+ (§4 + §10).
3. **One battery/seed policy:** frozen CORE for all loop decisions · worst-of-K · TRAIN/VAL inside CORE ·
   sequestered TEST once; "rotation" demoted to the one-time TEST draw (§5).

---

---

# rev.2 review (2026-06-16) — round 2 of the log

_Second adversarial review, targeting **rev.2**. Method: 6 independent blind lenses (1 fix-adequacy ·
2 new-machinery red-team · 3 bucket-metric soundness · 4 buildability/YAGNI · 5 capture+node-supply ·
6 fresh completeness) → a refute/adjudicate round (merged 21 raw findings into 10 canonical, killed/
downgraded the weak ones) → a fresh completeness critic (5 new measurement-layer gaps). Load-bearing code
facts re-verified directly. **Outcome: rev.2 needs a small, bounded rev.3 before the freeze — framing
survived; multiply-confirmed findings (R2-1 by 4 lenses, R2-3 by 5, R2-4 by 4) are load-bearing.** All
folded into rev.3._

## Additional ground truth established this round (verified)

- **`crosscut` conflates ≥3 heterogeneous obligation classes** into one averaged pass-fraction (tenancy×3 +
  authz×2 + shared authz/mass-assign), so a bucket-average veto lets a candidate sacrifice one lethal class
  and buy the fraction back with cheaper cells. Per-cell fail info exists internally (each test uniquely
  named) but §2.3 scrubs it from the mutator digest → a per-cell veto needs a **split channel**.
- **The cheap gateway hardcodes `usd:0`** (`model-client.mjs` ~L444); nonzero `usd` only from real frontier
  calls. The cheap *coding* term being ~$0 is the thesis (with STATE.md's upper-bound-proxy caveat); the
  real cost defect is that the **routed all-frontier baseline is prose-only** (MCOH25's $0.27 = opus-whole,
  single-model, not a routed baseline).
- **`tools/scale-oracle-selftest.mjs` IS already a mutation test** (kills drift / fragmented-guards /
  spurious-credit) — refutes "it's only fixed cases"; what's missing is a **numeric per-bucket kill-rate
  floor** + an **independent oracle**.
- **The whole epic population is ONE template, 5 lexical clones** (`scale-oracle.mjs` DOMAIN_CATALOG): same
  obligations, same seam; only surface-count varies. "≥80 independent/diverse epics" is an **authoring
  task**, not something `gen-epic.mjs` does today.
- **`evaluateEpic` can return `{harnessError|timeout|empty}`** with no bucket counts — rev.2 never said how
  these map into fitness (a timeout could read as "no failures observed").

## Canonical findings (merged, ranked) → all addressed in rev.3

| ID | merged from | Sev | Verdict | Addressed in rev.3 |
|---|---|---|---|---|
| **R2-1** | L1-1,L3-1,L3-2,L3-3 | **high (freeze-blocking)** | CONF (4 lenses) | §6 — **per-cell non-inferiority** veto on a split mechanical channel (replaces the bucket-average veto); §2.3, §4.4 |
| **R2-2** | L6-1,L6-2,L1-3 | high | CONF | §2/§6/§7 — routed baseline = external workstream; interim opus-whole proxy + provisional cost-WIN; model-priced ledger reproducing a metered run; §13.3 |
| **R2-3** | L1-5,L2-1,L2-2,L4-4,L6-5 | high | CONF (5 lenses) | §3/§9 — credit-attribution **cut from P1** (checker = attributed gene by construction) → P2 skeleton-first, digest-gated, charged to K5, restore-margin kill |
| **R2-4** | L2-4,L2-5,L4-3,L5-3 | high | CONF | §6 G2 — per-bucket kill-rate floor (P0); 2nd hand-authored oracle before P2 promotion & P3 TEST; independent-oracle grader (§7); mechanical provenance (§10) |
| **R2-5** | L1-4,L2-3 | high | CONF | §2.4 — drop "pin" (gateway only records); route-stratification + ≥3 re-draws + per-route CI; verify any real override before P1 |
| **R2-6** | L5-1,L5-2 | high | CONF | §10 — structured-only retrieval payload (no free-text Scope/desc); oracle-scan retrieved text (K3); paraphrase-leak audit + capture-collapse entropy kill (P2+) |
| **R2-7** | L4-1,L4-2,L4-5 | **high (freeze-blocking, scoping)** | CONF | §7 freeze line — drop "credit-assignment" from frozen set; P1 = flat Pareto + 2 anchor epics; diverse ≥80-epic population = P2/P3 authoring task, not inside the freeze |
| **R2-8** | L6-3 | med | CONF | §7 **K7** surrogate calibration (Spearman ρ floor on lethal buckets, P2+) |
| **R2-9** | L6-4 | med | CONF | §6 — amortization **max-M** + credit only if claimed-M skeleton holds per-cell parity on M distinct epics |
| **R2-10** | L5-5 | med | CONF | §11 — forbid mid-run gene admission; new genes only at a CLEAN RESTART (new pre-registered run); §8-bounded triage |
| **R2C-1** | round-2 completeness | high | GAP | §5 — effective-sample-size: ICC/design-effect + power analysis (N_needed); n_eff seam-topology floor on TEST; design-effect-adjusted CI |
| **R2C-2** | round-2 completeness | **high (freeze-blocking)** | GAP | §7 — all `[PIN AT FREEZE]` quantities (δ,α,K5,K6,K7,K8,max-M,restore-margin) must be concrete at the ceremony; freeze of blanks is void |
| **R2C-3** | round-2 completeness | high | GAP | §0/§9 **K8** — hard P0/P1 planted-positive instrument self-validation; no K1 null reportable until it passes (§13.5) |
| **R2C-4** | round-2 completeness | med | GAP | §7 — instrument-output reproducibility: ≥2 independent loop runs must agree on the load-bearing mutation + scale-gate N |
| **R2C-5** | round-2 completeness | med | GAP | §4.5 — `{harnessError\|timeout\|empty}` → hard worst-of-K FAIL (lethal veto=0, cost charged), never excluded; rate logged |

**Meta-observation:** round 1 audited the *contents* of the genome/fitness/baseline; the consistent blind
spot was the **measurement layer** — sample validity, concrete decision thresholds, instrument calibration,
output reproducibility, and the failure-result→fitness mapping (R2C-1..5).

## Killed / downgraded on cross-examination — do NOT re-raise as new

- **L3-2 "absolute lethal bar (cells=100%)" → KILLED.** Conflicts with the deliberate C5 non-inferiority
  design (the baseline itself erodes, X-CUT 100→94→78→80; an absolute bar holds the hybrid to a standard the
  reference can't meet). Its valid kernel — averaging *licenses the silent miss* — is preserved as **per-cell
  non-inferiority** (R2-1).
- **L1-2 "quadrant-count digest is injective onto the seam" → DOWNGRADED, folded into R2-7.** Real only
  *because* the population is one template (zero DoF) — a symptom of R2-7/L4-2, not an independent digest
  leak; the digest is adequate given P1's 2 anchor epics. Same fix (epic diversity), and it cannot be done at
  P1 anyway.
- **L2-5 "self-test is NOT a mutation test" → PARTIALLY REFUTED.** It *is* a mutation test; the genuine gap
  (per-bucket kill-rate floor + cross-oracle) is preserved in R2-4.
- **L1-3 "ledger CI is a tautology" → DOWNGRADED, folded into R2-2.** Weaker than advertised (synthetic
  prices), but the fix (grounded price table + reproduce a metered run) is a sub-item of R2-2.
- **L5-4 "§11 ceiling non-sequitur" → DOWNGRADED to citation hygiene.** §11 already states "non-binding now /
  binding at K1" (the honest claim); rev.3 drops the over-reaching MASS/CodeEvolve citations. Not
  freeze-blocking.
- **L3-4 (happy=0.1) / L3-5 (zero-bucket skew) → DOWNGRADED, absorbed by R2-1/R2-7.** The load-bearing seam
  is in `integration` (weight 1.0, in the veto); per-cell veto makes the happy weight non-load-bearing.
  Population-skew is moot at P1 and handled by the §5 stratification when the diverse population is built.

## Reconciliations (baked into rev.3)

1. **When must the 2nd oracle exist?** Not "P3 only": it is required **before the first P2 "confirmed"
   promotion** (it's the only generator-independent provenance axis) **and before P3 TEST**. The P0 gate is
   the existing self-test + per-bucket kill-rate (cheap, ~exists).
2. **Can the freeze proceed with credit-attribution + celled archive staged?** Yes — but the **freeze line
   must drop "credit-assignment"** from the frozen invariants (freezing a likely-void, unvalidatable-at-P1
   mechanism would void the run). Frozen set = genome / operators / per-cell fitness+weights / TEST-hash /
   parity δ,α.
3. **Per-cell veto vs the anti-leak digest:** reconciled by the **two-channel split** — the insertion veto
   consumes the full per-cell pass-vector mechanically (never shown to any model); the mutator digest stays
   quadrant-and-count.

## Two new Tier-2 decisions resolved this round (research lead, 2026-06-16; `AMENDMENTS.md`)

- **§13.4 — cost-optimized baseline scope (R2-2):** external prerequisite workstream + interim opus-whole
  proxy + provisional cost-WIN (NOT built inside the instrument).
- **§13.5 — instrument self-validation (R2C-3):** a **hard** P0/P1 planted-positive gate (K8); no K1 null is
  reportable until it passes.

## Status

rev.1 reviewed; **rev.2 reviewed (this round); rev.3 written**, folding all 15 canonical findings + the two
new §13 decisions. Three freeze-blocking edits landed in rev.3 (per-cell veto §6, trimmed frozen set §7,
concrete freeze values §7). A **freeze-readiness re-check** (independent read + apparatus scan) returned
**GO-WITH-FIXES**; the three fixes were applied (TEST-hash staged; anchor pair `{workspace, scale-d1}`
named + content-hashed; K8 budget + amortization max-M pinned to explicit numbers) and the
**pre-registration freeze was TAKEN 2026-06-17** (record: [`FREEZE.md`](FREEZE.md)). **Next: P0.**
