# Build-stage gap study — results

_Stage 3 (Build) of [`../../docs/PROPOSAL.md`](../../docs/PROPOSAL.md). Question: as task SIZE and
harness vary, where do raw models (cheap vs frontier) fall short — and what's the optimal task-size ×
harness? This calibrates what the decompose stage should produce. Append-only log._

## M0 — bare baseline, atomic tasks (2026-06-12)

Setup: 3 self-contained JS build tasks, each shown the **happy-path spec only**; a hidden two-bucket
executable oracle grades happy-path vs **obligation** tests (the dangerous, silently-missed
requirements). Bare model, 1 attempt, no harness. Cheap = jnoccio free gateway (model-mixture);
frontier = `claude-sonnet-4-6`. K=3 (small — first signal). Grading deterministic + free; only the
frontier generations cost money.

| task (obligation) | tier | valid | happy | **obligation** | $/run |
|---|---|---|---|---|---|
| list-projects (tenancy) | cheap | 67% | 33% | 67% | $0 |
| list-projects (tenancy) | sonnet | 100% | 100% | **100%** | $0.15 |
| post-comment (validation) | cheap | 100% | 100% | **0%** | $0 |
| post-comment (validation) | sonnet | 100% | 100% | **0%** | $0.06 |
| update-profile (authz + mass-assign) | cheap | 100% | 100% | **0%** | $0 |
| update-profile (authz + mass-assign) | sonnet | 100% | 100% | **0%** | $0.06 |

### The headline finding: obligation-blindness is (mostly) MODEL-TIER-INDEPENDENT

- **Both tiers pass the happy path** (~100% when the generation is valid).
- **Both tiers skip the obligations** — `0%` on authz, mass-assignment, and input validation, for the
  cheap pool *and* the frontier model. The only obligation a model added unprompted was the
  **tenancy filter** (list-projects), and sonnet did that reliably (100%) while the cheap pool was
  spottier (67%) — plausibly because "filter a list by the caller's org" is an *idiomatic* pattern,
  whereas "reject role escalation in a patch" or "validate body length" are not.
- **Implication:** for the requirements that actually matter (the lethal-quadrant obligations), paying
  for a frontier model barely helps. This is **not primarily a cheap-vs-frontier gap — it's a
  spec/harness gap that hits every tier.** Good for the cheap-model thesis: if frontier isn't worth
  paying for here, cheap + the right harness can match it.

### What the two real gaps are (re-pointing the levers)

1. **Reliability / validity** — the cheap pool sometimes emits invalid code (list-projects 67% valid
   vs sonnet 100%) and is noisier run-to-run. Lever: **retry / sampling** (the gateway re-routes;
   "more tries"). This is a genuine cheap-vs-frontier gap, and a cheap one to close.
2. **Obligations** — *everyone* misses them when the spec doesn't ask. Levers: **(a) name the
   obligations in the task assignment** (the "assignments" axis), and **(b) checkers** that test for
   them and ask the model to fix. Model tier is NOT the lever.

### Caveats

- K=3 is small; the cheap-pool rows are noisy (different free model each draw). Re-run at higher K for
  the cheap tier (it's free). The frontier=sonnet rows are the more stable estimate.
- "Frontier" here is sonnet-4-6, not opus — a cost-conscious proxy. If sonnet already misses the
  obligations, a top model might do better; worth a spot check, but the *happy-pass / obligation-miss*
  split is unlikely to vanish.
- The obligations are guards the **vague spec never asked for** — so "the model didn't add them" is
  partly a spec-quality question. That's the point: it tells us the decompose/plan stages must put the
  obligations *into* the assignment, OR a checker must enforce them. M1 tests exactly that.

## M0 follow-up — OPUS added to the frontier ladder (2026-06-12)

Per the steer "add opus alongside sonnet as a frontier model," `run.mjs --transport claude` now sweeps a
frontier **ladder** (`--frontier-model` is a comma list, default `sonnet,opus`). K=3, same 4 tasks:

| task (obligation) | sonnet obl | **opus obl** | sonnet $/run | opus $/run |
|---|---|---|---|---|
| list-projects (tenancy) | 100% | 100% | $0.055 | $0.244 |
| update-profile (authz + mass-assign) | **0%** | **100%** | $0.043 | $0.125 |
| post-comment (validation) | 0% | 0% | $0.057 | $0.092 |
| mono-user-content (size-3) | 0% | 0% | $0.059 | $0.132 |

**Opus PARTIALLY breaks tier-independence — the frontier-bare bar is higher than the sonnet proxy said.**

- **The clean signal:** `update-profile` obligation goes **0% (sonnet) → 100% (opus)**. Opus adds the
  ownership-authz + mass-assignment (role/orgId/id) guards _unprompted_; sonnet does not. So on at least
  one lethal-quadrant obligation, model tier IS a lever at the top of the ladder. The M0 headline
  ("obligation-blindness is tier-independent") must be softened to: **tier-independent between cheap↔sonnet,
  but opus recovers _some_ obligations** (the idiomatic-ish authz/mass-assignment ones), **not others**
  (`post-comment` body-length validation stays 0% even on opus).
- **What this means for the reframe:** the contender (`cheap+harness`) must now clear **opus-bare**, which
  is a real step up on authz/mass-assignment — but opus-bare still has holes (validation) and costs ~4–5×
  sonnet / ∞× the free pool. The harness opportunity is intact; the bar just got named more honestly.
- **A size×tier hypothesis to test with per-obligation resolution (NOT yet confirmed):** opus does
  `update-profile`'s authz standalone (100%) but `mono-user-content` (which bundles updateProfile +
  listProjects + postComment at size-3) shows 0%. That _could_ mean opus drops the guard it would add
  alone once the chunk is bigger — the U-curve in action — **but** the current `obligation` rate is
  all-or-nothing and `mono` includes the always-missed `post-comment` validation, so 0% is confounded.
  Needs a per-(surface×concern) breakdown to claim the size effect. Flagged for the cohesion instrument
  (§ DESIGN.md), whose `crosscut` bucket scores each surface×concern separately and removes this confound.
