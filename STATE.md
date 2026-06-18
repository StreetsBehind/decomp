# decomp — Current State & Direction

> **The single source of truth for "what are we trying to accomplish, where are we, and what's next."**
> If a doc in this repo disagrees with this page about the *goal*, this page wins. (The legacy docs are
> still correct about their *findings* — only their headline framing is superseded. See "How the history
> fits" below.)
>
> _Last updated: 2026-06-18 (A×B co-evolution **RUNG-1 COMPLETE** — all 4 topologies route-robust through d3
> at gate-OFF base rate 0% (92/92 draws); head-to-head losses debunked as route variance; awaiting a strategy
> call (go deeper to find the erosion frontier vs. freeze). Pick up at `studies/meta-search/COEVO-RUNG1-PROGRESS.md`)._

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

### Parallel track — the M5 meta-search instrument (rev.3, FROZEN 2026-06-17; P0+P1+P2a+P2b+P2c done → the search REDISCOVERS the cost-dominating config; next is the P3 prerequisites)

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
[`P0-RESULTS.md`](studies/meta-search/P0-RESULTS.md); driver `node studies/meta-search/p0.mjs`.

**P1 CONCLUDED — loop-closure ✓; checker lever NULL at N=5 (the pre-registered K1-at-N=5).** Built the live
cheaper-author × checker arm additively (`src/{skeleton-author,checker,proposer,baseline}.mjs` + live
`evaluator.mjs` + `p1.mjs` + `gates/p1-smoke.mjs`; deterministic smoke 14/14 zero-spend; P0 re-ran GREEN 5/5
after an async `mutate` change — K8 + §14 stay bit-identical). The pilot + a 4-cell probe on scale-d1 show:
the live loop closes end-to-end, but the per-surface checker **does not move the lethal buckets at N=5** —
**INTEG is 0% in every cell** (a per-surface checker structurally cannot fix the *cross-surface* membership
seam; reproduces MCOH25's "only opus-authored skeletons restore the seam"), and the X-CUT deltas are K=1
gateway noise in cells where the checker was inert. **K1-at-N=5 confirmed**, matching MCOH25's scale-gating
(the checker pays off at N≥13, not N=5). Record: [`P1-RESULTS.md`](studies/meta-search/P1-RESULTS.md). The
frozen tree `studies/build-gap/` is untouched and no frozen invariant changed → nothing voided.

**P2a CONCLUDED — the cross-surface integration-gate MECHANISM is CONFIRMED.** The research lead **staged** P2:
build the cross-surface lever and probe whether it moves INTEG *before* paying for the full scale sweep. Built
`src/integration-gate.mjs` + the `integrationGate` genome node (hash-safe via R2-10 clean-restart — `canonical()`
strips it when off, so **P0 re-ran GREEN 5/5 with K8 bit-identical**) + `p2.mjs` (a paired-A/B probe that fixes
P1's K=1 noise) + `gates/p2a-smoke.mjs` (41/41 zero-spend). A live diagnostic found the dominant N=5 INTEG
failure is **missing defensive-init of a non-base shared store** (an undefined-access crash, NOT representation
drift → INTEG is *bimodal* ≈0%/100%); the gate was strengthened to detect that cross-surface invariant. **Result
(scale-d1, 12 rounds, paired): the deterministic gate lifts INTEG 0%→100% (Δ +92pp), recovered 11/11 drifted
rounds, X-CUT flat** — the mechanism P1's per-surface checker structurally could not deliver. The **cheap-judge**
variant is NULL (fail-open, as in P1). This is a **mechanism** result at N=5, NOT a cost-win (still scale-gated
to N≥13). Record: [`P2a-RESULTS.md`](studies/meta-search/P2a-RESULTS.md). Frozen tree untouched; nothing voided.

**P2b CONCLUDED — the predicted COST×RELIABILITY CROSSOVER is OBSERVED.** Wired the `integrationGate` mutation
operator (R2-10 clean-restart at the phase boundary) and **re-validated K8** under the widened 19-operator set
(29/30 ≥ the 0.90 floor; P0 GREEN 5/5; cross-phase frozen invariants — weights/veto/δ/α/TEST — untouched, so
nothing voided). Ran a paired scale sweep (`p2b-sweep.mjs`) of the hybrid (cheap-build + skeleton + deterministic
gate) across scale-d{1..4} (N=5→17) × {fusion, opus} skeleton, vs the MCOH25 Result-4 bare-opus bar. **Result:
at N=5 bare-opus wins (perfect + $0.278 = the pre-registered K1-at-N=5); at N≥13, where bare-opus erodes (X-CUT
78→80%, EPIC✓ 33→0%) and gets pricier ($0.387→$0.431), the $0 fusion+gate hybrid holds X-CUT *above* bare-opus
(89–90%) and the gate recovers INTEG to 69–85%, at zero cost** (opus+gate even clears EPIC✓ 33% vs bare-opus 0%
at N=17). The integration-gate is the load-bearing lever (gate-OFF INTEG 0–33% → ON 69–85%); the cheapest
skeleton is strongest at scale. **PROVISIONAL** (opus-whole cost proxy, X-CUT sub-metric, 3-round samples, not
through the per-cell veto). Record: [`P2b-RESULTS.md`](studies/meta-search/P2b-RESULTS.md). This is the strongest
evidence yet for the north-star thesis — NOT the final P3 result.

**P2c CONCLUDED — the deferred SEARCH machinery is ON and the search REDISCOVERS the P2b config.** Switched on
three of the four deferred P2 mechanisms (FREEZE §5 — NOT frozen), each **instrument-re-validated under the new
mechanism** (the P2b discipline): **celled MAP-Elites** (`src/map-elites.mjs` + an injected `selectParents`
hook; K8 rediscovery 28/30, K4 no-collapse median 17 cells), **counterfactual credit-attribution**
(skeleton-first + the 2×SE mis-attribution kill, `src/credit.mjs`; evals charged to K5), and the
**surrogate-scorer under K7** (`src/surrogate.mjs`; fidelity ρ=0.96, the kill fires on decorrelation). The 4th —
**knowledge-conditioning — is deferred with reason** (its `confirmed`-record store is blocked until the 2nd
hand-authored oracle exists; highest K3 leak surface; optional). All flag-gated/injected → **P0 re-GREEN 5/5, K8
29/30 bit-identical**, frozen invariants untouched → nothing voided. **The search** (one live N=13 eval >150s, so
it ran on a deterministic landscape **calibrated to the live P2a/P2b numbers** — the economics claim is P2b's,
this run's claim is only that the SEARCH converges, cf. K8): from the **naive** pool, with all three mechanisms
on, **both mutator seeds at N=13 and N=17 rediscover the same config — cheap (fusion) skeleton + shapes + the
deterministic integration-gate, at $0** — dominating the bare-opus bar (cost< ∧ per-cell lethal non-inf ∧
reliability≥parity; the naive seed itself fails the veto, so the search had to climb). Reproducible (R2C-4); the
gate is the load-bearing lever (checker mostly off). **PROVISIONAL** (opus-whole + unmeasured-INTEG proxies; one
seam-topology; deterministic landscape) — the winner is **PROPOSED, not frozen**. Record:
[`P2c-RESULTS.md`](studies/meta-search/P2c-RESULTS.md); driver `node studies/meta-search/p2c-search.mjs`.

**Next action: the P3 prerequisites, then freeze + falsify.** (1) **The routed all-frontier baseline** (external
workstream) — converts the opus-whole/INTEG-proxy comparison into the full lethal-quadrant cost win and gives the
per-cell veto a *measured* baseline INTEG. (2) **External validity:** author the diverse epic templates + the
**2nd hand-authored oracle** (unblocks "confirmed" promotion AND knowledge-conditioning). (3) **P3 — freeze &
falsify:** freeze the PROPOSED winner (genome JSON + SHA + route roster + price table), run the live multi-seed
search + score **once** on the sequestered ≥80-epic TEST via the independent 2nd-oracle grader (FREEZE §4/§6);
promote the integration-gate into [`PROPOSAL-HYBRID.md`](docs/PROPOSAL-HYBRID.md). (4) **Tighten the gate —
DONE (deterministic half):** the dominant Mode-A repair is now surgical + deterministic (`surgicalInitRepair`,
preserves obligation guards by construction → the X-CUT −3pp is gone; lifts the INTEG floor; $0); validated
p2a-smoke 44/44 + P0 GREEN + a live scale-d1 check (INTEG 50%→100%, X-CUT held 100%). Remaining: push INTEG past
~85% at the largest N (residual multi-seam drift). Ledger: [`AMENDMENTS.md`](studies/meta-search/AMENDMENTS.md).

**P3 PREREQUISITES BUILT + COMMITTED, and the HEAD-TO-HEAD reframed the program (2026-06-18; committed
`5f9b452`, `5e65291`).** (a) 2nd oracle, diverse templates (4 seam topologies), sequestered TEST + content hash
(`74f10cbc…`), and the **routed all-frontier baseline** all built (`ORACLE2.md`, `DIVERSE-TEMPLATES.md`,
`TEST-SET.md`, `ROUTED-BASELINE.md`). The routed baseline builds at **100% through D=3** — so the P2b/P2c
"crossover" win was vs the weak **opus-WHOLE proxy**; against the real baseline it was a cost/reliability TRADE,
not dominance. (b) The **live head-to-head** (`HEAD-TO-HEAD.md`; hybrid vs routed baseline, identical epics,
same oracles, ~$0) gave a **topology-gated** verdict: **WIN** (parity at ⅓–½ cost) on state-ordering
(lifecycle) + set-membership; **LOSS** on conservation (quota) + separation-of-duties (approval). The gap is
mostly **cheap-tier coding-quality, not an unhandled seam** — the integration-gate is membership-specific and
no-ops elsewhere. (c) **The P2c "proposed winner" is NOT ready to freeze.** NEW DIRECTION = the **A×B
co-evolution program** (co-evolve orchestration **and** output-QA, scale-laddered, worst-of-K across routes,
freeze the champion at the end). Full handoff spec: [`COEVOLUTION-SPEC.md`](studies/meta-search/COEVOLUTION-SPEC.md).
Binding principle: the system must be **model-agnostic** (route/model selection is NOT an admissible fix);
classify every failure (A) orchestration / (B) output-QA / (C) boundary.

**A×B CO-EVOLUTION STARTED (2026-06-18; apparatus UNCOMMITTED) — rung-1 starting line measured + generalized
seam-gate built. Pick up: [`COEVO-RUNG1-PROGRESS.md`](studies/meta-search/COEVO-RUNG1-PROGRESS.md).** The 5
open design questions (§8) are resolved. **Key finding:** under **worst-of-K=3 across routes** (the
model-agnostic fitness), all 4 topologies pass d1 at **100/100 — INCLUDING quota + approval**, contradicting
the head-to-head's single-draw losses → those were **route variance / gateway drift, NOT structural** (the
exact thing worst-of-K exists to expose). CAVEAT: K=3 can't *certify* route-robustness (P(3/3 pass)≈0.42 at a
25% per-route fail rate) → ran a **K=10 base rate**: quota-d1 + approval-d1 are **10/10 draws 100/100** across
15/17 distinct routes (13/13 clean with the K=3 run) — the head-to-head d1 losses **DO NOT reproduce**, so they
were route-unlucky tails / same-day gateway drift, NOT structural. **→ d1 is SOLID; the real work is the d2/d3
climb** (where the head-to-head's deep losses were graded partials: quota integ 63/75, approval crosscut→71).
⚠️ **Newly-confirmed methodological flag: the free gateway is a NON-STATIONARY pool** — single-draw verdicts are
unreliable (validates worst-of-K); freeze/TEST must mind pool drift; Phase-2 fixed local hardware is the mitigation. **Built (additive, frozen tree untouched):** `coevo-rung1.mjs` (worst-of-K harness + A/B/C attribution +
`--seamgate`); `src/seam-gate.mjs` (generalized gate — per-topology seam profile from the public skeleton,
Mode-A init + Mode-B drift, **membership delegates bit-identically** to the proven gate, oracle-blind;
**Mode-C semantic invariants STAGED OFF** until the base rate shows they're load-bearing); `gates/seam-gate-smoke.mjs`
(22/22 green). P0/K8 unperturbed (synthetic path calls no gate); re-validate K6/K7/K8 when the gate/genes wire
into the live evaluator+genome (tasks #3/#4). NEXT after the base rate: paired `--seamgate` probe → then the
(A) contract-precision + (B) extraction genes (`src/genome.mjs`, new unfrozen genome).

**RUNG-1 COMPLETE (2026-06-18; apparatus UNCOMMITTED) — all 4 topologies route-robust THROUGH d3, gate-OFF
base rate 0%.** The paired `--seamgate` d2/d3 climb ran on all four seam topologies (quota + approval first,
then lifecycle d2/d3, then membership d1/d2/d3 after unpinning its depth-matched oracle). **Grand total: 0
gate-OFF failures in 92 draws** (quota/approval d1 K=10, all cells d2/d3 K=8) across ~25 distinct cheap
routes, at ~½ routed-baseline cost ($0.395 vs $0.74–0.81). **Three reads:** (1) the head-to-head's
topology-gated losses (quota integ 25, approval integ 17/75) were **route variance** — approval-d3 passed
8/8 across 23 routes — so the P3 "topology-gated, not freezable" verdict is **overturned** under worst-of-K;
(2) the seam-gate fired on every draw + applied 100+ repairs but **recovered nothing** (base rate already 0%)
→ **not demonstrated load-bearing at d1-d3**; (3) the task-#3 gene program (premised on *structural* losses)
is **not justified at this scale**. **The erosion frontier was NOT reached at d3.** Records:
`coevo-rung1-k10-d1-baserate.json`, `coevo-rung1-d2d3-seamgate.json`, `coevo-lifecycle-d23.json`,
`coevo-membership-d123.json`. **Apparatus (additive, dev — frozen tree untouched):** `coevo-rung1.mjs` gained
`--out`; `epicSpec` membership now uses depth-matched `oracle2-tests-d${D}.mjs` (d1 bit-identical) + new
`gates/lib/oracle2-tests-d{2,3}.mjs`. ⚠️ These touch the live oracle wiring → the §3.3 K6/K7/K8 + P0
re-validation is **DUE before any freeze**. **NEXT = a STRATEGY CALL (user's):** (1) **go deeper to find the
erosion frontier** — membership-d4/d5 is runnable NOW (oracle generalizes; quota/approval/lifecycle would need
new d4 templates); or (2) **move toward freeze** + the once-only sequestered-TEST. The gene program is parked
unless erosion appears.

P2c apparatus UNCOMMITTED (user has not asked to commit); P3-prereq + head-to-head apparatus COMMITTED.

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
