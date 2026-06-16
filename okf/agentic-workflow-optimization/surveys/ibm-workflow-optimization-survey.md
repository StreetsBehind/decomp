---
type: Survey
title: From Static Templates to Dynamic Runtime Graphs (IBM)
description: A survey framing LLM-agent workflows as agentic computation graphs and organizing the optimization literature by when/what/which-signal.
resource: https://arxiv.org/abs/2603.22386
tags: [survey, taxonomy, ACG, 2026, recent-verify]
timestamp: 2026-06-16T00:00:00Z
---

> **Recency flag:** arXiv:2603.22386 = **March 2026**, past a January-2026 cutoff. Surfaced/verified via
> live search; spot-check its citations before relying on them.

- **Authors:** Ling Yue, Kushal Raj Bhandari, Ching-Yun Ko, Dhaval Patel, Shuxin Lin, Nianjun Zhou,
  Jianxi Gao, Pin-Yu Chen, Shaowu Pan (IBM + collaborators). arXiv Mar 2026.

# One line
Frames LLM-agent workflows as **agentic computation graphs (ACGs)** and organizes the field by *when*
structure is fixed, *what* is optimized, and *what signal* guides it.

# Taxonomy (the three axes)
1. **When structure is determined** — *Static* (fixed before deployment) vs *Dynamic*
   (selected/generated/revised per run).
2. **What is optimized** — components & their relationships; information-flow patterns; specific workflow
   elements.
3. **Evaluation signal** — task metrics; verifier signals; user preferences; trace-derived feedback
   (maps onto this bundle's [feedback signals](/concepts/feedback-signals.md)).

The companion repo expands the *static* axis into {offline template search, node-level optimization in
fixed scaffolds, joint structure+config optimization, verifiability} and the *dynamic* axis into
{selection/pruning, construct-then-execute, in-execution editing}. ACGs "interleave LLM calls,
information retrieval, tool use, code execution, memory updates, and verification."

# Notable proposal
**Structure-aware evaluation** — judging workflows on graph-level properties, execution cost, robustness,
and structural variation, not just task accuracy. This is the field gesturing at the
[two-term fitness](/concepts/two-term-fitness-vs-reward-hacking.md) idea, though it remains unvalidated.

# Relevance to this program
The best single map of the landscape. Its static-vs-dynamic axis clarifies that this program currently
lives in the **static** quadrant (a fixed frozen skeleton), and that M5 would be a move toward
**joint structure+config optimization** — still static, not runtime-dynamic.

# Citations
[1] https://arxiv.org/abs/2603.22386
[2] https://github.com/IBM/awesome-agentic-workflow-optimization
