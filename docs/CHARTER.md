# Decomposition Test-Battery — Charter

> **Purpose of this document.** Seed a **new, standalone repo** whose single job is to *empirically
> find the best way to decompose a plan into atomic work-packet beads.* It is written to be
> self-contained: it does not assume the reader has access to the existing `autonomous-build`
> harness, but it folds in that harness's hard-won lessons as prior art (see
> [§8 Prior art](#8-prior-art--lessons-we-are-not-relearning)) so the new repo starts ahead, not from zero.

---

## 1. What we are trying to accomplish

Given a **plan** (the output of a planning stage — a structured spec of an app: its outcomes,
features, must-haves, concerns, and cross-dependencies), there are many possible ways to
**decompose** it into a set of **atomic work packets** ("beads") that an orchestration build agent
then executes. Different decomposition methods — a deterministic expander, a single LLM session, a
large agent swarm, a graph-based EXPAND/AUDIT loop, each at various model/effort settings — produce
materially different bead sets.

We want to **measure** those methods against each other on a fixed battery of test plans and
**declare a winner** on evidence, not intuition. "Winner" is defined precisely in §3.

The deliverable of this repo is **the measurement apparatus**, not a decomposer. The decomposers are
the *things under test*; this repo is the *test rig + the corpus + the scoreboard*.

---

## 2. The central question (the keystone)

Every metric in this repo orbits one question:

> **If an orchestration build agent built out *every* work packet in the decomposition, would the
> result achieve the outcomes the plan describes?**

A decomposition can be internally tidy — well-sized beads, a clean dependency graph — and still fail
this, because it *dropped a requirement*, *missed an edge*, or *produced a bead too thin for a build
agent to act on*. So the keystone breaks into three falsifiable sub-questions:

1. **Edge coverage** — Was *every* dependency the plan implies actually caught and realized as a real
   (transitive) edge in the bead graph? (No missing ordering edge; no dropped cross-feature dep.)
2. **Bead presence & correctness** — Is *every* bead needed to build what the plan outlines present,
   correctly created, and free of scope-drift? Every outcome must reach at least one buildable bead;
   every requirement, surface, concern, and must-have must be covered; no orphans.
3. **Build-readiness** — Does *each* bead carry *all the information a build agent needs* to execute
   it without re-deriving the plan? (Clear acceptance criteria, the files it touches, a test
   plan/cases, resolvable dependencies, enough context to act.)

A decomposition that passes all three is **build-complete**: building its packets achieves the plan.
The apparatus that decides this — the **build-completeness oracle** — is the load-bearing, novel
component of this repo (§5.3). Everything else exists to feed it, vary it, and compare its verdicts
across methods.

---

## 3. What "best" means — the four axes, made measurable

"Best" is not a single number; a method that scores perfectly but drains a session is not best. We
score four axes and report a **Pareto frontier + a transparent composite**, never a single fudged
scalar.

| Axis | Plain meaning | How it's measured |
| --- | --- | --- |
| **Fidelity** | Does building the packets achieve the plan? | The build-completeness oracle (§5.3) + an expansion-fidelity score + omission catch-rate. This is the axis the keystone serves. |
| **Reliability** | Same plan in → same quality out, run after run | Run-to-run variance (stddev of the fidelity composite) over K repeats; a deterministic method ≈ 0 variance = full marks. Stochastic methods get a stated confidence interval. |
| **Cost-effectiveness** | What does one run *cost*? | Output tokens, agent count, and $ per run. Fewer agents = cheaper; an agentless deterministic run is the cheap end of the spectrum. |
| **Efficiency** | How *fast* is one run? | Wall-clock seconds per run. |

**Reporting rule.** The battery emits a leaderboard with all four axes visible and a Pareto frontier
(so a method is "best" only if nothing dominates it on all axes). A composite score may rank the
frontier, but the per-axis numbers and the frontier are always shown — no method "wins" by hiding a
cost or a variance behind a weighted average.

---

## 4. The architecture at a glance

Four components, each independently testable. Three are deterministic; agents appear only inside
methods-under-test and inside one optional oracle tier.

```
  fixture corpus            strategy registry              scoring axes                 battery runner
  (plans + oracles)   ->   (pluggable decomposers)   ->   (fidelity / cost /      ->    (matrix executor
                                                            reliability / efficiency)     + leaderboard)
        §5.2                      §5.1                          §5.3 / §5.4                    §5.5
```

1. **Strategy registry** — every "way to decompose" behind one adapter interface, so the runner
   treats them identically.
2. **Fixture corpus** — a set of plans + per-plan oracles (the ground truth the scorers check against).
3. **Scoring axes** — the scorers, with the **build-completeness oracle** as the keystone.
4. **Battery runner** — the matrix executor (strategy × fixture × K repeats) → per-run scorecards →
   aggregate report → leaderboard.

---

## 5. The components in detail

### 5.1 Strategy registry — pluggable decomposer adapters

Every method under test implements one **adapter contract** so the runner can swap them blind:

- **Input:** a fixture (the plan in whatever forms a method needs — structured lock + prose) and a
  **fresh, empty repo/workspace** to write its beads into.
- **Output:** a **normalized snapshot** of the resulting bead graph (every bead: id, type, status,
  parent, dependency edges, and metadata — files, acceptance criteria, test plan, provenance back to
  the plan entry) **plus a cost record** `{ outputTokens, agents, wallClockSec }`.
- **Self-declared determinism:** each adapter says whether it is deterministic (→ K=1 repeat) or
  stochastic (→ K repeats so reliability/variance is real).
- **Reproducible invocation** for LLM-backed methods: model, effort, and the exact prompt are pinned
  and recorded with the run, so a result can be re-derived.

Candidate strategies to register (the comparison set):

| Strategy | Shape | Why include it |
| --- | --- | --- |
| Deterministic expander | Pure-code: parse → pour → wire → score | The cheap, zero-variance baseline to beat. |
| Single-session LLM | One agent, no subagents | The "just ask the model" baseline. |
| Agent swarm | Many parallel agents (one per feature, plus verifiers) | The expensive, high-coverage end. |
| EXPAND/AUDIT graph loop | Alternate add-nodes / run-completeness-invariants to fixpoint | The hypothesis: cheap determinism + bounded judgment. |
| ± code-structure signal | Any of the above, with/without a real repo dependency-graph input | Isolate the value of structural signal. |
| Model × effort matrix | The same method across model tiers and effort levels | Find the cost/quality knee. |

The registry is the thing that makes "different ways to decompose" a *controlled variable* instead
of an anecdote.

### 5.2 Fixture corpus + oracles

The **fixtures are the constant.** They are **hash-pinned and immutable** — never edited to make a
run pass. A method's score is only ever compared against another's *on the same fixture hash*.

The corpus should span the variation that actually stresses a decomposer:

- **Size** — tiny / medium / large feature counts.
- **Domain** — e.g. a CRUD app, a CLI tool, a data pipeline, a service — so a method isn't tuned to
  one shape.
- **Input thinness** — from a hand-perfect, fully-specified plan to a deliberately *thin* one.
  Thinness matters because **generative completeness** (did we enumerate the right things at all?) is
  won or lost on thin input, and the correct failure mode there is "surface more open questions," not
  "confidently emit a wrong plan."

Each fixture ships an **oracle bundle** — the ground truth the scorers check against:

- **The plan** itself (structured + prose).
- **Planted-gaps file** — known defects deliberately seeded into *variant* fixtures (a dropped
  requirement, an embedded unresolved decision, a write-collision, an oversized session), so we can
  measure whether a method *detects* them. Plus a clean control fixture with **zero** planted gaps to
  measure false-positive rate.
- **Outcome manifest** — the machine-checkable ground truth of "what a correct decomposition *must*
  contain to achieve this plan's outcomes": the full set of outcomes, the required
  requirement/surface/concern nodes, the must-have → bead coverage, and the **complete expected
  dependency-edge set**. This is what makes "were all the edges caught?" falsifiable rather than
  vibes.

Oracle authoring must stay cheap and auditable, and oracles must not make a fixture gameable (a
method can't see them; they're only used to *grade* the snapshot afterward).

### 5.3 The build-completeness oracle (keystone)

This is the apparatus that answers the §2 keystone. It is **tiered, cheapest-first**, so the
always-on gate is deterministic and free, and expensive judgment is opt-in.

**Tier 0 — static graph + field oracle (always on, deterministic, ~0 tokens).**
Build a typed graph from the snapshot + the outcome manifest and run completeness invariants:

- *Edge coverage:* every edge the outcome manifest requires is present as a real (transitive) edge;
  flag every missing one.
- *Bead presence:* every outcome reaches ≥1 buildable bead; every requirement / surface / concern /
  must-have is covered; no orphan beads; no scope-drift bead (every bead traces back to a plan entry).
- *Build-readiness (mechanical):* each bead meets the structural bar — acceptance-criteria count in
  range, files-touched listed, test plan/cases present, dependencies resolvable.

**Tier 1 — bounded build-readiness judgment (opt-in, one bounded pass).**
Where the mechanical readiness check is *ambiguous*, a single agent reads each flagged bead **as if it
were the build agent** and reports `can I execute this? 0 / 0.5 / 1`, naming the specific missing
input. Bounded by the graph (one bead's typed neighborhood as context) — never a per-bead swarm, never
"decompose the app."

**Tier 2 — dry-run / real build (sketched, expensive, when it's worth it).**
A build agent actually attempts the packets (or a simulated subset) and we measure realized outcome
coverage directly. This is the highest-fidelity, highest-cost check; used to *calibrate* the cheaper
tiers, not as the routine gate.

**Output (machine-readable, feeds the ledger):**

```jsonc
{
  "edgeCoverage":   { "score": 0.0, "missing": [ { "edge": "...", "evidence": "..." } ] },
  "beadPresence":   { "score": 0.0, "missing": [ { "outcome|requirement|surface": "...", "evidence": "..." } ] },
  "buildReadiness": { "score": 0.0, "weak":    [ { "bead": "...", "missing": "no test plan", "tier": 0 } ] },
  "verdict": "BUILD-COMPLETE | INCOMPLETE",
  "buildComplete": false
}
```

**How this differs from omission catch-rate.** Catch-rate asks *"did the method DETECT a planted
omission?"* (a property of the method's self-auditing). Build-completeness asks *"would the result
BUILD the outcomes?"* (a property of the produced artifact). A method can score well on one and badly
on the other; the battery reports both.

### 5.4 The other scoring axes (reused / standard)

- **Expansion fidelity** — a parametric score (0–100) over the snapshot: pour coverage, atomicity of
  beads, must-have coverage, dependency topology (no low→high tier edge), acyclicity, reverse-trace,
  cross-dep wiring, concern trace. Mechanical and deterministic.
- **Omission catch-rate** — recall of planted defects vs the planted-gaps oracle, with false-positive
  rate from the clean control.
- **Cost / efficiency** — measured per run from the adapter's cost record.
- **Reliability** — stddev of the fidelity composite over K repeats.

### 5.5 Battery runner + leaderboard

The runner executes the **matrix**: for each `(strategy × fixture)`, run K repeats (K=1 for
deterministic strategies, K≥ a stated minimum for stochastic ones), each in a **fresh workspace**;
snapshot; score on every axis; record cost. Then it aggregates:

- **Per-run scorecards** (every axis + cost).
- **Per-`(strategy, fixture)` aggregates** (mean + variance over K).
- **A battery report** + a human-readable ledger.
- **A leaderboard**: the Pareto frontier across the four axes + a transparent composite to rank the
  frontier. The frontier and all per-axis numbers are always shown.

---

## 6. Methodology & enforcement (how the numbers stay honest)

These are mechanical guards, not honor-system:

1. **Fixtures are hash-pinned and immutable.** A run is only compared against another taken under the
   *same fixture hash*. Changing the corpus starts a new baseline series, explicitly noted. You cannot
   silently swap an easier fixture to make a number go up.
2. **Fresh workspace per run.** Every run starts clean and is reproducible from the fixture alone — no
   leftover state inflates coverage.
3. **One blessed scorer.** A run is scored *only* by the checked-in scorers against the checked-in
   oracles. Mechanical checks can't be argued with; graded checks carry their evidence in the
   scorecard.
4. **The scorers are self-tested.** A selftest pins the scoring math against known-good and
   known-broken synthetic snapshots, and must pass before the harness is trusted.
5. **Append-only ledger.** Every scored run writes one row; trends are auditable.

### Design principles (carried from prior art, see §8)

- **Determinism-first.** Parse, wire, score, and the Tier-0 oracle are pure functions over data —
  testable, free, zero-variance. Agents appear only inside methods-under-test and the opt-in Tier-1
  readiness pass, and even then **bounded** (one pass, typed neighborhood), never a per-bead swarm.
  Every agent costs a point on the Cost axis, by design.
- **Reuse primitives, no drift.** Scorers share one set of graph/index helpers; a new scorer
  *imports* the canonical functions rather than re-implementing them, so two scorers can't disagree.
- **Smallest increments, ratcheted.** Build the apparatus one testable slice at a time; each slice
  proves itself on the corpus before the next.

---

## 7. Definition of done

The repo is doing its job when:

- [ ] ≥ N fixtures (spanning size / domain / thinness) exist, each hash-pinned with a full oracle
      bundle (plan + planted-gaps + outcome manifest + a clean FP control).
- [ ] ≥ 3 decomposition strategies are registered behind the adapter contract and run blind by the
      runner.
- [ ] The build-completeness oracle (Tier 0 + Tier 1) produces a `buildComplete` verdict with
      localized `missing[]` evidence, and its math is self-tested.
- [ ] The battery runner produces a leaderboard with the four axes + a Pareto frontier over the full
      matrix, reproducibly.
- [ ] The repo can answer, with evidence: *"For plans like these, method X is the best decomposition —
      it is the cheapest method on the build-complete frontier, with variance under V."*

---

## 8. Prior art — lessons we are NOT relearning

A prior harness in `autonomous-build/decompose-rebuild/` already proved several things. Carry them
forward; don't rediscover them:

- **A deterministic expander beat every raw model session** on a hand-perfect fixture: ~98.5/100
  fidelity at ~$0 and ~0 variance, vs the best model session ~83 at ~$1.50 and ~45× more variance.
  *Lesson:* determinism is the baseline to beat; make a method *earn* every agent it spends.
- **Fidelity-of-expansion ≠ quality-of-decomposition.** A faithful expander faithfully propagates a
  flawed plan (garbage in, garbage out). *Lesson:* expansion fidelity and build-completeness are
  **different axes** — measure both. This is exactly why the build-completeness oracle and the
  outcome manifest exist.
- **Two kinds of completeness.** *Structural* completeness (everything enumerated is connected, owned,
  verified, atomic) is mechanically checkable — graph invariants. *Generative* completeness (did we
  enumerate the right things at all?) cannot be flagged by any invariant over what exists; it can only
  be *contained* (a checklist floor + bounded judgment) and *measured* (adversarial catch-rate).
  *Lesson:* don't try to make an invariant catch a node nobody created — measure it instead.
- **Failure modes seen in the wild** (each became a check): topologically-invalid graphs (feature work
  sorted ahead of the skeleton); "scores but never reworks" (a read-only scorer that never fixes);
  vacuous passes (zero beads scored, gate passes anyway → assert the scored count); title-vs-id
  resolution false-negatives (resolve by stable provenance key, never by title); silent variable
  coercion; ordering modeled by parent-child instead of real dependency edges.
- **House/tooling quirks** that cost time: the bead tool's backend can desync from its on-disk export
  (treat the export as source of truth); the workflow sandbox bans clock/RNG builtins and has no
  filesystem/shell (all I/O happens in agents or the pure-code host); arg-scanning footguns.

> The single most important inheritance: **keep the deterministic core, add agents only where
> judgment is irreducible, and make every quality claim a number a fixture can falsify.**

---

## 9. Open questions for the human

These are genuine scope/ambition decisions, not things to assume:

1. **How far does build-completeness verification go by default?** Tier 0 (static, free) as the
   always-on gate is settled. Is Tier 1 (bounded readiness agent) on by default, or opt-in per run?
   Is Tier 2 (real dry-run build) in scope for this repo at all, or a later phase / separate harness?
2. **Corpus size & sourcing.** How many fixtures, and do we hand-author them, derive them from real
   past plans, or both? (Real plans are more credible; hand-authored ones are cheaper to equip with a
   clean oracle.)
3. **K for stochastic methods.** What's the minimum repeat count for a credible reliability number,
   given the per-run cost of the expensive strategies?
4. **Composite weighting.** The frontier is always shown, but the composite that *ranks* it needs
   weights across the four axes — should those be fixed, or a knob the user sets per question (e.g.
   "I care most about cost this quarter")?
5. **Reuse vs clean-room.** How much of the existing `decompose-rebuild/` apparatus (graph IR,
   parametric scorer, catch-rate harness) do we port into the new repo as libraries vs rebuild fresh?
