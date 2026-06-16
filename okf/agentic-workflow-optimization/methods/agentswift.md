---
type: Method
title: AgentSwift — Value-guided Hierarchical Search
description: Jointly searches workflow plus functional modules with a hierarchical MCTS guided by a trained value model that replaces expensive real evaluations.
resource: https://arxiv.org/abs/2506.06017
tags: [topology, modular, value-model, MCTS, eval-cost]
timestamp: 2026-06-16T00:00:00Z
---

- **Authors / venue:** Yu Li, Lehui Li, et al. (incl. Fengli Xu, Yong Li — Tsinghua lineage shared with
  AgentSquare). arXiv Jun 2025; **AAAI-2026** (per metadata, unverified).

# Optimizes
**Workflow topology AND modular modules jointly** (memory, planning, tool use) in one hierarchical design
space. See [optimization targets](/concepts/optimization-targets.md).

# Search strategy
Hierarchical **MCTS** with three expansion stages — Recombination (swap a subsystem), Mutation (novel
subsystem implementations), Refinement (tune prompts/temperatures/control-flow) — and uncertainty-aware
soft selection.

# Feedback signal
A **learned value model** (primary) plus sparing real evals — a 7B LM + adapters fine-tuned with MSE to
predict performance from (design, task), with uncertainty `u = |s_real − ŝ|`. See
[feedback signals](/concepts/feedback-signals.md).

# Results
"Average performance gain of **8.34%**" over both automated agent-search methods and manual designs,
across seven benchmarks (ALFWorld, ScienceWorld, MATH, WebShop, M3ToolEval, TravelPlanner, PDDL).
Frames a single real agent evaluation at **~$60**; claims near-oracle performance from ~30 labeled
examples on unseen tasks.

# Maturity & deployability
Research framework, public code (`Ericccc02/AgentSwift`). The agent layer is API-model compatible, but it
**requires training a 7B value model** (labeled data + compute). Repo license unverified.

# Relevance to this program
The most explicit attack on [eval cost](/concepts/eval-cost-and-contamination.md) in the field — the
value-model surrogate is the technique to borrow if M5's calibration budget becomes the bottleneck.
Caveat: it targets *static* design (no runtime adaptation), and the value model is one more surface that
can be [reward-hacked](/concepts/two-term-fitness-vs-reward-hacking.md) if its training labels are
censored.

# Citations
[1] https://arxiv.org/abs/2506.06017
[2] https://github.com/Ericccc02/AgentSwift
