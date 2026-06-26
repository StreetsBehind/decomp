# Lever B — the $0 conditioned diagnostic (2026-06-25)

> The ratified next step after [`LADDER-RESULTS-A.md`](LADDER-RESULTS-A.md) (codex×opus deliberation CONVERGED,
> `runs/deliberations/20260624T202607Z/`; metric ratified in [`AMENDMENTS.md`](AMENDMENTS.md) 2026-06-25).
> **Build Lever B** (the approval `approve→execute`/idempotency + quota conservation obligations as inject+verify)
> and run a **$0 conditioned diagnostic** on the existing `dump-ladder` + `dump-ladder-A` draws of the named
> semantic cells (approval-d2/d3/d4, quota-d3/d4 — [`LEVER-A-SCOPE.md`](LEVER-A-SCOPE.md)), **reporting
> DETECTION (deterministic) and REPAIR-across-zoo (model-routed) SEPARATELY**. The pre-registered (C) read uses
> the variance-robust unanimous-failure asymmetry: a (C)-verdict needs *every* above-floor route to fail the
> semantic invariant (a universal quantifier; non-stationarity changes *which* route is worst, it cannot
> manufacture unanimous semantic correctness) — so the reliability question is adjudicable on the noisy
> free-gateway instrument without taming the pool.
>
> Command: `node diag-lever-b.mjs` (detection-only, $0 deterministic) → `node diag-lever-b.mjs --repair --reps 3
> --bestofn 2` ($0 free gateway). Apparatus: `src/semantic-obligation.mjs` (Lever B), `gates/semantic-obligation-smoke.mjs`
> (24/24), `diag-lever-b.mjs`, `inspect-residual-why.mjs`. Artifacts (gitignored): `runs/diag-lever-b{,-detect}.json`.

## Lever B — what it is + why it is admissible

`src/semantic-obligation.mjs` is the inject+verify lever for the three cross-cutting obligations the settled
output-QA stack **declares but never semantically verifies** (`obligation-contract.mjs` deliberately skips the
`SEMANTIC_CATEGORIES`, and `seam-gate.mjs`'s `modeCIssues` hook is stubbed to `[]`):

- **conservation** (quota) — "a withdraw must refuse if it would drive the balance negative".
- **approve→execute** (approval) — "execute… requires a valid approval — one recorded by an admin who is **not**
  the requester" (the SoD ordering half of the authz rule; the existing obligation-contract `authz` check only
  verifies an admin gate is *present*, not that execution is *gated on a recorded approval*).
- **execute-idempotency** (approval) + **keyed-idempotency** (quota) — "re-executing must not append a second
  audit record" / "a replay with a seen key applies the change once".

**Admissibility (the surfaces-only test, applied to a SEMANTIC lever).** Lever A's discriminator was "no literal
of intended behavior" — correct for a pure structural seam-recovery gate. Lever B is the *obligation-contract*
class, whose admissibility basis is different and explicit: **the intended behavior is DECLARED in the PUBLIC
skeleton that the cheap builder also receives** (`skeleton.md` "### Cross-cutting rules"). Lever B reads that
declared rule (`parseCrosscutRules` — the same parser `obligation-contract.mjs` uses) and checks the candidate's
*own* code against it; it never reads the held-out oracle (`epics/*/tests.mjs`) and encodes none of its
scenarios. This is exactly M-coh-2's mechanism — the frontier skeleton carries the typed obligation contract,
the output-QA layer enforces it. Every repair prompt is `scanOracleLeak`-scanned. The thin surface prompts
(`executeRequest.md`: "append an execution-audit record… Throw if the request does not exist"; `withdraw.md`:
"Deduct `amount`… Throw if the wallet does not exist") name NONE of these obligations — so a cheap route omits
them; Lever B is the enforced verifier that adds them back.

**Validation (all GREEN, $0):** `semantic-obligation-smoke` **24/24**; **P0 5/5 GREEN bit-identical** (U=175
R=175 — Lever B is a new module not imported by the loop/P0 path); existing smokes unchanged (container-recon
16/16, seam-gate 22/22); frozen tree `studies/build-gap/` == pinned `1580944…`.

## The diagnostic method

