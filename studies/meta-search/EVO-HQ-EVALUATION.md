# evo-hq/evo — evaluation against the meta-search program

**Date:** 2026-06-19 · **Branch:** `research/evo-hq-evaluation` · **Repo:** https://github.com/evo-hq/evo (Apache-2.0, v0.6.2 released 2026-06-19, ~1.2k★, 441 commits, author Alok Kumar Bishoyi, built on Karpathy's "autoresearch")

## One-line verdict

evo is a **mature, tested, production implementation of the exact instrument we have been hand-rolling** in `studies/meta-search/src/{map-elites,credit,surrogate,proposer,scale-landscape}.mjs` + the P0–P2c gate/dispatch apparatus. It can replace our **generic search/orchestration plumbing**. It **cannot** replace the thing that is actually the science — the **pre-registered, frozen, non-gameable fitness** and the falsification discipline (FREEZE.md, per-cell veto, oracle-blindness, sequestered TEST). Worse, its default polarity is *adversarial to* a frozen fitness: it exists to drive a metric up as fast as possible and "if you can think of gaming strategies, evo will find them faster." So: **adopt the engine, keep the science ours.**

## ★ What we can glean to improve THIS project (the actual question)

evo is a maximizer with no falsification discipline; we are a falsification study. So we glean **mechanisms**, not the framework. Ranked by leverage for `studies/meta-search`:

1. **Orthogonal-axis / tunnel-vision check (highest value — optimize SKILL §6a).** evo runs a mandatory between-round check: *if 3+ structurally-distinct hypotheses plateau at the same score, OR internal signal is healthy while the benchmark stays flat, the bottleneck is the harness/metric/environment — not the next hypothesis on the visible axis.* Our program has stacked five levers (checker → shape → contract → persistence → integration gate) on the **lever axis** while every headline caveat lives on the **measurement axis** (opus-whole proxy, X-CUT sub-metric, unmeasured INTEG, K=1 noise). Adopt a between-phase "are we on the wrong axis?" gate. It would have classified the per-surface-checker NULL as *structural* (cross-surface seam) immediately. **For P3 the axis to interrogate is the proxy↔real gap, not another lever.**

2. **Living gaming-risk register + per-candidate provenance verifier.** evo keeps a documented "Benchmark gaming risks" register (each risk mitigated by held-out slice / paired gate / sanity assertion) AND runs a standing `verifier` agent **pre and post every experiment** (test-set leakage, subsetted-eval, generic-hypothesis, **score-reproducibility**). Our oracle-blindness defense is currently *episodic* (review rounds + P0 gates). Glean: (a) maintain a living gaming-risk register in FREEZE/DESIGN; (b) add a cheap per-candidate provenance/leakage + **score-reproducibility** check *inside* the search loop, not just at phase boundaries — cheap insurance against the lucky-replicate problem.

3. **Frontier strategy as a swappable, logged knob (+ ablation).** evo exposes argmax / top_k / epsilon_greedy / softmax / **pareto_per_task** and defaults to the last. Our search hardcodes μ-best + MAP-Elites cells. Make parent-selection a configured, logged strategy and **ablate it** — proving our P2c/P3 result doesn't hinge on a particular search policy is a direct anti-"we-overfit-the-search" defense. Low cost.

4. **Eval-epoch / versioned-fitness invalidation (`evo infra event --breaking`).** When the fitness itself is found wrong epoch-wide (score-formula bug, held-out reveals systematic gaming, instrumentation drift), evo bumps an eval-epoch, excludes prior nodes from frontier/best, and forces a rebaseline. **We literally hit this** (the co-evo grader bug → re-grade all 12 cells). A formal eval-epoch makes "frozen-but-later-found-buggy" a clean rebaseline instead of a freeze-violation debate.

5. **Replicate/aggregate discipline — validates worst-of-K.** evo's rule: the frontier MUST see the *same* aggregate the decision uses (median / n=k / worst-of-K); **never promote by best-replicate**; noisy benches commit "lucky" winners. This independently *validates* our worst-of-K choice and flags our latent footgun (cf. the `rate()` bug). The mathtime run hit this live — single-run latency noise faked a −5% "win."

6. **Literature-ideator (open-world levers).** evo spawns ideator subagents that scan arXiv/web for untried techniques. Our lever-invention is closed-world. A literature-ideator phase would surface known output-QA techniques (self-repair, best-of-N, verification-guided decoding) we haven't tried — directly serves "try a million combinations" ([[incompetence-is-the-target]]).

