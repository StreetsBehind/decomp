# decomp — Current State & Direction

> **The single source of truth for "what are we trying to accomplish, where are we, and what's next."**
> If a doc in this repo disagrees with this page about the *goal*, this page wins. (The legacy docs are
> still correct about their *findings* — only their headline framing is superseded. See "How the history
> fits" below.)
>
> _Last updated: 2026-06-16._

---

## What we are trying to accomplish (the north star)

This is **research, not design.** The architecture is **fixed by hypothesis**; the research is whether
that fixed architecture *works and pays*:

> **Can we build a system in which a cloud frontier model handles the planning and orchestration, and
> cheaper lightweight coding models handle all the actual coding — such that the system delivers reliable
> software-building performance at lower total cost than using cloud frontier models throughout
> (opus / sonnet / haiku)?**

**The system is the product** — a harness / router / "whatever fits" (the term is open). Every decision
in the program should serve **building that system and proving it beats all-frontier on cost.**

The full statement, the evidence table, and the substrate plan are in
[`docs/PROPOSAL-HYBRID.md`](docs/PROPOSAL-HYBRID.md) (the north-star doc). This page is its operational
summary plus current status.

> ⚠️ **Wording the user has rejected — do not use it.** This is **not** a search for the "optimal mix" /
> "optimal division of labor" / "where the boundary is." The architecture is fixed; the question is a
> falsifiable **comparison** (does the fixed hybrid beat all-frontier on cost at equal reliability?).

## The win condition (both must hold, both are measurable)

The system wins **iff both** are true:

1. **Reliability parity** — frontier-orchestration + lightweight-coding is **at least as reliable** as a
   cost-optimized all-frontier setup, measured exactly as the repo already measures: epic **cohesion**,
   end-to-end **integration**, and enforcement of the **lethal-quadrant cross-cutting obligations**
   (authz, tenancy, validation, idempotency, audit). A cheaper system that ships broken software is *not*
   a win.
2. **Cost dominance** — total cost is **lower** than a **cost-optimized** all-frontier baseline:
   - **hybrid total** = (orchestration tokens × frontier $/token) + (coding inference amortized to
     **fixed** hardware + maintenance)
   - **all-frontier total** = (all tokens, routed optimally across opus/sonnet/haiku, × their prices)

   The baseline must be cost-optimized (cloud may route haiku/sonnet for easy work, reserve opus for hard
   parts) — beating naive all-opus would be a strawman.

**Kill conditions:** lightweight coding can't be made reliable enough even with frontier orchestration →
thesis dead (useful negative). No cost win after honest accounting → thesis dead. The existence proof
doesn't generalize to a real task distribution → scope shrinks to where it does.

## Where we are — an existence proof on one epic

The repo has already produced an **existence proof on one epic** (the `workspace` epic and the
`scale-d{1..4}` ladder). The frontier premium turned out **not** to be writing functions — it is the
**planning/orchestration artifact** (the *frozen skeleton*: shared shapes + a typed cross-cutting
obligation contract). The load-bearing findings (none edited by the reframe — see
[`studies/build-gap/RESULTS.md`](studies/build-gap/RESULTS.md) and
[`docs/REPORT-2026-06-16.md`](docs/REPORT-2026-06-16.md)):

| Finding | Established | Why it matters to the win condition |
|---|---|---|
| **M0** — obligation-blindness is **tier-independent** | cheap & frontier both pass happy-path ~100%, both floor authz/validation | the *coding* sub-task is tier-independent → safe to run on lightweight models (cost) |
| **M-coh-1.5** — skeleton + retry = bare opus, at $0 | frontier-orchestration (skeleton) + cheap-coding+retry matched bare opus on cohesion | **reliability parity + cost dominance on one epic, already shown** |
| **M-coh-3** — size × harness crossover | monolithic frontier *erodes* past N≈9 (silently drops `authz@add*Member`); the harness stays flat | above ~9 surfaces the hybrid **beats** all-frontier on both reliability and cost, and the gap widens |
| **M-coh-2** — skeleton double dissociation | the skeleton must carry **both** shapes (→integration) **and** typed obligations (→uniformity) | defines what the frontier planning layer must emit to clear the reliability gate |

So v1's "cheap matches frontier" is **demoted to a sub-claim** ("lightweight coding matches frontier on
the code-fill, *given the orchestration artifact*"). The new headline is the **whole-system
cost-vs-reliability comparison.**

## What's next (re-pointed at the win condition)

1. **The crux — M-coh-2.5, skeleton provenance.** Decides (a) the orchestration layer's **cost** (one
   amortizable frontier call? how many tokens?) and (b) whether frontier orchestration is **necessary at
   all** — if a *cheap-authored* skeleton is equally reliable, the cheaper answer is all-local (a
   *different* system that would still have to clear the reliability gate). **Run this next.** Apparatus
   seed: `studies/build-gap/gen-skeleton.mjs`.
