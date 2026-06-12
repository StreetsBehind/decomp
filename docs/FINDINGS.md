# decomp — Findings & Handoff

_Last updated: 2026-06-11. This is the source-of-truth handoff for picking the work up on another
machine. Read it with [`CHARTER.md`](CHARTER.md) and [`RESEARCH-PROGRAM.md`](RESEARCH-PROGRAM.md)
(the pre-registered v2 design). The repo answers: **what is the best method for decomposing a thin
plan into atomic work-packet beads?** — sharpened by the v2 program to: **what decompose-then-build
policy (method × granularity × risk-threshold × deferral rule) maximizes realized outcomes per
dollar under a cheap-model precondition?**_

---

## 00. RESUME HERE — session 2026-06-11 (latest; SUPERSEDES §0a/§0b below)

The repo is **reshaped around the reconciled direction and is all on `main`** (single branch — the two
prior forks were merged and their branches deleted; PR #1 auto-merged). `npm run selftest` = **12 suites
/ 289 assertions** green; `battery:mock` clean. Everything below §0a/§0b is kept as history.

**What this session did (newest first):**

1. **E0.5 — cheap-tier transport WIRED + proven (commit `71bbb74`).** `makeGatewayInvoke`
   (`runner/model-client.mjs`) calls **jnoccio**, an OpenAI-compatible gateway running live on
   `http://127.0.0.1:4317` (model `jnoccio/jnoccio-fusion`, bearer `jnoccio-local`), as the FREE
   adaptive cheap-model supply. It routes each call across many free upstreams and returns the
   **resolved** model + `winner_model_id` + `request_id` (record these — A8 reproducibility). Live
   smoke `tools/jnoccio-smoke.mjs`: **10/10 valid snapshots across 9 distinct upstreams, 0 truncations,
   $0.** Uniformity guards (temperature 0, `max_tokens=16384` so the gateway's per-model output clamp is
   a no-op) are pinned by `eval/selftest/gateway-invoke.selftest.mjs`. **Decision: keep the FULL gateway
   roster** — do NOT disable low-cap models or restart the shared gateway; the 16k budget +
   **retry-on-invalid** (re-routes past a weak draw) handles truncation/disobedience. **ZYAL was
   evaluated and rejected** (Jekko-runtime-coupled; would inject a confound) — builder uniformity lives
   in our byte-identical prompt-contract + transport. Full detail: memory `jnoccio-gateway-access.md`.

2. **The two research forks were RECONCILED + unified.** A blind v2 program (granularity × deferral ×
   build economics) and the archetype/obligations evidence converged on the same spine
   (build-as-discovery). Read **`docs/RECONCILIATION.md`** — the bridge, and the keystone finding: v2's
   repair-premium **ρ is quadrant-censored**, so the §2.6/H3 median rule would falsely crown deferral.
   The 7 resulting revisions live in **`RESEARCH-PROGRAM.md` §10**, each marked *pending* a $0 kill-test.

3. **Reshaped trunk.** The obligations layer (the typed *lethal quadrant*) is promoted to
   **`docs/OBLIGATIONS.md`**. The dormant edge-join *mechanism* + the original surface-discovery/curation
   specs are parked in **`archive/`** with a tombstone + revival path (dictionary-first canonicalization;
   proof-staircase **Step 2** killed the naive join — see `STAIRCASE-RESULTS.md`). The proven rulers, the
   partition (seam vs intra) scorer, and the 3-arm obligation-priming experiment stayed LIVE.

**Next-work order (the §0b order below is SUPERSEDED — E0.5 is DONE):**

- **A — the two $0 quadrant kill-tests** (`BUILD-TOLERANT-REFRAME.md` kill-tests; `RECONCILIATION.md`
  §6): cost-weighted hearth re-score + build-batch history. They confirm/refute the quadrant structure
  and decide whether the §10 ρ revision is *forced*. This is the original "before we run the research"
  gate — run before any spend.
- **B — grid-mode wiring for the gateway.** Make jnoccio a battery transport (`--mode`/`--transport
  gateway`; the JUDGE stays on the pinned strong claude). **Move retry-on-invalid from the smoke into the
  runner** (A8: retries budgeted to the method, exhausted → score 0) and record the resolved model on the
  cost record / ledger.
- **C — the hearth 3-arm sweep** (obligation-priming → seam recall; Step 3 headroom was GO).
- Then the v2 Phase-0 remainder: **E0.4** (judge calibration + ensemble), **E0.6** (corpus growth —
  multi-feature & seam-partitioned per `RECONCILIATION.md` change E), **E0.8** (Tier-2 builder loop =
  §4.5 host-enforced apparatus, the lightweight in-harness version of the ZYAL principle).

**Blocked on human:** where the big grids run (a persistent machine — wall-clock is the real cost:
~95 s per valid gateway call). Gateway access + an authenticated `claude` (for the judge) are both
present on this machine.

**Durable memory** (loaded every session via `~/.claude/.../memory/MEMORY.md`): see
`v2-archetype-reconciliation`, `jnoccio-gateway-access`, `build-tolerant-reframe`, plus the staircase /
prior-art notes.

---

## 0a. Apparatus update (2026-06-11) — Phase-0 instrument work landed

Four of the v2 program's Phase-0 items are built, selftested (186 assertions), and verified on the
zero-spend mock. **No new live numbers yet** — these change the instruments, so the next live sweep
starts a fresh comparison series for the affected variants:

1. **E0.1 — stdin transport (§6.1 FIXED).** `claudeInvoke` writes the prompt to the CLI's stdin
   (never argv); verified with a 200 KB prompt. The two L1 holes (`expand-audit-noaudit@sonnet`,
   one `swarm@sonnet` repeat) are unblocked for the re-run.
2. **E0.2 — audit A/B de-confounded (§6.2 FIXED).** Every expand-audit variant now performs exactly
   `EXPAND_BUDGET` expand invokes — no fixpoint short-circuit — so the A/B/C isolates the FEEDBACK
   SIGNAL: `expand-audit` (structural Tier-0 gaps), **`expand-audit-gen` (NEW: one bounded model
   audit per iteration names missing latent work — sees only the plan, never the oracle; fully
   billed)**, `expand-audit-noaudit` (blind control). ⚠ `expand-audit`'s identity changed (it no
   longer stops early): its L1 rows are not comparable to its next rows. The early-stop economy is
   now a STOPPING-RULE variable for the granularity experiments, not a hidden confound.