**Strong corroboration (not a glean, but evidence we're right):** an independent team re-derived our two hardest-won invariants — **per-task/pareto over bucket-average** (= our rev.3 per-cell non-inferiority) and an **adversarial leakage verifier** (= our oracle-blindness). Convergent design ⇒ those rev.3 fixes are correct, not idiosyncratic.

**Where WE are ahead (don't over-defer):** formal pre-registration/FREEZE, per-cell non-inferiority as a *frozen invariant*, the surrogate/K7 screen, eff-sample-size gates, multi-objective cost×reliability with lethal-quadrant weighting, and the non-gameable-fitness-as-instrument + falsification framing. evo has none of these.

**Two live confirmations from the mathtime run (both feed our thesis):**
- *Cheap ≠ free:* the Haiku worker spent **$1.18 over 74 turns and never self-completed the protocol** (made edits, said "ready," didn't run the eval) — a vivid instance of the orchestration/output-QA gap that IS our target.
- *Noise fakes wins:* the single-run latency delta (−5%) sat inside run-to-run jitter — the exact lucky-replicate trap worst-of-K exists to kill.

## What evo is

> "Turns your codebase into an autoresearch loop — discovers what to measure, instruments the benchmark, then runs tree search with parallel subagents."

Two commands: `/evo:discover` (find/instrument a benchmark + auto-attach a held-out score-floor gate) and `/evo:optimize` (the loop). A frontier orchestrator writes per-subagent **briefs**; semi-autonomous **subagents** each allocate an experiment, edit only their own **git worktree**, run the benchmark, and commit/discard. Native host support includes **OpenClaw** (our env) and **Codex** (our deliberation tool). Apache-2.0.

## Component-for-component mapping to our apparatus

| Our hand-built piece | evo equivalent | Notes |
|---|---|---|
| Genome search / `p2c-search.mjs` | **Tree search** over committed nodes, frontier-driven | More general than our greedy+archive |
| `map-elites.mjs` (niching, per-cell) | **`pareto_per_task`** frontier strategy ("retain specialists hidden by aggregation") + argmax/top_k/epsilon_greedy/softmax | Directly addresses our rev.3 "bucket-average veto → per-cell" fix |
| `credit.mjs` (credit attribution) | Shared state: **failure traces, annotations, discarded hypotheses**; cross-cutting scan subagents between rounds | RLM-inspired batch trace reading |
| `surrogate.mjs` / K7 | — (no surrogate screen) | We have this; evo does not |
| Gates / regression / veto | **Gates** with explicit `--phase pre|post`; fail ⇒ not committed even if score improves; gate inheritance down the tree | Pre-phase = cheat-detection before spend; post = score-floor |
| Oracle-blindness / provenance-leak rigor | **`verifier`** agent: audits test-set leakage, subsetted eval commands, score-irreproducibility, fake artifacts, missing gates | Institutionalized — but **heuristic/LLM**, not a frozen formal contract |
| Worker agents (skeleton/checker authors) | Subagents in worktrees, model selectable per brief | "faster model for straightforward briefs, stronger for hard ones" |
| Reflective proposal (GEPA/ADAS = M5 fit) | **`ideator`** subagents: `failure_analysis` / `literature` (web+arXiv) / `frontier_extrapolation` | The literature ideator is the reflective-evolution piece |
| Checkpoint/resume + watchdog (our §14) | `EVO_CHECKPOINT_DIR`, attempt_state.json, recovery via re-`evo run` | Plus a dashboard, multi-backend (worktree/pool/ssh/modal/e2b/daytona/aws/azure) |
| — | **`finetuning`** skill: fine-tune a *seed model that accumulates capability across the tree* | Beyond our scope |

## Where the fit breaks (read before adopting)

1. **Opposite polarity at the fitness boundary.** Our science needs a fitness that *resists* being driven up by anything except the real thing. evo is a maximizer that hunts gaming strategies aggressively. That's fine **iff** we feed it a frozen, airtight fitness and never let `/evo:discover` invent one. Use `/evo:optimize` against **our** `evaluateEpic`+frozen gates; **do not** let discover auto-instrument/auto-gate (that re-opens the oracle-shaping / provenance-leak risk our two adversarial review rounds closed).

2. **No variance-aware optimization yet (their own admission).** evo "does **not** yet average across independent runs or use confidence intervals — a noisy benchmark can commit a 'lucky' experiment." This is exactly our worst-of-K / K-run-stability concern (K5=250, K6≥0.90). *Mitigation:* their "Replicated/noisy benchmarks" path lets the **benchmark itself** emit the grouped aggregate (n=k, median, worst-of-K) as the node score — so we'd bake worst-of-K into the harness, not rely on evo to average.

3. **Mid-flight pre-registration risk.** We are **post-FREEZE** with P0–P2c GREEN. Swapping the engine now touches frozen apparatus and risks voiding the freeze and re-introducing circularity (our P2c claim is "the search rediscovers P2b" — a *different* search rediscovering it is actually *stronger* evidence, but only if wired to the frozen fitness).

4. **Cost thesis is structural, not enforced.** Our north star is cost-dominance (frontier orchestrates, cheap codes). evo's orchestrator/cheap-subagent split is *structurally* our architecture and it records `cost={input_tokens,output_tokens,usd,model}` per run — but evo's "win" is *score*, not *cost-at-reliability-parity*. We'd make evo's node score BE our composite (or use a Pareto frontier over {reliability, cost}) so cost can't be gamed away.

## Host: Claude Code (yes — it's the first-class host)

Claude Code is evo's **reference host**, not merely supported: `evo install claude-code`, the heaviest test coverage (`test_claude_code_install_paths`, `test_claude_code_e2e`), and the **only** host with the deterministic **dynamic-Workflow orchestrator driver** (`evo config set default-orchestrator workflow` → runs `skills/optimize/workflows/evo-optimize.js` via the Workflow tool — the same tool this session already has).

**Dispatch mechanism** (`src/evo/hosts/claude_fork.py`): subagents are spawned with `claude -p --resume <SID> --fork-session` — the worker **forks the orchestrator's transcript** for ~99% server-side prefix-cache reuse (cheap children). So both orchestrator *and* workers are Claude Code.

**Model split is built in — this is our architecture, native:**
- Orchestrator = your interactive Claude Code session → run it as **opus** (frontier plans/orchestrates).
- Workers = `claude -p --model $EVO_DISPATCH_MODEL` → set to **haiku** (cheap codes).

**Caveat for our model-agnostic thesis** ([[model-agnostic-and-failure-attribution]]): `EVO_DISPATCH_MODEL` is a **single global** value and the workers are **Claude-family** (haiku) — not the jnoccio open-model **route zoo** ("ANY interchangeable cheap model") our pre-registration requires. To exercise the zoo you'd either (a) run one evo pass per model, rotating the zoo across passes, or (b) point `claude -p` at the gateway via `ANTHROPIC_BASE_URL` (global per run, not per-subagent). So: **Claude Code with haiku-as-cheap = ideal for orchestration + a fast first cost-thesis run; the full route-zoo requirement needs multi-pass or a multiplexing gateway.**

## Recommendation

**Do not swap mid-stream. Adopt at the next phase boundary, as the engine for the *system/product*, not as the grader.**

- **Strongest external signal:** someone built the M5/workflow-search instrument, it's mature and tested, it natively targets OpenClaw+Codex, and it independently re-derived our anti-gaming concerns (verifier) and our niching fix (`pareto_per_task`). This *validates* the "system IS the product" framing and the workflow-search direction.
- **Best first use:** the **P3 routed all-frontier baseline** workstream and/or the post-P3 "freeze the winner as a fixed product" build — run evo with **orchestrator=frontier (opus), subagents=cheap**, scored by **our frozen fitness** (not `/evo:discover`), with worst-of-K baked into the harness. That is a *direct, real-agent* test of the cost thesis the P2a/P2b/P2c proxies only approximated.
- **What stays ours regardless:** FREEZE.md / pre-registration, the non-gameable composite fitness, per-cell non-inferiority veto, the 2nd hand-authored oracle + sequestered TEST. evo is the engine; the gaming-resistant fitness + falsification is the experiment.

## Cheapest next step to de-risk

Run evo on a **toy** target (not the frozen study) to learn its gate/score/Pareto wiring and cost accounting end-to-end:
`uv tool install evo-hq-cli` → `evo install openclaw` → `/evo:discover` on a throwaway repo → one `/evo:optimize subagents=2` round. ~1 evening. Decide adoption for P3 from real behavior, not docs.
