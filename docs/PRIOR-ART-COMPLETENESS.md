# Prior Art — Decomposition Completeness (cross-discipline survey)

_Source: deep-research run `wf_1048072d-f1f` (2026-06-02). 6 search angles → 26 sources fetched →
127 claims extracted → 25 adversarially verified (3-vote, need 2/3 to kill) → 22 confirmed, 3 killed.
This is the persisted research record; forward-looking reframes built on it live in `FINDINGS.md` /
memory, not here._

## TL;DR

**No discipline has a completeness _guarantee_ for decomposition** — not requirements engineering, not
formal methods, not safety engineering (which takes it most seriously, treating a missed scenario as
equivalent to the incident occurring, and _still_ has no quantitative completeness metric). The best
prior art anywhere delivers exactly two things: **a measurable lower bound on what is still missing**,
and **a typed floor that raises the floor**. That is the ceiling of the field.

Two of our own diagnoses are corroborated:
- **Conservation of difficulty is real.** In all three completeness lenses the residual difficulty
  _relocates_ (to catalog-completeness, to the all-missed class, to "no proof, only gain") rather than
  vanishing. The closest _named_ principle is **Tesler's Law / the Law of Conservation of Complexity**
  (HCI: complexity can be moved, not removed); no source names it as a theorem for decomposition, so our
  version remains a well-supported analogy, not a citable law.
- **Convergence/saturation is the only family that yields a number.** Our §5 north-star is in the right
  family; the alternatives produce a binary or a gain, never an estimate of the residual.

---

## The three lenses — what each guarantees, where each breaks

### Typed floors / checklists — strongest enumerable floor, provably insufficient
- **Best prior art:** Leveson's **RSM completeness criteria** (26, later 60+ formal criteria attached
  element-by-element to a seven-tuple state machine; validated on NASA/NASDA spacecraft, used as a
  checklist). Domain-model **orphan detection** (Arora/Sabetzadeh/Briand, EMSE 2019): _any typed concept
  that no requirement references is a structural signal of a missing requirement._
- **Transferable gold:** orphan detection shows **near-linear sensitivity** — as requirements are
  removed, the count of unsupported typed elements rises near-linearly (surrogate r > 0.96). Hard proof
  that "how much is missing" can be an empirically-tracked quantity, not a binary.
- **Failure mode (a direct instance of conservation):** Leveson: the closure criteria "do not guarantee
  that all assumptions about the environment have been specified... many are application dependent." The
  guarantee is **conditional on the catalog being complete** → difficulty relocated to building the
  catalog. Arora: tacit/deliberately-omitted info creates false alarms; an omission is undetectable if
  the model lacks the concept.
- Sources: `http://sunnyday.mit.edu/papers/completeness.pdf` ·
  `https://link.springer.com/article/10.1007/s10664-019-09693-x`

### Adversarial closure — measurable gain, never a proof
- **Best prior art:** **STRIDE-per-element extending STPA** (microgrid case study: measurably more loss
  scenarios + requirements than basic STPA, because STPA alone has no threat model). **Mutation testing**
  (mutation score = killed / total non-equivalent mutants; a surviving mutant _is_ the operational
  incompleteness signal). **Dialectical inquiry / devil's advocacy** (Schweiger/Sandberg/Ragan 1986,
  AMJ: conflict-based methods beat consensus on assumption quality + completeness).
- **Transferable gold:** the **generator-vs-critic loop** — seed perturbations, find the ones the critic
  misses, force the critic to grow. Mutation testing is the cleanest ratio-valued operationalization.
- **Failure mode:** every method yields a coverage **gain**, never a completeness **proof**.
  Completeness is relativized to the _seeded_ population (the equivalent-mutant / unknown-unknown
  problem). Process hazard analysis frames missed scenarios as themselves the failure mode but proposes
  **no quantitative completeness metric** — only a taxonomy of _why_ completeness fails.
- Sources: `https://www.sciencedirect.com/science/article/abs/pii/S2214212620307857` ·
  `https://mutationtesting.uni.lu/theory.php` ·
  `https://www.sciencedirect.com/science/article/abs/pii/S0950423017304278` ·
  `https://journals.aom.org/doi/10.5465/255859`

