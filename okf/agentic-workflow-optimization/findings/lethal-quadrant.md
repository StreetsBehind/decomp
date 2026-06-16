---
type: Finding
title: The lethal quadrant — completeness is cost-of-omission, not coverage
description: The edges that matter are the silent + expensive-to-recover obligations; uniform recall is censored because most of it is cheap edges the build recovers for free.
resource: docs/KILL-TESTS.md
tags: [finding, lethal-quadrant, obligations, fitness, repo]
timestamp: 2026-06-16T00:00:00Z
---

The program's central reframe, and the reason it cares about a
[two-term fitness](/concepts/two-term-fitness-vs-reward-hacking.md).

# The 2×2

| | **Cheap recovery** | **Expensive recovery** |
|---|---|---|
| **Self-revealing** (compiler/test catches it) | dataflow wiring → *let the build find it* | architecture/data-model/ordering → discover upfront |
| **Silent** (ships clean, detonates later) | low priority | **security / privacy / tenancy / consistency / idempotency / compliance → the LETHAL QUADRANT** |

The thesis: stop spending discovery effort on the cheap quadrant the build recovers for free; spend it
all on the **silent + expensive** quadrant.

# The kill-tests (run 2026-06-11) that made it real

- **KT#1 — cost-weighted re-score.** Tagged all **162 canonical hearth edges**: **37% lethal (60/162)**,
  separable, typed exactly as predicted (authz/authn/tenancy/audit/seat-limit/SSO-validation). A blind
  free-model panel independently called **58 lethal vs the authored 60** (within 3%), 79% bit-agreement —
  robust, not an authoring artifact. Crucially: **~58% of a uniform edge-recall score is cheap-quadrant
  edges the build recovers for free.**
- **KT#2 — build history as ground truth.** Mined ~1,360 app beads; found **~11 shipped-then-detonated
  lethal misses** (authz/RLS, tenancy, consistency, race, data-loss) — and **every one passed the
  automated gate.** Because the data structurally under-records silent misses, ~11 is a *floor*.

# The consequence: the ρ re-spec

Report recall **per quadrant**, never an aggregate median; gate any deferral claim on a
**`lethalEdgeRecall` veto.** This is the program's [conformance term](/concepts/two-term-fitness-vs-reward-hacking.md) —
the empirical reason a single scalar fitness is not enough.

# Why this matters to the field
Every surveyed method optimizes a single benchmark scalar. This finding says that scalar is *censored*
on the dimension that matters — so a workflow search that climbs it would be optimizing the wrong number.
See [the non-gameable-fitness wedge](/synthesis/non-gameable-fitness-wedge.md).

# Citations
[1] docs/KILL-TESTS.md (this repo)
[2] docs/BUILD-TOLERANT-REFRAME.md (this repo)
[3] docs/REPORT-2026-06-16.md §3 (this repo)
