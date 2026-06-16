---
type: Method
title: AgentSquare — Automatic LLM Agent Search in Modular Design Space
description: Abstracts agents into four standardized modules and searches recombinations/mutations, accelerated by an in-context performance surrogate.
resource: https://arxiv.org/abs/2410.06153
tags: [modular, recombination, surrogate, deployable]
timestamp: 2026-06-16T00:00:00Z
---

- **Authors / venue:** Yu Shang, Yu Li, Keyu Zhao, Likai Ma, Jiahe Liu, Fengli Xu, Yong Li (Tsinghua).
  arXiv Oct 2024 (commonly cited as ICLR 2025 — venue unverified here).

# Optimizes
**Modular modules** — four slots with uniform I/O interfaces: **Planning, Reasoning, Tool Use, Memory.**
See [optimization targets](/concepts/optimization-targets.md), target #2.

# Search strategy
LLM-driven evolution + recombination: alternate "module evolution" (an LLM with an evolutionary
meta-prompt writes new module code) and "module recombination" (swap modules to form offspring), with
greedy best-so-far reinitialization.

# Feedback signal
Scalar task performance **plus an in-context surrogate** (`πp`) that predicts a recombined agent's score
from task description + module profiles + examples — skipping full execution. See
[feedback signals](/concepts/feedback-signals.md).

# Results
"**17.2% average performance gain** against best-known human designs"; ~8.4% over ADAS. Per-task: WebShop
+14.1%, ALFWorld +26.1%, ScienceWorld +20.5%, M3ToolEval +30.6%, TravelPlanner/PDDL +6.0%. Surrogate eval
costs "only about **0.025% of the cost of a full evaluation**."

# Maturity & deployability
Research framework, public code (`tsinghua-fib-lab/AgentSquare`). API-model compatible / model-agnostic.
arXiv listing CC BY 4.0; repo code license unverified.

# Relevance to this program
The modular design space is a clean intermediate between prompt and full-code search, and its
**surrogate** is the cheapest known way to cut [eval cost](/concepts/eval-cost-and-contamination.md). If
M5 ever moves past prompt search, this module-recombination pattern is the natural next rung.

# Citations
[1] https://arxiv.org/abs/2410.06153
[2] https://github.com/tsinghua-fib-lab/AgentSquare
