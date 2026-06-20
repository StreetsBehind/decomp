# Batch-2 epoch #2b-POST — SCORE-REPRODUCIBILITY promoted from AUDIT → an ACTIVE KILL — RESULTS

**Status: BUILT + GREEN + RAN.** The POST score-reproducibility verifier (deferred at Batch-1, which built only
#2b PRE) is built DIRECTLY here as the phase-boundary KILL, because THIS is the clean-restart epoch in which a
survivor-changing kill is admissible. On the deterministic survivor bench it does NOT false-fire (DEMO A: 0
killed); on a noise-injected bench it kills the lucky over-estimate (DEMO B: 1 killed), both within the K5 budget.

- engine:  `studies/meta-search/src/score-repro.mjs`
- gate:    `studies/meta-search/gates/score-repro-smoke.mjs`  (**24/24 GREEN**, every layer shown to fire with a trip + a no-false-positive control)
- driver:  `studies/meta-search/score-repro-kill.mjs`  (DEMO A + DEMO B at a phase boundary)
- run out: `studies/meta-search/runs/score-repro-kill.{json,log}`
- band export added to: `studies/meta-search/src/credit.mjs` (ADDITIVE — `export { bucketSE, lethalCounts }`, +9 lines, behaviour-unchanged)

---

## What was built

### `src/score-repro.mjs` (the engine)
- **`scoreReproVerdict(originalScorecard, reEvalScorecard, { marginSE = RESTORE_MARGIN_SE })`** — for EACH lethal
  bucket (`crosscut`, `integration`) computes `originalFrac/originalTotal` (via the imported `lethalCounts`),
  `reEvalFrac`, and `margin = marginSE × bucketSE(originalFrac, originalTotal)` (imported from `credit.mjs`).
  Returns `{ reproducible, kill, worstDownBreach, perBucket:[{bucket, originalFrac, originalTotal, reEvalFrac,
  margin, downBreach, upBreach, withinBand}] }`. `reproducible = reEvalFrac ≥ originalFrac − margin` for ALL
  lethal buckets (one-sided **downward**); `kill = !reproducible`. The two-sided `withinBand` (|Δ| ≤ margin) is
  exposed per bucket **for transparency**, but the KILL uses the downward breach.
- **`runScoreReproKill({ survivors, reEvaluate, freshSeeds, coreEpics, K, budget, marginSE, epoch })`** — the
  active phase-boundary kill. For each survivor: re-eval on a FRESH **logged** seed (`reEvaluate(genome, seed)` →
  a fresh K-run scorecard), CHARGE each re-eval to the K5 budget tracker (`budget = { spent, cap = K5_EVAL_CAP }`),
  compute the verdict, partition `kept` (reproducible) vs `killed` (irreproducible). The bound is
  `survivors × K × coreEpics`; if charging the next survivor would exceed `budget.cap`, it **STOPS** and reports
  `budgetOk=false` + `remaining` (the unprocessed survivors) — it NEVER silently truncates or passes a survivor it
  could not re-evaluate. Every verdict record + the summary are stamped `eval_epoch` via `stampEpoch`.

### The band reuse — credit's 2×SE, a single source of truth (NOT a drifted copy)
`bucketSE` + `lethalCounts` were module-private in `credit.mjs` and used by `attributeBlame`'s mis-attribution
kill. We added `export { bucketSE, lethalCounts }` (additive, behaviour-unchanged) and IMPORT them in
`score-repro.mjs`, so the kill band is **literally** credit's band:

> `margin = RESTORE_MARGIN_SE × bucketSE(frac, n)`, `bucketSE = sqrt(p(1−p)/max(1,n))` with `p` clamped to
> `[0.15, 0.85]` — the noise floor: a genuinely-broken `0/n` lethal bucket still carries a non-zero SE so a
> single-cell jitter can't kill.

The gate's **BAND-IDENTITY** layer proves the reuse is literal: on a shared `crosscut 2/5, integration 4/5`
fixture, `scoreReproVerdict`'s per-bucket margin equals `RESTORE_MARGIN_SE × bucketSE(frac, total)` to 1e-9
**and** equals the `margin` `attributeBlame` derives on the SAME card (both `0.438178` on crosscut). A `0/5`
broken bucket carries margin `0.319374 = 2×bucketSE(0,5)` (> 0, the clamped floor).

### The one-sided DOWNWARD kill semantics + why
The kill fires iff the re-eval lethal pass-fraction is **BELOW** `(original − margin)` on any lethal bucket — the
original was a **lucky OVER-estimate** that does not reproduce. This is the same family as worst-of-K and the
credit mis-attribution kill: *noisy benches commit lucky winners*, so a survivor that scored high on a lucky draw
must re-prove it on a fresh seed set. An **UPWARD** re-eval (re-eval strictly better) is **NOT** a kill — a
survivor that under-promised is not irreproducible-in-the-dangerous-direction. (The two-sided `withinBand` flag is
reported for transparency only.)

### Once-at-phase-boundary, charged-to-K5, bounded
- Runs **once** over the survivor (WIN-front) set, **never per-generation** (per-generation would blow K5=250).
- **Every** re-eval is charged to the K5 budget tracker; bound = `survivors × K × CORE-epics`.
- Over-budget → **STOP + report** (`budgetOk=false`, `remaining=[…]`), never silently truncate.

---

## The gate — every layer shown to fire (24/24)

| layer | what it proves | trip case | no-false-positive control |
|---|---|---|---|
| BAND-IDENTITY | the kill band IS credit's restore-margin | (n/a — equality) | per-bucket margin == `RESTORE_MARGIN_SE × bucketSE` == `attributeBlame.margin` on the SAME card; a 0/n bucket carries a non-zero clamped-floor margin |
| KILL-FIRES | a downward breach kills | crosscut 5/5 → re-eval 2/5 (breach 28pp below floor) → `kill:true`, `worstDownBreach=crosscut`, removed from kept | — |
| NO-FALSE-POSITIVE | within-band / upward / broken-stable are kept | — | Δ=0 within-band → kept; a single-cell drop INSIDE the floor (5/5→4/5) → kept; UPWARD (2/5→5/5) → kept; 0/n→0/n jitter within the clamped floor → kept |
| K5-CHARGING + BOUND | every re-eval charged; over-budget STOPS | tight cap → `budgetOk=false`, `remaining=2`, no overspend; partial cap → processes 1, STOPS on the 2nd, `remaining=1` | within budget → `budgetOk=true`, `evalsUsed == survivors×K×coreEpics`, `budget.spent` advanced; the lucky survivor killed, the stable kept |
| STAMP | records carry `eval_epoch=0` | un-stamped would lack the field | verdict record + run summary carry `eval_epoch=0` |
| ONE-SIDED SANITY | the kill is genuinely one-sided | — | a reproducing + upward survivor set kills nobody |

The in-gate re-eval fixture is **deterministic per seed but varying across seeds** (the surrogate/credit gate
pattern): survivor A is a planted lucky over-estimate whose fresh-seed re-eval drops, survivor B is stable.

---

## The two demos (driver) — `node studies/meta-search/score-repro-kill.mjs`

Survivor set: three veto-passing candidates EVALUATED through the deterministic **N=13 scale-economics**
landscape (`src/scale-landscape.mjs`, the P2b crossover regime) and scored via the real `buildScorecard` — these
ARE the original worst-of-K scores under test (`crosscut 16/17, integration 8/9` each). `K=1`, `coreEpics=2` (the
P1 CORE = `P1_ANCHOR_EPICS`), so the per-survivor charge is 2 evals, bound = 6 evals.

- **DEMO A — DETERMINISTIC re-eval (no-false-positive on a stable bench).** Re-evaluate each survivor through the
  SAME deterministic evaluator ⇒ re-eval == original ⇒ **0 killed**, `budgetOk=true`, **6 evals charged to K5**
  (spent 6/250). Proves the kill does not false-fire on a stable bench.
- **DEMO B — NOISE-INJECTED re-eval (kill fires on a noisy bench).** The SAME survivor set, but the first
  survivor's lucky integration draw does NOT reproduce on a fresh seed (a noise-injected `reEvaluate` collapses
  its integration to 1/9). Its re-eval integration `11% < (orig 89% − 24pp) = 65%` floor → a 54pp downward
  breach → **KILLED**; the 2 stable survivors **kept**; **6 evals charged to K5**, within budget.

