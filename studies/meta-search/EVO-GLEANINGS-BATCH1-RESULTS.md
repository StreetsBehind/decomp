# EVO-GLEANINGS Batch 1 — COMPLETE + GREEN (2026-06-19)

> The six-gleanings integration of the external evo-hq/evo instrument into our frozen meta-search apparatus
> was disposed by a codex×opus deliberation that **CONVERGED** (run `20260619T220547Z`, brief
> [`runs/deliberations/20260619T220547Z/DECISION-BRIEF.md`](../../runs/deliberations/20260619T220547Z/DECISION-BRIEF.md)).
> All six ADOPTED; none touches a frozen invariant. **Batch 1** = the additive / bit-identical / audit-only
> half (six items). **Batch 2** (the trajectory-perturbing half) is clean-restart-gated and OUT OF SCOPE here.
>
> This record is the batch-level roll-up. Each item carries its own RESULTS markdown (linked below);
> this file states the per-item posture in one row and reports the **combined** P0 + full-gate-suite sweep
> over the merged tree.

## What "Batch 1" means (the freeze frame — DECISION-BRIEF §"Freeze posture")

Every Batch-1 item is **Class A/B/D**: additive, default-off / default-0 / default-`mu_best`, or audit-only.
A Batch-1 mechanism may **AUDIT / log / halt-notify**, but it **NEVER silently re-decides which candidates
survive** a live run. Anything that would change a live run's survivors (active strategy, the #2b POST kill,
the #4 epoch bump, new #6 genes) is a **clean-restart / new-FREEZE event** and was deliberately NOT built.
The frozen P0/K8 trajectory is therefore **bit-identical** before and after this batch.

Frozen invariants confirmed untouched (FREEZE §2–3): the weights vector (1.0/1.0/0.1/0.0), the per-cell
non-inferiority VETO, the parity test (δ=0.05, α=0.05), and the TEST-set hash — all live in
`src/config.mjs`, which has an **EMPTY git diff**. The frozen apparatus tree (`studies/build-gap`,
`epics/workspace`, `epics/scale-d1`) is **untouched** (empty diff).

## The six gleanings — per-item roll-up

