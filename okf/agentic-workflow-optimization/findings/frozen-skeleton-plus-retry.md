---
type: Finding
title: Frozen-skeleton + retry over cheap isolated builds = bare opus at $0
description: A hand-authored frozen skeleton plus structural retry over isolated cheap builds matches a bare frontier model on epic cohesion, at zero method-side cost.
resource: studies/build-gap/RESULTS.md
tags: [finding, M-coh, skeleton, retry, harness, repo]
timestamp: 2026-06-16T00:00:00Z
---

The program's flagship positive result — the harness that closes the gap.

# The instrument
A **workspace epic**: 5 connected multi-tenant surfaces with a deliberate addMember→postComment
membership seam. A 3-bucket oracle scored at *epic* scope — **Wire** (modules import/call each other),
**X-CUT** (fraction of applicable surfaces that enforce each obligation — *not floored*, so size
modulates it), **Integ** (end-to-end flows spanning ≥2 modules). Mutation-tested
(`scale-oracle-selftest.mjs`).

# The ladder (workspace epic, D1/N5, $/epic)
| build config | X-CUT | integ | epic✓ | reading |
|---|---|---|---|---|
| cheap-isolated (naive) | 31% | 27% | 0/5 | per-task ok, no cohesion |
| cheap-isolated-retry | 37% | 27% | 0/5 | reliability ≠ cohesion |
| cheap-skeleton | 91% | 60% | 3/5 | cohesion solved, reliability caps |
| **cheap-skeleton-retry** | **100%** | **100%** | **5/5** | **= the opus bar, free** |
| sonnet-whole bare | 29% | 67% | 0/3 | frontier ≠ enough, bare |
| **opus-whole bare** (the bar) | 100% | 100% | 3/3 | the only bare win, ~$0.25 |

# Three findings
1. **The cohesion gap is real and per-task quality is blind to it** — happy-path is 90–100% everywhere,
   yet X-CUT/integ collapse for everything except opus. The frontier premium is *enforcing
   tenancy/authz uniformly across the epic*, not writing the function.
2. **"More context" is not the fix** — sonnet-whole sees the entire epic and still scores 29% X-CUT.
3. **The two levers are orthogonal and both necessary** — skeleton fixes cohesion, retry fixes
   reliability; only together → 5/5 at $0.

# Relevance to the field
This is the "gene" the program would hand a [prompt optimizer](/methods/gepa.md): the skeleton text. The
result also embodies the field's cheap-vs-frontier ambition (cf. [EvoFlow](/methods/evoflow.md),
[AFlow](/methods/aflow.md)) but with a **non-gameable executable oracle** rather than a benchmark scalar.
The one open caveat — *who authors the skeleton* — is the [M5 provenance question](/synthesis/workflow-search-is-m5.md),
and the literature's [Meta-Context-Engineering](/methods/meta-context-engineering.md) is the direct
threat/roadmap for automating it.

# Citations
[1] studies/build-gap/RESULTS.md (this repo)
[2] docs/REPORT-2026-06-16.md §7.2–7.3 (this repo)
