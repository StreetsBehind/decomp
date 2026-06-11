# Proof-Staircase — Results Log

_Running log of the cheapest-first proof staircase (archived [`SURFACE-DISCOVERY-SPEC`](../archive/surface-discovery/SURFACE-DISCOVERY-SPEC.md) §7). Each step is a
falsifiable claim that gates the next. Append results here; do not rewrite history._

| Step | Claim | Status | Result |
|---|---|---|---|
| **0** | the edge/surface ruler is accurate | ✅ **PASS** (2026-06-02) | both rulers mutation-tested; 36 assertions in `npm run selftest` |
| **1** | the typed produces/consumes representation can *express* the true edges | ✅ **GO** (2026-06-02) | ceiling **88.2%**, precision **100%** on `sso-greenfield` |
| 2 | local produces/consumes extraction + join recovers more edges than directly asking | 🔴 **NEGATIVE (decisive, REPLICATED)** | K=5 precision-aware A/B, BOTH haiku & sonnet annotators: extraction→join loses to depends_on by **−17.6 pts** (>1σ) in each batch. Sonnet extracts better (Arm-2 16.5%→34.1%) but still loses and over-wires more (required-hit 43% vs 73%). **Model strength isn't the fix** — the bottleneck is structural (§1.1 vocabulary alignment + over-wiring). |
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

`npm run join-ceiling` ([`join-ceiling.mjs`](../archive/edge-join/join-ceiling.mjs), since archived) over a hand-authored
produces/consumes annotation
([`sso-greenfield.produces-consumes.json`](../archive/edge-join/join-ceiling-experiment/sso-greenfield.produces-consumes.json)),
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
for $0, before any extraction or model spend. This clears the substrate gate that the obligations layer
([`OBLIGATIONS.md`](OBLIGATIONS.md); full lifecycle in archived [`CURATION-METHOD`](../archive/surface-discovery/CURATION-METHOD.md) §3.3 / §9) sits behind.

> Honesty notes: the annotation is a single hand author's best modelling, so 88.2% is *an attainable
> ceiling under a good annotation*, not a guarantee any extraction pass reaches it (that is Step 2). The
> ceiling is fixture-specific; re-run on `ingest-pipeline` (heavier ordering structure — expect a lower
> ceiling, since pure stage-ordering edges are less resource-mediated) and on `hearth` (the partitioned
> manifest will report the intra-feature vs **seam** ceiling separately) before generalizing.

## Step 2 — live extraction A/B on `sso-greenfield` 🔴 NEGATIVE (decisive)

The question: does a *model's* local produces/consumes extraction + the deterministic join recover **more**
required edges than the model's own `depends_on`? Node set held constant per run; Arm 1 = the model's
`depends_on`, Arm 2 = annotate the *same* beads → join. Two passes:

- **v1** (`tools/extraction-ab-live.mjs`, K=2, judge-per-edge, $5.43): looked like a **+5.9 pt** win for
  extraction — but Arm-2 variance was **±25%**, over-wiring was unmeasured, and the "win" rode entirely on one
  rich run. Flagged at the time as *directional, not decisive*. It was noise.
- **v2** (`tools/extraction-ab-v2.mjs`, **K=5, precision-aware**, $6.70) — the decisive run. Align manifest
  planKeys → the model's bead ids *once per run* via the requirement-judge's `beadRef` (so both arms score
  deterministically over the same alignment), then measure recall (transitive reachability) **and** an
  over-wiring guard (edge count + required-hit-rate among aligned edges):

```
planKeys aligned/run: [10,10,11,9,11] of 13
Arm1 (depends_on)      recall 34.1% ± 10.5%   edges 26.6   required-hit 57.0%   [35.3,23.5,47.1,23.5,41.2]
Arm2 (extraction→join) recall 16.5% ± 14.0%   edges 28.8   required-hit 50.0%   [17.6,23.5, 5.9, 0.0,35.3]
DELTA recall −17.6 pts (pooled σ 12.4% → exceeds 1σ)   edge ratio Arm2/Arm1 1.08×
```

**Verdict: EXTRACTION LOSES, decisively.** The join over a model's extracted interfaces recovers **half** the
required edges that the model's own `depends_on` does (16.5% vs 34.1%, −17.6 pts > 1σ), and it is **not** an
over-wiring artifact (edge counts nearly equal, 1.08×; required-hit comparable). The K=2 v1 "win" was sampling
noise — the sign flips hard at K=5.

**What it means (the spec's named Step-2 kill-criterion, hit).** Step 1 proved the representation *can* express
88% of the edges *with a perfect hand annotation*. Step 2 shows a **model's actual extraction is far from that
ceiling**: the bottleneck is **extraction quality**, not the representation. The most likely culprit is the
§1.1 **vocabulary-alignment** problem — the join is exact-match on resource names, and a haiku annotator names
the same resource inconsistently across beads (`Store:session` vs `Store:sessions` vs `Store:session-store`),
so the join silently misses the edge. The `slugName` canonicalizer handles casing/separators but not synonyms.

### Sonnet-annotator replication (`AB_ANNOT=claude-sonnet-4-6`, K=5, $6.59) — the negative HOLDS

Same A/B, only the annotator swapped haiku→sonnet (decomposer stays haiku, so Arm-1 is the same *distribution*):

```
                        Arm1 (depends_on)        Arm2 (extraction→join)      delta
haiku annotator:        34.1% ± 10.5%            16.5% ± 14.0%               −17.6 pts   (edges 1.08×)
sonnet annotator:       51.8% ± 16.3%            34.1% ± 13.4%               −17.6 pts   (edges 1.28×, hit 43% vs 73%)
```

Read it right (absolute numbers are noisy batch-to-batch — Arm-1 differs only from different haiku decompose
draws + alignment, NOT the annotator; the **within-batch delta** is the controlled comparison):
1. **Sonnet extracts genuinely better** — Arm-2 absolute recall *doubled* (16.5% → 34.1%). A stronger annotator
   does help the extraction.
2. **But it still loses to `depends_on` by the same −17.6 pts** (>1σ) — the negative **replicated** across both
   annotator strengths, and across two independent K=5 batches.
3. **Sonnet over-wires *more*** — 1.28× the edges at required-hit 43% vs `depends_on`'s 73%: more of its join
   edges are not required.

**Conclusion: the negative is robust to model strength.** The extraction→join reframe underperforms the model's
own `depends_on` whether the annotator is weak or strong — so the bottleneck is **structural** (§1.1 vocabulary
alignment: even sonnet names the same resource inconsistently across beads, so the exact-match join misses edges;
plus over-wiring from coarse shared resources). **Model choice is not the lever; canonicalization is.**

**Implied next moves** (not yet run): (a) implement the spec's **dictionary-first** canonicalization (§1.1: the
model builds a resource dictionary *first*, then beads reference dictionary ids — directly attacks the vocabulary
misalignment that this result fingers as the cause), re-run, and see if the gap closes; (b) if it does not, the
edges-via-local-extraction reframe is insufficient as posed and the supplementary mechanism / a rethink is due.
Either way, Step 2 has done its job: it has *localized* where the reframe breaks.

**Caveats:** one small fixture (13 reqs / 17 edges); alignment covered 9–12/13 planKeys (fair to both arms, caps
absolute recall); cross-batch Arm-1 variance (34%↔52%) shows absolute recall is noisy even at K=5 — the robust
signal is the **replicated within-batch −17.6 pt delta**.

Robustness fixes banked en route: the annotator now retries + fails closed like the judge (a transient CLI
exit-1 during the concurrent fan-out had crashed a paid run); concurrency gentled to 3.

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
