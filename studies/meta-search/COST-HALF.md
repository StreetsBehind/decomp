# COST-HALF — the cost-at-parity verdict, derived at $0 from paid-for data

> **Session-12 (2026-06-28), after the run-D SCOPE-SHRINK.** The conjunctive thesis WIN = *cost-dominance AND
> reliability-parity, per cell, across the ladder*. The reliability half is characterized
> ([`LADDER-RESULTS-B.md`](LADDER-RESULTS-B.md) / [`LADDER-RESULTS-D.md`](LADDER-RESULTS-D.md)); this doc closes the
> **cost half** by combining the already-paid-for SETTLED routed-frontier baseline
> (`runs/routed-baseline-settled.json`, $64.61 / 136 draws, K=8) with the full-stack hybrid reliability
> (`runs/coevo-ladder-stack-B.json`) and the **structural** hybrid cost ledger. **No new spend** — the cost half is
> answerable from data already on disk, because the cost *direction* is structural, not empirical.

## Why the cost direction is structural (the key fact)

Both arms inject the **same** on-disk `skeleton.md` and pay the **same $0.395 opus orchestration anchor**. The
**only** difference is the per-surface CODING TIER: the baseline routes each surface to a frontier model
(haiku→CRUD, sonnet→writers, opus→seam), the hybrid codes every surface on the **free gateway ($0)** + $0 gate
repairs. So per cell:

```
hybrid cost   = $0.395  (shared skeleton)  +  $0       (cheap coding + repairs)   = $0.395
baseline cost = $0.395  (shared skeleton)  +  $0.42–2.29 (frontier coding)        = $0.82–2.69
```

The hybrid is cheaper on **every** cell **by construction** — by exactly the frontier coding cost the baseline
pays and the hybrid does not. The open question was therefore **never** "is the hybrid cheaper?" (always yes); it
was **"is it cheaper AT reliability parity?"** — i.e. the reliability gate, which the ladders measured.

## The cost-at-parity ladder (hybrid full stack [run B] vs SETTLED baseline; δ=0.05; hybrid $0.395/cell)

| cell | base c/i  $ | hybrid c/i  $ | lethal-non-inf | cheaper | verdict |
|------|---|---|:---:|:---:|---|
| membership-d1 | c100/i100 $0.93 | c71/i67 $0.40 | no | yes | LOSS (rel-inferior) |
| membership-d2 | c83/i50 $1.35 | c83/i50 $0.40 | **yes** | yes | **WIN** |
| membership-d3 | c100/i100 $1.80 | c88/i89 $0.40 | no | yes | LOSS (rel-inferior) |
| membership-d4 | c91/i75 $2.27 | c86/i75 $0.40 | **yes** | yes | **WIN** |
| membership-d5 | c93/i80 $2.69 | c89/i73 $0.40 | no | yes | LOSS (rel-inferior) |
| approval-d1 | c100/i100 $0.90 | c71/i50 $0.40 | no | yes | LOSS (rel-inferior) |
| approval-d2 | c100/i100 $1.38 | c79/i50 $0.40 | no | yes | LOSS (rel-inferior) |
| approval-d3 | c100/i100 $1.87 | c67/i33 $0.40 | no | yes | LOSS (rel-inferior) |
| approval-d4 | c93/i100 $2.33 | c89/i44 $0.40 | no | yes | LOSS (rel-inferior) |
| lifecycle-d1 | c80/i0 $0.82 | c100/i100 $0.40 | **yes** | yes | **WIN** (hybrid BEATS baseline reliability) |
| lifecycle-d2 | c80/i100 $1.26 | c60/i100 $0.40 | no | yes | LOSS (rel-inferior) |
| lifecycle-d3 | c73/i100 $1.68 | c87/i100 $0.40 | **yes** | yes | **WIN** |
| lifecycle-d4 | c100/i100 $2.10 | c80/i75 $0.40 | no | yes | LOSS (rel-inferior) |
| quota-d1 | c100/i25 $0.89 | c100/i25 $0.40 | **yes** | yes | **WIN** |
| quota-d2 | c100/i100 $1.21 | c50/i25 $0.40 | no | yes | LOSS (rel-inferior) |
| quota-d3 | c100/i75 $1.67 | c73/i17 $0.40 | no | yes | LOSS (rel-inferior) |
| quota-d4 | c100/i63 $2.25 | c70/i44 $0.40 | no | yes | LOSS (rel-inferior) |

