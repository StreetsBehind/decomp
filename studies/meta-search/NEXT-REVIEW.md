# Next adversarial review — kickoff brief

> **✅ STATUS (2026-06-16): rev.2 has been reviewed; [`DESIGN.md`](DESIGN.md) is now rev.3.** The rev.2
> review record (15 canonical findings R2-1..R2-10 + R2C-1..R2C-5, the kills/downgrades, the reconciliations)
> is appended to [`REVIEW-LOG.md`](REVIEW-LOG.md) under "rev.2 review"; the spec changes are in
> [`AMENDMENTS.md`](AMENDMENTS.md). **The next step is NOT a full new review.** It is a **light re-check**
> that the three freeze-blocking edits read correctly — **(1)** the per-cell non-inferiority veto (§6 + the
> split mechanical/digest channels §2.3/§4.4), **(2)** the trimmed frozen set (§7 freeze line — credit-
> assignment dropped; diverse ≥80-epic population scoped out as P2/P3 authoring), **(3)** the concrete
> `[PIN AT FREEZE]` values (§7) — after which the research lead **pins the `[PIN AT FREEZE]` numbers**
> (δ, α, K5/K6/K7/K8, max-M, restore-margin) and **takes the pre-registration freeze → P0**. Only run a
> full lens-based review again if rev.3 is materially rewritten. The protocol below is retained as reusable
> scaffolding for that case (re-target it at rev.3).

> **For a FRESH session running a FULL review (only if rev.3 is materially rewritten).** Read this first,
> then the pointers below. rev.1 and rev.2 were already reviewed — the prior findings, their verdicts, and
> the verified apparatus facts are in [`REVIEW-LOG.md`](REVIEW-LOG.md). **Do not re-derive context,
> re-verify the apparatus from scratch, or re-raise settled/downgraded findings** (notably: the absolute-bar
> veto was KILLED in favor of per-cell non-inferiority; L1-2 digest-injectivity, L2-5 "not-a-mutation-test",
> L5-4 ceiling non-sequitur were downgraded — see the rev.2 review log).

## 0. How to start (context hygiene — this matters here)

This review is itself a long-running, fan-out task. Keep the orchestrator context lean: **delegate reading
to subagents that return distilled conclusions + `file:line` pointers, not file dumps.** Read order:

1. **This file** (what to review, the protocol).
2. [`REVIEW-LOG.md`](REVIEW-LOG.md) — the prior findings + **"Ground truth established"** (rely on it; only
   re-verify a code fact if a *new* finding hinges on it).
3. [`DESIGN.md`](DESIGN.md) — the spec under review (rev.2).
4. [`AMENDMENTS.md`](AMENDMENTS.md) — what is already resolved/frozen.
5. (framing, if needed) [`../../STATE.md`](../../STATE.md), [`../../docs/PROPOSAL-HYBRID.md`](../../docs/PROPOSAL-HYBRID.md).

## 1. Project context (one paragraph)

Research program testing a **hybrid thesis**: a cloud frontier model plans/orchestrates while cheap models
do *all* coding, aiming to beat all-frontier on **total cost at equal reliability** (win = BOTH reliability
parity AND cost dominance). Reliability = the **lethal quadrant** (silent + expensive-recovery obligations).
The spec under review is the **M5 meta-search instrument**, brought forward as an **instrument → fixed
product** discovery tool for the current crux (per-surface checker lever × scale). It searches over
"genomes" (typed agent graphs of builder nodes), evaluated by the existing epic harness, with a two-term
Pareto fitness. The winner is **frozen and re-tested** as a fixed architecture — the search is never itself
the product (the project rejects "optimal mix" framing).

## 2. What is NEW in rev.2 and has NOT been reviewed — focus here

rev.2 rewrote large parts in response to round 1–2. These changes are **unreviewed** and are the primary
target:

- **§6 — the bucket-metric re-wire (G1 fix).** Fitness moved from `generative-coverage.mjs` (which the epic
  battery never ran) to a veto + cost-weighting over `{wire, happy, crosscut, integration}`. **Attack:** is
  the quadrant↔bucket mapping sound? Does `min(crosscut, integration) ≥ baseline` actually preserve the
  lethal-quadrant guarantee, or does collapsing per-edge recall into bucket pass-fractions let a candidate
  pass while missing the *specific* lethal edge (partial-credit gaming)?
