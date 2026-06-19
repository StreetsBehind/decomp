# Phase −1 — TWO-AXIS variance characterization: results & block-B handoff

> Pre-committed plan + GO/HALT rule: `RUN-FOR-DAYS-PLAN.md` (do **not** re-derive or soften them here — this
> doc only records what was built, what the instruments report, and the numbers). Program spec:
> `COEVOLUTION-SPEC.md`. The metric, statistic, and label definitions are frozen by the four deliberations.

## What this gates
Whether to GO to building the multi-day MAP-Elites search (Phase 0+) or HALT. The decision is **not made in a
single session**: Phase −1 spans two temporally separated blocks by design, because the multi-day run lives in
*between-session* pool drift, and measuring that drift is the whole point. **Block A = built the instruments +
ran the first block. Block B = a later session/day; then apply the GO/HALT rule.**

---

## 1. Instruments built (all GREEN before any block ran) — the gate-critical precondition

The generalized `rate()` lesson: *a guard that cannot be SHOWN to fire is treated as ABSENT.* So the
instruments are validated by planted fixtures, not assumed.

| Instrument | File | Status |
|---|---|---|
| Replay-anchored residual labeler | `src/label-draw.mjs` | ✅ |
| Gate-critical labeler accuracy self-test | `gates/label-draw-selftest.mjs` | ✅ 9/9 |
| Check-of-checks manifest (Phase −1 subset) | `gates/phase-neg1-manifest.mjs` | ✅ 14/14 |
| Two-axis characterization harness | `phase-neg1.mjs` | ✅ (mock-smoked, live-probed) |

### 1a. The labeler (`src/label-draw.mjs`) — labels by REPLAY OUTCOME, not regex
Five buckets, anchored to whether a replay **actually moves the grade** (≥1 lethal bucket improves, 0
regressions):
- **PASS** — raw already 100/100.
- **det-form-repairable** — the DETERMINISTIC stack (route-back OFF) moves it. Route-luck-free; strongest GO-side.
- **model-route-back-only** — deterministic does not, but the REPLICATED (r≈3) model route-back moves it in a
  MAJORITY of reps. *A single lucky route-back cannot mint this label* (route-luck guard). GO-side, but records
  the per-rep spread (the repair-route axis).
- **route-incompetence** — below the parse∧export∧smoke floor (missing surface / free-id ReferenceError) AND no
  replay clears it. Re-draw is the only "fix" → inadmissible → HALT-side.
- **unresolved** — smoke-clean and failing, but nothing moves it. A NULL replay is **not** evidence of
  unrepairability → **human adjudication, NEVER auto-(C)**. The human promotes it to `form-unhandled` (GO-side,
  build the next lever) or `semantics-oracle-needed` ((C) boundary). The census regex is **demoted to
  `advisory` telemetry** — it only informs that human call, it never decides a bucket.

The model axis is INJECTED (`rebuildModel`), so the self-test drives it deterministically ($0) while live
Phase −1 passes the real free-gateway route-back. **The labeler doubles as the repair micro-arm** (it runs the
model stack r times and records the spread).

Self-test routing (all $0, gateway-independent): det-form (real q1-A/d2), PASS (q1-A/d3), route-incompetence
(q1-A/d4 `bio` free-id), unresolved+semantics-advisory (q1-A/d7), and — via corrupt-a-good-draw + a controlled
mock — model-route-back-only (mock-always-good), route-incompetence (mock-always-fail), and the **route-luck
guard** (1-of-3 success does NOT mint model-route-back-only). 9/9.

### 1b. Check-of-checks manifest (`gates/phase-neg1-manifest.mjs`) — 14/14 guards demonstrably FIRE
FAIL-canary→real red · PASS-canary→real green · empty/harnessError/timeout→0 (the hardened `rate()` path, no
fake 1.0) · `scanOracleLeak` fires on a leak in BUILD **and** REPAIR prompts (clean prompts pass) · a planted
FAKE (model-only) improvement is REJECTED by deterministic replay while a REAL (d2) one is accepted · the
labeler self-test passes · **`rateNum` audit** (below). The harness `phase-neg1.mjs` refuses to run a live block
unless this manifest is green.

