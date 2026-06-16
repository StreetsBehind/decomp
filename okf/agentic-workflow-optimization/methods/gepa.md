---
type: Method
title: GEPA — Reflective Prompt Evolution
description: Evolves the prompts of a compound LLM system by reflecting on execution traces in natural language and selecting across a Pareto front.
resource: https://arxiv.org/abs/2507.19457
tags: [prompt-optimization, reflective, pareto, deployable, api-only]
timestamp: 2026-06-16T00:00:00Z
---

GEPA (Genetic-Pareto) is the strongest near-term fit for this program: a sample-efficient, API-deployable
**prompt** optimizer that uses language as the learning signal.

- **Authors / venue:** Agrawal, Tan, Soylu, Ziems, Khare, Opsahl-Ong, Singhvi, Shandilya, Ryan, Jiang,
  Potts, Sen, Dimakis, Stoica, Klein, Zaharia, Khattab. arXiv Jul 2025; **accepted to ICLR 2026 (Oral)**.

# Optimizes
Prompt / instruction text of the modules inside an AI system. No weight access — see
[optimization targets](/concepts/optimization-targets.md), target #1.

# Search strategy
Reflective NL evolution with a **Pareto front**: sample trajectories, reflect on them in language to
diagnose failures, mutate prompts, and select non-dominated candidates with probability proportional to
per-instance coverage (avoids the local optima of greedy prompt search).

# Feedback signal
Natural-language critique over rich traces (reasoning, tool calls, tool outputs, failed parses, compiler
errors) **plus** Pareto multi-objective — see [feedback signals](/concepts/feedback-signals.md). The
DSPy metric returns `dspy.Prediction(score=..., feedback=...)`.

# Results
"Outperforms GRPO by 6% on average and by up to 20%" while using **up to 35× fewer rollouts**; beats
MIPROv2 "by over 10%" (e.g. +12% on AIME-2025). Benchmarks include HotpotQA, IFBench, HoVer, AIME.

# Maturity & deployability
**Deployable, MIT-licensed.** Standalone library (`pip install gepa`) + DSPy integration (`dspy.GEPA`).
Explicitly API-only friendly: "No weights access needed. Optimize GPT-5, Claude, Gemini directly through
their APIs." Needs a strong `reflection_lm` and a budget knob; optimization adds inference cost.

# Relevance to this program
This is the recommended optimizer for the program's [M5](/synthesis/workflow-search-is-m5.md). Its NL
feedback fits the program's hidden-oracle metric naturally — the metric can return *why* a build failed
its lethal-quadrant tests, not just a score. See the [experiment plan](/synthesis/m5-experiment-plan-gepa-first.md).
GEPA's reflective NL signal is also the cleanest counter to the [reward-hacking](/concepts/two-term-fitness-vs-reward-hacking.md)
risk that scalar searches invite.

# Citations
[1] https://arxiv.org/abs/2507.19457
[2] https://dspy.ai/api/optimizers/GEPA/overview/
[3] https://github.com/gepa-ai/gepa
