# Proposal (v2, hybrid) — The optimal mix of cloud-frontier vs cheap/local inference for building software

_Draft north-star, 2026-06-16. **Reframes the headline question of [`PROPOSAL.md`](PROPOSAL.md)**;
does not replace its machinery. The stage-by-stage method, the lever menu, the battery, the oracle, and
every M0 → M-coh finding survive unchanged — they are now read through an economic lens instead of a
substitution lens. Plain-language on purpose, matching v1._

---

## The question

The v1 north-star asked a **substitution** question: _can a cheap/local model + harness **replace** a
frontier model?_ The repo's own data answered something sharper and more useful — and it points at a
different question worth asking.

> **What is the optimal division of labor between expensive cloud-frontier inference and cheap/local
> inference for building software — and where exactly is the boundary?**

Concretely, the system this is in service of: a company **buys its own hardware** to run the high-volume
work and pays a cloud frontier model **per token only for the low-volume orchestration**. Instead of
$25/M tokens to *write the code*, you pay $25/M tokens to *orchestrate* — and the cost of the coding
agents themselves becomes **fixed** (hardware + maintenance), not metered. The frontier model is not
eliminated; it is **reserved for the part where its cognitive superiority actually earns the premium.**

## Why this is a promotion of the existing work, not a restart

The repo already located the boundary — it just hadn't named the economics. The frontier premium is
**not** writing functions; it is **enforcing cross-cutting obligations uniformly via the frozen
skeleton.** Every load-bearing finding says so:

| Finding | What it established | Role in the hybrid frame |
|---|---|---|
| **M0** — obligation-blindness is tier-independent | cheap & frontier both pass happy-path ~100%, both floor authz/validation/mass-assignment | the *code-writing* sub-task is tier-independent → safe to push onto cheap/local |
| **M-coh-1.5** — skeleton+retry = bare opus at $0 | the frontier's contribution is the skeleton (shared shapes + typed obligation contract), not the body | this **is** "frontier orchestrates, cheap codes," already demonstrated on the workspace epic |
| **M-coh-3** — size×harness crossover | monolithic frontier *erodes* past N≈9 (silently drops `authz@add*Member`); cheap-skeleton-retry stays flat | above ~9 surfaces you don't just *may* split — you *must*; one frontier context can't hold the epic |
| **M-coh-2** — skeleton double dissociation | the skeleton must carry **both** shapes (→integration) AND typed obligations (→uniformity) | defines exactly what the frontier orchestration layer has to emit |

So the hybrid claim is a **weaker, more achievable bar** than v1's substitution claim: cheap/local does
not have to match frontier on *everything* — only on the *coding* sub-task, while frontier keeps the
small, high-leverage orchestration. v1's "cheap matches frontier" becomes a **sub-claim** ("cheap matches
frontier *on code-fill, given the skeleton*"), which the M-coh ladder already supports.

## The claim (falsifiable)

> For building real software, the work splits into a **low-token-volume orchestration layer** (where
> frontier cognition earns its per-token price) and a **high-token-volume coding layer** (where cheap or
> local inference, given the orchestration artifacts, matches frontier output). A harness that routes the
> two accordingly delivers **frontier-grade results at a cost that is fixed in the coding volume** —
> dominated by hardware, not tokens.

Two conditions must both hold for the arbitrage to pay, and each is a measurable, killable hypothesis:

1. **Orchestration genuinely needs frontier.** If a cheap/local model can author an adequate skeleton
   (the M-coh-2.5 *provenance* question), then you need frontier for *nothing* — the system collapses to
   **all-local** (still a great outcome, but a *different product* than "frontier orchestrates"). This
   fork is currently **open** and is the experiment that decides the whole pivot.
2. **Orchestration tokens ≪ coding tokens.** The skeleton + decomposition + verification-design must be a
   small fraction of total tokens, so that metering only that layer is cheap while the bulk runs at fixed
   cost. M-coh-3 is encouraging here — one skeleton amortizes over N chunk builds, and the ratio improves
   with epic size — but the **token-volume ratio itself is unmeasured** and is new work this frame adds.

**Kill conditions:** if cheap/local can author the skeleton too → collapse to all-local (condition 1
fails, pivot redirects). If orchestration is *not* a small token fraction → the arbitrage doesn't pay
(condition 2 fails). If, post-skeleton, cheap/local *can't* match frontier on code-fill at any harness
setting → the labor doesn't actually divide (the M-coh result fails to generalize off the workspace epic).

## What "orchestration" means here (sharp, not a vague bucket)

The repo gives a precise, evidenced definition — keep it; it is the moat. The frontier-resident layer is:

