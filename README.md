# decomp — the decomposition test-battery

Empirically find the **best way to decompose a plan into atomic work-packet beads**, by running a
rigorous battery of tests across decomposition methods and scoring them on four axes: **fidelity,
reliability, cost-effectiveness, efficiency.**

This repo is the **measurement apparatus** — the test rig, the fixture corpus, and the scoreboard.
The decomposers are the *things under test*; they live behind a single adapter contract so the runner
can compare them blind.

> Read [`docs/CHARTER.md`](docs/CHARTER.md) first. It defines the goal, what "best" means, and the
> keystone: the **build-completeness oracle** that answers *"if a build agent built every packet,
> would it achieve the plan's outcomes?"*

## Layout

```
docs/CHARTER.md          The charter — what we're trying to accomplish + why each piece exists.
schemas/                 The contracts. JSON Schema for every artifact that crosses a boundary.
  snapshot.schema.json         normalized bead-graph (a strategy's output)
  cost-record.schema.json      { outputTokens, agents, wallClockSec }
  outcome-manifest.schema.json the oracle ground truth (outcomes/requirements/surfaces/edges)
  planted-gaps.schema.json     deliberately seeded defects (for catch-rate)
  build-completeness.schema.json  the keystone oracle's output
  scorecard.schema.json        one scored run, all axes
strategies/              The methods under test, behind one adapter contract.
  README.md                    the adapter contract + how to register a strategy
  adapter.mjs                  the registry + contract typedef + validation
  deterministic/, single-session/  strategy stubs
fixtures/                The corpus — hash-pinned, immutable plans + oracle bundles.
  README.md                    corpus design + oracle authoring guide
  quicklist/                   one worked example fixture + full oracle bundle
eval/                    The scorers. Deterministic; agents only in opt-in tiers.
  graph/build-graph.mjs        typed graph IR (snapshot + manifest -> typed graph)
  build-completeness.mjs       KEYSTONE — Tier-0 static oracle (edge/presence/readiness)
  fidelity.mjs                 parametric expansion-fidelity score (/100)
  catch-rate.mjs               omission catch-rate vs planted-gaps
  selftest/                    pins scorer math against known-good/known-broken snapshots
runner/                  The matrix executor.
  battery.mjs                  (strategy x fixture x K) -> per-run scorecards -> aggregate
  leaderboard.mjs              Pareto frontier + transparent composite
runs/                    Run outputs (gitignored).
ledger.md                Append-only record of scored runs.
```

## Quickstart

```bash
npm install            # (no runtime deps yet; pins node + the test script)
npm run selftest       # the scorers must pass their self-tests before they are trusted
npm run battery        # run the full matrix (once strategies + fixtures are wired)
```

## Status

**Live and running.** The full apparatus is built and self-tested (`npm run selftest` — 142 assertions),
runs at zero spend on a deterministic mock (`npm run battery:mock`), and runs live against the `claude`
CLI (`npm run battery:live`). The corpus now tests *generative* decomposition of **thin** plans (the real
problem), with six methods under test (two pure-code controls + single-session / swarm / expand-audit ±
structural-audit). One scoped live sweep has run.

➡️ **Read [`docs/FINDINGS.md`](docs/FINDINGS.md) first** — current state, locked decisions, the first live
results, the two open problems to fix next (an argv-limit transport bug and a confounded audit A/B), and
how to run everything. See also `docs/CHARTER.md` §7 (Definition of done) and §9 (open questions).

➡️ **Then [`docs/SURFACE-DISCOVERY-SPEC.md`](docs/SURFACE-DISCOVERY-SPEC.md)** — the forward design +
execution plan that attacks the one robust finding (edges are the weak point): make edges a deterministic
**join** over a typed produces/consumes interface, seed the search with a **library of obligations**
(never edges), and grade against the **converged union** of diverse generators. Includes a cheap-first
**proof staircase** (Steps 0–4) the next session should execute.

➡️ **For the library write-path, [`docs/CURATION-METHOD.md`](docs/CURATION-METHOD.md)** — develops the spec's
§4 into an operational method: the candidate envelope, the proposed→grounded→recurrent→audited→canon
lifecycle, and the source-agnostic gate made falsifiable (recurrence = source-diversity weighted; the
intrinsic-vs-contextual audit = deterministic contrast-pair instantiation). The runtime gate is substrate-
gated behind proof-staircase Step 1; the intake/lifecycle/adapter layer is buildable independently.

## Design rules (non-negotiable — see CHARTER §6)

1. **Determinism-first.** Parse/wire/score and the Tier-0 oracle are pure functions over data. Agents
   appear only inside methods-under-test and the opt-in Tier-1 readiness pass — bounded, never a swarm.
2. **Reuse primitives, no drift.** Scorers import canonical graph/index helpers; they never
   re-implement them.
3. **Fixtures are hash-pinned and immutable.** Never edit a fixture to make a run pass; that starts a
   new baseline series.
4. **Fresh workspace per run.** Reproducible from the fixture alone.
5. **One blessed, self-tested scorer.** A run is scored only by the checked-in scorers against the
   checked-in oracles.
