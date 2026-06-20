# The obligation-contract lever — the crosscut/obligation output-QA gene

> **Status: BUILT + smoke-GREEN (36/36) + harness-wired + CAUSALITY CONFIRMED (live, $0 free gateway).**
> The lever moves the grade on real cheap builds — it is NOT inert like P1's per-surface checker. It does NOT
> yet close worst-of-K; the residual was diagnosed (tenancy field-drift) and the verifier tightened. Additive,
> dev-only, oracle-blind; the frozen tree (`studies/build-gap/`) is untouched and P0 re-ran GREEN 5/5 with K8
> bit-identical (29/30, worst evals 199/300). Apparatus: `src/obligation-contract.mjs`,
> `gates/obligation-contract-smoke.mjs` (36/36), `coevo-rung1.mjs --obligation`.

## Causality probe — CONFIRMED (2026-06-20, `runs/coevo-obligation-causality.json`)

Ran `coevo-rung1.mjs --obligation` isolated on the two crosscut-killer topologies, worst-of-K=4, free gateway
($0), paired `raw → afterObligation`:

- **approval-d1: worst-of-K crosscut 57→71, integration 0→75** (median crosscut 79→100). The missing-obligation
  repairs lifted draw 1 (c86→100, i75→100) and draw 3 (c57→100, i0→75). 7 missing + 1 invented detected, 4
  repairs, 2/4 draws flagged.
- **quota-d1: the RESTRICTION half is causal** — removing the hallucinated `only-admin-may-withdraw` lifted
  **integration 25→100 on 2 draws** (conservation tests, run as a non-admin member, then pass). 3 invented
  detected + repaired. Median crosscut held at 70.
- **Zero false positives** (already-clean draws untouched), **zero K3 leak**.

**Residual (why worst-of-K is not yet closed) — a precisely localized FORM leniency, NOT a (C) wall.** The
worst draws are gated by a **tenancy field-name drift**: `createWallet` reads `ctx.session.organizationId` (the
wrong field; the skeleton declares `ctx.session.orgId`), so the record is stamped with `undefined` org and the
tenancy tests fail. The original `/orgId/` token-presence check **passed** it (the string "orgId" appears as a
record property) — the same P1 lesson (token-presence under-flags). **FIXED:** the tenancy verifier now requires
the org be *sourced from the session* (`session.orgId` read or `{ orgId } = …session` destructure); the drifted
field matches neither → flagged → repair routed. Regression-locked in the smoke (the exact dumped drift +
both legit forms as no-false-positive controls). Remaining worst-of-K residuals: quota draw-4 integration (the
seam — needs the generalized `--seamgate`, no-op'd in this isolated probe) and one approval missing-draw (the
extraction/best-of-N target).

## Why this lever exists

The settled **worst-of-K=8 head-to-head** (`HEAD-TO-HEAD.md`) FALSIFIED the proposed P2c winner: the hybrid
loses **0/17 lethal-non-inferior cells at ¼ cost**, and the **crosscut/obligation gap is the killer** — 16/17
cells, median −36pp, max −86pp. The membership-only integration-gate has **no lever for it** (no-ops on 12/17
topologies). That arm ran only the integration-gate+retry, NOT the fuller output-QA stack → the *proposed
winner* is falsified, **not** the thesis ([[incompetence-is-the-target]]). This lever is the missing
output-QA half that targets the crosscut bucket directly.

## The mechanism (all from PUBLIC inputs — K3-clean)