3. **E0.3 — honest accounting.** The live judge meters itself; every scorecard now carries
   `graderCost` (deltaed per run) and the aggregate a `graderTotal` — strictly separate from method
   cost. Runs are namespaced `runs/mock/**` vs `runs/live/**`; the leaderboard reads `runs/live` by
   default (`--mode mock` for the plumbing board); mock runs no longer touch `ledger.md`.
4. **E0.7 — the granularity instrument.** Five operational levels (L0 outcome / L1 epic / L2 task /
   L3 atomic / L4 micro), threaded through every generative strategy as `--granularity L0,...`
   (variant gains `#level`): the level's clause joins the shared contract AND a deterministic,
   content-preserving merge/split post-pass enforces the dose. Every scorecard records the
   REQUESTED level and the MEASURED dose (`eval/granularity.mjs`: G.atoms, AC median/mean, edge
   density, depth) — analyses regress on the measured dose (RESEARCH-PROGRAM A5). The same
   transform is the derived-G merger for E2 (apply to a native-L4 snapshot to derive coarser rungs
   with generative content held constant).

**Still open from Phase 0:** E0.4 (judge calibration set + ensemble judge), E0.5 (OSS transport +
cheap-tier smoke), E0.6 (corpus growth + executable acceptance suites), E0.8 (Tier-2 builder loop).

---

## 0b. Handoff (2026-06-11) — resume here on the next machine

Everything is on branch `claude/optimal-decomposition-strategy-01jwus` (7 commits: the v2 program
docs `8158a59`/`0e6054e`, then E0.1 `70765fc`, E0.2 `53b373d`, E0.3 `da211c2`, E0.7 `ae45156`,
this doc `a1ee172`+). Working tree clean; `runs/` is gitignored scratch. To verify the apparatus on
a fresh clone: `npm run selftest` (186 assertions) then `npm run battery:mock` (zero spend), and the
granularity knob end-to-end via
`node runner/battery.mjs --mode mock --strategy single-session --granularity L0,L2,L4`.

### Standing decisions from the working session (not recorded anywhere else)

