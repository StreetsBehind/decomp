# Reconciliation — the v2 Research Program × the Surface-Discovery branch

_Authored 2026-06-11. The v2 program ([`RESEARCH-PROGRAM.md`](RESEARCH-PROGRAM.md), branch
`claude/optimal-decomposition-strategy-01jwus`) was drafted **blind** to the empirical work on branch
`archetype-premise-apparatus` (8 commits: the proof-staircase results, the build-tolerant reframe, the
cross-discipline prior-art survey, the live extraction A/B). This note reconciles the two. It does not
rewrite the pre-registered program — it records, change by change, where the archetype-branch evidence
**confirms**, **re-specifies**, or **corrects** a v2 strategy, so the next machine integrates both
instead of running v2 as written._

> **Cross-reference caveat.** The archetype-branch docs cited below
> (`BUILD-TOLERANT-REFRAME.md`, `STAIRCASE-RESULTS.md`, `PRIOR-ART-COMPLETENESS.md`,
> `ARCHETYPE-PREMISE-EXPERIMENT.md`) do **not** exist on this branch — they live only on
> `archetype-premise-apparatus`. Every link to them is dangling here until the docs-merge in §5
> happens. Read this note with both branches checked out, or merge first.

---

## 0. TL;DR

- The two forks **independently converged** on the same spine — *the build is itself a
  discovery engine, so don't enumerate upfront what the build recovers cheaply.* That agreement is
  corroboration, and it is the most trustworthy thing here. v2's spine survives.
- But the archetype branch advanced v2's **central quantity** (the repair premium ρ) one structural
  step further: **ρ is not a scalar with a meaningful median — it is quadrant-structured, and v2's
  apparatus is censored against the half that matters.** This is a measurement bug, not a taste
  difference, and it propagates into the endpoint, the risk dial, the corpus, and the decision rule.
- Seven v2 strategies change (§3). One v2 contribution is genuinely new and untouched: the
  **granularity dose-response** (keep it whole, §4).

---

## 1. The convergence (state it first, because it is the strongest signal)

| v2 program | archetype branch | |
|---|---|---|
| §0 central hunch: *"decompose ahead of time only the risky parts, and let the build loop discover the rest… the LLM repair premium ρ may be small enough that deferral wins."* | `BUILD-TOLERANT-REFRAME.md` thesis: *"the build process is itself an edge-discovery engine… discovering [self-revealing] edges upfront is redundant with the build."* | **Same claim, derived twice, blind.** |

Two blind derivations agreeing is the result to trust. **v2's deferral thesis is not in question — what is built on top of it is.**

---

## 2. The keystone correction — ρ is quadrant-censored, not scalar

v2 measures one repair premium and decides on its median (§2.6, H3, §6):

> *ρ(r) = cost to discover-and-cover r at build time ÷ cost to cover r at plan time.*
> Decision rule: *"if median ρ < 3, deferral-heavy policies should appear on the Pareto frontier; if
> ρ > 10, shift-left holds."* H3: *"median ρ < 3 for the latent items a coarse decomposition misses."*

The build-tolerant reframe says ρ is **bimodal**, and the mode is predictable a priori from edge type:

|  | **Cheap recovery** | **Expensive recovery** |
|---|---|---|
| **Self-revealing** (compiler/linker/test catches it) | most dataflow wiring — **ρ ≈ 0** | architectural / data-model / ordering — moderate |
| **Silent** (ships clean, detonates later) | low priority | **security · privacy · consistency · tenancy · idempotency · compliance — ρ ≈ ∞** (the *lethal quadrant*) |

Two compounding failures result:

1. **The median is the wrong statistic.** A coarse decomposition that misses (say) 80% cheap-quadrant
   + 20% lethal-quadrant items has median ρ < 3 → v2's rule fires *"deferral wins"* → the policy
   silently drops the 20% that detonate. **H3 would crown deferral precisely by averaging over the
   quadrant where deferral is catastrophic.**
2. **The apparatus cannot even see the lethal quadrant — it is censored.** v2's ρ numerator is
   *"measured from build-record repair events"* (§2.6). A silent omission produces **no repair
   event** — by definition. So lethal-quadrant items never enter the ρ distribution; they fall out as
   *"unrecovered misses."* The measured ρ samples only the cheap quadrant, then a median over a
   cheap-only sample mechanically "confirms" deferral. v2's A4 names the *risk* ("deferral masking
   scope loss") but its mitigation ("unrecovered items score as misses") does **not** fix the decision
   rule — the rule still keys on a censored median.

