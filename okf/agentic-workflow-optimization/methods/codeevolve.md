---
type: Method
title: CodeEvolve — open-source evolutionary coding agent
description: Couples an LLM ensemble with island-based evolutionary search (CVT-MAP-Elites) for algorithmic discovery, positioned as an open AlphaEvolve alternative.
resource: https://arxiv.org/abs/2510.14150
tags: [full-code, MAP-Elites, islands, open-source, low-cost]
timestamp: 2026-06-16T00:00:00Z
---

- **Authors / venue:** Henrique Assumpção, Diego Ferreira, Leandro Campos, Fabricio Murai. arXiv Oct 2025
  (`2510.14150`).

# Optimizes
**Full program/code** — end-to-end algorithmic solutions. See
[optimization targets](/concepts/optimization-targets.md), target #4.

# Search strategy
Island-based evolution with a **CVT-MAP-Elites** archive, inspiration-based crossover, and meta-prompting
operators. An open-weight Qwen3-Coder-30B backbone in an ensemble. See
[quality-diversity and Pareto](/concepts/quality-diversity-and-pareto.md).

# Feedback signal
**Scalar fitness from a user-supplied executable function** over benchmark test cases; novelty via the
MAP-Elites archive.

# Results
Matches/surpasses AlphaEvolve on **5/9** problems; beats OpenEvolve and ShinkaEvolve on **6/9** under
matched conditions; surpasses reported AlphaEvolve on both CirclePackingSquare instances at **~10× lower
cost**. Notably, ablations show "**the interaction between components, rather than any single operator,
drives these results**" — no single lever dominates.

# Maturity & deployability
Research framework with released code/data; needs LLM API or weights. License unverified.

# Relevance to this program
Reinforces the [completeness](/concepts/completeness-and-capture-recapture.md) and
[two-term fitness](/concepts/two-term-fitness-vs-reward-hacking.md) lessons: results come from *component
interaction* (echoing the program's [skeleton double dissociation](/findings/skeleton-double-dissociation.md)
that shape and obligations are both necessary), and the whole thing rides on a strong executable oracle.

# Citations
[1] https://arxiv.org/abs/2510.14150
