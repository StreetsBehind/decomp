# Lens-Ensemble Residual Probe — pre-registered spec (2026-06-16)

> **Roadmap position — read [`STATE.md`](../STATE.md) first.** This is a *proposed-next* experiment. Per
> the current north star ([`PROPOSAL-HYBRID.md`](PROPOSAL-HYBRID.md)), it sits **after** the system clears
> the reliability gate and the cost bar (alongside M5 / workflow-search), not before the crux experiments
> (M-coh-2.5 provenance + cost instrumentation).

_Does decomposing a thin plan through a panel of **lens-diverse** experts recover lethal-quadrant
obligations that **no single pass** finds — and how much lethal mass remains invisible even to the
union? A discovery experiment in the archetype-premise / kill-test lineage (hearth oracle, bounded
judge), NOT the build-gap executable line. Pre-registered before any spend; kill conditions stated
up front._

Related: this is the richer successor to the paused "C" campaign (the hearth 3-arm obligation-priming
sweep in `FINDINGS.md §00.2`). C asked "does one primed arm lift recall?"; this asks "does a panel of
*orthogonal* lenses lift **lethal** recall past a matched-budget homogeneous ensemble, and what's the
residual?" It inherits C's two open blockers (method-model control, judge calibration) and **defuses
both by design** (§8).

---

## 1. Question, hypotheses, kill conditions

**Question.** Take the hearth lethal-edge ground truth (KT#1: 60 of 162 edges tagged
`quadrant:"lethal"` — silent + expensive obligations: authz / authn / tenancy / audit / entitlement /
integrity). Run K **lens** decomposers, each a single pass biased toward one obligation class, union
their decompositions, and measure lethal recall against a **budget-matched homogeneous ensemble** (K
blind passes).

Pre-registered hypotheses (the relative comparison is the kill-test; absolutes are secondary):

- **H1 — lens-diversity is a recall lever.** `lethalRecall(Lens-union) − lethalRecall(Blind-union)` ≥
  **+10 pts** at matched budget. **Kill: ≤ 0** → diversity buys nothing; any ensemble gain was compute,
  not lenses. (This is the load-bearing test. The program already shows the misses are *systematic*
  — `authz@add*Member` erodes identically every run, every tier floors the same non-idiomatic
  obligations — so sample-diversity is predicted to fail and only lens-diversity can win.)
- **H2 — the residual is non-empty.** The union recovers ≥ **3** lethal edges that **every** individual
  lens missed. **Kill: 0** → one good pass dominates; ensembling is pointless for edges.
- **H3 — the shared blind spot is bounded and named.** Report the capture-recapture estimate of lethal
  edges still missing after the union, + the explicit list of never-recovered lethal edges. Not a kill;
  this is the deliverable that tells us where discovery is irreducibly hard (→ typed catalog or human).
- **H4 (secondary) — precision cost is tolerable.** False-obligation inflation per lethal edge gained is
  bounded enough that the converged-union filter (recurrence ≥2 lenses, §5) keeps net value positive.
  Informs the filter; not a kill.

**Moot condition:** if a single blind pass already clears ~90% lethal recall, the whole question is moot
(nothing to recover). Step-3 says it won't — blind seam recall on hearth was **22.2% ± 0.9%**, so there
is large headroom and the metric can move both ways.

---

## 2. Ground truth & scorer (all existing — no oracle changes)

- **Fixture:** `fixtures/hearth/outcome-manifest.json` — the **canonical 162-edge** oracle. Each
  `requiredEdges[i]` carries `{fromPlanKey, toPlanKey, why, partition, selfRevealing, recovery,
  quadrant, quadrantConf}`. **60 are `quadrant:"lethal"`** (54 seam + 6 intra; high-conf floor 35).
  (Do **not** use the dead 84-edge `experiments/.../outcome-manifest.partitioned.json`.)
- **Scorer:** `scoreGenerativeCoverage(snapshot, manifest, judge, opts)` →
  `{ edgeCoverage, overall, presence, edgeCoverageByQuadrant, costWeightedEdgeRecall }`. We read
  `costWeightedEdgeRecall.lethalRecall` (pure lethal recall) and `edgeCoverageByQuadrant.lethal.missing`
  (the **refs of missed lethal edges** — this is what makes the residual computable per lens).
- **Judge:** `makeClaudeJudge(invoke, { model })` — bounded two-part verdict `{presence, sufficiency}`,
  fail-closed. **Pinned, separate from the method model** (apparatus, never on the free pool). An edge
  counts as covered when `sufficiency` is true — i.e. the decomposition has a bead/AC/edge that would
  actually enforce the obligation (semantic, not string-match), so a lens that surfaces authz as an AC
  on the invite bead counts even without a separate authz bead.
- **Judge-cost control:** for per-lens and smoke passes, filter the manifest to lethal edges only —
  `{ ...manifest, requiredEdges: manifest.requiredEdges.filter(e => e.quadrant === 'lethal') }` — cutting
  judge calls from 162 → 60 per snapshot. The scorer already handles a partial manifest (selftest-proven).

