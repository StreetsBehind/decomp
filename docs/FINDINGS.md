# decomp — Findings & Handoff

_Last updated: 2026-06-01. This is the source-of-truth handoff for picking the work up on another
machine. Read it with [`CHARTER.md`](CHARTER.md). The repo answers: **what is the best method for
decomposing a thin plan into atomic work-packet beads?**_

---

## 0. TL;DR — current state

- The apparatus is **built end-to-end and self-tested** (142 selftest assertions: `npm run selftest`).
- It runs at **zero spend against a deterministic mock** (`npm run battery:mock`) and **live against the
  `claude` CLI headless** (`npm run battery:live`). Live wiring is confirmed.
- **The hard pivot is done:** the corpus now tests *generative* decomposition of **thin** plans (the real
  problem), not transcription of a pre-decomposed lock.
- **One scoped live sweep has run** (sso-greenfield × {haiku, sonnet} × all methods × K=3, sonnet judge,
  ~$25–55). It produced preliminary signal **and** surfaced two problems that must be fixed before any
  number is trusted — see §5 and §6.
- **Next:** fix the stdin/argv transport bug (§6.1), de-confound the audit A/B (§6.2), re-run the sweep.

---

## 1. The reframe (why the early version was measuring the wrong thing)

The first cut treated decomposition as a deterministic expand of a `plan.lock.json` that **already
enumerated** features, surfaces, and cross-feature dependencies (the `quicklist` fixture). On that
"thick" input a pure-code expander "wins" — but it is only *transcribing* a decomposition a human already
did. That is not the problem.

**The real problem is generative:** turning a *thin* abstract plan ("users can log in via SSO and log
out") into the full set of atomic packets nobody enumerated up front (provider config, callback route,
session store, token refresh, CSRF, error states, …). That leap is **irreducibly non-deterministic** —
it needs a model's world-knowledge and judgment. The sharpened position we operate under:

> **decomposition = deterministic scaffold + generative fill + deterministic verification.**
> Determinism doesn't vanish; it relocates to the harness and the checkers. The generative fill is the
> part worth measuring, and it is where cost/quality/reliability actually differ between methods.

A corollary worth testing as the corpus grows: **the best method is probably a function of input
thinness/novelty**, not a single winner. Templated/known domains lean deterministic; thin/novel domains
need generation. Mapping that curve is more valuable than crowning one method.

---

## 2. Locked decisions (with rationale)

| Decision | Choice | Why |
| --- | --- | --- |
| **Grading** | Outcome-coverage; ideal-plan diffs + real-build oracle reserved for *calibration* | Many valid decompositions exist; grading against an exact reference would punish good-but-different ones. |
| **Corpus** | Thin abstract plans (lock ⊊ manifest) | The method sees only stated outcomes; the oracle grades against the rich latent set it never saw. |
| **Engine** | Deep comparison first; de-risk on mock before spending | Prove the apparatus discriminates before paying for live runs. |
| **Model invocation** | `claude` CLI headless (`claude -p --output-format json`) | CLI handles auth; `usage`/`total_cost_usd`/`duration_ms` feed the cost/efficiency axes; **no new deps**. |
| **Judge semantics** | Two-part verdict: **presence** + **sufficiency** | Stops generative-coverage from silently absorbing build-readiness (see §4). |

---

## 3. Architecture as built

```
fixtures/            thin plans (lock = stated outcomes only) + RICH outcome-manifest (latent truth)
  quicklist/           THICK control (lock already decomposed) — the contrast case
  sso-greenfield/      THIN — 13 latent requirements, 17 required edges
  ingest-pipeline/     THIN — 14 requirements, 19 edges (heavier ordering structure)
strategies/          methods under test, all behind one adapter; generative ones use ctx.invoke
  deterministic/, flat/            pure-code CONTROLS (zero cost, zero variance)
  single-session/                  one model call
  swarm/                           per-outcome fan-out + integrator
  expand-audit/                    deterministic loop; default audit ON; exports expandAuditNoAudit (A/B)
  registry.mjs                     [deterministic, flat, single-session, swarm, expand-audit, expand-audit-noaudit]
eval/                deterministic scorers (the only non-determinism is the INJECTED judge)
  build-completeness.mjs           KEYSTONE. Thin path folds in judge coverage (see §4)
  outcome-coverage.mjs             mechanical: stated outcome ids on beads
  generative-coverage.mjs          bounded-judgment over latent reqs/edges; judge INJECTED; concurrency pool
  fidelity.mjs, catch-rate.mjs     parametric scorers (catch-rate still unexercised — §7)
runner/
  battery.mjs        matrix executor; --mode mock|live, --models, --judge-model, --fixture, --strategy, --min-repeats
  model-client.mjs   claudeInvoke (CLI) + makeMockInvoke + parseClaudeJson
  judge.mjs          makeClaudeJudge — one bounded call per latent item, two-part verdict, retry+fail-closed
  mock-table.mjs     deterministic mock invoke + stub judge (zero-spend whole-matrix runs)
  leaderboard.mjs    Pareto frontier + transparent composite, grouped by variant
  validate-schema.mjs  dependency-free scorecard validator
```

