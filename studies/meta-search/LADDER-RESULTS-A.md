# Ladder Results — the LEVER-A run (2026-06-24)

> Re-run of the exact floor ladder with **Lever A** (container-recon.mjs) baked into the seam-gate, per the
> AMENDMENTS.md 2026-06-23 decision tree (STEP 3 of the LEVER-A-SCOPE.md build sequence). Command:
> `coevo-rung1.mjs --ladder --repairgate --shapegate --contractgate --obligation --bestofn 3 --seamgate
> --floor --retry 3 --k 8 --out coevo-ladder-A.json --dump runs/dump-ladder-A`. ~16h, **$0**, exit 0.
> Artifacts (gitignored): `runs/coevo-ladder-A.{json,log}`, `runs/dump-ladder-A/`.

## Headline

**NON-INFERIOR 1/17** (δ=0.05) vs the SETTLED routed baseline — *lower* than the prior pre-Lever-A run's 2/17.
But the rollup count is **not** a Lever-A regression: it is dominated by fresh-draw route variance (a
membership cell that crashed this draw set). The authoritative causal read — the **$0 same-draws A/B on this
run's own draws** — shows Lever A's net effect is **a wash with a regression**, i.e. its deterministic signal
sits **below the worst-of-K=8 non-stationary noise floor**. → **NOT a freeze; NOT a (C)-kill; NOT a clean
"(B) seam confirmed → CONTINUE".**

floor (GROUND-RULES Rule 1): mean below-floor rate **0.103**, pool-degenerate **0** (above-floor real-but-broken
code in every failing cell, as before → extraction still deprioritized).

## The two same-draws causal measures of Lever A (the valid read for a deterministic lever)

`diag-lever-a.mjs` runs the seam-gate with recon OFF vs ON over the **identical** dumped draws (deterministic,
$0) — the only difference is Lever A, so it is free of the cross-run route-variance that confounds the live
rollup.

