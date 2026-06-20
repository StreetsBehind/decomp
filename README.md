# decomp — the cheap-vs-frontier hybrid research battery

> **Current goal (north star).** Can we build a **system** in which a **cloud frontier model plans and
> orchestrates** while **cheaper lightweight models do all the actual coding** — such that it delivers
> **reliable** software-building at **lower total cost** than using cloud frontier models throughout
> (opus/sonnet/haiku)? The system is the product; the repo is the apparatus that builds and proves it.
> See **[`STATE.md`](STATE.md)** (what/where/next) and **[`docs/PROPOSAL-HYBRID.md`](docs/PROPOSAL-HYBRID.md)**
> (the full statement + win condition).

This repo is the **measurement apparatus** — the test rig, the fixture corpus, the scorers, and the
scoreboard. It already produced an **existence proof on one epic**: a frozen *skeleton* (shared shapes +
a typed cross-cutting obligation contract, authored by the frontier orchestration layer) plus cheap
isolated code-fill + retry matched bare opus on epic cohesion **at $0 coding cost**, and *beats*
monolithic frontier once an epic exceeds ~9 surfaces (which silently drops cross-cutting obligations).

> **Heads-up — this repo pivoted twice.** Most docs were written under earlier headlines
> ("best decomposition method", then "stage-by-stage cheap-vs-frontier"). Their **findings are intact**;
> only the headline question moved. Each legacy doc carries a one-line banner pointing back to
> [`STATE.md`](STATE.md). The **lethal quadrant** (silent + expensive cross-cutting obligations) and the
> **obligations layer** from Era 1 are exactly the reliability metric the current win condition uses.

## Read in this order

1. **[`STATE.md`](STATE.md)** — what we're accomplishing, where we are, what's next. The single source of
   truth for the goal.
2. **[`docs/PROPOSAL-HYBRID.md`](docs/PROPOSAL-HYBRID.md)** — the north-star question, the (both-must-hold)
   win condition, the substrate staging, and how the imported OKF research sits relative to it.
3. **[`docs/REPORT-2026-06-16.md`](docs/REPORT-2026-06-16.md)** — the full evidence synthesis (M0 → the
   M-coh ladder → the skeleton double dissociation).
4. **[`studies/build-gap/RESULTS.md`](studies/build-gap/RESULTS.md)** + **[`DESIGN.md`](studies/build-gap/DESIGN.md)**
   — the build-gap experiments and apparatus (the workspace epic, the scale ladder, the cohesion oracle).
5. **[`studies/meta-search/`](studies/meta-search/)** — the **current live instrument**: DESIGN.md + FREEZE.md
   (frozen apparatus), the P0–P2c records, the EVO-GLEANINGS batches, and Phase −1 (defer to STATE.md for status).
6. The **Era-1 docs** (CHARTER, OBLIGATIONS, BUILD-TOLERANT-REFRAME, RESEARCH-PROGRAM, RECONCILIATION,
   STAIRCASE-RESULTS, PRIOR-ART-COMPLETENESS, KILL-TESTS, ARCHETYPE-PREMISE, FINDINGS) — historical
   headline framing; load-bearing **findings** still feed the current program. Read as evidence, not goal.

## Layout

```
STATE.md               CURRENT goal + status (read first). The source of truth for the direction.
docs/                  PROPOSAL-HYBRID (north star) + REPORT synthesis; plus the Era-1 framing docs
                       (charter, research program, obligations, staircase, prior-art) — banners on top.
studies/               The CURRENT live experiments (the cheap-vs-frontier / hybrid work).
  meta-search/         the pre-registered M5 meta-search instrument — the ACTIVE program: DESIGN.md +
                       FREEZE.md (frozen apparatus), the P0–P2c result records, the EVO-GLEANINGS batches,
                       Phase −1, src/ + gates/. See STATE.md for live status.
  build-gap/           M0 + the M-coh cohesion ladder: the workspace epic, the scale-d{1..4} ladder,
                       the cohesion oracle, the frozen-skeleton lever (DESIGN.md + RESULTS.md).
  oneshot-capacity/    the naked per-model break-point sub-study (feeds the Phase-2 local story).
okf/                   Imported knowledge bundle on automated agentic-workflow optimization. The M5 search
                       was BROUGHT FORWARD as the active discovery instrument (see studies/meta-search/ +
                       STATE.md); the bundle stays REFERENCE material, not the goal.
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

**Existence proof in hand; re-pointed at the hybrid product question.** The Era-1 decomposition battery
is intact (`npm run selftest` green; `battery:mock` runs the full matrix at zero spend; the edge-join
mechanism is parked in `archive/`). The live work is the **cohesion ladder** under `studies/build-gap/`:
M0 (obligation-blindness is tier-independent), M-coh-1.5 (frozen-skeleton + retry = bare opus at $0),
M-coh-3 (monolithic frontier breaks at N≈9), M-coh-2 (the skeleton double dissociation), and M-coh-2.5
(skeleton provenance — **DONE**: frontier authoring necessary; cost win unproven at N=5).

**Current frontier** (per [`STATE.md`](STATE.md), the source of truth — read it for live status): M-coh-2.5 is
resolved, and the active work is the pre-registered **M5 meta-search instrument** under
[`studies/meta-search/`](studies/meta-search/) — P0→P2c done (a PROVISIONAL cost×reliability crossover at N≥13
vs an opus-whole proxy), the P3 prerequisites built, then the **EVO-GLEANINGS** program and the **Phase −1**
GO/HALT characterization. The immediate open step is **Phase −1 block B**; the two remaining P3 prerequisites
are user-deferred **live-spend** runs (the settled routed baseline + the live co-measured INTEG head-to-head).

## Design rules (non-negotiable — see CHARTER §6)

1. **Determinism-first.** Parse/wire/score and the Tier-0 oracle are pure functions over data. Agents
   appear only inside methods-under-test, the opt-in judge, and the Tier-2 builder loop — bounded.
2. **Reuse primitives, no drift.** Scorers import canonical graph/index helpers; never re-implement them.
3. **Fixtures are hash-pinned and immutable.** Never edit a fixture to make a run pass; that starts a new
   baseline series.
4. **Fresh workspace per run.** Reproducible from the fixture alone.
5. **One blessed, self-tested scorer.** A run is scored only by the checked-in scorers against the
   checked-in oracles. Grader/judge cost is metered and reported **separately**, never charged to a method.
