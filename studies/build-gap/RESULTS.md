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
