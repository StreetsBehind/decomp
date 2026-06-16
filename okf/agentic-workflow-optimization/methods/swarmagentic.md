---
type: Method
title: SwarmAgentic — Fully Automated Agentic System Generation via Swarm Intelligence
description: A language-reformulated Particle Swarm Optimization that builds full agentic systems from scratch — agent roles and collaboration structure together, no seed templates.
resource: https://arxiv.org/abs/2506.15672
tags: [full-system, swarm, PSO, from-scratch]
timestamp: 2026-06-16T00:00:00Z
---

- **Authors / venue:** Yao Zhang, Chenyang Lin, et al. (LMU Munich / TU Munich / MCML). arXiv Jun 2025;
  **EMNLP 2025** (`2025.emnlp-main.93`).

# Optimizes
**A full multi-agent system from scratch** — the agent set *and* the collaboration topology, both as
structured-language objects (not code, not fixed modules). See
[optimization targets](/concepts/optimization-targets.md).

# Search strategy
**Particle Swarm Optimization, reformulated symbolically.** A population of "particles" (each a complete
agentic system); LLM-driven velocity/position updates replace numeric vectors. Distinctive
"Failure-Aware Velocity Update" mixes failure-driven adjustment + personal-best + global-best guidance.

# Feedback signal
NL critique + scalar — an LLM "flaw identification" step produces a structured error set that steers the
velocity updates against a fitness function `J(S)`.

# Results
"**+261.8% relative improvement over ADAS** on TravelPlanner"; best across all six tasks (TravelPlanner,
Trip/Meeting/Calendar Planning, Creative Writing, MGSM). **Caveat worth flagging:** the +261.8% is a
relative gain off a near-floor ADAS base (absolute 8.9→32.2 on GPT-4o), so it is **not** comparable to
the 8–17% *averages* other methods report.

# Maturity & deployability
Research framework, public code (`YaoZ720/SwarmAgenticCode`). Model-agnostic (tested on
GPT/Claude/DeepSeek/Gemini). License is contradictory between arXiv (CC0) and the repo (Apache-2.0) —
unresolved.

# Relevance to this program
The most ambitious "from scratch" search in the bundle — and therefore the least applicable near-term
for a program committed to [cheapest-first, interpretable](/synthesis/workflow-search-is-m5.md) moves. Its
failure-aware NL update is conceptually adjacent to GEPA's reflection.

# Citations
[1] https://arxiv.org/abs/2506.15672
[2] https://aclanthology.org/2025.emnlp-main.93/
