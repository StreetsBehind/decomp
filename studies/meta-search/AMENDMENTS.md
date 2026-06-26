# Meta-search — pre-registration amendment ledger

> Append-only. Records every change to [`DESIGN.md`](DESIGN.md). **Before** the pre-registration freeze,
> edits are allowed and recorded here. The void-rule is keyed to **P1 start**, not the freeze date: changes
> to the **weights vector**, the **per-cell veto definition**, the **parity δ/α**, or the **committed
> TEST-set hash** *void the run* once P1 has started; pre-P1 amendments and all other changes are logged here
> with rationale (DESIGN.md freeze line).

**Freeze status: FROZEN 2026-06-17** (full record + content hashes: [`FREEZE.md`](FREEZE.md)). Taken after
the rev.3 freeze-readiness re-check returned GO-WITH-FIXES (all fixes applied: TEST-hash staged, anchor pair
named/hashed, K8 budget + amortization max-M pinned to explicit numbers). **Status as of 2026-06-19: P1 has
STARTED — the void-rule is LIVE** (changes to the weights vector / per-cell veto / parity δ-α / committed
TEST-hash void the run; every other amendment is logged here). Progress (see dated entries below): P0→P2c
concluded; the P3 prerequisites are built (2nd oracle, diverse templates, sequestered-TEST hash, routed
baseline); the EVO-GLEANINGS program + Phase −1 have run. **Next: P3** — gated on two deferred live-spend
prereqs (the settled routed baseline + the live co-measured INTEG head-to-head).

---

## 2026-06-16 — rev.1 → rev.2 (adversarial-review fixes; pre-freeze, foundational)

Two-round adversarial review of rev.1 (full record: [`REVIEW-LOG.md`](REVIEW-LOG.md)). Folded in: the G1
fitness re-wire to the epic bucket-scorer; the G2 oracle-validity gate; and ~10 Tier-1 fixes (quadrant-only
digest, counterfactual credit-attribution, MAP-Elites niching, the CORE/TEST battery policy, escalation
ledger + all-opus CI guard, gateway route-pinning, co-measured baseline, parity non-inferiority test, freeze
artifact + separate grader, eval-count kill). Added §10 (knowledge capture) and §11 (node supply). Two
findings downgraded (C4, B4). These are pre-freeze foundational edits, not post-freeze amendments.

## 2026-06-16 — Tier-2 decisions resolved (DESIGN §13; research lead)

- **A1 — P1 framing (finding C4).** P1 = the **cheaper-author × checker arm**; the opus-author arm is
  pre-registered as **expected-to-fail-K1-at-N=5**; P1's primary question is the **mechanism** (does the
  checker lever move `crosscut`/`integration` at fixed N=5), not a cost-claim at N=5.
- **A2 — Veto timing (finding A4).** Lethal veto applied at **archive insertion** (rejects degenerate
  parents); the WIN-only alternative is rejected.
- **A3 — Cheap-mutator control arm (finding B4).** **Optional** robustness check, not required for validity.

_Rationale for all three: confirmed as the review's recommended options; each preserves the
instrument→fixed-product framing and the falsifiable comparison._

## 2026-06-16 — rev.2 → rev.3 (second adversarial-review fixes; pre-freeze, foundational)

Second two-round adversarial review of rev.2 (6 blind lenses + refute/adjudicate + completeness critic;
full record: [`REVIEW-LOG.md`](REVIEW-LOG.md) "rev.2 review"). 15 canonical findings folded. The three
**freeze-blocking** edits (a frozen error voids the run, so they had to land before freeze):

- **R2-1 — per-cell veto.** The lethal veto changed from a bucket *average* (`min(crosscut,integration) ≥
  baseline`) to **per-cell non-inferiority** vs the co-measured baseline, on a **split mechanical channel**
  (insertion consumes the per-cell pass-vector; the mutator digest stays quadrant-and-count). The bucket
  average licensed silent lethal misses (pass *different* cells than the baseline / buy back a conflated
  obligation class). This is the **weights/veto definition** — void-on-change post-freeze.