| # | Gleaning | Engine module (additive) | Gate / self-test | What FIRED (provably) | Freeze posture | Record |
|---|----------|--------------------------|------------------|------------------------|----------------|--------|
| **#5** | aggregate-consistency lint (worst-of-K is the single decision aggregate) | `src/aggregate-consistency.mjs` | `gates/aggregate-consistency.mjs` — **18/18** | Static enumeration classifies every K-reducer tree-wide (unregistered reducer → fail); AND-fold is worst-of-K; archive lethal-veto rejects best-replicate-passes-but-worst-drops; planted fail-open `rate()` in a decision file → hard error | Class A/B — enforces the **already-frozen** aggregation; touches no invariant. Surfaced + fixed **2 fail-open `rate():1` footguns** (`routed-baseline.mjs`, `gen-test-set.mjs`) → fail-CLOSED | [`GLEANING5-RESULTS.md`](GLEANING5-RESULTS.md) |
| **#2a** | gaming-risk register | (none — documentation) `GAMING-RISKS.md` | n/a (no new gate; every cited GREEN gate + file confirmed to exist) | Consolidated risk×mitigation×enforcer×status table; each "enforcer" cell points at a real, passing gate. **Row-7 accuracy fix applied this sweep**: proposer is oracle-blind **by construction** (count-only digest), NOT a "parallel scan" | Class A — documentation only; no code path | [`GAMING-RISKS.md`](GAMING-RISKS.md) |
| **#2b PRE** | per-candidate "broken-eval" verifier (epoch-relative CORE) | `src/pre-verifier.mjs` (+ inert wiring in `src/worker.mjs`) | `gates/pre-verifier-smoke.mjs` — **25/25** | `assertFresh`/`assertFullCore` THROW typed `PreVerifierError` on a stale/cached scorecard or a silently subsetted / extra / under-K CORE battery; **INERT by default** (no `expectedCore` → frozen synthetic path bit-identical); live throw only when caller declares the epoch's CORE | Class B/D — PRE only catches BROKEN evals (already §4.5 hard-fail). POST score-repro is Batch 2 (NOT built) | [`GLEANING2B-PRE-RESULTS.md`](GLEANING2B-PRE-RESULTS.md) |
| **#1** | measurement-axis check + pre-P3 proxy→real hard gate | `src/axis-check.mjs` | `gates/axis-check.mjs` — **21/21**; `gates/pre-p3-axis-gate.mjs` → **BLOCKED (expected)** | Plateau detector fires on a planted plateau, no false positives; in-loop observer is a pure **bit-identical** side-effect (writes nothing to survivors); **K8 planted-positive discriminator** holds (anti-abandonment — a disappointing-but-correct front cannot be called "wrong axis"); the pre-P3 gate reports BLOCKED by **real-artifact detection** (2/3 prereqs absent), not a hardcode | Class B — in-loop = report-only (plateau→halt→report), never re-decides survivors. Trigger (b) reclassified as a **hard pre-P3 BLOCKER** (inert until measured-INTEG exists) | [`GLEANING1-AXIS-RESULTS.md`](GLEANING1-AXIS-RESULTS.md) |
| **#3** | frontier strategy registry scaffolding | `src/strategy-registry.mjs` | `gates/strategy-registry-smoke.mjs` — **23/23** | `mu_best` is **bit-identical** to the frozen default (the equality test is shown discriminating); `pareto_per_cell` is distinct / deterministic / specialist-preferring; **selection ≠ survival** — the insertion VETO still rejects a lethal drop AFTER selection ran (selection never touches the veto); ablation set frozen to exactly `{mu_best, pareto_per_cell}` (no stochastic-strategy RNG confound) | Class C scaffolding, default `mu_best` → bit-identical. **Active** strategy = clean-restart only (Batch 2) | [`GLEANING3-STRATEGY-RESULTS.md`](GLEANING3-STRATEGY-RESULTS.md) |
| **#4** | eval-epoch stamping + trigger doc (re-sequenced into Batch 1) | `src/eval-epoch.mjs` (+ 1-line stamp wiring in `p0`/`p1`/`p2b-sweep`/`p2c-search`) | `gates/eval-epoch-smoke.mjs` — **33/33** | `stampEpoch`/`stampEach` add a **constant `eval_epoch=0`** metadata field (non-mutating; default → bit-identical); `filterCurrentEpoch` drops prior epochs / no-ops at the current one; `bumpEpoch` is **inert** (throws — reserved to Batch 2); a written driver summary carries the stamp on read-back (`runs/p0-summary.json` reads `eval_epoch=0`) | Class D — stamp is metadata-only, read by no decision/loop/archive/scorecard → never re-decides survivors. The **bump operation** = Batch 2 (new FREEZE record). `EVAL_EPOCH` lives in `src/eval-epoch.mjs`, NOT in frozen `config.mjs`. Trigger doc: [`EVAL-EPOCH-PROTOCOL.md`](EVAL-EPOCH-PROTOCOL.md) | [`GLEANING4-EPOCH-RESULTS.md`](GLEANING4-EPOCH-RESULTS.md) |

