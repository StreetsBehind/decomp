# hearth — fixture staging & handoff

`hearth` is the **multi-feature thin fixture** the archetype premise experiment needs: single-feature
fixtures (sso-greenfield) structurally cannot exhibit the inter-feature **seams** the premise targets.
It is staged here (NOT in `fixtures/`) until its manifest is second-authored and the bundle is
hash-pinned — per the contamination control in
[`../../../docs/ARCHETYPE-PREMISE-EXPERIMENT.md`](../../../docs/ARCHETYPE-PREMISE-EXPERIMENT.md) §4–§5.

## Bundle status

| File | Status | Notes |
|---|---|---|
| `plan.md` | ✅ | thin prose plan, 8 features (6 archetyped + 2 novelty: feed/notifications, billing) |
| `plan.lock.json` | ✅ **scaffolded** | thin lock — `app`/`summary`/`stack`/8 `outcomes`/`notes`, **no `features` map** (thin contract). Outcome ids are the ground-truth key the manifest must reuse. |
| `planted-gaps.json` | ✅ **scaffolded** | clean control (`control:true`, `gaps:[]`). A planted-defect variant (`hearth-variant`) is separate, later corpus work. |
| `outcome-manifest.json` | ✅ **AUTHORED + VERIFIED + PROMOTED** (2026-06-02) | written by a **blind subagent** given only `plan.md` (never the archetypes) — the design's "simulate separation by authoring from a different basis." 65 requirements, 162 edges (**83 intra / 79 seam** across 8 features), schema-valid, partition tags self-consistent. An **adversarial verifier** (saw manifest + archetypes + plan) returned **RELABEL: INDEPENDENT** / **FIDELITY: SOUND** / **TRUST-AS-ORACLE** — the 79 seams are genuine inter-feature dependencies (two features, billing + notifications, have *no* archetype yet are fully seamed; intrinsic surfaces independently named). The contaminated first-author draft (`outcome-manifest.partitioned.json`) is retained only as provenance — NOT used. |

✅ **hearth is now a registered fixture** (`fixtures/hearth/` — plan.md, plan.lock.json,
outcome-manifest.json, planted-gaps.json). `npm run battery:mock` scores it and the partition scorer
fires end-to-end (per-arm `edgeByPartition` = intra-feature vs **seam** recall — the anchoring
instrument, live for the first time).

## The second author's task (the contamination control)

Author `outcome-manifest.json` **blind to the archetype internals** (`../archetypes.json`) — from
`plan.md` + domain knowledge only — and by a *different* author/process than the archetypes. Conform to
[`schemas/outcome-manifest.schema.json`](../../../schemas/outcome-manifest.schema.json) (now extended to
allow the partition tags). Concretely:

1. **Reuse the lock's 8 outcome ids verbatim** (`O-sso-signin`, `O-invite`, `O-roles`, `O-tasks`,
   `O-files`, `O-audit`, `O-notify`, `O-billing`) — add `satisfiedByAnyOf` planKeys to each.
2. Enumerate the full latent set: `requirements` (each with `planKey` + the optional `feature` it
   belongs to), `surfaces`, required/excluded `concerns`, `mustHaves`.
3. The **load-bearing part — the `requiredEdges` partition.** Tag every edge:
   - `intra-feature` — both endpoints inside one feature (library-coverable, the easy edges)
   - `seam` — endpoints in **different** features (the hard, commonly-missed, anchoring-sensitive edges)
   - `ordering-only` / `policy-only` — not resource-mediated (won't fall out of the join)
   The **seam set must be exactly what the per-feature archetypes CANNOT reach** — so the oracle is
   provably not a superset of the prime. Be exhaustive about seams (auth→everything, RBAC enforced
   across every resource, audit spanning features, billing↔membership, notifications fanning out).
4. Have an **opus adversarial check** confirm the manifest is **not a relabeling** of the archetypes.
5. Map the draft's shape to the schema: the draft uses top-level `statedOutcomes`/`features`/
   `partitionCounts`/`_schemaNote` which the schema (top-level `additionalProperties:false`) forbids —
   fold `statedOutcomes`→`outcomes`, drop the rest; keep `requirements[].feature` +
   `requiredEdges[].partition` (both now allowed).

## Promote-to-fixture checklist

- [x] `outcome-manifest.json` validates against `schemas/outcome-manifest.schema.json`; every
      `requiredEdges[].partition` set; seam set non-trivial (79). ✅
- [x] Bundle copied to `fixtures/hearth/` (4 files). Fixture hash = `sha256(plan.lock.json)`. ✅
- [x] `npm run battery:mock` shows `hearth` registered + scored; `edgeByPartition` (intra vs seam) on
      its scorecards + aggregate. ✅
- [ ] **Arm spec `experiments/arm-blocks/hearth.json`** — classify the 6 archetyped features →
      `[oidc-sso-login, team-membership-invites, rbac-authorization, crud-resource, file-upload,
      audit-logging]`. **Placebo nuance:** hearth uses ALL 6 archetypes in the primed arm, so the
      mismatched-archetype placebo (used for sso-greenfield) is unavailable — every archetype matches a
      hearth feature. Fall back to a length-matched generic placebo, and lean on **seam recall** as the
      clean control (the prime structurally cannot lift seams — the verifier's hardening note). [GATED:
      experiment-design choice; precedes the live sweep.]
- [x] **Headroom pre-flight** ✅ **GO** (2026-06-02, `tools/preflight-hearth-seams.mjs`, ~$12.93) — blind A0
      × K=2, seam edges only: **seam recall 22.2% suff / 25.9% presence ± 0.9%** — materially >0 and ≪100%,
      so anchoring is measurable. See `docs/STAIRCASE-RESULTS.md`. **Constraint learned:** a sonnet decompose
      of hearth runs past even a 10-min CLI ceiling, so the **live decomposer runs on haiku** (a conservative
      floor for the sonnet primary); raise the per-call timeout / chunk if running sonnet.
- [ ] The two priced runs: live Step-2 A/B + the K≥3 three-arm Step-3 sweep. **[LIVE — spends; haiku method.]**

`hearth` is now a blessed fixture; the remaining unchecked items are the experiment-design choice + the
billable live runs.
