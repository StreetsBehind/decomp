---
type: Concept
title: Feedback signals that drive the search
description: The second axis — what signal a method uses to select/mutate candidates, from scalar reward to natural-language reflection to learned value models.
tags: [taxonomy, axis, feedback, signal]
timestamp: 2026-06-16T00:00:00Z
---

The second comparison axis is **what signal guides selection and mutation.** This matters more than the
search algorithm: a richer signal needs fewer rollouts and resists local optima.

# The signal families

- **Scalar reward** — a single number per candidate (accuracy, pass@1, F1). Simple, universal, and the
  most **gameable** (see [reward hacking](/concepts/two-term-fitness-vs-reward-hacking.md)). Used by
  most topology/code searchers: [AFlow](/methods/aflow.md), [ADAS](/methods/adas.md),
  [AutoMaAS](/methods/automaas.md).

- **Natural-language critique / reflection** — the system reflects on full execution traces (reasoning,
  tool outputs, compiler/test errors) *in language* and proposes targeted edits. The signal carries
  *why* a candidate failed, not just *how much*. This is the GEPA insight — and the reason it claims to
  beat RL with **up to 35× fewer rollouts**. *Examples:* [GEPA](/methods/gepa.md),
  [SwarmAgentic](/methods/swarmagentic.md) (failure-aware updates),
  [AgentSquare](/methods/agentsquare.md) (LLM evolutionary meta-prompt).

- **Pareto multi-objective** — keep a frontier of non-dominated candidates rather than a single best,
  and sample across it. Prevents collapse to one local optimum. *Examples:* [GEPA](/methods/gepa.md)
  ("Genetic-**Pareto**"), and cost-aware methods that trade performance vs. dollars
  ([AutoMaAS](/methods/automaas.md), [EvoFlow](/methods/evoflow.md)).

- **Novelty / quality-diversity** — reward being *different*, not just better, to keep the population
  diverse. See [quality-diversity and Pareto](/concepts/quality-diversity-and-pareto.md). *Examples:*
  [OpenEvolve](/methods/openevolve.md), [CodeEvolve](/methods/codeevolve.md),
  [EvoFlow](/methods/evoflow.md) (niching).

- **Learned value model** — train a cheap surrogate to predict a candidate's fitness and skip most real
  evaluations. Directly attacks [eval cost](/concepts/eval-cost-and-contamination.md). *Examples:*
  [AgentSwift](/methods/agentswift.md) (a fine-tuned 7B value model; claims ~oracle performance from ~30
  labeled examples), [AgentSquare](/methods/agentsquare.md) (an in-context surrogate at ~0.025% of full
  eval cost).

# The under-explored option: a conformance term

Almost no method blends the performance signal with a second term measuring *whether the candidate
succeeded for the intended reasons*. This repo argues that term is necessary, not optional — see
[two-term fitness vs reward hacking](/concepts/two-term-fitness-vs-reward-hacking.md) and the
[existence proof](/synthesis/two-term-fitness-existence-proof.md) from its own data.

# Citations

[1] GEPA — [/methods/gepa.md](/methods/gepa.md)
[2] AgentSwift — [/methods/agentswift.md](/methods/agentswift.md)
