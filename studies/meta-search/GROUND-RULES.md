# Ground rules — the win-condition pre-registration (route-pool floor · falsifiable (C)-trigger · metric alignment)

> **Status: PRE-REGISTRATION, taken 2026-06-22 (Session-7).** Resolves three decisions the apparatus had
> deferred to the research lead: the **route-pool floor** (the deferred USER call named in
> [`RUN-FOR-DAYS-PLAN.md`](RUN-FOR-DAYS-PLAN.md) §4 / [`PHASE-NEG1-RESULTS.md`](PHASE-NEG1-RESULTS.md) §3–4 /
> STATE.md Session-3), an ex-ante **falsifiable (C)-trigger**, and the **search↔freeze metric alignment** (the
> "BAR MISMATCH"). Prompted by [`EXTERNAL-REVIEW-2026-06-22.md`](EXTERNAL-REVIEW-2026-06-22.md) (Recs 1–3).
>
> **Void-rule check.** Touches **none** of the four void-triggering frozen invariants (weights vector /
> per-cell non-inferiority veto / parity δ-α / committed TEST-set hash). Rule 1 *completes* a pre-registration
> the freeze deliberately left open ("softening the raw-min statistic = a USER win-condition call",
> RUN-FOR-DAYS §4); Rules 2–3 *restate and operationalize* already-frozen quantities (δ=0.05, raw-min
> worst-of-K=8). Logged in [`AMENDMENTS.md`](AMENDMENTS.md).
>
> **Binds:** every worst-of-K comparison from this point — the ladder progress run
> ([`LADDER-RUNBOOK.md`](LADDER-RUNBOOK.md)), the winner-freeze, and the sequestered-TEST falsification — reads
> its verdict against these rules.

---

## Rule 1 — the route-pool floor (admissibility)

A coding-model draw produces one of three tiers of output:

| Tier | What it is | Disposition |
|---|---|---|
| **1 — format garbage** | no parseable module / prose reasoning blob / syntax-glue (`export functionapproveRequest`) / missing surface | **below floor → inadmissible** |
| **2 — broken code** | parses + exports the surfaces, but crashes / wrong shape / missing init / over-applied guard | **above floor → graded; the (B) repair targets** |
| **3 — wrong semantics** | runs clean + well-formed, but computes the wrong result (execute-before-approve; conservation arithmetic) | **above floor → graded; the (C) candidates** |

**The floor predicate is `parse ∧ exports-required-surfaces` (`validate-surface`), evaluated AFTER
deterministic extraction + up to 3 re-samples of the same pool (best-of-3).** A draw is below floor (labeler
bucket `route-incompetence`) only if, after pulling code out of prose AND re-sampling the same adversarial pool
≤3×, it still cannot yield a parseable module exporting the required surfaces.

