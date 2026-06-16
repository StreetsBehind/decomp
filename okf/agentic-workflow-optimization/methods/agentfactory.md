---
type: Method
title: AgentFactory — self-evolution via executable subagent accumulation
description: Self-evolves by turning successful task solutions into standardized, reusable executable Python subagents and refining them on execution feedback.
resource: https://arxiv.org/abs/2603.18000
tags: [full-code, subagent-reuse, self-evolution, 2026, recent-verify]
timestamp: 2026-06-16T00:00:00Z
---

> **Recency flag:** arXiv:2603.18000 = **March 2026**, past a January-2026 cutoff. Surfaced and
> summarized via live search; verify figures against the source before relying on them.

- **Authors:** Zhang Zhang, Shuqi Lu, Hongjin Qian, Di He, Zheng Liu. arXiv Mar 2026.

# Optimizes
**Full agent code**, but accumulated as a *library of reusable executable Python subagents* — the unit of
evolution is a standardized subagent, not a prompt or a topology. See
[optimization targets](/concepts/optimization-targets.md).

# Search strategy / signal
Accumulate successful solutions as subagents; continuously **refine them on execution feedback** so they
"become increasingly robust and efficient as more tasks are encountered." Signal = task-completion
execution feedback.

# Results
Qualitative in the abstract — portability across Python-capable systems and reduced manual intervention;
**no quantitative results extracted** (unverified).

# Maturity & deployability
Open-sourced implementation + demo video (per abstract).

# Relevance to this program
The "accumulate reusable, verified building blocks" idea parallels the program's *archetype/obligations
library* and *frozen skeleton* — both are attempts to bank reusable, vetted knowledge. The program's
[archetype-premise finding](/findings/archetype-premise.md) is a sharp caution here: accumulated
artifacts can **smuggle wrong assumptions** without a curation gate, so an accumulation loop needs the
program's recurrence/curation discipline to avoid library bloat and stale over-fit code.

# Citations
[1] https://arxiv.org/abs/2603.18000
