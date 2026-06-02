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
| `outcome-manifest.json` | ⏳ **NEEDS A SECOND AUTHOR** | the held-out step. A first-author *draft* exists (`outcome-manifest.partitioned.json`) but it was produced by the **same** workflow that authored the archetypes — so it is contaminated and must be independently re-authored (or adversarially verified as *not a relabel* of the archetypes) before it counts. |

The fixture **will not register** (`discoverFixtures` requires `plan.lock.json` + `outcome-manifest.json`
+ `planted-gaps.json`) until the manifest lands — that gate is intentional.

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

## Promote-to-fixture checklist (when the manifest is ready)

- [ ] `outcome-manifest.json` validates: `node -e "import('./runner/validate-schema.mjs')…"` against
      `schemas/outcome-manifest.schema.json`; every `requiredEdges[].partition` is set; the seam set is
      non-trivial.
- [ ] Copy the bundle to `fixtures/hearth/` (`plan.md`, `plan.lock.json`, `outcome-manifest.json`,
      `planted-gaps.json`). The fixture hash = `sha256(plan.lock.json)`.
- [ ] `npm run battery:mock` shows `hearth` registered and scored; partition recall (`edgeByPartition`)
      appears on its scorecards.
- [ ] Add the arm spec `experiments/arm-blocks/hearth.json`: classify the 6 archetyped features →
      `[oidc-sso-login, team-membership-invites, rbac-authorization, crud-resource, file-upload,
      audit-logging]`; author a **length-matched** placebo (the sso-greenfield placebo is a stub — §8).
- [ ] **Headroom pre-flight** (before any priced sweep): run A0 blind at K≥3 on hearth; confirm covered
      recall is materially <1 **and seam recall is materially >0 with variance** — else anchoring is
      unmeasurable and the fixture can't decide the premise (§8).
- [ ] Hash-pin everything; note the new baseline series in `ledger.md`.

Until then, `hearth` is a staged draft, not a blessed fixture.
