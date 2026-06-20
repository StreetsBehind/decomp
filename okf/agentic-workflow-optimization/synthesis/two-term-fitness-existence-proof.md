---
type: Synthesis
status: provisional
title: This program's data is an existence proof for the two-term-fitness hypothesis
description: The hypothesis that performance-plus-conformance beats a single scalar is not something to test cold here — the quadrant-censoring finding and the double dissociation already demonstrate it.
resource: docs/REPORT-2026-06-16.md
tags: [synthesis, two-term-fitness, existence-proof, reward-hacking]
timestamp: 2026-06-16T00:00:00Z
---

# The hypothesis the field poses
A two-term fitness — task performance **plus** a prior-conformance/attribution term — reduces reward
hacking versus a single scalar. See [two-term fitness vs reward hacking](/concepts/two-term-fitness-vs-reward-hacking.md).
The field poses it as a hypothesis to test. **This program has already produced the evidence.**

# The proof, in two parts
1. **The single scalar gets gamed (shown).** Uniform edge-recall is censored: ~58% of the score is
   cheap-quadrant edges the build recovers for free, so a method posts healthy recall while missing most
   of the lethal quadrant ([lethal quadrant](/findings/lethal-quadrant.md), KT#1). That is a single
   scalar being satisfied without achieving the goal — reward hacking by construction.
2. **The conformance term fixes it (shown).** The program adopted a per-quadrant report plus a
   **`lethalEdgeRecall` veto**, and the [skeleton double dissociation](/findings/skeleton-double-dissociation.md)
   verifies a cohesive epic *only when the candidate succeeded for both right reasons* (shape AND
   obligations present). Adding the second term changed the verdict that the scalar got wrong.

# Why this is more than anecdote
The censoring was confirmed two independent ways — a cost-weighted re-score (KT#1) and mined build
history (KT#2) — and a blind free-model panel reproduced the lethal typing within 3%. The dissociation is
a clean 0/5-vs-0/5-vs-80% ablation, not a single run.

# The consequence
For this program, the field's open question is a **closed finding to contribute.** The realized M5 search
**did use the two-term fitness from the start** — not because theory said so, but because this program's
own data showed the one-term version is the thing that breaks. See the original
[experiment plan](/synthesis/m5-experiment-plan-gepa-first.md) (now superseded by the realized run).

> **UPDATE 2026-06-19:** the original closer was a forward-looking recommendation ("When M5 runs a search,
> it should use the two-term fitness from the start"). It has been **acted on**: the brought-forward
> meta-search ran P0→P2c with the two-term performance-plus-per-cell-veto fitness wired in from the start
> (P0 instrument self-validation gated on it; the P2c search converged under it without reward-hacking the
> scalar). The existence-proof core above is unchanged — the realized search is now *confirming evidence*
> for it rather than a future test of it. All PROVISIONAL. See `../../STATE.md`.

# Citations
[1] docs/REPORT-2026-06-16.md §3, §8 (this repo)
[2] docs/KILL-TESTS.md (this repo)