1. **Budget is NOT a design input — only outcomes matter.** Already baked into
   `RESEARCH-PROGRAM.md` (§5/§8: builds everywhere, ensemble judge, K=10, full factorials;
   validity-gating only). Don't re-introduce cost compromises when implementing.
2. **THE MODEL SUPPLY (new, this session): the "Pinocchio / JNOCCIO" gateway.** On the human's
   machine, under a path like `workspace/echo`, lives a gateway that intelligently routes calls to
   very cheap or FREE models across many provider APIs. **Directive: those free models are the
   builder + method models for our experiments** (the A1 cheap-tier precondition). Its invocation
   interface is NOT yet known (never inspected — this session's machine didn't have it). First task
   on a machine that has it:
   - Inspect `workspace/echo` (search terms: `echo`, `pinocchio`, `jnocchio`, `gateway`) and
     determine how it's called — HTTP server (OpenAI-compatible?), local library, or CLI.
   - Wire it as an **injected invoke** in `runner/model-client.mjs` alongside `claudeInvoke` —
     same contract: `({prompt, system, model, maxTurns, signal}) → {text, outputTokens, usd,
     wallClockSec}`. The DI architecture means nothing else changes: `--models` sweeps gateway
     model ids; strategies/scorers never know the transport.
   - Mind the contract edges: usd may be 0/unknown for free models (usd:null is supported; tokens
     + wallClock still meter the Cost/Efficiency axes — record them); A8 still applies (retries
     budgeted and billed, exhausted retries score zero — free models will be the flakiest);
     "intelligent routing" must not break reproducibility — pin/record WHICH underlying model
     served each call (extend the cost record's `model` field with the resolved id if the gateway
     exposes it; if it doesn't, that's a methodology problem to flag before any scored sweep).
   - The JUDGE does **not** move to the gateway: grading stays on a strong, fixed, pinned model
     (CHARTER §5.3; the judge is apparatus). Free models are for METHODS and BUILDERS.
3. **Mock-judge title-bias observation** (verification finding, preview of A6): merging renames
   bead titles, which tanked the title-keyed STUB judge's coverage on coarse levels. Mock-only
   artifact, but it is exactly the judge–granularity bias the E0.4 calibration set must quantify
   on the LIVE judge before any dose-response sweep is trusted.

### Next work, in order (from the v2 program's Phase 0)

1. **E0.4 — judge calibration set + ensemble judge.** ~100 labeled (snapshot, latent-item,
   true-label) triples across 3 granularity bins (selftest-style, pure authoring); ensemble
   wrapper (odd panel ≥3, majority vote, disagreement recorded) in `runner/judge.mjs`. Buildable
   offline; running calibration needs live spend.
2. **E0.8 — Tier-2 builder loop** (`runner/builder.mjs` + `schemas/build-record.schema.json` +
   scorecard `realizedCoverage`/`totalPolicyCost`): D0/D1/D2 deferral policies per
   RESEARCH-PROGRAM §2.3/§4.5; testable end-to-end against the mock invoke.
3. **E0.6 — corpus growth**: ≥12 thin fixtures ({3 sizes}×{4 domains}) with EXECUTABLE acceptance
   suites (the Tier-2 ground truth), thin clean controls, planted-gaps variants; 4 held-out
   fixtures authored only after Phase-2 tuning.
4. **E0.5 — cheap-tier transport** = the gateway integration above, plus a smoke proving ≥4 gateway
   models produce valid snapshots on 2 fixtures.

### Blocked on the human

- Gateway access/path + any auth it needs (and confirmation of which free models to sweep).
- An authenticated `claude` CLI wherever live runs happen (judge + L1 re-run + pilot builds).
- Where the big grids run (a persistent machine; sessions like this one are for building the
  apparatus, not hosting the campaign).

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

### 6.1 Infra bug: large prompts exceed the Windows argv limit (2/26 runs failed) — ✅ RESOLVED 2026-06-02
> **Fixed:** `claudeInvoke` now pipes the prompt via **stdin** (`spawnCapture`, `-p` with no positional),
> not argv. Verified by `node tools/transport-smoke.mjs` (200 KB prompt round-trips; non-zero exit / stderr /
> missing-binary all reject). The swarm/noaudit-on-sonnet re-run is now unblocked. Original report below.

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