- **R2-7 — trimmed frozen set.** Dropped **"credit-assignment" from the frozen invariants** (it is now a P2
  mechanism, unbuildable/unvalidatable at P1). Scoped the diverse ≥80-epic population **out of the freeze**
  as a P2/P3 authoring task (today's `gen-epic.mjs` emits only size-variants of one 5-clone template). P1 =
  flat Pareto + 2 anchor epics.
- **R2C-2 — concrete freeze values.** All `[PIN AT FREEZE]` quantities (δ, α, K5 eval cap, K6 kill-rate
  floor, K7 ρ floor, K8 budget, amortization max-M, credit-attribution restore-margin) must be set to
  concrete values at the ceremony; a freeze of unspecified values is void. Recommended defaults listed
  inline in DESIGN §6/§7.

**Freeze-compatible amendments folded:** R2-2 (routed baseline = external workstream + interim opus-whole
proxy + model-priced ledger), R2-3 (credit-attribution → P2 skeleton-first/gated/restore-margin-kill),
R2-4 (per-bucket kill-rate P0 gate + 2nd hand-authored oracle before P2/P3 + independent-oracle grader +
mechanical provenance), R2-5 (route stratification, not pin), R2-6 (structured-only knowledge retrieval +
leak-scan + capture-collapse kill), R2-8 (K7 surrogate calibration), R2-9 (amortization max-M), R2-10
(clean-restart-only gene admission), R2C-1 (effective-sample-size/power + n_eff floor), R2C-3 (K8 instrument
self-validation), R2C-4 (≥2-loop-run reproducibility), R2C-5 (harness-error → hard fail).

These are pre-freeze foundational edits, not post-freeze amendments.

## 2026-06-16 — Tier-2 decisions resolved (DESIGN §13.4–13.5; research lead)

- **§13.4 — cost-optimized baseline scope (finding R2-2).** The routed all-frontier baseline is an
  **external prerequisite workstream** (STATE.md #3), not built inside the instrument; **interim comparison
  uses the admissible reliable proxy (opus-whole)** and interim cost-WIN claims are **provisional**; the
  freeze gates the final cost-WIN on the routed baseline once it lands.
- **§13.5 — instrument self-validation (finding R2C-3).** A **hard** P0/P1 planted-positive gate (K8): the
  loop must rediscover a hand-built known-dominating genome within budget; **no K1 null is reportable until
  it passes.**

_Rationale: both confirmed as the review's recommended options; each preserves the instrument→fixed-product
framing and keeps the falsifiable comparison honest (a measurable baseline; an interpretable null)._

## 2026-06-16 — §14 operational autonomy added (harden unattended running; freeze-compatible)

Research lead chose "keep falsifiable-static; harden autonomy" when asked whether the design supports long
unsupervised runs / self-improvement / non-deviation. Added **DESIGN §14 — operational autonomy**: governing
principle **run-until-a-guardrail-then-halt-and-notify**; (14.1) crash-safe **checkpoint/resume** (atomic
per-generation state, deterministic replay, idempotent workers); (14.2) **watchdog** enforcing K4/K5/K7/K8
+ two liveness guards (per-candidate-eval timeout, per-generation wall-clock stall) that halt-to-checkpoint;
(14.3) **mechanized curation off the critical path** (the loop never blocks on a human verdict; an
un-reviewed knowledge queue just means the run proceeds knowledge-blind); (14.4) the **Phase boundary** an
unattended run may conclude (Phase-1 = mechanism + reliability only, cost-WIN gated to Phase-2). Explicitly
out of scope by design: open-ended gene invention mid-run, self-modification of engine/fitness/judge/oracle,
autonomous `confirmed`-promotion. Cross-refs added in §8 (failure modes), §9 (P0 validates the harness), §12
(reuse "New"). **Freeze-compatible** — touches no frozen invariant; these mechanisms are tuned/logged here,
not pinned at the freeze.

## 2026-06-17 — PRE-REGISTRATION FREEZE TAKEN (full record: `FREEZE.md`)

Freeze-readiness re-check (independent read of the three freeze-blocking edits + a consistency scan + an
apparatus read to identify the anchor epics) returned **GO-WITH-FIXES**. The three fixes were applied, then
the freeze was taken:

- **Fix 1 — TEST-hash staged.** The freeze line / §14 invariant list previously named the bare "TEST-set
  hash" as fixed-before-P1, but the ≥80-epic TEST set cannot exist yet (`gen-epic.mjs` emits one template).
  Resolved: **freeze the TEST POLICY now; commit the TEST content HASH as a pre-registered amendment when the
  set is authored (pre-P3)**, void-on-change from that point. Wording fixed in the freeze line, the §14
  parenthetical, and this ledger's header.
- **Fix 2 — anchor pair named + hashed.** P1 frozen CORE = **`{workspace, scale-d1}`** (both N=5, identical
  EXPECTS; one seam-topology, two skeleton-provenance variants — explicitly NOT epic diversity). Pinned by
  git tree hash in `FREEZE.md`. Named in §5 and the freeze line.
- **Fix 3 — explicit numbers for K8 + max-M.** K8 budget pinned standalone (**≤ 8 generations AND ≤ 300
  evals**, headroom above the P1 search's G≤6) rather than "≤ the P1 G cap"; amortization **max-M = 12** (a
  P2 quantity; uncredited at P1 by construction, since M_distinct = 1 over the single-seam-topology anchor
  pair).

**All formerly-`[PIN AT FREEZE]` values pinned:** δ=0.05, α=0.05 (one-sided); weights (crosscut 1.0,
integration 1.0, happy 0.1, wire 0.0); per-cell non-inferiority veto; K5 P1 eval cap=250; K6 kill-rate
floor=0.90 (lethal); K7 ρ floor=0.80 (lethal); K8 ≤8 gen & ≤300 evals; max-M=12; credit-attribution
restore-margin=2× worst-of-K SE. **Content pins:** apparatus `studies/build-gap/` tree
`1580944116743dce55e42c2ffb77341c258d9e65`; workspace `e568b06f…`; scale-d1 `4793d89d…`.

**One pre-P1 choice deliberately defaulted (freely amendable until P1 starts):** the 2nd anchor = `scale-d1`
(P1 is fixed-N by design; a second N-point is deferred to P2). A research lead wanting an N-point at P1 can
swap it for `scale-d{2,4}` via a pre-P1 amendment.

**Next: P0** (smoke + wiring + G1/G2/K8 gate validations + the §14 autonomy-harness round-trip).

## 2026-06-17 — P0 BUILT + GREEN (smoke + wiring + instrument self-validation)

P0 implemented under `studies/meta-search/` (additive; the frozen apparatus tree `studies/build-gap/` =
pinned `1580944…`, **verified untouched**). All 5 blocking gates pass; full record:
[`P0-RESULTS.md`](P0-RESULTS.md), machine summary `runs/p0-summary.json`. Modules: `src/` (genome,
scorecard [§6 per-cell metric], archive [per-cell veto + flat Pareto], operators, evaluator [synthetic +
live], worker, loop, ledger, rng, checkpoint, watchdog, config) + `gates/` (G0/G1/G2/K8/autonomy + live
smoke) + `p0.mjs`.

**Gate outcomes:** G0 freeze-consistency (code == FREEZE record); G1 per-cell metric wired through the
real `evaluateEpic` (mut drops exactly `authz@addMember`, reliability matches hand-computed scalar to
1e-9, digest carries no cell names, veto rejects at insertion); G2 oracle kill-rate **1.000 crosscut /
1.000 integration** (≥ K6 0.90), reference not killed; K8 rediscovers the planted optimum **30/30 pinned
seeds** within ≤8gen/≤300evals (base rate 99.4% over 500 seeds), veto fires in-loop; §14 checkpoint→resume
bit-identical + watchdog halts-to-checkpoint on a planted hang. Live gateway smoke OK (non-blocking).

**P0 operational parameters (measurement-layer — NOT frozen invariants; freely tunable pre-P1, recorded
for reproducibility):** K8 search cpp=7 × μ=5 (35 evals/gen), pinned seeds 1..30, rediscovery threshold
≥0.90 (actual 30/30); the planted-positive synthetic **calibration** landscape (clean two-gene assembly
checker→crosscut / shaped-skeleton→integration; a cheap winner by construction — explicitly NOT the real
MCOH25 economics); the model-priced price table (opus 15/75, sonnet 3/15, haiku 0.80/4, fusion 0 per-Mtok;
calibrated to the MCOH25 anchors opus-author ≈$0.40, opus-whole ≈$0.27). Two design subtleties resolved:
(a) breeding from a **μ-best population** (flat-archive analog of P2 MAP-Elites) to avoid Pareto-front
degeneracy at uniform cost; (b) a **deliberately-weak K8 calibration baseline** so the per-cell veto
leaves a climbable gradient (the real opus-whole baseline already erodes, MCOH25 X-CUT 100→80%).

These touch **no frozen invariant** (genome §2, operators §3, battery/seed/split §5, per-cell fitness +
weights + veto §6, parity δ/α §7, TEST-set policy). **Next: P1.** The void-rule begins at P1 start.

## 2026-06-17 — P1 APPARATUS BUILT (cheaper-author × checker arm; pre-P1 operational decisions)

The P1 live arm is built (additive under `studies/meta-search/`; the frozen apparatus tree `studies/build-gap/`
re-verified == pinned `1580944…`). New modules: `src/skeleton-author.mjs`, `src/checker.mjs`,
`src/proposer.mjs`, `src/baseline.mjs`; `src/evaluator.mjs` extended; `p1.mjs` driver; `gates/p1-smoke.mjs`.
`src/operators.mjs` + `src/loop.mjs` gained an **async** `mutate`/`onEval` (P0 re-run **GREEN 5/5** — K8 and the
§14 round-trip stay bit-identical, confirming the change is determinism-preserving). The deterministic P1 smoke
(14/14, **zero spend**) validates: the reflective proposer drives the mutation path; the checker static logic
+ repair loop + the K3 oracle-leak scan; skeleton sourcing; the cheaper-author cost ladder.

These are **operational/apparatus decisions, NOT frozen invariants** (freely chosen pre-P1, recorded here):

- **Skeleton sourcing.** P1 is the cheaper-author × checker arm, where the **attributed gene is the checker
  by construction** (§3) and the skeleton-author tier is a fixed *cost axis*. So each (epic, tier) maps to ONE
  skeleton, authored ONCE and reused — the **cached MCOH25 skeletons** (`build-gap/runs/skel-{cheap-1,sonnet,
  opus}.md`, read-only). The anchor pair is one seam-topology (`domainsFor(1)` === workspace), so a
  workspace-authored skeleton applies to scale-d1 unchanged. The authoring **cost is the real metered MCOH25
  usd** (fusion $0 / sonnet $0.092 / opus $0.395 — §2.5 "trust a metered usd over token×rate"), charged to the
  candidate's product ledger; the expensive frontier authoring *call* is amortized R&D, not re-run per eval.
- **The checker lever** (`src/checker.mjs`). Per-surface, AFTER the cheap build: `deterministic` (static,
  oracle-blind obligation/seam heuristics) or `cheap-judge` (free-gateway judge of code-vs-contract-clause),
  with a re-prompt **repair** up to `repairDepth`. **Oracle-blind** (sees only the PUBLIC skeleton/spec + the
  code) and **K3-scanned**: every checker/judge/repair prompt runs through `scanOracleLeak` (the oracle's
  distinctive `…@<surface>`/`SEAM±`/`ISO@` forms + fixture literals); a hit voids the candidate.
- **Co-measured baseline** (`src/baseline.mjs`). The opus-whole proxy as ONE combined scorecard spanning the
  core epics' cells (for the per-cell veto). `cached` = the MCOH25 anchor (X-CUT/INTEG 100%, $0.247/epic, the
  honest N=5 reference); `live` re-runs opus-whole per loop-run (co-measured, finding #5).
- **Reflective proposer** (`src/proposer.mjs`). A frontier model (sonnet) reads the **quadrant-and-count digest
  only** (§2.3 — never cell/seam names) and names one operator; its spend is tracked as **R&D, never charged to
  product cost** (§6). A model-free heuristic stand-in drives the gates / dry-run reproducibly.
- **Run shape.** Pilot = 1 epic, cached baseline, heuristic proposer (zero frontier spend) → loop-closure + a
  controlled checker A/B. Full = anchor pair, **≥2 loop runs** (distinct mutator seeds; R2C-4 reproducibility —
  the load-bearing mutation must agree), reflective proposer, K5=250 cap, the §14 watchdog + checkpoint.

**Expected outcome pre-registered (FREEZE A1):** the cost arm fails K1 at N=5; the veto-passing archive is
expected EMPTY at N=5 (per-cell non-inferiority to a perfect opus-whole baseline = a 100%-on-lethal bar), and
that empty front IS the K1-at-N=5 result. P1's reportable question is the **mechanism** — read off the
candidates' lethal-bucket pass-fractions (checker-ON vs OFF), not the archive. No frozen invariant touched.

## 2026-06-17 — P1 CONCLUDED: loop-closure ✓; checker NULL at N=5 (K1-at-N=5, pre-registered) → go to P2

Ran the pilot + a 4-cell checker probe on scale-d1 (`p1.mjs --pilot` / `--probe`; record:
[`P1-RESULTS.md`](P1-RESULTS.md)). **The live loop closes end-to-end** (genome → cheap build → checker lever
+ repair → grade → per-cell veto → archive; empty veto-archive at N=5 as pre-registered). **The per-surface
checker lever is NULL at N=5:** INTEG 0% in every cell, OFF and ON — a per-surface checker structurally
cannot fix the *cross-surface* seam; the X-CUT deltas (+0/+29/−29pp) are K=1 gateway noise in cells where
the checker was **inert** (0 violations/0 repairs), and the one cell where it fired moved 0pp. This
**confirms the pre-registered K1-at-N=5** and matches MCOH25's scale-gating (the checker pays off at N≥13,
not N=5).

**Research-lead decision (option C):** accept the finding; do **not** run the full multi-seed worst-of-K
rigor pass (low value to re-confirm a pre-registered null); **proceed to P2 (the scale sweep)**, where the
mechanism is expected to live. P1's §5 job — confirm the loop closes and measure the lever's effect — is
**satisfied** (loop closes; lever effect at N=5 = null).

**P1 → P2 implications (the kickoff seed; full version in `P1-RESULTS.md` + STATE.md follow-up 8):**
- **Add the integration-gate + repair lever** to the genome (build-gap §4b — a *cross-surface* consistency
  check + route-back). The per-surface checker is the wrong lever for the seam; admit the new node via the
  clean-restart rule (R2-10), clean because P2 is a new phase.
- **Scale the existing `scale-d{1..4}` ladder** with checker + integration-gate on, where bare-opus erodes
  + gets pricier (N≥13) — the cost-win regime. External validity still needs the deferred diverse-template
  authoring + the 2nd hand-authored oracle before any "confirmed" promotion.
- Switch on the P2 machinery (celled MAP-Elites, gated credit-attribution, surrogate under K7,
  niching-gated knowledge-conditioning).

The instrument is trusted (K8 passed in P0; loop closes live in P1). **No frozen invariant was touched, so
nothing is voided.** P1 apparatus committed on `docs/meta-search-rev2-review-handoff`.

## 2026-06-17 — P2a: cross-surface integration-gate node admitted (R2-10) + MECHANISM CONFIRMED

The research lead **staged** P2 (vs. running the whole sweep): build the cross-surface integration-gate lever
first and probe whether it moves INTEG before committing to the scale sweep + search machinery. Built additively
under `studies/meta-search/` (frozen tree `studies/build-gap/` re-verified == pinned `1580944…`). New: 
`src/integration-gate.mjs`, `p2.mjs` (paired-A/B probe), `gates/p2a-smoke.mjs` (41/41 zero-spend); 
`src/{genome,evaluator,worker}.mjs` extended.

**The new gene, admitted at the P2 phase boundary via the clean-restart rule (R2-10):**
- **`integrationGate` node** (`{kind: off|deterministic|cheap-judge, repairDepth: 0..2}`) added to GENE_DOMAINS
  + validateGenome (§11 node-supply). **Hash-safe by construction:** `canonical()` strips the node when
  off/absent, so every P1/K8 genome hashes byte-identically. **P0 re-ran GREEN 5/5** — K8 30/30 bit-identical
  (worst evals 269/300) and the §14 round-trip deterministic (U=175 R=175) — confirming the addition is
  determinism-preserving. **No mutation operator is wired at P2a** (the probe constructs genomes directly), so
  `OPERATOR_NAMES` is unchanged and the K8 trajectory is unperturbed; the operator is deferred to P2b, where K8
  re-validates under the widened operator set.

**These are operational/apparatus decisions, NOT frozen invariants** (genome §2 semantics, operators §3,
battery/seed/split §5, per-cell fitness/weights/veto §6, parity δ/α §7, TEST policy all untouched → nothing
voided). The void-rule remains keyed to P1; P2 is a new phase.

**Probe outcome (record: [`P2a-RESULTS.md`](P2a-RESULTS.md)).** A live diagnostic found the dominant N=5 INTEG
failure is **missing defensive-init of a non-base shared store** (an undefined-access crash — `ctx.db.memberships`
is not in the base model and the cheap builders don't `??=`-init it), NOT representation drift; INTEG is therefore
**bimodal** (≈0% or 100%). The gate's detection was strengthened to cover this cross-surface invariant (Mode A:
shared-non-base store accessed without init) on top of name/style drift (Mode B), with an init-repair. The paired
A/B on scale-d1 (12 rounds): the **deterministic** gate lifts **INTEG 0%→100% (Δ +92pp), recovered 11/11 drifted
rounds, X-CUT flat** — the mechanism the per-surface checker structurally could not deliver. The **cheap-judge**
variant is NULL (detected 6/11, recovered 0/11 — fail-open, as in P1). **P2a verdict: mechanism confirmed →
proceed to P2b.** (This is a mechanism result at N=5, NOT a cost-win; the cost-win stays scale-gated to N≥13.)

## 2026-06-17 — P2b: gate operator wired (R2-10) + K8 re-validated + SCALE SWEEP → cost×reliability crossover

The research lead chose to proceed to P2b (the scale sweep) after P2a confirmed the mechanism. Built additively
(`p2b-sweep.mjs`; `src/operators.mjs` gained the gate operators; frozen tree `studies/build-gap/` re-verified
== pinned `1580944…`).

**Instrument change at the P2b clean-restart (R2-10 gene admission at a phase boundary — sanctioned; the FREEZE
§2 operator set is the P1 set, widened at the new phase):** wired the `integrationGate` mutation operator(s)
(`toggleIntegrationGate`/`integrationGateKind`/`integrationGateRepair`) into `OPERATOR_NAMES` (15→19 ops; the
node was admitted unwired at P2a so P0/K8 stayed bit-identical). **K8 re-validated under the widened operator
set: 29/30 (97%) ≥ the frozen 0.90 floor, worst evals 199/300; P0 GREEN 5/5.** No longer bit-identical to the
P1-era K8 trajectory (the operator set legitimately changed at the phase boundary) — but the **cross-phase
frozen invariants are untouched** (fitness weights, per-cell veto, δ/α, TEST policy), so nothing is voided.

**The scale sweep (record: [`P2b-RESULTS.md`](P2b-RESULTS.md)).** Paired OFF/ON measurement (deterministic
gate; analytic cost — free-gateway builds $0, cached skeletons priced at the metered MCOH25 anchor) of the
hybrid (cheap-build + skeleton + gate) across scale-d{1..4} (N=5→17) × {fusion, opus} skeleton, vs the MCOH25
Result-4 bare-opus bar. **The predicted cost×reliability crossover is OBSERVED:** at N=5 bare-opus wins (perfect
+ $0.278 = the pre-registered K1-at-N=5); at **N≥13, where bare-opus erodes (X-CUT 78→80%, EPIC✓ 33→0%) and
gets pricier ($0.387→$0.431), the $0 fusion+gate hybrid holds X-CUT ABOVE bare-opus (89–90%) and the gate
recovers INTEG to 69–85%, at zero cost** (opus+gate even clears EPIC✓ 33% vs bare-opus 0% at N=17). The
integration-gate is the load-bearing lever (gate-OFF INTEG 0–33% → gate-ON 69–85%); the cheapest skeleton is
strongest at scale (cheap-skel failures are the clean init-crash the gate fixes outright, so fusion+gate INTEG
≥ opus+gate INTEG at N≥13). **PROVISIONAL** — opus-whole cost proxy, X-CUT sub-metric (bare-opus per-bucket
INTEG not measured), 3-round samples, not run through the per-cell veto/non-inferiority test. **Strongest
evidence yet for the north-star thesis, NOT the P3 result.** Next (P2b-continued/P3): run the evolutionary SEARCH with the deferred machinery
(MAP-Elites/credit-attribution/surrogate/knowledge) to discover+freeze the dominating config; the routed
all-frontier baseline; diverse-template authoring + 2nd oracle; the sequestered-TEST P3 falsification.

## 2026-06-17 — P2c: the deferred SEARCH machinery switched on + the search rediscovers the P2b config

The research lead chose to run the evolutionary SEARCH (the instrument→product discovery step). Built additively
(`src/{map-elites,credit,surrogate,scale-landscape}.mjs`, `p2c-search.mjs`, three new gates; frozen tree
`studies/build-gap/` re-verified == pinned `1580944…`). Three of the four deferred P2 mechanisms (FREEZE §5 —
NOT frozen) were admitted + **instrument-re-validated under each** (the P2b discipline):

- **Celled MAP-Elites** (§4.1) — `src/map-elites.mjs` + an injected `selectParents` hook in `loop.mjs`
  (DEFAULT = μ-best topMu, so the frozen K8/P0 path + rng sequence stay **bit-identical**). Behavioral
  descriptor `(genotype-Hamming, per-bucket recall signature, cost bucket)`; per-cell lethal veto kept at
  insertion; occupied cell displaced only on Pareto-dominance. Gate `gates/p2c-map-elites.mjs`: **K8 rediscovery
  28/30 (93%) ≥0.90** under celled selection; **K4 no-collapse median 17 cells**; veto fires in-loop.
- **Credit-attribution (skeleton-first, gated)** (§3) — `src/credit.mjs` + a flag-gated loop hook (OFF →
  frozen path; `creditAttribution` + the `preferOp` mutation bias). Counterfactual reversion on the worst
  lethal candidate/gen, **skeleton-first**, evals **charged to K5**, **mis-attribution kill** (2×SE →
  unattributable → typed-random). Gate `gates/p2c-credit.mjs`: skeleton-first / leaf-culprit / the sub-noise
  kill / bounded+charged all pass.
- **Surrogate-scorer under K7** (§5/§11/§7) — `src/surrogate.mjs`, a k-NN screen, search-cost-only, never
  feeds the veto; **K7 kill** (FROZEN ρ≥0.80). Gate `gates/p2c-surrogate.mjs`: fidelity ρ=0.963; the kill
  fires on decorrelation (ρ=0.53→killed); cold/killed→null. Standalone module — not imported by the loop.
- **Knowledge-conditioning (§10) DEFERRED with reason** — its `confirmed`-record retrieval is BLOCKED until the
  2nd hand-authored oracle exists (§6 G2/§10 anti-rot, tied to K6); highest K3 leak surface; "optional, reverting
  free." Switched on after the 2nd oracle lands, not now.

**These are operational/apparatus decisions, NOT frozen invariants** (genome §2 semantics, operators §3,
battery/seed/split §5, per-cell fitness/weights/veto §6, parity δ/α §7, TEST policy all untouched → nothing
voided; MAP-Elites + credit-attribution are explicitly P2 mechanisms, FREEZE §5). **P0 re-ran GREEN 5/5; K8
29/30 bit-identical** (worst evals 199/300; §14 round-trip U=175 R=175) — the flag-gated/injected admissions are
determinism-preserving.

**The search (record: [`P2c-RESULTS.md`](P2c-RESULTS.md)).** One **live** N=13 eval exceeds 150s (measured), so
the multi-seed search ran on a **deterministic scale-economics landscape** (`src/scale-landscape.mjs`) — real
epic cell-counts, pass-rates **set to the LIVE P2a/P2b numbers** (anti-circularity stated: the economics CLAIM
is P2b's; this run's claim is only that the SEARCH converges, cf. K8 on real-shaped economics). From the NAIVE
pool, with all three mechanisms on, **both mutator seeds at N=13 and N=17 rediscover the same config — cheap
(fusion) skeleton + shapes + the deterministic integration-gate, at $0** — which dominates the bare-opus bar
(cost< ∧ per-cell lethal non-inferiority ∧ reliability≥parity; the naive seed itself fails the veto, so the
search had to climb). Reproducible (R2C-4); checker mostly off (the gate is the load-bearing lever, cheapest
skeleton strongest at scale — the P2b finding). K7 held (ρ 0.83–0.88) except N=17 seed 2 (ρ 0.788 <0.80) where
the kill **correctly fired**. **PROVISIONAL** (opus-whole + unmeasured-INTEG proxies; one seam-topology;
deterministic landscape; the winner is **PROPOSED, not frozen**). **Next = P3 prerequisites:** the routed
all-frontier baseline; diverse-template authoring + 2nd oracle; then freeze the winner + the sequestered-TEST
falsification. Apparatus UNCOMMITTED (user has not asked to commit).

## 2026-06-17 — P2c follow-up: integration-gate repair HARDENED (the X-CUT −3pp + INTEG-floor fix)

Autonomous follow-up on the P2a/P2b "tighten the lever" flags. The gate's repair regenerated the whole surface
from the build prompt, which is what occasionally **dropped an obligation guard** (the X-CUT −3pp at d3) and
sometimes **failed to fix the seam** (the INTEG plateau). The dominant failure (Mode A — uninitialized shared
store) needs no model: made it **deterministic + surgical** (`surgicalInitRepair` in `src/integration-gate.mjs`
injects `ctx.db.<store> ??= <init>` at the top of the function body, preserving the rest byte-for-byte; store
style read from existing usage; robust for single-line + multi-line surfaces with a null→model-rebuild
fallback). The surgical sweep fixes EVERY init issue on a pair and is **not** charged to the model `repairDepth`
budget (raises the INTEG floor); the Mode-B drift route-back now also anchors on the current code + an explicit
preserve-guards instruction. **Validated:** `gates/p2a-smoke.mjs` **44/44** (was 41/41 — modified 5b to assert
the surgical no-model-call behavior + added 5c guard-preservation + a single-line-robustness unit); **P0 GREEN
5/5**; live scale-d1 paired check — **INTEG 50%→100% (+50pp), X-CUT held 100%** (no guard-drop), $0. Mechanism
improvement only — no frozen invariant touched (the gate is a P2 lever, FREEZE §5); the genome/operators/fitness
are unchanged → nothing voided. Apparatus UNCOMMITTED. Record: `P2c-RESULTS.md` ("Tighten the lever — DONE").

## 2026-06-17 — P3 PREREQUISITES: 2nd oracle + diverse templates + TEST-SET CONTENT HASH committed

Research lead green-lit all P3 prerequisites and delegated 2nd-oracle authorship. Built additively under
`studies/meta-search/` (frozen apparatus tree `studies/build-gap/` re-verified == pinned `1580944…`; P0
re-GREEN 5/5 throughout). These satisfy the §6 G2 / §10 / FREEZE §4 prerequisites for P3:

- **2nd hand-authored oracle (§6 G2 / §10).** `src/oracle2.mjs` + `gates/g-oracle2.mjs` (record `ORACLE2.md`).
  An independent provenance class — property-based + metamorphic + differential vs oracle #1's example-based,
  sharing only the surface schema (spec), not detection logic; representation-agnostic. K6 = 1.000 on both
  lethal buckets; agrees with oracle #1 on all 16 frozen mutants; adds lethal-bucket coverage oracle #1 lacks
  (evasion evidence). **Unblocks "confirmed" promotion + knowledge-conditioning + the P3 grader.**
- **Diverse epic templates (FREEZE §5 / R2-7 / R2C-1 — the `n_eff` floor).** `epics-src/{approval,lifecycle,
  quota}.mjs` + `gen-diverse-epics.mjs` + `gates/g-diverse-templates.mjs` (record `DIVERSE-TEMPLATES.md`).
  Three structurally-distinct seam topologies beyond membership — approval (execute ⟹ approved-by-distinct-
  admin; SoD/idempotency/audit), lifecycle (legal state-transition ordering + gated read), quota (counter
  conservation + no-overspend + idempotent keys). Pairwise-disjoint surface sets; independent property-based
  representation-agnostic graders; K6 = 1.000 on both lethal buckets at D = 1,2,3.
- **Sequestered TEST set + CONTENT HASH (FREEZE §4 — the pre-registration lock).** `gen-test-set.mjs` +
  `epics/_dyn-tests.mjs` + manifest `runs/test-set-manifest.json` (record `TEST-SET.md`). **86 epics across
  the 4 distinct seam topologies** (membership 5 graded by the 2nd oracle; approval/lifecycle/quota 27 each as
  lexically-distinct windows over 8-domain catalogs × sizes). **Validated before locking:** 86/86 references
  full marks (0 false positives); new-domain mutant batteries kill at K6 = 1.000.

  **COMMITTED TEST-SET CONTENT HASH:**
  `74f10cbc4d7f40d40474e10efbcb86aeab5ba9e3bb4c85f605b10fbbf1ab149a`
  (sha256 over the per-epic grader structure for all 86 epics + the grader source hashes + the frozen
  apparatus pin). **Void-on-change from this point** (the void-rule began at P1): editing any grader, the
  generator, or the epic enumeration changes the hash and voids the run. Re-derive: `node
  studies/meta-search/gen-test-set.mjs`. *NB: the apparatus is UNCOMMITTED to git; this hash becomes binding
  on commit.*

**These touch NO frozen invariant** (genome §2, operators §3, battery/seed/split §5, per-cell fitness/weights/
veto §6, parity δ/α §7). The diverse templates + 2nd oracle are FREEZE §5 NOT-frozen P2+/P3 machinery; the
TEST-set hash is the pre-registered §4 staged commitment, now made. **Remaining P3 prerequisites:** the routed
all-frontier baseline (external workstream); then the winner-freeze + the once-only sequestered-TEST
falsification via the independent graders.

## 2026-06-18 — P3-prereq build: routed baseline + head-to-head (challenges the provisional win)

_[Logged retroactively 2026-06-19 for ledger completeness — committed `5f9b452`.]_ The routed all-frontier
baseline named "remaining" in the entry above was **BUILT** ([`ROUTED-BASELINE.md`](ROUTED-BASELINE.md)) — it
builds 100% crosscut/integration through D=3, so the P2b/P2c crossover was measured against the *weak opus-whole
proxy*; against the real routed baseline the result is a cost/reliability **TRADE, not dominance**. A live
head-to-head ran ([`HEAD-TO-HEAD.md`](HEAD-TO-HEAD.md)) with a **topology-gated** verdict (WIN on
lifecycle/membership, LOSS on quota/approval) → the P2c proposed winner is **not freezable as-is**, and the live
plan became the A×B co-evolution program ([`COEVOLUTION-SPEC.md`](COEVOLUTION-SPEC.md)). The two genuinely-unmet
P3 prerequisites are now the **deferred live-spend runs** (the SETTLED routed baseline + a LIVE co-measured INTEG
head-to-head; user-deferred 2026-06-19). No frozen invariant touched → nothing voided.

## 2026-06-19 — EVO-GLEANINGS: DESIGN §6b additive amendment + Batch-1/Batch-2 apparatus (logged)

Records the DESIGN.md change made by commit `9087896` (this ledger states it tracks *every* change to DESIGN.md;
this entry closes that gap). Disposition: a codex×opus deliberation CONVERGED
(`runs/deliberations/20260619T220547Z/DECISION-BRIEF.md`); all six gleanings ADOPTED.

- **DESIGN.md §6b — "Measurement-axis check" (gleaning #1).** A +41-line **additive, REPORT-ONLY** section
  (engine `src/axis-check.mjs`): a plateau detector attached to the existing `loop.onGeneration` hook (a pure
  observer — touches no rng/archive/population, so the trajectory stays **BIT-IDENTICAL**), an in-loop
  **report-only** plateau keep, trigger (b) reclassified into a **hard pre-P3 proxy→real BLOCKER gate**
  (`gates/pre-p3-axis-gate.mjs`), and the K8 planted-positive anti-abandonment discriminator. **It touches NONE
  of the four void-triggering invariants** (weights vector / per-cell veto / parity δ-α / committed TEST-hash)
  and never re-decides survivors → **the run is NOT voided.** This is the only DESIGN.md edit in the EVO-GLEANINGS
  batches.
- **The rest of Batch 1 (`9087896`) is additive code/docs outside DESIGN.md** — #5 aggregate-consistency lint,
  #2a GAMING-RISKS register, #2b-PRE pre-verifier, #3 strategy-registry (`mu_best` bit-identical;
  `pareto_per_cell` = selection, not veto), #4 eval-epoch stamping (default 0). **Batch 2:** #3 strategy-ablation
  (`2b8e2c3`), #2b-POST score-reproducibility KILL (`75c2789`; additive `export { bucketSE, lethalCounts }` from
  `credit.mjs`, credit path byte-identical). **P0 GREEN 5/5 bit-identical** across all three commits; the frozen
  tree `studies/build-gap/` re-verified untouched. Records: `EVO-GLEANINGS-BATCH1-RESULTS.md`,
  `BATCH2-3-STRATEGY-ABLATION-RESULTS.md`, `BATCH2-2-SCORE-REPRO-RESULTS.md`.

