# HEAD-TO-HEAD-D — the co-measured cost-half confirmation + a baseline-stationarity finding

> **Session-12 (2026-06-28/29), the live-spend co-measured confirmation the user authorized after the run-D
> SCOPE-SHRINK.** A **fresh** SETTLED routed all-frontier baseline (`routed-baseline.mjs --settled --k 8`, LIVE,
> **$57.97 real surface-coding spend**; artifact `runs/routed-baseline-settled.json`, generated 2026-06-29;
> the prior Jun-20 baseline-of-record preserved as `runs/routed-baseline-settled-jun20.json`) co-analyzed against
> the recent full-stack hybrid (`runs/coevo-ladder-stack-B.json`, run B — the canonical settled hybrid: repair→
> shape→contract→obligation+bestofn→seam[Lever A]→semantic+behavioural[Lever B], $0). Each arm via its **own
> validated runner** (no re-plumbing in the spend path → the hybrid arm IS the ladder hybrid by construction; the
> baseline arm IS the baseline-of-record). **This confirms `COST-HALF.md` on a fresh, co-measured, stationarity-
> checked baseline.**
>
> **VERDICT (unchanged in substance): the §7 conjunctive battery WIN still FAILS.** The hybrid is **3.8× cheaper**
> ($25.64 vs $6.71 worst-of-K total) but **reliability-inferior on 11/17 cells**, decisively on **all four approval
> cells** where the frontier robustly holds i100. **6/17 cost-AND-reliability wins** (vs 5/17 against the Jun-20
> baseline — the +1 is baseline erosion on membership, NOT hybrid improvement). The cost half is dominated
> structurally; the binding constraint is — and always was — the reliability gate. Both halves are now
> characterized and co-measured = **SCOPE-SHRINK**, confirmed.

## Cost correction (logged honestly)

The pre-spend estimate of "~$11 real spend" was **wrong** — a misattribution of the `$64.61` figure (I assumed it
was the ledger-incl-skeleton; it was the real surface-coding spend). Reconciled from the artifacts: each draw's
`totalUsd` = real surface coding + a **$0.395 cached-skeleton bookkeeping** charge (the opus `skeleton.md` is read
from disk, never re-authored, so that $0.395 is NOT spent). Real API spend = ledger − ($0.395 × 136 draws):
**Jun-20 = $64.61, Jun-29 = $57.97** (both within the authorized "$64.61-class"). The $0.395 anchor is identical
on both arms (shared orchestration), so it cancels in the cost *delta*.

## The co-measured ladder (run-B hybrid vs FRESH Jun-29 baseline; δ=0.05; hybrid $0.395/cell)

| cell | base (fresh) c/i $ | hybrid c/i $ | lethal-non-inf | verdict |
|------|---|---|:---:|---|
| membership-d1 | c86/i100 $0.95 | c71/i67 $0.40 | no | LOSS (rel-inf) |
| membership-d2 | c83/i50 $1.31 | c83/i50 $0.40 | **yes** | **WIN** |
| membership-d3 | c88/i67 $1.72 | c88/i89 $0.40 | **yes** | **WIN** (baseline eroded to hybrid) |
| membership-d4 | c91/i75 $2.16 | c86/i75 $0.40 | **yes** | **WIN** |
| membership-d5 | c78/i40 $1.94 | c89/i73 $0.40 | **yes** | **WIN** (baseline eroded below hybrid) |
| approval-d1 | c100/i100 $0.85 | c71/i50 $0.40 | no | LOSS (rel-inf) |
| approval-d2 | c100/i100 $1.33 | c79/i50 $0.40 | no | LOSS (rel-inf) |
| approval-d3 | c90/i100 $1.74 | c67/i33 $0.40 | no | LOSS (rel-inf) |
| approval-d4 | c100/i100 $2.47 | c89/i44 $0.40 | no | LOSS (rel-inf) |
| lifecycle-d1 | c100/i100 $0.80 | c100/i100 $0.40 | **yes** | **WIN** |
| lifecycle-d2 | c100/i100 $1.21 | c60/i100 $0.40 | no | LOSS (rel-inf) |
| lifecycle-d3 | c93/i67 $1.41 | c87/i100 $0.40 | no | LOSS (crosscut 87 < 93−δ by 1pp) |
| lifecycle-d4 | c90/i100 $2.02 | c80/i75 $0.40 | no | LOSS (rel-inf) |
| quota-d1 | c100/i25 $0.88 | c100/i25 $0.40 | **yes** | **WIN** |
| quota-d2 | c100/i63 $1.19 | c50/i25 $0.40 | no | LOSS (rel-inf) |
| quota-d3 | c100/i75 $1.60 | c73/i17 $0.40 | no | LOSS (rel-inf) |
| quota-d4 | c100/i81 $2.08 | c70/i44 $0.40 | no | LOSS (rel-inf) |