2. **Cost instrumentation (headline metric, currently missing).** The battery must report **orchestration
   tokens vs coding tokens** per epic and compute the **hybrid-vs-cost-optimized-all-frontier** total per
   task.
3. **A cost-optimized all-frontier baseline.** Implement the bar honestly (cloud routing across
   opus/sonnet/haiku), not naive all-opus — it is load-bearing for the entire result.
4. **The per-surface obligation checker + repair lever (the other half of M-coh-2).** Closes the
   contender's statistical reliability residue at scale; it is also the *verification-design* that lives
   in the orchestration layer.
5. **A task-distribution decision (the kill-condition that actually threatens the thesis).** Pick the
   corpus of real build-tasks the system is claimed to hold on, so the win is "true," not "true on our
   fixtures."

### Two live tensions in the plan (open, deliberate)

- **The all-frontier baseline is not free to define.** "Optimally route across opus/sonnet/haiku" is
  itself a routing problem; a lazy bar makes the cost win hollow, an honest one is real work.
- **Generalization beyond the synthetic epics is the real threat.** The existence proof lives on
  `workspace` + `scale-d{1..4}`; "reliable on a measurable task set" needs the explicit task-distribution
  decision above.

## Substrate staging (decided 2026-06-16)

- **Phase 1 — the free gateway (now).** The jnoccio free-model pool (`127.0.0.1:4317`, wired as
  `makeGatewayInvoke`) is the **upper bound** of the cost win ($0 marginal coding). It proves the
  system's *technical viability* but only **proxies** the fixed-cost story. Cheap, fast loop; reuses the
  whole existing battery.
- **Phase 2 — owned local hardware (later).** Stand up a 7B–30B local rig and re-run the proven system to
  **realize** the fixed-cost economics + the privacy/independence story. Caveat: the free gateway is an
  uncontrolled mixture possibly bigger than commodity GPUs can run, so Phase-1 reliability is an *upper
  bound* for Phase-2 — closing that gap ties to the per-model break-point work in
  `studies/oneshot-capacity/`.

## Where the imported research (the OKF) sits

The OKF bundle (`okf/agentic-workflow-optimization/`) does **not** contradict any finding, but it pulls a
different way on framing: its "next step" (**M5 = automated workflow search, GEPA-first**) is an
*academic* contribution to the agentic-workflow-search literature; **this program's deliverable is a
product** (the system that beats all-frontier on cost). M5 / workflow-search and the lens-ensemble
precursor stay on the roadmap but sit **after** the system clears the reliability gate and the cost bar —
not before. (The OKF's own skeptical source, "Inefficiencies of Meta Agents," argues the same ordering:
build the static system first.)

---

## How the history fits — three eras (so legacy docs aren't read as the goal)

The repo pivoted twice. Most docs were written under an earlier headline. **The findings carried forward
intact; only the headline question changed.**

| Era | Headline question | Status | Lives in |
|---|---|---|---|
| **1. Decomposition battery / surface-discovery** | "best way to decompose a thin plan into atomic beads" | **superseded headline**, machinery + findings still valid | README (old), CHARTER, RESEARCH-PROGRAM, RECONCILIATION, OBLIGATIONS, BUILD-TOLERANT-REFRAME, STAIRCASE-RESULTS, PRIOR-ART-COMPLETENESS, KILL-TESTS, ARCHETYPE-PREMISE, FINDINGS |
| **2. Cheap-vs-frontier stage study** | "can a harness make cheap/local match frontier, stage by stage?" | **demoted to sub-claim** | `docs/PROPOSAL.md`, `studies/build-gap/` |
| **3. Hybrid product** *(current)* | "frontier-orchestrated + lightweight-coded system beats all-frontier on cost at equal reliability" | **CURRENT north star** | `docs/PROPOSAL-HYBRID.md`, this file |

Every Era-1/Era-2 doc now carries a one-line banner saying its headline is superseded and pointing here.
Read those docs as **evidence**, not as the goal.

## Read in this order

1. **This file** (`STATE.md`) — what/where/next.
2. [`docs/PROPOSAL-HYBRID.md`](docs/PROPOSAL-HYBRID.md) — the north-star question, win condition, substrate plan, OKF reconciliation.
3. [`docs/REPORT-2026-06-16.md`](docs/REPORT-2026-06-16.md) — the full evidence synthesis (origin → reframe → M0 → M-coh ladder → the M-coh-2 double dissociation).
4. [`studies/build-gap/RESULTS.md`](studies/build-gap/RESULTS.md) + [`DESIGN.md`](studies/build-gap/DESIGN.md) — the live experiments (M0, the M-coh ladder) and the apparatus.
5. [`docs/PROPOSAL.md`](docs/PROPOSAL.md) — the Era-2 predecessor (machinery PROPOSAL-HYBRID inherits).
6. The Era-1 docs (CHARTER, OBLIGATIONS, BUILD-TOLERANT-REFRAME, …) — historical framing; load-bearing findings (the **lethal quadrant**, the obligations layer) still feed the reliability gate.