> **Governance note (for the research lead).** `CLAUDE.md` lists `DESIGN.md` as read-only/frozen without the
> carve-out this ledger's own void-rule defines (additive, non-void-invariant amendments are *allowed when logged
> here*). §6b is exactly such an amendment. Recommend either (a) a one-line clarification in `CLAUDE.md`'s
> "Frozen — do not edit" section pointing at this ledger's void-rule, or (b) if strict immutability of DESIGN.md
> is preferred, moving the §6b text out of DESIGN.md into this ledger. Left for the research lead's call.

## 2026-06-22 — GROUND-RULES pre-registration (route-pool floor + falsifiable (C)-trigger + metric alignment)

Resolves three deferred research-lead calls, prompted by the external review
([`EXTERNAL-REVIEW-2026-06-22.md`](EXTERNAL-REVIEW-2026-06-22.md), Recs 1–3). Full text:
[`GROUND-RULES.md`](GROUND-RULES.md). Floor knob decided by the research lead = **extraction + best-of-3**.

- **Route-pool floor (the deferred USER call — RUN-FOR-DAYS §4 / PHASE-NEG1 §3–4 / STATE.md Session-3).**
  PINNED: a draw is admissible iff `parse ∧ exports-required-surfaces` (`validate-surface`) **after
  deterministic extraction + best-of-3 re-sampling of the same pool**; below-floor draws are excluded from
  worst-of-K with the per-cell below-floor rate reported; a cell with no admissible draw is flagged
  `pool-degenerate`. Runtime crashes are ABOVE the floor (tier-2 repair targets, Premise #2). Re-sampling the
  same pool is not model-selection (Premise #1). This **completes** a pre-registration the freeze deliberately
  left open ("softening the raw-min statistic = a USER win-condition call"); it is **not** a change to a frozen
  value.
- **Falsifiable (C)-trigger.** PINNED: an ex-ante 5-condition test (above-floor ∧ smoke-clean ∧ semantic ∧
  survives-full-stack-across-zoo ∧ lever-menu-exhausted); thesis **KILL** only on a whole-obligation-class wall
  where the routed baseline holds and the hybrid is inferior by >δ, **SCOPE-SHRINK** on isolated walls,
  **CONTINUE** otherwise. Operationalizes the existing δ=0.05 non-inferiority veto; adds no constant.
- **Metric alignment.** RESTATED: archive-gate + freeze + sequestered-TEST all = raw-min worst-of-K=8 (already
  frozen); the search proxy (median-lift) steers mutation only and never touches a freeze/archive decision.
  Plus a logged **lever time-box** (the ladder run + ≤2 named admissible levers; widening logged here).

**Void-rule: touches NONE of the four void-triggering invariants** (weights vector / per-cell veto definition /
parity δ-α / committed TEST-hash). Rule 1 completes a deferred pre-registration; Rules 2–3 operationalize frozen
quantities. **Nothing voided.** Apparatus follow-up (additive, not pre-registration): tighten
`src/label-draw.mjs`'s `route-incompetence` bucket to fire only after extraction + best-of-3 also fail.

## 2026-06-23 — Rule-3 lever-menu re-pointing: extraction → Lever A (structural seam-recovery), then Lever B

Logs the GROUND-RULES **Rule 3** time-box lever-menu change forced by the decision-gate ladder result
([`LADDER-RESULTS.md`](LADDER-RESULTS.md)). Disposition arrived at via a codex×opus deliberation that
**CONVERGED** (`runs/deliberations/20260623T201830Z/` — transcript + manifest; the codex side conceded the
key Rule-2(e) correction, both stress-tested the call to convergence).

**Trigger.** The ladder ran NON-INFERIOR **2/17** (δ=0.05) vs the settled routed baseline → not a freeze, and
**Rule 2 is unmet on every cell** (no (C)-confirmed). **Rule 1 deprioritizes extraction by data:** mean
below-floor rate **0.096, 0 pool-degenerate** cells — the gating worst-of-K draw is above-floor real-but-broken
code in every failing cell, so recovering format garbage cannot lift it. Extraction (the pre-registered Rule-3
named lever #1) is therefore not load-bearing on this ladder.

**Re-pointing (the time-boxed ≤2 named admissible levers).** Pre-registered set was **{extraction,
shape-gate-depth}**. New set, in order:

- **Lever A (first) — a structural, surfaces-only generalized seam/integration-recovery gate** over the three
  non-membership topologies (approval + lifecycle + quota). Targets the dominant gating axis: the 8-cell
  integration collapse (Δi ≈ −.50), pure (B). The membership integration-gate proves the *mechanism* exists;
  the work is generalizing it past membership **without a topology-specific branch**.
- **Lever B (second) — the approval `approve→execute` / idempotency obligation as an inject+verify contract.**
  The (C)-boundary crux: a *form* contract the obligation-gate can enforce (→ (B), reachable) or a genuine
  *semantic* (C) wall (→ the program's first evidence-based (C)).

**Why A is forced first, not merely preferred (Rule 2(e)).** A (C) verdict requires the admissible lever menu
to be **exhausted**, and A is a named, untried, admissible (B) lever. So **B-first cannot produce a Rule-2-valid
(C)** no matter how cleanly it runs — on a "B did not help" you must still run A before any (C) adjudication. A
is therefore the only order on the (C) path, and it also carries the higher EV (pure (B) over 8 cells; A may
move them GO-side without ever needing a (C) call). A-first **sharpens** the later approval diagnosis (if A
lifts lifecycle+quota integration but approval stays collapsed and smoke-clean, approval is *isolated* on
approve→execute/idempotency); under Rule 2 changing the stack underneath B is lever-exhaustion, not contamination.

**COMMITTED pre-registered admissibility discriminator for A (must hold to keep A admissible; fixed BEFORE the
run to prevent post-hoc reclassification — the failure mode Rule 2 guards against).** *A is admissible iff its
inputs are confined to the generated surfaces themselves* — call-graph / seam reachability, exported-surface
signatures, smoke-execution traces of what the cheap draw actually wired — *and contain **no literal of intended
behavior*** (no "approval must precede execution", no per-topology correct-wiring table, no conservation
identity). If closing a seam requires writing down what the topology *should* do, that is the oracle → **A is
oracle-shaped and inadmissible (Premise #2)**, and **B becomes the first admissible lever by elimination.** This
is the same surfaces-only test the membership integration-gate already passes; A must pass it on three more
topologies.

**Pre-registered decision tree (the falsifiable signal A produces — post-A worst-of-K integration on the 8-cell
Δi −.50 axis):**

- lifecycle+quota integration **rise within δ=0.05 of baseline** → residual was (B) seam, confirmed → **CONTINUE**
  (possibly near-freeze on those cells);
- lifecycle+quota lift but **approval stays i42–50 + smoke-clean** → approval is now *isolated* on
  approve→execute/idempotency → sets the clean B/(C) test (B then satisfies 2(e); baseline holds 100 on approval
  → at least **SCOPE-SHRINK** if it walls, **KILL** only if the whole separation-of-duties class walls);
- **nothing lifts** → A is mis-built or fails the surfaces-only test (inadmissible) → **not (C)**.

**Stationarity re-run = not a prerequisite.** The −.50 collapse is consistent across all 4 depths (systematic,
not a worst-of-K tail), and the A-run is *itself* a fresh worst-of-K=8 draw over the route zoo on that exact
axis — so it doubles as the stationarity check at zero marginal cost.

**Void-rule: touches NONE of the four void-triggering invariants** (weights vector / per-cell veto definition /
parity δ-α / committed TEST-hash). This is a **Rule-3-logged change to the time-boxed lever menu** — the box is
unchanged in size (≤2 named levers); only the named candidates are re-pointed, with the deprioritization
grounded in the Rule-1 data above. **Nothing voided.**

## 2026-06-25 — Rule-3 metric refinement: same-draws / conditioned diagnostics admissible for LEVER-EVALUATION ONLY

Logs the GROUND-RULES **Rule 3** metric-alignment refinement forced by the Lever-A ladder result
([`LADDER-RESULTS-A.md`](LADDER-RESULTS-A.md)) and ratified by the user (2026-06-24). Disposition arrived at via
a codex×opus deliberation that **CONVERGED** (`runs/deliberations/20260624T202607Z/` — brief + manifest; both
sides stress-tested the call to a stable two-yes convergence).

**Trigger (the demonstrated instrument failure).** The Lever-A ladder showed a *deterministic, correctly-built,
admissible* lever's causal effect is **below the worst-of-K=8 non-stationary-pool noise floor**: its $0
same-draws A/B effect **flips sign across draw sets** (+25/+25/+6pp on `dump-ladder`'s draws; a net wash with a
−6pp regression on `dump-ladder-A`'s draws). Raw worst-of-K=8 over the free gateway is a min over an
unbounded-below non-stationary pool, so it is dominated by *whichever bug is worst on the worst route* — it
cannot resolve a deterministic lever whose target bug-class is the gating residual on only a minority of draws.
This is the BAR-MISMATCH / Deliberation-#2 concern, now demonstrated on a concrete lever.

**The refinement (the metric the freeze deliberately left as a USER win-condition call).** Same-draws /
conditioned **$0 diagnostics are admissible as the LEVER-EVALUATION metric** — the only stable causal measure of
a deterministic transform (it holds the draws fixed so the *whole* signal is isolated from cross-run route
variance). **Raw worst-of-K=8 remains the archive-insertion gate, the freeze statistic, and the
sequestered-TEST statistic, unchanged** (already frozen — RUN-FOR-DAYS §4 / GROUND-RULES Rule 3). This only
*adds a diagnostic layer below* the frozen statistic; the discipline is restated exactly: **the proxy/diagnostic
steers lever development, worst-of-K decides freeze/archive/TEST, and the diagnostic never touches a
freeze/archive/TEST decision.**

**The variance-robustness asymmetry that makes the reliability question reachable on the noisy instrument.** A
lever-**LIFT** measurement needs the **min** to move → variance-*fragile* (why Lever A was illegible). A
**(C)-verdict** measurement (Rule 2(d)) needs **every above-floor route to FAIL** the semantic invariant → a
*universal quantifier*, variance-*robust*: non-stationarity changes *which* route is worst, it cannot
manufacture unanimous semantic correctness across the zoo. So the reliability claim **is** adjudicable on the
current noisy free-gateway instrument via a **unanimous-failure read**, without taming the pool.

**Phase-2 is NOT a measurement fix for reliability (a binding constraint, not a preference).** Collapsing to one
stationary local model to get a clean signal **is route-selection-as-fix in disguise** → a **Premise-1
violation** (it would make the reliability claim true for one model, exactly the win condition the thesis
forbids). Phase-2 *realizes the fixed-cost economics* — a separate, necessary experiment — but it may never
launder non-stationarity out of the RELIABILITY claim. **The fallback for an empty conditioned subset is
free-gateway multi-pass collection, never Phase-2.**

**Operational consequence (the ratified next step, this is apparatus, not pre-registration).** Build **Lever B**
(approval `approve→execute`/idempotency + quota conservation as inject+verify) and run a **$0 CONDITIONED
diagnostic** on the existing `dump-ladder` / `dump-ladder-A` draws — conditioned to draws above-floor (Rule 1) ∧
smoke-clean (Rule 2(b)) ∧ whose *sole* post-stack residual is the named semantic class (`LEVER-A-SCOPE.md`:
approval-d2/d3/d4, quota-d3/d4) — **reporting DETECTION (deterministic, clean) and REPAIR-across-zoo
(model-routed) SEPARATELY**. Endpoints: repair succeeds on some above-floor route → **(B)**, keep the lever;
repair fails on **all** above-floor smoke-clean routes on the conditioned subset → the variance-robust **(C)**
signal, Rule 2(d) populated honestly. Only then a live worst-of-K ladder.

**Void-rule: touches NONE of the four void-triggering invariants** (weights vector / per-cell veto definition /
parity δ-α / committed TEST-hash). It restates and *operationalizes* the already-frozen raw-min worst-of-K=8
(adds a diagnostic layer strictly below it; the frozen statistic is unchanged in role and value). **Nothing
voided.**
