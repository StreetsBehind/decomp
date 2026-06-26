# LADDER RUNBOOK — full-stack hybrid worst-of-K=8 across the 17-cell DEV ladder

> **▶ SESSION-10 UPDATE (2026-06-26) — the stack now carries Lever A + Lever B + option 3; this is the
> Rule-2-VALID (C) adjudication ladder.** Since the Session-8 run the stack gained: **Lever A** (deterministic
> container-recon, already inside `--seamgate`), **Lever B** (`--semantic` — the semantic-obligation verify+repair
> for approve→execute/idempotency + conservation), and **option 3** (`--behavioural` — Lever B's behavioural
> verify, admissible-under-constraints per `runs/deliberations/20260626T040021Z/`). The $0 conditioned diagnostic
> ([`LEVER-B-DIAGNOSTIC.md`](LEVER-B-DIAGNOSTIC.md)) established a **variance-robust (C)-leaning at deep approval
> cells** (d3/d4 fail the approval semantic obligation unanimously across the zoo under maximally-sensitive
> admissible enforcement) with **(B) traction at approval-d2** (depth-graded → SCOPE-SHRINK, never KILL). **This
> ladder is the FORMAL adjudication of that (C)-leaning vs the SETTLED baseline** (Rule 2's inferior-vs-baseline
> test). Run it with `--semantic --behavioural` (the command below is updated). Pre-registered reading in
> "After the run". Frozen tree untouched; the new flags default OFF = byte-identical.

> **Turnkey handoff (prepared 2026-06-20; command updated 2026-06-26).** Everything below is wired, mock-verified,
> and committed. This is
> the program's **progress metric toward freeze-readiness**: does the full model-agnostic output-QA stack make
> the hybrid's worst-of-K **per-cell non-inferior** to the SETTLED routed all-frontier baseline across the
> whole ladder? Run it, read the rollup, classify the residuals (A/B/(C)), decide the next lever or a (C)
> scope-shrink. **The hybrid arm is $0** (free gateway); the baseline is already measured — so this run costs
> **no money**, only time.

## The command

```
node studies/meta-search/coevo-rung1.mjs --ladder \
  --repairgate --shapegate --contractgate --obligation --bestofn 3 --seamgate --semantic --behavioural \
  --floor --retry 3 \
  --k 8 --out coevo-ladder-stack-B.json --dump studies/meta-search/runs/dump-ladder-B
```

- `--ladder` = the full 17 cells (membership d1–d5, approval/lifecycle/quota d1–d4) — the SETTLED baseline's cells.
- The flags are the **full output-QA stack** in compose order: repair → shape → contract → **obligation
  (verify+repair, best-of-N=3 with the no-regress floor)** → seam (incl. **Lever A** container-recon) →
  **semantic (Lever B verify+repair)** with the **behavioural** verify (option 3) ON. Each gate grades an
  `after<Gate>` point (incl. `afterSemantic`) so every lever's worst-of-K delta is attributable.
- **`--semantic` (Lever B)** verifies+repairs the SEMANTIC obligations the obligation gate skips (approval
  approve→execute/idempotency; quota conservation/keyed-idempotency), derived from the PUBLIC skeleton. **`--behavioural`
  (option 3)** adds Lever B's behavioural verify (composes the candidate's own create→approve→execute, asserts
  the declared SoD + idempotency clauses) — required for a **Rule-2-VALID (C)** on approval (Rule 2(e):
  structural-only is not lever-menu-exhausted). The frozen oracle stays the sole success measure.
