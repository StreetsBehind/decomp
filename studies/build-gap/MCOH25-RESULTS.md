# M-coh-2.5 — Skeleton provenance (the crux experiment)

_Run 2026-06-16, unsupervised. Apparatus: `gen-skeleton.mjs` (author a frozen skeleton under a chosen
tier from the brief + under-specified surface specs, never seeing the oracle) → `epic-run.mjs
--skeleton-file <skel>` (build all surfaces isolated on the **free gateway** + structural retry, score with
the multi-module oracle). K=5 builds per skeleton. Workspace epic, N=5 surfaces. Driver:
`runs/_mcoh25-provenance.sh`; cost join: `runs/_cost-join.mjs`; per-test attribution: `runs/_analyze.mjs`._

## The question this decides

PROPOSAL-HYBRID names M-coh-2.5 the **crux**. It decides two things:
1. **Is frontier orchestration necessary at all?** If a *cheap-authored* skeleton is just as reliable, you
   don't need frontier in the loop — the cheaper answer is all-local (a different system).
2. **What does the orchestration layer cost?** The skeleton-authoring call is the frontier premium in the
   hybrid cost formula; its price was never measured.

## Result 1 — the reliability fork is RESOLVED: frontier (opus-tier) authoring is necessary

Holding the build pipeline fixed at the proven `cheap-skeleton-retry`, varying only **who authored the
skeleton**:

| provenance | author | X-CUT | INTEG | EPIC✓ | reading |
|---|---|---|---|---|---|
| cheap-1 | deepseek-v4-pro (gateway) | 100% | **0%** | 0% | obligations yes, seam dead |
| cheap-2 | nemotron-nano-30b (gateway) | 100% | **13%** | 0% | obligations yes, seam dead |
| cheap-3 | poolside-laguna (gateway) | 94% | **73%** | 20% | best cheap draw; still unreliable |
| sonnet | claude-sonnet-4-6 | 100% | **0%** | 0% | **mid-frontier also fails the seam** |
| **opus** | **claude-opus-4-8** | **100%** | **80%** | **80%** | **restores the seam — matches hand** |
| hand | (hand-authored) | 97% | 100% | 80% | the reliability ceiling / anchor |

**The M-coh-2 double dissociation reappears along the *provenance* axis.** Every tier — cheap and frontier
alike — authors the **cross-cutting obligation clause** perfectly (X-CUT 100% almost everywhere; the
lethal-quadrant rules are easy to state). What separates authors is the **shared-shape / seam clause**:
the `addMember→postComment` membership contract. Per-test attribution (`_analyze.mjs`) shows the entire
INTEG collapse is the membership seam:

```
cheap-1 / sonnet :  SEAM+ 0%   SEAM- 0%    ISO 0%
opus             :  SEAM+ 80%  SEAM- 80%   ISO 80%
hand             :  SEAM+ 100% SEAM- 100%  ISO 100%
```

So the branch of the fork "a cheap-authored skeleton is just as reliable → drop frontier" is **falsified on
this epic.** The frontier premium is real and it is *precisely* the shared-shape clause — not obligations,
not the function code (M0: tier-independent), but the one architectural decision that two isolated builders
must agree on. **Notably sonnet is not enough** — the orchestration tier is opus-class, not "any cloud
model."

### Why the cheap/sonnet skeletons fail the seam (mechanism — verified)

The oracle is **representation-agnostic** (`tests.mjs` L13–16): it never seeds or reads the membership
collection directly; it only penalizes **drift** between two surfaces. The preamble deliberately omits any
membership store, so the architect must *invent* one. The outcomes trace to that invented shape:

- **opus** declared a **fresh** collection `ctx.db.memberships` (array, mirroring `comments`), defensive
  `??= []`, and a single **canonical membership predicate** both surfaces must use. Drift-proof → seam holds.
- **sonnet** reused the name `ctx.db.members` as a **Map** with `if (!ctx.db.members) … = new Map()`.
- **cheap** tiers split between under-specifying the shape and the same name/type pitfalls.

Cheap-3 (poolside) shows **authoring variance is real**: one cheap draw reached INTEG 73% with a passing
EPIC — the cheap pool *occasionally* pins the seam. Not reliable (20% EPIC), but the cheap-authoring path
is "unreliable," not "categorically impossible."

### Honest caveat — a seed/fairness confound on the *hand* row only

The hand skeleton names its collection `members` (an **array**), which coincides exactly with the oracle's
pre-seeded `db.members = []`. A model that reused the name `members` **as a Map** (sonnet did) has its
defensive init skipped (an empty array is truthy) and then `.set()` throws. This is partly an undisclosed-
seed trap. **It does not weaken Result 1**, because **opus passed using a *fresh* name** (`memberships`) —
its win is genuine drift-proofing, not seed-coincidence. A clean follow-up would disclose `members: []` in
the preamble (or seed a neutral name) to fully de-confound the hand/sonnet comparison.

