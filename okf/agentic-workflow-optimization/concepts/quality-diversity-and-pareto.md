---
type: Concept
title: Quality-diversity, MAP-Elites, islands, and Pareto fronts
description: The population-management machinery that keeps an evolutionary search from collapsing to a single local optimum.
tags: [quality-diversity, MAP-Elites, islands, pareto, population]
timestamp: 2026-06-16T00:00:00Z
---

A search that only ever keeps the single best candidate collapses into a local optimum. The field
borrows several population-management techniques to avoid that.

# MAP-Elites (quality-diversity)

Maintain an *archive* of the best candidate in each cell of a behavioural-feature grid, not one global
best. You end up with a diverse set of high performers spanning different "shapes" of solution. Used by
[OpenEvolve](/methods/openevolve.md) and (with a CVT variant) [CodeEvolve](/methods/codeevolve.md), both
descendants of [AlphaEvolve](/methods/alphaevolve.md).

# Island models

Run several semi-isolated sub-populations ("islands") that evolve independently and occasionally migrate
individuals between them — preserves diversity and lets different islands explore different basins.
[OpenEvolve](/methods/openevolve.md) and [CodeEvolve](/methods/codeevolve.md) use islands.

# Niching

Penalize crowding so the population spreads across distinct niches rather than piling onto one peak.
[EvoFlow](/methods/evoflow.md) uses a niching evolutionary algorithm to evolve a *diverse population* of
heterogeneous workflows on the fly.

# Pareto front

For genuinely multi-objective problems (e.g. accuracy vs. cost, or accuracy vs. per-instance coverage),
keep all non-dominated candidates and sample across the frontier. [GEPA](/methods/gepa.md)'s
"Genetic-**Pareto**" name comes from this: it samples non-dominated prompts with probability
proportional to coverage, which the authors credit for robust generalization.

# Why it matters for this program

The [lens-ensemble probe](/findings/index.md) and the [skeleton](/findings/frozen-skeleton-plus-retry.md)
work are, in effect, hand-designed diversity: a lens-diverse ensemble is a fixed quality-diversity
population. If the program ever automates ensemble composition (M5), these are the mechanisms that would
keep the lenses from collapsing into correlated copies — the failure mode the
[completeness lens](/concepts/completeness-and-capture-recapture.md) warns about.

# Citations

[1] OpenEvolve — [/methods/openevolve.md](/methods/openevolve.md)
[2] GEPA — [/methods/gepa.md](/methods/gepa.md)
[3] EvoFlow — [/methods/evoflow.md](/methods/evoflow.md)
