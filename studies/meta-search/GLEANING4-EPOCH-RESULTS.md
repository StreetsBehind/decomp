# Gleaning #4 — eval-epoch stamping + trigger doc — BUILT + GREEN (2026-06-19)

> Batch-1 item from the disposition of [`EVO-GLEANINGS-PLAN.md`](EVO-GLEANINGS-PLAN.md) (codex×opus
> CONVERGED, `runs/deliberations/20260619T220547Z/DECISION-BRIEF.md`). #4 = ADOPT WITH CHANGES +
> **RE-SEQUENCED**: *"split, and move the additive half into Batch 1 — `eval_epoch` integer stamped on every
> log/candidate (default 0 → bit-identical) + the pre-registered trigger doc are additive and must land
> before any long unattended run — you cannot retro-stamp logs you never tagged. Only the bump operation stays
> Batch 2 (= a restart event + a new FREEZE record, never an in-place amend)."* Class D — formalizes the
> existing "void rather than amend" discipline; touches **no** frozen invariant.

## What was built

- **`src/eval-epoch.mjs`** (NEW engine, additive). Exports:
  - `EVAL_EPOCH = 0` — the current/default epoch. Lives HERE, **NOT** in the frozen `src/config.mjs`.
  - `stampEpoch(record, epoch = 0)` — returns `{ ...record, eval_epoch: epoch }` (a shallow copy; non-mutating;
    rejects null/non-object/array/negative/non-integer). A **constant** field that **no decision reads** → the
    default trajectory is **bit-identical**.
  - `stampEach(records, epoch = 0)` / `epochOf(record)` — helpers (stamp an array of per-candidate records;
    read the stamped epoch, legacy/un-stamped → 0).
  - `filterCurrentEpoch(records, epoch = 0)` — the frontier/best/WIN epoch filter (excludes prior-epoch nodes).
    A strict **NO-OP** at epoch 0 with all-epoch-0 nodes. **Scaffolding for the Batch-2 bump; deliberately NOT
    wired into the live archive** (wiring would touch the P0-imported `archive.mjs` → §14/K8 risk).
  - `bumpEpoch(...)` — an **INERT, GUARDED stub that THROWS** "...Batch-2 clean-restart event requiring a new
    FREEZE record + candidate-independent defect fixture + 2nd-oracle confirmation (see EVAL-EPOCH-PROTOCOL.md)".
    Mutates nothing; the real bump is Batch 2.
- **Driver-summary STAMPING** (additive field only, minimal import + one `stampEpoch(...)` wrap each):
  - `p0.mjs` → `p0-summary.json` (top-level).
  - `p1.mjs` → the three `p1-{pilot,probe,full}-summary.json` (via the shared `writeSummary`).
  - `p2b-sweep.mjs` → `p2b-sweep.json` (top-level) **+ per-candidate `rows`** (`stampEach`).
  - `p2c-search.mjs` → `p2c-search.json` (top-level) **+ per-result `results`** (`stampEach`).
- **`EVAL-EPOCH-PROTOCOL.md`** (NEW) — the pre-registered trigger doc: legitimate triggers (score-formula bug;
  held-out/2nd-oracle systematic gaming; instrumentation/oracle drift = a K6 regression) vs NON-triggers (a
  disappointing-but-correct front = K1, **never** a bump); the minimum bump evidence (candidate-INDEPENDENT
  reproducible defect fixture + 2nd-oracle lethal-bucket confirmation); the peek-then-redraw loophole + how the
  evidence bar closes it; that a bump = a NEW FREEZE record (mirrors §11). References the grader-bug history.
- **`gates/eval-epoch-smoke.mjs`** (NEW gate, every layer shown to fire).

## Stamping touch-points (where the field lands)

| Driver | File written | Top-level stamp | Per-candidate-record stamp |
|---|---|---|---|
| `p0.mjs` | `runs/p0-summary.json` | ✅ | (gates array — aggregate, not per-candidate) |
| `p1.mjs` | `runs/p1-{pilot,probe,full}-summary.json` | ✅ (via `writeSummary`) | runs[] are per-seed aggregates; the per-candidate `cands` are not persisted at this level |
| `p2b-sweep.mjs` | `runs/p2b-sweep.json` | ✅ | ✅ `rows` (per-cell) via `stampEach` |
| `p2c-search.mjs` | `runs/p2c-search.json` | ✅ | ✅ `results` (per-seed/N) via `stampEach` |