For each named cell × each draw (8 per dump × 2 dumps = 16): apply the floor (parse∧export∧smoke, Rule 1 +
Rule 2b); run the **full existing deterministic stack** (repair→shape→contract→obligation→seam, route-back OFF —
reproducible, $0; conditioning on the deterministic stack is **conservative**: a form residual the model stack
could fix excludes the draw, so we under-count, never over-claim); grade with the frozen oracle; classify each
residual fail (`classifyFail`, broadened after the `unknown`-bucket inspection below).

- **PRE-REGISTERED `conditioned` subset** = above-floor ∧ smoke-clean ∧ **sole** residual is the cell's semantic
  class (Rule-2d clean — no form/incompetence residual mixed in).
- **SUPPLEMENTARY `relaxed` subset** = above-floor ∧ smoke-clean ∧ **Lever B's deterministic detection fires**
  (the semantic obligation is genuinely missing), regardless of co-mixed form residual. The repair read on this
  subset measures whether Lever B clears the **semantic-class fails specifically** (decoupled from the form
  residual the existing stack leaves) — the more informative read when sole-residual draws are scarce.

The frozen oracle is the **measuring** instrument (does repair work?), never an input to the lever.

## Classifier correction (a load-bearing methodology note)

The first detection pass reported the sole-residual subset as ~empty. Inspecting the `unknown`-classed residual
`why` strings (`inspect-residual-why.mjs`) showed the canonical `classifyFail` regex was **under-counting
semantics**: genuine approve→execute fails ("Release not in approved state", "Requester cannot execute their own
payout", "status advanced to executed: actual 'approved' / expected 'executed'") and conservation fails
("withdraw the remaining 30 succeeds", "Insufficient funds") were landing in `unknown`. The classifier was
broadened (telemetry only — never a lever input). This matters: it is the same "the regex over/under-counts
semantics" failure mode the labeler was built to avoid; the conditioning anchors on the oracle grade, the regex
only partitions the residual for the report.

## Results — CONDITIONING + DETECTION (deterministic, $0, final)

| cell | above-floor | sole-residual n | relaxed (detection-fires) n | residual-mode fail-counts (post deterministic stack) |
|---|---|---|---|---|
| approval-d2 | 12/16 | **4** | **7** | approval/idempotency 21, authz 8, seam 4, shape 4, tenancy 3, conservation 3 |
| approval-d3 | 13/16 | **2** | **8** | approval/idempotency 34, input-validation 14, shape 13, authz 12, tenancy 7 |
| approval-d4 | 14/16 | **3** | **9** | approval/idempotency 52, tenancy 17, seam 14, authz 12, shape 8 |
| quota-d3 | 12/16 | **0** | **0** | **shape/unwired 56**, authz 28, conservation 27, seam 6, tenancy 4 |
| quota-d4 | 10/16 | **0** | **0** | conservation 35, authz 30, shape 12, coding-bug 9, seam 6 |

**Detection fires correctly on approval** — on the execute surfaces (`executeRequest`, `shipRelease`,
`settlePayout`) for `approve-execute` + `execute-idempotency`, on 7–9 above-floor smoke-clean draws per cell.

**Detection is INERT on quota — and that is the correct, load-bearing finding.** Lever B fires on **0** quota
draws even though conservation fails are present (27/35 fails). Reason: the quota draws that fail the
conservation oracle **still contain a conservation guard in the code** (e.g. `if (currentBalance - amount < 0)
throw 'Insufficient funds'`) — Lever B's detector correctly does not flag them. The conservation *test* fails
because the **container drift** (`ctx.db.ledger`/`wallets` used as a Map vs the skeleton-declared Array —
`shape/unwired:56`) corrupts the balance computation the guard reads. So quota's "conservation (C) candidate"
(LEVER-A-SCOPE.md) is **re-attributed**: it is the **container-drift FORM bug** (Lever A's unreachable
read-modify-write class, which the model route-back also fails to close — LADDER-RESULTS-A STEP 1) manifesting as
a conservation failure, **not** a missing semantic obligation. Lever B is correctly inert; conservation is not a
clean (C) wall on these dumps.

## Results — REPAIR-ACROSS-ZOO (model route-back, reps=3 × bestOfN=2, $0 free gateway)

Measured on the relaxed detection-fires subset (quota is empty). `sem-cleared` = ALL baseline semantic fails
gone with no lethal-bucket regression; `sem-improved` = strictly fewer semantic fails, no regression.

| cell | sem-cleared (some route) | sem-improved | full-pass | read |
|---|---|---|---|---|
| approval-d2 | **3/7** (Ld8, Ad5, Ad7) | 5/7 | **1/7** (Ad7 → 100%) | **(B) traction** — repair clears approve→execute/idempotency on some routes |
| approval-d3 | **0/8** | 0/8 | 0/8 | **(C)-leaning** — repairs fire but oracle semantics never reduce across the zoo |
| approval-d4 | **0/9** | 3/9 | 0/9 | **(C)-leaning, partial** — repairs reduce some semantic fails, never clear |
| quota-d3/d4 | (empty) | — | — | detection inert (drift, not semantics) |

**Two distinct (C)-shaped sub-modes the per-draw detail exposed (`runs/diag-lever-b.json`):**

1. **Repair-fires-but-oracle-semantics-survive (d3/d4).** The model route-backs are *accepted* by the
   oracle-blind no-regress score (`repairs` > 0 — the model added something the structural detector counts as the
   missing gate) yet the oracle's semantic fails **do not reduce** (`afterSem == baseSem`). The cheap pool, even
   handed the declared obligation verbatim, writes a **structurally-present but semantically-wrong** approval/SoD
   gate. Across approval-d3 (8 draws × up to 6 routes) the semantic class cleared **0** times — the variance-robust
   unanimous-failure read the deliberation predicted the noisy instrument could support.
2. **Detection gap — mechanism-present-but-wrong (d2 sole draws A#2, A#8).** Two of d2's *sole-residual* draws are
   **not** in the detection-fires subset: the code already contains an approval gate + dedup (so Lever B's
   conservative presence-detector does not flag it), but the oracle still fails — the mechanism is present and
   *semantically wrong*. A presence-of-mechanism verify structurally cannot catch this; catching it needs a
   behavioural/property check, which edges toward the oracle's own metamorphic logic (the admissibility ceiling of
   a deterministic semantic verify — itself a finding).

Consequence: on the **clean sole-residual subset**, Lever B clears **0/4 (d2), 0/2 (d3), 0/3 (d4)** — the (B)
traction at d2 is on *mixed* draws (where the model route-back of the execute surface incidentally fixed both the
semantic gate and a co-residual). So the (B) traction is real but **does not reach the clean worst-of-K-shaped
residual**.

## Verdict

**The approval `approve→execute`/idempotency obligation is PARTIALLY repairable, depth-graded — not a flat (C)
wall, not a clean (B) win.**
- **(B) is real:** the output-QA stack (Lever B's model route-back) *does* repair the approve→execute/idempotency
  semantic on some cheap routes (approval-d2: 3/7 cleared, 1 full-pass to 100%). Cheap-model semantics ARE
  repairable in principle — evidence FOR the thesis, against any "semantics is a flat capability wall" reading.
  **→ KEEP Lever B; it is load-bearing on the shallow approval semantic class.**
- **(C)-leaning at depth:** at d3/d4 the semantic class survives Lever B across the entire sampled zoo
  (0/8, 0/9 cleared), via the two sub-modes above. This is the program's **first variance-robust, evidence-based
  (C)-boundary signal** — but it is a SIGNAL for adjudication, **not a confirmed thesis-(C)** (Rule 2 forbids
  auto-(C); the verdict is rendered on the LIVE worst-of-K vs the settled baseline, with the inferior-vs-baseline
  test deciding SCOPE-SHRINK vs CONTINUE).

**quota — conservation is a (B) container-drift bug, not a semantic wall** (settled): detection inert on all
quota draws; the conservation oracle-failures are downstream of the Map/Array ledger drift (Lever A's
unreachable read-modify-write class), not a missing obligation. The quota "(C) candidate" from LEVER-A-SCOPE is
**re-attributed to (B)**.

## Next action (per the ratified plan, step 3 + fallbacks)

1. **Wire Lever B into the live stack** (`coevo-rung1.mjs`, opt-in, default-OFF byte-identical) and run a **live
   worst-of-K ladder with Lever B** — confirms the d2 (B) lift and adjudicates the d3/d4 (C)-leaning residual
   against the settled baseline (Rule 2: SCOPE-SHRINK if the baseline holds on isolated approval cells and the
   hybrid walls; CONTINUE if the baseline also erodes there). $0, ~12–16h, background.
2. **Pre-registered fallback (AMENDMENTS.md 2026-06-25) — free-gateway MULTI-PASS, never Phase-2:** (a) for the
   approval sole-residual subset (n=2–4 is thin; multi-pass enlarges it for a cleaner (C) read), and (b) for
   quota — collect drift-free draws so conservation can be isolated from the container-drift confound (or accept
   it is subsumed by the (B)-drift residual).
3. **Optional Lever-B refinement** flagged by the detection gap: a behavioural/property verify would catch
   mechanism-present-but-wrong, but check admissibility first (it must derive from the declared contract, not the
   oracle's metamorphic scenarios).

## Option-3 admissibility ruling (codex×opus deliberation, CONVERGED 2026-06-26, `runs/deliberations/20260626T040021Z/`)

Asked whether a **behavioural/property verify** for Lever B (smoke-execute the built surface and assert the
declared metamorphic property) is admissible or oracle-shaped. **VERDICT: admissible-only-under-constraints.**

- **The cut is PROVENANCE, not method.** Executing candidate code is *not* disqualifying (the smoke / contract /
  obligation gates already do it). oracle2-similarity is *not* collapse: same detection class ≠ same provenance
  class. If Lever B's property coincides with oracle2's metamorphic check, "survives the stack" ⟺ "the cheap pool
  cannot satisfy the obligation even under maximally-sensitive *public-derived* enforcement on *independent*
  inputs" — the **strongest** possible (C), not a voided one.
- **Rule 2(e) is UNMET by the current structural detector — at every approval depth.** At d2 via the detection
  gap (mechanism-present-but-wrong A#2/A#8); at d3/d4 because the structural verify *stops the repair loop at a
  structurally-present-but-semantically-wrong gate* (a behavioural verify would reject that gate and re-prompt).
  So **the current structural-only (C)-leaning is NOT a Rule-2-valid (C)** — option 3 is a named, untried,
  admissible lever and must be built first, **or explicitly time-boxed out and logged in `AMENDMENTS.md`**, before
  any (C) promotion.
- **The constraint set (a CONJUNCTION — a reviewer must check ALL; any one alone is insufficient):**
  1. each asserted property is a **verbatim paraphrase of ONE named skeleton clause**, provenance recorded
     (`rule:` / `source: skeleton cross-cutting rules`);
  2. **scope = the named clauses only** — no broader (a concurrency/race property is inadmissible; the skeleton is
     silent on it, so a "failure" there isn't a Rule-2 candidate);
  3. inputs are **Lever-B-seeded**, with **zero fixture/scenario/value literals** (closes author-time leakage — a
     human peeking at `tests.mjs` and baking a fixture value into a literal);
  4. the assertion harness imports **no oracle/grader code**;
  5. **`scanOracleLeak`** passes on every repair prompt;
  6. **disk-deletion invariance** — the lever's verdict is computable with `epics/*/tests.mjs` deleted from disk
     (a mechanically-checkable superset of "no oracle import");
  7. the property may **gate-and-verify repair, but NEVER be the final keep/discard score** — that stays the
     existing oracle-blind no-regress score; the **frozen oracle remains the sole measuring instrument.**
- **Read-discipline:** the d3/d4 outcome to watch is *property-passes-but-frozen-oracle-still-fails* — that is
  **not** a false (B); the lever's own property passing never enters the (B) claim. Property-passes ∧
  oracle-fails-unanimously is a *stronger* variance-robust (C) signal.
- **Single next action (converged):** build the smallest **approval-only** behavioural verify — **idempotency**
  (`execute` twice → exactly one audit record) + **SoD-ordering** (requester-self-approval / no recorded
  non-requester approval → refuse), each a verbatim-paraphrase, disk-deletion-invariant — wired as a repair
  detector + no-regress verifier (NOT the selection score). Rerun the $0 conditioned diagnostic on
  approval-d2/d3/d4 before any (C) promotion. **Quota stays a (B) container-drift bug; option 3 does not touch it.**
- **What would reverse it:** a code review showing the idempotency/SoD property cannot be written without scoping
  past the named clauses or without oracle-shaped inputs → inadmissible → time-box out the structural-only
  (C)-leaning and log it, do not promote.

## Option 3 BUILT + validated (the behavioural verify) — 2026-06-26

Built per the converged spec. Apparatus (additive; structural-only Lever B path byte-identical when
`gate.behavioural` is off): `gates/lib/behaviour-run.mjs` (child-process scenario runner), `verifyBehavioural` +
`makeBehaviouralRunner` + behaviour-aware repair selection in `src/semantic-obligation.mjs`, wired into
`diag-lever-b.mjs --behavioural`. Smoke `gates/behaviour-verify-smoke.mjs` **8/8**; structural smoke still
**24/24**; behavioural path validated end-to-end on approval-d2 (detection fires on `executeRequest:approve-execute`
+ `shipRelease:execute-idempotency`; oracle-measured (B) traction).

**It composes the candidate's OWN create→approve→execute surfaces in a shared ctx** and asserts a metamorphic
property = a verbatim paraphrase of one named skeleton clause: **SoD** (execute with no recorded non-requester
approval → must throw; self-approval → must throw) and **idempotency** (valid path: a second execute must not
grow the audit store). A setup step that throws → INCONCLUSIVE (never a false violation) — conservative.

**Admissibility self-review (the deliberation's reverse-condition — does NOT trigger; all 7 constraints met):**
(1) properties carry the skeleton's own clause text (`semanticRules`); (2) scope = SoD + idempotency only, no
concurrency/race; (3) inputs are the runner's own seeds (`orgLB/reqLB/admLB/soloLB/bodyLB`), zero fixture/value
literals; (4) the runner imports only node builtins + the candidate surfaces — no oracle/grader; (5)
`scanOracleLeak` on every repair prompt; (6) **disk-deletion invariant** — the smoke proves the verdict is
computed from in-memory candidate code with zero `epics/` access; (7) the property gates+verifies repair, but the
diagnostic's (B)/(C) SUCCESS measure stays the **frozen oracle** (`semFails`), never the property —
property-passes-but-oracle-fails is not scored as (B).

**Option-3 comparison RESULT** (`diag-lever-b.mjs --cells approval-d2,approval-d3,approval-d4 --dumps
dump-ladder,dump-ladder-A --repair --behavioural --reps 3 --bestofn 2`; oracle-measured, $0;
`runs/diag-lever-b-behavioural.json`):

| cell | structural-only (baseline) | behavioural (option 3) | read |
|---|---|---|---|
| approval-d2 | sem-cleared **3/7** | sem-cleared **1/9** (Ad7) | (B) traction persists; the count drop is confounded (below) |
| approval-d3 | **0/8** | **0/9** | **(C)-leaning CONFIRMED + STRENGTHENED** |
| approval-d4 | **0/9** | **0/11** | **(C)-leaning CONFIRMED + STRENGTHENED** |

**The robust, contention-independent finding: at d3/d4 the approval `approve→execute`/idempotency obligation
fails UNANIMOUSLY across the zoo under BOTH detectors** (0 cleared on 9+11 draws × 3 reps × 2 routes). The
dominant sub-mode is *repair-fires-but-oracle-semantics-survive* (`afterSem == baseSem` on almost every
rep): the behavioural detector fires and re-prompts, the route-back is accepted by the no-regress score, yet the
oracle's semantic fails do not reduce. **Even when the output-QA stack detects the structurally-AND-behaviourally
wrong gate and re-prompts the cheap pool with the declared obligation verbatim, the pool cannot produce a correct
SoD/approve→execute/idempotency implementation at depth.** This is exactly the *stronger* variance-robust (C)
signal the deliberation predicted option 3 would yield (turn-4 read-discipline) — and it is now obtained under
**maximally-sensitive admissible enforcement**, so the residual is not an artifact of an under-powered detector.

**d2 retains (B) traction** (Ad7 cleared, afterSem 5→0) → the obligation IS repairable on some route at shallow
depth → the approval semantic class is **depth-graded, not a flat wall** (so any (C) is SCOPE-SHRINK, never a
whole-class KILL). **HONEST CONFOUND on the d2 count (3/7 → 1/9):** the behavioural run shares the free gateway
with the concurrently-running multi-pass collector (contention → more empty/timed-out route-backs: e.g. Ld8 went
`repairs 0/0/0, reverts 1/1/1` — no candidate returned, not an over-rejection by the behaviour-aware score), and
its denominator is the larger UNION (9 vs 7, adding the two detection-gap draws Ad2/Ad8). So the d2
structural-vs-behavioural clear-COUNT is not a clean comparison; the robust d2 claim is only "(B) traction
persists." A clean d2 re-run (collector paused) would sharpen it but is not load-bearing — d3/d4 is the result.

**Rule 2(e) for d3/d4 approval is now (near-)satisfied:** the time-boxed named admissible lever menu — ladder +
Lever A + Lever B (structural) + Lever B (behavioural / option 3) — is exhausted, and d3/d4 approval semantics
fail unanimously under all of them. **The formal (C) VERDICT still requires the live worst-of-K ladder vs the
SETTLED baseline** (Rule 2's inferior-vs-baseline test → SCOPE-SHRINK if the baseline holds on these cells and
the hybrid walls). The diagnostic is the lever-eval metric, not the freeze/TEST statistic (AMENDMENTS.md
2026-06-25). The running multi-pass collection enlarges the thin sole-residual subset (n=2,3) for an even more
robust read.

## Multi-pass collection + combined rerun (the pre-registered fallback) — RESULT (2026-06-26)

`collect-multipass.mjs` collected **32 fresh draws/cell** (build-only, $0) into `runs/dump-multipass/`. The
combined rerun (`diag-lever-b.mjs --dumps dump-multipass --k 32 --repair --behavioural --reps 3 --bestofn 2`,
**uncontended**, oracle-measured; `runs/diag-lever-b-multipass.json`) is the clean, larger-n Rule-2 read. It
**confirms and sharpens — and partly CORRECTS — the 16-draw result.**

| cell | sole-residual n | relaxed n | sem-cleared (repair across zoo) | read |
|---|---|---|---|---|
| approval-d2 | 11/32 | 14/32 | **1/18** | (B) traction is a THIN tail (~5%), not the small-sample 3/7 |
| approval-d3 | 6/32 | 17/32 | **0/18** | robust (C)-leaning (far more route samples) |
| approval-d4 | 0/32 | 14/32 | **0/14** | robust (C)-leaning (sole-residual empty → relaxed read) |
| quota-d3/d4 | 0/32 | **0/32** | (empty) | detection inert on all 32 draws → (B) drift, robustly confirmed |

**The correction:** the earlier d2 **3/7** was small-sample optimism. On the larger uncontended sample the
approval `approve→execute`/idempotency obligation is **largely unrepairable across the zoo at ALL depths** —
d2 clears ~**1/18 (5%)**, d3 **0/18**, d4 **0/14** — with only a thin nonzero (B) tail at d2. So:
- the **(C)-leaning is broader and more robust** than the 16-draw read (d3/d4 unanimous failure now across 18+14
  draws × 3 reps × 2 routes; d2 nearly so);
- d2's nonzero clear keeps it **SCOPE-SHRINK, not a whole-class KILL** (the system *can* occasionally repair
  shallow approval semantics) — but the win on approval semantics is thin even at d2;
- **quota conservation = (B) container-drift is now robustly confirmed** (Lever B detection fires on 0/32 quota
  draws; the conservation oracle-failures ride on the Map/Array ledger drift, not a missing obligation);
- approval-d4's **sole-residual subset is empty (0/32)** — its above-floor draws all co-mix tenancy/authz form
  residuals the conservative deterministic conditioning can't strip — so d4's clean (C) read still leans on the
  relaxed (detection-fires) subset; a fuller multi-pass or a model-stack conditioning would sharpen it.

**Net:** the program's reliability gap on the approval approve→execute/idempotency obligation is **deep, broad,
and robust** to a large uncontended sample and to the maximally-sensitive behavioural lever — the strongest
evidence-based (C)-leaning the program has produced. It remains a **lever-eval signal**, not a thesis verdict:
the formal SCOPE-SHRINK adjudication is the **live worst-of-K ladder vs the SETTLED baseline** (LADDER-RUNBOOK.md,
`--semantic --behavioural`; Rule 2 inferior-vs-baseline). Artifacts: `runs/diag-lever-b-multipass.json`,
`runs/dump-multipass/`.
