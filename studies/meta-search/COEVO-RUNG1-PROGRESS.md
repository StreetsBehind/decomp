# Co-evolution program — rung-1 progress (session handoff, 2026-06-18)

> **PICK UP HERE in a new session.** This is the live state of the A×B co-evolution program
> (`COEVOLUTION-SPEC.md`). Read that spec first for the program; read this for "what's built, what's
> measured, what's the next action." Operational SoT remains `STATE.md`.

---

## 🛑 CRITICAL CORRECTION (2026-06-18, later) — the "RUNG-1 COMPLETE / 92/92" RESULT IS INVALID (grader bug)

**A model-deliberation-prompted validation pass found that `coevo-rung1.mjs` never graded against the
oracles.** `loadEpic` did not return `testsPath`, so `fx.testsPath` was `undefined`; `JSON.stringify` drops
undefined, the child harness threw on `pathToFileURL(undefined)` and returned `{harnessError}`, and
`rate(undefined)` evaluates to **1.0** → **every draw read 100/100 regardless of the code.** Proven
empirically: deliberately broken quota code (withdraw lets balance go negative, no authz) read **crosscut
100% / integration 100%** with `testsPath:undefined`, vs **0% / 0%** through the real oracle.

**→ EVERYTHING below from `coevo-rung1.mjs` is VOID:** the 92/92, the K=10 d1 base rate, the K=3 4-topo
run, the d2/d3 climb, lifecycle, membership, "all 4 topologies route-robust through d3," and the
"head-to-head losses were route variance" debunk. The bug pre-existed this session (in the harness as
first written) and was committed in `6a644b0`. **The head-to-head results are UNAFFECTED** (it grades with
the real `spec.testsPath`).

**FIXED:** `loadEpic` now returns `testsPath: spec.testsPath` (verified — a `__noop` mock now grades 0%/FAIL
instead of fake 100%). **REAL re-grade of the two known-loss d1 cells (`coevo-REGRADE-d1.json`, K=8):**

| cell | worst-of-K | crosscut passes | integration passes | both-pass | verdict |
|---|---|---|---|---|---|
| quota-d1 | c60 / **i0** | 7/8 | **2/8** | 2/8 | **FAIL** |
| approval-d1 | c14 / **i0** | 3/8 | **1/8** | **0/8** | **FAIL** |

The head-to-head's exact numbers REPRODUCED (quota integ 25, approval crosscut 71). **So the losses are REAL
and structural, not route variance; worst-of-K does NOT debunk them; the A/B gene program IS justified** —
against genuine, now-measurable failures (quota conservation seam, approval crosscut + SoD seam). The gate
no-ops on these topologies (membership-specific) so it doesn't help. **Everything in the (now-struck-through)
sections below describes the artifact, not reality — kept only for the audit trail.** Next: re-grade the
full ladder with the fix, then resume gene work against the real failures.

---

## ⏩ First action on pickup (UPDATED 2026-06-18 — RUNG-1 COMPLETE; head-to-head losses DEBUNKED; awaiting a STRATEGY call)

**RUNG-1 IS COMPLETE. All 4 topologies (quota, approval, lifecycle, membership) are route-robust THROUGH d3
at gate-OFF base rate 0% — 92/92 draws passed, ~25 distinct cheap routes, ~½ routed-baseline cost.** The
head-to-head's topology-gated losses were ROUTE VARIANCE, not structure (worst-of-K launders them out). The
coverage gap is closed (lifecycle d2/d3 + membership d1/d2/d3 ran this session; the membership oracle was
unpinned — see "apparatus" below). See "Session-2 result" for the table.

**Next action is a STRATEGY DECISION (user's call), not a script.** The seam-gate fired on every draw but
recovered nothing (base rate already 0%), so it is **not demonstrated load-bearing at d1-d3**, and the
task-#3 genes — premised on the head-to-head losses being *structural* — are **not justified at this scale.**
The two coherent directions:
1. **Find the erosion frontier (go deeper than d3).** Nothing has broken yet, so the system's limit + the
   gate's value are unknown. NOT free on any topology: quota/approval/lifecycle templates **stop at d3** (need
   new d4 authoring); membership has `scale-d4/d5` dirs and the oracle now generalizes (`domainsFor(D)`), so
   **membership-d4/d5 is runnable immediately** — that's the cheapest way to hunt for erosion:
   `node studies/meta-search/coevo-rung1.mjs --seamgate --k 8 --epics membership-d4,membership-d5 --out coevo-membership-d45`.
