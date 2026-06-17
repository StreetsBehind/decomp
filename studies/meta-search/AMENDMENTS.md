# Meta-search — pre-registration amendment ledger

> Append-only. Records every change to [`DESIGN.md`](DESIGN.md). **Before** the pre-registration freeze,
> edits are allowed and recorded here. **After** the freeze, changes to the **weights vector**, the
> **TEST-set hash**, or the **parity δ/α** *void the run* rather than amend it; all other post-freeze changes
> are amendments logged here with rationale (DESIGN.md freeze line).

**Freeze status: NOT YET FROZEN.** Eligible for freeze after the next adversarial review of rev.2
([`NEXT-REVIEW.md`](NEXT-REVIEW.md)).

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
