---
type: Finding
status: confirmed
title: The skeleton double dissociation — shape buys integration, obligations buy uniformity
description: An ablation showing the skeleton solves two independent problems; the shape clause fixes interface drift and the obligations clause fixes cross-cutting uniformity, and only both yield a cohesive epic.
resource: studies/build-gap/RESULTS.md
tags: [finding, M-coh-2, ablation, attribution, repo]
timestamp: 2026-06-16T00:00:00Z
---

The cleanest attribution result in the program — and the concrete form of a
[conformance term](/concepts/two-term-fitness-vs-reward-hacking.md).

# The ablation (workspace epic, cheap tier, retry, K5, $0)
| skeleton variant | wire | happy | X-CUT | integ | EPIC✓ | what it pins |
|---|---|---|---|---|---|---|
| **none** (retry only) | 100% | 90% | 40% | 27% | 0/5 | nothing |
| **shape-only** (data shapes, no obligations) | 100% | 100% | 34% | **67%** | 0/5 | the seam / interface drift |
| **obligations-only** (rules, no shapes) | 100% | 90% | **86%** | 40% | 0/5 | cross-cutting uniformity |
| **full** (both) | 100% | 100% | **97%** | **100%** | **80%** | both → a cohesive epic |

# The dissociation
- **shape-only** lifts the membership seam to both sides agreeing on representation (fixes *drift*) but
  leaves authz/tenancy crosscuts near 0% — it does **not** fix obligations.
- **obligations-only** lifts tenancy/authz crosscuts to ~100% but drops the seam agreement to 40% (the
  two sides disagree on shape because nothing pinned it) — it does **not** fix drift.
- **Neither half alone makes a cohesive epic (both 0/5); only the union does (80%).**

# Why it's a conformance result
A cohesive epic is verified *only when the candidate succeeded for both right reasons* — shape present
AND obligations present. That is exactly the "did it succeed for the intended reasons" attribution term
the [two-term fitness hypothesis](/concepts/two-term-fitness-vs-reward-hacking.md) calls for, instantiated
on real builds. It also mirrors [CodeEvolve](/methods/codeevolve.md)'s finding that *component
interaction*, not any single operator, drives results.

# Relevance to M5
It tells a future search **what the skeleton gene must carry** (both clauses), so the search space is
constrained correctly rather than rediscovering this by trial and error.

# Citations
[1] studies/build-gap/RESULTS.md, M-coh-2 section (this repo)
[2] docs/REPORT-2026-06-16.md §8 (this repo)