- **Runtime behaviour is explicitly ABOVE the floor.** A crash / free-id `ReferenceError` parses+exports →
  tier 2 → a repair target, never excluded (Binding Premise #2 — "incompetence is the target"). *This is the
  half corrected from the verbal simplification: "runs without crashing" must NOT be in the floor, or it would
  exclude exactly what the self-repair lever exists to fix.*
- **Re-sampling is NOT model-selection.** Best-of-3 draws again from the same non-stationary mixture and keeps
  the best *output* by an oracle-blind score (the existing `--bestofn 3` + no-regress floor); it never chooses
  a model (Binding Premise #1 intact).
- **Below-floor draws are excluded from the worst-of-K, and the per-cell below-floor RATE is reported
  alongside** — how often the pool emits garbage is itself a result, not hidden. A cell with **no** admissible
  draw in K is flagged `pool-degenerate` and reported, not scored as a pass.
- **Why here:** worst-of-K=8 is a min over an unbounded-below non-stationary pool, so absent a floor it "trends
  to the worst route's incompetence by construction" (PHASE-NEG1 block A — the gating worst draws were a prose
  blob and a glued-token syntax error). The floor is the minimal content-independent predicate that makes the
  statistic measure the *system*, not the pool's worst format accident — while keeping every
  genuinely-broken-but-present draw in scope as a repair target.

**Follow-up (apparatus, not pre-registration):** the labeler's `route-incompetence` bucket
(`src/label-draw.mjs`) currently keys on parse∧export pre-best-of-N; tighten it to fire only after extraction +
best-of-3 also fail. Additive; re-validate the labeler self-test (`gates/label-draw-selftest.mjs`).

## Rule 2 — the falsifiable (C)-trigger

Binding Premise #2 ("broken code is never a (C) wall") + the RUN-FOR-DAYS rule ("never auto-(C); a human
adjudicates `unresolved`") are correct *as a discipline* but, unpaired, make the thesis unkillable from the (C)
side — any loss reclassifies as "a (B) lever we haven't built yet." This rule writes the ex-ante condition the
human adjudication must meet, so a wall is declared by **evidence, not conviction** (the 2026-06-19 "incompetence
unreachable" verdict was overturned by *direction*, not data — exactly the failure mode this guards against).

**A cell's worst-of-K residual is classified `(C) — capability wall` iff ALL hold:**

- **(a)** the gating draw is **above the route-pool floor** (Rule 1 — real code, not a format hazard);
- **(b)** it is **smoke-clean** (runs without throwing — not a tier-2 repair target);
- **(c)** the failure is **semantic** — wrong result on a behaviour the PUBLIC contract specifies — **not** a
  form mode (shape / contract / missing / init);
- **(d)** it **survives the full admissible stack** (repair → shape → contract → obligation → best-of-N →
  extraction) **across the entire K-route zoo** — i.e. **no** above-floor route in K draws gets the semantics
  right;
- **(e)** the **lever menu is exhausted** within the pre-committed time-box (Rule 3) — no untried *admissible*
  lever (model/route selection and oracle-shaped rules are inadmissible by Premises #1/#2).

**Thesis disposition (tied to the frozen δ=0.05 non-inferiority veto — no new constants):**

- A (C)-classified cell matters only where the hybrid is **inferior** — `worst-of-K < baseline − δ` — i.e.
  where the **routed all-frontier baseline holds and the hybrid does not.** (Where the baseline also erodes,
  non-inferiority already passes the cell; a hard task both arms fail is not a capability gap.)
- **KILL** (reliability half of the thesis dead *for this distribution*) iff an **entire obligation class /
  seam-topology family** is (C)-walled-and-inferior — the system structurally cannot hold a lethal obligation
  the frontier does.
- **SCOPE-SHRINK** (kill-condition #3) iff (C)-walled-and-inferior cells are **isolated** — the win is claimed
  only on the topologies that pass.
- **CONTINUE** otherwise — a residual that fails (a)–(e) is form / `unresolved` → GO-side, build the next named
  lever (within the time-box).

## Rule 3 — metric alignment + lever time-box

**Metric alignment (resolves the BAR MISMATCH).** The **archive-insertion gate, the freeze, and the
sequestered-TEST statistic are ALL the raw-min worst-of-K=8** (already frozen — RUN-FOR-DAYS §4). The search may
use a smoother within-run proxy (per-mode median-lift) **only to steer mutation**; **nothing is ever frozen,
archived, or scored on the proxy.** (The review's "make them one quantity" is right for the *gate/freeze* and
slightly too strong for the *search fitness* — raw-min over a non-stationary pool is too noisy to optimize
directly, per Deliberation #2, which warned it "would rank route-luck as gene quality." The honest rule: *the
proxy steers, worst-of-K decides, and the proxy never touches a freeze/archive decision.*)

**Lever time-box (makes Rule 2(e) reachable).** The admissible lever menu before the (C) / scope / kill verdict
is forced = **the full-stack ladder run already teed up ([`LADDER-RUNBOOK.md`](LADDER-RUNBOOK.md)) + at most 2
further named admissible levers** (named candidates: shape-gate depth; extraction / format-forcing). After the
box, residual cells are adjudicated per Rule 2 and a thesis verdict (win / scope-shrink / kill) is rendered. The
box **may** be widened, but **every widening is logged in `AMENDMENTS.md`** — silent unbounded lever-adding is
the epicycle failure this guards against.

---

## How this fits the existing apparatus

- **The labeler** (`src/label-draw.mjs`, 5 buckets) is unchanged in spirit: Rule 1 pins the floor its
  `route-incompetence` bucket measures against (now after extraction + best-of-3); Rule 2 supplies the ex-ante
  rule for promoting an `unresolved` worst draw to the genuine (C) bucket (`semantics-oracle-needed`).
- **The RUN-FOR-DAYS GO/HALT rule** (PHASE-NEG1 §4) routed a `route-incompetence`-pinned HALT to "the
  route-pool-FLOOR pre-registration USER call." **This doc is that call, resolved.**
- **The FREEZE** (`FREEZE.md`) is untouched — δ=0.05, the per-cell non-inferiority veto, the weights, and the
  TEST-hash are all referenced, none changed.
