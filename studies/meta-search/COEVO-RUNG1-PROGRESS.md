# Co-evolution program — rung-1 progress (session handoff, 2026-06-18)

> ### ⚖️ BINDING PREMISE (read first — see STATE.md "BINDING PREMISE")
> No control over which model builds (route/model selection is inadmissible; fitness = worst-of-K-across-routes).
> Dumb models emitting broken code is the **TARGET**, repaired by the **(B) output-QA stack** (self-repair →
> best-of-N → form levers) — **NOT a (C) wall.** The "incompetence is unreachable" verdict below was
> **OVERTURNED** (see the ⚡ banner + "REPAIR LEVER" section). The method is mutating genomes; the search is the
> instrument, the frozen config is the product. Earlier sections that read incompetence as (C) are SUPERSEDED.

> **PICK UP HERE in a new session.** This is the live state of the A×B co-evolution program
> (`COEVOLUTION-SPEC.md`). Read that spec first for the program; read this for "what's built, what's
> measured, what's the next action." Operational SoT remains `STATE.md`.
>
> **⏩ LATEST (2026-06-19): jump to "Confirmed levers made DETERMINISTIC (option b)" below** (and the
> "Store-persistence … CONCLUDED NOT load-bearing" section before it). Four levers now exist — shape (✓ detection
> det / repair model — shape-drift), contract (✓ now DETERMINISTIC — admin-over; dump-replay recovers cgA d5+d8
> i25→i100 route-luck-free, 2/6, 0 regressions), persistence (✗ inert on quota: the oracle pre-seeds the store;
> built + validated + safe but not the bottleneck), seam (Mode-A det init / Mode-B model). Shape repair kept
> model-routed by design (its map↔array drift is semantic; documented in `src/shape-gate.mjs`). Quota's residual
> is a MIX of FORM modes (return-shape d4/d7 / shape d3 / wallet-seam d1), no single lever clears worst-of-K.
> Methodological rule added: dump-replay (`replay-persist.mjs`) to validate a lever's CAUSALITY *before* building
> it (code-inspection over-counts FORM just as the test-name classifier over-counts semantics).
>
> **🧭 DELIBERATION + TRIAGE DONE (codex×opus, `runs/deliberations/20260619T144826Z/`, see DECISION-BRIEF.md +
> the "Deliberation … FLOOR" section below): the falsy-return lever (A) is INADMISSIBLE** — the public
> `withdraw`/`deposit` specs say only "return a result" (no declared return shape), so a "return truthy" rule is
> oracle-shaped (a PROVENANCE leak), not contract-derived. Quota's residual is mixed-form but **not cleanly
> oracle-blind-fixable** this rung. **The real fork is now a PRE-REGISTRATION decision the USER must make: define
> the route-pool FLOOR** (rung-1 has no stopping rule without it; the worst-of-K tail contains below-floor
> incompetence — `MISSING:withdraw`, `Assignment to constant variable` — unwinnable by form levers). Then move to
> freeze prereqs / another topology. Adopt per-mode within-run lift as the headline; worst-of-K=8 = reporting bar;
> do NOT build A or B, do NOT wire MAP-Elites.
>
> **🧭 DELIBERATION #2 (codex×opus, CONVERGED, `runs/deliberations/20260619T145118Z/`, see "Deliberation #2 …
> BAR MISMATCH" section) — the autonomy question.** Verdict: autonomy PLUMBING is CLOSE (synthetic-path only),
> but FINDING best-fit genes on the live fitness is NOT close (uncharacterized drift-dominated extreme-order
> statistic) and a winning gene set is likely UNREACHABLE for quota+approval (oracle-blind form levers can't
> touch the incompetence/semantics tail). Key new insight = a **BAR MISMATCH**: we optimize per-mode lift but
> freeze/falsify on worst-of-K — they have diverged. Agreed next = a replicated live K=8 **worst-tail census**
> (quota-d1 + approval-d1, four-way dump-replay classification) to confirm the branch; MAP-Elites stays UNWIRED.
>
> **⚡ LATEST (2026-06-19, post-census) — the "unreachable" verdict is OVERTURNED; jump to "REPAIR LEVER" below.**
> User direction correction: cheap-model broken code is the PREMISE/target, not a (C) wall (memory
> [[incompetence-is-the-target]]). The census's dominant worst-of-K-gating mode was runtime free-id crashes that
> NO existing lever touched (all 4 assume running code). Built the **SELF-REPAIR gate** (`src/repair-gate.mjs` +
> `gates/lib/smoke-run.mjs`, smoke 18/18) — smoke-execute → route-back the SAME pool with the runtime error →
> re-smoke. **Causally validated (dump-replay, live route-back, $0): the crash is fixed 100% of runs; quota-A d4
> FAIL→100/100; the 2 others lift to FORM residuals the stack targets.** Repair = the bottom-of-stack unblocker.
> Open: repair-route-luck → best-of-N next; a tenancy/field-name lever for the exposed residual; then the search
> has a fitness the levers move.

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
instead of fake 100%; committed `8be721f`).

**FULL CORRECTED BASELINE** (`coevo-REGRADE-full.json`, K=8, real grading, `--seamgate`). worst-of-K = the
*minimum* draw; both-pass = draws passing crosscut AND integration at 100%:

| cell | surf | raw worst c/i | final worst c/i | gate Δ (draws) | both-pass raw→fin | verdict |
|---|---|---|---|---|---|---|
| quota-d1 | 4 | 20/0 | 20/0 | +0 | 2/8 → 2/8 | **FAIL** |
| approval-d1 | 4 | 57/0 | 86/50 | +2 | 1/8 → 2/8 | **FAIL** |
| lifecycle-d1 | 4 | 60/25 | 60/25 | +0 | 3/8 → 3/8 | **FAIL** |
| membership-d1 | 5 | 86/100 | 86/67 | +0 | 6/8 → **5/8** | **FAIL** |
| quota-d2 | 8 | 50/0 | 50/0 | +0 | 1/8 → 1/8 | **FAIL** |
| approval-d2 | 8 | 71/25 | 71/50 | +1 | 1/8 → 1/8 | **FAIL** |
| lifecycle-d2 | 8 | 60/38 | 60/38 | +0 | 1/8 → 1/8 | **FAIL** |
| membership-d2 | 9 | 92/83 | 92/83 | +0 | 3/8 → **2/8** | **FAIL** |
| quota-d3 | 12 | 47/0 | 47/0 | +2 | 0/8 → 0/8 | **FAIL** |
| approval-d3 | 12 | 76/42 | 76/42 | +0 | 0/8 → 0/8 | **FAIL** |
| lifecycle-d3 | 12 | 73/42 | 73/42 | +0 | 1/8 → 1/8 | **FAIL** |
| membership-d3 | 13 | 12/0 | 12/0 | +2 | 1/8 → 1/8 | **FAIL** |

