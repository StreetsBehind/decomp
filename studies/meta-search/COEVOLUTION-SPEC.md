# Next program — A×B co-evolution, scale-laddered (the layer-2 program)

> **HANDOFF SPEC — pick this up cold in a new session.** This is the agreed next program after the
> head-to-head (2026-06-18). It supersedes the prior "freeze the P2c proposed winner → run the
> sequestered-TEST" plan: the head-to-head showed that winner is **topology-gated and not ready to freeze.**
> Read this top-to-bottom; the "Pick up here" box tells you the first action.

---

## ⏩ Pick up here (the first action)

Stand up a **new, UNFROZEN exploratory search** that co-evolves the orchestration layer (A) and the
output-QA layer (B) **simultaneously**, with **route-robust fitness** (worst-of-K across gateway routes),
on a **MAP-Elites archive celled by (seam-topology × scale)**. **Rung 1 = make all 4 seam topologies solid
at d1** (approval + quota already FAIL at d1 — that's the starting point, not a clean small-scale base),
credit-attribution logging which layer (A or B) each fix lands in. Then add d2, d3, … to the ladder and
repeat ("see what breaks, mutate again"). Re-use the existing engine; expand the genome + generalize the gate.

The freeze + once-only sequestered-TEST falsification comes at the **END**, on the champion this search
produces — NOT now.

---

## 1. Where we are (why this program exists)

- **The win is real but topology-gated** (`HEAD-TO-HEAD.md`, `runs/head-to-head-hybrid.json`). Hybrid
  (opus-skeleton + cheap-fusion coding + integration-gate) vs the routed all-frontier baseline, live,
  identical epics, same independent oracles:
  - **WIN** (parity at ⅓–½ cost): **state-ordering** (lifecycle d1–3) and **set-membership** (d1) → 100/100.
  - **LOSS**: **conservation** (quota d1–3, integ 25/63/75) and **separation-of-duties** (approval d1–3,
    integ 17–75, crosscut down to 71%).
- **The gap is mostly cheap-tier coding-quality, NOT an unhandled seam the current gate would catch.** The
  integration-gate is **membership-specific** (`surfaceRole` only knows addMember/post) and **no-ops** on the
  other 3 topologies (raw==final there). Three diagnosed failure modes:
  1. **MISSING valid draws** on obligation-dense seam surfaces (approval execute/ship/settle; some routes
     emit 3000+ token reasoning blobs that don't yield a module). Crosscut "erosion" is cascade from these.
  2. **Hallucinated obligation** (quota invents an unrequested `only-admin-may-withdraw` guard → conservation
     tests, run as non-admin, get refused). Crosscut is a perfect 100% — it over-applies the authz pattern.
  3. **Wrong cross-surface seam logic** (approval execute rejects a properly-approved request).
- **The model-agnostic principle is now binding** (memory: `model-agnostic-and-failure-attribution`). The
  system must work with **any interchangeable above-floor cheap model** the fusion gateway serves.
  **Route/model selection is NOT an admissible fix** — model variance is absorbed by the OUTPUT-QA layer.
  Corollary: even the head-to-head WINS are **provisional** until they hold **worst-of-K across routes**
  (a lucky-route 100% is not a model-agnostic 100%).
- **Failure-attribution lens** (the operating discipline): every failure is **(A)** planning/orchestration ·
  **(B)** output-QA · **(C)** neither = a thesis boundary (scope-shrink). Many are dual; co-evolution lets the
  search find the cheaper/more-general layer, and credit-attribution reads out which one it was.

## 2. The decision (the research lead's call, 2026-06-18)

Use the meta-search **evolution/mutation** machinery to improve **A and B simultaneously**: start small,
mutate until it works really well, then scale up, observe what breaks, mutate again — repeat. Agreed, with the
four conditions in §3. Factual refinement folded in: breakage is already present at the **smallest** rung
(approval/quota fail at d1), so rung 1 is "make d1 solid across all 4 topologies," and the climb hunts the
**new** erosion that appears only at larger N (e.g. the approval crosscut erosion that first showed at d2/d3).

## 3. The four load-bearing conditions (what keeps it a real result, not a gamed one)

1. **New, expanded, UNFROZEN search → freeze the winner at the END.** The current genome lacks the needed
   genes and the gate is membership-only *code*, so this requires expanding the genome + new gate code, which
   would **void the current FREEZE**. Do NOT touch the frozen run (it already concluded with the P2c proposed
   winner). Run this as exploratory/dev; the FREEZE + sequestered-TEST is the final gate on the champion.
2. **Fitness = worst-of-K ACROSS ROUTES (non-negotiable).** Single-draw fitness evolves configs that ride
   lucky routes — the exact thing the model-agnostic principle forbids. Worst-of-K-across-routes IS the
   model-agnosticism test baked into the objective. (Cost/time: K× gateway calls per eval — shapes the climb.)
3. **Preserve the non-gameable discipline through the expansion.** New genes/gates stay **oracle-blind**
   (K3 leak scan); the **per-cell non-inferiority veto runs over the CUMULATIVE ladder** (climbing to d3 must
   not silently re-break d1 — the curriculum-forgetting trap = literally the approval crosscut erosion);
   **re-validate the instrument** (K6 oracle kill-rate, K7 surrogate ρ, K8 planted-optimum rediscovery) after
   adding ANY grader or gene.
4. **Credit-attribution stays ON.** The search mutates both layers; counterfactual credit-attribution reports,
   per fix, whether the load-bearing lever was **(A)** or **(B)**. This is how "co-evolve both" stays
   compatible with "we make an attribution decision each time" — we get auto-discovery AND the diagnostic.

## 4. What to build (concrete)

**Re-use the engine** (do not rebuild): MAP-Elites archive (`src/map-elites.mjs`), mutation operators
(`src/operators.mjs`, `src/proposer.mjs`), credit-attribution (`src/credit.mjs`), surrogate/K7
(`src/surrogate.mjs`), per-cell veto + scorecard (`src/scorecard.mjs`, `src/config.mjs`), instrument gates
(`p0.mjs`, K6/K7/K8). The LIVE evaluator is `src/evaluator.mjs` (`makeEpicEvaluator`); the head-to-head harness
`head-to-head.mjs` already shows how to build+grade the diverse epics with two-stage instrumentation.

**Genome expansion (`src/genome.mjs` — currently frozen; this defines the NEW unfrozen genome):**
- **(A) contract-precision gene** — per-surface obligation *applicability* so cross-cutting rules aren't
  over-applied (kills the quota `only-admin-may-withdraw` hallucination). Prior art: the `/vision` +
  `/decompose` skills already do per-concern `deriveApplicability` over a frozen skeleton — mirror that.
- **(A) per-surface decomposition gene** — split an obligation-dense seam surface (executeRequest =
  approval-check + idempotency + audit + tenancy) into sub-steps. Distinct from the existing `decomposer`
  genes, which split epic→surface, not surface→sub-step.
- **(B) model-agnostic extraction/format-forcing gene** — turn any above-floor model's output (incl. verbose
  reasoning blobs) into a valid module, or fail cleanly into repair. Today `isValidSurface` is pass/fail only.
- **(B) generalized integration-gate** — `src/integration-gate.mjs` is membership-only (`isWriter`/`isReader`
  via `surfaceRole`; `NON_MEMBER` store classifier). Generalize the seam detection to: **SoD/approve→execute**
  (an approved request must execute & audit once; idempotency), **conservation** (counter accounting,
  no-overspend, exactly-once), **state-ordering** (already passes unaided — keep as control). Keep the
  deterministic surgical-repair + model route-back structure; keep oracle-blindness.
- `builder.model` stays **FIXED to `fusion`** (the thesis constraint — cheap coding). NO route-selection gene.

**Archive / fitness:**
- MAP-Elites cells keyed by **(topology ∈ {membership, approval, lifecycle, quota}) × (scale d1..dN)**, so the
  search keeps a champion per niche and the archive shows exactly which (topology, scale) cells still fail.
- Fitness = worst-of-K across routes on the lethal buckets (crosscut + integration), per-cell veto over the
  cumulative ladder.

## 5. The scale ladder (the loop)

1. **Rung 1 — d1, all 4 topologies.** Evolve A+B until the archive is solid (worst-of-K across routes) on
   every d1 cell. (membership/lifecycle already pass; the work is approval + quota.)
2. **Climb.** Add d2, then d3, … keeping earlier rungs in the cumulative eval set (per-cell veto guards
   re-breakage). Each new rung surfaces new erosion → mutate again.
3. **Stop** when the archive holds across the ladder at worst-of-K, OR a cell hits a **(C) boundary** (no A or
   B fix across routes works → record it, shrink scope — a valid kill-finding).

## 6. End game (the final gate — NOT now)

Freeze the champion genome (a NEW pre-registration: expanded genome, route-robust fitness, the generalized
graders), then score it **once** on the sequestered TEST (`runs/test-set-manifest.json`, hash
`74f10cbc…`, `TEST-SET.md`) via the **independent** graders (2nd oracle `src/oracle2.mjs` on membership;
`epics-src/{approval,lifecycle,quota}.mjs` graders on the others). Product framing unchanged: the search is the
instrument, the frozen config is the product (NOT "optimal mix").

## 7. Pointers

- **This session's records:** `HEAD-TO-HEAD.md` (the result + attribution lens), `ROUTED-BASELINE.md`
  (the baseline that challenged the proxy win), `ORACLE2.md`, `DIVERSE-TEMPLATES.md`, `TEST-SET.md`,
  `AMENDMENTS.md` (the TEST hash). Raw: `runs/head-to-head-hybrid.json` (gitignored).
- **Apparatus:** `head-to-head.mjs`, `src/evaluator.mjs`, `src/integration-gate.mjs`, `src/genome.mjs`,
  `src/{map-elites,credit,surrogate,operators,proposer,scorecard}.mjs`, `src/config.mjs` (frozen constants),
  `runner/model-client.mjs` (`makeGatewayInvoke` = the fusion gateway, `claudeInvoke` = frontier).
- **Frozen reference (do not edit):** `DESIGN.md` (rev.3), `FREEZE.md`, `studies/build-gap/` (pin `1580944…`).
- **Memory slugs:** `model-agnostic-and-failure-attribution`, `workflow-search-m5-fit`,
  `research-pivot-cheap-vs-frontier`, `jnoccio-gateway-access`. Operational SoT: `STATE.md`.

## 8. Open questions to resolve when picking up

1. **K for worst-of-K, and how routes are sampled** (the gateway adaptive-routes; do we force route diversity,
   or rely on natural variance across K draws?). Drives cost/time per evaluation.
2. **Where the (A) contract-precision fix lives** — a richer skeleton author (frontier, amortizable) vs a
   cheap-tier contract-lint (B). The search can explore both; pre-decide how each is genome-encoded.
3. **Generalized-gate scope** — one gate with per-topology detection, or a small gate-per-topology library
   selected by the skeleton's declared seam kind? (Keep oracle-blind either way.)
4. **Budget/stop rule for the climb** (reuse K5 eval cap discipline, scaled for worst-of-K cost).
5. **Pre-registration timing** — when does the expanded-genome search itself get frozen? (Likely after rung-1
   shakes out the gene set, mirroring how P1 was frozen only after the apparatus stabilized.)
