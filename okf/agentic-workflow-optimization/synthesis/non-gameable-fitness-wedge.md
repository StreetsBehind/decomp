---
type: Synthesis
status: provisional
title: The non-gameable fitness is this program's contribution to the field
description: Almost every method optimizes a contaminatable, gameable benchmark scalar; this program's contribution is the fitness function, not the optimizer.
resource: docs/REPORT-2026-06-16.md
tags: [synthesis, fitness, contribution, wedge]
timestamp: 2026-06-16T00:00:00Z
---

# The gap in the field
Survey the [feedback signals](/concepts/feedback-signals.md) across every method in
[methods](/methods/index.md): they optimize a **single benchmark scalar** (GSM8K, HumanEval, MBPP, MATH,
SWE-bench-family). Two problems compound:
- The scalar is **gameable** — an automated search is a reward-hacking engine pointed at the metric
  ([two-term fitness vs reward hacking](/concepts/two-term-fitness-vs-reward-hacking.md)).
- The benchmark is **contaminatable** — public suites may be memorized
  ([eval cost & contamination](/concepts/eval-cost-and-contamination.md)).

The field's own structure-aware-evaluation proposal (in the [IBM survey](/surveys/ibm-workflow-optimization-survey.md))
is an unvalidated gesture at fixing this.

# What this program already has
- A **private, executable, hidden two-bucket oracle** the model never sees — happy-path vs the silently
  missed obligations ([obligation-blindness](/findings/obligation-blindness-tier-independent.md)). No LLM
  judge; deterministic and free.
- **Mined build-history ground truth** (KT#2) — real shipped-then-detonated lethal misses.
- A **cost-weighted lethal-recall** metric with a **veto** — a conformance term, not an aggregate
  ([lethal quadrant](/findings/lethal-quadrant.md)).

# The wedge
> Most agentic-workflow-search papers optimize against a gameable scalar on a contaminatable benchmark.
> This program brings a **non-gameable executable fitness with a lethal-quadrant conformance term** — and
> can show it resists the reward-hacking the single-scalar approaches invite.

So the program's contribution to this literature is **the fitness, not the optimizer.** It can adopt
[GEPA](/methods/gepa.md) or [OpenEvolve](/methods/openevolve.md) off the shelf; what it uniquely supplies
is the thing those tools assume you already have and most users don't — a trustworthy evaluator. This is
the publishable angle and the reason the program is *ahead* of the field on the dimension that matters,
even though it has not yet run a search.

# Citations
[1] docs/REPORT-2026-06-16.md §3, §7.1, §10 (this repo)
[2] OpenEvolve's own caution that "fitness is gameable if poorly specified" — [/methods/openevolve.md](/methods/openevolve.md)
