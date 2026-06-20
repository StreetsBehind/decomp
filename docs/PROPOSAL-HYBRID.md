# Proposal (v2, hybrid) — Can a frontier-orchestrated, lightweight-coded system beat all-frontier on cost at equal reliability?

_Draft north-star, 2026-06-16 (rev. 2). **Reframes the headline question of [`PROPOSAL.md`](PROPOSAL.md)**;
does not replace its machinery. The stage-by-stage method, the lever menu, the battery, the oracle, and
every M0 → M-coh finding survive unchanged — they are now read in service of one product question.
Plain-language on purpose, matching v1._

> **⚠️ Status banner (2026-06-19).** The **question** and the **win condition** in this doc are DURABLE and
> current. The **"What changes in the roadmap"** and **"Status"** sections below are a **2026-06-16 snapshot**
> and have been superseded (M-coh-2.5 is DONE; the M5 meta-search instrument was brought forward and run P0→P2c
> + EVO-GLEANINGS). For live status / next-action, **[`STATE.md`](../STATE.md) is the operational source of
> truth.**

---

## The question

This is **research, not design.** We are not searching for an "optimal mix" of models — the architecture
is **fixed by hypothesis**, and the research is whether that fixed architecture *works and pays*:

> **Can we build a system in which a cloud frontier model handles the planning and orchestration, and
> cheaper lightweight coding models handle all the actual coding — such that the system delivers
> reliable software-building performance at lower total cost than using cloud frontier models throughout
> (opus / sonnet / haiku)?**

The deliverable this research is aimed at is **that system itself** — a harness, a router, or whatever
form turns out to fit (the term is open; "harness" is the working word). The system is the product.
**Every decision in the program should support building it and proving it beats all-frontier on cost.**

## The win condition (both must hold, both are measurable)

The system wins iff:

1. **Reliability parity** — frontier-orchestration + lightweight-coding delivers reliability **at least as
   good as** an all-frontier setup, on a measurable task set. ("Reliable performance" is the whole point —
   a cheaper system that ships broken software is not a win.) Reliability is exactly what the repo already
   measures: epic cohesion, end-to-end integration, and **enforcement of the dangerous cross-cutting
   obligations** (the lethal quadrant: authz, tenancy, validation, idempotency, audit).
2. **Cost dominance** — total cost is **lower** than a cost-optimized all-frontier baseline:
   - **hybrid total** = (orchestration tokens × frontier $/token) + (coding inference amortized to **fixed**
     hardware + maintenance)
   - **all-frontier total** = (all tokens, routed optimally across opus/sonnet/haiku, × their prices)

The baseline must be **cost-optimized** (an all-cloud setup is allowed to route haiku/sonnet for the easy
work and reserve opus for the hard parts) — otherwise beating it is a strawman. The honest comparison is
hybrid vs. *the best you can do with cloud frontier alone.*

**Kill conditions:**
- If lightweight coding can't be made reliable enough even with frontier orchestration → fails the
  reliability gate → thesis dead (useful negative: "you still need frontier in the loop for coding").
- If, after honest accounting (hardware amortization + a cost-optimized all-frontier bar), there is no
  cost win → thesis dead.
- If the existence proof on the workspace epic doesn't generalize to a real task distribution → scope
  shrinks to where it does.

## Why this is a promotion of the existing work, not a restart

The repo has already produced an **existence proof on one epic** — the result line *is* this system, it
just hadn't been named as the product. The frontier premium is **not** writing functions; it is the
**planning/orchestration artifact** (the frozen skeleton: shared shapes + typed obligation contract).
Every load-bearing finding supports both halves of the win condition:

