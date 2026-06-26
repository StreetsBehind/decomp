# decomp — Current State & Direction

> **The single source of truth for "what are we trying to accomplish, where are we, and what's next."**
> If a doc in this repo disagrees with this page about the *goal*, this page wins. (The legacy docs are
> still correct about their *findings* — only their headline framing is superseded. See "How the history
> fits" below.)
>
> _**▶ SESSION-10 UPDATE (2026-06-25) — read this FIRST; executes the Session-9 ratified plan (Lever B + the $0
> conditioned diagnostic). The result is the program's first evidence-based (C)-boundary characterization.**
> (1) **Amendment logged** ([`AMENDMENTS.md`](studies/meta-search/AMENDMENTS.md) 2026-06-25): same-draws/conditioned
> diagnostics are admissible for **lever-evaluation only**; raw worst-of-K=8 stays the freeze/TEST statistic; the
> variance-robustness asymmetry (a lever-LIFT needs the *min* to move = variance-fragile; a (C)-verdict needs
> *every* above-floor route to FAIL = a universal quantifier = variance-robust) makes reliability adjudicable on
> the noisy free gateway; **Phase-2 is ruled out as a reliability fix (it is a Premise-1 violation)**. (2)
> **Lever B BUILT** = `src/semantic-obligation.mjs` — inject+verify for the SEMANTIC obligations the settled stack
> only injects (approval `approve→execute`/idempotency, quota conservation/keyed-idempotency); admissibility is the
> obligation-contract basis (reads the PUBLIC skeleton's DECLARED rule, never the oracle; `scanOracleLeak` on every
> repair prompt). Smoke **24/24**, **P0 5/5 GREEN bit-identical**, frozen tree untouched; wired into the live
> ladder as opt-in **`coevo-rung1.mjs --semantic`** (default OFF = byte-identical). (3) **$0 CONDITIONED DIAGNOSTIC**
> ([`LEVER-B-DIAGNOSTIC.md`](studies/meta-search/LEVER-B-DIAGNOSTIC.md); `diag-lever-b.mjs`, detection $0
> deterministic + repair $0 free gateway). **THREE load-bearing findings:** **(a) quota conservation is NOT a (C)
> wall — it is the container-drift (B) bug** (Lever B's detection is INERT on all quota draws: the code HAS the
> conservation guard; the Map/Array ledger drift corrupts the balance the guard reads → re-attributes
> LEVER-A-SCOPE's "conservation (C) candidate" to Lever A's unreachable read-modify-write class). **(b) The approval
> `approve→execute`/idempotency obligation is PARTIALLY repairable, depth-graded:** Lever B's model route-back
> CLEARS it on some routes at **approval-d2** (3/7 relaxed draws, 1 full-pass to 100% → **(B) traction is real**;
> cheap-model semantics ARE repairable, against any flat-(C) reading), but at **d3/d4 it survives the lever across
> the entire sampled zoo** (0/8, 0/9 cleared → the program's first **variance-robust (C)-leaning** signal). **(c)
> Two (C)-shaped sub-modes:** *repair-fires-but-oracle-semantics-survive* (the cheap pool writes a
> structurally-present but semantically-WRONG SoD/approval gate even when handed the declared obligation), and a
> *detection gap* (mechanism-present-but-wrong draws a deterministic presence-verify structurally cannot flag — the
> admissibility ceiling of a deterministic semantic verify). **This is a LEVER-EVALUATION signal, NOT a confirmed
> thesis-(C)** (Rule 2 forbids auto-(C); the verdict is rendered on the LIVE worst-of-K vs the settled baseline,
> inferior-vs-baseline deciding SCOPE-SHRINK vs CONTINUE). **▶ NEXT (ratified plan step 3 + fallbacks, USER call on
> the 12–16h commit):** (i) run the **live worst-of-K ladder with `--semantic`** to confirm the d2 (B) lift and
> adjudicate the d3/d4 (C)-leaning residual against the baseline ($0, ~12–16h, background); (ii) pre-registered
> **free-gateway MULTI-PASS** (never Phase-2) to enlarge the thin approval sole-residual subset (n=2–4) and to
> collect drift-free quota draws that isolate conservation; (iii) optional Lever-B detection refinement (a
> behavioural/property verify — check admissibility first). Apparatus UNCOMMITTED (user has not asked to commit)._
>
> _**▶ SESSION-10 ADDENDUM (2026-06-26) — both fallbacks executed; option 3 STRENGTHENS the (C)-leaning.** (2)
> Multi-pass collection (`collect-multipass.mjs`, $0 free gateway) is RUNNING — accumulating fresh raw draws of
> the named cells into `runs/dump-multipass/` to enlarge the thin subset; resumable, condition anytime with
> `diag-lever-b.mjs --dumps dump-multipass`. (3) Option-3 admissibility deliberation CONVERGED
> (`runs/deliberations/20260626T040021Z/`): a behavioural/property verify is **admissible-under-constraints** (the
> cut is PROVENANCE not method; 7-point conjunction incl. disk-deletion-invariance + property-never-the-final-score),
> and crucially **the structural-only (C)-leaning was NOT Rule-2-valid** (Rule 2(e) unmet: option 3 untried). So
> option 3 was BUILT (`gates/lib/behaviour-run.mjs` + `verifyBehavioural`/`makeBehaviouralRunner` + behaviour-aware
> repair in `semantic-obligation.mjs`, wired `diag-lever-b --behavioural` / smoke 8/8 / structural path
> byte-identical / **P0 5/5 GREEN** / all 7 constraints met incl. disk-deletion-invariance demonstrated). **The
> option-3 comparison RESULT: it CONFIRMS + STRENGTHENS the d3/d4 approval (C)-leaning** — under
> maximally-sensitive admissible enforcement the approve→execute/idempotency obligation fails UNANIMOUSLY across
> the zoo (d3 0/9, d4 0/11 cleared; `afterSem==baseSem` dominant: the cheap pool writes a behaviourally-rejected-
> yet-still-wrong gate even re-prompted with the declared obligation). **CORRECTION from the enlarged uncontended
> rerun (32 draws/cell, `runs/diag-lever-b-multipass.json`): the (C)-leaning is BROADER + more robust than the
> 16-draw read** — d3 **0/18**, d4 **0/14**, and **d2 clears only ~1/18 (~5%)** (the earlier d2 3/7 was
> small-sample optimism). The approval approve→execute/idempotency obligation is **largely unrepairable across the
> zoo at ALL depths**; d2's thin nonzero (B) tail keeps it **SCOPE-SHRINK, not a whole-class KILL**. (Quota
> conservation = (B) container-drift robustly confirmed: Lever B detection fires on 0/32 quota draws.) **Rule 2(e)
> for d3/d4 approval is now (near-)satisfied** (named lever
> menu exhausted). **▶ NEXT: the formal (C) adjudication = the live worst-of-K ladder with `--semantic` (+ option
> 3) vs the SETTLED baseline** (inferior-vs-baseline → SCOPE-SHRINK if the baseline holds + the hybrid walls on
> the deep approval cells; $0, ~12–16h, USER call on the commit), after the multi-pass firms the subset. **Turnkey
> command + pre-registered decision tree: [`LADDER-RUNBOOK.md`](studies/meta-search/LADDER-RUNBOOK.md)** (updated
> 2026-06-26 with `--semantic --behavioural`). Record: [`LEVER-B-DIAGNOSTIC.md`](studies/meta-search/LEVER-B-DIAGNOSTIC.md).
> Frozen tree intact; **apparatus COMMITTED this session** (Session-10)._
>
> _**▶ SESSION-9 UPDATE (2026-06-24) — read this FIRST; supersedes the Session-8 "NEXT = LEVER A FIRST" line.
> Lever A is BUILT, $0-validated, and the ladder RAN with it — and the result reframes the program.** STEP 1
> (live-rebuild replay, `replay-seam.mjs`, $0): the Mode-B model route-back gap is CONFIRMED — both the seam-gate's
> and shape-gate's model route-backs (already in the ladder) move the container drift **0pp**; the gate was
> resolving the WRONG store; the drift is structural cross-surface data-model divergence the program had already
> rejected fixing naively (`shape-gate.mjs:103-112`). STEP 2: built **Lever A = `src/container-recon.mjs`**
> (deterministic, surfaces-only: object↔Map reconciliation + a guarded structural-flatten with a revert
> post-condition; wired into `seam-gate.mjs` non-membership path → membership byte-identical; P0 5/5 GREEN,
> smokes 16/16 + 22/22, frozen tree untouched). The user RATIFIED building the guarded flatten. STEP 3: re-ran
> the EXACT floor ladder with Lever A (`coevo-ladder-A.{json,log}`, `dump-ladder-A/`; ~16h, **$0**, exit 0):
> **NON-INFERIOR 1/17** (prior was 2/17). **The load-bearing finding (record: [`LADDER-RESULTS-A.md`](studies/meta-search/LADDER-RESULTS-A.md)):
> Lever A's deterministic effect is BELOW the worst-of-K=8 NON-STATIONARY-POOL NOISE FLOOR** — its $0 same-draws
> causal effect FLIPS SIGN across draw sets (+3 cells/0-regress on the prior draws; +1/−1 net-wash, incl. a −6
> regression, on this run's draws). Lever A is correctly built, admissible, and load-bearing on the clean
> object↔Map / idiom-1 seam class it targets (lifecycle-d1 oblig i50→final i100 live), but the seam-bug class is
> the gating worst-of-K residual on only a MINORITY of draws → its signal is swamped. The 1/17 rollup is
> dominated by route variance (a membership cell PASS→crash on a fresh draw), NOT a Lever-A regression. This is
> the program's BAR-MISMATCH / Deliberation-#2 concern, now demonstrated on a concrete lever. **NOT a freeze; NOT
> a (C)-kill** (broken code is (B) by Premise #2; lever menu not exhausted). **▶ NEXT — codex×opus deliberation
> CONVERGED + USER-RATIFIED (the plan; execution deferred to a NEW SESSION), transcript
> `runs/deliberations/20260624T202607Z/`:** the open half of the thesis is **reliability parity** (cost dominance
> ~established: hybrid $0 vs settled baseline $27–64). Two thesis-level corrections drive the next move: **(1)
> Phase-2 owned hardware is NOT a measurement fix for reliability — it's a Premise-1 VIOLATION in disguise**
> (collapsing to one stationary local model = route-selection-as-fix; Phase-2 realizes the cost ECONOMICS, a
> separate experiment, never launders non-stationarity out of the RELIABILITY claim); **(2) the (C)-verdict is
> variance-ROBUST** — a lever-LIFT needs the *min* to move (variance-fragile → why Lever A was illegible), but a
> (C)-verdict needs *every above-floor route to FAIL* the invariant (a universal quantifier; non-stationarity
> changes WHICH route is worst, it cannot manufacture unanimous semantic correctness) → **the reliability
> question IS reachable on the current noisy free-gateway instrument via a unanimous-failure read.** **THE
> RATIFIED NEXT PLAN (new session, in order):** (1) **ratify + log in `AMENDMENTS.md`** (GROUND-RULES Rule-3 USER
> call — user-approved this session): same-draws/conditioned diagnostics are admissible **for lever-evaluation
> ONLY**; raw worst-of-K=8 stays the freeze/TEST statistic. (2) **Build Lever B** (approve→execute/idempotency +
> quota conservation as **inject+verify**) and run a **$0 CONDITIONED diagnostic** on the existing
> `dump-ladder`/`dump-ladder-A` draws — conditioned to draws above-floor ∧ smoke-clean ∧ whose SOLE post-stack
> residual is the named semantic class (**approval-d2/d3/d4, quota-d3/d4**); **report DETECTION (deterministic,
> clean) and REPAIR-across-zoo (model-routed) SEPARATELY**. Endpoints: repair succeeds on some route → (B), keep
> the lever; repair fails on ALL above-floor smoke-clean routes on the conditioned subset → the variance-robust
> (C) signal, Rule 2(d) populated honestly. (3) Only then graduate to a live worst-of-K ladder. (4) **Fallback if
> the conditioned subset is empty / n≤1:** pre-registered free-gateway **multi-pass** collection targeting those
> residuals — **NEVER Phase-2.** Frozen invariants untouched; apparatus UNCOMMITTED (user has not asked to commit)._
>
> _**▶ SESSION-8 UPDATE (2026-06-23) — read this FIRST; the Session-7 "NEXT = run the ladder" gate is now RUN.**
> The floor-respecting 17-cell decision-gate ladder ([`LADDER-RUNBOOK.md`](studies/meta-search/LADDER-RUNBOOK.md))
> ran to completion (~12h45m, **$0**, exit 0; artifact `runs/coevo-ladder-stack.json` + `runs/dump-ladder/`
> [both gitignored — the durable record is the writeup], full writeup
> [`LADDER-RESULTS.md`](studies/meta-search/LADDER-RESULTS.md)). **VERDICT: NON-INFERIOR 2/17 (δ=0.05) vs the
> SETTLED routed baseline → NOT a freeze; NOT a (C)-kill.** Read against GROUND-RULES: **(Rule 1 floor)** mean
> below-floor rate **0.096, pool-degenerate 0** → the worst-of-K gating draw is above-floor *real code* in every
> failing cell → **extraction (the pre-registered named lever #1) is DEPRIORITIZED by the data** (recovering
> format garbage cannot lift a worst-of-K already gated by broken-but-present code). **(Rule 2 (C)-trigger)** NO
> cell is (C)-confirmed (condition (e) unmet — lever menu not exhausted): residual partition = **11/15 failing
> cells (B)** (seam / tenancy / over-&-under-authz / coding-bug) + **4/15 semantics (C)-candidates** (approval-d1/
> d3/d4 `approve→execute`/idempotency, quota-d4 conservation). **Structural read (reproduces HEAD-TO-HEAD):** the
> stack is demonstrably load-bearing (repair lifted approval-d1 **c14→71**; obligation lifted membership-d2
> **c83→92/i50→100**) but the **dominant gating axis = integration/the SEAM on the 3 non-membership topologies** —
> membership integration recovers to 80–100 (its gate fires), approval/lifecycle/quota stall at **i42–63 (Δi −.50)**.
> Membership is at the bar (2 PASS, 3 small crosscut misses); the work is the other three. **▶ NEXT — RATIFIED
> 2026-06-23 (lever chosen + logged): LEVER A FIRST.** A codex×opus deliberation CONVERGED
> (`runs/deliberations/20260623T201830Z/`) and the user ratified; the Rule-3 lever-menu re-pointing **is now
> logged in [`AMENDMENTS.md`](studies/meta-search/AMENDMENTS.md)** (extraction → Lever A, then Lever B). **Lever
> A = a structural, surfaces-only generalized seam/integration-recovery gate** over approval+lifecycle+quota (the
> 8-cell Δi −.50 axis; pure (B)). **Lever B (after A) = the approval `approve→execute`/idempotency obligation as
> an inject+verify contract** (the (C)-boundary crux). **A is FORCED first, not merely preferred (Rule 2(e)):** a
> (C) verdict needs the lever menu *exhausted*, and A is a named untried admissible (B) lever → **B-first cannot
> produce a Rule-2-valid (C)**; A also has higher EV (pure (B), 8 cells) and sharpens the approval diagnosis (if A
> lifts lifecycle/quota but approval stays collapsed+smoke-clean, approval is *isolated* on
> approve→execute/idempotency). **COMMITTED admissibility guard (pre-registered before the run):** A is admissible
> iff its inputs are confined to the generated surfaces themselves (call-graph/seam reachability, exported
> signatures, smoke-execution traces) with **no literal of intended behavior** (no "approval precedes execution",
> no per-topology correct-wiring table, no conservation identity) — else A is oracle-shaped/inadmissible (Premise
> #2) and **B goes first by elimination**. **Decision tree (post-A worst-of-K integration on the Δi −.50 axis):**
> lifecycle+quota rise within δ=0.05 of baseline → (B) seam confirmed → CONTINUE; lifecycle+quota lift but
> approval stays i42–50+smoke-clean → approval isolated → clean B/(C) test (baseline holds 100 → ≥SCOPE-SHRINK if
> it walls); nothing lifts → A mis-built/inadmissible, NOT (C). **Stationarity re-run = NOT a prerequisite** — the
> −.50 collapse is consistent across all 4 depths (systematic, not a worst-of-K tail), and the A-run is itself a
> fresh worst-of-K=8 draw over the route zoo on that exact axis → it doubles as the stationarity check at $0
> marginal. **Conceptual note (user asked where AUTONOMOUS evolution kicks in):**
> the current phase is **hand-building the genes (levers) + characterizing the fitness** — the MAP-Elites search
> is BUILT but deliberately NOT loose on the live fitness (gated on the Phase-−1 variance characterization + a
> pre-committed GO/HALT rule; raw-min worst-of-K over the non-stationary pool is too noisy to optimize directly →
> would rank route-luck as gene quality, per Deliberation #2). Evolution *composes/tunes human-supplied genes*; it
> does not yet invent them (Lever A is hand-built; the search later finds its best deployment across the cell
> grid). Frozen invariants (weights/veto/δ-α/TEST-hash) untouched; `main` == origin/main (Session-7 GROUND-RULES
> commits pushed); `LADDER-RESULTS.md` + this banner committed this session._
>
> _**▶ SESSION-7 UPDATE (2026-06-22/23) — read this FIRST; it supersedes the Session-6 "NEXT = run the ladder"
> line by adding a GATE in front of it.** An external review (`studies/meta-search/EXTERNAL-REVIEW-2026-06-22.md`,
> merged via PR #2) was evaluated; its Recs 1–3 converged on "pin the win-condition ground rules before the next
> climb." **Those ground rules are now PINNED + committed** (`f312106`) in
> [`studies/meta-search/GROUND-RULES.md`](studies/meta-search/GROUND-RULES.md) + an `AMENDMENTS.md` entry — **void-rule:
> touches NONE of the four frozen invariants** (weights / per-cell veto / δ-α / TEST-hash): **(1) route-pool
> floor** = the deferred USER call, decided **extraction + best-of-3** — a draw is admissible iff `parse ∧
> exports-surfaces` after extraction + best-of-3 re-sampling; below-floor (format-hazard) draws are EXCLUDED from
> worst-of-K with the per-cell rate reported; runtime crashes stay ABOVE the floor (repair targets, Premise #2).
> **(2) falsifiable (C)-trigger** = ex-ante 5 conditions (above-floor ∧ smoke-clean ∧ semantic ∧
> survives-full-stack-across-zoo ∧ lever-menu-exhausted); thesis KILL only on a whole-obligation-class wall where
> the routed baseline holds (hybrid inferior by >δ), SCOPE-SHRINK on isolated walls. **(3) metric alignment** =
> archive/freeze/TEST all = raw-min worst-of-K=8 (the search proxy steers mutation only, never freezes) + a logged
> **lever time-box** (the ladder run + ≤2 named levers; widening logged). **The runner now ENFORCES the floor:**
> `coevo-rung1.mjs` gained an opt-in **`--floor`** flag (`722c438`; default OFF = byte-identical to before) that
> drops below-floor draws from worst-of-K, reports the rate, and tags `POOL-DEGENERATE`; `LADDER-RUNBOOK.md`'s
> command now carries `--floor --retry 3`. Validated (mock both ways; pre-flight GREEN — phase-neg1 manifest 14/14,
> obligation 39/39, best-of-n 12/12, **run gates from inside `studies/meta-search/`**); frozen tree
> `studies/build-gap` untouched (`1580944…`). **NOTE: `main` is 2 ahead of origin = UNPUSHED.**
> **▶ NEXT SESSION = run the ladder as the now-floor-respecting DECISION GATE** per
> [`LADDER-RUNBOOK.md`](studies/meta-search/LADDER-RUNBOOK.md) (turnkey): `coevo-rung1.mjs --ladder --repairgate
> --shapegate --contractgate --obligation --bestofn 3 --seamgate --floor --retry 3 --k 8 --out
> coevo-ladder-stack.json --dump studies/meta-search/runs/dump-ladder`. **$0** (free-gateway hybrid; baseline
> spent), **multi-hour (6–15h)** → run in BACKGROUND / stage by depth row. Then read the rollup against
> GROUND-RULES: PASS/FAIL = non-inferiority (δ=0.05) over admissible draws, `POOL-DEGENERATE` → route-pool-floor
> finding, classify each failing cell's residual per Rule 2 (**extraction = named lever #1** if below-floor format
> hazards dominate; this first pass is floor-WITHOUT-extraction = conservative). Freeze only when broadly
> non-inferior._
>
> _**▶ SESSION-6 UPDATE (2026-06-20) — read this FIRST; it supersedes the Session-5 "NEXT = build the output-QA
> stack" line below.** The model-agnostic output-QA stack the Session-5 head-to-head called for is **BUILT +
> live-validated + COMMITTED** (`091ac92`→`afcac9d` on `main`, **9 ahead of origin = UNPUSHED**; frozen tree
> untouched, P0 GREEN 5/5, K8 bit-identical). Two new levers: **(1) the obligation-contract lever**
> (`src/obligation-contract.mjs` — the crosscut/obligation gene; derives a typed `{obligations, restrictions,
> runConditions}` contract per surface from the PUBLIC skeleton, verify+repair, oracle-blind; smoke 39/39) and
> **(2) best-of-N repair with a no-regress floor** (`src/best-of-n-repair.mjs` — a repair ships only if it
> strictly out-scores the original on an oracle-blind score → kills the repair-regression hazard; smoke 12/12).
> **Causality CONFIRMED live** ($0 free gateway, `coevo-rung1.mjs --obligation`): a near-dead approval worst
> route lifted **c14→71 / i0→75**; quota's restriction half (hallucinated-admin removal) lifted i25→100; the
> no-regress guard fires with **ZERO integration regressions across 8 draws**. The remaining worst-of-K
> residuals are cleanly NOT the obligation lever's (shape-drift → shape-gate; approve→execute/conservation
> SEMANTICS → the genuine (C)-candidates; missing-draw → extraction). **▶ NEXT = run the full 17-cell ladder per
> [`studies/meta-search/LADDER-RUNBOOK.md`](studies/meta-search/LADDER-RUNBOOK.md) (turnkey, mock-verified):** the
> hybrid full-stack worst-of-K=8 vs the SETTLED **eroding** baseline (`baseline-settled-vector.json`, 10/17 cells
> <100% — the bar is the measured vector, NOT 100%), per-cell **non-inferiority** (δ=0.05) + a LADDER ROLLUP
> (`NON-INFERIOR: X/17`). $0 (free-gateway hybrid; baseline already spent), multi-hour → run in background / stage
> by depth. Then classify failing cells (form→next lever; semantics→(C) only after best-of-N/extraction; missing
> →extraction) and freeze only when broadly non-inferior. Record: `OBLIGATION-CONTRACT.md`._
>
> _**▶ SESSION-5 UPDATE (2026-06-20) — read this first; it supersedes the Session-4 banner below on the P3-prereq
> status.** The first of the two deferred live-spend P3 prereqs — **the SETTLED routed all-frontier baseline — is
> DONE** (user cleared spend; `routed-baseline.mjs --settled --k 8`, $64.61 live frontier spend, 136 draws / 0
> harness errors; artifact `runs/routed-baseline-settled.json`; writeup `ROUTED-BASELINE.md`). **THE HEADLINE
> REVERSES the 2026-06-18 interim:** under the program's own **worst-of-K=8** statistic the cost-optimized routed
> ALL-FRONTIER baseline **also erodes** — 10/17 DEV cells below 100%, a **14% per-draw lethal-fail rate**, failing
> even at d1. The earlier "builds at 100% through D=3" was a **K=1 single-draw artifact** (the non-stationarity
> footgun worst-of-K exists to catch — 3rd independent sighting after VOID-92/92 + the coevo "d1 = route variance",
> now on the FRONTIER side). HONEST READ: the erosion is **bounded variance** (median 100% in 16/17 cells; 6/10
> eroding cells miss on 2–4 draws, only quota-d4's median actually moves to 91% — the conservation/wallet seam),
> so it **RESETS the comparator, it does NOT decide the win** — both arms erode under worst-of-K, so the contest
> (which erodes less per cell at what cost) is the *co-measured head-to-head*. It does establish **reliability
> parity is a reachable bar** (baseline ≠ 100% wall) and gives the P3 per-cell veto a **measured** baseline vector.
> Cost direction unchanged (skeleton anchor shared; hybrid saves the $0.42–2.29/epic coding, gap widens with depth).
> Verified: every load-bearing number recomputed by an adversarial reviewer (EXACT), graders confirmed
> deterministic, frozen tree untouched (`routed-baseline.mjs` pre-existed; only the gitignored data artifact +
> these docs changed).
> **▶ PREREQ #2 ALSO DONE (2026-06-20, same session, user said "Run it") — the co-measured HEAD-TO-HEAD, and it
> FALSIFIES the proposed winner.** `head-to-head.mjs --settled --k 8` co-measured BOTH arms live (baseline routed
> frontier $27.40; hybrid cheap+gate $0) worst-of-K=8 on identical epics by the same oracles. **The hybrid LOSES
> every cell — 0/17 lethal-non-inferior — at ¼ the cost.** Its reliability collapses across the route zoo
> (worst-of-8 over *distinct* cheap models): integration worst-of-K 0–67% vs baseline 75–100%, and the
> **crosscut/obligation gap is the killer** (16/17 cells, median −36pp, max −86pp) — which the membership-only
> integration-gate has NO lever for (no-op on 12/17 topologies). REVERSES the 2026-06-18 K=1 "topology-gated WIN
> on 2 of 4" (route-luck — the same single-draw footgun). **NOT a (C) thesis-kill** (cheap broken code = the
> target, [[incompetence-is-the-target]]): this hybrid arm ran ONLY the integration-gate+retry, NOT the fuller
> output-QA stack the coevo work built (self-repair `repair-gate.mjs` / `contract-gate` / `shape-gate` /
> best-of-N / extraction) → the **PROPOSED P2c WINNER is falsified, not the thesis**. HONEST LIMITS (adversarial
> review, all folded into `HEAD-TO-HEAD.md`): on 8/17 cells transport-vs-code can't be separated (≥9 are
> certified bad-code; §7 verdict doesn't hinge on transport); the worst-of-8 *magnitude* is K/zoo-dependent
> (direction robust); and whether an 86pp worst-of-route crosscut gap is (B)-repairable or a (C) wall is **OPEN**
> — the obligation-repair lever was not run. **▶ pre-P3 gate is now READY (3/3 MET) — but READY ≠ freeze:** the
> head-to-head IS the reliability test and the proposed winner LOSES, so freezing it for sequestered-TEST would
> only confirm a loss. **NEXT (a user direction call, mostly no-spend to build):** build the model-agnostic
> output-QA stack (obligation/crosscut repair + self-repair + best-of-N), re-measure the hybrid worst-of-K toward
> the baseline, and only THEN freeze a candidate worth falsifying on TEST. Records: `ROUTED-BASELINE.md`,
> `HEAD-TO-HEAD.md`; artifacts `runs/{routed-baseline,head-to-head}-settled.json` (gitignored)._
>
> _**▶ SESSION-4 UPDATE (2026-06-19) — read this first; it supersedes the "SINGLE NEXT ACTION" at the bottom of
> the Session-3 stack below.** Two threads advanced and are COMMITTED on `main` (HEAD `4d156bf`, working tree
> clean, == origin/main; there is no separate feature branch). **(1) Phase −1 instruments BUILT + block A RAN**
> (commit `86c06c3`): the replay-anchored labeler `src/label-draw.mjs` (self-test 9/9), the check-of-checks
> manifest `gates/phase-neg1-manifest.mjs` (14/14), and the two-axis harness `phase-neg1.mjs`; block A ran (3
> reps × 3 cells × K8). Record: `studies/meta-search/PHASE-NEG1-RESULTS.md`. **(2) The EVO-GLEANINGS program** —
> the external evo-hq/evo instrument folded into the frozen meta-search apparatus across three clean commits:
> **Batch 1** (`9087896`) = the six additive/audit-only gleanings (#5 aggregate-consistency lint, #2a
> GAMING-RISKS register, #2b-PRE pre-verifier, #1 axis-check + the pre-P3 proxy→real BLOCKER gate + DESIGN §6b,
> #3 strategy-registry, #4 eval-epoch stamping); **Batch 2 #3** (`2b8e2c3`) = the active strategy ablation
> (`mu_best` vs `pareto_per_cell` → ROBUST-by-insensitivity); **Batch 2 #2b-POST** (`75c2789`) = the
> score-reproducibility KILL (2×SE band). Records: `EVO-GLEANINGS-BATCH1-RESULTS.md`,
> `BATCH2-3-STRATEGY-ABLATION-RESULTS.md`, `BATCH2-2-SCORE-REPRO-RESULTS.md`, `GAMING-RISKS.md`,
> `EVAL-EPOCH-PROTOCOL.md`. **P0 GREEN 5/5 bit-identical and the frozen tree untouched throughout** — the only
> `DESIGN.md` change is the additive, report-only §6b (logged in `AMENDMENTS.md`). **Corrected status:** the 2nd
> hand-authored oracle ALREADY EXISTS + is GREEN (`src/oracle2.mjs`) and `gates/pre-p3-axis-gate.mjs` marks
> prereq (iii) ✅ MET → **knowledge-conditioning is now UNBLOCKED**. **BOTH deferred LIVE-SPEND P3 prereqs are
> now DONE (2026-06-20 — see the Session-5 banner at the very top): (i) the SETTLED routed all-frontier baseline
> AND (ii) the LIVE co-measured head-to-head; pre-P3 gate is READY (3/3 MET). But the head-to-head FALSIFIED the
> proposed winner (hybrid LOSES 0/17 at ¼ cost), so READY ≠ freeze — NEXT is the output-QA stack, not P3.** The
> Phase −1 / no-spend menu below remains valid as parallel work. **▶ (earlier) NEXT ACTION (no-spend):**
> Phase −1 **block B** in a later session (the temporal separation IS the measurement) → compute the
> instability band → apply the pre-committed GO/HALT rule (`PHASE-NEG1-RESULTS.md` §4). No-spend menu also open:
> Batch-2 **#4 bump-op** (needs a candidate-independent defect fixture + a new FREEZE record) → **#6
> literature-ideator**; knowledge-conditioning. Do NOT wire MAP-Elites / soften the statistic / press "go" until
> a clean GO._
>
> _Last updated: 2026-06-18, **Session-3** (the "RUNG-1 / 92/92" was VOID — a grader bug, FIXED; real re-grade
> = ALL 12 cells FAIL worst-of-K=8). **Session-3 progress:** (1) the `rate()` footgun is HARDENED in both
> `coevo-rung1.mjs` + `head-to-head.mjs` (absent/empty/harnessError grades → FAIL, not the fake 1.0 that caused
> the bug). (2) The FIRST co-evolution lever is built + LIVE-validated: the **shape-conformance gate**
> (`src/shape-gate.mjs`, smoke 32/32) enforces each surface against the skeleton's DECLARED store shape
> (array/Map), robust to destructuring — **CONFIRMED load-bearing where shape-drift dominates** (lifecycle-d2
> worst-of-K crosscut 40%→70%). (3) After a **codex×opus deliberation** (`runs/deliberations/20260619T051701Z`),
> built the **CONTRACT-PRECISION gate** (`src/contract-gate.mjs`, smoke 20/20) — oracle-blind admin-applicability
> lint that strips an over-applied `role!=='admin'` gate; **CONFIRMED load-bearing** (paired lift i25→i100 on the
> over-applied-authz draws). **Key reads:** worst-of-K=8 still FAILS with a DRIFT-UNSTABLE gating mode →
> optimize per-mode within-run lift, worst-of-K = reporting bar only. **(3) THIRD lever (store-persistence,
> `src/persistence-gate.mjs`, smoke 33/33, wired `--persistgate`) BUILT + VALIDATED but CONCLUDED NOT
> load-bearing on quota — the prior "store-persistence is the dominant quota killer" diagnosis was a
> code-inspection MISATTRIBUTION.** A deterministic dump-replay (`replay-persist.mjs`, $0) shows the gate fires
> correctly on the flagged `?? []` draws with ZERO regressions but RECOVERS 0/11 integration failures, because
> the quota oracle **pre-seeds the seam store** (`epics-src/quota.mjs:freshDb` → `db.ledger=[]`), so the `?? []`
> fallback never fires and the local alias persists even unrepaired (pattern present but causally INERT). The
> ACTUAL quota residual, classified by CODE, is a MIX of FORM modes — shape (d3), admin-over (d5/d8),
> **falsy-return-shape (NEW: `withdraw` returns a bare number → `0` at zero balance fails the oracle's
> `assert.ok`, d4/d7)**, wallet-seam (d1) — NOT persistence and NOT a clean (C) semantics wall. **Methodological
> lesson: validate CAUSALITY (dump-replay: does the repair change the GRADE?) BEFORE building a lever — code
> inspection over-counts FORM the same way the test-name classifier over-counts semantics.** **(4) CONFIRMED
> levers made DETERMINISTIC (the chosen strategy): CONTRACT now does $0 route-luck-free surgical removal of the
> over-applied `if(role!=='admin')throw` (smoke 26/26; model route-back kept only as fallback for message-form/
> compound) → the dump-replay now recovers cgA d5+d8 (admin-over i25→i100) DETERMINISTICALLY, 2/6, ZERO
> regressions (was 0/6 when it needed a model rebuild). SHAPE kept model-routed by design (the d3 map↔array drift
> is irreducibly semantic — per-key regroup + key-field — so a deterministic rewrite would risk a net-negative;
> documented in `src/shape-gate.mjs`).** Quota worst-of-K still gated by a per-draw-varying mode (return-shape
> d4/d7 / shape d3 / wallet-seam d1); no single lever clears it; the stack recovers the admin-over slice
> route-luck-free. **(5) DELIBERATION + $0 TRIAGE (codex×opus, `runs/deliberations/20260619T144826Z/`): the
> falsy-return lever (A) is INADMISSIBLE** — the public withdraw/deposit specs say only "return a result" (no
> declared return shape), so "return truthy" is oracle-shaped (a PROVENANCE leak: oracle-blindness is about the
> decision rule's provenance, not just not-reading-tests.mjs). Floor-classify (parseable∧exports): 15/16
> above-floor, but the strict floor can't exclude runtime-incompetence (cgB d4 `Assignment to constant variable`).
> Quota's residual is mixed-form but **NOT cleanly oracle-blind-fixable** this rung. **THE GENUINE FORK = a
> PRE-REGISTRATION decision the USER must make: define the route-pool FLOOR** (rung-1 has no stopping rule without
> it; minimal content-independent predicate, pre-committed before any climb), then move to freeze prereqs / another
> topology. Adopt per-mode within-run lift as the HEADLINE, worst-of-K=8 = reporting bar; do NOT build A or B, do
> NOT wire MAP-Elites (live fitness uncharacterized). Apparatus additive+dev, frozen tree untouched, no new genome
> yet (FREEZE intact). Pick up at `studies/meta-search/COEVO-RUNG1-PROGRESS.md` (Session-3 → "Deliberation … FLOOR"
> section) + `runs/deliberations/20260619T144826Z/DECISION-BRIEF.md`._
>
> _**Deliberation #2 (the autonomy question, codex×opus → CONVERGED, `runs/deliberations/20260619T145118Z/`).**
> Asked: are we close to AUTONOMOUSLY running the orchestrator (MAP-Elites + §14) and having it IDENTIFY the
> genes best-fit for the north-star win? Verdict: (a) autonomy PLUMBING is **CLOSE** but synthetic-path-only; (b)
> the search FINDING best-fit genes on the **live** fitness is **NOT close** (zero test-retest characterization;
> worst-of-K=8 is an extreme order statistic over a non-stationary pool → it would rank route-luck as gene
> quality); (c) a winning gene set is **likely UNREACHABLE** for quota+approval (the worst-of-K tail mixes drift,
> an inadmissible return-shape mode, and irreducible route-incompetence whose only fix is re-draw = inadmissible).
> New program-level insight = a **BAR MISMATCH**: we optimize per-mode within-run lift but freeze/falsify on
> worst-of-K — the targets have diverged, which makes the route-pool-FLOOR / freeze-win-condition pre-registration
> call urgent. **CENSUS DONE (2026-06-19, fresh paired live K=8 both cells, four-way `census-classify.mjs`):
> the worst-of-K=8 gating draw is `route-incompetence` in 4/4 arms** (broken code / MISSING surface → only fix =
> re-draw = inadmissible), the deterministic stack lifts the median (quota-B 5/8 draws i25→i100) but moves the
> worst-of-K cell verdict **0 pp** in 4/4 (BAR MISMATCH confirmed), and the incompetence class is **stable across
> A/B** (drift-robust)._
>
> _**⚡ DIRECTION CORRECTION + REPAIR LEVER (2026-06-19, the headline).** The user rejected the "unreachable / (C)
> boundary" read outright: **model-agnosticism is the definition of the problem, not a constraint that ends it**;
> cheap models emitting broken code is the PREMISE; the job is to find the secret sauce that turns a shit model
> into a golden goose — WITHOUT excluding or pre-selecting models (memory [[incompetence-is-the-target]]). The
> census wasn't wrong, my interpretation was: all four existing levers (shape/contract/persist/seam) assume the
> code already RUNS — NONE attacks broken code, which is the dominant worst-of-K-gating mode. So I built the
> missing lever class. **The SELF-REPAIR gate (`src/repair-gate.mjs` + `gates/lib/smoke-run.mjs`, smoke 18/18):**
> a permissive-harness smoke executes each surface to surface runtime free-id ReferenceErrors (`bio` /
> `generateUniqueId is not defined` — invisible to import-only validation), then route-backs the SAME cheap pool
> with the exact error to fix-or-remove the symbol. Oracle-blind, model-agnostic (iterates the pool's own output).
> **CAUSALLY VALIDATED via dump-replay on the 3 census worst-draws that gated the worst-of-K** (`replay-repair.mjs`,
> live route-back, $0): quota-A d4 c20/i0 → **c100/i100 (full recovery)**; quota-B d5 c20/i0 → c100/i25 (residual =
> admin-over, contract-gate's target); approval-A d4 c0/i0 → c57/i25 (residual = tenancy field-drift, a form mode).
> **The "unreachable" verdict is OVERTURNED** — the cheap pool, handed its own stack trace, rewrites its own broken
> code; and fixing the crash EXPOSES the form modes the other levers already handle (repair = the unblocker at the
> bottom of the stack). NEXT: stack repair+form-levers, check repair-route robustness, expand the lever class
> (best-of-N, extraction), then the search has a fitness the levers actually move. See `COEVO-RUNG1-PROGRESS.md`
> "REPAIR LEVER" section._
>
> _**▶ RUN-FOR-DAYS PLAN — CONVERGED (2026-06-19, 4 live codex×opus deliberations, `studies/meta-search/RUN-FOR-DAYS-PLAN.md`).**
> To run the genome-mutation search hands-off for days *trustworthily*, the plan does NOT press "go" — it gates on a
> **Phase −1 TWO-AXIS variance characterization** of the post-output-QA-stack worst-of-K metric on the EXISTING
> `coevo-rung1.mjs` full-gate stack (build-draw temporal blocks + a repair-route micro-arm r≈3), behind a
> **pre-committed GO/HALT rule**: GO iff a real lever effect > max(2×SD, block-drift, repair-spread) AND residual worst
> draws are **repairable form** (labeled by **dump-replay OUTCOME**, regex demoted to telemetry; a **null replay is
> `unresolved → human adjudication`, NEVER auto-(C)** — an unbuilt lever is a target, not a wall). Statistic = **raw-min
> K=8** by default (softening = a USER win-condition call); ONE metric across search/freeze/sequestered-TEST. Gated by
> an **instrument self-test manifest** (every B5 guard must be shown to FIRE — the generalized `rate()` defense).
> **THE SINGLE NEXT ACTION [Session-3 — SUPERSEDED by the Session-4 update at the top of this file: the manifest
> IS built and block A ran (commit `86c06c3`); the open Phase −1 step is now block B]: build the check-of-checks
> manifest, then run the two-axis Phase −1 characterization** — NOT MAP-Elites, NOT more lever design, NOT metric
> softening, until a clean GO._

---

## What we are trying to accomplish (the north star)

This is **research, not design.** The architecture is **fixed by hypothesis**; the research is whether
that fixed architecture *works and pays*:

> **Can we build a system in which a cloud frontier model handles the planning and orchestration, and
> cheaper lightweight coding models handle all the actual coding — such that the system delivers reliable
> software-building performance at lower total cost than using cloud frontier models throughout
> (opus / sonnet / haiku)?**

**The system is the product** — a harness / router / "whatever fits" (the term is open). Every decision
in the program should serve **building that system and proving it beats all-frontier on cost.**

> ### ⚖️ BINDING PREMISE — the ground truth that governs every decision (do not relax)
> These three are non-negotiable. Any plan, lever, metric, or stop-rule that violates one is invalid.
> 1. **No control over which model builds.** The cheap coding pool (the fusion gateway) is an
>    adversarial, **non-stationary** mixture of dumb/bad models. **Route/model selection is NOT an
>    admissible fix** — the system must work with *any* above-floor model the pool serves; a lucky-route
>    100% is not a model-agnostic 100%. (memory: [[model-agnostic-and-failure-attribution]])
> 2. **Dumb models emitting broken code is the PREMISE and the TARGET — never a wall.** Cheap-model
>    garbage (runtime crashes, missing surfaces, shape drift, over-applied guards) is *exactly* what the
>    system must turn into reliable software. It is a **(B) output-QA** problem to be **repaired**, **not a
>    (C) thesis boundary** to stop at. The 2026-06-19 "incompetence is unreachable" verdict was
>    **OVERTURNED** by the self-repair lever (it rewrites the pool's own broken code). Reserve **(C)** for a
>    gap that survives the *full* output-QA stack (repair → best-of-N → form levers) across routes — broken
>    code by itself is never (C). (memory: [[incompetence-is-the-target]])
> 3. **The method is MUTATION of the harness/methodology.** We extract quality code from bad models with a
>    frontier orchestrator/planner (the frozen skeleton) + an evolving **output-QA stack**, discovered by
>    **mutating genomes** and searching. The search is the instrument; the frozen config is the product.
>    This is **NOT** a search for an "optimal mix."

The full statement, the evidence table, and the substrate plan are in
[`docs/PROPOSAL-HYBRID.md`](docs/PROPOSAL-HYBRID.md) (the north-star doc). This page is its operational
summary plus current status.

> ⚠️ **Wording the user has rejected — do not use it.** This is **not** a search for the "optimal mix" /
> "optimal division of labor" / "where the boundary is." The architecture is fixed; the question is a
> falsifiable **comparison** (does the fixed hybrid beat all-frontier on cost at equal reliability?).

## The win condition (both must hold, both are measurable)

The system wins **iff both** are true:

1. **Reliability parity** — frontier-orchestration + lightweight-coding is **at least as reliable** as a
   cost-optimized all-frontier setup, measured exactly as the repo already measures: epic **cohesion**,
   end-to-end **integration**, and enforcement of the **lethal-quadrant cross-cutting obligations**
   (authz, tenancy, validation, idempotency, audit). A cheaper system that ships broken software is *not*
   a win.
2. **Cost dominance** — total cost is **lower** than a **cost-optimized** all-frontier baseline:
   - **hybrid total** = (orchestration tokens × frontier $/token) + (coding inference amortized to
     **fixed** hardware + maintenance)
   - **all-frontier total** = (all tokens, routed optimally across opus/sonnet/haiku, × their prices)

   The baseline must be cost-optimized (cloud may route haiku/sonnet for easy work, reserve opus for hard
   parts) — beating naive all-opus would be a strawman.

**Kill conditions:** lightweight coding can't be made reliable enough even with frontier orchestration →
thesis dead (useful negative). No cost win after honest accounting → thesis dead. The existence proof
doesn't generalize to a real task distribution → scope shrinks to where it does.

## Where we are — an existence proof on one epic

The repo has already produced an **existence proof on one epic** (the `workspace` epic and the
`scale-d{1..4}` ladder). The frontier premium turned out **not** to be writing functions — it is the
**planning/orchestration artifact** (the *frozen skeleton*: shared shapes + a typed cross-cutting
obligation contract). The load-bearing findings (none edited by the reframe — see
[`studies/build-gap/RESULTS.md`](studies/build-gap/RESULTS.md) and
[`docs/REPORT-2026-06-16.md`](docs/REPORT-2026-06-16.md)):

| Finding | Established | Why it matters to the win condition |
|---|---|---|
| **M0** — obligation-blindness is **tier-independent** | cheap & frontier both pass happy-path ~100%, both floor authz/validation | the *coding* sub-task is tier-independent → safe to run on lightweight models (cost) |
| **M-coh-1.5** — skeleton + retry = bare opus, at $0 | frontier-orchestration (skeleton) + cheap-coding+retry matched bare opus on cohesion | **reliability parity + cost dominance on one epic, already shown** |
| **M-coh-3** — size × harness crossover | monolithic frontier *erodes* past N≈9 (silently drops `authz@add*Member`); the harness stays flat | above ~9 surfaces the hybrid **beats** all-frontier on both reliability and cost, and the gap widens |
| **M-coh-2** — skeleton double dissociation | the skeleton must carry **both** shapes (→integration) **and** typed obligations (→uniformity) | defines what the frontier planning layer must emit to clear the reliability gate |

So v1's "cheap matches frontier" is **demoted to a sub-claim** ("lightweight coding matches frontier on
the code-fill, *given the orchestration artifact*"). The new headline is the **whole-system
cost-vs-reliability comparison.**

## What's next (re-pointed at the win condition)

0. **✅ DONE — M-coh-2.5, skeleton provenance (the crux).** Ran 2026-06-16 (`studies/build-gap/MCOH25-RESULTS.md`).
   **(a) Frontier orchestration IS necessary, and it's opus-class.** Cheap *and* sonnet authors produce the
   obligation clause (X-CUT 100%) but fail the `addMember→postComment` shared-shape **seam** (INTEG 0–13%);
   only opus-authored restores it (INTEG/EPIC 80%, matching the hand anchor). The all-local branch is dead
   on this epic; the frontier premium is precisely the shared-shape clause (M-coh-2 dissociation reappearing
   along the provenance axis). **(b) Orchestration cost measured:** opus ~$0.40/epic, sonnet $0.092, gateway $0.
   **Headline tension:** at N=5 the only reliable author (opus, $0.395) costs **more than the entire reliable
   all-frontier bar** (opus-whole, ~$0.27) → the workspace existence proof is **reliability parity, NOT cost
   dominance**. Cost-dominance is scale-gated and **not demonstrated at any N yet** (the skeleton-harness's
   strict EPIC✓ also erodes to 0% at N=17, though it holds X-CUT at 95% vs bare-opus 80%).
1. **The new crux — the per-surface obligation/seam checker + repair lever (M-coh-2's other half).** This is
   now blocking: it must stop the harness's EPIC✓ erosion at scale, which is exactly where the cost gap vs
   bare opus opens (N≥13). It is also the *verification-design* that lives in the orchestration layer.
   **Kickoff seed:** spec in `studies/build-gap/DESIGN.md §4b` (per-surface checker + integration-gate+repair);
   apparatus seam = `epic-run.mjs`'s retry gate (`isValidSurface` → extend to an *obligation* checker) +
   `lib/validate-surface.mjs`. The checker is authored from the skeleton's typed obligation contract (it may
   NOT read the held-out oracle `epics/*/tests.mjs`). Measure: does it lift the harness EPIC✓ off 0% at
   scale-d3/d4 (N=13/17)? Then re-run the cost-join vs bare-opus to test the cost crossover with reliability held.
2. **An honest scale + amortization story.** Author opus skeletons at N≥13 and/or reuse one skeleton across
   epics, to amortize the ~$0.40 orchestration term below the all-frontier line. (Defensible weaker claim
   already holds: hybrid dominates all-frontier on the lethal-quadrant X-CUT sub-metric at ≤cost above N≈13.)
3. **A cost-optimized all-frontier baseline.** Implement the bar honestly (cloud routing across
   opus/sonnet/haiku), not naive all-opus — it is load-bearing for the entire result. (M-coh-2.5 used the
   admissible reliable bar = opus-whole, since sonnet-whole fails the reliability gate.)
4. **A task-distribution decision (the kill-condition that actually threatens the thesis).** Pick the
   corpus of real build-tasks the system is claimed to hold on, so the win is "true," not "true on our
   fixtures."

### Parallel track — the M5 meta-search instrument (rev.3, FROZEN 2026-06-17; P0+P1+P2a+P2b+P2c done → the search REDISCOVERS the cost-dominating config; next is the P3 prerequisites)

The M5 adaptive-harness was **brought forward** as an *instrument → fixed product* discovery tool for crux
item 1 (the checker lever × scale): an evolutionary/reflective search over builder-system configs that finds
whether/where a hybrid dominates all-frontier, then **freezes the winner and re-tests it** as a fixed
architecture (NOT "optimal mix" — the search is the instrument, the frozen config is the product). Spec:
[`studies/meta-search/DESIGN.md`](studies/meta-search/DESIGN.md) (**rev.3, after a 2nd 2-round adversarial
review** — 15 canonical findings folded; the **bucket-average veto became a per-cell non-inferiority veto**,
credit-attribution/niching/surrogate/knowledge-capture were staged out of the frozen P1 set, the routed
all-frontier baseline was scoped to a separate workstream with an interim opus-whole proxy, and a
measurement-layer cluster was added — instrument self-validation, effective-sample-size, harness-error
handling, concrete freeze values). Two new Tier-2 decisions resolved (§13.4 baseline scope = external
prereq + proxy; §13.5 instrument self-validation = hard K8 gate). **The pre-registration freeze was TAKEN
2026-06-17** (after a GO-WITH-FIXES freeze-readiness re-check: TEST-hash staged, anchor pair
`{workspace, scale-d1}` named + content-hashed, all values pinned — δ=0.05, α=0.05, weights (1.0/1.0/0.1/0.0),
per-cell non-inferiority veto, K5=250, K6≥0.90, K7 ρ≥0.80, K8 ≤8gen/≤300evals, max-M=12, restore-margin=2×SE).
Full record: [`studies/meta-search/FREEZE.md`](studies/meta-search/FREEZE.md). rev.3 also adds **§14 operational
autonomy** (checkpoint/resume + watchdog + mechanized off-path curation + the Phase-1-mechanism-only boundary)
so a single run goes hands-off within the guardrails — freeze-compatible, "run-until-a-guardrail-then-halt."
**P0 COMPLETE — GREEN (2026-06-17).** Built additively under `studies/meta-search/` (~1.6k LOC; frozen
apparatus tree `studies/build-gap/` verified untouched). All 5 blocking gates pass: G0 freeze-consistency,
G1 per-cell-metric wired through the real `evaluateEpic` (digest leaks no cell names; veto rejects a lethal
drop), G2 oracle kill-rate 1.000/1.000 (≥0.90 lethal), K8 planted-positive rediscovery 30/30 pinned seeds
(99.4%/500 base rate) within ≤8gen/≤300evals + in-loop veto, §14 checkpoint→resume bit-identical + watchdog
halts-to-checkpoint on a planted hang. Live gateway smoke OK (non-blocking). Record:
[`P0-RESULTS.md`](studies/meta-search/P0-RESULTS.md); driver `node studies/meta-search/p0.mjs`.

**P1 CONCLUDED — loop-closure ✓; checker lever NULL at N=5 (the pre-registered K1-at-N=5).** Built the live
cheaper-author × checker arm additively (`src/{skeleton-author,checker,proposer,baseline}.mjs` + live
`evaluator.mjs` + `p1.mjs` + `gates/p1-smoke.mjs`; deterministic smoke 14/14 zero-spend; P0 re-ran GREEN 5/5
after an async `mutate` change — K8 + §14 stay bit-identical). The pilot + a 4-cell probe on scale-d1 show:
the live loop closes end-to-end, but the per-surface checker **does not move the lethal buckets at N=5** —
**INTEG is 0% in every cell** (a per-surface checker structurally cannot fix the *cross-surface* membership
seam; reproduces MCOH25's "only opus-authored skeletons restore the seam"), and the X-CUT deltas are K=1
gateway noise in cells where the checker was inert. **K1-at-N=5 confirmed**, matching MCOH25's scale-gating
(the checker pays off at N≥13, not N=5). Record: [`P1-RESULTS.md`](studies/meta-search/P1-RESULTS.md). The
frozen tree `studies/build-gap/` is untouched and no frozen invariant changed → nothing voided.

**P2a CONCLUDED — the cross-surface integration-gate MECHANISM is CONFIRMED.** The research lead **staged** P2:
build the cross-surface lever and probe whether it moves INTEG *before* paying for the full scale sweep. Built
`src/integration-gate.mjs` + the `integrationGate` genome node (hash-safe via R2-10 clean-restart — `canonical()`
strips it when off, so **P0 re-ran GREEN 5/5 with K8 bit-identical**) + `p2.mjs` (a paired-A/B probe that fixes
P1's K=1 noise) + `gates/p2a-smoke.mjs` (41/41 zero-spend). A live diagnostic found the dominant N=5 INTEG
failure is **missing defensive-init of a non-base shared store** (an undefined-access crash, NOT representation
drift → INTEG is *bimodal* ≈0%/100%); the gate was strengthened to detect that cross-surface invariant. **Result
(scale-d1, 12 rounds, paired): the deterministic gate lifts INTEG 0%→100% (Δ +92pp), recovered 11/11 drifted
rounds, X-CUT flat** — the mechanism P1's per-surface checker structurally could not deliver. The **cheap-judge**
variant is NULL (fail-open, as in P1). This is a **mechanism** result at N=5, NOT a cost-win (still scale-gated
to N≥13). Record: [`P2a-RESULTS.md`](studies/meta-search/P2a-RESULTS.md). Frozen tree untouched; nothing voided.

**P2b CONCLUDED — the predicted COST×RELIABILITY CROSSOVER is OBSERVED.** Wired the `integrationGate` mutation
operator (R2-10 clean-restart at the phase boundary) and **re-validated K8** under the widened 19-operator set
(29/30 ≥ the 0.90 floor; P0 GREEN 5/5; cross-phase frozen invariants — weights/veto/δ/α/TEST — untouched, so
nothing voided). Ran a paired scale sweep (`p2b-sweep.mjs`) of the hybrid (cheap-build + skeleton + deterministic
gate) across scale-d{1..4} (N=5→17) × {fusion, opus} skeleton, vs the MCOH25 Result-4 bare-opus bar. **Result:
at N=5 bare-opus wins (perfect + $0.278 = the pre-registered K1-at-N=5); at N≥13, where bare-opus erodes (X-CUT
78→80%, EPIC✓ 33→0%) and gets pricier ($0.387→$0.431), the $0 fusion+gate hybrid holds X-CUT *above* bare-opus
(89–90%) and the gate recovers INTEG to 69–85%, at zero cost** (opus+gate even clears EPIC✓ 33% vs bare-opus 0%
at N=17). The integration-gate is the load-bearing lever (gate-OFF INTEG 0–33% → ON 69–85%); the cheapest
skeleton is strongest at scale. **PROVISIONAL** (opus-whole cost proxy, X-CUT sub-metric, 3-round samples, not
through the per-cell veto). Record: [`P2b-RESULTS.md`](studies/meta-search/P2b-RESULTS.md). This is the strongest
evidence yet for the north-star thesis — NOT the final P3 result.

**P2c CONCLUDED — the deferred SEARCH machinery is ON and the search REDISCOVERS the P2b config.** Switched on
three of the four deferred P2 mechanisms (FREEZE §5 — NOT frozen), each **instrument-re-validated under the new
mechanism** (the P2b discipline): **celled MAP-Elites** (`src/map-elites.mjs` + an injected `selectParents`
hook; K8 rediscovery 28/30, K4 no-collapse median 17 cells), **counterfactual credit-attribution**
(skeleton-first + the 2×SE mis-attribution kill, `src/credit.mjs`; evals charged to K5), and the
**surrogate-scorer under K7** (`src/surrogate.mjs`; fidelity ρ=0.96, the kill fires on decorrelation). The 4th —
**knowledge-conditioning** was deferred at P2c (its `confirmed`-record store was blocked on the 2nd
hand-authored oracle; highest K3 leak surface). **UPDATE 2026-06-19: that oracle now exists + is GREEN
(`src/oracle2.mjs`), so knowledge-conditioning is UNBLOCKED** (optional; still the highest K3-leak surface). All flag-gated/injected → **P0 re-GREEN 5/5, K8
29/30 bit-identical**, frozen invariants untouched → nothing voided. **The search** (one live N=13 eval >150s, so
it ran on a deterministic landscape **calibrated to the live P2a/P2b numbers** — the economics claim is P2b's,
this run's claim is only that the SEARCH converges, cf. K8): from the **naive** pool, with all three mechanisms
on, **both mutator seeds at N=13 and N=17 rediscover the same config — cheap (fusion) skeleton + shapes + the
deterministic integration-gate, at $0** — dominating the bare-opus bar (cost< ∧ per-cell lethal non-inf ∧
reliability≥parity; the naive seed itself fails the veto, so the search had to climb). Reproducible (R2C-4); the
gate is the load-bearing lever (checker mostly off). **PROVISIONAL** (opus-whole + unmeasured-INTEG proxies; one
seam-topology; deterministic landscape) — the winner is **PROPOSED, not frozen**. Record:
[`P2c-RESULTS.md`](studies/meta-search/P2c-RESULTS.md); driver `node studies/meta-search/p2c-search.mjs`.

**Next action: the P3 prerequisites, then freeze + falsify.** (1) **The routed all-frontier baseline** (external
workstream) — converts the opus-whole/INTEG-proxy comparison into the full lethal-quadrant cost win and gives the
per-cell veto a *measured* baseline INTEG. (2) **External validity:** author the diverse epic templates + the
**2nd hand-authored oracle** (unblocks "confirmed" promotion AND knowledge-conditioning). (3) **P3 — freeze &
falsify:** freeze the PROPOSED winner (genome JSON + SHA + route roster + price table), run the live multi-seed
search + score **once** on the sequestered ≥80-epic TEST via the independent 2nd-oracle grader (FREEZE §4/§6);
promote the integration-gate into [`PROPOSAL-HYBRID.md`](docs/PROPOSAL-HYBRID.md). (4) **Tighten the gate —
DONE (deterministic half):** the dominant Mode-A repair is now surgical + deterministic (`surgicalInitRepair`,
preserves obligation guards by construction → the X-CUT −3pp is gone; lifts the INTEG floor; $0); validated
p2a-smoke 44/44 + P0 GREEN + a live scale-d1 check (INTEG 50%→100%, X-CUT held 100%). Remaining: push INTEG past
~85% at the largest N (residual multi-seam drift). Ledger: [`AMENDMENTS.md`](studies/meta-search/AMENDMENTS.md).

**P3 PREREQUISITES BUILT + COMMITTED, and the HEAD-TO-HEAD reframed the program (2026-06-18; committed
`5f9b452`, `5e65291`).** (a) 2nd oracle, diverse templates (4 seam topologies), sequestered TEST + content hash
(`74f10cbc…`), and the **routed all-frontier baseline** all built (`ORACLE2.md`, `DIVERSE-TEMPLATES.md`,
`TEST-SET.md`, `ROUTED-BASELINE.md`). The routed baseline builds at **100% through D=3** [⚠️ SUPERSEDED
2026-06-20 by the SETTLED worst-of-K=8 run — that "100%" was a **K=1 single-draw artifact**; under worst-of-K=8
the routed baseline ALSO erodes (10/17 cells, 14% per-draw lethal-fail, even at d1), so it is **not** the 100%
wall this line assumed; see the Session-5 banner + `ROUTED-BASELINE.md`] — so the P2b/P2c
"crossover" win was vs the weak **opus-WHOLE proxy**; against the real baseline it was a cost/reliability TRADE,
not dominance. (b) The **live head-to-head** (`HEAD-TO-HEAD.md`; hybrid vs routed baseline, identical epics,
same oracles, ~$0) gave a **topology-gated** verdict: **WIN** (parity at ⅓–½ cost) on state-ordering
(lifecycle) + set-membership; **LOSS** on conservation (quota) + separation-of-duties (approval) [⚠️ SUPERSEDED
2026-06-20 by the SETTLED co-measured worst-of-K=8 head-to-head — those WINS were **K=1 route-luck**; at
worst-of-K=8 across the route zoo the hybrid LOSES **all 17 cells** (0/17 lethal-non-inferior), the membership +
lifecycle "wins" included; see Session-5 banner + `HEAD-TO-HEAD.md`]. The gap is
mostly **cheap-tier coding-quality, not an unhandled seam** — the integration-gate is membership-specific and
no-ops elsewhere [this read SURVIVES + is strengthened: the crosscut/obligation gap dominates, 16/17 cells]. (c) **The P2c "proposed winner" is NOT ready to freeze.** NEW DIRECTION = the **A×B
co-evolution program** (co-evolve orchestration **and** output-QA, scale-laddered, worst-of-K across routes,
freeze the champion at the end). Full handoff spec: [`COEVOLUTION-SPEC.md`](studies/meta-search/COEVOLUTION-SPEC.md).
Binding principle: the system must be **model-agnostic** (route/model selection is NOT an admissible fix);
classify every failure (A) orchestration / (B) output-QA / (C) boundary.

**A×B CO-EVOLUTION STARTED (2026-06-18; apparatus UNCOMMITTED) — rung-1 starting line measured + generalized
seam-gate built. Pick up: [`COEVO-RUNG1-PROGRESS.md`](studies/meta-search/COEVO-RUNG1-PROGRESS.md).** The 5
open design questions (§8) are resolved. **Key finding:** under **worst-of-K=3 across routes** (the
model-agnostic fitness), all 4 topologies pass d1 at **100/100 — INCLUDING quota + approval**, contradicting
the head-to-head's single-draw losses → those were **route variance / gateway drift, NOT structural** (the
exact thing worst-of-K exists to expose). CAVEAT: K=3 can't *certify* route-robustness (P(3/3 pass)≈0.42 at a
25% per-route fail rate) → ran a **K=10 base rate**: quota-d1 + approval-d1 are **10/10 draws 100/100** across
15/17 distinct routes (13/13 clean with the K=3 run) — the head-to-head d1 losses **DO NOT reproduce**, so they
were route-unlucky tails / same-day gateway drift, NOT structural. **→ d1 is SOLID; the real work is the d2/d3
climb** (where the head-to-head's deep losses were graded partials: quota integ 63/75, approval crosscut→71).
⚠️ **Newly-confirmed methodological flag: the free gateway is a NON-STATIONARY pool** — single-draw verdicts are
unreliable (validates worst-of-K); freeze/TEST must mind pool drift; Phase-2 fixed local hardware is the mitigation. **Built (additive, frozen tree untouched):** `coevo-rung1.mjs` (worst-of-K harness + A/B/C attribution +
`--seamgate`); `src/seam-gate.mjs` (generalized gate — per-topology seam profile from the public skeleton,
Mode-A init + Mode-B drift, **membership delegates bit-identically** to the proven gate, oracle-blind;
**Mode-C semantic invariants STAGED OFF** until the base rate shows they're load-bearing); `gates/seam-gate-smoke.mjs`
(22/22 green). P0/K8 unperturbed (synthetic path calls no gate); re-validate K6/K7/K8 when the gate/genes wire
into the live evaluator+genome (tasks #3/#4). NEXT after the base rate: paired `--seamgate` probe → then the
(A) contract-precision + (B) extraction genes (`src/genome.mjs`, new unfrozen genome).

> 🛑 **VOID — the entire paragraph below is INVALID (grader bug; see correction at the top of this file and
> the CRITICAL CORRECTION banner in `COEVO-RUNG1-PROGRESS.md`).** `coevo-rung1.mjs` graded with
> `testsPath:undefined` → every draw faked 100/100. Bug FIXED (`loadEpic` returns `testsPath`); the real
> re-grade shows quota-d1 + approval-d1 **FAIL** worst-of-K (integration 2/8 and 1/8; the head-to-head
> losses REPRODUCED and are real). Kept below for the audit trail only.

**RUNG-1 COMPLETE (2026-06-18; apparatus UNCOMMITTED) — all 4 topologies route-robust THROUGH d3, gate-OFF
base rate 0%.** [VOID — grader bug, see above] The paired `--seamgate` d2/d3 climb ran on all four seam topologies (quota + approval first,
then lifecycle d2/d3, then membership d1/d2/d3 after unpinning its depth-matched oracle). **Grand total: 0
gate-OFF failures in 92 draws** (quota/approval d1 K=10, all cells d2/d3 K=8) across ~25 distinct cheap
routes, at ~½ routed-baseline cost ($0.395 vs $0.74–0.81). **Three reads:** (1) the head-to-head's
topology-gated losses (quota integ 25, approval integ 17/75) were **route variance** — approval-d3 passed
8/8 across 23 routes — so the P3 "topology-gated, not freezable" verdict is **overturned** under worst-of-K;
(2) the seam-gate fired on every draw + applied 100+ repairs but **recovered nothing** (base rate already 0%)
→ **not demonstrated load-bearing at d1-d3**; (3) the task-#3 gene program (premised on *structural* losses)
is **not justified at this scale**. **The erosion frontier was NOT reached at d3.** Records:
`coevo-rung1-k10-d1-baserate.json`, `coevo-rung1-d2d3-seamgate.json`, `coevo-lifecycle-d23.json`,
`coevo-membership-d123.json`. **Apparatus (additive, dev — frozen tree untouched):** `coevo-rung1.mjs` gained
`--out`; `epicSpec` membership now uses depth-matched `oracle2-tests-d${D}.mjs` (d1 bit-identical) + new
`gates/lib/oracle2-tests-d{2,3}.mjs`. ⚠️ These touch the live oracle wiring → the §3.3 K6/K7/K8 + P0
re-validation is **DUE before any freeze**. **NEXT = a STRATEGY CALL (user's):** (1) **go deeper to find the
erosion frontier** — membership-d4/d5 is runnable NOW (oracle generalizes; quota/approval/lifecycle would need
new d4 templates); or (2) **move toward freeze** + the once-only sequestered-TEST. The gene program is parked
unless erosion appears.

**UPDATE 2026-06-19: the meta-search apparatus is now COMMITTED on `main`** (the P2c search machinery
`src/{map-elites,credit,surrogate}.mjs`, the P3-prereqs, and the co-evolution/head-to-head apparatus all landed
with the EVO-GLEANINGS commits). **Latest on this instrument (full detail in the Session-4 update at the top of
this file):** the EVO-GLEANINGS program — Batch 1 (six additive/audit-only gleanings, `9087896`), Batch 2 #3
strategy-ablation (`2b8e2c3`), Batch 2 #2b-POST score-repro KILL (`75c2789`) — plus the **Phase −1 instruments +
block-A run** (`86c06c3`, record `PHASE-NEG1-RESULTS.md`); **P0 GREEN 5/5 bit-identical and the frozen tree
untouched** throughout (the only `DESIGN.md` change is the additive report-only §6b, logged in `AMENDMENTS.md`).
The remaining Phase −1 step is **block B** (a later session) → instability band → the GO/HALT rule.

### Two live tensions in the plan (open, deliberate)

- **The all-frontier baseline is not free to define.** "Optimally route across opus/sonnet/haiku" is
  itself a routing problem; a lazy bar makes the cost win hollow, an honest one is real work.
- **Generalization beyond the synthetic epics is the real threat.** The existence proof lives on
  `workspace` + `scale-d{1..4}`; "reliable on a measurable task set" needs the explicit task-distribution
  decision above.

## Substrate staging (decided 2026-06-16)

- **Phase 1 — the free gateway (now).** The jnoccio free-model pool (`127.0.0.1:4317`, wired as
  `makeGatewayInvoke`) is the **upper bound** of the cost win ($0 marginal coding). It proves the
  system's *technical viability* but only **proxies** the fixed-cost story. Cheap, fast loop; reuses the
  whole existing battery.
- **Phase 2 — owned local hardware (later).** Stand up a 7B–30B local rig and re-run the proven system to
  **realize** the fixed-cost economics + the privacy/independence story. Caveat: the free gateway is an
  uncontrolled mixture possibly bigger than commodity GPUs can run, so Phase-1 reliability is an *upper
  bound* for Phase-2 — closing that gap ties to the per-model break-point work in
  `studies/oneshot-capacity/`.

## Where the imported research (the OKF) sits

The OKF bundle (`okf/agentic-workflow-optimization/`) does **not** contradict any finding, but it pulls a
different way on framing: its "next step" (**M5 = automated workflow search, GEPA-first**) is an
*academic* contribution to the agentic-workflow-search literature; **this program's deliverable is a
product** (the system that beats all-frontier on cost). **UPDATE: the M5 / workflow-search instrument was
brought forward** as the *instrument → fixed product* discovery tool for the current crux (the meta-search
program, P0→P2c + EVO-GLEANINGS) — it is the active apparatus now, NOT a later academic horizon. The
**lens-ensemble precursor** still stays on the roadmap *after* the system clears the reliability gate and the
cost bar. (The OKF's skeptical source, "Inefficiencies of Meta Agents," still argues for building the static
system first; here the search is the *instrument* that proves the reliability gate honestly, and the frozen
config is the product.)

---

## How the history fits — three eras (so legacy docs aren't read as the goal)

The repo pivoted twice. Most docs were written under an earlier headline. **The findings carried forward
intact; only the headline question changed.**

| Era | Headline question | Status | Lives in |
|---|---|---|---|
| **1. Decomposition battery / surface-discovery** | "best way to decompose a thin plan into atomic beads" | **superseded headline**, machinery + findings still valid | README (old), CHARTER, RESEARCH-PROGRAM, RECONCILIATION, OBLIGATIONS, BUILD-TOLERANT-REFRAME, STAIRCASE-RESULTS, PRIOR-ART-COMPLETENESS, KILL-TESTS, ARCHETYPE-PREMISE, FINDINGS |
| **2. Cheap-vs-frontier stage study** | "can a harness make cheap/local match frontier, stage by stage?" | **demoted to sub-claim** | `docs/PROPOSAL.md`, `studies/build-gap/` |
| **3. Hybrid product** *(current)* | "frontier-orchestrated + lightweight-coded system beats all-frontier on cost at equal reliability" | **CURRENT north star** | `docs/PROPOSAL-HYBRID.md`, this file |

Every Era-1/Era-2 doc now carries a one-line banner saying its headline is superseded and pointing here.
Read those docs as **evidence**, not as the goal.

## Read in this order

1. **This file** (`STATE.md`) — what/where/next.
2. [`docs/PROPOSAL-HYBRID.md`](docs/PROPOSAL-HYBRID.md) — the north-star question, win condition, substrate plan, OKF reconciliation.
3. [`docs/REPORT-2026-06-16.md`](docs/REPORT-2026-06-16.md) — the full evidence synthesis (origin → reframe → M0 → M-coh ladder → the M-coh-2 double dissociation).
4. [`studies/build-gap/RESULTS.md`](studies/build-gap/RESULTS.md) + [`DESIGN.md`](studies/build-gap/DESIGN.md) — the live experiments (M0, the M-coh ladder) and the apparatus.
5. [`docs/PROPOSAL.md`](docs/PROPOSAL.md) — the Era-2 predecessor (machinery PROPOSAL-HYBRID inherits).
6. The Era-1 docs (CHARTER, OBLIGATIONS, BUILD-TOLERANT-REFRAME, …) — historical framing; load-bearing findings (the **lethal quadrant**, the obligations layer) still feed the reliability gate.