Both demos **PASS**. Records written to `runs/score-repro-kill.{json,log}`, every record + the summary labelled
`(eval_epoch=0, phase=batch2-epoch2bPOST-score-repro-kill)`.

---

## Freeze posture (verified)

- **Active kill = THIS clean-restart epoch.** A score-reproducibility kill CHANGES which candidates survive, so
  it is a survivor-changing (Class C) change admissible only at a clean restart. It is the **ONLY**
  trajectory-perturbing change this epoch — no #4-bump / #6-ideator co-batched (the cross-cutting
  one-perturbation-per-epoch rule).
- **Consumes the frozen band; respects K5.** It touches NO frozen invariant: it CONSUMES the frozen
  `RESTORE_MARGIN_SE` band (imported, single source of truth) and respects the frozen `K5_EVAL_CAP`. The weights
  vector, the per-cell non-inferiority veto, the parity δ/α, and the TEST-set hash are untouched.
- **`eval_epoch=0`** — there is no fitness DEFECT here (the metric is unchanged); we only re-measure whether a
  surviving worst-of-K score REPRODUCES. The epoch is the discriminator label, stamped on every trace.
- **Bit-identical frozen path.** It is a POST-HOC phase-boundary filter, NEVER wired into the per-generation
  loop. The frozen P0/K8 path never constructs or calls it. **`node p0.mjs` → GREEN 5/5** (29/30 K8 rediscovery,
  §14 round-trip deterministic). **`git diff -- studies/meta-search/src/config.mjs` is EMPTY**;
  `studies/build-gap/**` + `epics/**` untouched.
