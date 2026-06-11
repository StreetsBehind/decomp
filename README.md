# decomp — the decomposition research battery

Empirically answer: **for a thin plan that will be decomposed _and built_ by cheap models, what
decomposition _policy_ maximizes realized outcome coverage per dollar?** The repo is the **measurement
apparatus** — the test rig, the fixture corpus, the scorers, and the scoreboard. The decomposers are the
*things under test*, behind one adapter contract so the runner compares them blind.

The organizing insight (two independent research lines converged on it — see
[`docs/RECONCILIATION.md`](docs/RECONCILIATION.md)): **the build process is itself a discovery engine.** A
compiler, a linker, a failing test catch most missing dependencies for free, exactly when they bind. So
the job is *not* to enumerate every edge upfront — it is to (1) decompose to the right **granularity** for
a cheap builder, and (2) spend scarce upfront discovery only on the **lethal quadrant**: the omissions
that ship clean and detonate later (security, privacy, consistency, tenancy, idempotency, compliance).
Everything else, let the build find.

## Read in this order

1. **[`docs/RECONCILIATION.md`](docs/RECONCILIATION.md)** — the bridge. Two forks (a granularity/deferral
   program and an obligations/lethal-quadrant line) were built blind to each other; this reconciles them
   and flags the one measurement bug (the repair premium ρ is *quadrant-censored*, not a scalar median).
2. **[`docs/RESEARCH-PROGRAM.md`](docs/RESEARCH-PROGRAM.md)** — the pre-registered program: optimal
   granularity + risk-thresholded deferral under a cheap-model precondition; the keystone moves from the
   static artifact to the decompose-then-build **policy** (Tier-2 micro-builds are the endpoint).
   **§10 carries the pending reconciliation revisions.**
3. **[`docs/OBLIGATIONS.md`](docs/OBLIGATIONS.md)** — the obligations layer: the typed definition of the
   lethal quadrant, and what `τ` should target and the partitioned endpoint should veto on.
4. **[`docs/BUILD-TOLERANT-REFRAME.md`](docs/BUILD-TOLERANT-REFRAME.md)** — completeness as
   cost-of-omission, not coverage; the 2×2 that says which edges to skip and which to chase.
5. **[`docs/STAIRCASE-RESULTS.md`](docs/STAIRCASE-RESULTS.md)** — the settled empirical facts (Step 1 GO,
   Step 2 the decisive edge-join negative) the grids must not re-litigate.
6. **[`docs/PRIOR-ART-COMPLETENESS.md`](docs/PRIOR-ART-COMPLETENESS.md)** — the cross-discipline survey:
   no completeness guarantee exists anywhere; convergence/saturation is the only numeric lens.
7. **[`docs/FINDINGS.md`](docs/FINDINGS.md)** (state + handoff) and **[`docs/CHARTER.md`](docs/CHARTER.md)**
   (the foundational goal + design rules).

## Layout

```
docs/                  Charter, the research program + reconciliation, the obligations layer,
                       the staircase results, prior-art survey, findings/handoff.
schemas/               JSON Schema for every artifact that crosses a boundary (snapshot, cost,
                       outcome-manifest, planted-gaps, build-completeness, scorecard).
strategies/            The methods under test, behind one adapter contract.
  single-session/      "just ask the model" baseline (core.mjs) + the granularity knob;
                       the BLIND (A0) arm of the obligation-priming experiment.
  single-session-{placebo,primed}/   the A1/A2 arms (self-skip without an arm spec)
  swarm/, expand-audit/  fan-out + the de-confounded feedback-signal A/B/C
  granularity.mjs      the L0–L4 dose knob + deterministic merge/split post-pass
eval/                  The scorers (deterministic; agents only in opt-in tiers + the mode's judge).
  build-completeness.mjs   KEYSTONE — Tier-0 static oracle (edge/presence/readiness)
  generative-coverage.mjs  thin-plan judge coverage + per-PARTITION (seam vs intra) recall
  granularity.mjs          measured dose G (atoms/AC/edge-density/depth)
  join.mjs, lattice.mjs    the proven join + resource rulers (Step-0 mutation-tested)
  c1-lint.mjs              obligations-intake gate (rejects a stored edge)
  selftest/                pins every scorer against known-good/known-broken snapshots
runner/                The matrix executor: battery (strategy×fixture×K), judge, leaderboard,
                       model-client (stdin transport + the mock invoke).
fixtures/              The corpus — hash-pinned plans + oracle bundles (hearth is multi-feature,
                       partitioned into intra vs SEAM edges).
experiments/           Per-experiment artifacts (archetype-premise arms, hearth status).
archive/               Parked-not-deleted: the dormant edge-join mechanism + original specs,
                       with a tombstone + revival path. See archive/README.md.
ledger.md              Append-only record of scored LIVE runs.
runs/                  Run outputs (gitignored): runs/mock/** and runs/live/**.
```

## Quickstart

```bash
npm install            # no runtime deps; pins node + the test script
npm run selftest       # the scorers must pass their self-tests before they are trusted
npm run battery:mock   # the full matrix at ZERO spend against the deterministic mock
npm run battery:live   # live against the headless `claude` CLI (SPENDS MONEY)
```

## Status

**Apparatus live; two forks unified.** `npm run selftest` is green (11 suites / 262 assertions);
`battery:mock` runs the full matrix at zero spend. The merge of the v2 program and the archetype-premise
evidence is on the `unified-direction` trunk. The edge-join mechanism is **parked** in `archive/`
(dormant, not dead — Step 2 was a decisive negative; revival path in the tombstone). Next concrete step
per the reconciliation: the two **$0 kill-tests** (cost-weighted hearth re-score + build-batch history)
that confirm or refute the quadrant structure before the Tier-2 build campaign.

## Design rules (non-negotiable — see CHARTER §6)

1. **Determinism-first.** Parse/wire/score and the Tier-0 oracle are pure functions over data. Agents
   appear only inside methods-under-test, the opt-in judge, and the Tier-2 builder loop — bounded.
2. **Reuse primitives, no drift.** Scorers import canonical graph/index helpers; never re-implement them.
3. **Fixtures are hash-pinned and immutable.** Never edit a fixture to make a run pass; that starts a new
   baseline series.
4. **Fresh workspace per run.** Reproducible from the fixture alone.
5. **One blessed, self-tested scorer.** A run is scored only by the checked-in scorers against the
   checked-in oracles. Grader/judge cost is metered and reported **separately**, never charged to a method.
