---
type: Method
title: MASS — Multi-Agent System Search (prompts + topologies)
description: A staged search that jointly optimizes MAS prompts and interaction topology, finding that prompts matter more than topology and good topologies are rare.
resource: https://arxiv.org/abs/2502.02533
tags: [prompt, topology, staged-search, key-finding]
timestamp: 2026-06-16T00:00:00Z
---

The single most decision-relevant method for this program's sequencing.

- **Authors / venue:** Han Zhou, Xingchen Wan, Ruoxi Sun, Hamid Palangi, Shariq Iqbal, Ivan Vulić,
  Anna Korhonen, Sercan Ö. Arık (Google + Cambridge). arXiv Feb 2025; v2 Jan 2026; **ICLR 2026**.

# Optimizes
**Prompts AND topology**, jointly. See [optimization targets](/concepts/optimization-targets.md).

# Search strategy
Three interleaved stages, each conditioning on the prior: (1) block-level/local **prompt** optimization,
(2) **topology** optimization, (3) global/workflow-level **prompt** optimization.

# Feedback signal
Task performance (details not in the abstract).

# Results
MASS-designed systems "significantly outperform existing MAS approaches" (specific deltas not in the
fetched abstract — unverified). Two **design lessons** are the contribution:
1. **Prompts are the more influential design component** than topology.
2. **Influential topologies are a small fraction of the search space** — so prune to good topologies
   first, then spend the budget on prompts.

# Maturity & deployability
Peer-reviewed (ICLR 2026); a search procedure over a customizable MAS design space.

# Relevance to this program
This is the empirical justification for the program's [GEPA-first plan](/synthesis/m5-experiment-plan-gepa-first.md):
the field's own joint search concludes that **prompt optimization dominates topology search.** Combined
with the [cost-viability critique](/surveys/inefficiencies-of-meta-agents.md), it says: do not spend M5's
first budget on topology/code search — optimize the [prompt gene](/concepts/optimization-targets.md)
(the program's skeleton/obligation text) first.

# Citations
[1] https://arxiv.org/abs/2502.02533