| Finding | What it established | Evidence for the win condition |
|---|---|---|
| **M0** — obligation-blindness is tier-independent | cheap & frontier both pass happy-path ~100%, both floor authz/validation | the *coding* sub-task is tier-independent → safe to run on lightweight models (cost) |
| **M-coh-1.5** — skeleton+retry = bare opus at $0 | frontier-orchestration (skeleton) + cheap-coding+retry matched bare opus on cohesion, coding at $0 | **reliability parity + cost dominance on one epic, already shown** |
| **M-coh-3** — size×harness crossover | monolithic frontier *erodes* past N≈9 (silently drops `authz@add*Member`); the harness stays flat | above ~9 surfaces the hybrid **beats** all-frontier on *both* reliability and cost — and the gap widens |
| **M-coh-2** — skeleton double dissociation | the orchestration artifact must carry **both** shapes (→integration) AND typed obligations (→uniformity) | defines what the frontier planning layer must emit to hit the reliability gate |

So v1's "cheap matches frontier" is **demoted to a sub-claim** — "lightweight coding matches frontier *on
the code-fill, given the orchestration artifact*" — which the M-coh ladder already supports. The new
headline is the **whole-system cost-vs-reliability comparison.**

## What "planning and orchestration" means here (sharp, evidenced)

The frontier-resident layer is small, high-leverage, and precisely defined by the findings — keep it
sharp; it is the moat:

- **The frozen skeleton** — shared shapes **and** the typed cross-cutting obligation contract. Authored
  **once per epic**, reused across every coding chunk. (M-coh-2 proved both clauses are necessary for
  reliability.)
- **Decomposition** — turning a thin plan into the atomic build packets nobody enumerated (v1 Stage 2,
  the most-developed apparatus). Low-volume, high-leverage → frontier-resident.
- **Verification-design** — *choosing and placing* the deterministic checkers / per-surface obligation
  gates. Note the split: **designing** the verification is frontier orchestration; **running** it is a
  free deterministic gate (the lethal-quadrant lever — a cheap checker guarding cheap generators). The
  frontier designs the net; it does not run it.

Everything downstream of these artifacts — per-surface code-fill, retries, mechanical assembly — is the
**coding layer**, run on lightweight models. That is where the token volume (and therefore the cost) lives.

## Substrate staging — cheap-API first, local as the realization (decided 2026-06-16)

The "fixed coding cost = hardware + maintenance" property is **only literally true on owned hardware.**
Cheap/free API is still marginal-cost-per-token and rate-limited. So we are honest about what each
substrate proves:

- **Phase 1 — the free gateway (now).** The jnoccio free-model pool is the **upper bound** of the cost
  win ($0 marginal coding). Proving "frontier-orchestration + free-gateway-coding" hits the reliability
  gate establishes the **system's technical viability** — but it *proxies* the fixed-cost story, it does
  not *realize* it. Cheap, fast loop; reuses the entire existing battery.
- **Phase 2 — owned local hardware (later).** Stand up a 7B–30B local rig and re-run the proven system.
  This realizes the fixed-cost economics and the privacy/independence story. **Caveat (load-bearing):**
  the free gateway is an *uncontrolled mixture* that may include models larger than anything you can run
  on commodity GPUs — so the reliability shown in Phase 1 is an *upper bound* for Phase 2. Closing that
  gap (does a literal local 7B–30B still clear the reliability gate?) connects to the
  one-shot-capacity per-model break-point work.

## What changes in the roadmap

Milestones are re-pointed at the win condition, not discarded:

- **The crux is M-coh-2.5 (skeleton provenance).** Two things it decides: (a) the **cost of the
  orchestration layer** — is it one amortizable frontier call, and how many tokens? (feeds cost
  dominance); (b) **whether frontier orchestration is necessary at all** — if a *cheap-authored* skeleton
  is just as reliable, then you don't need frontier in the loop and the cheaper answer is all-local (a
  *different* system than the one hypothesized, but it would still need to clear the reliability gate).
  **DONE (2026-06-16, [`../studies/build-gap/MCOH25-RESULTS.md`](../studies/build-gap/MCOH25-RESULTS.md)):**
  frontier (opus-class) authoring IS necessary — cheap/sonnet authors fail the shared-shape seam; orchestration
  cost ≈ $0.40/epic; at N=5 the hybrid *loses* on cost (reliability parity, not dominance). The active crux is
  now the **checker lever × scale**, pursued via the brought-forward M5 meta-search program ([`../STATE.md`](../STATE.md)).
