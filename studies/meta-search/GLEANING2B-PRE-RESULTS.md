# Gleaning #2b PRE — per-candidate "broken-eval" verifier — BUILT + GREEN (2026-06-19)

> Batch-1 item #3 from the disposition of [`EVO-GLEANINGS-PLAN.md`](EVO-GLEANINGS-PLAN.md)
> (codex×opus CONVERGED, `runs/deliberations/20260619T220547Z/DECISION-BRIEF.md`). #2b = ADOPT WITH CHANGES:
> *"2b PRE now, with CORE defined EPOCH-RELATIVE (at P1, CORE = the 2 anchor epics, else it false-fails)."*
> PRE is conservative/audit-grade — it only catches BROKEN evals (already §4.5 hard-fail territory) — so it is
> freeze-safe NOW. POST score-reproducibility is **Batch 2** and was NOT built here.

## What was built

- **`src/pre-verifier.mjs`** (NEW) — the broken-eval guard engine. Exports:
  - **`assertFullCore(scorecard, expectedCore, { minK = 1, runsByEpic = null })`** — asserts the scorecard
    covered **EXACTLY** the declared frozen CORE-of-record for the current epoch: the set of `perEpic` keys ===
    the `expectedCore` set (no silent **SUBSET** → `missing`, no **EXTRA**/undeclared epic → `extra`), and each
    epic carries `>= minK` worst-of-K runs (`underK`). Returns `{ ok, missing:[], extra:[], underK:[] }`. An
    empty/null `expectedCore` is itself a broken request → throws `no-core-declared`.
  - **`assertFullCoreOrThrow(...)`** — thrower variant; throws a typed `PreVerifierError` (`kind:'subsetted-eval'`)
    on any subset/extra/under-K violation. This is the §4.5 hard-fail surface.
  - **`assertFresh(scorecard)`** — asserts the eval **ACTUALLY EXECUTED** (not a stale/cached/empty scorecard):
    `perEpic` non-empty, every epic carries a real bucket footprint (a `buckets` map with finite `{pass,total}`),
    and `harnessFailRate` is a computed finite number in `[0,1]`. Returns `{ ok, reason }`.
  - **`assertFreshOrThrow(...)`** — thrower variant (`kind:'stale-eval'`).
  - **`runPreVerifier(scorecard, expectedCore, opts)`** — runs fresh-first then full-CORE; throws on the first
    violation. `isPreVerifierError(e)` distinguishes a broken-eval hard-fail from an unexpected crash (mirrors
    the watchdog `__watchdogTrip` tag convention already used in `loop.mjs`).

