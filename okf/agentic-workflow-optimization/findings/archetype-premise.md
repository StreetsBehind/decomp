---
type: Finding
status: confirmed
title: The archetype premise — accumulated patterns smuggle edges without a curation gate
description: All six hand-authored archetypes were caught hardcoding assumptions that violate the no-edge-at-intake rule; archetypes are a floor-raiser, not a solver, and need a curation gate.
resource: docs/ARCHETYPE-PREMISE-EXPERIMENT.md
tags: [finding, archetype, curation, caution, repo]
timestamp: 2026-06-16T00:00:00Z
---

A caution that directly applies to any **accumulate-and-reuse** self-evolution loop.

# The experiment
A clean 3-arm design — **A0 blind / A1 placebo (token-matched generic advice) / A2 primed (archetype
injection)** — tested whether priming a decomposer with authored archetypes (reusable feature patterns)
lifts recall of surfaces+obligations *without anchoring*.

# The authoring finding
**All six authored archetypes smuggled edges and had to be repaired.** Each, run through contrast-pair
validation, was caught hardcoding a `from→to` edge (e.g. oidc-sso "persist Identity to a user record"
presupposes a sibling store) that violates the "no edge at intake" rule — demoted to a typed obligation.
A literal regex lint was too weak to catch the *semantic* smuggling.

# The verdict
**Partially validated — necessary-not-sufficient.** Archetypes are a **floor-raiser, not the solver** —
one coverage cue among several. The positive result only licenses "hand-tuned priming lifts covered
recall without anchoring on this fixture"; it can never promote an archetype to canon — that needs
recurrence across **≥2 provenance classes.**

# Relevance to the field
This is the empirical case against naive accumulation loops like
[AgentFactory](/methods/agentfactory.md) (banking executable subagents) and skill-evolution like
[Meta-Context-Engineering](/methods/meta-context-engineering.md): **accumulated artifacts smuggle wrong
assumptions and must pass a curation gate** (source-diversity-weighted recurrence), or the library
degrades. It also produced the **hearth fixture** (84-edge manifest, 37 seam edges) that the kill-tests
and lens-ensemble probe use as ground truth.

# Citations
[1] docs/ARCHETYPE-PREMISE-EXPERIMENT.md (this repo)
[2] docs/REPORT-2026-06-16.md §5 (this repo)
