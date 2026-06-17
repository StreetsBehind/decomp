# Meta-search — pre-registration amendment ledger

> Append-only. Records every change to [`DESIGN.md`](DESIGN.md). **Before** the pre-registration freeze,
> edits are allowed and recorded here. **After** the freeze, changes to the **weights vector**, the
> **TEST-set hash**, or the **parity δ/α** *void the run* rather than amend it; all other post-freeze changes
> are amendments logged here with rationale (DESIGN.md freeze line).

**Freeze status: NOT YET FROZEN.** rev.3 written after the rev.2 adversarial review. Eligible for freeze
after a light re-check of the three freeze-blocking edits **and** the research lead pinning the concrete
`[PIN AT FREEZE]` values (DESIGN §7).

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
