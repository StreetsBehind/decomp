---
type: Concept
title: The optimization-target axis
description: The primary axis dividing the field — what part of the workflow a method evolves (prompt text, topology, full code, or modules).
tags: [taxonomy, axis, target]
timestamp: 2026-06-16T00:00:00Z
---

The clearest axis for comparing methods is **what gene they optimize**. In rising order of search-space
size (and cost):

# The four targets

1. **Prompt / instruction text** — evolve the textual components only, weights and topology fixed.
   Cheapest, most interpretable, deployable on API-only models. *Examples:*
   [GEPA](/methods/gepa.md), and the prompt-stage of [MASS](/methods/mass.md). The
   [MASS](/methods/mass.md) finding is load-bearing: **prompts are the more influential design
   component, and good topologies are a small fraction of the space** — so optimize prompts first.

2. **Modular modules** — fix a small set of slots (e.g. planning / reasoning / tool-use / memory)
   and search recombinations + mutations of pluggable modules. *Examples:*
   [AgentSquare](/methods/agentsquare.md), [AgentSwift](/methods/agentswift.md) (jointly with topology).

3. **Workflow topology / graph** — search the graph of LLM-invoking nodes and their edges.
   *Examples:* [AFlow](/methods/aflow.md) (MCTS over code-represented workflows),
   [EvoFlow](/methods/evoflow.md) (a population of heterogeneous workflows),
   [AutoMaAS](/methods/automaas.md) (a query-conditioned distribution over architectures),
   [SEW](/methods/sew.md).

4. **Full agent code** — the meta-agent writes arbitrary code defining the candidate agent
   (Turing-complete space). Most expressive, most expensive, hardest to attribute.
   *Examples:* [ADAS](/methods/adas.md), [OpenEvolve](/methods/openevolve.md) /
   [AlphaEvolve](/methods/alphaevolve.md), [CodeEvolve](/methods/codeevolve.md),
   [AgentFactory](/methods/agentfactory.md) (accumulated executable subagents),
   [SwarmAgentic](/methods/swarmagentic.md) (full system from scratch).

# The practical ordering

Cheapest-first is the consensus-implied strategy: prompt → modules → topology → full code. This repo's
[PROPOSAL.md](/findings/index.md) independently reached the same "cheapest high-leverage lever first"
position, and the [synthesis](/synthesis/m5-experiment-plan-gepa-first.md) recommends starting any
search at target #1 (prompt) with [GEPA](/methods/gepa.md).

# Citations

[1] IBM survey, *From Static Templates to Dynamic Runtime Graphs* — [/surveys/ibm-workflow-optimization-survey.md](/surveys/ibm-workflow-optimization-survey.md)
[2] MASS — [/methods/mass.md](/methods/mass.md)
