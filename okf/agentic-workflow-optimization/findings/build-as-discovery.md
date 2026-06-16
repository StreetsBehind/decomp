---
type: Finding
title: Build-as-discovery — the compiler/test is an edge-discovery engine
description: You do not need to enumerate every edge before building; the build process recovers most dependencies for free, so upfront discovery should target only the lethal quadrant.
resource: docs/BUILD-TOLERANT-REFRAME.md
tags: [finding, build-tolerant, decomposition, repo]
timestamp: 2026-06-16T00:00:00Z
---

# The claim
> The build process is itself a discovery engine. A compiler, a linker, a failing test catch most
> missing dependencies for free, exactly when they bind.

So decomposition is **not** "enumerate every edge upfront." It is: (1) decompose to the right
*granularity* for a cheap builder, and (2) spend scarce upfront discovery only on the
[lethal quadrant](/findings/lethal-quadrant.md) — omissions that ship clean and detonate later.

# The operating definition
> **decomposition = deterministic scaffold + generative fill + deterministic verification.**
> Determinism doesn't vanish; it relocates to the harness and the checkers.

# Two independent forks converged here
A pre-registered v2 program (granularity × deferral × build-economics) and the archetype/obligations line
were run blind to each other and **both landed on build-as-discovery.** The keystone that unified them:
the repair-premium ρ is **quadrant-censored** — self-revealing edges have ρ≈0 (build catches them),
silent-expensive edges have ρ≈∞, so any median-ρ deferral rule averages over the quadrant where deferral
is fatal.

# Relevance to the field
This is the program's answer to "what should a workflow search even optimize for the Decompose stage?"
Not edge-coverage (the build handles most edges), but **lethal-edge recall per dollar** — which reframes
the [fitness function](/concepts/two-term-fitness-vs-reward-hacking.md) every method in
[methods](/methods/index.md) would need if pointed at decomposition.

# Citations
[1] docs/BUILD-TOLERANT-REFRAME.md (this repo)
[2] docs/RECONCILIATION.md (this repo)
[3] docs/REPORT-2026-06-16.md §2.2, §6 (this repo)