2. **Move toward freeze.** The complete-rung-1 parity-at-½-cost result is strong; proceed to freeze the
   champion + the once-only sequestered-TEST falsification (FREEZE §4/§6). Risk: freezing a system never
   stressed to failure, and shipping a gate not shown to be load-bearing (a reviewer would cut it).
   (Optional cheap hardening first: bump K to 20-30 on the existing cells to tighten the 0% bound.)

> **Apparatus change this session (additive, dev — not frozen):** `coevo-rung1.mjs` gained `--out <name>`;
> `epicSpec` membership branch now uses a **depth-matched oracle** `oracle2-tests-d${D}.mjs` (d1 path
> bit-identical — verified). New: `gates/lib/oracle2-tests-d{2,3}.mjs` (3-line `domainsFor(D)` siblings of d1).
> **NOTE:** these touch the live evaluator/oracle wiring → the §3.3 instrument re-validation (K6/K7/K8, P0)
> is now DUE before any freeze (it was deferred while the gate was a standalone module).

> ⚠️ **Output-file note (FIXED):** `coevo-rung1.mjs` now takes `--out <name>` (additive flag, this session).
> Preserved: K=10 d1 base rate = `runs/coevo-rung1-k10-d1-baserate.json`; d2/d3 climb =
> `runs/coevo-rung1-d2d3-seamgate.{json,log}`. (Original K=3 4-topo numbers remain only in `runs/coevo-rung1.log`.)

---

## 🟢 Session-2 result (2026-06-18) — model-agnostic worst-of-K verdict: parity on ALL 4 topologies through d3

Both runs grade `raw` (gate-OFF) and `final` (gate-ON) with the **frozen `evaluateEpic`** against the real
oracle tests; `worst-of-K` = the *minimum* draw (so "100/100" ⇒ EVERY draw cleared the bar).

**(1) K=10 d1 base rate** (`coevo-rung1-k10-d1-baserate.json`):

| cell | gate-OFF per-draw fails | distinct routes | gate fired? | hybrid $ | routed-baseline $ |
|---|---|---|---|---|---|
| quota-d1 | **0 / 10** | 15 | no | 0.395 | 0.742 |
| approval-d1 | **0 / 10** | 17 | no | 0.395 | 0.811 |

**(2) K=8 d2/d3 paired seam-gate climb** (`coevo-rung1-d2d3-seamgate.json`):

| cell | surfaces | gate-OFF fails | gate-ON fails | gate fired (draws) | repairs applied | routes |
|---|---|---|---|---|---|---|
| quota-d2 | 8 | **0 / 8** | 0 / 8 | 8 | 8 | 20 |
| quota-d3 | 12 | **0 / 8** | 0 / 8 | 8 | 5 | 20 |
| approval-d2 | 8 | **0 / 8** | 0 / 8 | 8 | 9 | 17 |
| approval-d3 | 12 | **0 / 8** | 0 / 8 | 8 | 11 | 23 |

**(3) lifecycle + membership through d3** (`coevo-lifecycle-d23.json`, `coevo-membership-d123.json`):

| cell | surfaces | gate-OFF fails | gate-ON fails | repairs applied | routes |
|---|---|---|---|---|---|
| lifecycle-d2 | 8 | **0 / 8** | 0 / 8 | 13 | 22 |
| lifecycle-d3 | 12 | **0 / 8** | 0 / 8 | 10 | 22 |
| membership-d1 | 5 | **0 / 8** | 0 / 8 | 11 | 10 |
| membership-d2 | 9 | **0 / 8** | 0 / 8 | 31 | 20 |
| membership-d3 | 13 | **0 / 8** | 0 / 8 | 35 | 28 |

