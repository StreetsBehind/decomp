# Head-to-head — hybrid vs routed all-frontier baseline — SETTLED (P3 prerequisite #2)

> **Status (2026-06-20): SETTLED, co-measured, worst-of-K=8. The hybrid (cheap-fusion + integration-gate)
> LOSES every cell — 0/17 lethal-non-inferior — at ¼ the cost.** Under the program's own worst-of-K=8
> statistic, measuring BOTH arms live on identical epics by the same oracles, the hybrid's reliability
> collapses across the route zoo while the (also-eroding) routed baseline mostly holds. This REVERSES the
> 2026-06-18 K=1 "topology-gated WIN on 2 of 4 topologies" — that was **route-luck** on a single draw, the
> same non-stationarity footgun the routed baseline's K=1 "100% wall" was. The pre-P3 gate is now **READY**
> (all 3 prereqs met), but the head-to-head IS the test, and **the proposed P2c winner does not win** — so
> there is no winner to freeze. Harness: `head-to-head.mjs --settled --k 8`. Raw:
> `runs/head-to-head-settled.json` (both arms, K=8; baseline arm $27.40 live frontier; hybrid arm $0).

## The co-measured comparison (identical epics + skeleton + $0.395 opus anchor; ONLY the coding tier differs)

Reliability = **worst (min) over 8 draws**; the hybrid's 8 draws span the **route zoo** (the free gateway
re-routes each draw — the model-agnosticism test, *not* noise reduction), the baseline's 8 span frontier
nondeterminism (deterministic per-tier routing). `raw` = bare cheap draw before the gate; `final` = after the
integration-gate repair. Lethal buckets shown as integration **i** / crosscut **c** (%).

> **Operator-asymmetry caveat (load-bearing for reading the magnitude).** The two "worst-of-8" are not the
> same operator: the hybrid's min is over **8 distinct cheap models** (so it deterministically includes the
> cell's single *worst* cheap route), while the baseline's is over **8 re-samples of the same frontier tier**
> (a much tighter distribution). The verdict *direction* (hybrid loses) is robust, but the *magnitude* of the
> gap is a function of K and of the route zoo's weak tail — not a stationary property of "cheap models." This
> asymmetry is intended (the binding premise: route selection is not an admissible fix, so the worst route IS
> the bar), but it means a different K or a less-bad zoo would show a smaller gap.

| epic | gate | baseline i/c | hybrid raw i/c | hybrid **final** i/c | verdict |
|---|---|---|---|---|---|
| membership-d1 | fires | 100 / 100 | 0 / 71 | **0 / 86** | LOSS (Δi −100pp) |
| membership-d2 | fires | 100 / 100 | 50 / 75 | **33 / 83** | LOSS (Δi −67) |
| membership-d3 | fires | 100 / 94 | 67 / 71 | **56 / 71** | LOSS (Δi −44) |
| membership-d4 | fires | 75 / 86 | 50 / 82 | **58 / 82** | LOSS (Δi −17) |
| membership-d5 | fires | 80 / 93 | 47 / 81 | **67 / 81** | LOSS (Δi −13) |
| approval-d1 | no-op | 100 / 100 | 0 / 14 | **0 / 14** | LOSS (Δi −100) |
| approval-d2 | no-op | 100 / 86 | 25 / 50 | **25 / 50** | LOSS (Δi −75) |
| approval-d3 | no-op | 100 / 90 | 25 / 67 | **25 / 67** | LOSS (Δi −75) |
| approval-d4 | no-op | 100 / 93 | 56 / 89 | **56 / 89** | LOSS (Δi −44) |
| lifecycle-d1 | no-op | 100 / 100 | 50 / 100 | **50 / 100** | LOSS (Δi −50) |
| lifecycle-d2 | no-op | 50 / 90 | 0 / 20 | **0 / 20** | LOSS (Δi −50) |
| lifecycle-d3 | no-op | 100 / 87 | 17 / 47 | **17 / 47** | LOSS (Δi −83) |
| lifecycle-d4 | no-op | 75 / 90 | 31 / 45 | **31 / 45** | LOSS (Δi −44) |
| quota-d1 | no-op | 25 / 100 | 0 / 20 | **0 / 20** | LOSS (Δi −25) |
| quota-d2 | no-op | 100 / 100 | 0 / 40 | **0 / 40** | LOSS (Δi −100) |
| quota-d3 | no-op | 75 / 100 | 0 / 47 | **0 / 47** | LOSS (Δi −75) |
| quota-d4 | no-op | 100 / 100 | 6 / 50 | **6 / 50** | LOSS (Δi −94) |

**§7 battery verdict: LOSS — 0/17 cells lethal-non-inferior.** Cost: hybrid **$6.715** worst-of-K total
(= $0.395 skeleton × 17; coding is free) vs baseline **$27.40** — the hybrid is **~4× cheaper and still loses
reliability on every cell.** A cheaper system that ships software this much less reliable is, by the win
condition, **not a win** (parity is mandatory; cost is the tie-breaker).

## The read — three findings

**1. The hybrid loses everywhere under the honest statistic; the K=1 "topology win" was route-luck.** The
2026-06-18 run scored membership-d1 + lifecycle-d1/2/3 as 100/100 WINS on a single draw. At worst-of-K=8
across the route zoo those same cells are LOSSES (membership-d1 integration 0%, lifecycle-d1 50%). This is
the third time the program's single-draw verdicts evaporated under worst-of-K (after the routed baseline's
"100% wall" and the coevo "d1 = route variance") — here on the **hybrid** side, and far more severe: the
cheap pool's worst-of-8-routes is dramatically worse than the frontier's worst-of-8-draws.