**ALL 12 cells FAIL worst-of-K=8 under real grading.** Three load-bearing reads:
1. **The cheap-coded hybrid does NOT clear the model-agnostic worst-of-K reliability bar on ANY topology at
   ANY depth.** Per-draw success is moderate on easy cells (membership-d1 6/8) but the worst-of-8-routes bar
   is never met. quota integration is pinned at **0%** worst-of-K at every depth (conservation seam is
   systematically broken). The head-to-head's exact numbers reproduced (quota integ 25, approval crosscut 71)
   → those losses were REAL and structural; worst-of-K does NOT debunk them.
2. **The integration-gate is NOT load-bearing and is sometimes NET-NEGATIVE.** It raised integration on only
   0–2 draws/cell, and on membership-d1/d2 its repair *broke* a passing draw (both-pass 6/8→5/8, 3/8→2/8).
   On honest grading it does not earn its place.
3. **The A/B gene program is justified** against genuine, measurable failures — but it is a HARD problem
   (even the best existing lever doesn't move the worst-of-K needle).

**AUDIT (contamination scope):** all 19 `evaluateEpic` call sites checked — **`coevo-rung1.mjs` was the ONLY
harness with the bug.** P1/P2a/P2b/P2c (`src/evaluator.mjs`, `src/baseline.mjs`), the head-to-head, the
routed baseline, and the instrument gates (K6/K8/P0/G2) all source `testsPath` safely → NOT contaminated.
**Latent footgun flagged:** `rate(b)=b&&b.total?b.pass/b.total:1` returns 1.0 for any absent/empty bucket, so
any future grading error (harnessError / 15s timeout / empty) silently reads as 100% in head-to-head + coevo.
Recommend hardening to treat those as FAIL. (This run's verdicts are all FAIL regardless, so the conclusion
is robust; a few inflated draws can't fake a worst-of-K pass.)

**Everything in the (struck-through) sections below describes the artifact, not reality — kept for the audit
trail.** Real next step: resume gene work against these now-measurable failures (and harden `rate()`).

---

## ⏩ First action on pickup (UPDATED 2026-06-18, FINAL — grader bug fixed; real baseline = all cells FAIL; gene work is the next step)

**Read the 🛑 CRITICAL CORRECTION banner at the very top first.** Short version: the "RUNG-1 COMPLETE /
92/92 route-robust" story was a grader bug (`testsPath` undefined → fake 100/100). Bug is **FIXED + committed**
(`8be721f`). The **real baseline** (`coevo-REGRADE-full.json`, K=8, real grading): **all 12 cells FAIL
worst-of-K=8** — the cheap-coded hybrid does not clear the model-agnostic reliability bar on any topology at
any depth, and the integration-gate is not load-bearing (sometimes net-negative). Audit: bug contained to
`coevo-rung1.mjs`; P1/P2/head-to-head/baseline/gates unaffected. Everything in the struck-through "Session-2"
section below is the ARTIFACT, not reality.

**Do these in order:**

1. **Harden `rate()` (recommended FIRST — ~5 min, $0).** In `coevo-rung1.mjs` (and `head-to-head.mjs`) make a
   `harnessError` / `timeout` / empty-bucket grade count as **FAIL (0)**, not pass. Today `rate(b)=b&&b.total?…:1`
   returns 1.0 for an absent bucket — that is what turned the `testsPath` crash into a fake green, and a
   gateway-induced grading timeout would do the same. Removes the footgun so every future number is trustworthy.

2. **Start co-evolution rung-1 FOR REAL — the (A)+(B) gene work (task #3 below).** Build the genes in a NEW
   unfrozen `src/genome.mjs` (voids the current FREEZE; run as dev) against the now-measurable failures, and
   either fix the integration-gate so it helps on real failures or cut it. Target the actual failure modes
   (from `coevo-REGRADE-full.json`):
   - **quota** — conservation/no-overspend seam is systematically broken: **integration 0%** worst-of-K at d1/d2/d3.
   - **approval** — crosscut (authz / separation-of-duties) AND integration seam both fail (c57–86 / i42–50).
   - **lifecycle** — state-ordering + gated-read seam (i25–42).
   - **membership** — best at d1/d2 (gate-native: c86–92 / i67–83) but **collapses at d3** (c12/i0).
   Per-draw success is moderate on easy cells (membership-d1 6/8), so the lever is (B) output-QA that lifts the
   *worst* route, not the median.

3. **Re-validate the instrument (K6/K7/K8, P0)** AFTER the genes wire into the live evaluator + genome (per §3.3).

> **Apparatus (additive, dev — not frozen; all committed):** `coevo-rung1.mjs` has `--out <name>` and a fixed
> `loadEpic` (returns `testsPath`); `epicSpec` membership uses depth-matched `oracle2-tests-d${D}.mjs`
> (d1 bit-identical); new `gates/lib/oracle2-tests-d{2,3}.mjs`. **Re-run command (now grades for real):**
> `node studies/meta-search/coevo-rung1.mjs --seamgate --k 8 --epics <cells> --out <name>`.

> **Run artifacts (all gitignored, local only):** real baseline = `runs/coevo-REGRADE-full.json`; the
> dedicated d1 re-run = `runs/coevo-REGRADE-d1.json`. The deliberation that caught the bug is in
> `runs/deliberations/20260618T211915Z/`. The VOID artifact runs (`coevo-rung1*.json`, `coevo-lifecycle-d23`,
> `coevo-membership-d123`) are kept only for the audit trail.

---

## 🟢 Session-3 (2026-06-18, later) — `rate()` hardened; FIRST real co-evolution lever = the SHAPE-CONFORMANCE gate

Executed the "First action on pickup" plan against the now-honest baseline. All apparatus is **additive + dev**
(frozen tree `studies/build-gap/` untouched; new genome NOT yet introduced, so the FREEZE is not yet voided).

**1. `rate()` footgun HARDENED (pickup step 1, DONE).** In both `coevo-rung1.mjs` and `head-to-head.mjs`:
`rate(b)` now returns **0** (FAIL) for an absent/empty bucket, and a whole `harnessError`/`timeout`/`empty`
grade (which carries no buckets) is detected (`isGrade`) and scored as all-zero. The old `: 1` default was the
exact footgun behind the VOID 92/92. Verified by the mock run below (a `__noop` module now reads **0%/FAIL**,
not fake 100%). `head-to-head`'s `epicOK` was unaffected by the original bug but shared the footgun (a gateway
grading-timeout would read as fake green) — now closed too.

**2. The honest baseline's DOMINANT failure is a shared-store SHAPE mismatch** (`coevo-REGRADE-full.json`,
tallying every draw's `fails`): across quota / lifecycle / membership the #1 reason is
`db.<store>.get/set/filter is not a function` — a cheap route **violates the shape the skeleton already pins**
(`ctx.db.ledger` is declared "an array of {…}", `ctx.db.users` "a Map from …"). So this is **(B) output-QA**,
NOT (A): richer skeleton text can't fix a route that ignores an explicit contract. Ranked real failure modes:
(1) **store-shape drift** (quota all depths integ 0%; lifecycle `orderTransitions.get`; membership-d2
`vaults.filter`); (2) **MISSING/unwired surfaces at d3** (`touched-unwired:createProject/shipRelease/createMeter`
— extraction/format (B)); (3) **seam LOGIC** (approval execute-unapproved + idempotency; quota conservation);
(4) **cheap coding bugs** (`bio/deterministicRandom/reasureId is not defined`).

**3. Built the SHAPE-CONFORMANCE gate** (`src/shape-gate.mjs`, the first real co-evolution (B) lever).
Parses each shared store's declared shape (array vs Map) from the **public** skeleton+preamble; detects each
surface's actual access style (map `.get/.set/.has` vs array `.find/.filter/.push/…`) **robust to destructuring**
(`ctx.db.X`, `db.X`, bare `X` from `const {X}=ctx.db` — the prior gates matched only literal `ctx.db.X`, which
is why they no-opped on the real `db.ledger.get` failures); flags only clear map↔array contradictions
(high-precision, avoids the existing gate's net-negative trap); repairs via an oracle-blind model route-back
anchored on the surface's own code + a preserve-every-guard clause. Smoke `gates/shape-gate-smoke.mjs` =
**31/31 green** (parse ×4 topos · all 3 ref forms · both violation directions · no false-positive on
correct/mixed/`.values().filter()` · no partial-name contamination · repair clears · oracle-leak void · off=no-op).

**4. Wired `--shapegate` into `coevo-rung1.mjs`** as a PRE-PASS before the seam gate, with **three-grade
instrumentation** (raw → afterShape → final) so the shape lever's worst-of-K delta is attributable on its own.
Mock wiring verified ($0). A live **K=1** quota-d1 draw confirmed the gateway + honest grading (it landed on 4
shape-correct routes → genuine 100/100, shape-gate correctly 0-flagged).

**5. LIVE paired probe (K=8, `--shapegate --seamgate`) — the shape lever is CONFIRMED load-bearing where
shape-drift dominates; worst-of-K=8 is gated by a DIFFERENT mode per cell.** Three-grade raw→afterShape→final:

- **lifecycle-d2** (`runs/coevo-shape-lifecycle-d2.json`): **shape is the load-bearing lever.** It detects
  multiple stores + both directions (`transitions`/`orderTransitions` want-array, `docs`/`orders` want-map) and
  lifts most drifted draws hard — draw1 60/i50→**100/i100**, draw3 50/i38→**90/i88**, draw6 50/i50→**90/i88**
  (16 repairs / 6 draws). **worst-of-K crosscut 40%→70% (+30pp)**; integration worst stuck at 38% because the
  WORST draw (draw7, 90/i38) is a NON-shape failure (`Order not found`/`Doc not published` = the multi-store
  seam — the profile gate only covers `transitions`, not the `orders` store) the gate correctly 0-flags.
- **quota-d1** (`runs/coevo-shape-quota-d1.json`): shape-gate is **correct but not the bottleneck** — today's
  pool fails 3 ways across routes, so worst-of-K=8 (raw 60/i0 → final 60/i0) is UNMOVED: draw4 (60/i0) is the
  shape crash `db.ledger.get is not a function` (the flip-only detector flagged 0 → the **mixed-flag fix above**
  now targets it); draws 2/5/6 (i25) are the **over-applied admin-authz hallucination** (`Only admins can
  withdraw` — skeleton gates only *deposit* to admins); draw8 (i25) is genuine **conservation logic**.

**Load-bearing rung-1 read:** the shape lever is a real, attributable (B) win on its target failure, but
**worst-of-K=8 across the non-stationary route pool is gated by the single worst draw, which is a different
mode on every cell** → rung-1 needs a STACK of attributable levers (shape ✓ · contract-precision for
over-applied authz · seam-generalization for non-profile stores · extraction for d3 MISSING), not one. This
is the co-evolution premise working as intended (stack + attribute + climb), NOT a null. ⚠️ The pool is
non-stationary (memory `model-agnostic-and-failure-attribution`): today's quota worst draw is the authz
hallucination, the regrade's was the shape crash — worst-of-K partly measures pool drift, so single-cell
verdicts must read the per-draw modes, not just the aggregate.

**NEXT LEVER = (A/B) contract-precision** (the most frequent quota failure + the spec's predicted gene):
detect/repair an admin-gate enforced on a surface the contract scopes admin to a DIFFERENT surface (encodable
as a (B) lint over the public authz clause, per COEVOLUTION-SPEC §8.2). Then seam-generalization for the
non-profile store (lifecycle `orders`). The shape-gate `--dump` capture (`runs/dump/q1`) verifies the
mixed-flag fix on real failing code.

> **Re-run command:** `node studies/meta-search/coevo-rung1.mjs --shapegate --seamgate --k 8 --epics <cells> --out <name>`
> (add `--dump <dir>` to save each draw's raw built files for offline diagnosis).
> New files (additive, dev, uncommitted): `src/shape-gate.mjs`, `gates/shape-gate-smoke.mjs` (32/32); edits to
> `coevo-rung1.mjs` (+`--shapegate`, +`--dump`, hardened `rate`, 3-grade instrumentation) and `head-to-head.mjs`
> (hardened `rate`). Probe artifacts gitignored under `runs/`.

### Deliberation (codex/GPT-5.5 × Opus, 4 rounds, `runs/deliberations/20260619T051701Z/`) — agreed next-step plan

Strong convergence. Verdict: **build the contract-precision lever next (option A), with two refinements that
make it falsifiable.** Rejected: **B** (wire into MAP-Elites) — premature with ≤1.5 confirmed levers on an
**uncharacterized live fitness** (credit-attribution would score counterfactual reversion on a noisy number);
**metric-relaxing C** (pin routes / cut K) — launders route-selection back in, violates model-agnosticism;
**D** as the main step — hygiene, do alongside.

Two load-bearing refinements (both from the critic turns), folded in:
1. **The live worst-of-K=8 fitness has ZERO test-retest characterization** (P0/K8 validate only the synthetic
   path). It is a *minimum over 8 draws* = an extreme order statistic, maximally sensitive to pool drift; the
   "cell FAIL→PASS" claim is **across-run**, where drift bites. → Optimize against **within-run paired per-mode
   draw-level lift**; keep worst-of-K=8 as the **reporting bar only**. Run the probe with the **gate-OFF (raw)
   arm replicated** (back-to-back; nearly free — the paired probe re-runs raw anyway) to read test-retest
   stability. **Confirmed from existing logs:** across the two quota-d1 runs, `authz-over` + `shape` recur
   (stable, lever-worthy) while the worst-of-K-*gating* mode flips (run1 shape `i0`, run2 MISSING `i0`) →
   across-run cell-pass is drift-gated; per-mode within-run lift is the trustworthy signal.
2. **THE CEILING — oracle-blind gates enforce FORM, not CORRECTNESS.** Every admissible lever (shape,
   contract-precision, seam, extraction) can fix *form* (store shape, guard applicability, surface presence,
   init, representation) but **none can close a pure-semantics gap** (wrong conservation arithmetic, wrong
   approval predicate, off-by-one) — that needs the oracle they are forbidden to read. So **rung-1 is winnable
   IFF every mode in the worst-of-K tail is a form defect.** The tail is already mixed (quota draw8 = genuine
   conservation logic = semantics; `…is not defined` = coding-incompetence). → The contract-precision probe's
   **PRIMARY deliverable is the RESIDUAL worst-draw mode + its A/B/C class**: form → name + build the next
   lever; **semantics/incompetence → a (C) thesis boundary → STOP stacking, record the scope-shrink for that
   cell.** (C) is not just a metric worry — it is a *probe outcome that tells you when to stop.*

Apparatus-correctness flag to verify (from `--dump`): a B-gate repairs via **model route-back = a single
gateway draw**; grading it once smuggles single-draw route-luck into a worst-of-K fitness (the exact
model-agnostic violation the objective forbids). Confirm gate-repair output robustness before trusting credited lift.

**Agreed probe spec (next build):** contract-precision = oracle-blind authz-applicability lint over the public
obligation clause (flag an admin-gate on a surface the contract scopes admin to a DIFFERENT surface; narrow
repair; preserve every declared guard); instrument `raw→afterShape→afterContract→final`; paired K=8 quota-d1
with the raw arm replicated + per-draw `{route, mode, gate-fired, guard-changed, regressions}`; **headline read
= residual worst-draw mode (form ⇒ climb / semantics ⇒ (C) boundary)**; climb d2/d3 only under cumulative
non-inferiority. Do NOT wire search; do NOT relax the metric; commit apparatus as hygiene.

### Contract-precision lever BUILT + PROBED (the agreed plan, executed) — second lever CONFIRMED; (C)-boundary NOT reached

Built `src/contract-gate.mjs` (oracle-blind admin-applicability lint: admin-scoped set parsed from the public
clause by *over-inclusion* → never a false guard-removal; flags an `role !== 'admin'`/"only admin" gate on a
non-scoped surface; narrow model route-back removing only that guard). Smoke `gates/contract-gate-smoke.mjs`
**20/20** (incl. the conservative under-flag on approval `execute`, precision vs the permissive `=== 'admin'`,
and the real dumped pattern). Wired `--contractgate` (pipeline shape→contract→seam; 4th grade `afterContract`;
a per-draw failure-mode classifier with a form/semantics/incompetence class + the **residual-worst-mode**
readout). Regression-clean (contract 20 · shape 32 · seam 22).

**Probe = 2× back-to-back paired K=8 quota-d1 `--shapegate --contractgate --seamgate --dump`**
(`runs/coevo-contract-quota-d1-{A,B}.json`, dumps `runs/dump/q1-cg{A,B}`):
- **Contract lever CONFIRMED load-bearing (within-run paired lift):** Run A draws 5 & 8 `shape 100/i25 →
  contract 100/i100` (1 flag/1 repair each) — removed the over-applied admin gate, integration **25→100**.
  Shape also lifted draw3 25→100. **Both levers now validated on their target modes; no oracle leaks; admin
  gates correctly left on `deposit` (the scoped surface).**
- **worst-of-K=8 still FAILS, and the gating mode is DRIFT-UNSTABLE** (run A worst = `Wallet does not exist`
  i0; run B worst = `Assignment to constant variable` i0 + `MISSING:withdraw`). Confirms the deliberation:
  across-run cell-pass chases a moving target → **optimize on per-mode within-run lift; worst-of-K=8 = reporting
  bar only.**
- **THE (C)-BOUNDARY IS *NOT* REACHED on quota — the headline result.** The residual labelled
  "conservation/semantics" by the test-name classifier is, on **code inspection of the dumped draws**, a
  **store-PERSISTENCE seam defect (FORM)**: the conservation *guard* is present and correct
  (`if (amount > currentBalance) throw 'Insufficient funds'`), but the surface does
  `const ledger = ctx.db.ledger ?? []; …; ledger.push(…)` — pushing to a **local copy never written back**.
  This anti-pattern is pervasive (10/dumped draws) and **0 draws** use the persisting `ctx.db.ledger ??= []`.
  ⚠️ **Measurement caveat:** the form/semantics class MUST be read from code, not the failing test's name — the
  test-name classifier OVER-counts semantics. So quota's residual tail is **still form-addressable**, not a wall.
- **New structural finding + next lever:** the dominant quota integration killer is this **store-persistence /
  defensive-init seam** (same class as P2a's "missing defensive-init of a non-base shared store"), and the
  current seam-gate Mode-A does **not** repair the `?? []` / `|| []` local-copy pattern (its `hasInit` only
  recognizes `??=`/`||=`/container-assign). **NEXT LEVER = store-persistence/init** (extend seam-gate Mode-A to
  flag-and-rewrite the non-persisting local-copy pattern, OR a dedicated persistence lever). Then extraction for
  MISSING.
- **Route-incompetence caveat:** some worst draws are `Assignment to constant variable` / `MISSING` — a route
  emitting broken/no code. These are neither form nor semantics; under worst-of-K=8 one such route fails the
  cell. Whether such a route is "above-floor" is a **model-agnostic-boundary** question (cf. deliberation:
  "worst draw is a recurrent specific route → boundary signal, not a lever"), to watch as K grows.

**Decision (per the deliberation's rule): residual = FORM ⇒ keep stacking.** Next = the store-persistence/init
lever. Still do NOT wire MAP-Elites (now 2 confirmed levers, but the live fitness is still uncharacterized and
the worst residual is form-addressable). New files (additive, dev, uncommitted): `src/contract-gate.mjs`,
`gates/contract-gate-smoke.mjs`; `coevo-rung1.mjs` (+`--contractgate`, 4-grade, residual-mode classifier).

### Store-persistence lever BUILT + VALIDATED + CONCLUDED **NOT load-bearing on quota** — the prior diagnosis was a code-inspection misattribution (the oracle pre-seeds the store → the `?? []` pattern is LATENT)

Built the third lever as planned — `src/persistence-gate.mjs`, a deterministic, oracle-blind, guard-preserving
gate that detects the documented `const ledger = ctx.db.ledger ?? []; … ledger.push(…)` local-copy-not-written-
back pattern on non-base shared stores and surgically rewrites it to persist via alias (`ctx.db.ledger ??= [];
const ledger = ctx.db.ledger`), reading the init shape from the route's OWN `?? <init>` literal (so it avoids the
seam-gate Mode-A trap of injecting a wrong-shape default). Smoke `gates/persistence-gate-smoke.mjs` **33/33**
(grounded on the real dumped d1/d4 withdraw bug + no-false-positive on d8/d1-deposit/read-only/written-back/
base-store + `||`/Map/object/`db.X` variants + repair-preserves-guards). Wired `--persistgate` into
`coevo-rung1.mjs` as a deterministic pre-pass between contract and seam (5-grade: raw→shape→contract→persist→
final). Regression-clean (persist 33 · shape 32 · contract 20 · seam 22); P0/K8 unperturbed (synthetic path
calls no gate). A K=2 live smoke confirmed it composes with zero regression and **zero false-fire** (0-flagged on
persisting routes).

**Then a DETERMINISTIC REPLAY over the real dumps falsified the persistence hypothesis** (`replay-persist.mjs`,
$0, no gateway — loads the RAW dumped surfaces the doc inspected, grades through the frozen `evaluateEpic`,
applies the gate, re-grades; removes the non-stationary-pool noise that makes a live A/B unattributable). On
**both** `runs/dump/q1-cg{A,B}` (16 draws): the gate **fires correctly on exactly the flagged draws (d1/d4
withdraw in cgA; d5/d7/d8 in cgB) with ZERO regressions, but RECOVERS 0/11 integration failures.**

**Root cause (the load-bearing correction):** the quota oracle **pre-seeds the seam store** —
`epics-src/quota.mjs:freshDb` does `db[d.ledgerDb] = []` for every test, so `ctx.db.ledger` is NEVER undefined
at runtime. Therefore `const ledger = ctx.db.ledger ?? []` ALWAYS aliases the real pre-seeded array, the `?? []`
fallback NEVER fires, and `ledger.push(…)` persists **even unrepaired**. The persistence pattern is real in the
cheap-model output but **causally inert under this oracle** — the prior "store-persistence is the dominant quota
integration killer" read was a *misattribution from code inspection alone* (pattern-presence ≠ causality). (The
same pre-seeding also makes the seam-gate Mode-A `??= new Map()` mis-fire a runtime no-op here, since `??=` skips
the already-seeded array — so neither the bug nor its mis-repair bites on quota.) NB: the init axis IS
load-bearing where the oracle does **not** pre-seed — membership's `scale-oracle` creates the store under a
different name and never reads it (integration-gate.mjs:9-15, P2a Mode-A INTEG 0%→100%) — but membership surfaces
use *direct* `ctx.db.X.has` access, not the `?? []` alias, so the persistence lever has **no demonstrated home in
the current oracle suite**. It stays in the tree as a correct, validated generalization, not a claimed win.

**The ACTUAL quota integration residual, classified by CODE (per the deliberation's rule), is a MIX of form
modes — NOT persistence and NOT a clean (C) semantics wall:**
- **d3** — SHAPE (`db.ledger.get is not a function`) → shape-gate's job (model route-back).
- **d5 / d8 (cgA), d8 (cgB)** — admin OVER-APPLICATION (`only admins can withdraw`) → contract-gate's job.
- **d4 / d7 (cgA)** — **NEW mode: falsy-return-shape.** `withdraw` returns a **bare number** (`return
  currentBalance - amount`); when a withdrawal drives the balance to **exactly 0** it returns `0`, and all four
  integration tests (CONSERVE+/OVERSPEND-/IDEMPOTENT) assert `assert.ok(api.withdraw(…))` on a to-zero
  withdrawal → `assert.ok(0)` fails. The reference returns a truthy `{applied:true}`. This is an OUTPUT-CONTRACT
  (form) defect, **not** conservation arithmetic — the test-name classifier mislabels it "conservation/semantics."
- **d1 (cgA)** — wallet-seam (`Wallet does not exist`) → a createWallet/`ctx.db.wallets` issue, separate again.

**Reads:**
1. **The persistence hypothesis is dead on quota; the (C) boundary is still NOT reached** — the residual is form,
   but spread across shape / admin-over / **return-shape** / wallet-seam, each needing its own lever (the
   deliberation's "worst-of-K gated by a different mode per draw → needs a STACK," confirmed).
2. **Methodological lesson (new): validate CAUSALITY before building a lever.** Code-inspection can OVER-count
   *form* the same way the test-name classifier over-counts *semantics*: a syntactically-present anti-pattern
   (`?? []`) can be causally inert if the oracle's setup neutralizes it. The cheap, decisive check is the
   deterministic dump-replay (does repairing the pattern change the GRADE?), which should gate any future lever
   build. `replay-persist.mjs` is that instrument — use it next time *before* writing the gate.
3. **Next-lever candidates, evidence-ranked (a STRATEGY CALL — the residual is mixed, no single lever clears
   worst-of-K):** (a) the **falsy-return-shape** lever (d4/d7) is the most frequent *unaddressed* mode but is
   **oracle-blindness-risky** — the public skeleton never states the return must be truthy, so a lever enforcing
   "a mutating op returns a non-falsy success object" is a defensible *robustness convention* but not contract-
   derived; (b) make shape/contract **deterministic** so they recover in a route-luck-free replay (today they
   need a model route-back, which the deliberation warns smuggles single-draw luck into worst-of-K); (c) accept
   quota's mixed-form residual as the rung-1 reporting bar and move to freeze prerequisites. Do NOT wire
   MAP-Elites (live fitness still uncharacterized; now 2 confirmed levers + 1 validated-but-inert).

> **Re-run commands:** replay (deterministic, $0) `node studies/meta-search/replay-persist.mjs --dump runs/dump/q1-cgA --epic quota-d1 [--stack]`;
> live `node studies/meta-search/coevo-rung1.mjs --shapegate --contractgate --persistgate --seamgate --k 8 --epics quota-d1 --out <name>`.
> New files (additive, dev, uncommitted): `src/persistence-gate.mjs`, `gates/persistence-gate-smoke.mjs`,
> `replay-persist.mjs`; `coevo-rung1.mjs` (+`--persistgate`, 5-grade). ⚠️ The `--stack` replay's *model-routed*
> repairs (shape, seam-Mode-B) are inert under the replay's noop `rebuild`; only the DETERMINISTIC repairs
> (contract [see next section], persist, seam Mode-A) apply offline.

### Confirmed levers made DETERMINISTIC (option b) — contract: route-luck-free surgical removal, recovers 2/6 offline; shape: KEPT model-routed (semantic, documented)

Per the deliberation (model route-back smuggles a single gateway draw into a worst-of-K fitness) and the
strategy call, converted the two CONFIRMED levers toward deterministic, route-luck-free repairs:

- **CONTRACT — DONE, deterministic surgical removal.** `surgicalRemoveAdminGate` deletes the over-applied
  `if (role !== 'admin') throw …` statement (block + single-statement forms, both operand orders), $0,
  guard-preserving by construction (only the admin-refusal line is removed; tenancy/validation/conservation
  stay byte-for-byte). `runContractGate` now runs the deterministic sweep FIRST (kind=`deterministic`), with the
  model route-back kept only as a fallback for the residual it can't reach (message-form helper `if(!isAdmin(ctx))…`
  / compound conditions — removing a compound `&&` would drop the other clause, so we under-repair). Smoke
  **26/26** (was 20: + surgical removal preserves other guards, no model rebuild called, single-stmt form, message-
  form falls back, permissive `===admin` untouched, leak via the model-fallback path).
- **VALIDATION (deterministic dump-replay, $0, route-luck-free):** with contract deterministic, the `--stack`
  replay now **recovers cgA d5 + d8 (admin-over, i25→i100) deterministically — 2/6, ZERO regressions** (was 0/6
  when contract needed a model rebuild). cgB recovers 0/5 (its residuals are other modes). This is the concrete
  option-(b) win: the most frequent *contract* mode is now fixed with no gateway draw in the loop.
- **SHAPE — KEPT model-routed (deliberate, documented in `src/shape-gate.mjs`).** A deterministic shape repair
  was assessed against the real dump (cgA d3) and **rejected**: the violation is a FULL writer/reader drift
  (deposit = flat-array `.find/.push`; withdraw = Map `.get(walletId)`/`.set(walletId,[...])`). Converting
  map→array is irreducibly SEMANTIC — it needs per-key regrouping + the entity key-field (`walletId`/`budgetId`/…),
  which an oracle-blind regex cannot synthesize without risking a net-negative (the program's hard rule: a false
  repair is worse than a miss). Detection stays deterministic; only the repair routes to the model, until there
  is >n=1 evidence to justify a guarded field-parsing transform. (If wanted, that transform is the documented
  next option — but it should clear the dump-replay causality bar first.)

**Net rung-1 lever status:** shape (✓ detection det / repair model — shape-drift), contract (✓ DETERMINISTIC —
admin-over, recovers 2/6 offline), persistence (✓ deterministic but INERT on quota — oracle pre-seeds), seam
(Mode-A det init / Mode-B model drift). Quota worst-of-K still gated by a per-draw-varying mode (return-shape
d4/d7, shape d3, wallet-seam d1, cgB tails) → no single lever clears it; the stack recovers the admin-over slice
route-luck-free. Smokes: shape 32 · contract 26 · persist 33 · seam 22. P0/K8 unperturbed (synthetic path calls
no gate). NEXT remains a strategy call (return-shape lever [oracle-blindness-risky] / accept the mixed-form bar +
freeze prereqs).

### Deliberation (codex/gpt-5.5 × opus, 4 rounds, `runs/deliberations/20260619T144826Z/`) + the $0 triage → A is INADMISSIBLE; the real fork is the route-pool FLOOR (pre-registration)

Strong convergence, then a decisive cheap triage. Full synthesis: `runs/deliberations/20260619T144826Z/DECISION-BRIEF.md`.

**Converged recommendation:** treat option A (falsy-return lever) as a **two-stage probe, never built blind** —
(0) a **binary admissibility gate**: does the *public* contract DECLARE `withdraw`'s return shape? and (1)
deterministic dump-replay causality. **Reject B** (deterministic map↔array = highest false-repair blast radius;
the d3 drift is semantic, kept model-routed by design). **C is the fallback.** **Adopt D(i) now regardless:**
per-mode within-run lift is the **headline**, worst-of-K=8 the **reporting bar**; do **NOT** wire MAP-Elites.

**Opus's two load-bearing sharpenings:** (1) **oracle-blindness is about PROVENANCE, not runtime** — a rule
reverse-engineered from the grader's `assert.ok` is a leak even if the gate never reads `tests.mjs`; only an
*independent public declaration* of the return shape launders it → the grep is step 0 and binary. (2) **The real
gap: rung-1 has NO STOPPING RULE because the route-pool FLOOR is undefined** — the spec promises only
"above-floor" cheap models; a worst-of-K over a pool containing below-floor routes (`MISSING:withdraw`,
`Assignment to constant variable`) is structurally unwinnable by oracle-blind form levers. The floor is a
**pre-registration** decision (gerrymander risk).

**The $0 triage (executed):**
- **Admissibility gate — FAILED.** `surfaces/withdraw.md`/`deposit.md` say only *"return a result"* — NO return
  shape declared in any public artifact → **the falsy-return lever is INADMISSIBLE** (oracle-shaped provenance
  leak). (Nuance: `listWallets` "an array" / `createWallet` "return it" DO declare a shape → a return-axis
  shape-gate extension is admissible *there*; cf. cgB d6/d7 `listFn()…some is not a function`, i75 — but it does
  not clear the worst-of-K tail.)
- **Floor-classify (pre-committed minimal predicate = parseable ∧ exports surface), 16 dumps:** 15/16 above-floor;
  1 below-floor (cgB d2 `noexport:withdraw`). ⚠️ The strict floor does NOT exclude *runtime* incompetence (cgB d4
  `Assignment to constant variable` parses+exports yet crashes) — excluding it edges toward route-selection.
- **Tail by CODE:** wallet-seam (cgA d1, form) · shape-drift (d3, semantic→model-routed) · **return-shape (d4/d7,
  INADMISSIBLE)** · admin-over (d5/d8, now deterministically fixed) · MISSING (cgB d2) · incompetence (cgB d4) ·
  list-return-shape (cgB d6/d7, admissible, i75) · return-shape (cgB d8, INADMISSIBLE).

**VERDICT:** the binary gate is silent → A inadmissible → quota's residual is **mixed-form but NOT cleanly
oracle-blind-fixable for this rung** (the tail mixes an inadmissible mode, a semantic-repair mode, and
route-incompetence the strict floor can't exclude). This is exactly opus's reversal condition → "characterize,
don't build." **NEXT (the genuine fork, a PRE-REGISTRATION decision — user's call): DEFINE THE ROUTE-POOL FLOOR**
(minimal content-independent predicate, pre-committed before any climb; decide whether runtime-incompetence like
const-reassignment is below-floor), then **move to freeze prerequisites / another topology** (2nd oracle, diverse
templates, commit apparatus, re-validate K6/K7/K8/P0) rather than manufacturing an oracle-shaped lever. Do NOT
build the falsy-return lever, do NOT build B, do NOT wire MAP-Elites.

### Deliberation #2 (codex/gpt-5.5 × opus, 4 rounds → CONVERGED, `runs/deliberations/20260619T145118Z/`) — the AUTONOMY/setup question + the BAR MISMATCH

**Question (user):** is the setup close to (1) AUTONOMOUSLY running the orchestrator (MAP-Elites + the §14 checkpoint/resume/watchdog) and (2) having that search IDENTIFY the genes best-fit for the north-star win? Converged after 2 exchanges — opus moved gpt-5.5 on a load-bearing point; both then marked the decision stable.

**Converged verdict — split, and it answers the autonomy question directly:**
- **(a) autonomy PLUMBING — CLOSE.** §14 checkpoint/resume bit-identical + watchdog halts-to-checkpoint + P0/K8 GREEN, but **synthetic-path only**. A live autonomous run is blocked by >150s per N=13 eval + an uncharacterized live signal.
- **(b) the search FINDING best-fit genes on the LIVE fitness — NOT CLOSE.** All 12 cells FAIL worst-of-K=8 on honest grading; levers are partial/mode-specific; the live worst-of-K fitness has **zero test-retest characterization** and is an extreme order statistic over a non-stationary pool → MAP-Elites would rank route-luck / single-draw route-back-luck / grader artifacts as gene quality. (Credit-attribution + surrogate were validated only where a cheap winner exists BY CONSTRUCTION; K7 already tripped at N=17, ρ=0.788.)
- **(c) is a winning gene set even REACHABLE — NOT CLOSE / likely UNREACHABLE** for quota+approval with the current oracle-blind toolkit: the worst-of-K=8 tail mixes drift, a borderline return-shape mode (INADMISSIBLE per Deliberation #1), and irreducible route-incompetence (`Assignment to constant variable`, `MISSING:withdraw`) whose only "fix" is re-draw = inadmissible.

**The new program-level insight — a BAR MISMATCH (the decision-changer):** the program has operationally demoted worst-of-K=8 to a *reporting bar* and now optimizes **within-run per-mode paired lift**, but the **win condition + the freeze/sequestered-TEST falsification are still defined in worst-of-K**. Optimization target and falsification target have **diverged** — an autonomous run can improve per-mode lift indefinitely and still fail the freeze bar, because that bar is gated by drift/incompetence tails no oracle-blind lever can touch. This makes Deliberation #1's route-pool-FLOOR decision *urgent*; it is a freeze-win-condition (pre-registration) call.

**Agreed next action (stable, both models): a replicated live K=8 WORST-TAIL CENSUS on quota-d1 + approval-d1** — hardened grader, current deterministic stack, replicated raw arm, per-draw `{route, mode, gate-fired, regressions}`, and **dump-replay causal classification of every worst draw** into four buckets: `{deterministically-form-repairable | model-route-back-only | route-incompetence | semantics-oracle-needed}`. **Primary deliverable:** the worst-draw mode-class census (resolves (c)) + whether per-mode within-run lift co-moves with worst-of-K cell-pass (tests the bar mismatch). The census is **d1-only so the DUE-but-undone K6 re-validation does NOT block it** (d1 grades through the head-to-head-validated graders; K6 gates the d2/d3 climb). The `model-route-back-only` bucket catches route-luck laundering (shape + seam Mode-B are still model-routed).

**Decision fork (reconciled with Deliberation #1):** worst tails dominated by `deterministically-form-repairable` → build that lever (but the only unaddressed form mode, return-shape, was already ruled INADMISSIBLE in #1); dominated by `route-incompetence`/`semantics` → the move is **NOT** more levers or MAP-Elites but the **user pre-registration call to define the route-pool FLOOR / redefine the freeze win-condition** (per-mode-lift bar, or worst-of-K with an explicit above-floor route-admissibility rule). **MAP-Elites stays UNWIRED until the live fitness is characterized.** What reverses it: both cells' worst tails are deterministically form-repairable with zero regressions → the ceiling worry collapses and the next step is the lever.

**Silent-mislead flags for any autonomous run:** new-grader no-op class (K6 re-validation overdue after the `oracle2-tests-d{2,3}` wiring — the `rate()` footgun was latent until a deliberation caught it); model route-back = a single draw graded once inside worst-of-K (route-luck laundered into a model-agnostic fitness); non-stationary gateway pool drift; surrogate decorrelation (cache built from drifting draws → faster K7 kills → >150s/eval NOT mitigated → live autonomous search stays impractical); code-inspection causality errors (the persistence misread).

**CENSUS RESULT (DONE 2026-06-19; fresh paired live K=8 both cells, full deterministic stack + dumps; classifier
`census-classify.mjs`; artifacts `runs/census-{quota,approval}-d1-{A,B}.json` + `runs/census-class-*.json`):**

| arm | worst-of-K raw → live(stack) | cell | WORST-DRAW bucket | bucket census (8 draws) | bar-mismatch |
|---|---|---|---|---|---|
| quota-d1 A | c20/i0 → c20/i0 | **FAIL** | **route-incompetence** (incompetence×8) | det-form-repairable 2 · semantics 1 · form-unhandled 1 · route-incompetence 1 · unknown 1 · PASS 2 | stack lift **does NOT** move worst-of-K |
| quota-d1 B | c20/i0 → c20/i0 | **FAIL** | **route-incompetence** (incompetence×8) | det-form-repairable **5** · route-incompetence 1 · form-unhandled 1 · unknown 1 | does NOT move |
| approval-d1 A | c0/i0 → c0/i0 | **FAIL** | **route-incompetence** (incompetence×10) | route-incompetence 2 · semantics 1 · form-unhandled 1 · unknown 3 · PASS 1 | does NOT move |
| approval-d1 B | c57/i0 → c86/i50 | **FAIL** | **route-incompetence** | route-incompetence 2 · semantics 2 · form-unhandled 1 · unknown 2 · PASS 1 | does NOT move |

**Four load-bearing reads (the census ANSWERS the deliberation's two questions):**
1. **Reachability (c) — CONFIRMED likely UNREACHABLE.** The worst-of-K=8 gating draw is **`route-incompetence` in 4/4 arms** — a cheap route emitting broken code (`Assignment to constant variable`, ReferenceError, `Cannot read properties of undefined`) or a MISSING surface. Its only "fix" is **re-draw = route selection = INADMISSIBLE** under model-agnosticism. No oracle-blind lever — deterministic OR model-routed — can touch it. The ceiling both deliberations predicted is real and binding at d1.
2. **BAR MISMATCH — CONFIRMED empirically.** The deterministic stack lifts the **median** hard (quota-d1 B: **5/8 draws** deterministically recovered i25→i100 via the surgical contract repair) but moves the **worst-of-K cell verdict by 0 pp in 4/4 arms**. Per-mode within-run lift (the current optimization target) ≠ worst-of-K cell-pass (the freeze/falsification target). Optimizing the former will **never** clear the latter — the two targets are empirically decoupled.
3. **`model-route-back-only` = 0 / 32 draws.** The model-routed shape + seam-Mode-B repairs uniquely recovered NO worst-tail draw beyond what the deterministic stack already did → (good) the single-draw route-luck-laundering risk did not materialise as a spurious recovery; (also) the model-routed gates are not load-bearing on these d1 tails.
4. **Test-retest (the deliberation's stability question):** the worst-draw **class (route-incompetence) is STABLE across A/B in BOTH cells**; only the specific worst route/mode drifts (pool non-stationarity). So the unreachability conclusion is **drift-robust** — exactly the asymmetry opus flagged (instability would be decisive, but here even the *stable* signal is a FAIL).

**Caveat (honest):** 7/32 draws bucketed `unknown` (classifier regex gaps — `Insufficient funds` / `status advanced to executed` are most likely *semantics*; refining would push the tail **more** toward unreachable, not less). Does not change the worst-draw verdict, which is unambiguous incompetence in every arm.

**→ THE FORK [SUPERSEDED 2026-06-19 — see "REPAIR LEVER" below]:** the census read this as "do NOT build another
lever; the incompetence tail is unreachable; escalate a route-pool-FLOOR pre-registration call." **The user
rejected that interpretation** (model-agnosticism is the definition of the problem; cheap-model broken code is
the PREMISE/target, NOT a (C) boundary — memory [[incompetence-is-the-target]]). The census was right about
*where* the wall is (route-incompetence crashes gate the worst-of-K); the "unreachable" call was wrong. The
correct response is to build the missing lever class — which the next section does, and it WORKS.

### REPAIR LEVER (the broken-code (B) output-QA lever) — BUILT + CAUSALLY VALIDATED; the "unreachable" verdict OVERTURNED (2026-06-19)

**Root gap the census exposed:** all four prior levers (shape/contract/persist/seam) assume **already-running**
code; NONE repairs broken code. And import-only structural validation (`validate-surface.mjs`) green-lights
modules that crash only when the oracle *invokes* them. So the dominant worst-of-K-gating mode — runtime
free-id ReferenceErrors (`bio is not defined`, `generateUniqueId is not defined`) — had no lever at all.

**Built (additive, dev):** `gates/lib/smoke-run.mjs` (permissive-harness smoke: runs each surface under
self-vivifying Proxy ctx/args so it executes deep without harness-side TypeErrors, capturing ONLY genuine
`X is not defined`/`is not a function` — high-precision, zero false-positive on passing draws); `src/repair-gate.mjs`
(smoke-detect → route-back the SAME cheap pool with the exact runtime error → re-smoke → accept first clean;
oracle-blind via `scanOracleLeak`, model-agnostic); `gates/repair-gate-smoke.mjs` **18/18**; `--repairgate`
wired as the FIRST pre-pass in `coevo-rung1.mjs` (own `afterRepair` grade); `replay-repair.mjs` (causal
dump-replay, `--stack`).

**Causal validation — dump-replay on the 3 census worst-draws that GATED the worst-of-K (live route-back, $0):**

| draw | raw | afterRepair | + full stack | crash fixed? | residual |
|---|---|---|---|---|---|
| quota-A d4 (`bio`) | c20/i0 | **c100/i100** | — | ✓ | none — **FULL RECOVERY** |
| quota-B d5 (`bio`) | c20/i0 | run1 c100/i25 · run2 c40/i0 | c40/i0 | ✓ (both) | run1 admin-over · run2 tenancy |
| approval-A d4 (`generateUniqueId`) | c0/i0 | c57/i25 | **c71/i25** (shape +14c) | ✓ | tenancy field-drift (`organizationId` vs `orgId`) |

**Four reads:**
1. **OVERTURNED — the incompetence wall is breachable.** Every replay run: detect → route-back → re-smoke
   `fixed=1`; the crash was eliminated **100% of the time**. The cheap pool, handed its own stack trace,
   rewrites its own broken code. A worst-of-K-gating draw (quota-A d4) went FAIL → **100/100**. Route-incompetence
   is a (B) output-QA target, not a (C) boundary.
2. **Repair = the unblocker at the BOTTOM of the stack.** Fixing the crash EXPOSES the form modes underneath
   (admin-over, tenancy), which the other levers target → repair must run first.
3. **Repair-route-luck is REAL (the deliberation's flagged risk, now observed).** quota-B d5's repair left an
   admin-over residual in run1 but a tenancy residual in run2 — the crash-fix is robust, but the repaired code's
   *secondary* quality depends on which route repaired it. → NEXT: **best-of-N repair** (draw N route-backs,
   select the one that smokes clean AND passes the most structural/contract checks) to launder repair-route
   variance out — itself model-agnostic (selecting among the pool's own outputs, not a privileged model).
4. **A NEW form lever is exposed: tenancy / field-name conformance.** The residual the current stack can't clear
   is field-drift (`ctx.session.organizationId` where the contract declares `orgId`; "stored org must be caller
   org") — not shape, not admin-authz, not store-init, not membership. shape lifted approval-A crosscut 57→71 but
   couldn't finish → build a field-name/tenancy-stamp conformance lever next.

**Net:** the secret-sauce class is real and COMPOSES. The path to the worst-of-K bar is now concrete and
mechanical, not a wall: **repair (crash ✓) → best-of-N (route-luck) → form levers (shape/contract ✓ + a new
tenancy/field lever) → stack + climb.** MAP-Elites now has levers that demonstrably MOVE the worst-of-K-gating
tail — a fitness worth searching. Apparatus additive+dev (frozen tree untouched; re-validate K6/K7/K8/P0 when the
lever wires into the live evaluator+genome). Re-run: `node studies/meta-search/replay-repair.mjs --epic quota-d1
--dump runs/dump/census-q1-A/quota-d1-d4 [--stack]`; live `--repairgate` composes with the other gate flags.

---

## ~~🟢 Session-2 result (2026-06-18) — parity on ALL 4 topologies through d3~~ 🛑 VOID (grader bug — see correction banner)

> **VOID — every number in this section is the no-op-grader artifact (fake 100/100), NOT real.** See the
> CRITICAL CORRECTION banner at the top for the real baseline (all 12 cells FAIL). Kept for the audit trail only.

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

## ~~Key finding this session — the head-to-head d1 losses were ROUTE VARIANCE~~ 🛑 VOID (grader bug)

> **VOID — this "route variance" finding came from the no-op grader (fake 100/100).** The real re-grade
> REPRODUCED the head-to-head losses (quota integ 25, approval crosscut 71): they are REAL, not route
> variance. Kept for the audit trail. See the correction banner at the top.

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

> 🛑 **Status corrected (grader bug):** tasks 1–2 below ran under the no-op grader; their "pass" numbers are
> VOID. Real baseline (fixed grader) = **all 12 cells FAIL worst-of-K** and the gate is **not** load-bearing.
> So task 1 is REDONE (`coevo-REGRADE-full.json`), task 2's gate needs fixing-or-cutting, and **task 3 (genes)
> is the active next step** — see "First action on pickup" at the top.

1. **[REDONE — real baseline]** Measure route-robust rung-1 baseline — done for real (`coevo-REGRADE-full.json`):
   all 12 cells FAIL worst-of-K. (Earlier K=3 / K=10 numbers were the grader-bug artifact.)
2. **[gate built but NOT load-bearing]** Generalize the integration-gate — seam-gate.mjs built + smoke 22/22,
   BUT real grading shows it recovers ~nothing and is sometimes net-negative → fix it or cut it.
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