| draw set | cells lifted | cells regressed | net |
|---|---|---|---|
| `dump-ladder` (prior run's draws) | **+3** — quota-d1 +25, lifecycle-d2 +25, lifecycle-d4 +6 | 0 | +56pp |
| `dump-ladder-A` (this run's draws) | **+1** — lifecycle-d3 +8 | **−1 — lifecycle-d4 −6** | ~+2pp |

**The lever's effect flips sign across draw sets** (lifecycle-d4: +6 → −6; quota-d1: +25 → 0). Lever A is
deterministic, so the entire difference is *which broken code the cheap pool emitted*. The seam-bug class Lever A
targets is the gating worst-of-K residual only on a **minority** of draws; on the rest, a different bug (tenancy,
conservation, a crash) is worst, so the lever moves the worst-of-K 0pp — or its structural-flatten misfires and
nets **negative** (lifecycle-d4 −6, despite the parse∧export no-regress guard, which cannot see semantic
wrongness while staying oracle-blind).

## Per-cell (A-run live worst-of-K vs prior run; integration axis = Lever A's target)

| cell | base i | prior hyb i | A-run hyb i | seam-stage Δi (oblig→final) | note |
|---|---|---|---|---|---|
| quota-d1 | 25 | 0 | **25** | +0 | i=baseline; cell FAILs on crosscut (conservation = Lever B) |
| lifecycle-d1 | 0 | 50 | **100** | **+50** | seam-gate fully recovered integration live (≫ baseline) |
| lifecycle-d2 | 100 | 50 | 38 | +0 | structural RMW divergence — recon reverts (safe miss) |
| lifecycle-d3 | 100 | 50 | 42 | +0 | structural RMW divergence — recon reverts (safe miss) |
| lifecycle-d4 | 100 | 63 | 75 | +0 | flatten can net-negative on some draws (see A/B above) |
| quota-d2 | 100 | 50 | 13 | +0 | seam/conservation; fresh-draw low |
| quota-d3 | 75 | 17 | 42 | +0 | shape/unwired |
| quota-d4 | 63 | 38 | 56 | +0 | conservation (C)-candidate |
| approval-d2 | 100 | 50 | 50 | — | **approve→execute / idempotency SEMANTICS** (Lever B / (C)-cand) |
| approval-d4 | 100 | 44 | 38 | — | **approve→execute / idempotency SEMANTICS** (Lever B / (C)-cand) |
| membership-d1 | 100 | 100 | **0** | +0 | **fresh-draw CRASH** ("Cannot set properties of undefined") — route variance, recon does not run on membership; this flip drove the 2→1 rollup |

Where Lever A *could* fire live it did (lifecycle-d1 oblig i50 → final i100, +50pp at the seam stage). Where the
residual is structural RMW divergence (lifecycle-d2/d3) recon correctly **reverts** (safe miss). Where the
residual is approval/conservation **semantics** (approval-d2/d4, quota-d4) the gates correctly never touch it.

## Decision-tree reading (AMENDMENTS.md 2026-06-23)

- **NOT "(B) seam confirmed → CONTINUE":** lifecycle+quota integration did **not** robustly rise to within δ of
  baseline (only quota-d1 reached baseline integration and lifecycle-d1 exceeded it; the structural and
  conservation cells stayed below, and the same-draws A/B is a net wash with a −6 regression).
- **NOT (C):** broken cross-surface code is (B) by Premise #2; the lever menu is not exhausted (Lever B untried),
  and nothing here is a smoke-clean semantic wall surviving the full stack.
- **NOT "A mis-built / inadmissible":** A is correctly built, admissible (surfaces-only, no oracle), and
  causally fires (lifecycle-d1 +50 live; +3 cells on the prior draws). It is **load-bearing on the clean
  object↔Map / idiom-1 seam class** it targets.
- **The actual finding (a refinement the tree did not enumerate):** A's deterministic effect is **real but
  below the worst-of-K=8 non-stationary noise band.** The seam-bug class it fixes is the gating residual on only
  a minority of draws; the worst-of-K is dominated by whichever bug is worst on the worst route (often tenancy /
  conservation / a crash), so A's worst-of-K contribution is small, draw-dependent, and occasionally negative
  (the structural-flatten). This is the program's BAR-MISMATCH / Deliberation-#2 concern, now demonstrated on a
  concrete lever: **a deterministic seam lever cannot be shown robustly load-bearing on the raw worst-of-K live
  fitness over this non-stationary pool.**

## Two open forks (research-lead call)

1. **The metric (a pre-registered USER win-condition call, GROUND-RULES Rule 3 / Deliberation #2).** The raw
   worst-of-K=8 over the non-stationary pool has variance larger than a deterministic lever's effect → it ranks
   route-luck over gene quality (membership-d1 PASS→crash; lifecycle-d4 ±6). The **$0 same-draws A/B is the only
   stable causal measure** for a deterministic lever. Adopting same-draws-A/B (or multi-pass averaging) as the
   *lever-evaluation* metric is a metric change the freeze left as a USER call.
2. **The next lever.** With Lever A built + measured (and exhausting the safe-deterministic seam lever), the
   dominant remaining residuals are (a) the **structural RMW seam** on lifecycle-d2/d3 — (B) but unreachable by
   a *safe* deterministic transform (needs the program-rejected restructuring, or a model route-back that STEP 1
   showed fails) — and (b) the **approval approve→execute / idempotency + quota conservation SEMANTICS** —
   **Lever B**, the pre-registered second lever and the genuine (C)-boundary test (now valid to run under Rule
   2(e), A being exhausted).

## Apparatus

Built additively (frozen tree `studies/build-gap/` untouched; P0 5/5 GREEN with the changes): `src/container-recon.mjs`
(Lever A — object↔Map reconciliation + guarded structural-flatten with the revert post-condition), wired into
`src/seam-gate.mjs` (non-membership path; membership delegates → byte-identical), `coevo-rung1.mjs` (no-regress
verify wired). Diagnostics: `replay-seam.mjs` (STEP 1), `diag-lever-a.mjs` (STEP 2/3 same-draws A/B).
Smokes GREEN: container-recon 16/16, seam-gate 22/22.