**2. The killer is cheap-pool CODING QUALITY, not an unhandled seam — and the gate has no lever for it.** The
**crosscut** (obligation: authz/validation/idempotency/audit) gap is the dominant signal: **16/17 cells**,
median **−36pp**, max **−86pp**. The integration-gate has **no crosscut-repair mechanism** — it repairs the
cross-surface seam, so the small worst-of-K crosscut *shifts* on membership-d1 (71→86) and -d2 (75→83) are a
second-order effect of the seam rewrite changing which draw is the min, not obligation repair. That crosscut
deficit is the cheap pool's worst routes failing to enforce obligations, wholly untouched here. The gate is a
**no-op on 12/17 cells** (membership-specific) and on the 5 membership cells its raw→final integration lift is
marginal and *sometimes negative* at worst-of-K (d2 50→33, d3 67→56: a repair that helps the median regresses
a route → lowers the min). So the shortfall is **(B) output-QA**, and the one QA lever in this arm (the
membership integration-gate + 2 structural retries) is nowhere near sufficient.

**3. The PROPOSED WINNER is falsified; whether it's (B)-repairable or a (C) boundary is OPEN — this run does
not settle it.** Per the binding premise, cheap-model broken code is the **target** to repair, not
automatically a wall — and this hybrid arm ran only the **integration-gate + retry**, NOT the fuller output-QA
stack the coevo work built (`repair-gate.mjs` self-repair / smoke-execute-and-fix, `contract-gate.mjs`,
`shape-gate.mjs`, best-of-N, extraction). So the clean, honest statement is: **the P2c "proposed winner"
(cheap-fusion + integration-gate) does not reach reliability parity under co-measured worst-of-K=8** — the
integration-gate alone does not close the crosscut/obligation gap (it was never designed to) and no-ops on 3
of 4 topologies. The redirect is the output-QA stack, especially a model-agnostic **obligation/crosscut
repair** (the crosscut gap is the bulk of the deficit and is wholly untouched here). **But against
over-optimism:** the gap is **bimodal** — 9/17 cells are **>50pp** integration blowouts, only 2/17 are
near-parity (membership-d4 Δi −17, d5 Δi −13) — and **no evidence is offered that an obligation-repair lever
closes an 86pp worst-of-route crosscut gap** (that lever was not run). Whether the cheapest tail of the route
zoo is (B)-repairable or a (C) wall is exactly what the next experiment must *decide*, not assume.

## Integrity checks (what the loss is — and the one thing this run cannot separate)

- **Baseline arm: 0/17 harness errors**, and its worst-of-K integration agrees with the independent
  `routed-baseline-settled.json` run within 25pp on **13/17** cells (the rest is expected frontier
  sampling variance — both are min-over-8 of a stochastic builder). The comparator is sound.
- **The loss is NOT purely a gateway artifact: ≥9/17 cells lose with ZERO missing draws** — unambiguously
  broken cheap-tier code (approval-d1 i0%, quota-d1 i0%, quota-d4 i6%, all with no missing draws). The §7
  verdict (0/17 non-inferior) does not hinge on transport.
- **HONEST LIMIT — on the 8 cells WITH missing draws, this run cannot separate transport from bad code.**
  `missingDrawsAny` is a *boolean* (any of 8 draws) and the artifact stores no per-draw vector, and the
  harness scores a missing/empty surface as **0** — identical to a graded-broken draw at 0. So a single
  gateway JSON/format miss is enough to drive a cell's worst-of-K to 0, indistinguishable from bad code. The
  tell is membership-d1 (integration worst 0 / median 100 / best 100, with a missing draw): one bad draw of
  *unknown cause* against an otherwise-perfect distribution. A future run should log per-draw outcomes to
  attribute these 8 cells; for now, treat their worst-of-K=0 as "transport-or-code," not certified code.
- Same deterministic oracle graders as the routed baseline (already verified pure); the grader discriminates
  (the baseline arm scores ~100% where the hybrid scores ~0% on the same cells).

## What it means for P3

The pre-P3 gate flips to **READY** (both deferred live-spend prereqs converted to real). But "READY" means
*the proxies are now measured*, not *the winner wins*: the co-measured head-to-head — which is prereq #2 — is
itself the reliability test, and the proposed winner **loses 0/17**. Freezing this config and scoring it on
the sequestered TEST would only confirm a loss. **So P3-as-freeze-the-current-winner is not warranted.** The
honest next step is to strengthen the output-QA stack (self-repair + a generalized obligation/crosscut repair
+ best-of-N), validate it lifts the hybrid's worst-of-K crosscut/integration toward the baseline, and only
then freeze a candidate worth falsifying on TEST. The cost headroom is enormous (4×), so the entire question
is reliability — now a *measured, decomposed* question, not a proxy one.

## Audit trail — the superseded K=1 topology-win (2026-06-18)

The first run (K=1, hybrid arm only, baseline column reused from the prior routed-baseline) reported a
**topology-gated WIN** — 100/100 at ½–⅓ cost on set-membership (d1) + state-ordering (lifecycle d1–3), LOSS
on conservation (quota) + separation-of-duties (approval). Its own caveats (K=1; "the gateway's adaptive
routing makes a re-run non-deterministic"; "co-measure + worst-of-K … IS the model-agnosticism test") named
exactly this run as the decisive follow-up. Discharged: under co-measured worst-of-K=8 the "wins" were
single-draw route-luck — the cheap pool, held to its *worst* route over 8, fails every cell. The K=1 numbers
were not fabricated (those draws did pass) — they were **under-sampled**, and a single lucky route is not a
model-agnostic result (the binding premise: route selection is not an admissible fix).
