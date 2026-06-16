---
type: Reference
title: AlphaEvolve — DeepMind's evolutionary coding agent
description: The Gemini-powered evolutionary coding agent that pairs an LLM with automated evaluators to discover algorithms; the origin of the open-source evolvers.
resource: https://en.wikipedia.org/wiki/AlphaEvolve
tags: [full-code, origin, deepmind, closed-source]
timestamp: 2026-06-16T00:00:00Z
---

The proprietary origin of the code-evolution line. Included as a reference because
[OpenEvolve](/methods/openevolve.md) and [CodeEvolve](/methods/codeevolve.md) are explicitly its
open-source reimplementations.

- **Origin:** Google DeepMind white paper, **May 2025**, "a coding agent for scientific and algorithmic
  discovery." Not peer-reviewed; **not open source** (early-access only).

# Optimizes
**Full program/code**, evolved with Gemini.

# Search strategy
Evolutionary search over programs, paired with **automated evaluators that verify, run, and score** each
candidate — i.e. it requires a machine-graded fitness over executable code.

# Results (as reported by DeepMind)
Recovered **0.7%** of Google's worldwide compute; **23%** Gemini kernel speedup; up to **32.5%**
FlashAttention speedup; a 4×4 complex matrix multiply in **48** scalar multiplications; a new
kissing-number lower bound (593 spheres in 11 dimensions).

# Relevance to this program
AlphaEvolve is the proof-of-concept that evolutionary code search produces real, novel artifacts — *when
the evaluator is airtight.* Its dependence on "automated evaluators that verify/run/score" is the same
precondition this program satisfies with its hidden executable oracle. Being closed-source, it is a
reference point, not a usable tool; the open reimplementations are.

# Citations
[1] https://en.wikipedia.org/wiki/AlphaEvolve
[2] OpenEvolve — [/methods/openevolve.md](/methods/openevolve.md)
[3] CodeEvolve — [/methods/codeevolve.md](/methods/codeevolve.md)
