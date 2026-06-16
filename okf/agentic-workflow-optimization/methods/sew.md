---
type: Method
title: SEW — Self-Evolving Agentic Workflows for code generation
description: Automatically generates and optimizes multi-agent LLM workflows for code generation, and studies how to represent/encode a workflow as text.
resource: https://arxiv.org/abs/2505.18646
tags: [topology, code-generation, self-evolution, representation]
timestamp: 2026-06-16T00:00:00Z
---

- **Authors / venue:** Siwei Liu, Jinyuan Fang, Han Zhou, Yingxu Wang, Zaiqiao Meng. arXiv May 2025
  (`2505.18646`).

# Optimizes
**Workflow topology / graph and prompts** for code generation; also studies *workflow representation
schemes* — how best to encode workflow information as text. See
[optimization targets](/concepts/optimization-targets.md).

# Search strategy
A "self-evolution" mechanism (specific algorithm not stated in the abstract — likely
evolutionary/reflective; **unverified**).

# Feedback signal
Code-gen benchmark performance (scalar, implied from pass-rate on executed tests); exact fitness
formulation not detailed in accessible content (**unverified**).

# Results
"Up to **12% improvement** on LiveCodeBench compared to using the backbone LLM only."

# Maturity & deployability
Research-stage; no released library noted; API-model compatibility unstated; license unverified.

# Relevance to this program
The most direct field analogue to the program's own subject — *evolving the workflow for building
software.* Two transferable points: (1) it uses the **contamination-aware LiveCodeBench**, the right
instinct for trustworthy evaluation (see [eval cost & contamination](/concepts/eval-cost-and-contamination.md));
(2) its "workflow representation" question maps onto the program's *frozen skeleton* — the skeleton is
exactly a workflow-encoding choice, and the program's
[double dissociation](/findings/skeleton-double-dissociation.md) is a sharper result on what that
encoding must carry.

# Citations
[1] https://arxiv.org/abs/2505.18646