## Result 2 — orchestration cost, measured (the missing term)

`gen-skeleton.mjs` now records the authoring call's `usd` + `outputTokens` (`skel-*.meta.json`);
`_cost-join.mjs` folds it into the per-epic total:

| author | orch $/epic | orch tok | orch $/surface (N=5) | coding $ | **hybrid $/epic** |
|---|---|---|---|---|---|
| gateway (cheap) | $0.000 | ~1.8–4.8k | $0.000 | $0 | **$0.000** |
| sonnet | $0.092 | 5.4k | $0.018 | $0 | **$0.092** |
| opus | $0.395 | 14.2k | $0.079 | $0 | **$0.395** |

Coding is $0 (free gateway = the Phase-1 upper bound; Phase-2 = fixed local hardware).

## Result 3 — the headline: at N=5 the hybrid does NOT beat all-frontier on cost

The only author that clears the reliability gate is **opus, at $0.395/epic of orchestration alone.** The
cost-optimized *and reliable* all-frontier bar is **opus-whole = $0.252–0.278/epic** (sonnet-whole is
cheaper but fails reliability at 29% X-CUT, so it is not an admissible bar).

> **hybrid $0.395 > all-frontier $0.27 — the hybrid loses on cost by ~45% at N=5.**

So the workspace existence proof is **reliability parity, NOT cost dominance.** This is the sharpest result
of the experiment and it tightens the thesis honestly.

## Result 4 — cost dominance is scale-gated, and not demonstrated *anywhere* yet

The orchestration term is ~flat (one authoring call, amortized over N coding chunks). Bare opus both
**erodes and gets pricier** as N grows; the skeleton-harness erodes **more gracefully on X-CUT** (the
lethal-quadrant metric) but the strict per-epic-perfect EPIC✓ bar collapses for *both* at scale:

| scale | N | bare-opus EPIC✓ | bare-opus X-CUT | bare-opus $/epic | harness EPIC✓ | harness X-CUT | harness coding $ |
|---|---|---|---|---|---|---|---|
| d1 | 5 | 100% | 100% | $0.278 | (=workspace 80%) | 97% | $0 |
| d2 | 9 | 67% | 94% | $0.361 | 60% | 97% | $0 |
| d3 | 13 | 33% | 78% | $0.387 | 20% | 93% | $0 |
| d4 | 17 | 0% | 80% | $0.431 | 0% | 95% | $0 |

At N=17 bare opus costs $0.431 > the ~$0.40 orchestration term **and** is fully broken (0% EPIC, 80% X-CUT),
while the harness holds X-CUT at 95%. That is the regime where a cost+reliability win *should* live — **but
the harness's own EPIC✓ is also 0% at d4.** The strict all-buckets-perfect win is therefore **not shown at
any N**: small N → bare opus wins outright (cheaper + reliable); large N → both collapse on EPIC✓, harness
only ahead on the X-CUT (lethal-quadrant) sub-metric.

## Verdict & what M-coh-2.5 changes

- **Frontier orchestration is necessary** (opus-class, not sonnet). The all-local branch is dead on this
  epic. ✅ crux question (1) answered.
- **Orchestration cost is now instrumented** (~$0.40/epic opus). ✅ crux question (2) answered.
- **The cost win is unproven and harder than the v1 framing implied.** At N=5 the hybrid loses; at N=17
  neither side holds the strict EPIC✓ bar. The cost-dominance half of the win condition now depends on two
  things that were on the roadmap anyway, now promoted to blocking:
  1. **The per-surface obligation/seam checker + repair lever** (M-coh-2's other half) — to stop the
     harness's EPIC✓ erosion at scale, where the cost gap opens.
  2. **An honest scale + amortization story** — opus-authored skeletons at N≥13, and/or skeleton reuse
     across epics, to amortize the $0.40 orchestration term below the all-frontier line.
- A defensible weaker claim already holds at scale: **hybrid dominates all-frontier on the lethal-quadrant
  (X-CUT) sub-metric at fixed-or-lower cost above N≈13** — but that is not the full EPIC✓ win condition.

## Artifacts
- skeletons: `runs/skel-{cheap-1,cheap-2,cheap-3,sonnet,opus}.md` (+ `.meta.json`)
- graded runs: `runs/mcoh25-{cheap-1,cheap-2,cheap-3,sonnet,opus}-k5.json`; hand anchor = `runs/mcoh2-full-k5.json`
- cost join: `runs/mcoh25-costjoin.json` via `runs/_cost-join.mjs`
- bar: `runs/mcoh-frontier-whole-k3.json` (opus-whole); scale ladder: `runs/mcoh-scale-d{1..4}-*.json`