### 1c. `coevo-rung1.mjs:306 rateNum` audit — confirmed DISPLAY-ONLY
- Every `rateNum(` call-site is inside `attribute()` (line 294); `attribute()`'s result → `agg.attribution` →
  **console/JSON only** (line 375). The verdict (line 365) uses the hardened `final.*.worst` (`relOf`→`rate`→
  `stat`) path. **`rateNum` is NOT in the grade/gate/verdict path** — the `b ? a/b : 1` default-to-pass footgun
  does not touch the Phase −1 metric.
- SECONDARY latent bug found: `rateNum` is called on already-numeric rates (`relOf` stores numbers, not `"a/b"`
  strings), so `String(0.25).split("/")` has no denominator → it **always returns 1** → `gateRecovers` is
  always false → the `SEAM_GATE_RESIDUAL` attribution note is dead code. Quarantined to attribution telemetry;
  superseded for Phase −1 decisions by the replay-anchored labeler. **Not patched** (frozen grade path left
  untouched per the plan).

---

## 2. B1 throughput probe (`runs/phase-neg1-probe.json`) — measured FIRST, per the plan

| sample | cell | surfaces | K | wall-clock | ~gateway calls | final |
|---|---|---|---|---|---|---|
| d1 | quota-d1 | 4 | 1 | **160.9 s/draw** | ~4 | c100/i25 |
| N=13 | membership-d3 | 13 | 1 | **254.1 s** | ~23 | c88/i66 |

The free gateway was running **slow** at probe time (~161 s for a single 4-surface draw vs ~67 s/draw during the
2026-06-19 census) — itself an instance of the non-stationarity the premise assumes. Extrapolation: block A
(3 reps × K8 × 3 d1 cells, sequential) ≈ **~3.5 h**. No "days" promise is made until evals/hour at K=8 is
observed across a full block (B1 / Q4 remain open until then).

---

## 3. Block A — first temporal block (build-draw axis, rep 1; + repair-draw micro-arm)

- **Cells:** quota-d1 + approval-d1 (gating) + membership-d1 (non-gating rider — disambiguates a uniform HALT;
  it never gates GO).
- **Config:** 3 reps/cell × K=8, full stack `--repairgate --shapegate --contractgate --persistgate --seamgate`,
  best-of-N OFF (not built), interleaved cell order, every draw `--dump`ed.
- **Within-block axis:** each rep → one worst-of-K (raw-min) post-stack value → within-block raw-min SD.
- **Repair-draw axis:** the labeler (live model route-back, r=3) on each cell's worst draw → repair-route spread
  + the replay-anchored bucket.
- **Output:** `runs/phase-neg1-A.json` (flushed after every rep), log `runs/phase-neg1-A.log`,
  dumps `runs/dump/phase-neg1-A/<cell>-rep<r>/`.

> **STATUS: block A COMPLETE** (2026-06-19, 129 min wall-clock, 9 cell-reps, ~38–61 gateway calls/rep,
> $0 free gateway). Within-block SD + repair-route spread + worst-draw labels below; the **block-to-block drift
> axis and the GO/HALT rule require block B** (a later session).

### Block A results
Worst-of-K = the post-stack **raw-min** (min final grade over K=8 draws) per rep; the binding/gating dimension at
d1 is **integration (i)**. Labels are the replay-anchored bucket of each cell's worst draw + the **live** repair
micro-arm (r=3 model route-back).

| cell | worst-of-K i by rep | SD_i | 2·SD_i | worst-draw final | LABEL (replay-anchored) | live micro-arm | advisory |
|---|---|---|---|---|---|---|---|
| quota-d1 | 0, 25, 0 % | 0.144 | **0.289** | c20/i0 | **route-incompetence** | 0/3 moved (i±0) | incompetence |
| approval-d1 | 25, 50, 50 % | 0.144 | **0.289** | c42/i25 | **route-incompetence** | 0/3 moved (i±0) | incompetence |
| membership-d1 (rider) | 100, 100, 0 % | 0.577 | **1.155** | c28/i0 | **unresolved** | 0/3 moved (i±0) | unknown |

Partial instability band (block A only — block-to-block drift deferred to block B):
`band_i = max(2·SD_i, repair-route spread)` = **quota 0.289 · approval 0.289 · membership 1.155** (repair-route
spread = 0 everywhere: the model route-back moved no worst draw). Crosscut 2·SD_c: quota 0.833, approval 0.571,
membership 0.329.

