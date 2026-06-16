---
type: Survey
title: A Comprehensive Survey of Self-Evolving AI Agents (EvoAgentX)
description: Survey reviewing self-evolving techniques across every agent component, organized by optimization scope; tied to the runnable EvoAgentX framework.
resource: https://arxiv.org/abs/2508.07407
tags: [survey, taxonomy, self-evolving, framework]
timestamp: 2026-06-16T00:00:00Z
---

- **Authors:** Jinyuan Fang, Yanwen Peng, Xi Zhang, Yingxu Wang, et al. arXiv **Aug 2025**
  (`2508.07407`). *(Distinct from the [TMLR what/when/how/where survey](/surveys/self-evolving-agents-survey-what-when-how-where.md);
  a "TMLR 2026" attribution to this paper specifically is unverified/likely a mix-up.)*

# One line
Reviews self-evolving techniques across every agent component, organized by **optimization scope**, and
is paired with the EvoAgentX framework repo (a runnable self-evolving-agent ecosystem).

# Taxonomy (optimization scope)
1. **Single-agent** — LLM-behaviour optimization (training: SFT/RL; test-time: feedback/search/reasoning);
   **prompt optimization** (edit-based / evolutionary / generative / text-gradient — the family GEPA
   belongs to); memory optimization; tool optimization; unified optimization.
2. **Multi-agent** — automatic multi-agent construction; MAS optimization.
3. **Domain-specific** — biomedicine, programming, scientific research, finance/legal.
4. **Evaluation.**

# Relevance to this program
Its prompt-optimization sub-taxonomy is the most directly useful: it situates
[GEPA](/methods/gepa.md) (evolutionary/generative prompt opt) among edit-based and text-gradient
alternatives, and confirms prompt optimization as the well-trodden, low-risk entry the program's
[M5 plan](/synthesis/m5-experiment-plan-gepa-first.md) chooses. The companion framework is a candidate
substrate if the program ever wants an off-the-shelf evolution loop.

# Citations
[1] https://arxiv.org/abs/2508.07407
[2] https://github.com/EvoAgentX/Awesome-Self-Evolving-Agents