- **Caveat:** K=3 (noisy); opus rows are 3 draws each. The 0%→100% jump on update-profile is large enough
  to trust the direction; re-run higher-K if it gates a decision. Data: `runs/m0-claude-k3.json`.

## M0 follow-up — cheap-side at K=5, and the atomic-vs-mono size contrast (2026-06-12)

Cheap (gateway) at K=5, atomic concerns + the monolithic bundle:

| task | valid | happy | obligation |
|---|---|---|---|
| list-projects (tenancy) | 100% | 100% | **100%** (the K=3 67% was noise) |
| update-profile (authz) | 100% | 100% | **0%** |
| post-comment (validation) | 80% | 80% | **0%** (one invalid draw) |
| mono-user-content (all 3, size≈3) | 100% | 100% | **0%** |

**Two things consolidated across cheap+frontier, K=3 and K=5:**

1. **The obligation floor is model-tier-independent AND, so far, size-independent.** The non-idiomatic
   obligations (authz, mass-assignment, validation) sit at **0% for both tiers at both sizes** (atomic
   *and* the size-3 monolith). The one idiomatic obligation (tenancy filter) is done by both tiers.
2. **Happy-path is robust at these sizes** (≤3 concerns) for both tiers — the monolith did not drop a
   sub-feature.

**The methodological consequence for "size axis first" (important for the next session):** with a BARE
model, obligations are floored at 0, so a size curve over obligations is **flat at 0 — uninformative**;
and happy-path doesn't break until tasks are much bigger than 3 concerns. So the size effect only
becomes visible when EITHER (a) tasks are scaled up enough to break the happy path / validity at the
bare baseline, OR (b) a lever lifts obligations off the floor so task size can modulate them. Pure
bare-model size sweeps at small sizes won't show a curve.

## Next (M1) — size axis, made informative (per the "both, size axis first" decision)

Concrete next moves for a fresh session, cheapest-first:

1. **Scale the size ladder up.** Author ~3 more concerns (→ 6) so the monolith is big enough to stress
   the happy path; build a concern-registry + chunk composer so the SAME work can be built at chunk
   sizes {1, 2, 3, 6}; sweep cheap vs frontier and plot happy/validity vs chunk size → find each tier's
   bare break-point. (The current 3 concerns + `mono-user-content` are the seed; size {1,3} is already
   measured and flat — need bigger + more rungs.)
2. **Then the obligation-size curve needs a lever** (since bare obligations are floored): add the
   **assignment lever** (name the obligations in the spec) and re-sweep size — does naming fix it, and
   do big chunks drop *named* obligations? That interaction is the optimal-size-×-harness signal that
   tells decompose what to emit.
3. **Checker lever** (verify + re-prompt) as the model-tier-independent fix for the obligation floor.

## Original M1 sketch — the two levers × task size

1. **Assignment lever:** re-run with the obligations *named* in the spec. Do both tiers then pass? Does
   it hold as task size grows (atomic → monolithic), or do big tasks drop named obligations?
2. **Checker lever:** wrap a cheap model in an obligation-checker that re-prompts on failure; measure
   gap closed per extra call.
