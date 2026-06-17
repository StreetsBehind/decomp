# Meta-search — adversarial review log

_Records the adversarial review of `DESIGN.md` **rev.1** (2026-06-16). Purpose: let a fresh session
**verify rev.2's fixes** instead of re-finding the problems, and **not re-raise the two downgraded
findings** as if new. The next review targets **rev.2** — see [`NEXT-REVIEW.md`](NEXT-REVIEW.md)._

**Method.** Round 1 = 5 independent red-team lenses (A fitness/reward-hacking · B search-dynamics ·
C methodology/falsifiability · D knowledge-capture design · E node-supply). Round 2 = a refute/adjudicate
pass + a completeness critic (gaps G/#). Load-bearing code findings were verified directly.

---

## Ground truth established (verified against the code — rely on these, don't re-derive)

- **Two parallel, UNCONNECTED scorers exist in the repo.** `eval/generative-coverage.mjs`
  (`costWeightedEdgeRecall` + `lethalRecall` veto, quadrant-weighted) is imported **only** by the
  `runner/battery.mjs` "hearth" lineage; it returns `undefined` on an untagged manifest (L101) and
  `lethalRecall` returns `1` when there are zero lethal edges (L120). The **epic battery** grades via
  `studies/build-gap/epic-run.mjs` → `lib/epic-sandbox.mjs` `evaluateEpic`, returning
  `{wire, happy, crosscut, integration}` (or `{harnessError|timeout|empty}`). **The epics carry no
  `quadrant` tags.** This is the G1 disconnect.
- **Bucket meanings** (`lib/scale-oracle.mjs`): `wire` (4D+1, modules link) · `happy` (3D+1, stated
  behaviour) · `crosscut` (5D+2, per-(surface×concern) tenancy/authz/mass-assignment; pass-fraction =
  uniformity) · `integration` (3D, membership seam + cross-org isolation).
- **Cost is metered** (`epic-run.mjs` sums per-call `g.usd`), but the cheap gateway returns `usd:0` and
  there is no escalation ledger.
- **Gateway route is recorded, not pinned** (`runner/model-client.mjs` ~L446) — `jnoccio/jnoccio-fusion`
  selects an upstream per call.

---

## Master findings table

Verdict legend: **CONF** confirmed · **OVER** overstated/narrowed · **DOWN** downgraded · **GAP** found by
completeness critic. "Addressed" = where rev.2 handles it.

| ID | Lens | Sev | Verdict | Addressed in rev.2 |
|---|---|---|---|---|
| **G1** | completeness #1 | **blocking** | CONF (verified) | §6 — fitness re-wired to the bucket scorer; quadrant↔bucket map |
| **G2** | completeness #2 | **blocking** | CONF | §6 oracle-validity gate + §7 K6 (oracle self-test + ≥2 hand-authored oracles) |
| A1 | fitness | high | CONF (L120) | §6 — bucket veto has no zero-edge degeneracy; zero-bucket epics excluded |
| A2 | fitness | high | OVER (metering exists) | §2.5 escalation ledger + §6 all-opus cost-domination CI guard |
| A3 | fitness | high | CONF | §2.3 quadrant-and-count-only digest + prompt-scan; §7 K3 |
| A4 | fitness | med | OVER (veto helps; timing is the gap) | §4.4 veto-at-insertion (RESOLVED) |
| A5 | fitness | med | CONF | §5 worst-of-K + frozen CORE + sequestered TEST |
| B1 | search | **crit** | CONF | §3 counterfactual single-node credit-attribution; else force onto skeleton |
| B2 | search | **crit** | CONF | §5 no cross-product + tiny P1 + surrogate-scorer; §7 K5 eval-count kill |
| B3 | search | high | CONF | §4.1 MAP-Elites niching + concrete descriptor |
| B4 | search | high | **DOWN** | §0 thesis-scope + human-reproducible winner; control arm **optional** (§13.3) |
| B5 | search | med-high | CONF | §5 frozen CORE; §3 typed-random ON from P1 |
| C1 | methodology | **crit** | CONF | §5 TRAIN/VAL/TEST, sequestered hash-gated TEST scored once; §7 freeze via separate grader |
| C2 | methodology | **crit** | CONF | §5 epic-population definition; ≥80 independent TEST; bootstrap CI |
| C3 | methodology | high | CONF | §5 ≥10 independent epics/N-bucket; mixed model `cost-gap ~ N + (1|epic)` |
| C4 | methodology | high | **DOWN** | §9 P1 reframe (RESOLVED): cheaper-author × checker arm; opus arm expected-fail |
| C5 | methodology | med-high | CONF | §7 parity non-inferiority test; frozen weights + TEST-hash; freeze line void-on-change; AMENDMENTS.md |
| #3 | completeness | high | CONF | §2.4 gateway route pinning/stratification; route-stable freeze |
| #4 | completeness | high | CONF | §7 freeze artifact (genome JSON + SHA + routes) run through a separate grader |
| #5 | completeness | med | CONF | §4.3 / §6 baseline co-measured per generation |
| #6 | completeness | med | CONF | §6 judge-variance budget; §8 mechanized curation triage (anti silent-cap) |
| D | capture | — | proposal | §10 (two OKF bundles + raw log + niching-gated knowledge-conditioning) |
| E | node-supply | — | analysis | §11 (ceiling non-binding till K1; engine + event-driven research arm; ADAS banned) |

**Every confirmed finding maps to a rev.2 section.** That mapping is the next review's *verify-adequacy*
checklist (not a re-find list).

---

## Two findings DOWNGRADED on cross-examination — do NOT re-raise as new

- **C4 "P1 dead on arrival" → softened.** DOA only with an *opus-only* author. The checker gene exists
  precisely to make a *sonnet* author (~$0.092) + checker clear the veto below the $0.27 bar → a cost-win is
  **live at N=5**. rev.2 reframes P1 around the cheaper-author × checker arm and pre-registers the opus arm
  as expected-to-fail-K1.
- **B4 "frontier-mutator confound" → nice-to-have, not a validity hole.** The thesis claims cheap *runtime
  coding*, not cheap *system design*; a frontier mutator is amortized one-time R&D, fine **provided the
  frozen winner is a static, human-reproducible config**. The cheap-mutator control arm is optional.

---

## Three cross-cutting reconciliations (now baked into rev.2)

1. **Validity (≥80 epics) vs compute (astronomical):** tiered battery — small frozen in-loop **CORE** +
   large sequestered **TEST** scored once + **surrogate-scorer** to cut in-loop cost (§5).
2. **Knowledge-conditioning vs collapse:** diversity is structurally prior — MAP-Elites first, condition
   only *within a niche*, gated to P2+ (§4 + §10).
3. **One battery/seed policy:** frozen CORE for all loop decisions · worst-of-K · TRAIN/VAL inside CORE ·
   sequestered TEST once; "rotation" demoted to the one-time TEST draw (§5).

---

## Status

rev.1 reviewed (this log). **rev.2 written and NOT yet reviewed.** Three §13 Tier-2 decisions RESOLVED
(2026-06-16; `AMENDMENTS.md`). Spec eligible for the pre-registration freeze **after** the next adversarial
review of rev.2.