**Correction:** report ρ as a **distribution split by quadrant**, and gate the deferral claim on the
**silent-expensive tail and its cost-of-omission**, never the median. The quadrant tag is knowable
before the build (it is a property of the *edge type*), so the censoring is fixable by design, not by
more data.

---

## 3. The seven strategy changes

Severity: **CORRECT** = v2 as written would produce a wrong/misleading result; **RE-SPEC** = v2's
instrument is sound but pointed at the wrong target; **HARDEN** = v2 inherits a known failure mode the
archetype branch already has a mitigation for.

| # | v2 element | Archetype-branch evidence | Change | Severity |
|---|---|---|---|---|
| **A** | ρ + H3 + §6 median decision rule | `BUILD-TOLERANT-REFRAME.md` 2×2; censoring argument (§2 above) | Report ρ per quadrant; decide on the silent-expensive tail. | **CORRECT** |
| **B** | §2.5 / A2 primary endpoint = aggregate "realized acceptance-suite coverage" | seam vs intra partition scorer; hearth manifest (47 intra + 37 seam); `ARCHETYPE-PREMISE-EXPERIMENT.md` seam-recall veto | **Partition the endpoint.** An executable suite on a thin fixture tests dataflow = the self-revealing quadrant, so it is blind to silent obligations. Add **lethal-quadrant (obligation/seam) recall** as a *veto* endpoint: a deferral policy that lifts aggregate coverage while dropping seam coverage is **rejected**, exactly as the archetype experiment vetoes an anchoring "win." | **CORRECT** |
| **C** | §2.4 τ risk = "ambiguity / novelty / fan-in-out / state-security, equally weighted" | the typed obligations layer; partition scorer | Risk that matters is **one** axis: silent-and-expensive. Equal-weighting four generic factors dilutes it. Retarget τ at the lethal quadrant, using the archetype branch's typed obligations list. | **RE-SPEC** |
| **D** | v2 **deleted** `SURFACE-DISCOVERY-SPEC.md` (428 ln) + `CURATION-METHOD.md` (362 ln) | both specs define the **obligations layer** = the typed definition of v2's own lethal quadrant | **Restore the obligations layer specifically** (not necessarily the edge-*join* — Step 2 wounded that, see §4). The obligations taxonomy is what makes B and C operational; deleting it discarded the typing the deferral economics depend on. | **CORRECT** |
| **E** | §4.7 corpus = "≥12 thin fixtures {3 sizes}×{4 domains}" | `ARCHETYPE-PREMISE-EXPERIMENT.md` #7: single-feature fixtures *structurally cannot exhibit seams*; hearth is the multi-feature instrument | Build the corpus **multi-feature with intra/seam partition tags**. Seams (auth→everything, RBAC across resources, audit spanning features) **are** the lethal quadrant; a single-feature fixture under-samples exactly the thing the deferral question hinges on. | **RE-SPEC** |
| **F** | §0 / A2 "static build-completeness as a cheap predictor" | `PRIOR-ART-COMPLETENESS.md`: no static coverage metric estimates residual anywhere; **capture-recapture over decorrelated generators is the only lens yielding a number + CI**; coverage ratios bias toward *false* completeness via shared blind spots | If a static predictor is kept, make it the **saturation residual over ≥4 decorrelated generators**, not a manifest-coverage ratio. (Note the 4–5-generator floor and the all-generators-miss blind spot — both bite LLM extractors hardest.) | **HARDEN** |
| **G** | A7 oracle / executable suite "hand-auditable, trusted" | `ARCHETYPE-PREMISE-EXPERIMENT.md` §3: **all 6 authored archetypes smuggled hidden edges** — authored ground truth systematically encodes false assumptions | Treat the hand-authored suite as **incomplete by construction**. Adopt the grow-the-manifest protocol (blind generators → adversarial verifier → *confirmed-real-beyond-manifest rate*) instead of freezing a hand suite as truth. | **HARDEN** |

---

## 4. What stands — and is now better supported

- **Granularity dose-response (H1/H2 inverted-U, the L0–L4 knob, E0.7).** Genuinely new and
  orthogonal — the archetype branch never varied granularity. **Keep it whole.** This is v2's real
  original contribution and nothing here touches it.