### Block A reading (NOT a GO/HALT — that needs block B)
1. **Both gating cells' worst draws are `route-incompetence`, and they are BELOW-FLOOR FORMAT HAZARDS** — quota's
   worst `createWallet` is a **prose reasoning blob** (the model narrated instead of emitting a module);
   approval's worst `approveRequest` is a **syntax error** (`export functionapproveRequest`, glued tokens). Both
   fail `validate-surface` (parse∧export). This is the plan's structural prediction made concrete: *worst-of-K=8
   is a min over an unbounded-below non-stationary pool → it trends to the worst route's incompetence by
   construction, absent a route-pool floor.* The current stack (repair[free-id]/shape/contract/persist/seam) does
   **not** touch a prose blob or a glued-token syntax error — there is no extraction / format-forcing / redraw
   lever in it yet.
2. **The self-repair lever did NOT generalize to these worst draws** — the live r=3 model route-back moved the
   grade in **0/3** reps for every cell. The 3 hand-picked deterministic dump-replays (free-id `bio` /
   `generateUniqueId`) proved a worst draw *can* move; this block shows the *worst-of-K* draw at K=8 is a
   different failure class (format hazard / prose blob) that the free-id repair gate does not address.
3. **Within-block instability is non-trivial**: 2·SD_i ≈ 0.29 on the gating cells and ≈ 1.15 on the rider (the
   rider swung 100/100/0 — one rep produced an all-incompetence worst draw). A real lever's effect must clear
   this band; on integration the gating cells sit near the floor (worst-of-K i ∈ {0, 25}).
4. **No (C) emitted, no statistic softened, no search wired** — exactly per the rule. The gating worst draws are
   `route-incompetence` (HALT-side), the rider is `unresolved` (human-adjudication-side). The instrument FIXED a
   real bug mid-flight: the first labeling pass mislabeled the gating worst draws `unresolved` because
   `floorStatus` checked only file-presence + smoke; it now also checks parse∧export (`validate-surface`), and
   the self-test gained two parse∧export cases (now 11/11). This is the value of running live before building.

**Implication for block B / the eventual GO/HALT.** If block B reproduces `route-incompetence`-pinned worst
draws on the gating cells, the disaggregated HALT routes to **the route-pool-FLOOR pre-registration USER call**
(Deliberation #1/#2 fork) — and the *kind* of residual matters for that call: these are **format hazards**
(prose blob / syntax error), which the binding premise + B6 place squarely in extraction / format-forcing /
bounded-redraw territory (a lever to BUILD, GO-side once the floor admits ≤N redraws), **not** a semantics (C)
wall. That is information for the user's floor decision, not a decision this harness may take.

---

## 4. Block B handoff — the next-session action

1. **Re-confirm instruments green** (cheap): `node gates/phase-neg1-manifest.mjs` (includes the labeler
   self-test). It must exit 0 — the harness enforces it anyway.
2. **Run block B** a *different session/day* (the temporal separation is the measurement):
   `node studies/meta-search/phase-neg1.mjs --block B` → `runs/phase-neg1-B.json`.
3. **Compute the full instability band + apply the PRE-COMMITTED GO/HALT rule** (RUN-FOR-DAYS-PLAN.md — do not
   re-derive):
   - band = `max(2×within-block SD, block-to-block raw-min drift, repair-route spread)`, conservative upper-CI.
   - **GO** iff (a real lever's effect > band) **AND** (the worst draw is repairable-form — `det-form-repairable`
     ∨ `model-route-back-only` ∨ human-adjudicated `form-unhandled`) **in BOTH blocks**.
   - **HALT**, disaggregated: raw-min unrankable → statistic is a **user win-condition call**;
     `route-incompetence`-pinned worst draw → the **route-pool-FLOOR pre-registration** (user) call;
     human-adjudicated `semantics-oracle-needed` → a genuine **(C)**. `form-unhandled` / `unresolved` are GO-side
     / build-the-next-lever, **never** auto-HALT, **never** auto-(C).
4. Until a clean GO: do **NOT** wire B4 (`src/genome.mjs`, `src/evaluator.mjs`), run MAP-Elites, soften the
   statistic, or emit (C).