- **`--out`/`--dump` use the `-B` suffix** so this run does not clobber the Session-8/9 ladder artifacts.
- **`--floor` enforces the [`GROUND-RULES.md`](GROUND-RULES.md) Rule-1 route-pool floor** (pinned 2026-06-22):
  a draw is below-floor iff ≥1 required surface fails `parse∧export` (`validate-surface`) even after `--retry`
  re-sampling → it is **excluded from the worst-of-K**, the per-cell below-floor RATE is reported, and a cell
  with no admissible draw is tagged `POOL-DEGENERATE` (not a pass). Runtime crashes that parse+export stay
  ABOVE the floor (repair targets). **Extraction (the floor's other recovery lever) is unbuilt** → this run is
  the conservative **floor-without-extraction** first pass; extraction is named lever #1 in the GROUND-RULES
  Rule-3 time-box, built only if below-floor format hazards dominate the failing cells.
- `--retry 3` aligns the structural re-sampling with the pinned best-of-3 floor recovery (default is 2).
- `--k 8` matches the baseline's statistic (worst-of-K=8 across the route zoo = the model-agnosticism test).
- `--dump` saves each draw's raw surfaces for offline residual diagnosis ($0, optional).

> **Verdict now reads against GROUND-RULES.** Per-cell `PASS`/`FAIL` is non-inferiority vs the settled baseline
> (δ=0.05) over **admissible (above-floor) draws**; `POOL-DEGENERATE` cells route to the route-pool-floor
> finding; classify each failing cell's residual per GROUND-RULES Rule 2 ((C) only if above-floor ∧ smoke-clean
> ∧ semantic ∧ survives-the-stack-across-the-zoo ∧ lever-menu-exhausted). The rollup prints a `floor:` summary
> line (mean below-floor rate + the pool-degenerate cell list).

**Run it in the BACKGROUND** (`run_in_background: true`) — it flushes `runs/coevo-ladder-stack.json` after every
cell, so partial results survive an interrupt and you can watch progress.

### Cost & runtime (set expectations)
- **$0.** Cheap coding is the free gateway; the baseline comparator is already spent ($64.61, committed).
- **Long.** The two-topology K=4 probe ran ~10–13 min/cell; the full stack at K=8 over deeper cells with
  best-of-N route-backs is heavier — budget **roughly 6–15 hours** for all 17. **Stage it** if you don't want
  one long run: do a **depth row at a time** (replace `--ladder` with `--epics membership-d1,approval-d1,
  lifecycle-d1,quota-d1`, then the d2 row, …). Per-cell flush means you can also just resume the remaining
  cells with an explicit `--epics` subset. A cheaper first look: `--k 5` (still meaningful; the honest
  comparison to the K=8 baseline wants K=8).

## The comparator & the verdict

- Baseline = the **SETTLED** routed all-frontier worst-of-K=8 per-cell vector, loaded automatically (prefers
  `runs/routed-baseline-settled.json` if present, else the committed `baseline-settled-vector.json`). **It
  erodes** — only 7/17 cells are perfect (e.g. `lifecycle-d1 c0.8/i0`, `quota-d1 c1/i0.25`, `membership-d2
  c0.83/i0.5`). **The bar is this measured vector, NOT 100%** (the old K=1 100/100 values were a single-draw
  artifact; STATE.md Session-5).
- Per-cell verdict = **non-inferiority** with FREEZE δ=0.05: a cell PASSES iff `hybrid worst-of-K crosscut ≥
  baseline − 0.05` AND `hybrid worst-of-K integration ≥ baseline − 0.05`.
- The run ends with a **LADDER ROLLUP**: `NON-INFERIOR: X/17`, then per-cell `base → hyb (Δc Δi) [residual
  mode/class]`. `rollup.failing` in the JSON lists the cells that miss.

## What to expect (the residual partition the rung-1 probes already mapped)

The obligation lever + best-of-N is validated causal (OBLIGATION-CONTRACT.md). The remaining worst-of-K
residuals are NOT the obligation lever's — expect the rollup's failing cells to be dominated by:
- **shape-drift** (`is not a function`) → the `--shapegate` is in the stack; check `afterShape` actually moved
  it. If shape-drift survives, the shape gate needs depth (a lever-tuning target, still **(B)**).
- **approve→execute & conservation SEMANTICS** ("Request must be approved before execution", conservation
  arithmetic) → the genuine **(C)-boundary candidates**. The gates correctly never touch these. **Before
  calling any cell (C):** confirm best-of-N/extraction can't reach it (a worst route that gets the semantics
  right may exist in the zoo) — (C) is reserved for a gap that survives the *full* stack across routes
  ([[incompetence-is-the-target]]).
- **missing-draw** (a route emits no module) → extraction/best-of-N target (best-of-N already helps; extraction
  is the unbuilt lever).

⚠️ **Non-stationary gateway:** the route zoo varies run-to-run (mistral / nemotron / kimi / gemini-flash-lite).
worst-of-K=8 absorbs within-run variance, but a single ladder pass is a **snapshot** — a borderline cell can
flip on a re-run. For freeze, the co-measured head-to-head (`head-to-head.mjs --settled`) is the authoritative
instrument; this run is the **progress check** that tells you whether to keep building levers or move to freeze.