(#6 literature-ideator is **Batch 2** — out-of-band proposal machinery, fires on K1/K4, admission clean-restart-only. NOT built.)

## Combined sweep over the MERGED tree (run this session)

### Frozen apparatus — P0 GREEN 5/5 (exit 0)

```
node studies/meta-search/p0.mjs   →   P0 BLOCKING GATES: 5/5 passed → GREEN
```
- **G0** freeze-consistency — weights/parity/K-budgets/anchor-pins all match the frozen config.
- **G1** per-cell metric wiring — mut drops exactly 1 lethal cell, veto rejects it, digest leaks no cell names, reliability scalar matches hand-computed `0.931973`.
- **G2** oracle kill-rate — reference NOT killed; kill-rate crosscut 1.000 (10/10), integration 1.000 (6/6) — both ≥ K6 (0.90).
- **K8** planted-positive rediscovery — **29/30 (97%)** pinned seeds within ≤8 gen / ≤300 evals + in-loop veto fires. (Matches the pre-batch documented K8 value → **trajectory bit-identical**.)
- **§14** autonomy round-trip — checkpoint→resume DETERMINISTIC (evalCount U=175 R=175, fronts match); watchdog trips on a planted hang and halts-to-checkpoint with a notification.

### Full gate suite — every standalone self-test

| Gate | Result | Exit |
|------|--------|------|
| `gates/aggregate-consistency.mjs` (#5) | **18/18 PASS** | 0 |
| `gates/pre-verifier-smoke.mjs` (#2b PRE) | **25/25 PASS** | 0 |
| `gates/axis-check.mjs` (#1) | **21/21 PASS** | 0 |
| `gates/strategy-registry-smoke.mjs` (#3) | **23/23 PASS** | 0 |
| `gates/eval-epoch-smoke.mjs` (#4) | **33/33 PASS** | 0 |
| `gates/pre-p3-axis-gate.mjs` (#1) | **BLOCKED — 2/3 prereqs unmet** (EXPECTED) | 1 |
| `gates/label-draw-selftest.mjs` (Phase −1) | **11/11 PASS** | 0 |
| `gates/phase-neg1-manifest.mjs` (Phase −1) | **14/14 PASS** | 0 |

**Sibling lever / instrument gates — no regressions:**

| Gate | Result | Exit |
|------|--------|------|
| `gates/p1-smoke.mjs` | PASS | 0 |
| `gates/p2a-smoke.mjs` | PASS | 0 |
| `gates/p2c-credit.mjs` | PASS | 0 |
| `gates/p2c-map-elites.mjs` | PASS | 0 |
| `gates/p2c-surrogate.mjs` | PASS | 0 |
| `gates/contract-gate-smoke.mjs` | 26/26 PASS | 0 |
| `gates/shape-gate-smoke.mjs` | 32/32 PASS | 0 |
| `gates/seam-gate-smoke.mjs` | 22/22 PASS | 0 |
| `gates/repair-gate-smoke.mjs` | 18/18 PASS | 0 |
| `gates/persistence-gate-smoke.mjs` | 33/33 PASS | 0 |

> **`pre-p3-axis-gate.mjs` BLOCKED (exit 1) is the correct, designed outcome**, not a failure. It refuses to
> let P3 (sequestered-TEST scoring of the frozen winner) proceed while the headline is still proxy-bound
> (opus-whole / X-CUT / unmeasured-INTEG). It detects the 2 missing prerequisite artifacts by real
> filesystem inspection (`routed-all-frontier-baseline`, `measured-integ-path`); the no-hardcode property
> holds in both directions (injecting the artifacts flips it to READY). It auto-flips when the future
> `*-settled.json` markers land — none exist today, so BLOCKED is honest.

## Scope / freeze verification (HARD requirements — all met)

- `git diff -- studies/meta-search/src/config.mjs` → **EMPTY** (frozen file untouched).
- `git diff -- studies/build-gap/ epics/` → **EMPTY** (frozen apparatus tree untouched).
- Tracked-file edits = ONLY: the 4 eval-epoch driver stamps (`p0`/`p1`/`p2b-sweep`/`p2c-search`, each +import +1 wrapped write line), the #2b-PRE inert `worker.mjs` wiring, the #5 fail-closed `rate()` hardenings (`gen-test-set.mjs`, `routed-baseline.mjs`), and `DESIGN.md` documentation. New engine modules + gates + RESULTS records + `GAMING-RISKS.md` + `EVAL-EPOCH-PROTOCOL.md` are additive untracked files.
- Eval-epoch wiring confirmed isolated to the 4 named drivers (tree-wide grep): `filterCurrentEpoch`/`bumpEpoch`/`epochOf`/`EVAL_EPOCH` are referenced ONLY in the engine + its own gate — fully UNWIRED from any live survivor path.

## One accuracy fix applied during this sweep

The #2a per-item verifier flagged a minor, non-blocking accuracy defect in `GAMING-RISKS.md` row 7
(Oracle/test-set leakage): the enforcer cell cited "the parallel scan in `src/proposer.mjs`", but
`scanOracleLeak` exists **only** in `src/checker.mjs` (verified tree-wide) — the proposer is oracle-blind
**by construction** (it is only ever shown a count-only quadrant digest with no cell/seam/oracle names,
`proposer.mjs:1-12`), not via a token scan. Reworded to describe the real mechanism. This is a
documentation-table correction (Class A); no code path, gate, or invariant is affected, and all gates remain
green after the edit.

## Standing posture

- **The apparatus is UNCOMMITTED.** The user has not asked to commit. All Batch-1 work sits as uncommitted
  state in the MAIN working tree on top of the prior uncommitted #5 / Phase −1 / lever work.
- **Batch 2 remains clean-restart-gated** and was NOT built: active strategy ablation (`mu_best` vs
  `pareto_per_cell`), the #2b POST score-reproducibility kill (audit→kill), the #4 eval-epoch **bump**
  operation (a restart event + a new FREEZE record / new pre-registration), and the #6 literature-ideator.
  Cross-cutting rule (DECISION-BRIEF §"Cross-cutting"): **at most one trajectory-perturbing change per
  clean-restart epoch**; never co-batch active-strategy + epoch-bump + new-gene + POST-kill; label every
  trace `(eval_epoch, strategy)`; never read plateau evidence across mixed strategies or mixed epochs.

**Bottom line:** Batch 1 complete. P0 GREEN 5/5. All eight Batch-1 / Phase −1 self-test gates pass
(the pre-P3 gate correctly BLOCKED), zero sibling-gate regressions, no frozen invariant touched, frozen
P0/K8 trajectory bit-identical.