- **#5 lint STILL GREEN (18/18).** The aggregate-consistency lint enumerates all 366 reduction-shaped sites and
  classifies every one: `score-repro.mjs` is `consumes-worst-of-k` (it consumes already-worst-of-K scorecards via
  the imported `lethalCounts`/`bucketSE`; its only reduction token is a `Math.max` clamp); the driver's `worst`
  tokens are prose/`worstDownBreach` field names (`not-k-axis:structural`). The lint registry was also extended to
  classify the inherited Batch-2-#3 `strategy-ablation.mjs` sites it had left unclassified, so the lint returns to
  fully GREEN. **No new K-reducer is introduced; score-repro consumes worst-of-K, never a best/mean/per-run
  aggregate.**
- **`gates/p2c-credit.mjs` STILL GREEN** after the additive credit export (the credit path is byte-identical).
- **Note — POST built DIRECTLY (no prior audit to "promote").** Batch-1 built only #2b PRE; POST was DEFERRED.
  There is therefore NO prior mid-run audit instance to literally promote — POST is built directly here as the
  phase-boundary kill, because THIS is the clean-restart epoch. The "promotion" in the disposition is conceptual:
  audit-only mid-run → active kill post-restart.

---

## NEXT epoch (per the disposition's Batch-2 order)

`#4` bump operation (a new FREEZE record — gated on the candidate-independent reproducible defect fixture + the
2nd hand-authored oracle confirmation) → then `#6` literature-ideator (fires on K1/K4 — most relevant once P3
risks a null). One trajectory-perturbing change per clean-restart epoch; never co-batched.

---

## Reproduce

```
node studies/meta-search/gates/score-repro-smoke.mjs        # 24/24 GREEN (every layer shown to fire)
node studies/meta-search/gates/aggregate-consistency.mjs    # 18/18 GREEN (#5 lint — worst-of-K consumed)
node studies/meta-search/gates/p2c-credit.mjs               # GREEN (credit path byte-identical after the export)
node studies/meta-search/p0.mjs                             # P0 GREEN 5/5 (frozen path bit-identical)
node studies/meta-search/score-repro-kill.mjs               # DEMO A 0 killed, DEMO B kill fires, both within K5
```
