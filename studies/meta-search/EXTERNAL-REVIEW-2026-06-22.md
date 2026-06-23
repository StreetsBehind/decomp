# External review — 2026-06-22

> **What this is.** An outside read of decomp's *direction* from a sibling program: the `brain`
> vault's `research/agent-workflow-optimization/` work, which shares decomp's literature lineage
> (GEPA / ADAS / AFlow / AlphaEvolve / MAP-Elites) and the OKF format. We audited decomp against
> that program and are **importing five of decomp's mechanisms** (worst-of-K, the FREEZE+void-rule,
> the causal-validation gate, instrument self-validation, the per-cell non-inferiority veto). This
> doc is the reciprocal half: four things we think decomp should **reconsider**. It is **advisory**,
> grounded in decomp's own records, and not a claim on the frozen apparatus. Nothing here touches
> `DESIGN.md` / `FREEZE.md`.
>
> **Bottom line up front:** the *method* is on an excellent path — the falsification discipline
> (pre-registration, worst-of-K, killing your own proposed winner) is the program's biggest asset.
> The *thesis* is on probation, and the corrections needed are about the **win condition and stopping
> rule**, not the machinery. Two of the four, decomp has already diagnosed itself; the value is in
> forcing the decision before the next climb.

---

## 1. Resolve the BAR MISMATCH before climbing again — `[priority: highest]`

decomp optimizes **per-mode within-run lift** but freezes/falsifies on **worst-of-K**. The census
(`COEVO-RUNG1-PROGRESS.md`) found the deterministic stack lifts the **median** (quota-B 5/8 draws
i25→i100) while moving the worst-of-K cell verdict **0 pp in 4/4 arms**. STATE.md already names this
the "BAR MISMATCH" and calls the route-pool-FLOOR / win-condition pre-registration **urgent**.

**The risk:** the lever search faithfully climbs a number nobody wins on, and you can't see it from
the optimizer's own scoreboard. This is the good-regulator/Goodhart failure: the optimized proxy has
decoupled from the frozen target.

**Decision asked (pre-register, before the 17-cell ladder):** make the search objective, the archive
insertion gate, and the freeze/TEST statistic the **same quantity** (raw-min worst-of-K), and pin the
**route-pool floor** + the **win condition** now. Then treat the teed-up 17-cell ladder run as a
**decision gate, not another measurement** — if the full-stack hybrid is not broadly non-inferior to
the SETTLED eroding baseline there, that should trigger a kill, not lever #9.

## 2. Make (C) falsifiable — `[priority: high]`

Binding Premise #2 ("broken cheap-model code is always a recoverable **(B)** problem, **never a (C)**
wall") combined with the RUN-FOR-DAYS rule "**never auto-(C); a null replay is human-adjudicated**"
risks an **unkillable thesis**: any loss can be reclassified as "a (B) lever we haven't built yet."
The 2026-06-19 "incompetence is unreachable" verdict was, in fact, **overruled by direction** rather
than by data.

The **(C)-reserved** discipline (don't declare a wall before the admissible levers are tried) is
correct. But it must be *paired* with a **falsifiable (C)-trigger**, or the output-QA stack becomes
epicycles that conviction, not evidence, keeps alive.

**Decision asked:** write down, ex ante, the evidence that *would* establish a capability wall —
e.g. *"if, after the full output-QA stack across the route zoo, residual worst-of-K still fails by
≥X on ≥Y cells with no untried **admissible** lever, the thesis is dead for this distribution."* A
losing config falsifies the **config**; the **thesis** is only falsifiable if its kill condition is
also on paper and watched.

## 3. Stop deferring the two real kill-conditions — `[priority: high]`

The win condition is **both** reliability parity **and** cost dominance. On the record:

- **Cost dominance has never been shown at any N.** M-coh-2.5: the only reliable author (opus,
  ~$0.395/epic at N=5) costs **more** than the entire reliable all-frontier bar (opus-whole ~$0.27).
  The existence proof is **reliability parity, not cost dominance**, and the cost story is deferred to
  Phase-2 local hardware that does not yet exist (the $0 free gateway is explicitly an *upper bound*).
- **Generalization is the stated real threat.** The proof lives on `workspace` + `scale-d{1..4}` and
  four synthetic seam topologies; the task-distribution decision (the kill-condition that actually
  threatens the thesis) keeps being deferred.

**The risk:** a clean win on synthetic fixtures with an unrealized cost model is not the deliverable
the north star promises.

**Decision asked:** **time-box** the lever-building, and schedule the two deferred kill-conditions —
(a) the real task-distribution corpus and (b) an honest amortized Phase-2 cost realization — as
gates, not someday-items. If either can't be met, that is a useful negative, on time.

## 4. Reconcile the premise wording, and consider a first-principles ground — `[priority: constructive]`

- **decomp is not purely model-agnostic, and that's fine — say so.** M-coh-2.5 establishes a necessary
  **opus-class orchestration floor** (cheap/sonnet authors clear X-CUT but fail the shared-shape seam;
  only opus-authored restores it). The premise reads cleaner as **"model-agnostic *coding*, frontier
  *orchestration*"** — which is already what the system does — rather than a blanket "route selection
  is inadmissible." The agnosticism claim is about the **coder pool**, not the orchestrator.
- **Consider an explicit first-principles canon.** decomp discovers levers reactively (shape →
  contract → persistence → seam → repair → obligation → best-of-N). A normative grounding — *why* a
  lever should exist, derived from invariants (undecidability → lean on proxies; good-regulator → the
  controller must model the disturbance; requisite-variety → hold every lethal force, not the average)
  — would let the program predict the next needed lever instead of finding it after a loss. (This is
  the one asset the sibling vault has that decomp lacks; offered as a trade.)

---

## What we're taking from decomp (reciprocity)

For context on where this review comes from — the sibling program is importing, with attribution:
**worst-of-K aggregation** over a non-stationary pool; the **FREEZE + void-rule + amendments-ledger**
discipline; **causal validation before building a lever** (dump-replay must move the *grade*);
**instrument self-validation** (a guard that can't be shown to FIRE is absent; default-to-FAIL on
empty/error buckets — the `rate()` footgun); and the **per-cell / per-force non-inferiority veto**
(never average over the silent-expensive tail). decomp's lived methodology is making those principles
*tested* rather than *asserted* — which is exactly why this review weights its method over its current
verdict.