- **The Tier-2 builder loop (§4.5 / E0.8).** The *right instrument*: it is exactly what the
  build-tolerant reframe's kill-test #2 ("build-batch history as ground truth") needs to measure the
  quadrant split empirically. It only needs the partitioned endpoint from change B.
- **Method simplicity is favored.** Step 2 (`STAIRCASE-RESULTS.md`) is a **decisive, replicated
  negative**: a model's own `depends_on` beat a clever extraction→join pipeline by **−17.6 pts**
  across both haiku and sonnet annotators. The lesson transfers to v2's D2 / risk-scoring —
  structured elicitation lost to "just ask the model." Don't over-engineer the deferral machinery.
- **Proven rulers.** Step 0 mutation-tested the edge/join scorers; v2's static scorers can reuse them
  instead of re-earning trust.

---

## 5. Branch topology — these two bodies must merge

This is not just a docs problem; it is the reason the v2 program could be drafted against settled
questions. Right now:

- `archetype-premise-apparatus` (8 commits, **local-only until just pushed**) holds the empirical
  results and the surface-discovery/obligations specs.
- `claude/optimal-decomposition-strategy-01jwus` (PR #1) holds the v2 program **and deleted the two
  specs the archetype branch builds on.**

Neither branch alone contains a consistent picture. **Before either becomes "the plan," the two need
a deliberate merge-of-ideas**, not a git auto-merge (which would just re-delete the specs or
re-introduce the dead edge-join). The minimal coherent merge:

1. Keep v2's granularity + builder + cheap-tier-transport apparatus.
2. Un-delete the **obligations layer** from the surface-discovery/curation specs (change D).
3. Fold changes A–C, E–G into `RESEARCH-PROGRAM.md` as revisions to the named sections.
4. Carry the staircase results (`STAIRCASE-RESULTS.md`) forward as established facts the v2 grids
   must not re-litigate (Step 1 GO, Step 2 NEGATIVE).

---

## 6. Recommended next action — the $0 kill-tests, before the campaign

In the cheapest-first staircase spirit that already paid off twice on the archetype branch (Step 1
GO, Step 2 NEGATIVE both redirected the work for ≤$7), run the two **zero-model-spend** kill-tests
from `BUILD-TOLERANT-REFRAME.md` **before** committing to v2's ~10⁴-micro-build campaign:

1. **Cost-weighted re-score of the hearth oracle** — re-tag its edges on the 2×2, re-score the
   existing Step-2/Step-3 runs with cost-weighted (lethal-vs-self-revealing) recall instead of
   uniform recall. *If method rankings re-order, the endpoint re-spec (B/C) is forced — and proven —
   for $0.*
2. **build-batch history as ground truth** — for past builder runs that hit a missing edge, was it
   caught by the gate (self-revealing) or did it ship (silent)? Free, real-world quadrant
   distribution → tells us how big the lethal quadrant actually is, which is the entire premise of §2.

If the quadrants turn out **not** separable on real fixtures, the build-tolerant critique is academic
and v2's median-ρ rule survives — also worth knowing, also for ~$0. Either way, these run before the
campaign spends anything measuring the wrong statistic.

---

## 7. Status — §6 kill-tests RAN (2026-06-11); the keystone correction is substantiated

The §5 merge happened (single trunk on `main`). The §6 kill-tests have now **both run** — see
[`KILL-TESTS.md`](KILL-TESTS.md):

- **KT#1** tagged the canonical 162-edge hearth oracle on the 2×2: **37% lethal**, separable, only
  coarsely aligned with the seam partition (so quadrant-weighting carries information the partition does
  not); uniform edge recall is 58% cheap-quadrant. The quadrants are real on a real fixture.
- **KT#2** found ~11 shipped lethal-quadrant misses in real build history, **all past a green gate** — the
  production form of §2's censoring argument (a silent omission produces no repair event).

**The §2 keystone correction (ρ is quadrant-censored) is confirmed, and the §3 changes A–C are forced.**
The cost-weighted scorer + `lethalEdgeRecall` veto are built/selftested. RESEARCH-PROGRAM §10 moves from
*pending a $0 kill-test* to **substantiated**. Next concrete step is **B/C** (gateway grid + the hearth
3-arm sweep, scored on the re-spec'd lethal-quadrant endpoint), per `FINDINGS.md` §00.1.
