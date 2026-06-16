---
type: Concept
title: Evaluation cost, stochasticity, and benchmark contamination
description: Why evaluation — not the search algorithm — is the binding constraint, and the three ways it goes wrong.
tags: [evaluation, cost, contamination, stochasticity]
timestamp: 2026-06-16T00:00:00Z
---

Every method in this bundle is bottlenecked by the same thing: **calibration is expensive, noisy, and
potentially leaked.** Treat these as first-class, not footnotes.

# Eval cost

Each candidate must be run on real tasks to be scored, and a search evaluates many candidates. The field
attacks this three ways:
- **Surrogates / value models** that predict fitness without full execution —
  [AgentSwift](/methods/agentswift.md) (7B value model; frames a single real eval at ~$60),
  [AgentSquare](/methods/agentsquare.md) (in-context surrogate at ~0.025% of full-eval cost).
- **Sample-efficiency** in the search itself — [GEPA](/methods/gepa.md) claims up to **35× fewer
  rollouts** than RL by using NL reflection instead of scalar gradients.
- **Cheap executors / heterogeneity** — [EvoFlow](/methods/evoflow.md) matches o1-preview at **12.4%**
  of its inference cost; [AFlow](/methods/aflow.md) lets small models beat GPT-4o at **4.55%** of cost.

# Stochasticity

LLM outputs vary run-to-run, so a single calibration is a noisy fitness estimate. This repo handles it
by running `K` repeats per cell in the battery and reading distributions, not point values — and by a
structural retry that re-routes past a weak draw from a [high-variance free-model gateway](/findings/jnoccio-gateway.md).

# Benchmark contamination

Public benchmarks (GSM8K, HumanEval, MBPP, MATH, SWE-bench-family) may be in pretraining data, so a
"win" can be memorization. [SEW](/methods/sew.md) uses the contamination-aware LiveCodeBench partly for
this reason. The robust answer is a **private, executable oracle** the model has never seen — which is
exactly what this repo built: a hidden two-bucket test oracle and mined build-history ground truth. See
[obligation-blindness](/findings/obligation-blindness-tier-independent.md) and
[the non-gameable-fitness wedge](/synthesis/non-gameable-fitness-wedge.md).

# The cost-viability question

The [critique](/surveys/inefficiencies-of-meta-agents.md) shows the design-vs-deploy economics often
never break even: automated agent design beat human design on total cost in only **two datasets**, and
only when amortized over **>15,000 deployment examples.** Any M5 plan must budget the *search* cost, not
just the per-run cost — see the [experiment plan](/synthesis/m5-experiment-plan-gepa-first.md).

# Citations

[1] Inefficiencies of Meta Agents — [/surveys/inefficiencies-of-meta-agents.md](/surveys/inefficiencies-of-meta-agents.md)
[2] AgentSwift, GEPA, EvoFlow, AFlow — see [/methods/index.md](/methods/index.md)
