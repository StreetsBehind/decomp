# Battery ledger

Append-only record of **scored runs**. The leaderboard is computed from these rows; this file is the
auditable trail.

- A run is only comparable to another taken under the **same fixture hash**. Changing a fixture starts a
  new baseline series — note it with a divider and the new `sha256(plan.lock.json)`.
- Deterministic strategies run K=1; stochastic strategies run K≥(stated minimum) and report mean + stddev.
- **Mock (`battery:mock`) runs are NOT ledgered** — they exercise the deterministic canned table (plumbing,
  not science) and are reproducible on demand. Only LIVE runs are recorded here. (An earlier version of
  this file accumulated ~900 lines of repeated mock-run rows; those were purged as non-scientific noise.)

Fixture hashes: `quicklist` (thick) `31211e404e06` · `sso-greenfield` (thin) `8aceba61b344` ·
`ingest-pipeline` (thin) `f3da5445737a`.

---

## Series L1 — first scoped live sweep (2026-06-01)

Fixture `sso-greenfield` (thin, `8aceba61b344`) · methods swept across {haiku, sonnet} · judge fixed at
`claude-sonnet-4-6` · K=3 (stochastic). genCov = generativeCoverage.overall (sufficiency). Rows are the
mean over K. **Preliminary — n=1 fixture; see `docs/FINDINGS.md` §5–§6 for the two open problems that
partially compromise this run (argv-limit skips; confounded audit A/B).**

| Variant | Model | K | genCov | edge | present | fidelity | $/run (method) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| expand-audit | sonnet | 3 | 0.656 | 0.569 | 0.769 | 30 | ~0.48 | best clean score |
| swarm | sonnet | 2 | 0.567 | 0.500 | 0.654 | 29.5 | ~0.81 | 1 repeat lost to argv bug |
| expand-audit-noaudit | haiku | 3 | 0.578 | 0.471 | 0.718 | 29.7 | ~0.39 | audit-OFF > audit-ON (confounded — FINDINGS §6.2) |
| single-session | haiku | 3 | 0.533 | 0.451 | 0.641 | 29.7 | ~0.09 | cheapest; competitive |
| single-session | sonnet | 3 | 0.500 | 0.333 | 0.718 | 29.3 | ~0.22 | |
| swarm | haiku | 3 | 0.389 | 0.314 | 0.487 | 29.3 | ~0.37 | |
| expand-audit | haiku | 3 | 0.356 | 0.275 | 0.462 | 30 | ~0.17 | |
| expand-audit-noaudit | sonnet | 0 | — | — | — | — | — | SKIPPED — argv-limit bug (FINDINGS §6.1) |
| deterministic | — | 1 | 0.000 | 0.000 | 0.000 | 38 | 0 | pure-code control |
| flat | — | 1 | 0.000 | 0.000 | 0.000 | 38 | 0 | pure-code control |

Run cost ≈ $25–55 (method-side measured $6.81; ~600 sonnet judge calls are grader cost, not captured per
scorecard). No method reached `buildComplete` on this thin plan. Edges are the universal weak point
(0.27–0.57). No clean model winner. The expensive methods did not clearly out-earn cheap single-session.

| 1 | single-session | sso-greenfield | 8aceba61b344 | 2 | 38 | false | recall=n/a fp=0 | 4096 | 1 | 29.363 | gen=0 edge=0 present=0 ready=1 | scored |
| 2 | single-session | sso-greenfield | 8aceba61b344 | 2 | 30 | false | recall=n/a fp=8 | 2066 | 1 | 93.5492 | gen=0.167 edge=0.059 present=0.308 ready=1 | scored |
| 1 | single-session | sso-greenfield | 8aceba61b344 | 2 | 18 | false | recall=n/a fp=9 | 3522 | 1 | 10.671 | gen=0.3 edge=0.294 present=0.308 ready=1 | scored |
| 2 | single-session | sso-greenfield | 8aceba61b344 | 2 | 30 | false | recall=n/a fp=8 | 2869 | 1 | 257.2319 | gen=0.233 edge=0.118 present=0.385 ready=1 | scored |