---

## 3. The lenses (K = 6 obligation classes, mapped to hearth's lethal categories)

Each lens is a single-session decomposition with a **strong** class bias injected at the arm seam. The
bias instruction (pre-registered template): _"You are the **<class>** reviewer for this plan. Enumerate
**every** <class> obligation it implies — as beads with concrete acceptance criteria and the dependency
edges that enforce them. Depth on YOUR class over breadth; assume another reviewer covers the rest. Do
not invent obligations the plan does not imply."_

| lens | class | hearth lethal categories it owns |
|---|---|---|
| L-authz | access-control | authz gates (invite, role-change, resource ownership) |
| L-authn | authentication & session | authn-required, session-validate, SSO state/nonce/CSRF |
| L-tenant | tenant isolation | org scoping / containment on every read & write |
| L-audit | auditability & compliance | audit-event-write spanning actions |
| L-entitle | entitlement & limits | seat-overage, plan gating, billing→membership |
| L-integrity | integrity & validation | mass-assignment, input validation, AV-scan gate, webhook reconciliation/idempotency |

These six span the lethal categories the kill-test surfaced. The hypothesis is that each lens has
**uncorrelated error on its own slice**, so the union approaches full lethal recall *except* for edges no
class owns — which is exactly the residual we want to measure. (Optional apparatus add, not required for
v1: a one-time `category` tag on each lethal edge — mirroring `author-hearth-quadrants.mjs` — to enable
"own-slice vs others-slice" per-lens analysis. v1 derives lens→edge attribution directly from each lens's
`missing` set, so no re-tag is needed to run.)

---

## 4. Arms (the matched-budget control is the whole point)

Let R = repeats of each whole arm. All method calls on the free gateway with retry-on-invalid (§7).

| arm | what | budget (method calls) | role |
|---|---|---|---|
| **A0 — single blind** | 1 × `single-session` blind | 1 | floor / reference |
| **S_K — homogeneous union** | K blind `single-session`, unioned | K | **sample-diversity control** |
| **L_K — lens union** | the K lenses (§3), unioned | K | **the treatment** |
| **L_K⁺ — lens + integrator** | L_K union → one swarm-style integrator pass | K+1 | does wiring add beyond raw union? (optional) |

**S_K vs L_K is the kill-test.** Both draw K calls from the same free pool; the *only* systematic
difference is the lens block (byte-identical prompt otherwise, via the arm seam). So any L_K − S_K gap is
attributable to lens-diversity, not to compute or to model-mixture luck (§8).

---

## 5. Metrics & the converged-union filter

Per arm, averaged over R repeats (and per individual lens, for the residual):

1. **`lethalRecall`** — headline (`costWeightedEdgeRecall.lethalRecall`). H1 compares L_K vs S_K.
2. **The residual** — lethal edges in `⋂(per-lens missing sets)` that the **union** covers. Drives H2.
   Also report the **never-recovered** set: lethal edges missed by the union itself (the shared blind
   spot) → H3, with the literal edge list (`from->to` + `why`).
3. **Capture-recapture estimate** — treat the K lenses as independent generators over the 60 lethal
   edges; Chao/Lincoln-Petersen point estimate + CI of remaining missing mass. **Reported with the
   prior-art caveat** (`PRIOR-ART-COMPLETENESS.md`): valid only at ~4–5 *independent* generators and
   **structurally blind to anything all lenses miss** — so it is a lower bound on what's missing, never a
   completeness claim.
4. **Converged-union (recurrence) curve** — lethal recall at union thresholds τ ∈ {≥1 lens, ≥2 lenses}.
   ≥2 is the program's recurrence rule (source-diversity weighted); it trades recall for precision and is
   the operational form of the north-star "frozen *converged* union." Report both so the recall/precision
   knee is visible.
5. **Precision cost** (H4) — union obligations with **no** matching manifest requirement/edge (a
   reverse-direction judge pass on a sample of asserted obligations), as a rate per lethal edge gained.
6. **Censoring check (sanity)** — uniform `edgeCoverage.overall` alongside `lethalRecall`. Expectation
   per the kill-test: the union inflates uniform recall via cheap-quadrant edges while lethal recall is
   the metric that actually separates the arms. Confirms we're not fooled by the censored aggregate.

---

## 6. What each outcome means (decision table)

| result | reading | next move |
|---|---|---|
| H1 ✓ & H2 ✓ | lens-diversity is a real discovery lever | build the front-end: lens-ensemble → recurrence filter → freeze into skeleton → cheap+retry build (closes the §8 "where do skeleton obligations come from" gap) |
| H1 ✗ (L_K ≈ S_K) | the win, if any, was compute not lenses | drop ensembling for discovery; the obligation floor must come from a **typed catalog** (archetype/STRIDE-style) or human — locates the irreducible input |
| H1 ✓ but H2 ✗ | best single lens dominates; union adds nothing past it | ship the single best lens prompt, skip the panel |
| H3 residual large & stubborn | a class of lethal obligations no lens (and likely no model) sees | the highest-value finding: names exactly what a catalog/human must supply; feeds `OBLIGATIONS.md` |