- **§3 — credit-attribution by counterfactual single-node reversion (B1 fix). Attack:** is it
  computationally sane (it is O(#nodes) extra evals per candidate — does it re-open the B2 compute problem)?
  Do node *interactions* defeat single-node reversion for genuinely emergent seam failures?
- **§4 — MAP-Elites niching descriptor (B3 fix). Attack:** is the descriptor `(genotype-Hamming, per-bucket
  recall signature, cost bucket)` well-posed, or degenerate (e.g. everything lands in one cell)? Does
  veto-at-insertion interact badly with niching?
- **§5 — the unified battery/seed/split policy. Attack:** are CORE (~8–12) and TEST (≥80) sizes adequate?
  **Can the epic generator (`gen-epic.mjs`) actually produce the claimed diversity** (domain / surface-count
  / obligation-class / seam-topology), or only size-variants of one template?
- **§10 — knowledge capture (NEW, never reviewed).** Two OKF bundles + niching-gated knowledge-conditioning.
- **§11 — node supply / research arm (NEW, never reviewed).** Ceiling argument; event-driven arm; ADAS ban.
- **§13 resolved decisions + §6 G2 oracle gate. Attack:** is hand-authoring ≥2 independent oracles a
  realistic cost, or a hidden research project that blocks everything?

## 3. Verify-the-fix, don't just confirm-presence

For each **CONF** finding in [`REVIEW-LOG.md`](REVIEW-LOG.md)'s master table, check the rev.2 fix is
**adequate**, not merely present. Seeded adequacy doubts:

- bucket veto is **coarser** than per-edge recall — does it still resist the reward-hacking the original
  quadrant scorer was built to catch?
- the **quadrant-and-count-only digest** (§2.3) — can a frontier mutator still *infer* the broken seam from
  bucket-level counts + which N failed?
- **complexity / buildability (run this as a dedicated lens).** rev.2 added a lot — niching,
  counterfactual attribution, route-pinning, a separately-implemented grader, an oracle self-test, two OKF
  bundles. Is P0/P1 actually *buildable* before the freeze, or has the spec out-run what one can implement?
  What can be **cut or staged** without losing validity (a YAGNI pass)?

## 4. Suggested round-1 lens set (independent subagents, blind to each other)

1. **Fix-adequacy verifier** — rev.2 fixes vs the REVIEW-LOG master table.
2. **New-machinery red-team** — niching / credit-attribution / route-pinning / separate-grader / oracle
   self-test.
3. **Bucket-metric soundness** — the G1 resolution (§6): does it keep the lethal-quadrant guarantee?
4. **Complexity / buildability / YAGNI** — is P0/P1 runnable; what to cut or stage.
5. **Capture + node-supply** — first review of §10 / §11.
6. **Fresh completeness critic** — what does rev.2 *newly* miss?

## 5. Protocol

- **Round 1:** the 6 lenses above, as parallel **isolated subagents**, each returning distilled findings
  only. (No need for the full Workflow engine unless the research lead opts in — hand-orchestrated Agent
  subagents are fine and keep context lean.)
- **Round 2:** a refute/adjudicate pass (kill/downgrade weak findings; reconcile conflicting fixes) + a
  completeness critic.
- **Synthesize → rev.3.** Fold confirmed fixes; flag any genuinely new Tier-2 reframes to the research lead
  (use a question, don't guess); update [`REVIEW-LOG.md`](REVIEW-LOG.md) (append the new round) and
  [`AMENDMENTS.md`](AMENDMENTS.md) (any spec change).

## 6. Finding return format (keep consistent with REVIEW-LOG)

`ID · lens · severity (high/med/low) · the flaw · why it bites THIS spec (cite §) · concrete fix.`
Cap each lens at ~5 strongest. Distilled conclusions only — no file dumps.

## 7. After a clean review

If rev.3 (or rev.2 unchanged) survives, the spec is **eligible for the pre-registration freeze** (see the
DESIGN.md freeze line): freeze the weights vector, the TEST-set hash, and the parity δ/α, then proceed to
**P0 (smoke + wiring validation)**.

## 8. Pointers

- Spec: `studies/meta-search/DESIGN.md`
- Prior review + ground truth: `studies/meta-search/REVIEW-LOG.md`
- Ledger: `studies/meta-search/AMENDMENTS.md`
- Harness it wraps: `studies/build-gap/epic-run.mjs`, `studies/build-gap/lib/epic-sandbox.mjs`,
  `studies/build-gap/lib/scale-oracle.mjs`, `studies/build-gap/gen-epic.mjs`
- Cheap supply: `runner/model-client.mjs` (`makeGatewayInvoke`)
- Method library (node/operator ideas): `okf/agentic-workflow-optimization/`
