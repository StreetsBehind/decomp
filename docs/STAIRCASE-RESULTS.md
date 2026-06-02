# Proof-Staircase — Results Log

_Running log of the cheapest-first proof staircase (SURFACE-DISCOVERY-SPEC §7). Each step is a
falsifiable claim that gates the next. Append results here; do not rewrite history._

| Step | Claim | Status | Result |
|---|---|---|---|
| **0** | the edge/surface ruler is accurate | ✅ **PASS** (2026-06-02) | both rulers mutation-tested; 36 assertions in `npm run selftest` |
| **1** | the typed produces/consumes representation can *express* the true edges | ✅ **GO** (2026-06-02) | ceiling **88.2%**, precision **100%** on `sso-greenfield` |
| 2 | local produces/consumes extraction + join recovers more edges than directly asking | 🟢 **apparatus ready** | held-nodes-constant A/B built (`eval/extract-interfaces.mjs` + `eval/extraction-ab.mjs`); $0 demo on sso-greenfield = Arm-2 88.2% @ 100% precision vs Arm-1 0% unwired. **Live A/B (model annotator) is the gated next run.** |
| 3 | priming with an obligations library raises recall without anchoring | 🟢 **apparatus ready** | three arms + C1 lint + partition (seam) scorer built; needs the `hearth` fixture pinned + placebo length-match (`docs/ARCHETYPE-PREMISE-EXPERIMENT.md` §7–§8) |
| 4 | the diverse ensemble converges; manifest incompleteness is measurable | ⏳ | phase 2 |

---

## Step 0 — mutation-test the rulers ✅

**The spec mis-points Step 0 at `eval/catch-rate.mjs`.** Catch-rate matches planted-gap
`{class,location}` — it is *not* the edge ruler. The actual rulers, now mutation-tested in
[`eval/selftest/ruler-mutation.selftest.mjs`](../eval/selftest/ruler-mutation.selftest.mjs):

- **Recall ruler** — `scoreEdgeCoverage` (via the public thick path `scoreBuildCompleteness`).
  Proven: perfect → 1.0; delete a bridge edge → drops by *exactly* 1/n, localized; delete an edge
  **and its transitive backup** → drops by exactly 2/n, both localized. Pins that the ruler is
  **transitive** (deleting a direct edge masked by `X→Y→Z` correctly does *not* drop) — a regression
  to direct-only matching would fail here.
- **Join ruler** — `scoreJoin` (`eval/join.mjs`), the one that adds **precision** (the recall ruler
  has none — a clique scores recall 1.0). Proven: perfect → recall 1 / precision 1; delete a producer
  → recall drops, localized in `missing[]`; **plant a fake edge → precision drops, localized in
  `spurious[]`**; vocabulary mismatch (`Store:session` vs `Store:sessions`) → no edge (the join is
  deliberately exact — §1.1 vocabulary alignment); partitioned recall (intra-feature vs **seam**) is
  readable separately and a seam producer's death drops **only** seam recall (the anchoring instrument
  the experiment depends on, proven measurable in isolation).

**Kill criterion (not hit):** a ruler that mis-localizes or mis-scores would have failed an assertion.
All 36 pass. Until this passed, every downstream recall number was vibes; it now isn't.

## Step 1 — join-ceiling on `sso-greenfield` ✅ GO

`npm run join-ceiling` ([`eval/join-ceiling.mjs`](../eval/join-ceiling.mjs)) over a hand-authored
produces/consumes annotation
([`experiments/join-ceiling/sso-greenfield.produces-consumes.json`](../experiments/join-ceiling/sso-greenfield.produces-consumes.json)),
one node per requirement planKey, annotated from each component's **genuine** I/O over the lattice
(`eval/lattice.mjs`) — not reverse-engineered from the target edges:

```
CEILING (resource-mediated fraction of true edges): 88.2%  [15/17]
join precision (over-wire guard):                   100.0% [15/15]
```

**Read the number, and the misses.** 15 of 17 required edges fall out of the deterministic join with
**zero over-wiring**. The 2 un-mediated edges are **intrinsic ordering/containment**, *not* lattice
gaps fixable by adding a resource type:

- `callback-handler → login-route` — flow-continuation ("the callback completes the flow login
  started"). The *state* dependency it implies is already resource-mediated (`callback→csrf-protection`
  via `Token:state`); what remains is a pure temporal ordering of two halves of one OIDC handshake,
  arguably redundant.
- `error-states → callback-handler` — containment ("the auth error states are the failure branches of
  the callback flow"): the errors *are* part of the callback, not an artifact it produces and they consume.

**Verdict:** GO. The reframe (edges = a deterministic join over typed produces/consumes) can express
the resource-mediated bulk of the edges cleanly and without over-wiring. ~12% are intrinsic ordering
edges that need a small supplementary ordering signal (or are redundant) — and we learned exactly which,
for $0, before any extraction or model spend. This clears the substrate gate that
[`CURATION-METHOD.md`](CURATION-METHOD.md) §3.3 / §9 sit behind.

> Honesty notes: the annotation is a single hand author's best modelling, so 88.2% is *an attainable
> ceiling under a good annotation*, not a guarantee any extraction pass reaches it (that is Step 2). The
> ceiling is fixture-specific; re-run on `ingest-pipeline` (heavier ordering structure — expect a lower
> ceiling, since pure stage-ordering edges are less resource-mediated) and on `hearth` (the partitioned
> manifest will report the intra-feature vs **seam** ceiling separately) before generalizing.
