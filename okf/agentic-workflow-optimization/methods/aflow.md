---
type: Method
title: AFlow — Automating Agentic Workflow Generation
description: Reformulates workflow design as a search over code-represented workflows and optimizes them with Monte Carlo Tree Search.
resource: https://arxiv.org/abs/2410.10762
tags: [topology, MCTS, workflow, deployable]
timestamp: 2026-06-16T00:00:00Z
---

- **Authors / venue:** Jiayi Zhang, Jinyu Xiang, et al. (MetaGPT / FoundationAgents). arXiv Oct 2024;
  **ICLR 2025 (Oral)**.

# Optimizes
**Workflow topology / graph** — a code-represented workflow space where "LLM-invoking nodes are
connected by edges." See [optimization targets](/concepts/optimization-targets.md), target #3.

# Search strategy
**Monte Carlo Tree Search** over workflow code, refining via code edits and tree-structured experience.

# Feedback signal
Scalar reward from execution feedback (task metrics such as Pass@1 / F1) guiding the MCTS.

# Results
"5.7% average improvement over state-of-the-art baselines" across six benchmarks (HumanEval, MBPP, GSM8K,
MATH, HotpotQA, DROP); lets smaller models "outperform GPT-4o on specific tasks at **4.55% of its
inference cost**."

# Maturity & deployability
**Deployable, MIT-licensed** (`FoundationAgents/AFlow`, a MetaGPT example). API-model based. Repo warns
some operators may have migration bugs.

# Relevance to this program
AFlow is the canonical topology-search method and a useful template for *what the program would do at M5
if it searched topology* — but the [MASS](/methods/mass.md) finding (prompts dominate topology, good
topologies are rare) argues for optimizing prompts first. Its cost-efficiency framing (cheap models
beating GPT-4o per dollar) is directly aligned with the program's
[cheap-vs-frontier thesis](/findings/index.md).

# Citations
[1] https://arxiv.org/abs/2410.10762
[2] https://github.com/FoundationAgents/AFlow
