# The obligation-contract lever — the crosscut/obligation output-QA gene

> **Status: BUILT + smoke-GREEN + harness-wired. NOT yet live-validated (causality + worst-of-K are
> spend-gated — the next increment).** Additive, dev-only, oracle-blind; the frozen tree
> (`studies/build-gap/`) is untouched and P0 re-ran GREEN 5/5 with K8 bit-identical (29/30, worst evals
> 199/300). Apparatus: `src/obligation-contract.mjs`, `gates/obligation-contract-smoke.mjs` (33/33),
> `coevo-rung1.mjs --obligation`.

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