- **Cost instrumentation** — DONE: cost is reported/analytic per config (P2b/P2c) and per-cell $ appears in
  the head-to-head ([`../studies/meta-search/HEAD-TO-HEAD.md`](../studies/meta-search/HEAD-TO-HEAD.md)).
- **A cost-optimized all-frontier baseline** — BUILT (cloud routing across opus/sonnet/haiku,
  [`../studies/meta-search/ROUTED-BASELINE.md`](../studies/meta-search/ROUTED-BASELINE.md)). It builds 100%
  through D=3, so the P2b/P2c "crossover" was vs the weak opus-whole proxy — a cost/reliability TRADE, not
  dominance. What remains open is the **SETTLED** routed baseline + a **live co-measured INTEG** head-to-head
  (deferred live-spend runs).
- **The per-surface checker lever (M-coh-2)** stays doubly-motivated: it closes the contender's
  statistical reliability residue at scale *and* it is the verification-design that lives in the
  orchestration layer.
- **The stage-by-stage map survives** as the means of locating where the system needs frontier vs
  lightweight; decomposition (v1 Stage 2) sits inside the orchestration layer.

### Two live tensions in the research plan (open, before the next experiment)

1. **The all-frontier baseline is not free to define.** "Optimally route across opus/sonnet/haiku" is
   *itself* a routing problem; a lazy bar (all-opus) makes the cost win hollow, an honest one is real
   work. The bar is load-bearing for the entire result and must be built deliberately, not defaulted.
2. **Generalization beyond the synthetic epics is the kill-condition that actually threatens the thesis.**
   The existence proof lives on the `workspace` epic + the `scale-d{1..4}` ladder. "Reliable on a
   measurable task set" needs an explicit **task-distribution decision** — what corpus of real
   build-tasks the system is claimed to hold on. Without it, the win is "true on our fixtures," not
   "true."

## Where the recently-imported research (the OKF) sits relative to this

The OKF (`okf/agentic-workflow-optimization/`) does **not** contradict any finding, but it pulls in a
different direction on framing — recorded so the pivot is deliberate:

- **The OKF's "next step" is M5 = automated workflow search (GEPA-first)** — a contribution to the
  *academic agentic-workflow-search literature*. This program's deliverable is a **product** (the system
  that beats all-frontier on cost). Here the search was **brought forward** as the *instrument* used to
  discover and validate the fixed hybrid config now (the meta-search program, P0→P2c) — the search is the
  instrument and the frozen config is the product; it is not the goal in itself.
- **The OKF is API-only and silent on local-inference economics** — exactly the substrate Phase 2 (and
  the fixed-cost thesis) needs.
- **Contribution re-ranking.** The OKF says "the non-gameable fitness *is* the contribution." Here the
  fitness is the **instrument** that proves the reliability gate honestly; the **product** is the system.
- **The OKF's own skeptical source supports this ordering.** "Inefficiencies of Meta Agents"
  (>15,000-example break-even for automated design) argues the static, hand-built system — which pays off
  immediately — should precede any search.

The **lens-ensemble precursor** stays on the roadmap *after* the system clears the reliability gate and beats
all-frontier on cost. The **M5 / workflow-search** instrument, by contrast, was **brought forward** and is the
active apparatus for the current crux (see [`../STATE.md`](../STATE.md)).

## Status

Draft north-star (2026-06-16, rev. 2), **committed for iteration.** Substrate decision: free gateway
first (proxies fixed cost), owned local hardware later (realizes it). **Update 2026-06-19:** M-coh-2.5 is
resolved, cost-instrumentation + the routed all-frontier baseline are built, and the M5 meta-search instrument
was brought forward and run P0→P2c (PROVISIONAL crossover at N≥13 vs the opus-whole proxy) + the EVO-GLEANINGS
program; the genuinely-open items are the deferred **live-spend** runs (settled routed baseline + live
co-measured INTEG head-to-head) and **Phase −1 block B**. See [`../STATE.md`](../STATE.md) for live status. No
findings were edited; this doc only reframes the headline question of `PROPOSAL.md`.
