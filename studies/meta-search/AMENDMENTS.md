# Meta-search — pre-registration amendment ledger

> Append-only. Records every change to [`DESIGN.md`](DESIGN.md). **Before** the pre-registration freeze,
> edits are allowed and recorded here. The void-rule is keyed to **P1 start**, not the freeze date: changes
> to the **weights vector**, the **per-cell veto definition**, the **parity δ/α**, or the **committed
> TEST-set hash** *void the run* once P1 has started; pre-P1 amendments and all other changes are logged here
> with rationale (DESIGN.md freeze line).

**Freeze status: FROZEN 2026-06-17** (full record + content hashes: [`FREEZE.md`](FREEZE.md)). Taken after
the rev.3 freeze-readiness re-check returned GO-WITH-FIXES (all fixes applied: TEST-hash staged, anchor pair
named/hashed, K8 budget + amortization max-M pinned to explicit numbers). P1 has **not** started, so pre-P1
amendments are still allowed. **Next: P0.**

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