3. **Size axis:** atomic (3 separate builds) vs monolithic (`mono-user-content`, all 3 at once), same
   union oracle — does a bigger chunk make a model drop sub-features / obligations? This is the curve
   whose peak tells decompose the optimal task size, per tier, per harness.

---

# M-coh — the COHESION turn (2026-06-12) — see [`DESIGN.md`](DESIGN.md)

The reframe (harness SHAPE × task SIZE → a *cohesive epic*; bar = `frontier-bare`, contender =
`cheap+harness`). New instrument: the `workspace` epic (5 connected surfaces, shared multi-tenant model,
a deliberate addMember→postComment membership seam), a multi-module sandbox, and a 3-bucket oracle —
**wire**ability, cross-cutting **uniformity** (X-CUT), and **integ**ration. Oracle mutation-tested
(`tools/epic-oracle-selftest.mjs`): scores a correct epic 5/4/7/3 and detects drift + fragmented guards.

## M-coh-0 (anchors) + M-coh-1 (the skeleton lever)

| condition | K | wire | happy | **X-CUT** | **integ** | **epic✓** | $/epic |
|---|---|---|---|---|---|---|---|
| cheap-isolated (naive `/build-batch`, BARE) | 5 | 96% | 90% | **31%** | **27%** | **0%** | $0 |
| cheap-skeleton (frozen shared contract) | 5 | 92% | 95% | **91%** | **60%** | **60%** | $0 |
| sonnet-whole **bare** | 3 | 100% | 100% | **29%** | 67% | **0%** | $0.034 |
| **opus-whole bare** (THE BAR) | 3 | 100% | 100% | **100%** | **100%** | **100%** | $0.252 |

### Finding 1 — the cohesion gap is REAL, and per-task quality is blind to it (C1 ✓)
Every condition builds individually-working features (**happy 90–100% everywhere**), yet cross-cutting
uniformity and integration **collapse** for everything except opus. The thing you pay a frontier model for
here is **not writing the function — it's enforcing tenancy/authz uniformly across the whole epic.** That
lives at the epic level and is invisible to a per-task oracle (this is the lethal quadrant, measured).

