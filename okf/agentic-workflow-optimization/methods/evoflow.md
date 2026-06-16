---
type: Method
title: EvoFlow — Evolving Diverse Agentic Workflows On The Fly
description: A niching-evolutionary framework that searches a population of heterogeneous, complexity-adaptive workflows combining cheaper models, not a single monolithic one.
resource: https://arxiv.org/abs/2502.07373
tags: [topology, niching, heterogeneous, cost-aware, population]
timestamp: 2026-06-16T00:00:00Z
---

- **Authors / venue:** Guibin Zhang, Kaijie Chen, Guancheng Wan, Heng Chang, Hong Cheng, Kun Wang,
  Shuyue Hu, Lei Bai. arXiv Feb 2025 (`2502.07373`). *(Distinct from the EvoAgentX framework/survey.)*

# Optimizes
**Workflow topology + LLM heterogeneity** — which model is assigned to which node, at varying complexity.
See [optimization targets](/concepts/optimization-targets.md).

# Search strategy
**Niching evolutionary algorithm** — tag-based parent retrieval, crossover, mutation, and niching-based
selection to maintain a *diverse population* of workflows. See
[quality-diversity and Pareto](/concepts/quality-diversity-and-pareto.md).

# Feedback signal
Multi-objective — task performance + diversity (niching) + **inference cost** as an explicit objective.

# Results
Outperforms prior handcrafted and automated workflows by **1.23%–29.86%**; **matches/beats o1-preview at
12.4% of its inference cost** using weaker open-source models; produces a genuinely diverse population.

# Maturity & deployability
Research paper; deployment/library/license details not in the abstract (**unverified**). Designed around
heterogeneous/open-source models, so cheap-model use is the point.

# Relevance to this program
The closest field match to the program's **cheap-vs-frontier per-dollar** thesis: it explicitly evolves
*cheap-model* workflows to match a frontier model at a fraction of cost, and it manages
[diversity](/concepts/quality-diversity-and-pareto.md) the way the program's lens-ensemble would need to.
A direct template if M5 graduates from prompt search to population-of-workflows search.

# Citations
[1] https://arxiv.org/abs/2502.07373
