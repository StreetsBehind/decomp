# Meta-search — P0 results (smoke + wiring + instrument self-validation)

> **Status: GREEN — all 5 blocking gates pass (2026-06-17).** P0 proves the instrument's machinery is
> wired end-to-end and self-validates; it draws **no thesis conclusions** (that is P1+). Re-run:
> `node studies/meta-search/p0.mjs` (machine summary: [`runs/p0-summary.json`](runs/p0-summary.json)).
>
> The frozen apparatus tree (`studies/build-gap/`, pinned `1580944…` in [`FREEZE.md`](FREEZE.md) §1) is
> **untouched** — every P0 artifact is additive under `studies/meta-search/` and imports build-gap
> read-only. ~1.6k LOC: `src/` (genome, scorecard, archive, operators, evaluator, worker, loop, ledger,
> rng, checkpoint, watchdog, config) + `gates/` + `p0.mjs`.

## What P0 had to show (DESIGN §9 / FREEZE §7)

> P0 proves genome → worker → scorecard → archive end-to-end **and** validates: the §6 per-cell metric is
> wired (G1); the G2 oracle gate fires (per-bucket kill-rate ≥ 0.90); the K8 planted-positive
> instrument-validation passes (rediscover a known-dominating genome within ≤ 8 gen / ≤ 300 evals); and the
> §14 autonomy harness round-trips (checkpoint→kill→resume deterministic; watchdog halts-to-checkpoint on a
> planted hang).

## Results

| Gate | Result | Evidence |
|---|---|---|
| **G0** freeze-consistency | **PASS** | `config.mjs` pinned values == the FREEZE.md record (weights 1.0/1.0/0.1/0.0, δ=α=0.05, K5=250, K6=0.90, K7=0.80, K8 ≤8gen/≤300evals, max-M=12, restore-margin 2×SE, anchor pair {workspace,scale-d1}, content pins present). |
| **G1** per-cell metric wiring | **PASS** | Through the **real** `evaluateEpic` on the scale-d1 anchor: a correct build scores reliability 1.0 (EPIC✓); a single-lethal-drop build (`authz@addMember`) drops **exactly that one** crosscut cell, reliability = 0.931973 (matches the hand-computed cost-weighted scalar to 1e-9). Channel separation verified: the mutator **digest carries no cell/seam names** (`{crosscut:1}`, quadrant `lethal-miss`); the per-cell veto rejects the dropped build at archive insertion. Model-priced ledger: cheap build $0, opus-author build $0.247. |
| **G2** oracle kill-rate | **PASS** | On a battery of **genuine** single-obligation mutants over the scale-d1 oracle: crosscut kill-rate **1.000 (10/10)**, integration **1.000 (6/6)** — both ≥ K6 (0.90). The correct reference build is **not** killed (no false positive). |
| **K8** instrument self-validation | **PASS** | The loop **rediscovers** the hand-built known-dominating genome (cheap author + shaped skeleton + full checker → reliability 1 at $0, which Pareto-dominates the opus baseline at reliability 0.143/$0.27) from a deliberately-handicapped pool, on **30/30 pinned seeds (100%)** within ≤8 gen / ≤300 evals (worst 269 evals, worst 8 gen). The per-cell veto fires **operationally in-loop**: a planted trap that drops a lethal cell below baseline is rejected at insertion. |
| **§14** autonomy round-trip | **PASS** | checkpoint→kill@gen3→resume is **bit-identical** to the uninterrupted run (same final archive front; evalCount 175 == 175). Watchdog **halts-to-checkpoint** on a planted hang (per-eval timeout trips → `watchdog:eval-timeout`, notification emitted, resumable checkpoint left, did not push past the guardrail). |
| _live gateway smoke_ (non-blocking) | OK | The **live** build path (jnoccio gateway → `evaluateEpic`) returned a well-formed scorecard on scale-d1: a cheap-isolated genome scored reliability ~0.18–0.34, EPIC✓ 0/1, cost **$0** (free pool), routes distributed across ≥4 upstreams, harnessFailRate 0. (A smoke that the path executes — **not** a reliability result; cheap-isolated scoring low is the expected baseline, not a P0 conclusion.) |

## Pinned P0 operational parameters (logged as a pre-P1 amendment, NOT frozen invariants)

These are *how K8 is run inside* the frozen ≤8-gen/≤300-eval budget — measurement-layer, freely tunable
pre-P1, recorded for reproducibility (see [`AMENDMENTS.md`](AMENDMENTS.md)):

- **K8 search config:** childrenPerParent = **7**, populationSize (μ-best breeding pool) = **5** → 35
  evals/gen, fits ≤300 over ≤8 gens.
- **K8 rediscovery threshold:** ≥ **0.90** of the pinned seed set (seeds **1..30**); actual **30/30**.
- **K8 base rate** (the machinery, not a lucky trajectory): **497/500 = 99.4%** rediscovery over random
  seeds 1..500 (failures only at 119/378/416; the pinned set 1..30 is all-pass).
- **Synthetic landscape:** a deliberately **planted-positive calibration fixture** — a clean two-gene
  assembly (checker → crosscut, shaped skeleton → integration) mirroring the M-coh-2 double dissociation,
  with a cheap winner by construction. It **does not** model the real MCOH25 economics (where only opus
  restores the seam); that is the live arm's job at P1, never the instrument self-test's.
- **Price table (model-priced ledger, §2.5):** opus $15/$75, sonnet $3/$15, haiku $0.80/$4, fusion $0
  per-Mtok (in/out); calibrated so an opus skeleton-author ≈ $0.40 and the opus-whole baseline ≈ $0.27
  (the MCOH25 anchors). The all-opus-cost-dominated CI guard passes against this grounded table.

## Two design subtleties surfaced and resolved in P0

1. **Pareto-front degeneracy at uniform cost.** When cheap candidates are ~free, the Pareto front over
   (cost↓, reliability↑) collapses to a single point, starving exploration. Resolved by breeding from a
   **μ-best working population** (the flat-archive analog of P2's celled MAP-Elites), keeping the archive
   as the veto-passing Pareto *record*. This is the P1 stand-in; celled MAP-Elites replaces it at P2 (§4).
2. **The per-cell veto vs a strong baseline blocks stepping stones.** A perfect baseline vetoes every
   partial improvement. The K8 calibration baseline is therefore deliberately *weak on lethal cells* (the
   real opus-whole baseline already erodes, MCOH25 X-CUT 100→80%), giving the search a climbable,
   veto-respecting gradient — exactly the DESIGN K8 intent.

## What P0 does NOT claim

Per the freeze, **P0 draws no thesis conclusions.** It does not run the live search at scale, does not
author opus skeletons, does not measure a cost-WIN (gated to the routed baseline + Phase-2 hardware), and
the synthetic landscape is a calibration fixture, not evidence about hybrids. P0 establishes only that the
instrument is **wired, measured, and self-validated** — the precondition for trusting a P1 result (and for
an interpretable K1 null).

## Next: P1

The cheaper-author × checker arm at fixed N=5 over the frozen anchor pair `{workspace, scale-d1}` — the
mechanism question (does the per-surface checker lever move `crosscut`/`integration` at fixed N=5), with
the reflective (frontier) proposer swapped in for typed-random and the live epic evaluator over the gateway.
The void-rule starts at P1 start; pre-P1 amendments remain allowed until then.
