---
type: Finding
title: No completeness guarantee exists — the cross-discipline survey
description: A six-angle survey concluded no discipline has a completeness guarantee for decomposition; the best prior art gives a lower bound or a typed floor, never a proof.
resource: docs/PRIOR-ART-COMPLETENESS.md
tags: [finding, completeness, prior-art, repo]
timestamp: 2026-06-16T00:00:00Z
---

The program's grounding for the [completeness concept](/concepts/completeness-and-capture-recapture.md).

# The conclusion
A six-angle cross-discipline survey (requirements engineering, formal methods, safety engineering,
testing/inspection, process engineering, ecology) reached a hard conclusion:

> **No discipline has a completeness guarantee for decomposition.** The best prior art delivers either
> (1) a measurable lower bound on what's still missing, or (2) a typed floor that raises the floor —
> never a proof.

# Key imported facts
- **Conservation of difficulty** (≈ Tesler's Law): residual difficulty *relocates* (to
  catalog-completeness, to the all-generators-missed class) rather than vanishing.
- **Capture-recapture is the only family that yields a number** — but needs ~4–5 *independent* generators
  and is **structurally blind to anything all generators miss.** For correlated LLM extractors that biases
  toward false completeness.
- Imported techniques: Leveson's RSM completeness criteria (typed floor); Arora/Sabetzadeh/Briand
  domain-model **orphan detection** (near-linear sensitivity r>0.96); mutation testing; STRIDE-per-element;
  dialectical/devil's-advocate inquiry; Lincoln-Petersen mark-recapture.

# Relevance to the field
This is the program's principled reason to **distrust any "we found everything" claim** from an ensemble
or a search — and to insist that diversity be *constructed* (lens-diversity), not assumed. It is the
theoretical backing for the [capture-recapture caveat](/concepts/completeness-and-capture-recapture.md)
that constrains every Mixture-of-Experts argument in the field.

# Citations
[1] docs/PRIOR-ART-COMPLETENESS.md (this repo)
[2] docs/REPORT-2026-06-16.md §2.1 (this repo)