### Saturation / capture-recapture — the only lens that estimates a number, with two teeth
- **Best prior art:** **capture-recapture** estimates undiscovered items purely from the _overlap between
  independent generators_ (small overlap → many remain; large → few), yielding a point estimate **+ CI**.
  Provenance is itself the exact cross-domain transfer we propose: **Eick et al. 1992 imported
  Lincoln-Petersen mark-recapture from ecology into software inspection**. **STADS** (Böhme, ESEC/FSE
  2021) extends it to a single adaptive generator via Good-Turing missing-mass ("software testing as
  species discovery").
- **Two hard constraints that bite us:**
  1. **Needs ~4–5 _independent_ generators, not 2.** The reliable estimator (Mh-JK jackknife) is accurate
     only at 4+; at 2 it underestimates (Mt-Chapman preferred there). Minimum 2 just to get any overlap.
  2. **Structurally blind to anything _all_ generators miss** — the estimate is built only from observed
     singleton/doubleton overlap, so a _shared_ blind spot is invisible. For **correlated LLM extractors**
     this is the worst case and biases toward **false completeness**.
- Sources: `https://www.sciencedirect.com/science/article/abs/pii/S0164121203000906` ·
  `https://www.researchgate.net/publication/3188084_A_Comprehensive_Evaluation_of_Capture-Recapture_Models_for_Estimating_Software_Defect_Content` ·
  `https://mboehme.github.io/paper/FSE21.pdf`

---

## Most important transferable mechanism, per distant discipline
- **Ecology → capture-recapture:** an _estimated number_ for what you haven't found yet, from overlap
  alone. Nothing else in the survey turns "are we done?" into a residual + CI.
- **Safety engineering → guideword enumeration (HAZOP/STPA/STRIDE):** a fixed typed catalog applied
  _per-element_ as a forcing function — surfaces omissions unguided analysis misses (a measurable gain),
  and frames a miss as itself the failure mode.
- **Mutation testing → seeded-omission ratio:** completeness made a measurable ratio _relative to a
  generated population_; the surviving seed is the operational "you missed one" signal.

---

## Verdict on "tie a canonical archetype to a feature"
**Orthogonal-to-mildly-supported — a legitimate floor-raiser, never a completeness solver.** Structurally
it _is_ the typed-floor / reference-catalog mechanism (a domain model, STRIDE-per-element, an FMEA
worksheet). The literature supports it as a **sensitivity-bearing coverage cue** (Arora's near-linear
orphan signal) and a **gain driver** (STRIDE/STPA) — but every source attaches the same failure mode:
conditional on the catalog being complete, false-positive on tacit info. Keep it; demote it from "the
mechanism" to "one cue among several."

---

## What the prior art does NOT answer (our two regime questions)
- **(a) Does the join win at scale?** No verified source addresses where global all-pairs relational
  reasoning breaks down with size, or methods that win _specifically_ at scale. **The literature won't
  settle the join-at-scale question — we'd have to run the scaling sweep ourselves.**
- **(b) Intent-vs-artifact (linker needs real symbols)?** No source directly contrasts them — but a
  suggestive pattern: **every saturation/capture-recapture success is on _real artifacts with concrete
  symbols_** (faults in code, branches in running programs), while the typed-floor/spec work is the
  necessary-but-insufficient kind. Weakly leans toward "the join belongs in the mining path," but
  circumstantial.

---

## Hypotheses for the overall problem (synthesis — falsifiable, with kill-tests)

**H1 — Capture-recapture as the completeness instrument.** Estimate remaining undiscovered surfaces from
extractor overlap (Chao/Lincoln-Petersen). The only thing that turns "are we done?" into residual + CI.
_Kill-test:_ on `hearth` (known 162-edge oracle), run K≥5 extractors, compute the estimate, compare to
truth; if it under-counts by the shared-blind-spot margin _even against a known oracle_, it doesn't
transfer. Cheap; no judge.

**H2 — Engineer generator independence** _(the literature's single highest-leverage open experiment)._
Decorrelate the ensemble — different **model families**, different **prompting frames**, and **adversarial
critics seeded from guideword taxonomies** (STRIDE/HAZOP) — so shared blind spots shrink. Fuses all three
lenses: typed floors as _decorrelation seeds_, critics as _independent generators_, saturation as the
_measurement_. _Kill-test:_ measure pairwise surface-overlap (Jaccard) for same-model-different-seed vs
different-family vs guideword-seeded-critic; if decorrelation drops overlap AND raises union recall vs the
oracle → independence is engineerable; if overlap is invariant → blind spots are baked into pretraining.

**H3 — Seeded-omission as the completeness ruler** _(reuses existing apparatus)._ Mutation testing applied
to decomposition: plant known omissions, measure re-discovery rate. `planted-gaps.json` + `catch-rate.mjs`
_is_ a mutation-score-for-decomposition — promote it from side-metric to the discovery-power ruler.
_Kill-test:_ plant N omissions across surface types, measure kill-rate per method/ensemble. Near-free.

**H4 — Archetype as an orphan-cue, not a checklist** _(the demoted archetype)._ Map archetype obligations
→ a feature's decomposition; treat **unreferenced obligations as orphan signals** (Arora) pointing at
likely misses — never as a completeness claim. _Kill-test:_ on `hearth`, check whether orphan obligations
correlate with actual planted/known gaps at Arora's near-linear sensitivity.

**H5 — Surface-first adversarial saturation** _(no join, no archetype-as-answer)._ Drop the edge problem
as the first move. An ensemble proposes surfaces/obligations; a guideword-seeded adversarial critic tries
to name something _every_ generator missed; iterate until the critic dries up K rounds running AND
capture-recapture residual < threshold. Edges computed only _after_ the surface set is judged complete-ish
— you can't join interfaces you haven't finished discovering. _Kill-test:_ run the critic loop on `hearth`
_surfaces_ (not edges); does guideword-seeded criticism find surfaces the generators missed, and does the
loop terminate at a recall plateau above the blind floor?

---

## Refuted in verification (kept for honesty)
- **RSML robustness/tautology criterion as a strong closure guarantee** — killed 0-3. It is the very
  condition Leveson says is insufficient.
- **Dialectical inquiry strictly out-performs devil's advocacy on assumption quality** — killed 0-3. The
  DI-vs-DA ordering is unstable; only "conflict beats consensus" is robust.
- **"Systematic/universal" capture-recapture underestimation** — softened 1-2. Bias is dominant but can
  flip to overestimation in low-overlap regimes.

## Caveats
- This is a synthesis of pre-verified claims, not a fresh exhaustive search; 9 lower-ranked claims were
  budget-dropped.
- **Cross-domain transfer is analogical:** the leap from "reviewers"/"species" to "independent LLM
  spec-extractors" is _our_ proposed transfer, not a result the sources validated. The 4–5-generator
  floor and the all-missed blind spot are properties of the _math_ that carry over; empirical performance
  on LLM-generated decompositions is unproven.
- Source quality uniformly strong (IEEE TSE, JSS, EMSE, AMJ, ESEC/FSE, Elsevier safety journals; Leveson,
  Briand/Sabetzadeh/Arora, Böhme, Wohlin). Two PDFs partly paywalled, verified via reproduced abstracts +
  corroborating sources.
