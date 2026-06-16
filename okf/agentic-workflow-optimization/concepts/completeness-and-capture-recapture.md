---
type: Concept
title: Completeness has no guarantee — capture-recapture is the only numeric lens
description: There is no completeness proof for decomposition; capture-recapture estimates the residual but is structurally blind to what all generators miss.
tags: [completeness, capture-recapture, ensemble, residual]
timestamp: 2026-06-16T00:00:00Z
---

This concept governs any claim that an ensemble or a search has found "everything."

# The hard result

A six-angle cross-discipline survey in this repo (requirements engineering, formal methods, safety
engineering, testing, process engineering, ecology) concluded: **no discipline has a completeness
*guarantee* for decomposition.** The best prior art gives either a measurable *lower bound* on what is
still missing, or a *typed floor* that raises the floor — never a proof. See
[completeness prior-art](/findings/completeness-prior-art.md).

# Capture-recapture: the only thing that yields a number

Borrowed from ecology (Lincoln-Petersen mark-recapture): run several *independent* generators, look at
the overlap of what they find, and estimate the unseen residual. It is the only family that produces an
actual *number* for completeness.

**The fatal caveat:** capture-recapture needs ~4–5 genuinely *independent* generators and is
**structurally blind to anything all generators miss.** For correlated LLM extractors — N samples of one
prompt, or an ensemble of near-identical decomposers — that is the worst case: it *inflates apparent
completeness* while the shared blind spot goes uncounted.

# The consequence for ensembles / Mixture-of-Experts

The popular intuition "more experts catch more edges" is only true if the experts have *uncorrelated*
error. Therefore:

- **Sampling-diversity** (N runs of one prompt) shares blind spots — it does **not** help with the
  systematic misses that matter. The repo found the dangerous misses *are* systematic (every model tier
  floors the same obligations; `authz@add*Member` erodes monotonically). See
  [obligation-blindness](/findings/obligation-blindness-tier-independent.md) and
  [size×harness crossover](/findings/size-harness-crossover.md).
- **Lens-diversity** (an authz lens, a tenancy lens, a lifecycle lens) is the construction that *can*
  have uncorrelated error — which is why the program's next experiment is a lens-ensemble residual probe,
  not a sample-count increase.

This is the single biggest constraint on any future ensemble-search: the search must *create
decorrelation*, not just *count agreement*.

# Citations

[1] Completeness prior-art survey — [/findings/completeness-prior-art.md](/findings/completeness-prior-art.md)
[2] `docs/PRIOR-ART-COMPLETENESS.md` and `docs/REPORT-2026-06-16.md` §2.1, §11 (this repo)
