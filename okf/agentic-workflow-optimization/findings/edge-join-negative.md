---
type: Finding
status: confirmed
title: The edge-join negative — model-extracted interfaces lose to a trivial baseline
description: A staircase test killed the edge-join mechanism; model-extracted produces/consumes joined into edges lost to a depends_on baseline, and a stronger model did not fix it.
resource: docs/STAIRCASE-RESULTS.md
tags: [finding, negative-result, staircase, repo]
timestamp: 2026-06-16T00:00:00Z
---

A load-bearing **negative** result — and a caution the field's critique echoes.

# The staircase
A four-step ladder tested whether "edges = a deterministic join over typed produces/consumes" is sound.

| Step | Test | Result |
|---|---|---|
| 0 | Ruler mutation-test (36 assertions) | ✅ PASS |
| 1 | Join-ceiling on hand-authored interfaces | ✅ 88.2% ceiling, 100% join precision |
| 2 | **Live extraction → join vs a `depends_on` baseline** | 🔴 **extraction→join LOSES by −17.6 pts** (replicated) |
| 3 | Headroom pre-flight on hearth | ✅ seam recall 22.2% — fixture can move the needle |

# The kill
Model-extracted interfaces joined into edges **lost** to a trivial baseline (haiku 16.5 vs 34.1; sonnet
34.1 vs 51.8), replicated across both annotators. The lesson:

> **Model strength isn't the fix** — the bottleneck is structural (vocabulary alignment + over-wiring).

Sonnet extracted genuinely better than haiku and *still* lost. The edge-join mechanism was archived. In
hindsight it was "an argument about the cheap quadrant" the build handles anyway — consistent with
[build-as-discovery](/findings/build-as-discovery.md).

# Why it matters to the field
A direct empirical instance of the [meta-agent critique](/surveys/inefficiencies-of-meta-agents.md)'s
first inefficiency: throwing a stronger model (or more context) at a structural bottleneck does not help.
A workflow search must change the *structure/signal*, not just the model tier — a constraint on any naive
"swap in a better model" gene.

# Citations
[1] docs/STAIRCASE-RESULTS.md (this repo)
[2] docs/REPORT-2026-06-16.md §4 (this repo)