- **The frozen skeleton** — shared shapes **and** the typed cross-cutting obligation contract (authz,
  tenancy, validation, idempotency, audit). Produced **once per epic**, reused across every chunk.
  (M-coh-2 proved both clauses are necessary.)
- **Decomposition** — turning a thin plan into the atomic build packets nobody enumerated. Low-volume,
  high-leverage, the most-developed apparatus in the repo (v1's Stage 2). Frontier-resident by default.
- **Verification-design** — choosing/placing the deterministic checkers and the per-surface obligation
  gates that catch what the coding layer silently skips (the lethal-quadrant lever).

Everything downstream of these artifacts — the per-surface code-fill, the retries, the mechanical
assembly — is the **coding layer**, and that is what moves to cheap/local fixed-cost inference.

## Substrate staging — cheap-API first, local as the realization (decided 2026-06-16)

The "fixed cost = hardware + maintenance" property is **only literally true on owned hardware.** Cheap or
free API is still marginal-cost-per-token and rate-limited. So we are honest about what each substrate
proves:

- **Phase 1 — the free gateway (now).** The jnoccio free-model pool is the **upper bound** of the cost
  win ($0 marginal coding). Proving "frontier-orchestration + free-gateway-coding" matches frontier
  establishes the **split's technical viability** — but it *proxies* the fixed-cost story, it does not
  *realize* it. This is the cheap, fast loop; it reuses the entire existing battery.
- **Phase 2 — owned local hardware (later).** Stand up a 7B–30B local rig and re-run the proven split.
  This is where the fixed-cost economics, the privacy/independence story, and the literal product claim
  become real. The boundary located in Phase 1 is the spec for what the local layer must cover.

This staging is unchanged from v1; only the *reason* changes — Phase 1 is no longer "prove cheap can
substitute," it is "locate the orchestration↔coding boundary cheaply before paying to realize it."

## What changes in the roadmap

The milestones are re-axised, not discarded:

- **The crux becomes M-coh-2.5 (skeleton provenance).** Under v1 this was a caveat on the cohesion
  result. Under the hybrid frame it is **the load-bearing experiment**: it directly answers "does the
  orchestration layer genuinely need frontier?" (condition 1). Run it next.
- **New measurement: the token-volume ratio** (condition 2). Instrument the battery to report
  orchestration tokens vs coding tokens per epic, across the scale ladder — the number that says whether
  metering-only-orchestration is actually cheap. This is small, additive, and currently missing.
- **The per-surface checker lever (M-coh-2)** stays doubly-motivated: it closes the contender's
  statistical EPIC✓ residue *and* it is the verification-design that lives in the orchestration layer.
- **The stage-by-stage map survives**, re-axised from "cheap-vs-frontier per stage" to "frontier-
  orchestration vs local-coding per stage, plus the token-volume ratio that makes the split pay."
  Decomposition (v1 Stage 2) is now explicitly **inside the orchestration layer**.

## Where the recently-imported research (the OKF) sits relative to this

The OKF (`okf/agentic-workflow-optimization/`) does **not** contradict any finding, but it pulls in a
different direction on framing — recorded here so the pivot is deliberate:

- **The OKF's "next step" is M5 = automated workflow search (GEPA-first).** That is a contribution to the
  *academic agentic-workflow-search literature*. This frame's next step is **characterizing the
  boundary + the amortization economics** — a *systems* contribution. The search is downstream of, not
  ahead of, knowing the boundary.
- **The OKF is API-only and silent on local-inference economics** — the exact substrate Phase 2 needs.
  The toolbox (GEPA/ADAS/OpenEvolve) assumes per-token API; the fixed-cost thesis lives in terrain the
  OKF doesn't cover.
- **Contribution re-ranking.** The OKF says "the non-gameable fitness *is* the contribution." Under this
  frame the fitness is the **measurement instrument** (how we trust the boundary map); the **contribution
  is the hybrid cost-arbitrage architecture + the empirical map** of which sub-tasks need frontier.
- **The OKF's own skeptical source supports this pivot.** "Inefficiencies of Meta Agents" (>15,000-example
  break-even for automated design) argues the *static architecture* — which pays off on day one — should
  come before the *search*, which is speculative. The pivot is more aligned with that caution than the
  OKF synthesis is.

M5 / workflow-search and the lens-ensemble precursor remain on the roadmap; they just sit **after** the
boundary is mapped and the architecture is shown to pay, not before.

## Status

Draft north-star (2026-06-16), **uncommitted, awaiting review.** Substrate decision: cheap-API/free
gateway first, local as the Phase-2 realization. Next experiment under this frame: **M-coh-2.5 skeleton
provenance** (decides condition 1) + the **token-volume-ratio** instrument (condition 2). No findings
were edited; this doc only reframes the headline question of `PROPOSAL.md`.
