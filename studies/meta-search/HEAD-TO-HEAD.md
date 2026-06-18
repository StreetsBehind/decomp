# Head-to-head — hybrid vs routed all-frontier baseline (P3, first live results)

> **Status (2026-06-18): RUN + the verdict is TOPOLOGY-DEPENDENT — a clean win on 2 of 4 seam topologies,
> a clear loss on the other 2; and the binding constraint is LAYER-2 cheap-tier quality, NOT the gate.**
> Hybrid arm measured live on the free gateway (~$0 real spend; coding is free, skeleton is the on-disk
> orchestration artifact). Baseline column is the prior routed-baseline run (same epics, same independent
> oracles, same `evaluateEpic` path — directly comparable; not co-measured in one process). Harness:
> `head-to-head.mjs`. Raw: `runs/head-to-head-hybrid.json`.

## The comparison (identical epics, identical skeleton + $0.395 opus anchor, ONLY the coding tier differs)

| epic | seam topology | gate | hybrid raw c/i | hybrid **final** c/i | baseline c/i | hybrid $ | baseline $ | verdict |
|---|---|---|---|---|---|---|---|---|
| membership-d1 | set-membership | fired 1p/3r | 100 / 100 | **100 / 100** | 100 / 100 | 0.395 | 0.785 | **WIN** (parity, ½ cost) |
| lifecycle-d1 | state-ordering | no-op | 100 / 100 | **100 / 100** | 100 / 100 | 0.395 | 0.701 | **WIN** |
| lifecycle-d2 | state-ordering | no-op | 100 / 100 | **100 / 100** | 100 / 100 | 0.395 | 1.026 | **WIN** |
| lifecycle-d3 | state-ordering | no-op | 100 / 100 | **100 / 100** | 100 / 100 | 0.395 | 1.316 | **WIN** (⅓ cost) |
| quota-d1 | conservation | no-op | 100 / 25 | 100 / **25** | 100 / 100 | 0.395 | 0.742 | LOSS (integ) |
| quota-d2 | conservation | no-op | 100 / 63 | 100 / **63** | 100 / 100 | 0.395 | 0.946 | LOSS (integ) |
| quota-d3 | conservation | no-op | 100 / 75 | 100 / **75** | 100 / 100 | 0.395 | 1.316 | LOSS (integ) |
| approval-d1 | SoD / two-party | no-op | 100 / 75 | 100 / **75** | 100 / 100 | 0.395 | 0.811 | LOSS (integ) |
| approval-d2 | SoD / two-party | no-op | 79 / 25 | **79 / 25** | 100 / 100 | 0.395 | 1.169 | LOSS (both) |
| approval-d3 | SoD / two-party | no-op | 71 / 17 | **71 / 17** | 100 / 100 | 0.395 | 1.525 | LOSS (both) |

**raw == final in every cell except membership** — because the integration-gate is membership-seam-specific
(`surfaceRole` only recognises the addMember/post pair) and **no-ops on the other three topologies**. On
membership the gate ran 3 repairs but raw was already 100/100, so the gate was belt-and-suspenders here,
**not load-bearing** on this run (the cheap tier nailed the seam unaided).

## What this answers

- **Does cheap+gate reach baseline parity live?** On **set-membership** and **state-ordering** seams: **yes —
  full 100/100 at ~½–⅓ the cost** (the pre-registered win, in those regimes). On **conservation** and
  **separation-of-duties** seams: **no.**
- The win is **real but topology-gated.** It is NOT "the hybrid wins where the baseline erodes" (the baseline
  is perfect everywhere here) — it is "the cheap tier *matches* a perfect baseline for less money **on the
  seams it can handle.**" Lifecycle is the cleanest demonstration: 100/100 across D=1–3, gate off, ~⅓ cost.

## Layer-2 decomposition (the `why` records — this is the actionable part)

The shortfall on approval+quota is **mostly a raw cheap-tier coding-quality problem, not an unhandled seam the
current gate would catch.** Three distinct failure modes, all visible in the fail records:

1. **MISSING valid draws on the hardest seam surfaces (approval).** `executeRequest` (d2), `shipRelease` +
   `settlePayout` (d3) produced **no structurally-valid module in 2 attempts** → every test touching them
   fails as `touched-unwired`, which **cascades into the crosscut erosion** (79%, 71% are entirely
   missing-surface cascade, not obligation-blindness on built surfaces). These surfaces were routed to
   reasoning-heavy free models that emitted huge blobs (`executeRequest` d3 = 3641 output tokens) that don't
   yield a clean module. → **LAYER-2: format discipline + more retries + route selection.**
