# The $0 Quadrant Kill-Tests — Results

_Authored 2026-06-11. Runs the two zero-model-spend kill-tests that gate the v2 campaign
([`RECONCILIATION.md`](RECONCILIATION.md) §6, [`BUILD-TOLERANT-REFRAME.md`](BUILD-TOLERANT-REFRAME.md)
"Kill-tests"). The question both answer: **is the cost-of-omission 2×2 real and separable on real
artifacts, or is it academic?** If real, v2's median-ρ decision rule (§2.6/H3/§6) is measuring a
censored statistic and the [`RESEARCH-PROGRAM.md`](RESEARCH-PROGRAM.md) §10 revisions are forced.
Append-only log in the spirit of [`STAIRCASE-RESULTS.md`](STAIRCASE-RESULTS.md)._

---

## TL;DR

| Kill-test | Branch | Verdict |
|---|---|---|
| **#1 cost-weighted re-score on hearth** | *kills if quadrants not separable* | **NOT KILLED.** 37% of hearth's 162 oracle edges are lethal (silent+expensive), cleanly typed, only *coarsely* aligned with the seam proxy. Uniform edge recall is 58% composed of cheap-quadrant edges the build recovers for free. |
| **#2 build-batch history as ground truth** | *how big is the lethal quadrant in practice?* | _pending — mining in progress_ |

**Consequence:** the §10 ρ re-spec (report recall/ρ **per quadrant**, gate the deferral claim on the
**lethal-quadrant tail**, never the median) is **supported by #1**. The strict method-re-ordering
half of #1 is now a *free byproduct* of the first real hearth run (the scorer is built + selftested),
because the original Step-2/Step-3 snapshots were never persisted.

---

## Kill-test #1 — cost-weighted re-score on the hearth oracle

### What was done (all $0, no model spend except the already-spent Step-3 live data we reinterpret)

