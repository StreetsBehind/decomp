# Proof-Staircase — Results Log

_Running log of the cheapest-first proof staircase (SURFACE-DISCOVERY-SPEC §7). Each step is a
falsifiable claim that gates the next. Append results here; do not rewrite history._

| Step | Claim | Status | Result |
|---|---|---|---|
| **0** | the edge/surface ruler is accurate | ✅ **PASS** (2026-06-02) | both rulers mutation-tested; 36 assertions in `npm run selftest` |
| **1** | the typed produces/consumes representation can *express* the true edges | ✅ **GO** (2026-06-02) | ceiling **88.2%**, precision **100%** on `sso-greenfield` |
| 2 | local produces/consumes extraction + join recovers more edges than directly asking | 🟢 **apparatus ready** | held-nodes-constant A/B built (`eval/extract-interfaces.mjs` + `eval/extraction-ab.mjs`); $0 demo on sso-greenfield = Arm-2 88.2% @ 100% precision vs Arm-1 0% unwired. **Live A/B (model annotator) is the gated next run.** |
| 3 | priming with an obligations library raises recall without anchoring | 🟢 **apparatus ready + headroom pre-flight PASSED** | three arms + C1 lint + partition (seam) scorer built; `hearth` pinned; live pre-flight confirms measurable seam headroom (below). The full 3-arm sweep is the gated next run. |
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

## Step 3 — headroom pre-flight on `hearth` ✅ GO (first live data)

Before paying for the full 3-arm sweep, the binding question (§8): does **blind** single-session find ANY of
hearth's inter-feature **seams**? If seam recall floors at ~0, anchoring is unmeasurable (the prime can't lower
a floor) and the fixture can't decide the premise. `tools/preflight-hearth-seams.mjs` (LIVE) ran blind A0 ×
K=2, **judging only the 79 seam edges** (method **haiku** — a conservative floor since the sonnet primary finds
≥; judge **sonnet**):

```
seam recall (sufficiency): mean 22.2% ± 0.9%   [22.8%, 21.5%]
seam recall (presence):    mean 25.9% ± 0.9%   [26.6%, 25.3%]
beads/run [59, 58] | edges wired/run [95, 81] | open-questions/run [20, 26]
spend: 160 live calls, ~$12.93
```

**Verdict: HEADROOM OK.** Seam recall is materially **>0 and ≪100%** (≈¼ of seams found), so seam recall can
move in *both* directions — anchoring is measurable and the fixture can decide the premise. Stable (±0.9%). The
open-question channel fired live (20–26/run). Two transport lessons banked: a large multi-feature decompose
exceeds the old 5-min CLI ceiling (raised to 10 min, per-call overridable in `runner/model-client.mjs`), and
**sonnet** runs past even that on hearth — so the live decomposer is run on **haiku** (sonnet remains the
primary the conservative floor generalizes upward to). The full 3-arm sweep (A0/A1/A2) is the gated next run.
