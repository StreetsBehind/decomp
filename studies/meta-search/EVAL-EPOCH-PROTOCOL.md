# EVAL-EPOCH PROTOCOL — pre-registered fitness/oracle-defect rebaseline (gleaning #4)

> Pre-registered BEFORE any long unattended run. The additive half (`eval_epoch` stamping, default 0,
> bit-identical) is BUILT now (Batch 1). The **bump operation** is **Batch 2** — a clean-restart event
> requiring a NEW FREEZE record, never an in-place amend. This doc is the binding trigger spec; it is
> documentation (Class A) and touches no frozen invariant.
>
> Disposition: `runs/deliberations/20260619T220547Z/DECISION-BRIEF.md` #4 (codex×opus CONVERGED).

## Why an eval-epoch at all — the grader-bug history

The co-evolution "rung-1 **92/92**" headline was a **grader bug** (`testsPath` undefined → a crashed grade
read a fake 100/100), and the void it caused forced an ad-hoc re-grade of all 12 cells
([[coevo-grader-bug-and-baseline]]; the same `rate()` fail-open footgun #5 hardened). The lesson the
disposition drew: **you cannot retro-stamp logs you never tagged.** If a RUN-FOR-DAYS produces thousands of
generation-logs / candidate-records under a fitness that is *later* found defective, there is no clean way to
partition "evidence under the good fitness" from "evidence under the broken fitness" unless every record was
stamped with the epoch it was scored under. So the stamp must land **before** the long run — hence #4 was
re-sequenced into Batch 1.

`eval_epoch` is the **disciplined form of FREEZE "void rather than amend"** (FREEZE §2 / §11 clean-restart).
A confirmed *fitness or oracle* defect → bump the epoch, exclude prior-epoch nodes from any frontier/best/WIN,
and re-freeze a corrected fitness as a NEW pre-registered run. It mirrors §11 (gene-admission = clean restart),
but for **fitness/oracle defects** rather than gene admission.

## What is BUILT now (Batch 1 — additive / bit-identical)

- `src/eval-epoch.mjs`:
  - `EVAL_EPOCH = 0` — the current epoch (default). Lives HERE, **not** in the frozen `src/config.mjs`.
  - `stampEpoch(record, epoch = 0)` — additive copy carrying `eval_epoch`. A **constant** field; **no
    decision path reads it** → the default trajectory is **bit-identical**.
  - `filterCurrentEpoch(records, epoch = 0)` — the frontier/best/WIN epoch filter (excludes prior-epoch
    nodes). At epoch 0 with all-epoch-0 nodes it is a strict **NO-OP**. **Scaffolding for the Batch-2 bump;
    deliberately NOT wired into the live archive** (wiring would touch the P0-imported `archive.mjs` and risk
    the §14/K8 bit-identical trajectory).
  - `bumpEpoch(...)` — **inert guarded stub that THROWS.** Mutates nothing. The real bump is Batch 2.
- Driver-summary STAMPING (additive field only): `p0.mjs` (`p0-summary.json`), `p1.mjs` (the three
  `p1-*-summary.json`), `p2b-sweep.mjs` (`p2b-sweep.json` + per-candidate `rows`), `p2c-search.mjs`
  (`p2c-search.json` + per-result `results`). Each edit is the minimal import + a `stampEpoch(...)` wrap on
  the JSON object written; `config.mjs`, `archive.mjs`, `loop.mjs` internals are untouched.
- `gates/eval-epoch-smoke.mjs` — every layer shown to fire (33/33).

## The bump is Batch 2 — and is a NEW FREEZE record, never an amend

A bump is a **survivor-/comparability-changing** event (it excludes prior-epoch nodes from WINs and forces a
fresh baseline re-measure). Per the cross-cutting rule, that is a **clean-restart-epoch event** (Class C,
§11/R2-10): at most one trajectory-perturbing change per restart epoch, and a bump co-batches with nothing
(never with active-strategy #3, a new gene #6, or a POST-kill #2b). The corrected fitness is re-frozen as a
**new pre-registration** with a **new FREEZE record**; prior-epoch results are excluded from any WIN claim.
`bumpEpoch()` therefore intentionally throws in Batch 1 — there is no in-place amend path.

## Pre-registered LEGITIMATE bump triggers (defect-based only)

A bump is authorized ONLY by a confirmed **defect in the fitness or oracle itself**:

1. **Score-formula bug** — the fitness mis-computes the score on a known-correct input (the literal grader-bug
   class: a crash/undefined path that fakes a pass, a fail-open `rate()`, a weight/veto wiring error). This is
   the void-92/92 family.
2. **Held-out / 2nd-oracle reveals systematic gaming** — the independent (2nd hand-authored) oracle shows the
   frozen fitness is being satisfied by candidates that do NOT actually meet the lethal-bucket obligation
   (a provenance/oracle-shaping leak the frozen oracle missed). Systematic, not a one-off.
3. **Instrumentation / oracle drift = a K6 regression** — the oracle's lethal-bucket kill-rate falls below the
   frozen K6 floor (0.90), i.e. the oracle stopped reliably detecting the very defects it grades. A measured
   K6 regression, not an intuition.

## NON-triggers (these are K1 — reported, NEVER a bump)

- **A disappointing-but-correct front** — the lever simply did not pay off, the cheap pool genuinely can't
  clear the bar, the search converged on a null. **That is K1** (reportable lower bound), full stop. Nulls and
  disappointing-but-correct fronts are **peek-proof**: they can never authorize a bump.
- A single candidate scoring lower than hoped; route luck; a noisy K=1 reading; an unmeasured-proxy caveat.
- "I peeked and the result is bad, so I want a redraw." — explicitly the loophole below.

## The peek-then-redraw loophole, and how the evidence bar closes it

The abuse path is: **peek → bad result → declare a "defect" → bump to escape the bad draw.** The closure is
that a bump trigger must be **defect-based, pre-registered, and the defect INDEPENDENTLY CONFIRMED without
reference to any candidate's score** — so a *score* you dislike can never, by construction, be the evidence.

**Minimum bump evidence (both required):**

1. A **candidate-INDEPENDENT reproducible defect fixture** — a known-correct input the fitness now mis-scores,
   confirmable **without reference to any candidate's score** (e.g. a hand-authored input whose correct grade
   is known a priori, and the fitness disagrees, reproducibly). Because the fixture is independent of every
   candidate, a *disappointing score* cannot stand in for it — that is exactly what makes nulls peek-proof.
2. **Independent confirmation by the 2nd hand-authored oracle on the lethal buckets** — the second, separately
   authored oracle (ORACLE2; unblocked when it exists) confirms the defect on the lethal-bucket grades. One
   oracle calling itself wrong is not enough; the confirmation must come from the independent grader.

A "defect" with no candidate-independent fixture, or unconfirmed by the 2nd oracle, is **not** a defect for
bump purposes — it is at most a K1 caveat. This is the bar that makes "I don't like this front" structurally
incapable of triggering a rebaseline.

## Freeze posture

Additive / bit-identical / audit-only (Class A/D). The stamp is a constant metadata field no decision reads →
the frozen P0/K8/§14 trajectory is bit-identical. The frontier filter is inert at epoch 0 and unwired. The
bump operation is deferred to Batch 2 as a NEW FREEZE record. No frozen invariant (weights, per-cell
non-inferiority veto, parity δ/α, TEST-hash) is touched.