**BATTERY: 6/17 cost-AND-reliability WINs · 6/17 lethal-non-inferior · baseline $25.64 vs hybrid $6.71 (3.8×).
§7 conjunctive battery win (ALL cells lethal-non-inferior AND total cost lower): NO.**

## The baseline is itself non-stationary (the methodological finding)

Comparing the two settled baselines (Jun-20 → Jun-29, same fixed routing haiku→CRUD/sonnet→writers/opus→seam,
same K=8): **10/17 cells drifted ≥10pp** on worst-of-K — e.g. membership-d5 i80→40, membership-d3 i100→67,
lifecycle-d1 **i0→100**, lifecycle-d3 i100→67, quota-d2 i100→63, quota-d4 i63→81. The *fixed-policy frontier*
baseline is noisy under worst-of-K=8 (the frontier models' own nondeterminism + 9-day drift), not just the cheap
zoo. Consequences:

- **The worst-of-K rig is noisy on BOTH arms** — this strengthens the standing caveat (the 2/17→1/17→5/17→6/17
  headline series is confounded by draw-variance + baseline drift; it must not be read as causal lever-lift). Two
  of the six "wins" (membership-d3/d5) are the baseline *eroding down to* the hybrid, not the hybrid rising.
- **BUT the approve→execute SCOPE-SHRINK anchor is ROBUST.** The frontier held **i100 on all four approval cells
  in BOTH runs** (approval-d1/d2/d4 i100/i100; d3 i100 both, crosscut 100→90) — the frontier reliably nails the
  approve→execute seam across runs, while the hybrid walls i33–50. The SCOPE-SHRINK does not rest on a lucky
  baseline draw; the cells where the hybrid is inferior are exactly the cells where the frontier is most stable.

## The verdict, both halves now characterized + co-measured

- **Reliability half:** SCOPE-SHRINK on approve→execute (run D / `LADDER-RESULTS-D.md`), re-confirmed here against
  a fresh, stationarity-checked baseline that holds i100 on approval.
- **Cost half:** dominance is structural (~3.8–4.1× cheaper; shared skeleton, $0 cheap coding) but **conjunctive**
  — it only counts where the hybrid also holds reliability parity (6/17 cells). The §7 battery WIN fails on the
  reliability gate. Free-gateway proxy + adverse-at-N=5 caveats stand (`COST-HALF.md`).
- **Net:** the hybrid is a strong **cost/reliability TRADE** that WINS outright on the obligation classes a surface
  (or the median route) can author — and on lifecycle-d1 even *beats* the frontier reliability at half the cost —
  but is **not** a conjunctive dominator across the ladder. Approve→execute/idempotency is the bounded exception:
  it requires frontier authorship of the seam itself (the thesis boundary).

## Pointers

- **Data:** `runs/routed-baseline-settled.json` (FRESH Jun-29, $57.97), `runs/routed-baseline-settled-jun20.json`
  (the preserved Jun-20 baseline-of-record), `runs/coevo-ladder-stack-B.json` (run-B full-stack hybrid).
- **Records:** [`COST-HALF.md`](COST-HALF.md) (the $0 structural cost analysis this confirms),
  [`LADDER-RESULTS-D.md`](LADDER-RESULTS-D.md) (the reliability-half SCOPE-SHRINK),
  [`ROUTED-BASELINE.md`](ROUTED-BASELINE.md), [`HEAD-TO-HEAD.md`](HEAD-TO-HEAD.md) (the Session-5 obsolete-hybrid
  0/17 falsification this supersedes for the full-stack hybrid).
- **Why not `head-to-head.mjs --settled`:** its hybrid arm (`runHybrid`) imports only the obsolete membership-only
  `runIntegrationGate`, not the full stack — so the two-trusted-runner co-analysis here is the faithful
  realization (the hybrid arm is the real full-stack ladder; the baseline arm is the baseline-of-record).
