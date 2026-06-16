---
type: Finding
title: Obligation-blindness is a spec/harness gap, not a model-tier gap
description: Cheap and frontier models both pass the happy path ~100% and both skip the dangerous non-idiomatic obligations at 0% — so paying for frontier barely helps; harness does.
resource: studies/build-gap/RESULTS.md
tags: [finding, M0, tier-independence, obligations, repo]
timestamp: 2026-06-16T00:00:00Z
---

The M0 result that licenses the whole cheap-vs-frontier thesis.

# The setup
A corpus of self-contained build tasks. The model sees a **happy-path spec only**; a hidden two-bucket
executable oracle grades happy-path vs **obligation** tests (authz, tenancy, mass-assignment, validation
— the silently-missed requirements). Grading is deterministic and free (no LLM judge); only frontier
generations cost money. This is a **private, contamination-resistant** oracle — see
[eval cost & contamination](/concepts/eval-cost-and-contamination.md).

# The finding
- **Both tiers pass the happy path (~100%) and both score 0% on the non-idiomatic obligations** — the
  cheap free-model pool *and* sonnet. The only obligation added unprompted is the *idiomatic* tenancy
  filter.
- **Opus partially breaks tier-independence:** `update-profile` authz+mass-assign goes 0% (sonnet) →
  100% (opus) — but `post-comment` body-validation stays 0% even on opus. So the bar is specifically
  opus, and it still has holes.
- **The floor is tier-AND-size-independent:** 0% at atomic and at the size-3 monolith. A bare-model size
  sweep over obligations is therefore flat-at-0 and uninformative — which forced the cohesion turn.

# Why it matters
> This is not primarily a cheap-vs-frontier gap — it's a spec/harness gap that hits every tier.

If frontier isn't worth paying for on the requirements that matter, then a **cheap model + the right
harness** can match it — and the lever is to *supply the obligations*, not to buy a bigger model. This is
the premise the [frozen skeleton](/findings/frozen-skeleton-plus-retry.md) then pays off.

# Citations
[1] studies/build-gap/RESULTS.md (this repo)
[2] docs/REPORT-2026-06-16.md §7.1 (this repo)
