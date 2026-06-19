---
type: Synthesis
status: superseded
title: M5 experiment plan — GEPA-first on the cheapest lever
description: A concrete v0 for the program's adaptive-harness milestone — evolve the skeleton/obligation prompt text with GEPA against the hidden-oracle + lethal-recall two-term fitness.
resource: docs/PROPOSAL.md
tags: [synthesis, experiment-plan, M5, GEPA]
timestamp: 2026-06-16T00:00:00Z
---

A first measurable experiment for [M5](/synthesis/workflow-search-is-m5.md), tailored to the program's
constraints (API-only, eval cost matters, interpretable wins, distrust of single-scalar optimization).

# Why GEPA, why prompt-first
- [MASS](/methods/mass.md) (the field's own joint search) found **prompts dominate topology** and good
  topologies are rare — optimize prompts first.
- The [meta-agent critique](/surveys/inefficiencies-of-meta-agents.md) shows full-code/design search is
  rarely cost-justified (break-even >15,000 examples) — start cheap.
- [GEPA](/methods/gepa.md) is API-only deployable, MIT, sample-efficient (up to 35× fewer rollouts), and
  its **NL-feedback** signal is the natural counter to [reward hacking](/concepts/two-term-fitness-vs-reward-hacking.md).

# The gene
The **skeleton text** — specifically the obligations clause and the shape clause, which the
[double dissociation](/findings/skeleton-double-dissociation.md) proved must both be present. Start by
evolving the *obligation* prompt text (the lever that buys X-CUT), holding topology, chunking
(~1 surface/chunk), and the retry gate fixed.

# The fitness (two-term, non-gameable)
The metric returns `dspy.Prediction(score, feedback)` where:
- **score** = cost-weighted [`lethalEdgeRecall`](/findings/lethal-quadrant.md) on the hidden two-bucket
  oracle, with the lethal-recall **veto** (a candidate that regresses lethal recall cannot win on
  happy-path) — this is the [conformance term](/synthesis/two-term-fitness-existence-proof.md).
- **feedback** = the named failing obligations per surface (e.g. "`authz@add*Member` missing on domains
  2,3") so GEPA's reflection can target the actual hole, not a number.

# The eval harness
Reuse the battery: the workspace epic and the parametric `scale-d{1..4}` ladder, cheap tier via the
[jnoccio gateway](/findings/jnoccio-gateway.md), K-repeats for [stochasticity](/concepts/eval-cost-and-contamination.md).
The bar is opus-whole-bare; the contender is the GEPA-evolved cheap-skeleton-retry.

# Rollout budget (order-of-magnitude)
Hold the search to GEPA's `auto=light` budget first. The first run's purpose is **not** to beat the
hand-authored skeleton — it is to confirm the loop closes: that NL reflection over lethal-recall feedback
produces an obligation clause that scores ≥ the hand-authored one on the held-out `scale-d3/d4` rungs.
Budget the *search* cost explicitly (the critique's lesson), and log what the search tried.

# The first measurable result to target
> A GEPA-evolved obligation clause that **matches or beats the hand-authored skeleton's lethal-edge
> recall on the held-out larger rungs (N≈13–17)** at the same $0 cheap-tier inference cost — with the
> evolved clause being **human-readable and explainable** (the program's "auto-discovered,
> human-explained" requirement).

If it clears that, the next rung is module/topology search ([AgentSquare](/methods/agentsquare.md)-style),
guarded by the same two-term fitness. If it doesn't, the negative is itself informative: the skeleton may
already be at the prompt-space ceiling, pointing to the checker lever or provenance instead.

# Citations
[1] docs/PROPOSAL.md M5 (this repo)
[2] GEPA — [/methods/gepa.md](/methods/gepa.md); MASS — [/methods/mass.md](/methods/mass.md)