**BATTERY: 5/17 cost-AND-reliability WINs · 5/17 lethal-non-inferior · baseline $27.41 vs hybrid $6.71 (4.1×).**
**§7 conjunctive battery win (ALL cells lethal-non-inferior AND total cost lower): NO** — the reliability gate
fails on 12/17 cells. (The $27.41 here is the per-cell `cost.worst` sum over these 17 cells; the full settled run
metered $64.61 incl. all draws.)

## The verdict (both halves now characterized)

- **Cost half: dominance confirmed, structurally — and bounded.** The hybrid is ~4× cheaper in aggregate and
  cheaper on every cell. But the win is **conjunctive**, and the cost saving only *counts* where the hybrid also
  reaches reliability parity — **5/17 cells** (membership-d2/d4, lifecycle-d1/d3, quota-d1; on lifecycle-d1 the
  hybrid even *beats* the frontier at half the cost). On the other 12 the lower cost is a **quality trade, not
  dominance**.
- **The conjunctive §7 battery WIN is NOT achieved** — it fails on the reliability gate (12/17 inferior), dominated
  by the approve→execute SCOPE-SHRINK class + the (B) form/seam/container classes. This is the same verdict the
  reliability ladders reached, now expressed in cost terms.

## Standing caveats (do not over-read the 4.1×)

- **Free-gateway proxy.** The hybrid's $0 coding is the free gateway — an **upper bound** for the Phase-2
  owned-hardware substrate the fixed-cost thesis actually needs. It is not a metered true cost.
- **Adverse at N=5.** At small N the frontier baseline is reliable AND cheap ($0.82–0.93); the hybrid cannot
  deliver reliability there (it walls on the seam classes), so the cost saving is **moot at N=5** — the regime
  where the cost win materializes is exactly the parity subset, not the whole ladder.
- **The co-measured live confirmation WAS subsequently run** (user-authorized) — see
  [`HEAD-TO-HEAD-D.md`](HEAD-TO-HEAD-D.md). A **fresh** SETTLED baseline ($57.97 real spend, 2026-06-29)
  co-analyzed against the run-B hybrid gives **6/17 wins, §7 battery win still NO, 3.8× cheaper** — confirming this
  $0 analysis. It also surfaced that the **fixed-policy frontier baseline is itself non-stationary** (10/17 cells
  drifted ≥10pp vs Jun-20), strengthening the both-arms-noisy caveat — while the approval cells held i100 in BOTH
  baseline runs, so the SCOPE-SHRINK anchor is robust. (`head-to-head.mjs --settled` was NOT used: its `runHybrid`
  imports only the obsolete membership-only `runIntegrationGate`; the two-trusted-runner co-analysis is the
  faithful realization.)

## Pointers

- **Data:** `runs/routed-baseline-settled.json` (the paid baseline, $64.61), `runs/coevo-ladder-stack-B.json`
  (full-stack hybrid reliability). **Records:** [`ROUTED-BASELINE.md`](ROUTED-BASELINE.md),
  [`HEAD-TO-HEAD.md`](HEAD-TO-HEAD.md) (the Session-5 obsolete-hybrid 0/17 falsification),
  [`LADDER-RESULTS-B.md`](LADDER-RESULTS-B.md), [`LADDER-RESULTS-D.md`](LADDER-RESULTS-D.md).