**RUNG-1 COMPLETE — grand total: 0 gate-OFF failures in 92 draws across all 4 topologies through d3, ~25
distinct cheap routes, ~½ routed-baseline cost ($0.395 vs $0.74–0.81).** Per-cell, every draw passed:
`quota d1 10/10·d2 8/8·d3 8/8 | approval d1 10/10·d2 8/8·d3 8/8 | lifecycle d2 8/8·d3 8/8 | membership d1/d2/d3 8/8`.
The gate fired on every d2/d3 draw and applied 100+ repairs total, but recovered nothing — base rate was
already 0% everywhere. **The erosion frontier was NOT reached at d3.**

**Three load-bearing reads:**
1. **The head-to-head's topology-gated losses (quota integ 25, approval integ 17/75) were ROUTE VARIANCE.**
   approval-d3 — the worst single-draw collapse — passed 8/8 across 23 routes. The K=1 head-to-head hit
   unlucky draws / gateway drift; worst-of-K launders exactly that out. The P3 "topology-gated, not
   freezable" conclusion is **overturned** under the model-agnostic fitness.
2. **The seam-gate is NOT demonstrated load-bearing at d1-d3.** It fired on every d2/d3 draw and applied
   100+ repairs total, but every draw passed gate-OFF anyway (final == raw == 100/100). No erosion existed to
   recover. Mode-C semantic invariants correctly stay STAGED OFF.
3. **The task-#3 gene program is no longer justified at this scale.** Contract-precision (A) + extraction (B)
   genes were premised on structural head-to-head losses; those losses are gone. MISSING-draw format hazards
   appeared on individual routes (e.g. `settlePayout`, `createBudget`) but did NOT propagate to epic failure.

**The erosion frontier is now UNKNOWN** — nothing broke through d3. That is the open question driving the
next-action fork above.

---

## Where we are (the reframe)

The P3 head-to-head (committed `5e65291`) showed the P2c proposed winner is **topology-gated, not ready to
freeze**. The agreed next program is the **A×B co-evolution search** (co-evolve orchestration **A** +
output-QA **B**, worst-of-K-across-routes fitness, MAP-Elites celled by topology×scale, freeze the champion
at the END). Binding principle: **model-agnostic** — route/model selection is NOT an admissible fix; classify
every failure (A) orchestration / (B) output-QA / (C) boundary.

The 5 open design questions (`COEVOLUTION-SPEC §8`) were RESOLVED this session:
- **K & route sampling:** K=3 to start, natural route variance, log resolved route/draw; escalate K if variance
  is high (it IS — see finding below; the K=10 run is the escalation).
- **Contract-precision (A):** encode as BOTH an A-side richer-skeleton gene and a B-side cheap lint; search picks.
- **Generalized gate:** ONE gate, per-topology detection dispatched by the skeleton's declared seam store. **BUILT.**
- **Stop rule:** K5 eval-cap scaled by K; stop a rung when solid at worst-of-K or a cell hits a (C) boundary.
- **Pre-registration:** freeze after rung-1 stabilizes the gene set (mirrors P1), TEST falsification at the very end.

## Key finding this session — the head-to-head d1 losses were ROUTE VARIANCE, not structural

`runs/coevo-rung1.log` (worst-of-K=3, hybrid-only, $0, the current membership-only gate):

| topo | worst-of-3 final c/i | routes | head-to-head single-draw |
|---|---|---|---|
| membership-d1 | 100 / 100 | 12 | 100 / 100 |
| lifecycle-d1 | 100 / 100 | 8 | 100 / 100 |
| **quota-d1** | **100 / 100** | 8 | **100 / 25 (LOSS)** |
| **approval-d1** | **100 / 100** | 8 | **100 / 75 (LOSS)** |