The frontier orchestrator's **skeleton** declares the lethal-quadrant obligations once, generically ("apply on
EVERY surface they touch"): tenancy, input-validation, authorization/SoD, idempotency, audit. But each cheap
builder sees only its **thin surface prompt** (e.g. `quota/surfaces/withdraw.md`: *"Deduct `amount` and return a
result. Throw if the wallet does not exist."* — names **none** of the cross-cutting rules). So a cheap route
omits tenancy/validation/idempotency on that surface → the oracle's crosscut tests fail. The dual hazard is
**over-application** of a scoped rule (*"only an admin may deposit"* hallucinated onto `withdraw` → conservation
tests, run as a non-admin member, get refused). Both are **applicability (FORM) defects** an oracle-blind lever
can reach.

The lever is the **ZYAL/gascity advisory↔enforced split** ([[zyal-gascity-agent-contracts]]). From the public
skeleton **only**, derive a typed contract per surface:

- **obligations** — the cross-cutting rules that DO apply here (what it must enforce).
- **restrictions** — what it must NOT invent (a rule the contract scopes to OTHER surfaces — e.g. the admin-only
  deposit gate must not appear on `withdraw`; the structured form of the contract-precision gene).
- **runConditions** — the declared shared store(s) this surface should touch (from the skeleton's shapes block).

Two coupled halves:
- **(A) INJECT** — `injectBlock()` renders the contract as a build-prompt addendum (the amortizable
  skeleton-author hand-off). *Exported + smoke-tested; deliberately NOT yet wired into the harness build path*
  (keeps `raw` comparable across gate flags for clean attribution; the inject vs verify counterfactual is a
  paired-run / credit-module concern for the live increment).
- **(B) VERIFY+REPAIR** — `runObligationContract()` grades the BUILT code against the contract with
  deterministic oracle-blind heuristics (the enforced verifier) and routes a repair on a miss. **This is the
  half wired into `coevo-rung1.mjs --obligation`** — it composes with the existing stack
  (shape→contract→**obligation**→seam) and a paired worst-of-K run can attribute it cleanly (raw vs final on the
  SAME build).

**Verify scope = the FORM-reachable obligations only** (tenancy, input-validation, authz applicability,
idempotency, audit — exactly the crosscut bucket). The **semantics** obligations (conservation arithmetic,
legal-transition predicate, gated-read state) are injected as guidance but **NEVER flagged/repaired** — an
oracle-blind gate cannot decide them (those are the `semantics` / (C)-candidate class in `coevo-rung1`'s
`classifyFail`). This keeps the lever inside the binding premise: it never grades what only the held-out oracle
can grade.

## Oracle-blindness (K3 — load-bearing)

Every input is public: the skeleton (the builder sees it too), surface names, build prompts, the candidate's own
code. `source` is structurally `skeleton` — there is **no oracle path to evolve** (the type-system guardrail the
falsy-return lever lacked, [[coevo-grader-bug-and-baseline]]). Every repair/judge prompt runs through
`scanOracleLeak`; a hit returns `leak=true` and voids the candidate. The smoke proves the guard **FIRES** on a
planted token (positive control), not just that it's absent.

Applicability re-uses the proven parser: **authz** scoping goes through `adminScopedSurfaces`
(conservative over-inclusion → under-restriction → never strips a legitimately-required admin guard), so the
obligation half and the restriction half can never disagree. **Tenancy** is forced universal (its prose
enumerates facets — *"…listing returns only caller-org records…"* — and verb-matching "listing"→`list` would
wrongly drop tenancy from every other surface; the gerund-collision trap, caught + fixed during the smoke).

## Smoke (33/33, $0, against the real on-disk skeletons)

`gates/obligation-contract-smoke.mjs` asserts: rule parsing across quota/approval/lifecycle; the **dual** —
the same admin rule is an OBLIGATION on `deposit`/`approve` and a RESTRICTION on `withdraw`/`create`; universal
tenancy; semantic rules tagged inject-only; inject-block content + non-leak; verify flags MISSING obligations +
INVENTED restriction, passes clean code, **never** flags a semantic obligation; the verify→repair loop clears
violations; off=no-op; the K3 guard fires on a planted token.

Harness mock dry-run (`--mock --obligation`, $0) confirms wiring end-to-end: detects 7 missing obligations on
quota's 4 surfaces, 8 on approval's, grades `afterObligation`, renders the attribution segment, exits clean.

## Composed-stack validation (2026-06-20, `runs/coevo-obligation-stack.json`)

Ran `--contractgate --obligation --seamgate` on quota+approval, worst-of-K=4, $0 (a *different* gateway route
zoo — non-stationary pool — so cross-run worst-of-K is illustrative; the valid read is within-run paired
`raw→afterContract→afterObligation→final`). **The lever is load-bearing and its attribution is clean:**

- **approval draw 2 (a near-dead worst route): c14→71, i0→75** — 3 missing obligations → 2 repairs. The
  headline causal win.
- **quota draw 2: contract's deterministic admin-removal i25→100** (the restriction half, deterministic).
- The obligation gate correctly **owns none of the residuals**: shape-drift (quota draw 3 c60 — flagged 0,
  right call, → `--shapegate`); semantics (quota draw 1 conservation i25, approval draws 3/4 idempotency/audit
  i50 — never flagged, the (C)-boundary candidates); a missing-draw (approval draw 2 `createRequest` →
  extraction). No false positives; medians 100.

**NEW hazard — repair-regression (approval draw 1, `raw i100 → afterObligation i50`).** The obligation gate's
**model route-back** repair, fixing a missing crosscut obligation, REGRESSED a passing integration seam — the
worst-of-K min-lowering problem (a repair that helps one bucket breaks another; the same effect the head-to-head
saw where a membership repair lowered the min). The contract/integration gates already avoid this with
deterministic *guard-preserving* surgical repairs; the obligation gate's missing-obligation repair is
necessarily a model route-back (it must ADD code), so it needs an **oracle-blind no-regress guard**: after a
repair, re-run the stack's own checks (obligation verify + seam/shape structural checks + smoke-execute) and
**keep the repair only if it introduces no new check failure**, else revert. Open design fork: per-gate guard vs
a stack-level repair-acceptance wrapper.

## Best-of-N repair + no-regress guard (2026-06-20 — built, smoke-GREEN)

The repair-regression hazard is addressed by a single mechanism — **best-of-N with the original code as the
no-regress floor** (`src/best-of-n-repair.mjs`, `gates/best-of-n-repair-smoke.mjs` 12/12; obligation smoke now
39/39). `selectBestRepair` draws N route-backs over the same cheap `fusion` pool and keeps the one that
**strictly out-scores** the current code on an oracle-blind quality score; if no draw beats the original, the
original is kept (a *strictly-worse* repair is never shipped — that IS the no-regress guard, and n=1 is the pure
guard). The obligation gate's score (`obligationRepairScore`, K3-safe — `verifySurface` + structural checks
only) rewards **preserving the declared seam store** (a repair that drops a `runConditions` store — the
integration-seam regression mode — loses points) and penalizes remaining obligation violations. So a "fix" that
adds the missing obligation but breaks the seam scores ≤ original → rejected (counted as a `revert`); best-of-N
then prefers a candidate that fixes the obligation AND preserves the seam. Wired into `coevo-rung1.mjs`
(`--bestofn N`; the per-draw telemetry shows `…/Nnr` reverts). Selection is over the **pool's own** outputs
(never a privileged model) → admissible under model-agnosticism. **Honest limit:** the seam-preservation signal
is a *store-reference* proxy, not a full cross-surface seam re-check — it catches a dropped store, not every
logic-level seam break.

**Live-VALIDATED (2026-06-20, `runs/coevo-obligation-bestofn.json` — composed stack + `--bestofn 3`, quota+
approval, worst-of-K=4, $0):** the guard works as designed — **approval draw 2 reverted** a repair (`1m 0r 1nr`:
a missing obligation found, best-of-N drawn, no candidate strictly beat the original → original kept), and there
were **zero integration regressions across all 8 draws** (the prior run's `i100→50` is gone by construction).
The lever still lands clean fixes where one exists (approval draw 3 `c86→100, i25→50`). Caveat: a different
(weaker, gemini-flash-lite-heavy) route zoo this run — non-stationary pool — so the valid read is within-run
paired + the mechanism behavior, NOT the absolute worst-of-K vs earlier runs. Remaining worst-of-K residuals are
cleanly NOT the obligation lever's: quota = shape-drift (`--shapegate`'s target, not in this run's flags),
approval = approve→execute semantics/seam (the (C)-boundary candidates).

## Next increment (spend-gated — a user spend call)

1. **Causality via dump-replay** (cheap, live route-back, ~$0): on the head-to-head's worst crosscut draws, does
   `--obligation` move the GRADE? (the discipline from [[coevo-grader-bug-and-baseline]]: validate causality by
   dump-replay BEFORE trusting a lever — code inspection over-counts FORM).
2. **Paired worst-of-K=8** on quota + approval (the two crosscut-killer topologies): `coevo-rung1.mjs
   --contractgate --obligation --k 8`, raw→contract→obligation→final, measuring the crosscut worst-of-K delta
   toward the eroding routed baseline (`ROUTED-BASELINE.md`).
3. **Then** wire the `obligationContract` genome node (COEVOLUTION-SPEC §4 encoding) + re-validate K6/K7/K8 and
   the inject (A) counterfactual via the credit module — only after (1)+(2) show the verify half is
   load-bearing. Freeze a candidate worth the once-only sequestered-TEST only after the hybrid worst-of-K
   approaches the baseline.