2. **Hallucinated obligation (quota).** Every quota integration miss is the cheap tier inventing an
   *unrequested* `"only admin may withdraw"` guard, so the conservation/overspend/idempotency tests (which use
   a non-admin) get refused. Crosscut is a perfect 100% (it nails the *real* obligations) but it **over-applies
   the authz pattern** from the skeleton to `withdraw`. → **LAYER-2: spec-adherence / anti-over-restriction.**
   (quota-d3 also shows genuine conservation-arithmetic bugs: "the 50 is still there after the refused
   overspend".)
3. **Wrong cross-surface seam logic (approval).** `SEAM+@release` fails with "Unauthorized: release not
   approved" / "admin required" — the execute surface rejects a properly-approved request, i.e. the
   approve→execute seam is mis-wired. → a **generalized integration-gate** (SoD-aware) could catch this class;
   the membership gate cannot.

**Model variance is the thing to ABSORB, not tune away (the model-agnostic thesis).** The free gateway
adaptive-routes every surface to a different model (mistral-codestral, nemotron-nano-reasoning, deepseek-v32,
glm-4.7-flash, poolside-laguna, minimax-m2.7, gpt-oss-120b…); quality varies wildly, and the failures cluster
on the reasoning-heavy, high-token routes. Per the model-interchangeability principle, **route/model selection
is NOT an admissible fix** — the system must turn ANY above-floor model's output into a valid, correct module.
So this variance is a requirement on the OUTPUT-QA layer (extraction / format-forcing / retry / repair must be
model-agnostic and validated worst-of-K ACROSS the route zoo, not on one draw), NOT a route-selection knob.

## The honest read

- The pre-registered win (parity at lower cost) **is achievable and was achieved live — on 2 of 4 seam
  topologies.** That is the first *live, apples-to-apples, non-proxy* evidence the thesis can hold.
- It does **not** generalize across seam kinds as-is. The two losing topologies fail for reasons the
  membership-specific gate cannot touch, and the dominant lever to close them is **layer-2 cheap-tier quality
  (route selection, format discipline, spec adherence)** — with a secondary lever being a **gate that
  generalizes** to the SoD and conservation invariants.
- Cost favors the hybrid everywhere ($0.395 flat vs $0.70–1.53); reliability is the whole question, and it is
  now a *measured, decomposed* question rather than a proxy one.

## Caveats / not-yet

- K=1 single runs (no worst-of-K); the gateway's adaptive routing makes a re-run non-deterministic (a
  different model may draw each surface) — a worst-of-K / route-pinned re-run would tighten the seam numbers.
- Baseline column is the prior routed-baseline run, not co-measured in the same process (re-running it is
  ~$10 and re-confirms 100%); available on request.
- Sequestered TEST untouched — these are the development epics (`approval-d1…`, not the windowed TEST ids);
  `membership-d1` = the frozen anchor `scale-d1`, already a dev fixture. No P3 TEST contamination.

## Failure attribution (the operating lens for layer-2)

Every failure mode is classified — **(A)** planning/orchestration (fix the skeleton/contract/decomposition;
frontier $, amortizable, model-agnostic by nature) · **(B)** output-QA (fix the checker/gate/repair/extraction;
cheap, per-surface, MUST hold worst-of-K across the route zoo) · **(C)** neither = a thesis boundary
(scope-shrink). Route/model selection is never an admissible fix (it abandons model-interchangeability).

| failure mode | attribution | fix lives in |
|---|---|---|
| MISSING valid draws (approval execute/ship/settle; 3641-tok blobs) | **(B)**, maybe **(A)** | model-agnostic extraction/format/retry (B); or decompose the obligation-dense seam surface (A) |
| hallucinated "only admin may withdraw" (quota) | **(A)** primarily, (B)-catchable | sharpen the contract so authz is not over-applied to `withdraw` (A); spec-adherence checker (B) |
| wrong approve→execute seam logic (approval) | **(B)** + (A) | a generalized SoD-aware integration-gate (B); clearer approval-store contract (A) |

## What this sets up (next forks, the lead's call)

1. **Attribution pass first.** Decide (A)/(B)/(C) per failing cell, then build the fix each one warrants —
   NOT a reflexive "generalize the gate" (that's a (B) reach; the quota guard is likely an (A) one-line
   contract fix that helps every model at once).
2. **Then the targeted fixes**, under the model-agnostic constraint: (A) contract/decomposition sharpening for
   the over-restriction + obligation-dense surfaces; (B) model-agnostic extraction/retry + a generalized gate
   for the approve→execute and conservation seams — each validated worst-of-K across routes.
3. **Co-measure + worst-of-K** the baseline and hybrid in one process (worst-of-K across routes IS the
   model-agnosticism test, not just noise reduction).
