# Routed all-frontier baseline — SETTLED (P3 prerequisite #1)

> **Status (2026-06-20): SETTLED. The cost-optimized routed all-frontier baseline ALSO ERODES under the
> program's own worst-of-K=8 statistic — 10/17 DEV cells drop below 100%, a 14% per-draw lethal-fail rate,
> failing even at d1.** This REVERSES the 2026-06-18 interim headline ("builds at 100% through D=3 with no
> erosion"), which was a **K=1 single-draw artifact** — the exact non-stationarity footgun worst-of-K exists
> to expose (same lesson as the VOID-92/92 grader bug and the coevo "d1 losses were route variance" finding,
> now reproduced on the FRONTIER side). The settled artifact flips the pre-P3 gate prereq #1 UNMET→**MET**.
> Harness: `routed-baseline.mjs --settled --k 8`. Raw: `runs/routed-baseline-settled.json` (136 draws, 0
> harness errors). Real frontier spend: **$64.61** (the 136 surface-coding draws; the $0.395/epic opus
> skeleton anchor is analytic, not spent).

## The settled measurement (live `claude` CLI, real $; worst-of-K=8 over the full DEV ladder)

17 DEV epics — membership d1–d5 (graded by the 2nd oracle, depth-matched) + approval/lifecycle/quota d1–d4.
Routing is **deterministic** (haiku→CRUD, sonnet→writers, opus→seam), so K=8 measures the **frontier models'
own nondeterminism**, not a route lottery. Reliability = **worst (min) over 8 draws**; cost = **worst (max)
over 8 draws**. (TEST ids stay sealed until P3 — this is the DEV ladder mirroring the TEST depth shape.)

| epic | surf | crosscut worst/med/best | integration worst/med/best | clean draws | epic✓ worst | cost worst$ (incl $0.395 skel) |
|---|---|---|---|---|---|---|
| membership-d1 | 5 | 100/100/100 | 100/100/100 | 8/8 | ✅ | 0.93 |
| membership-d2 | 9 | **83**/100/100 | **50**/100/100 | 6/8 | ✗ | 1.35 |
| membership-d3 | 13 | 100/100/100 | 100/100/100 | 8/8 | ✅ | 1.80 |
| membership-d4 | 17 | **91**/100/100 | **75**/100/100 | 6/8 | ✗ | 2.27 |
| membership-d5 | 21 | **93**/100/100 | **80**/100/100 | 5/8 | ✗ | 2.69 |
| approval-d1 | 4 | 100/100/100 | 100/100/100 | 8/8 | ✅ | 0.90 |
| approval-d2 | 8 | 100/100/100 | 100/100/100 | 8/8 | ✅ | 1.38 |
| approval-d3 | 12 | 100/100/100 | 100/100/100 | 8/8 | ✅ | 1.87 |
| approval-d4 | 16 | **93**/100/100 | 100/100/100 | 7/8 | ✗ | 2.33 |
| lifecycle-d1 | 4 | **80**/100/100 | **0**/100/100 | 7/8 | ✗ | 0.82 |
| lifecycle-d2 | 8 | **80**/100/100 | 100/100/100 | 7/8 | ✗ | 1.26 |
| lifecycle-d3 | 12 | **73**/100/100 | 100/100/100 | 6/8 | ✗ | 1.68 |
| lifecycle-d4 | 16 | 100/100/100 | 100/100/100 | 8/8 | ✅ | 2.10 |
| quota-d1 | 4 | 100/100/100 | **25**/100/100 | 7/8 | ✗ | 0.89 |
| quota-d2 | 8 | 100/100/100 | 100/100/100 | 8/8 | ✅ | 1.21 |
| quota-d3 | 12 | 100/100/100 | **75**/100/100 | 6/8 | ✗ | 1.67 |
| quota-d4 | 16 | 100/100/100 | **63/91**/100 | 4/8 | ✗ | 2.25 |

**Worst-of-K aggregate cost** over the ladder: **$27.41** (median draw $12.82), incl. the analytic
$0.395/epic opus skeleton. **7/17 cells hold 100% worst-of-K; 10/17 erode.** Per-draw lethal-fail rate:
**19/136 = 14.0%**. ("clean draws" = both lethal buckets at 100% i.e. *lethal-clean*; this coincides with
all-three-perfect everywhere except quota-d4, whose 4th lethal-clean draw carries a non-lethal happy miss.)

## The read — three findings

**1. The "100% wall" was a K=1 artifact; the honest statistic shows frontier coding is not perfectly
reliable either.** At worst-of-K=8 the cost-optimized routed all-frontier baseline drops a lethal bucket on
14% of draws and erodes in 10/17 cells — *including at d1* (lifecycle-d1 integration = one 0% draw out of
[100,100,100,100,**0**,100,100,100]). The 2026-06-18 "builds at 100% through D=3" was a single-draw (K=1)
measurement; re-sampling the SAME deterministic routing 8× exposes the variance. This is precisely the
footgun worst-of-K exists to catch — and it is now the third independent place this program has caught it
(the VOID-92/92 grader bug; the coevo "d1 losses were route variance"; and now the frontier baseline itself).

**2. The erosion is bounded variance, not depth-monotonic collapse — but the misses RECUR.** Every cell's
**median is 100%/100%** (16/17; quota-d4 integration median 91%), so the typical draw is perfect. But the
failures are not all one-off: **6 of the 10 eroding cells fail on 2–4 draws** (membership-d2/d4 = 2,
membership-d5 = 3, lifecycle-d3 = 2, quota-d3 = 2, quota-d4 = 4); only 4/10 are true single-draw misses
(approval-d4, lifecycle-d1, lifecycle-d2, quota-d1). The median holds at 100% only because an 8-draw median
tolerates ≤3 misses — so "median 100%" understates how often a route-draw breaks. The bad draws are coherent
(e.g. lifecycle-d1's worst draw is (crosscut 80, integration 0): one generation breaking both its obligation
and the seam — a real-broken-module signature, not scattered grader flake). Depth is **not** monotonic (d1
integration 0% vs d3 75%). The most depth-strained cell is **quota-d4** (the conservation/wallet seam): 4/8
draws miss, integration draws [81,100,100,100,63,100,81,81], median 91% — the only cell whose median moves —
consistent with the head-to-head's "quota is the hard topology."

**3. This RESETS the comparator; it does not by itself decide the win.** The result demolishes the
"perfect baseline vs eroding hybrid" framing of 2026-06-18, but it does **not** hand the hybrid a win. Both
arms erode under worst-of-K=8; the win-condition contest is **which arm erodes LESS per cell, at what cost**,
co-measured on identical epics. That is exactly the live head-to-head (pre-P3 prereq #2, still UNMET by
design). What this settle establishes is that **reliability parity is a reachable bar** (the baseline is not
a 100% wall), and that the per-cell non-inferiority veto at P3 now has a **measured** baseline reliability
vector to compare against (not the opus-whole proxy).

### Cost (unchanged direction; quantified)

The $0.395 opus skeleton anchor is paid by **both** arms (the orchestration artifact is shared), so the cost
**delta** is purely the per-surface coding. Coding-only (skeleton excluded) the routed baseline pays
**$0.42–2.29/epic** (worst-of-K, growing with depth — d1 ≈ $0.42–0.53, d4 ≈ $1.70–1.94), the hybrid pays
**$0** (free gateway). The hybrid dominates on cost; the gap widens with depth. The reliability question
(finding 3) is what the head-to-head must settle.

## Integrity checks (why this is not a grader artifact)

- **0/136 harness-error draws** — every draw completed and was graded; no transport failure scored as a 0.
- **All 17 oracle graders are deterministic** (no `Date.now`/`Math.random`/`new Date`/timers/ordering), and
  `evaluateEpic` grades each draw in a fresh isolated child process → the only source of per-draw variation
  is the model output. The 14% rate is genuine frontier nondeterminism.
- **The grader discriminates** — 7 cells hold 100% worst-of-K and every cell's median is 100% (16/17), so the
  failures are not a uniform "tests don't load" floor; they are real, isolated, broken generations.

## Method notes (decided autonomously; no frozen invariant touched)

- Worst-of-K=8 matches the statistic the hybrid arm, coevo, and head-to-head use — apples-to-apples for the
  P3 per-cell veto. Cost = max-draw, reliability = min-draw (frozen convention, DESIGN §5/A5). A
  harnessError/empty draw would score 0 (fail-closed `rate()`), never excluded — none occurred here.
- This is the **comparator arm only**. The win-condition DOMINANCE comparison (hybrid ≥ baseline per cell at
  ≤ cost) is co-measured in `runs/head-to-head-settled.json` and scored at P3 — NOT decided here.
- No frozen apparatus touched: `routed-baseline.mjs` pre-existed; this run only produced the data artifact
  (`runs/`, gitignored). DESIGN weights/veto/δ/α/TEST-hash, FREEZE.md, and `studies/build-gap/` are untouched.

## Audit trail — the superseded K=1 interim (2026-06-18)

The first live run (K=1, D≤3 only) reported **100% crosscut / 100% integration on all 10 cells tested** and
was read as "the routed baseline is strong; the P2b/P2c hybrid win was vs a weak monolithic opus-whole proxy
that flattered the hybrid → cost/reliability TRADE not dominance." That reading rested on a single draw per
cell. Its own "not yet settled" caveats (D≤3 only; K=1; no worst-of-K; no live head-to-head) are now
discharged: the settled worst-of-K=8 run above shows the 100%s were single-draw luck, and the baseline
erodes under the honest statistic. The K=1 numbers were not *wrong* (those draws did pass) — they were
**under-sampled**, and a single draw cannot certify route/sampling robustness.