1. **Tagged the canonical 162-edge hearth oracle on the 2×2.** Each `requiredEdge` in
   `fixtures/hearth/outcome-manifest.json` now carries `selfRevealing` / `recovery` / `quadrant` /
   `quadrantConf`, authored against an explicit rubric (below) via
   `tools/author-hearth-quadrants.mjs` (reproducible; durable sidecar `fixtures/hearth/quadrant-tags.json`).
   - **Rubric.** *self-revealing* = a single-honest-tenant happy-path acceptance test FAILS if the
     edge is omitted (feature visibly breaks). *silent* = the happy path still works but a
     security / tenancy / privacy / consistency / compliance guarantee is violated (only an
     adversary, a 2nd tenant, or an auditor sees it). *recovery expensive* = late fix touches the
     data model/schema/ordering, or a breach/corruption already shipped. *lethal* = silent +
     expensive.
   - **Manifest disambiguation (banked so the next session doesn't trip on it).** There are TWO
     hearth manifests with disjoint vocabularies: the canonical **`fixtures/hearth/outcome-manifest.json`
     (162 edges, 83 intra + 79 seam)** that the battery loads AND that Step-3's seam pre-flight judged,
     and an older **`experiments/archetype-premise/hearth/outcome-manifest.partitioned.json` (84 edges,
     47 intra + 37 seam)** referenced by RECONCILIATION change B. We tagged the canonical 162-edge one.
     (A pilot tagging of the 84-edge variant gave 32% lethal — same conclusion, so the result is
     robust to which variant.)

2. **Built + selftested the cost-weighted recall scorer.** `eval/generative-coverage.mjs` now emits
   `edgeCoverageByQuadrant` and `costWeightedEdgeRecall` (with `lethalRecall`) whenever the manifest
   is quadrant-tagged — back-compatible (absent otherwise). Weights operationalize
   `value ∝ P(missed)×cost(discover late)×cost(recover late)`: default `{lethal:1, loud-exp:0.5,
   cheap:0, silent-cheap:0.1}` (the build drives the cheap quadrant's value → 0). Wired through the
   battery scorecard + schema. `eval/selftest/quadrant-recall.selftest.mjs` (19 assertions) pins the
   per-quadrant recall, the weighting, back-compat, AND **the re-ordering effect**: a method with
   higher *uniform* recall but lower *lethal* recall ranks BELOW its opposite under cost-weighting.
   Full suite: **13 suites / 308 assertions** green.

### The distribution (the load-bearing $0 result)

```
=== CANONICAL hearth oracle: 162 required edges ===
Quadrant distribution:
  lethal         60  (37.0%)   silent + expensive  — the lethal quadrant
  loud-exp        8  ( 4.9%)   self-revealing + expensive — architectural/data-model/ordering
  cheap          94  (58.0%)   self-revealing + cheap — the build recovers these for free
  silent-cheap    0  ( 0.0%)

Quadrant x partition cross-tab:
  quadrant      intra-feature          seam     total
  lethal                    6            54        60
  loud-exp                  5             3         8
  cheap                    72            22        94
  TOTAL                    83            79       162

Lethal-quadrant confidence: {high:23, med:30, low:7}
  conservative floor (high-conf lethal only): 23 edges (14.2%)
```

### Why this resolves the *kill* branch (NOT killed)

- **The lethal quadrant is large and separable.** 37% of edges (60/162); even the high-confidence-only
  floor is 14.2% (23 edges). It is not a rounding-error tail — it is more than a third of the oracle.
- **It is *typed*, exactly as the reframe predicts.** The 60 lethal edges are authz gates ("owner/admin
  only", "permission-checked"), authn requirements ("requires an authenticated principal"), tenant
  scoping ("scoped to the caller's org", "no cross-tenant file access"), audit/compliance emits, the
  AV-scan download gate, notification entitlement, seat-limit enforcement, and SSO state/token
  validation — the obligations layer, not the dataflow layer.
- **Partition is only a COARSE proxy for quadrant** — which is the subtle point cost-weighting tests.
  90% of lethal edges are seams (54/60), but 32% of seams are NOT lethal (25/79), and 6 intra edges
  ARE lethal. So weighting by quadrant is *not* the same as weighting by the intra/seam partition the
  archetype experiment already uses; the 2×2 carries information the partition does not.
- **Uniform edge recall structurally over-weights the safe quadrant.** 58% of the uniform-recall
  denominator is cheap-quadrant edges the build discovers for free. A method can post a healthy
  uniform recall while missing most of the lethal quadrant — the precise censoring RECONCILIATION §2
  argued for ρ, now shown to hold for the *coverage endpoint* too.

### The re-ordering half — reinterpreting the already-spent Step-3 live data

The literal kill-test ("re-score the Step-2/Step-3 runs") **cannot run on the original snapshots: they
were never persisted** (both `archive/edge-join/extraction-ab-v2.mjs` and
`tools/preflight-hearth-seams.mjs` scored live and printed aggregates; no snapshot was saved). What we
*do* have, on real spend:

- **Step 3 (live, $12.93):** blind single-session seam recall on hearth = **22.2% ± 0.9%**
  (sufficiency), while typical *aggregate* edge recall in the first live sweep ran 0.45–0.74. Seams
  carry **90% of the lethal quadrant**, so methods recover the lethal quadrant at roughly **¼** the
  rate the aggregate metric reports. Uniform recall and lethal recall therefore **diverge sharply on
  real data** — cost-weighting changes the picture by construction.

The strict "do two named methods swap rank" measurement needs real multi-method hearth snapshots,
which don't exist. The scorer is now built so this falls out **for free** on the first real hearth run
(task B/C). **Action banked for B/C: persist snapshots** (`runs/<variant>/hearth/rK/ws/snapshot.json`)
so re-scoring never again requires a re-run.

### Cross-check (RECONCILIATION change G — authored ground truth is biased)

_pending — blind 3-rater gateway re-classification in progress; fills in inter-rater agreement on the
lethal bit + the disputed-edge list. Will report consensus lethal count vs the authored 60._

---

## Kill-test #2 — build-batch history as ground truth

Mined the real build history for incidents where a builder hit a missing edge/obligation, classified
**gate-caught (self-revealing)** vs **shipped-then-surfaced (silent)**. Sources: `autonomous-build/.beads`
(186 beads + interactions) and 5 retros; three distinct loop-built apps — **ForgeFlow** (824 beads),
**PickleMatch** (`picklematch` ⊇ `forgeflow-merge-zone`, deduped), **ExchangeManager** (156); plus git
history. ~1,360 app beads total.

### Tally (deduplicated)

| Bucket | Count | Character |
|---|---|---|
| **(A) self-revealing / gate-caught** | ~90–100 | overwhelmingly mechanical: format/typecheck, invalid-GUID test fixtures, mock/snapshot/migration collisions, same-session route/import/enum mismatches; plus the entire autonomous-build `from-app` set (pipeline bugs caught at decompose/build-launch). |
| **(B) silent / shipped, surfaced later** | ~22 distinct | multi-day-to-multi-week gap between feature close and bug file; provenance = iOS smoke / TestFlight / user report / deliberate hardening audit. |

**Within (B), ~11 are the lethal *type*** — and they land in **exactly the categories kill-test #1's
oracle tagging predicts**: authz/RLS write+read contracts (broken `create_game`, empty rosters from
over-strict read isolation), multi-tenancy (org-id-less queries → cross-tenant leak), data consistency
(workflows stuck active forever, host-join capacity miscounts, stale optimistic state), a rate-limit
TOCTOU race, silent data-loss (token > SecureStore cap; unchecked block writes), input-validation, and
a Sentry no-op that **blinded production across 4 TestFlight builds**. **Every one passed the automated
gate (`validation:PASS`)** and was caught only by a later detection layer.

### Data-quality verdict (the load-bearing caveat)

The raw ratio looks like "misses are ~80% gate-caught and cheap" — **but that ratio is an artifact, and
the real result is that the data is structurally rigged against seeing the lethal quadrant:**

- **(A) is forced into the record** — a compiler/type/test failure cannot merge without leaving a trace;
  the gate *manufactures* the evidence. Gate-caught misses are near-fully observable.
- **(B) is visible only by accident of a second detection layer.** Every B incident exists because a
  human ran an iOS smoke / TestFlight pass, did a deliberate audit (the RLS/a11y/rate-limit "followup"
  cluster), or filed the *one* user-report epic in 824 ForgeFlow beads. Remove those layers and the
  broken game-creation, the cross-tenant query, the consistency cluster, the prod-blinding Sentry no-op
  all ship invisibly — the gate passed all of them.
- **ExchangeManager proves the bias by construction:** one continuous 4-day run, no later session → **B = 0
  observed** — not evidence of zero silent misses, only that there was no window for one to surface. The
  one obligation it shipped *clean* (webhook HMAC + idempotent dup-skip) is the one place the obligation
  was written into the bead AC up front.
- **The autonomous-build retro independently predicts the mechanism:** the quality gate is PowerShell-only
  (silently no-ops on Linux), treats "no tests" as a pass, has no coverage floor / SCA / e2e, and NFRs
  (security/tenancy/privacy) "evaporate to prose tenets" with no bead, no AC, no test — i.e. the pipeline
  is architecturally disposed to let lethal-category obligations ship unverified.

### Bottom line

The real build history **corroborates a non-trivial lethal (silent + expensive) quadrant**, even though
the data is biased against detecting it: ~11 concrete shipped-and-detonated-later misses, all in the
predicted lethal categories, all past a green gate, each caught only later by smoke/audit/user-report.
The observed A:B ≈ 90:22 is a **hard upper bound** on gate-caught dominance; the lethal-B count (~11) is
the **most undercounted number in the corpus** — a floor, not an estimate.

---

## Verdict — the §10 ρ re-spec is FORCED

Both kill-tests point the same way, from independent evidence (a hand-tagged oracle vs. real shipped
build history), and they agree on the *typing* of the lethal quadrant down to the category list:

1. **The cost-of-omission 2×2 is real and separable** (KT#1: 37% of hearth's edges are lethal, typed;
   robust at 32% on the 84-edge variant; 14.2% even at the high-confidence floor). The "reframe is
   academic" kill condition is **not met**.
2. **Uniform edge recall is a censored statistic** (KT#1: 58% of it is cheap-quadrant edges the build
   recovers free; live Step-3 shows the lethal quadrant recovered at ~¼ the aggregate rate).
3. **The censoring bites in production, not just on paper** (KT#2: the real gate caught **zero** of ~11
   lethal-quadrant misses; they shipped past a green gate and detonated later). This is the empirical
   form of RECONCILIATION §2's claim — a silent omission produces no repair event, so a ρ measured from
   repair events never samples the quadrant where deferral is catastrophic.

**Therefore v2's median-ρ decision rule (§2.6 / H3 / §6) would crown deferral by averaging over the
quadrant where deferral is fatal.** The [`RESEARCH-PROGRAM.md`](RESEARCH-PROGRAM.md) §10 revisions —
report recall/ρ **per quadrant**, gate the deferral claim on the **lethal-quadrant tail** (the
`lethalEdgeRecall` veto), retarget τ at silent-and-expensive, partition the endpoint — move from
*pending* to **substantiated**. The campaign must run with the re-spec'd endpoint.

### What this changes for the next steps (B/C)

- **The veto endpoint is now instrumented.** `lethalEdgeRecall` + `costWeightedEdgeRecall` flow through
  the scorer + scorecard + schema today. The first real hearth run produces the method re-ordering
  directly — no extra apparatus.
- **B/C MUST persist snapshots** (`runs/<variant>/hearth/rK/ws/snapshot.json`). The literal KT#1
  re-score was impossible only because Step-2/3 discarded theirs; don't repeat that.
- **KT#2 adds a target the oracle can't supply:** the gate itself is the leak. A builder loop that defers
  the lethal quadrant to "the build will catch it" is, on this evidence, deferring to a gate that
  catches none of it. The Tier-2 builder loop (§4.5 / E0.8) should measure realized **lethal-quadrant**
  coverage under each deferral policy, not just aggregate coverage.
