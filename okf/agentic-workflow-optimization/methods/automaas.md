---
type: Method
title: AutoMaAS — Self-Evolving Multi-Agent Architecture Search
description: Cost-aware NAS-style search that learns a query-conditioned distribution over architectures and continuously generates, fuses, and eliminates operators.
resource: https://arxiv.org/abs/2510.02669
tags: [topology, NAS, cost-aware, operators]
timestamp: 2026-06-16T00:00:00Z
---

- **Authors / venue:** Bo Ma, Hang Li, ZeHua Hu, et al. arXiv Oct 2025 (cs.AI); no conference specified.
  Numbers below are model-reported (abstract/HTML only) — treat as lightly-verified.

# Optimizes
**Workflow topology via operators** — a query-conditioned distribution `P(G|q,θ)` over multi-agent
architectures, sampled per query, with a self-evolving operator pool. See
[optimization targets](/concepts/optimization-targets.md).

# Search strategy
NAS / supernet with online refinement: "dynamic operator lifecycle management" — Generation (an LLM
fuses co-occurring operators, corr > 0.6), Fusion (merge high performers), Elimination (drop low
health-score operators). Cost-aware with real-time parameter adjustment.

# Feedback signal
Scalar + Pareto/cost-aware — performance-cost analysis drives the lifecycle operations; decision-tracing
for interpretability. See [feedback signals](/concepts/feedback-signals.md).

# Results
"**1.0–7.1% performance improvement while reducing inference costs by 3–5%** compared to SOTA"; average
cost cut from 85% → 58% of a CoT baseline. Benchmarks: GSM8K, MATH, HumanEval, MBPP, MultiArith, GAIA.

# Maturity & deployability
Research prototype; arXiv listing CC BY 4.0; no public repo found (unverified). API-model compatibility
plausible but unverified.

# Relevance to this program
Notable for making **cost a first-class objective** in the search (aligned with the program's
per-dollar framing) and for *query-conditioned* architecture selection — a routing idea that resonates
with the program's [free-model gateway](/findings/jnoccio-gateway.md). The gains are incremental and the
fusion/elimination thresholds are heuristics.

# Citations
[1] https://arxiv.org/abs/2510.02669
