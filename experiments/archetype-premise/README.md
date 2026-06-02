# experiments/archetype-premise

Artifacts for the **archetype premise experiment** — validating whether priming a decomposer with
**authored** archetypes lifts surface/seam discovery without anchoring, *before* investing in mining
archetypes. Design + decision rule: [`../../docs/ARCHETYPE-PREMISE-EXPERIMENT.md`](../../docs/ARCHETYPE-PREMISE-EXPERIMENT.md).

These are **not fixtures** (not hash-pinned, not in `fixtures/`). They are experiment inputs that must be
frozen *before* any run. `hearth/` is a candidate thin fixture once its manifest is second-authored + pinned.

```
archetypes.json                       6 authored archetypes (expert-author, UNTRUSTED, provisional).
                                      Contrast-pair validated — all 6 REPAIRED (edge-smuggling caught).
                                      NEVER canon; floor-only probes.
hearth/                               the multi-feature thin fixture (staged — see hearth/HEARTH-STATUS.md):
  HEARTH-STATUS.md                      bundle status + second-author task + promote-to-fixture checklist
  plan.md                               thin 8-feature B2B-workspace plan (6 archetyped + 2 novelty bucket)
  plan.lock.json                        ✅ scaffolded — thin lock (8 outcomes, no features map)
  planted-gaps.json                     ✅ scaffolded — clean control
  outcome-manifest.partitioned.json     ⚠ FIRST-author DRAFT (84 edges: 47 intra + 37 seam) — contaminated
                                        (same workflow as the archetypes); NEEDS independent re-authoring
  outcome-manifest.json                 ⏳ MISSING — the held-out second-author step; until it lands hearth
                                        does NOT register as a fixture
```

> ⚠️ The apparatus (Steps 0–2 machinery, the three arms, C1 lint, partition scorer, open-question channel,
> stdin transport) is **built and self-tested** (`docs/STAIRCASE-RESULTS.md`, `ARCHETYPE-PREMISE-EXPERIMENT.md`
> §7). What remains before a live run is **content/methodology**, not code: a **second author** for hearth's
> manifest (blind; opus-checked as not-a-relabel), a **length-matched placebo**, the **headroom pre-flight**,
> then hash-pinning. See `hearth/HEARTH-STATUS.md`.
