# Gleaning #3 — frontier strategy registry SCAFFOLDING — BUILT + GREEN (2026-06-19)

> Batch-1 item #5-in-sequence from the disposition of [`EVO-GLEANINGS-PLAN.md`](EVO-GLEANINGS-PLAN.md)
> (codex×opus CONVERGED, `runs/deliberations/20260619T220547Z/DECISION-BRIEF.md`). #3 = ADOPT WITH CHANGES:
> *"registry scaffolding now (default `mu_best`, **bit-identical**); active strategy = clean-restart only.
> Frozen ablation set = EXACTLY `{mu_best, pareto_per_cell}` — exclude stochastic strategies (RNG confound).
> `pareto_per_cell` is parent SELECTION, NOT the frozen per-cell insertion VETO (selection ≠ survival →
> freeze-safe)."* Class C scaffolding, additive-now. Touches **no** frozen invariant.

## What was built (additive — 2 NEW files; NO edit to loop.mjs, no live wiring)
- **`src/strategy-registry.mjs`** — the named parent-SELECTION registry behind loop.mjs's existing
  `selectParents` hook (`loop.mjs:45`, untouched). Exports:
  - `STRATEGIES = { mu_best, pareto_per_cell }` — each a loop-shaped `selectParents(archive, pool, rng, mu) ->
    entries[{genome, sc}]`.
  - `FROZEN_ABLATION_SET = ['mu_best', 'pareto_per_cell']` (frozen) — with the documented rationale that
    stochastic strategies (`top_k` / `epsilon_greedy` / `softmax`) are **deliberately excluded** (they sample
    non-deterministically → would confound the policy effect with the RNG seed) and are **not admissible** to
    the ablation.
  - `getStrategy(name)` — admits **only** a name in the frozen set; an unknown / stochastic / extra name
    **throws**, so policy-shopping outside the frozen set is impossible by construction.
  - `mu_best` — **BYTE-FOR-BYTE behaviorally identical** to loop.mjs's internal default
    (`(_archive, pool, _rng, mu) => topMu(pool, mu)`); `topMu` is mirrored verbatim from `loop.mjs:27-32`. It
    **does not consume the rng** (the `_rng` parameter is ignored exactly as in loop.mjs), so the rng sequence
    is preserved and the search trajectory is unchanged.
  - `pareto_per_cell` — the per-cell-specialist parent **selection** (the analog of evo's `pareto_per_task`):
    censuses the archive's lethal cells (`scorecard.cells`, the mechanical channel the veto reads — never the
    mutator digest, never shown to a model), keeps the strongest passer of each lethal cell (crosscut/
    integration) as a **specialist** parent, draws μ distinct parents (specialists first, deterministically
    shuffled by the injected rng), then **pads from the rest of the archive then the candidate pool in μ-best
    order** when the archive is thin — exactly like `map-elites.makeCelledSelect`. It **never calls or alters
    `perCellVetoOk`**.
- **`gates/strategy-registry-smoke.mjs`** — the self-test, four layers each shown to fire (next section).

## What fired — gate result: **23/23 PASS, exit 0**
- **BIT — the bit-identical proof (the headline).** The synthetic K8 loop (`makeSyntheticEvaluator` +
  `makeSyntheticBaseline` + a flat `makeArchive`, the same construction the K8 gate uses) run twice with the
  **same seed**: once with `selectParents = STRATEGIES.mu_best`, once with `selectParents = null` (the frozen
  default). On **3/3 seeds {1,2,7}** the final archive **front**, the **rng end state**, and the **result
  (gen/evalCount/found)** are **identical**. → `mu_best` is the frozen default.
- **BIT-NEG — the equality test is discriminating (anti-vacuity).** The SAME comparison against
  `pareto_per_cell` as the active strategy **diverges** from the default on **5/5 seeds {1,2,3,7,11}** —
  proving the bit-identical assertion above is a real equality, not a vacuous always-true.
- **REG — registry shape + frozen ablation + policy-shop rejection.** `FROZEN_ABLATION_SET` and
  `Object.keys(STRATEGIES)` are EXACTLY `{mu_best, pareto_per_cell}`; `getStrategy` resolves each; the four
  stochastic/extra names `{top_k, epsilon_greedy, softmax, argmax}` are **rejected** (throw).
