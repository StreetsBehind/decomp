---
type: Finding
title: The jnoccio gateway — the free-model supply and the retry lever
description: An OpenAI-compatible gateway that adaptively routes across many free upstreams, making the cheap tier $0; structural retry recovers its flaky draws and is orthogonal to cohesion.
resource: docs/FINDINGS.md
tags: [infrastructure, gateway, retry, cheap-tier, repo]
timestamp: 2026-06-16T00:00:00Z
---

The infrastructure that makes the cheap-vs-frontier experiments cost $0.

# The supply
`makeGatewayInvoke` calls an OpenAI-compatible gateway on `127.0.0.1:4317` that adaptively routes each
call across many free upstreams and returns the *resolved* model + request id (recorded for
reproducibility). Live smoke: 10/10 valid snapshots across 9 distinct upstreams, 0 truncations, **$0**.

# The hazards (all handled)
Per-model output cap (set `max_tokens=16384`), JSON-disobedience, timeouts → **retry-on-invalid
re-routes past a weak draw.** Functionally `@gateway ≈ @random-free-model` — a high-variance *mixture*,
which is also a known limitation (it is uncontrolled; controlling the method model is a paused decision).

# The retry lever is load-bearing
Free models are flaky on real decomposition (~50% of first hearth draws come back empty/aborted). The
structural retry (gate = "module imports+exports the surface fn," with no behaviour/obligation leakage)
recovers them. It closes the **reliability** gap — which is *orthogonal* to cohesion (see the
[double dissociation](/findings/skeleton-double-dissociation.md)).

# Relevance to the field
A working instance of the **routing/ensembling lever** and the cheap-executor strategy that
[EvoFlow](/methods/evoflow.md) and [AutoMaAS](/methods/automaas.md) theorize about — but used here as
*substrate*, not as the object of search. Its high variance is exactly the
[stochasticity](/concepts/eval-cost-and-contamination.md) any future search over this tier must budget
for with K-repeats.

# Citations
[1] docs/FINDINGS.md (this repo)
[2] docs/REPORT-2026-06-16.md §9 (this repo)
