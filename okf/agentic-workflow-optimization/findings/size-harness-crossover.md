---
type: Finding
status: provisional
title: The size × harness crossover — the bar degrades, the contender is flat
description: A bare frontier model silently erodes cross-cutting uniformity as the epic grows; the skeleton-driven cheap harness holds flat and crosses above it at ~9 surfaces.
resource: studies/build-gap/RESULTS.md
tags: [finding, M-coh-3, scale, crossover, repo]
timestamp: 2026-06-16T00:00:00Z
---

The "money chart" — why the harness *beats*, not just matches, frontier above a size threshold.

# The sweep (parametric ladder, D distinct domains, 4D+1 surfaces)
| size (D / N) | bar X-CUT | contender X-CUT | bar EPIC✓ | con EPIC✓ | bar $/epic | con $/epic |
|---|---|---|---|---|---|---|
| D1 / N5  | 100% | 97% | 100% | 80% | $0.28 | $0 |
| D2 / N9  | 94%  | **97%** | 67% | 60% | $0.36 | $0 |
| D3 / N13 | 78%  | **93%** | 33% | 20% | $0.39 | $0 |
| D4 / N17 | 80%  | **95%** | 0%  | 0%  | $0.43 | $0 |

# What happens
- **The bar degrades with size.** opus-whole's X-CUT slides 100→94→78→80% and its cohesive-epic rate
  collapses 100→67→33→0% as the epic grows 5→17 surfaces — while wire/happy/integ stay 100%. It doesn't
  drift or drop a feature; it **silently drops a hidden cross-cutting guard** as it holds more in one
  context. The casualty is named and monotone: `authz@add*Member` (absent in 0 domains at D1 → all 4 at
  D4). And it gets *more expensive* as it gets worse.
- **The contender is size-flat.** cheap-skeleton-retry holds X-CUT ≈ 93–97% and integ ≈ 92–100% across
  the whole ladder at $0, because the frozen skeleton re-states every obligation to every isolated
  builder regardless of epic size, and each builder sees only one small surface. **It crosses above opus
  on the lethal-quadrant metric at N≈9 and pulls away (+15 pts by N≈13–17).**

# The deliverable
- `harness*` = frozen-skeleton + isolated cheap chunks + retry, ~1 surface/chunk.
- `s*` (size knob): **do not pour more than ≈ one workspace-sized cluster (~5 surfaces / 2 cross-cutting
  obligations) into a single bare frontier context.** Above it, decompose into isolated chunks under a
  frozen skeleton.

# Relevance to the field
A concrete, mechanism-level demonstration that **cheap+harness beats frontier-bare per dollar** above a
size threshold — the strongest version of the [cheap-vs-frontier thesis](/synthesis/workflow-search-is-m5.md),
and a sharper result than the field's per-dollar headlines because the failure mode is *named and
monotone*, not an aggregate.

# Citations
[1] studies/build-gap/RESULTS.md (this repo)
[2] docs/REPORT-2026-06-16.md §7.4 (this repo)