**Key design invariants:**

- **Strategies never spawn the model themselves.** The runner injects `ctx = { signal, invoke, model }`.
  Live → `claudeInvoke`; mock → `makeMockInvoke`. This makes every method testable at zero spend and makes
  "swap the model" a one-line sweep.
- **Scorers are pure.** The only non-determinism is the injected judge (live) vs stub (test).
- **Mock proves plumbing, not science.** The canned invoke ignores the real model, so mock numbers validate
  wiring/tagging/grouping only — real differences appear only live.

---

## 4. The keystone fold + the two-part judge (the two subtle pieces)

**Keystone fold.** On a thin plan a generative method invents its own `planKey`s, so the keystone's
original `planKey` string-matching scored presence/edge ≈ 0 for everyone. Fixed: on thin fixtures
`scoreBuildCompleteness(snapshot, manifest, { coverage, outcomeCoverage })` takes its presence/edge
sub-scores from the **bounded judge's semantic coverage** (sufficiency), so `buildComplete` means the same
thing thick or thin. Thick path (no `coverage` arg) is byte-for-byte the old mechanical behavior.

**Two-part judge.** Calibration of the first smoke found the judge conflated "a packet of the right scope
exists" with "it's specified well enough to deliver the requirement" — marking present-but-thin packets as
not-covered. So the judge now returns **both**:

- `presence` — a packet/edge of the right scope exists, regardless of AC completeness.
- `sufficiency` — building it would actually deliver the target (false whenever presence is false).

`sufficiency` is the keystone's honest bar (the existing field names point at it); `presence` is the
softer view, reported alongside so the **scope-vs-specification gap** is visible.

---

## 5. First live sweep — results (PRELIMINARY)

Scoped sweep: `sso-greenfield` × {haiku, sonnet} methods × {single-session, swarm, expand-audit,
expand-audit-noaudit} × K=3, **judge fixed at sonnet**. Cost ≈ **$25–55** (method-side measured $6.81;
~600 sonnet judge calls are grader cost, not captured in scorecards — see §7).

| variant | genCov (sufficiency) | edges | present | $/run (method) | K |
| --- | --- | --- | --- | --- | --- |
| expand-audit@**sonnet** | **0.66** | 0.57 | 0.77 | ~0.48 | 3 |
| swarm@sonnet | 0.57 | 0.50 | 0.65 | ~0.81 | 2 ⚠ |
| expand-audit-noaudit@haiku | 0.58 | 0.47 | 0.72 | ~0.39 | 3 |
| single-session@**haiku** | 0.53 | 0.45 | 0.64 | **~0.09** | 3 |
| single-session@sonnet | 0.50 | 0.33 | 0.72 | ~0.22 | 3 |
| swarm@haiku | 0.39 | 0.31 | 0.49 | ~0.37 | 3 |
| expand-audit@haiku | 0.36 | 0.27 | 0.46 | ~0.17 | 3 |
| expand-audit-noaudit@sonnet | — SKIPPED — | | | | 0 ⚠ |
| deterministic / flat | 0.00 | 0.00 | 0.00 | 0 | 1 |

**Read these as directional only** — n=1 fixture, K≤3, and two methodology/infra issues (§6) partially
compromise them. Honest observations:

1. **Nobody is build-complete** (genCov 0.35–0.66). Thin-input decomposition is genuinely hard.
2. **Edges are the universal weak point** (0.27–0.57). Every method enumerates work but under-wires
   dependencies. (Confirmed independently in the smoke: raw single-session wired only ~18% of edges.)
3. **No clean model winner:** sonnet > haiku for expand-audit (0.66 vs 0.36) and swarm (0.57 vs 0.39), but
   a *tie* for single-session (0.50 vs 0.53).
4. **The expensive methods did not clearly earn their cost** here: `single-session@haiku` (0.53,
   ~$0.09/run, 1 agent) matched `swarm@sonnet` (0.57, ~$0.81/run, 4 agents). This is the cost/quality knee
   the charter cares about — early, but striking.

---

## 6. OPEN PROBLEMS — fix before trusting any number