- **WIRE into `src/worker.mjs`** (the only edit to an existing file; additive + **INERT BY DEFAULT**) —
  `evalGenome(genome, ctx)` now accepts an optional `ctx.expectedCore` (and `ctx.minK`). When `expectedCore` is
  **provided**, the built scorecard is run through `runPreVerifier` (with `runsByEpic` derived from the eval
  backend's per-epic `runs.length`) and a typed `PreVerifierError` is **THROWN** on any violation. When
  `expectedCore` is **ABSENT**, the verifier does nothing → the frozen P0/K8 synthetic path (and the P1/P2c/loop
  callers, none of which pass `expectedCore`) is **BIT-IDENTICAL** to before this wiring.

- **`gates/pre-verifier-smoke.mjs`** (NEW) — the self-test, **every assertion layer shown to FIRE**:
  - **A.** SUBSETTED eval (ran 1 of 2 declared CORE epics) → `missing=[scale-d1]`, throws `subsetted-eval`.
  - **B.** EXTRA/undeclared epic graded → `extra=[rogue-epic]`, throws `subsetted-eval`.
  - **C.** an epic with too-few K runs (`minK=2`, ran 1) → `underK=[scale-d1]`, throws; and the **same card
    passes at `minK=1`** (the floor is the lever, not an accident). **C2.** a zero-footprint/cached epic trips
    under-K even with NO `runsByEpic` map (structural-footprint fallback).
  - **D.** stale/empty `perEpic`, an epic with no `buckets` map, no finite bucket counts, and a non-numeric /
    out-of-range `harnessFailRate` all fail `assertFresh`; `assertFreshOrThrow` throws `stale-eval`. **D2.** an
    empty/null declared core throws `no-core-declared`.
  - **E.** NO-FALSE-POSITIVE — a correct full-CORE fresh scorecard passes BOTH; `runPreVerifier` does not throw;
    a legitimate **1-epic pilot passes ITS declared core** (proves CORE is epoch-relative, not hard-coded).
  - **F.** WORKER WIRING — `evalGenome` on the synthetic backend with **no** `expectedCore` returns the normal
    scorecard (same `genomeHash`, finite reliability, same `perEpic` keys = inert); a deliberately-**subsetting**
    evaluator **WITHOUT** `expectedCore` does **not** throw (guard is opt-in); the **same** subset **WITH**
    `expectedCore` **throws** `subsetted-eval` (live when asked); a complete eval **WITH** a matching
    `expectedCore` does **not** throw (no false §4.5 hard-fail).

  **Status: 25/25 PASS, exit 0.**

## What fired

Every planted violation tripped its intended layer and the no-false-positive cases passed:

| Layer | Planted violation | Fires as |
|---|---|---|
| `assertFullCore` | ran 1 of 2 declared CORE epics | `missing` + `subsetted-eval` throw |
| `assertFullCore` | undeclared `rogue-epic` graded | `extra` + `subsetted-eval` throw |
| `assertFullCore` | `minK=2`, epic ran 1 run | `underK` + `subsetted-eval` throw |
| `assertFullCore` | zero-footprint/cached epic, no `runsByEpic` | `underK` (structural fallback) |
| `assertFullCore` | empty/null `expectedCore` | `no-core-declared` throw |
| `assertFresh` | empty / no-buckets / no-finite-counts / bad-rate scorecard | not-fresh + `stale-eval` throw |
| worker wiring | subsetting evaluator + `expectedCore` | `evalGenome` throws `subsetted-eval` |
| no-false-positive | full-CORE fresh card; 1-epic pilot; inert (no `expectedCore`) | all PASS, no throw |

## Epoch-relative-CORE rationale (the binding disposition delta)

The plan-as-written would have hard-coded the CORE as "all anchor epics." The deliberation flagged that a
hard-coded 2-epic core **false-fails** any path that legitimately runs fewer epics — the synthetic K8 fixture
(1 epic, `synthA`), the live smoke (1 epic), and any pilot. So CORE is **never hard-coded in the verifier**: the
**caller** passes `expectedCore` for the current epoch. At **P1** the caller passes `config.P1_ANCHOR_EPICS`
(= `['workspace','scale-d1']`); a 1-epic pilot/smoke passes its own declared core. The verifier asserts only
the *equality of the graded set to the declared set* — it has no opinion about which epics the epoch *should*
contain, which is the freeze record's job, not the guard's.

## Freeze posture

- **Class B audit-grade, freeze-safe NOW.** PRE catches only **broken** evals (silent subset / stale-or-empty
  scorecard / under-K battery) — all already §4.5 hard-fail territory. It never reads the `cells` channel, never
  reads a bucket's *semantics*, and never re-decides which candidates **survive**: a broken eval throws (hard
  fail), a complete eval passes through unchanged. It cannot silently alter a live run's survivor set.
- **Default-OFF / bit-identical.** The wiring is inert unless the caller declares `expectedCore`. No current
  caller (`loop.mjs`/`p1.mjs`/`p2c-search.mjs`/`credit.mjs`/`smoke-live.mjs`) passes it → the frozen P0/K8
  trajectory is **BIT-IDENTICAL**. **P0 GREEN 5/5** confirms this (G0/G1/G2/K8 29/30/§14 all pass with the
  worker edit in place).
- **No frozen invariant touched.** `git diff -- src/config.mjs` is **EMPTY**; `studies/build-gap/**` and
  `epics/**` are untouched. The aggregate-consistency lint (Batch-1 #5) is **still GREEN 18/18** — the verifier
  introduces no unclassified K-reducer (its structural-footprint checks were written to avoid the lint's
  reducer-token patterns rather than re-aggregate over the K axis; the enumeration count returned to 336/336).
- **POST is deferred to Batch 2** (per the disposition): re-run a surviving candidate's eval on a fresh seed set
  and require the worst-of-K to reproduce within the K-run noise band (2× worst-of-K SE). As a **mid-run kill**
  it changes survivors → clean-restart only, and its re-eval cost is **charged to the K5 budget** (run once at
  the phase boundary over survivors × K × 2 epics, never per-generation). **NOT built here.**

## Honest limitation

`assertFullCore`'s under-K check is precise when the caller supplies a `runsByEpic` map (the worker derives it
from the eval backend's per-epic `runs.length`, so the worker surface is exact). When `runsByEpic` is absent,
`assertFullCore` falls back to a **structural** footprint signal (a populated bucket map ⇒ "≥ minKFloor runs")
which catches a zero-run/empty/cached epic but cannot distinguish "ran 1 of a required 3" from the scorecard
alone — because `buildScorecard` collapses the raw `runs[]` array into worst-of-K and does not retain the K
count. This is why the worker passes `runsByEpic` explicitly. A standalone audit over a scorecard with no
backend context inherits the weaker structural guarantee — sufficient for the freeze-safe "broken-eval" bar,
not a substitute for the backend-supplied K count.
