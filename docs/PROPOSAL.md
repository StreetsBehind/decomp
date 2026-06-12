# Proposal — Can harness design make cheap/local models as good as frontier models?

_Draft north-star, 2026-06-12. Supersedes the "best decomposition method" framing as the headline
question (that work becomes one stage-study below). Plain-language on purpose._

## The question

There is always a gap between the model you'd **love** to use and the one you can **afford** to run —
at scale, around the clock, or privately on your own hardware. The frontier moves, but "affordable"
always lags it, and privacy/independence make local models a permanent want. So:

> **Can good infrastructure and harness design close the affordable-vs-best gap for real software work?**

This is relevant to nearly everyone building with AI, and it doesn't go stale.

## The claim (falsifiable)

> A **cheap or local** model, wrapped in the **right harness**, can match a **frontier** model's quality
> — at materially lower cost — for a measurable set of tasks. And an **automated search** can find those
> harness setups better than a human tuning by hand.

Kill conditions: if no harness moves cheap-model quality near frontier on *any* meaningful slice → thesis
dead (useful negative). If cheap models already match frontier bare → question is moot (we check first).

## The key structural idea: study it STAGE BY STAGE

Building software with AI is a pipeline, and **the harness that helps one stage is not the harness that
helps another.** So we don't try to answer the whole question at once. Each stage is a **separate,
self-contained mini-study** with its own input, its own "quality" metric, and its own answer.

| Stage | Input → Output | "Quality" means | Needs code execution? |
|---|---|---|---|
| **1. Plan** | vague intent → structured plan | captures the real requirements + the dangerous obligations | No (grade vs oracle) |
| **2. Decompose** | plan → atomic task DAG | covers the latent work incl. the dangerous misses; sane topology | No (grade vs oracle) |
| **3. Build** | task → working code | passes the task's acceptance checks | Yes |
| **4. Test** | code/spec → tests | the tests actually catch real (esp. silent) defects | Yes |
| **5. Validate/Review** | code → defects found | catch-rate of known/planted defects, low false positives | Partly (feed known-buggy code) |

Each stage gets the **same treatment** (so results are comparable):

1. **Measure the gap** — frontier-bare vs cheap-bare on that stage's metric.
2. **Draw the cost-vs-quality curve** — add `cheap + harness` and see if it reaches frontier quality at
   lower cost.
3. **Rank the levers** (below) — which harness ingredient closes *this* stage's gap per unit of compute.
4. **Verdict for the stage** — cheap+harness is: fully enough / partly / not enough (still need frontier).

## The lever menu (shared across stages; effectiveness differs per stage)

A harness gives a weak model what it lacks. The candidates we test at every stage:

1. **Verification / checkers** — deterministic gates that catch what the weak model silently skips. (The
   lethal-quadrant finding says this is likely the strongest lever — and a cheap checker can guard an
   expensive generator.)
2. **More tries** — sample many cheap outputs, keep the best (spend compute instead of model quality).
3. **Sub-decomposition** — break the stage's job into pieces a weak model can handle.
4. **Knowledge injection / priming** — hand the model the domain knowledge it lacks (e.g. an obligations
   library).
5. **Routing / ensembling** — many cheap models, send each job to the one good at it (what the gateway does).

## The deliverable nobody has

A **stage-by-stage map**: *for which parts of building software is a cheap/local model + harness already
good enough, and where do you still need a frontier model?* Practical, immediately usable advice —
"spend your frontier budget on stages X and Y; cheap is fine for the rest" — plus, per stage, the lever
that buys the most quality per dollar.

## The ambitious extension (later, not first)

An **adaptive, self-tuning harness**: instead of fixed grids, a search that proposes harness
configurations, tests them on the cost-quality curve, and climbs toward the frontier on its own —
finding combinations a human wouldn't hand-tune, which we then *explain*. (Auto-discovered,
human-explained — not "beyond comprehension.")

## The one scope decision (applies to every stage)

**"Cheap" and "local" are different worlds:**
- **Cheap API models** (the gateway today) — smaller gap, faster wins, already wired.
- **Truly local models** (7B–30B on your own GPU) — bigger gap, but the privacy/independence story and
  the more important claim.

**Recommendation: stage it.** Prove the method on cheap-API first, then point it at local.

## What survives from the current repo (a promotion, not a restart)

- **Gateway** → the cheap-model supply (substrate of the whole study).
- **Battery + scorers + retry** → the harness under study.
- **Lethal-quadrant scorer** → both a quality metric *and* the strongest lever (verification).
- **Oracle fixtures + build-history mining** → ground truth.
- **Cheapest-first staircase** → the seed of the adaptive search.

**What changes:** headline question (decompose-method → close-the-gap, stage by stage); decomposition
becomes **Stage 2**, one study among five; the cost-quality curve becomes the primary output of each
stage; a local-model rig gets added in the second scope phase.

## Sequencing (cheapest-first — never eat the whole elephant)

Start with the stages that grade **without executing code** (Plan, Decompose, Validate) — fast, cheap
loops. Save Build/Test (need execution) for later, once the method is proven.

- **M0 — Pick one static-gradeable stage and measure its gap** (frontier-bare vs cheap-bare). Recommended
  first stage: **Decompose** — it has the most existing apparatus, grades purely against the oracle (no
  code run), and the gateway is already proven to decompose the hearth fixture. (Plan and Validate are
  equally valid cheap starts.)
- **M1 — Add the strongest lever (verification) to that stage** and redraw the curve.
- **M2 — Rank all levers for that stage** → first row of the map.
- **M3 — Repeat for the next static-gradeable stage** (Plan or Validate).
- **M4 — Bring in code-execution stages** (Build, Test).
- **M5 — Adaptive search; then push to local models.**

Each milestone can kill or redirect the next, so we never overspend on a dead path.

## Status

Proposal accepted as the draft north-star (2026-06-12). **Decided: start with Stage 3 — Build, on
cheap-API (the gateway) first.** (Build needs code execution, unlike the static stages, but it's the
highest-relevance stage and we keep it cheap by using executable tests as the oracle — no LLM judge.)

### M0 (Build) plan — in progress

A small corpus of self-contained build tasks under `studies/build-gap/`. Each task:
- shows the model a spec for the **happy path only** (+ a fixed interface to implement);
- hides an **executable test oracle in two buckets** — *happy-path* tests and *obligation* tests (the
  dangerous, silently-missed requirements: authz, tenancy, input validation, idempotency). The model
  never sees the obligation tests.

Grading is deterministic + free (run the tests). Measure **frontier (claude) vs cheap (gateway)**, N runs
each → pass-rate on happy-path **vs** obligations, plotted against cost. Hypothesis: cheap models pass the
happy path but silently skip the obligations — the gap a harness lever (verification/priming) should close.
Cheapest-first: prove the rig on the free gateway ($0), then add the frontier baseline.
