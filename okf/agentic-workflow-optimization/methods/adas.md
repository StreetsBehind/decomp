---
type: Method
title: ADAS — Automated Design of Agentic Systems (Meta Agent Search)
description: A meta-agent iteratively programs new agents in a Turing-complete code space, building on a growing archive of discoveries.
resource: https://arxiv.org/abs/2408.08435
tags: [full-code, meta-agent, archive, foundational]
timestamp: 2026-06-16T00:00:00Z
---

ADAS is the foundational reference for the field — the de-facto baseline that later methods beat.

- **Authors / venue:** Shengran Hu, Cong Lu, Jeff Clune (UBC / Vector Institute). arXiv Aug 2024;
  **ICLR 2025**.

# Optimizes
**Full agent code** — agents are defined in a Turing-complete code space, so the search can discover
"novel prompts, tool use, workflows, and combinations thereof." See
[optimization targets](/concepts/optimization-targets.md), target #4.

# Search strategy
"Meta Agent Search": an archive-based open-ended loop where a meta-agent writes and refines agent code
over an accumulating archive of prior designs (quality-diversity flavored, not classical GA/MCTS).

# Feedback signal
Scalar reward — candidates scored by an `evaluate_agent` call on held-out validation tasks, archived
above a threshold.

# Results
Reported improvements over hand-designed baselines: ~14% on ARC, +13.6 F1 on DROP, +14.4% on math
(MGSM/MMLU), with demonstrated transfer across domains and models (GPT-3.5→GPT-4, Claude Haiku/Sonnet).
*(Exact figures are from a secondary aggregator; the PDF would not render cleanly — treat as
lightly-verified.)*

# Maturity & deployability
Research code, **Apache-2.0** (`ShengranHu/ADAS`). API-model based (defaults to OpenAI; Claude transfer
demonstrated). Authors stress mandatory sandboxing of generated code.

# Relevance to this program
ADAS is the *expensive end* of the [optimization-target axis](/concepts/optimization-targets.md) —
full-code search. It is what this program should **not** start with: it maximally exposes
[reward hacking](/concepts/two-term-fitness-vs-reward-hacking.md) and credit-assignment difficulty, and
is the direct target of the [cost/diversity critique](/surveys/inefficiencies-of-meta-agents.md).
Reserve it for after a prompt-level win.

# Citations
[1] https://arxiv.org/abs/2408.08435
[2] https://github.com/ShengranHu/ADAS