All four pass worst-of-3 at d1, INCLUDING the two head-to-head "losses." The harness is sensitive (it caught
a `MISSING:addMember` draw + the membership gate firing). So the head-to-head's d1 losses were route-unlucky
single draws / gateway drift — exactly the model-variance worst-of-K exists to expose. **CAVEAT (load-bearing):**
K=3 cannot *certify* route-robustness — if ~25% of routes fail conservation, P(3/3 pass)≈0.42. Hence the K=10
base-rate run to get the real per-route rate. This is the §8.1 K-decision being calibrated empirically.

## What was BUILT this session (all additive; frozen tree `studies/build-gap/` + committed apparatus untouched)

- **`coevo-rung1.mjs`** — route-robust rung-1 harness: worst-of-K draws per epic, per-route logging, A/B/C
  credit-attribution readout, paired raw/final. `--seamgate` swaps in the generalized gate; `--mock` is a
  zero-spend dry-run. Replicates head-to-head's build/grade path inside a K-loop (apples-to-apples).
- **`src/seam-gate.mjs`** — the GENERALIZED cross-surface seam-gate (COEVOLUTION-SPEC §4). Derives a
  per-topology seam profile (declared store + writer/reader verbs) from the PUBLIC skeleton; runs Mode-A
  (uninit-store surgical init) + Mode-B (representation drift, model route-back) on the declared store —
  topology-agnostic; **membership DELEGATES verbatim to `integration-gate.runIntegrationGate`** so every prior
  membership result reproduces bit-identically; no-op on unknown topology; **oracle-blind** (scanOracleLeak on
  every prompt). **Mode-C semantic invariants** (conservation no-overspend, SoD approver≠requester, idempotency,
  legal-transition) are STAGED OFF behind `modeCIssues()` — deliberately NOT built until the base rate shows
  they're load-bearing (§3.3).
- **`gates/seam-gate-smoke.mjs`** — zero-spend smoke, **22/22 green**: profile detection ×4 topos · Mode-A
  init (+ guard preservation) · no-false-positive on clean code · Mode-B drift + route-back · membership
  delegation · unknown-topo no-op · oracle-leak void · Mode-C inert.

## Instrument-validation status

- The seam-gate is a STANDALONE module, not yet wired into the search loop or the synthetic K8 path, so
  **P0/K8 are unperturbed** (they use the synthetic evaluator, which calls no gate). The §3.3 instrument
  re-validation (K6/K7/K8) is REQUIRED when the gate/genes get wired into the live evaluator + genome
  (tasks #3/#4) — do it then.

## The 6-task plan (TaskList may not survive the session — captured here)

1. **[mostly done]** Measure route-robust rung-1 baseline — K=3 done; K=10 base rate in flight.
2. **[done/structural, in_progress]** Generalize the integration-gate — seam-gate.mjs built + smoke 22/22.
   Remaining: live paired validation; Mode-C semantic layer (staged off).
3. **[next]** Add (A) contract-precision + per-surface-decomposition genes + (B) extraction/format-forcing gene
   to `src/genome.mjs` (NEW unfrozen genome — voids the current FREEZE, run as dev). Update validateGenome +
   canonical hashing. Prioritize by the base-rate attribution.
4. Wire worst-of-K-across-routes fitness into MAP-Elites celled by (topology × scale); per-cell veto over the
   CUMULATIVE ladder; credit-attribution ON. Re-validate K6/K7/K8 after wiring.
5. Run rung-1 evolution (all 4 topos solid at worst-of-K) then climb d2/d3/…; mutate against new erosion.
6. **[END GAME — not now]** Freeze champion (new pre-registration) + once-only sequestered-TEST falsification
   (`runs/test-set-manifest.json`, hash `74f10cbc…`) via the independent 2nd-oracle graders.

## Files & git

New uncommitted files (user has not asked to commit; P2c/co-evo apparatus left uncommitted per prior pattern):
`coevo-rung1.mjs`, `src/seam-gate.mjs`, `gates/seam-gate-smoke.mjs`, `COEVO-RUNG1-PROGRESS.md`, plus `runs/coevo-rung1*.{json,log}`.
Branch: `docs/meta-search-rev2-review-handoff`. Frozen reference (do not edit): `DESIGN.md`, `FREEZE.md`, `studies/build-gap/`.