- **PPC — pareto_per_cell behaviour.** Returns μ **distinct** parents; is **deterministic** under a fixed rng
  (same seed → identical selection); **prefers a planted lethal-cell specialist** — the discriminating
  contrast: with a planted archive {A=generalist, C=decoy outranking B on raw reliability but owning no cell,
  B=the unique integration specialist}, **μ-best(μ=2) = [A, C] DROPS B**, while **pareto_per_cell(μ=2) = [A, B]
  KEEPS B** (the per-cell-specialist preservation the strategy exists for); pads μ-best from the pool on a thin
  archive (the empty-archive pad order equals `topMu(pool)` exactly → map-elites parity).
- **VETO — selection ≠ survival.** A spy that counts archive-`insert` calls during a selection call records
  **zero** (selection reads `archive.members`, never `.insert` → no survival decision happens); the real
  insertion veto **still rejects a planted lethal drop** after a selection call (the veto is un-mutated — it is
  a pure function over `LETHAL_BUCKETS`); the specialist census ranges over `LETHAL_BUCKETS` (crosscut/
  integration) only.

## Frozen apparatus re-validated
- **`node studies/meta-search/p0.mjs` → P0 GREEN 5/5** (G0 freeze-consistency, G1 per-cell metric, G2 oracle
  kill-rate, K8 rediscovery 29/30 + in-loop veto, §14 deterministic resume). The frozen P0/K8 trajectory is
  **bit-identical** to before this build (the BIT layer above proves the default path is byte-unchanged; the
  registry is not wired into any driver).
- **`node studies/meta-search/gates/aggregate-consistency.mjs` → 18/18** (prior Batch-1 #5 gate still passes;
  the lint enumerated 349 reduction-shaped sites including the two new files and classified all → the new
  selection logic is correctly recognised as a reduction over **candidates/cells**, never over **K runs**, so
  it is benign).

## The selection-vs-veto distinction (the load-bearing freeze argument)
`pareto_per_cell` is parent **SELECTION** — it decides which genomes BREED next generation. The frozen per-cell
non-inferiority **VETO** (`archive.perCellVetoOk`) decides which candidates SURVIVE into the archive. These are
different operations on different objects:
- Selection PREFERS a lethal-cell specialist as a parent; it can never admit a candidate the veto rejects,
  never re-decide an existing archive member, and never read or alter `perCellVetoOk`.
- So even the **non-default** strategy is freeze-safe by construction (it cannot change which candidates
  survive). The ONLY thing a non-default strategy changes is the **trajectory** (different parents → different
  children → a different front), which is why **activating** a non-default strategy is a clean-restart event
  (§11 R2-10), deferred to Batch 2 with its own pre-registration. Selection complements the veto: the veto
  keeps a specialist from being EVICTED on survival; `pareto_per_cell` keeps it from being IGNORED on
  selection.

## Freeze posture
- **Additive / bit-identical / scaffolding-only (Class C, default unchanged).** Two NEW files; no frozen
  invariant touched (`git diff -- src/config.mjs` empty; `studies/build-gap` + `epics` untouched; `loop.mjs`
  untouched — the hook already existed at `loop.mjs:45`). The default path is byte-for-byte the frozen P0/K8
  run (BIT layer proves it).
- **Active ablation deferred to Batch 2 (clean-restart).** Per the disposition's cross-cutting rule: at most
  one trajectory-perturbing change per clean-restart epoch (never co-batch active-strategy + epoch-bump +
  new-gene + POST-kill); label every trace `(eval_epoch, strategy)`; never read plateau evidence across mixed
  strategies. The Batch-2 agreement rule (pre-committed here so it can't be policy-shopped later): a finding
  requires **identical load-bearing-mutation identity AND identical scale-gate N-bucket across both strategies
  × both seeds**; any disagreement is reported as **strategy-sensitive, not a finding**.

## Honest limitations / scope
- This is SCAFFOLDING: `pareto_per_cell` is defined and self-tested but **not wired into any live driver**. Its
  ablation (the actual `mu_best` vs `pareto_per_cell` comparison run) is a Batch-2 P3 clean-restart, out of
  scope here.
- `mu_best`'s bit-identical guarantee depends on `topMu` staying mirrored to `loop.mjs`. If loop.mjs ever
  changes its internal default, the **BIT layer of the gate WILL break** — that is the intended tripwire (a
  silent drift between the registry default and loop.mjs's default would otherwise void the bit-identical
  claim).
- The VETO layer proves non-use of `perCellVetoOk` **structurally** (zero insert calls during selection +
  selection is a pure function over `LETHAL_BUCKETS`); ESM imports can't be monkeypatched in-process, so the
  proof is "selection performs no survival decision" rather than "a throwing veto is never reached" — but the
  two are equivalent here because selection never enters the insertion path at all.