### Finding 2 — "more context" is NOT the fix; whole-context bare sonnet still fails cohesion
`sonnet-whole-bare` SEES the entire epic in one call and *still* scores **29% X-CUT** and fails cross-org
isolation. It gets only the **stated/idiomatic** guards (the 2/7 it passes are `tenancy@createProject` and
`authz@postComment` — and `postComment`'s "only a member may post" was *stated* in the spec); it never
adds the 5 hidden cross-cutting obligations. So the bar is really **opus**, not "frontier" — and you can't
reach it just by handing the cheap model more context. The harness has to *supply the obligations*.

### Finding 3 — the skeleton lever CLOSES the cohesion gap; the residue is RELIABILITY (C2 ✓, with a caveat)
`cheap-skeleton` is **bimodal**: 3/5 runs are **perfect cohesive epics** (wire/happy/X-CUT/integ all 100%
— i.e. the free pool *equals opus-bare* at **$0** vs $0.25), and 2/5 runs fail **only because wire = 80%**
(the free pool emitted one invalid chunk → a missing surface sinks the cross-module flows → integ 0%). So:
- The skeleton **solves cohesion** (X-CUT 31%→100%, integ 27%→100%) *conditional on every surface building*.
- The remaining gap to a guaranteed epic is **not cohesion — it's the cheap pool's reliability** (invalid
  generations), which is the OTHER M0 gap and has its own cheap lever (**retry / best-of-K**, free via the
  gateway re-route). Prediction: `skeleton + retry` ≈ `opus-bare-whole` on the full epic, at ~$0.

### What the skeleton is actually doing (an ablation target for M-coh-2)
It solves **two** distinct problems at once: (a) **interface drift** — pinning the membership shape so
addMember↔postComment agree (the part isolated-cheap fails that *whole*-anything doesn't, because one
context can't drift against itself); and (b) **cross-cutting fragmentation** — stating tenancy/authz so
they don't fragment (the part *everyone below opus* fails). M-coh-2 should ablate a shape-only vs
obligations-only skeleton to see which clause buys which metric.

### Cost-vs-cohesion crossover (the headline for the user's question)
For a cohesive epic at this size, the choices are: **opus-bare-whole @ $0.25/epic**, or **free-pool +
frozen-skeleton @ $0** (matching opus when wired; needs the retry lever to guarantee wiring).
`sonnet-bare` — at any context scope — **does not produce a cohesive epic at all.** Data:
`runs/mcoh-frontier-whole-k3.json`, `runs/mcoh-cheap-isolated_cheap-skeleton-k5.json`.

## M-coh-1.5 — stack the retry lever (the reliability residue) — DECISIVE

Skeleton fixed cohesion but the free pool's invalid chunks capped epic-pass at 60%. Stack a free
retry-on-invalid (the gateway re-routes past a structurally-invalid draw; gate = "module imports + exports
the surface fn", a syntactic check, no behaviour/obligation leakage). K=5:

| condition | $/epic | wire | happy | X-CUT | integ | **epic✓** |
|---|---|---|---|---|---|---|
| cheap-isolated-**retry** (control: retry, NO skeleton) | $0 | 100% | 95% | **37%** | 27% | **0/5** |
| cheap-skeleton-**retry** (skeleton + retry) | $0 | 100% | 100% | **100%** | **100%** | **5/5** |

**The headline, quantified.** `cheap-skeleton-retry` = **5/5 perfect cohesive epics at $0** — it matches
`opus-whole-bare` (3/3, 100%, **$0.25/epic**) on every cohesion metric, at zero model cost, using the free
pool. The two levers are **orthogonal and BOTH necessary**:
- **Skeleton alone** → cohesion solved, reliability caps it (3/5 epics).
- **Retry alone** (control) → reliability solved (wire 100%) but **cohesion untouched** (X-CUT 37%, 0/5).
- **Skeleton + retry** → 5/5. Each lever closes a different one of M0's two gaps (obligations/cohesion vs
  reliability); neither substitutes for the other.

## The full ladder (workspace epic, one table)

| build config | $/epic | wire | happy | X-CUT | integ | epic✓ | reading |
|---|---|---|---|---|---|---|---|
| cheap-isolated (naive `/build-batch`) | $0 | 96% | 90% | 31% | 27% | 0/5 | per-task ok, no cohesion |
| cheap-isolated-retry | $0 | 100% | 95% | 37% | 27% | 0/5 | reliability≠cohesion |
| cheap-skeleton | $0 | 92% | 95% | 91% | 60% | 3/5 | cohesion solved, reliability caps |
| **cheap-skeleton-retry** | **$0** | 100% | 100% | **100%** | **100%** | **5/5** | **= the opus bar, free** |
| sonnet-whole bare | $0.03 | 100% | 100% | 29% | 67% | 0/3 | frontier≠enough bare |
| **opus-whole bare** (THE BAR) | $0.25 | 100% | 100% | 100% | 100% | 3/3 | the only bare win |

**Answer to "what harness shape + size makes cheap match frontier-bare" (for this epic):** the shape is
**frozen-skeleton + retry over isolated cheap chunks**; it equals opus-bare on cohesion at $0.

## The crux caveat — skeleton PROVENANCE (where the win really comes from), and the size reframe

The skeleton is **knowledge injected by the harness**. Here it was hand-authored (in a real pipeline it is
the **decompose/vision "frozen skeleton"** output — `skeleton.md` mirrors what `/vision` emits). So the
honest claim is conditional: **given a correct skeleton, free+retry builds a cohesive epic = opus-bare, at
$0.** Two consequences that set up the next milestones:

1. **Who builds the skeleton?** If a cheap model can generate an adequate skeleton, the whole epic is free.
   If it needs a frontier call, we haven't *eliminated* frontier — we've **concentrated** it into ONE
   amortizable call (1 skeleton + N free builds) instead of N frontier builds. **Either way it's a win;
   they're different claims.** M-coh-2.5 must measure cheap-vs-frontier skeleton generation.
2. **Why this barely beats opus-whole at THIS size — and where it wins big.** At 5 surfaces, opus-whole
   ($0.25) is fine; the skeleton+free approach isn't obviously cheaper *yet*. The crossover is the **size
   axis**: opus-whole cost/quality is bounded by ONE context — as the epic grows past what a single
   frontier call holds, monolithic-whole degrades (the M0 `mono` obligation drop is the first whiff),
   while **skeleton + free-isolated scales horizontally** (1 skeleton + unlimited free builds). So M-coh-3
   isn't only "optimal chunk size" — it's **"at what epic size does monolithic-frontier break, and does the
   skeleton+cheap harness hold past it?"** That is the money chart and the real form of the U-curve.

## Next
- **M-coh-2 — ablate the skeleton** (shape-only clause vs obligations-only clause) to attribute which
  metric each buys; add the integration-gate+repair lever as an alternative to up-front knowledge.
- **M-coh-2.5 — skeleton provenance:** cheap-generated vs frontier-generated vs hand skeleton → is the one
  frontier call necessary, and does it amortize?
- **M-coh-3 — the size×harness surface:** scale the epic UP past one frontier context; trace where
  opus-whole degrades and whether skeleton+cheap holds; emit `(s*, harness*)` for decompose. (DESIGN §3.)