Each driver edit is exactly **import + one `stampEpoch(...)` wrap** (2 changed lines). `config.mjs`,
`archive.mjs`, `loop.mjs` internals are **untouched** — per the spec's freeze-safety note, stamping is done
at the **driver level**, so the §14 autonomy-roundtrip / K8 bit-identical trajectory is unaffected.

## What fired (gate self-validation — a check that can't be shown to fire is ABSENT)

`node gates/eval-epoch-smoke.mjs` → **33/33 PASS, exit 0.** Every layer demonstrably fires:
- **A.** `stampEpoch` adds `eval_epoch=0` (default) / `=1` (on request), **does not mutate** the input, adds
  **exactly one key**, and two default stamps are **value-identical** (the bit-identical-field proof).
- **B.** `filterCurrentEpoch` is a **strict NO-OP** at epoch 0 (membership + object identity preserved) and
  **DROPS prior-epoch (0) nodes** when filtering a mixed 0/1 archive to epoch 1.
- **C.** `bumpEpoch` **THROWS** (message references `Batch-2`, `EVAL-EPOCH-PROTOCOL.md`, `FREEZE record`), and
  `EVAL_EPOCH` is **still 0** after attempted bumps (inert — mutated nothing).
- **D.** END-TO-END: a stamped driver-summary **written to disk and read back** carries `eval_epoch` (both a
  P0-shaped summary and a p2b-shaped summary with stamped `rows`).
- **E.** input guards fire (null / non-object / array / negative / non-integer epoch all rejected).
- **F.** discriminator: the gate machinery provably registers a failure on a false probe (so the green is real).

**Real-driver proof:** after `node p0.mjs`, `runs/p0-summary.json` on disk reads back `eval_epoch = 0` — the
touch-point fires on the live driver, not just on a mirror in the gate.

## Frozen apparatus re-validated

- `node p0.mjs` → **P0 GREEN 5/5** (G0 freeze-consistency, G1 per-cell metric+veto, G2 oracle kill-rate
  1.000/1.000, **K8 29/30 ≥0.90** within ≤8gen/≤300evals + in-loop veto, **§14 autonomy round-trip
  deterministic** + watchdog halt). Unchanged from pre-edit — the constant stamp perturbs no decision.
- `node gates/aggregate-consistency.mjs` → **18/18** (prior Batch-1 #5 still green; the new `eval-epoch.mjs`
  reducers `.map`/`.filter` classify benign — no unclassified K-reducer introduced).
- `node gates/label-draw-selftest.mjs` → 11/11; `node gates/phase-neg1-manifest.mjs` → 14/14.

## Freeze posture (honest)

Additive / bit-identical / audit-only (Class A/D). The stamp is a **constant metadata field no decision
reads** → the frozen P0/K8/§14 trajectory is **bit-identical**; `src/config.mjs` and the frozen apparatus tree
(`studies/build-gap`, `epics/`) are **untouched** (`git diff -- src/config.mjs` empty). `filterCurrentEpoch`
is inert at epoch 0 and **unwired**. The **bump operation is deferred to Batch 2** as a NEW FREEZE record —
`bumpEpoch()` throws, there is no in-place amend path. Both halves of the loophole-closure (candidate-
independent fixture + 2nd-oracle confirmation) are **documented, not coded**: the candidate-independent defect
fixture and the 2nd-oracle (ORACLE2) confirmation are prerequisites the Batch-2 bump will require, recorded in
`EVAL-EPOCH-PROTOCOL.md`.

### Honest limitation
The stamp is metadata only; nothing in Batch 1 *acts* on `eval_epoch` (by design — `filterCurrentEpoch` is
unwired, `bumpEpoch` throws). Its value is purely that future long-run logs are partitionable by epoch the day
a defect is confirmed. The peek-proof guarantee rests on the **discipline** documented in the protocol (the
evidence bar), not on a code-enforced gate — enforcing the bar in code is a Batch-2 concern, gated on the 2nd
oracle existing. The p1 `cands` (true per-candidate records) are not persisted at the driver-summary level, so
they inherit the epoch only via the summary that aggregates them; per-candidate stamping there would require
touching the in-loop record assembly (out of scope — additive driver-level stamping was the spec).
