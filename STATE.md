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

0. **✅ DONE — M-coh-2.5, skeleton provenance (the crux).** Ran 2026-06-16 (`studies/build-gap/MCOH25-RESULTS.md`).
   **(a) Frontier orchestration IS necessary, and it's opus-class.** Cheap *and* sonnet authors produce the
   obligation clause (X-CUT 100%) but fail the `addMember→postComment` shared-shape **seam** (INTEG 0–13%);
   only opus-authored restores it (INTEG/EPIC 80%, matching the hand anchor). The all-local branch is dead
   on this epic; the frontier premium is precisely the shared-shape clause (M-coh-2 dissociation reappearing
   along the provenance axis). **(b) Orchestration cost measured:** opus ~$0.40/epic, sonnet $0.092, gateway $0.
   **Headline tension:** at N=5 the only reliable author (opus, $0.395) costs **more than the entire reliable
   all-frontier bar** (opus-whole, ~$0.27) → the workspace existence proof is **reliability parity, NOT cost
   dominance**. Cost-dominance is scale-gated and **not demonstrated at any N yet** (the skeleton-harness's
   strict EPIC✓ also erodes to 0% at N=17, though it holds X-CUT at 95% vs bare-opus 80%).
1. **The new crux — the per-surface obligation/seam checker + repair lever (M-coh-2's other half).** This is
   now blocking: it must stop the harness's EPIC✓ erosion at scale, which is exactly where the cost gap vs
   bare opus opens (N≥13). It is also the *verification-design* that lives in the orchestration layer.
   **Kickoff seed:** spec in `studies/build-gap/DESIGN.md §4b` (per-surface checker + integration-gate+repair);
   apparatus seam = `epic-run.mjs`'s retry gate (`isValidSurface` → extend to an *obligation* checker) +
   `lib/validate-surface.mjs`. The checker is authored from the skeleton's typed obligation contract (it may
   NOT read the held-out oracle `epics/*/tests.mjs`). Measure: does it lift the harness EPIC✓ off 0% at
   scale-d3/d4 (N=13/17)? Then re-run the cost-join vs bare-opus to test the cost crossover with reliability held.
2. **An honest scale + amortization story.** Author opus skeletons at N≥13 and/or reuse one skeleton across
   epics, to amortize the ~$0.40 orchestration term below the all-frontier line. (Defensible weaker claim
   already holds: hybrid dominates all-frontier on the lethal-quadrant X-CUT sub-metric at ≤cost above N≈13.)
3. **A cost-optimized all-frontier baseline.** Implement the bar honestly (cloud routing across
   opus/sonnet/haiku), not naive all-opus — it is load-bearing for the entire result. (M-coh-2.5 used the
   admissible reliable bar = opus-whole, since sonnet-whole fails the reliability gate.)
4. **A task-distribution decision (the kill-condition that actually threatens the thesis).** Pick the
   corpus of real build-tasks the system is claimed to hold on, so the win is "true," not "true on our
   fixtures."

### Parallel track — the M5 meta-search instrument (rev.3, FROZEN 2026-06-17; P0 GREEN → next is P1)

The M5 adaptive-harness was **brought forward** as an *instrument → fixed product* discovery tool for crux
item 1 (the checker lever × scale): an evolutionary/reflective search over builder-system configs that finds
whether/where a hybrid dominates all-frontier, then **freezes the winner and re-tests it** as a fixed
architecture (NOT "optimal mix" — the search is the instrument, the frozen config is the product). Spec:
[`studies/meta-search/DESIGN.md`](studies/meta-search/DESIGN.md) (**rev.3, after a 2nd 2-round adversarial
review** — 15 canonical findings folded; the **bucket-average veto became a per-cell non-inferiority veto**,
credit-attribution/niching/surrogate/knowledge-capture were staged out of the frozen P1 set, the routed
all-frontier baseline was scoped to a separate workstream with an interim opus-whole proxy, and a
measurement-layer cluster was added — instrument self-validation, effective-sample-size, harness-error
handling, concrete freeze values). Two new Tier-2 decisions resolved (§13.4 baseline scope = external
prereq + proxy; §13.5 instrument self-validation = hard K8 gate). **The pre-registration freeze was TAKEN
2026-06-17** (after a GO-WITH-FIXES freeze-readiness re-check: TEST-hash staged, anchor pair
`{workspace, scale-d1}` named + content-hashed, all values pinned — δ=0.05, α=0.05, weights (1.0/1.0/0.1/0.0),
per-cell non-inferiority veto, K5=250, K6≥0.90, K7 ρ≥0.80, K8 ≤8gen/≤300evals, max-M=12, restore-margin=2×SE).
Full record: [`studies/meta-search/FREEZE.md`](studies/meta-search/FREEZE.md). rev.3 also adds **§14 operational
autonomy** (checkpoint/resume + watchdog + mechanized off-path curation + the Phase-1-mechanism-only boundary)
so a single run goes hands-off within the guardrails — freeze-compatible, "run-until-a-guardrail-then-halt."
**P0 COMPLETE — GREEN (2026-06-17).** Built additively under `studies/meta-search/` (~1.6k LOC; frozen
apparatus tree `studies/build-gap/` verified untouched). All 5 blocking gates pass: G0 freeze-consistency,
G1 per-cell-metric wired through the real `evaluateEpic` (digest leaks no cell names; veto rejects a lethal
drop), G2 oracle kill-rate 1.000/1.000 (≥0.90 lethal), K8 planted-positive rediscovery 30/30 pinned seeds
(99.4%/500 base rate) within ≤8gen/≤300evals + in-loop veto, §14 checkpoint→resume bit-identical + watchdog
halts-to-checkpoint on a planted hang. Live gateway smoke OK (non-blocking). Record:
[`P0-RESULTS.md`](studies/meta-search/P0-RESULTS.md); driver `node studies/meta-search/p0.mjs`. **Next
action: P1** — the cheaper-author × checker arm at fixed N=5 over the anchor pair (the mechanism question:
does the checker lever move `crosscut`/`integration`), reflective proposer + live epic evaluator. The
void-rule starts at P1. Ledger: [`AMENDMENTS.md`](studies/meta-search/AMENDMENTS.md).

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