## Pre-flight (all currently TRUE — re-confirm in the new session)

1. Gateway up + $0: the P0 live-smoke line (`node studies/meta-search/p0.mjs` → "live gateway smoke OK") already
   proves it; or just start the run — it self-reports the route zoo per draw and `usd:0`.
2. Frozen instrument GREEN: `node studies/meta-search/p0.mjs` → 5/5, K8 29/30 bit-identical.
3. Lever smokes GREEN: `node studies/meta-search/gates/obligation-contract-smoke.mjs` (39/39),
   `node studies/meta-search/gates/best-of-n-repair-smoke.mjs` (12/12), **`gates/semantic-obligation-smoke.mjs`
   (24/24)** (Lever B), **`gates/behaviour-verify-smoke.mjs` (8/8)** (option 3, incl. the disk-deletion-invariance
   admissibility check), `gates/container-recon-smoke.mjs` (16/16) + `gates/seam-gate-smoke.mjs` (22/22) (Lever A).
4. Baseline present: `baseline-settled-vector.json` (committed) or `runs/routed-baseline-settled.json`.

## After the run

1. Write `LADDER-RESULTS-B.md`: the rollup (`X/17` non-inferior), per-cell Δ, and the residual class of each
   FAILING cell (form → which lever; semantics → (C)-candidate; missing-draw → extraction).
2. **Decide — the pre-registered approval-(C) read (the reason for this run):** the $0 diagnostic already showed
   approval **d3/d4** semantics fail unanimously across the zoo under the full stack + option 3 (Rule 2(e)
   exhausted). On this live ladder apply Rule 2's **inferior-vs-baseline** test: if **approval-d3/d4 are
   `worst-of-K < baseline − δ`** (the SETTLED baseline holds where the hybrid walls) → **SCOPE-SHRINK** (claim
   the win only on the topologies/depths that pass — `d2` retains (B) traction, so it is NOT a whole-class KILL).
   If the baseline ALSO erodes there (non-inferiority passes) → the cell is not a capability gap → **CONTINUE**.
   **KILL only if an ENTIRE obligation class/seam-family walls-and-is-inferior** (not the case — d2 holds).
3. **Other cells:** (a) form/missing failures → the next lever (shape-gate depth / extraction) — keep building
   **(B)**; quota conservation failures are the **(B) container-drift** class (Lever-B-inert; LEVER-B-DIAGNOSTIC.md),
   not (C). (b) any pure-semantics cell that survives the full stack+option-3 across routes AND is inferior →
   a **(C)** finding (scope-shrink).
3. Only when the hybrid is broadly non-inferior across the ladder do you **freeze** a champion and run the
   once-only co-measured head-to-head / sequestered TEST (COEVOLUTION-SPEC §6).

## Pointers

- **Apparatus:** `coevo-rung1.mjs` (the harness; `--ladder`, the full gate stack, the settled-baseline
  per-cell non-inferiority verdict + rollup), `src/{obligation-contract,best-of-n-repair,shape-gate,
  contract-gate,repair-gate,seam-gate,integration-gate}.mjs`, `baseline-settled-vector.json`.
- **Records:** `OBLIGATION-CONTRACT.md` (the lever + best-of-N + the causality/composed-stack results),
  `ROUTED-BASELINE.md` + `HEAD-TO-HEAD.md` (the settled baseline + the 0/17 falsification this is improving on),
  `COEVOLUTION-SPEC.md` (the program), `STATE.md` (Session-5 banner = authoritative status).
- **Memory:** `workflow-search-m5-fit` (follow-up 15 = this lever's full arc), `incompetence-is-the-target`,
  `model-agnostic-and-failure-attribution`.
- **Not yet wired (future increments):** the obligation **inject (A) half** (`injectBlock` — exported +
  smoke-tested, not in the build path; keeps `raw` comparable + needs the credit-module counterfactual); the
  `obligationContract` **genome node** (COEVOLUTION-SPEC §4 — wire + re-validate K6/K7/K8 only after the stack
  is broadly non-inferior); **extraction** (the unbuilt (B) lever for missing-draws).