### 6.1 Infra bug: large prompts exceed the Windows argv limit (2/26 runs failed)
`runner/model-client.mjs` `claudeInvoke` passes the prompt as a **command-line argument**
(`claude -p <prompt> …`). The biggest prompts — swarm's integrator and the no-audit re-expander, which
**embed the entire current decomposition** — blow past Windows' ~32 KB argv limit. The CLI even warned
`"no stdin data received in 3s"`. This skipped `expand-audit-noaudit@sonnet` entirely and cost
`swarm@sonnet` a repeat (sonnet is more verbose → bigger prompts → it failed where haiku didn't).
**Fix:** pipe the prompt via **stdin** instead of argv (the CLI wants stdin anyway). After the fix,
re-run so swarm/noaudit on sonnet produce data.

### 6.2 Methodology confound: the audit A/B isn't clean
`expand-audit` (audit ON) **stops at a structural fixpoint** (acyclic, no orphans, ACs present), while
`expand-audit-noaudit` (audit OFF) burns the full iteration budget. On haiku, audit-OFF *beat* audit-ON
(genCov 0.58 vs 0.36) — but that's because audit-ON halts early: **structural completeness ≠ generative
completeness** (CHARTER §8), so it stops while half the latent work is still missing, and blind
re-expansion simply covers more. The A/B currently conflates "audit signal" with "iteration count."
**Fix (pick one):** give audit-OFF the same iteration budget, **or** make the audit check *generative*
gaps (uncovered latent items) rather than only structural invariants. The second is the more interesting
experiment — it directly tests "does an audit/graph catch missed edges?".

---

## 7. Other known gaps & risks

- **Corpus is 2 thin fixtures** of similar "unfold an abstract plan" shape (+ the thick `quicklist`
  control). Need more size/domain/thinness spread, plus a thin **clean control** for false-positive rate.
- **Catch-rate is unexercised:** no fixture ships non-empty `planted-gaps`, so omission catch-rate +
  false-positive rate are untested end-to-end (the scorer itself is selftested).
- **Judge cost is not aggregated** into scorecards (it's grader cost). The judge dominates spend
  (#requirements + #edges single-shot calls per run). Add judge $ to the aggregate before bigger grids.
- **Judge is calibrated only by smoke inspection**, not against ground-truth labels. Tier-1/Tier-2
  calibration (CHARTER §5.3, §9.1) is still open.
- **`runs/` mixes mock + live scorecards**, and `leaderboard.mjs` reads all of `runs/**` — so the rendered
  leaderboard is polluted. Clean `runs/` (it's gitignored) or filter by variant before trusting it; the
  per-run **battery console summary** is clean.
- **Reliability axis** is only real at K≥3 live; mock K shows stddev 0 because the stub is deterministic.
- **Cost reality:** headless `claude -p` pays cache-creation on *every* call, so per-call cost runs well
  above naive token math (a trivial haiku call billed ~$0.05). Budget the judge accordingly.

---

## 8. How to run

```bash
npm run selftest                 # 142 assertions, deterministic, zero spend — must pass
npm run battery:mock             # whole matrix on the deterministic mock — zero spend
npm run leaderboard              # Pareto frontier + composite (NOTE: clean runs/ first — §7)

# Scoped live sweep (SPENDS MONEY — needs an authenticated `claude` CLI on PATH):
node runner/battery.mjs --mode live \
  --fixture sso-greenfield \
  --models claude-haiku-4-5,claude-sonnet-4-6 \
  --judge-model claude-sonnet-4-6 \
  --min-repeats 3

# Cheap live smoke / judge calibration (one method, logs every two-part verdict):
node tools/live-smoke-calibrate.mjs claude-haiku-4-5
```

CLI flags on `runner/battery.mjs`: `--mode mock|live`, `--models a,b,c` (generative only; controls run
once), `--judge-model <fixed>`, `--fixture name[,name]`, `--strategy name[,name]`, `--min-repeats N`.

---

## 9. Next steps (prioritized)

1. **Fix §6.1** (prompt via stdin) — unblocks swarm/noaudit on sonnet. Free.
2. **Fix §6.2** (de-confound the audit A/B). Free.
3. **Re-run the scoped sweep** for a trustworthy A/B + model comparison (~$25–55).
4. Add **judge cost** to the aggregate; **clean `runs/`** of mock scorecards (or namespace mock vs live).
5. Grow the **thin corpus** (more domains/sizes; a thin clean control) and add **planted-gaps** variants to
   exercise catch-rate.
6. Calibrate the **judge** against ground-truth labels before scaling to bigger grids.

> Note: the live calibration tool is tracked at `tools/live-smoke-calibrate.mjs` so it travels between
> machines. The one-off build-verification scripts under `runs/_verify/` (e.g. `check-judge-2part.mjs`,
> `fold-counterfactual.mjs`) are **gitignored** (`runs/*`) and are reproducible from the selftests.