Either direction is publishable and decision-valuable — the null (H1 ✗) is the cheap, real kill, exactly
as the archetype experiment framed its own.

---

## 7. Apparatus & reuse (what to build = thin glue over existing parts)

A standalone probe script `tools/hearth-lens-ensemble-probe.mjs` (following the
`tools/hearth-gateway-probe.mjs` precedent — probe scripts roll their own K-loop; the battery is too
heavyweight for this). It reuses, unchanged:

- **Prompt byte-identity:** import `runSingleSession(fixture, ctx, { arm, armBlock })` from
  `strategies/single-session/core.mjs`. The lens block is injected at the seam (core.mjs line ~42, between
  `renderThinPlan` and `snapshotContract`) — guaranteeing the lens vs blind prompts differ *only* by the
  block. The lenses live as a `LENSES = [{ class, block }, ...]` data array in the probe.
- **Transport + retry + reproducibility:** `makeGatewayInvoke()` (returns resolved `model` +
  `route`/`winner_model_id` + `requestId`); wrap each call to capture routes; reject empty/≤0-task-bead
  snapshots and re-route (the `attemptRun` invalid-definition). **Persist every per-lens snapshot, the
  union, and routes** under `runs/lens-probe/<arm>/r<K>/…` — banked KT#1 lesson: *persist snapshots so the
  re-score is reproducible.*
- **Union:** `mergeSnapshots(snaps)` from `strategies/swarm/index.mjs` (union beads by id, union edges,
  drop dangling). For the recurrence curve, also compute a provenance-tagged union (count how many lenses
  asserted each bead/edge) — a ~10-line extension of the merge, not a new mechanism.
- **Scoring:** `scoreGenerativeCoverage(snapshot, lethalManifest, judge)` per lens (lethal-only) and the
  full-162 manifest for the union breadth/censoring numbers. Judge = `makeClaudeJudge(claudeInvoke,
  { model: 'claude-sonnet-4-6' })`.

New code is the probe script + the 6 lens blocks + a small analysis (per-lens/union recall, residual,
capture-recapture, recurrence curve). No changes to scorers, judge, fixture, or oracle.

---

## 8. Confound control — why this can run NOW (defuses C's two blockers)

1. **Method-model mixture (`@gateway ≈ @random-free-model`).** C paused on this. Here it's **controlled
   by the paired design**: S_K and L_K both draw from the same pool, so mixture noise is *balanced*
   across arms — it inflates variance (absorb with R≥5) but cannot bias the L_K − S_K contrast, the only
   comparison H1 rests on. *Option for lower variance:* pin a single cheap claude (haiku) as the method
   model — kills mixture entirely at small $, departs from the free-pool directive; offered, not required.
2. **Judge calibration (E0.4 open).** The kill-test is a **relative** comparison under **one consistent
   judge**, which is robust to a miscalibrated-but-consistent judge (a constant bias cancels in L_K −
   S_K). Absolute lethalRecall numbers still need E0.4 before they're quoted as truth. *Hardening:* an
   **opus** judge spot-check on just the residual + never-recovered sets (the high-stakes, low-volume
   claims), where calibration matters most.

---

## 9. Cost & staging (cheap-first, residual-before-scale)

Method side is **$0** (free gateway), wall-clock-bound (~95 s/valid call, ~50% first-draw empties → ~1.4
attempts). Judge side dominates spend and is the real budget; lethal-only filtering keeps it down.

- **Stage 0 — smoke (R=1, lethal-only judging, A0 + S_K + L_K).** ~ (1 + 6 + 6) snapshots × 60 lethal
  judge calls ≈ **~780 judge calls**. Answers the only two questions that gate the rest: does L_K beat
  S_K on lethal recall *at all*, and is the residual non-empty? **If the residual is empty here, stop —
  ensembling is dead** (per my standing advice: measure the residual before scaling K).
- **Stage 1 — full (R=5, + full-162 breadth on unions, + recurrence curve + capture-recapture + precision
  reverse-pass + opus residual spot-check).** Scale only if Stage 0 shows signal. ~5–6k judge calls.

---

## 10. Deliverables

`tools/hearth-lens-ensemble-probe.mjs` + the 6 lens blocks + analysis; persisted snapshots/routes under
`runs/lens-probe/`; a results section appended to this doc (or a sibling `RESULTS`) reporting H1–H4 with
the verdict, the residual edge list, and the capture-recapture estimate. On a positive verdict, the
obligation-discovery front-end becomes the missing upstream half of the cohesion pipeline (skeleton
obligations are currently hand-authored — see build-gap `RESULTS.md` M-coh-2.5 / the skeleton-provenance
crux).
