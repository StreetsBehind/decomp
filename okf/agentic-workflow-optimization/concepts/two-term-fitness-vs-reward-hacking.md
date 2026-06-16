---
type: Concept
title: Two-term fitness vs reward hacking
description: The hypothesis that blending performance with a prior-conformance/attribution term reduces reward hacking — and why this repo's data is an existence proof for it.
tags: [fitness, reward-hacking, attribution, conformance]
timestamp: 2026-06-16T00:00:00Z
---

# The hypothesis

A search optimizing a **single scalar reward** will exploit any gap between the metric and the true
goal — it finds the cheapest way to raise the number, which is often not the intended behaviour. The
hypothesis under test across this bundle:

> A **two-term fitness** — task performance **plus** a *prior-conformance / attribution* term ("did it
> succeed for the intended reasons?") — reduces reward hacking versus a single scalar.

# Why an optimizer makes this acute

Hand-tuning rarely probes the dark corners of a metric. An **automated search actively seeks them** — it
is a reward-hacking engine pointed at whatever you measure. So the more capable the search, the more the
fitness must be hardened. This is the central caution of the [critique](/surveys/inefficiencies-of-meta-agents.md)
and the reason cheap prompt search is safer to start with than full-code search
([optimization targets](/concepts/optimization-targets.md)).

# The field's blind spot

Surveyed methods overwhelmingly optimize a single benchmark scalar
([feedback signals](/concepts/feedback-signals.md)). Pareto and cost-aware variants add a *second
performance/cost* objective, but essentially none add a *conformance* objective that checks the
candidate did the right thing for the right reason. The closest the field comes is structure-aware
evaluation (proposed, unvalidated, in the [IBM survey](/surveys/ibm-workflow-optimization-survey.md)).

# This repo already has the existence proof

The `decomp` program independently discovered, on real artifacts, that a single scalar gets gamed and
that a conformance term fixes it:

- **The scalar is censored.** Uniform edge-recall over-counts: ~58% of the score is *cheap-quadrant*
  edges the build process recovers for free. A method can post healthy uniform recall while missing most
  of the dangerous edges. See [lethal quadrant](/findings/lethal-quadrant.md).
- **The fix is a second term.** The program adopted a per-quadrant report plus a **`lethalEdgeRecall`
  veto** — a conformance gate that no aggregate median can paper over. See
  [the existence proof](/synthesis/two-term-fitness-existence-proof.md).
- **Attribution as conformance.** The M-coh-2 [double dissociation](/findings/skeleton-double-dissociation.md)
  is conformance made concrete: it verifies a cohesive epic only when *both* the shape clause and the
  obligation clause are present — i.e. it succeeded *for the right reasons*.

So for this program the two-term-fitness hypothesis is not something to test cold; it is a finding to
*contribute* to the literature.

# Citations

[1] Lethal quadrant + the ρ re-spec — [/findings/lethal-quadrant.md](/findings/lethal-quadrant.md)
[2] Inefficiencies of Meta Agents (the cost/diversity critique) — [/surveys/inefficiencies-of-meta-agents.md](/surveys/inefficiencies-of-meta-agents.md)
