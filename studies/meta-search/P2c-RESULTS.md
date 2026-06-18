# Meta-search — P2c results (the evolutionary SEARCH: the deferred machinery switched on)

> **Status: the deferred P2 search machinery is BUILT + instrument-re-validated, and the assembled search
> AUTONOMOUSLY REDISCOVERS the P2b cost-dominating config from a naive seed pool, reproducibly.** P0/P1/P2a/P2b
> built the apparatus and *measured* the cost×reliability crossover by hand (P2b). P2c switches on the three
> deferred mechanisms — **celled MAP-Elites**, **counterfactual credit-attribution (skeleton-first)**, and the
> **surrogate-scorer under K7** — and asks the instrument→product question: *from the naive `/build-batch`
> seed (cheap build, no skeleton shapes, no gate, checker off), does the search FIND the winner on its own?*
> It does: at **N=13 and N=17, both mutator seeds converge on `cheap-skeleton + shapes + deterministic
> integration-gate` at $0**, which dominates the bare-opus bar (cost< ∧ per-cell lethal non-inferiority ∧
> reliability ≥ parity). This is an **instrument validation** (the search can discover the hand-found config),
> still **PROVISIONAL** on the same gaps as P2b. Apparatus additive; frozen tree `1580944…` untouched; **P0
> re-GREEN 5/5, K8 bit-identical**. Re-run: `node studies/meta-search/p2c-search.mjs`.

## What P2c asked

P2b *measured* (by hand, paired OFF/ON) that the hybrid (cheap build + frozen skeleton + the deterministic
integration-gate) holds the lethal quadrant where bare-opus erodes, at ≤cost, for N≥13. P2c asks whether the
**search instrument itself** — with the deferred machinery the FREEZE staged out of P1 (§5) now switched on —
**discovers that config autonomously**, which is the *instrument→product* step the program is built around
(the search is the instrument; the frozen config is the product; this is NOT an "optimal mix" search):

> Starting from the NAIVE pool, does the assembled P2 search (MAP-Elites + credit-attribution + surrogate)
> rediscover the P2b cost-dominating config, reproducibly across independent mutator seeds (R2C-4)?

## The three deferred mechanisms — BUILT + instrument-re-validated

Each was admitted additively and **re-validates the instrument under the new mechanism** before any result is
trusted — the same discipline P2b used (re-validate K8 under the widened operator set). All three gates GREEN;
the frozen flat-archive P0/K8 trajectory stays **bit-identical** because each mechanism is flag-gated/injected
and the frozen drivers never construct it.

| Mechanism | DESIGN | What it is | Gate (deterministic) | Result |
|---|---|---|---|---|
| **Celled MAP-Elites** | §4.1 | the search spine — cells the space by `(genotype-Hamming, per-bucket recall signature, cost bucket)`; one elite/cell; per-cell lethal veto kept at insertion; displaces an occupied cell only on Pareto-dominance. Replaces the P1 flat Pareto list (which degenerates to a point on the ~uniform cost axis). `src/map-elites.mjs` + an injected `selectParents` hook in `loop.mjs` (default = μ-best topMu → frozen path unchanged). | `gates/p2c-map-elites.mjs` | **K8 rediscovery 28/30 (93%) ≥0.90** under celled selection; **K4 no-collapse: median 17 cells** (a flat μ-best pool collapses to ~1); veto fires in-loop. |
| **Credit-attribution (skeleton-first, gated)** | §3 | counterfactual single-node reversion on the **single worst lethal candidate per generation**; **skeleton-first** (the seam is a skeleton clause no leaf owns); reversion evals **charged to K5**; the **mis-attribution kill** (restore-margin = 2×SE → "unattributable" → typed-random). `src/credit.mjs` + a flag-gated loop hook (off → frozen path). | `gates/p2c-credit.mjs` | skeleton-first attributes the broken seam to the skeleton (recovery 1.00≥0.41); a broken-crosscut to the checker (0.80≥0.36); the **mis-attribution kill rejects a sub-noise +0.20 < 0.36** (→ typed-random); evals bounded + charged. |
| **Surrogate-scorer under K7** | §5/§11/§7 | a k-NN-over-cache reliability predictor that **screens** candidates so the live arm pays the true-eval cost only on survivors (search-cost only, never product-charged; never feeds the veto). **K7 calibration kill** (FROZEN Spearman ρ ≥ 0.80 on the lethal sub-metric). `src/surrogate.mjs`. | `gates/p2c-surrogate.mjs` | fidelity **ρ=0.963 ≥ 0.80** (trusted); **K7 kill fires** on decorrelated predictions (ρ=0.53 → killed → forces true evals); cold/killed → null (no blind guess). |

**Knowledge-conditioning (§10) is DEFERRED — with reason, not omitted.** Its structured-only retrieval reads
**`confirmed`** OKF findings, and a record reaches `confirmed` only on recurrence across ≥2 *distinct
provenance classes*, which is **BLOCKED until the 2nd hand-authored oracle exists** (§6 G2 / §10 anti-rot, tied
to K6). With nothing trustworthy to retrieve and the highest K3 leak surface of the four, conditioning is the
one mechanism whose value is gated on an unbuilt external-validity prerequisite. It is "an optional enhancement,
reverting is free" (§10) → switched on *after* the 2nd oracle lands, not now.

## Method — why a calibrated landscape, and what that does/doesn't buy

A single **live** N=13 eval **exceeds 150s** (measured this session on the free gateway), so a multi-generation
× multi-seed **live** evolutionary search is not completable or hang-safe here — and the full live multi-seed
run on the sequestered TEST is **P3** anyway (DESIGN §5: "the full N-sweep runs only on the frozen winner";
FREEZE §4/§6). So the search ran on a **deterministic scale-economics landscape** (`src/scale-landscape.mjs`):
**real epic cell-counts** (real N, real bucket totals from `epics/scale-d{3,4}/tests.mjs`) with **pass-rates set
to the LIVE P2a/P2b measurements** (the `P2B` table = the P2b-RESULTS.md ladder verbatim), nested-prefix cells
so the per-cell non-inferiority veto reduces cleanly to a count comparison.

- **Anti-circularity (stated plainly).** The economics CLAIM is **P2b's** (live, measured). THIS run's claim is
  ONLY that the upgraded *search* converges on that config — an instrument validation, exactly as **K8**
  validates rediscovery of a planted optimum, here on a landscape *shaped by the real measured numbers* rather
  than an arbitrary fixture. It does not re-prove the economics; it proves the search can find them.
- **Additive.** The landscape does **not** touch the frozen synthetic evaluator that K8/P0 depend on. The
  bare-opus baseline uses the MCOH25 bar; its INTEG is the explicit **unmeasured proxy** (`iProxy`, the
  routed-baseline gap, STATE.md #3) — flagged, not folded into any "confirmed" claim.
- Seeds: the **naive** pool (`defaultGenome` + two mild variants). Search: P=6, cpp=3, ≤8 gens, MAP-Elites
  archive + celled selection + credit-attribution + surrogate (prequential predict-then-observe), a model-free
  deterministic proposer that includes the gate operators. Two independent mutator seeds per N (R2C-4).

## Results — the search rediscovers the cost-dominating config

| N | seed | found in | winner (proposed) | $ | reliability | vs bare-opus bar | surrogate K7 ρ |
|---|---|---|---|---|---|---|---|
| 13 | 1 | 3 gen / 51 ev | fusion + shapes + **gate det+r1** (+ checker) | **$0** | 0.919 | bar rel 0.676, $0.387 → **dominates** | 0.876 ✓ |
| 13 | 2 | 2 gen / 32 ev | fusion + shapes + **gate det+r1** | **$0** | 0.891 | **dominates** | 0.866 ✓ |
| 17 | 1 | 2 gen / 32 ev | fusion + shapes + **gate det+r1** | **$0** | 0.794 | bar rel 0.672, $0.431 → **dominates** | 0.834 ✓ |
| 17 | 2 | 2 gen / 32 ev | fusion + shapes + **gate det+r1** | **$0** | 0.794 | **dominates** | 0.788 ✗ (K7 tripped) |

- **Reproducible (R2C-4).** All four runs converge on the **same load-bearing config — cheap (fusion) skeleton
  + shapes + the deterministic integration-gate, at $0** — from the naive pool. The checker is mostly **off**
  (the gate is the load-bearing lever; the cheapest skeleton is strongest at scale — exactly the P2b finding).
- **Dominance.** Every proposed winner is cheaper than the bare-opus bar ($0 < $0.387/$0.431), passes the
  **per-cell lethal non-inferiority veto** vs the bar (the archive admits nothing that drops a lethal cell
  below baseline), and clears reliability parity (δ=0.05). The naive seed itself FAILS the veto (INTEG 0 <
  baseline) — so the search genuinely had to *climb* to the gate-on config, it wasn't admitted for free.
- **Credit-attribution did its job.** From a naive (integration-0) candidate the skeleton-first reversion ladder
  attributes the lethal failure to the seam genes and biases the next generation toward the shape contract +
  gate — the search reaches the two-gene optimum in 2–3 generations.
- **K7 is conservative, as designed.** The surrogate held K7 (ρ 0.83–0.88) at N=13 and both N=17 cells except
  **seed 2 at N=17 (ρ 0.788 < 0.80), where the kill correctly fired** (lower fidelity at the largest N → revert
  to all-true evals). A surrogate that always passed would be the suspicious result; one that trips at the edge
  is the kill working.

## What P2c claims — and what it does NOT

**Claims (provisional).** The deferred P2 search machinery is built, each mechanism re-validates the instrument
(P0 GREEN 5/5, K8 bit-identical), and **the assembled search autonomously rediscovers the P2b cost-dominating
config (cheap-skeleton + shapes + deterministic integration-gate, $0), reproducibly across seeds at N=13 and
N=17.** The instrument→product step — *the search can find the product* — is demonstrated.

**Does NOT claim (the gaps to a P3 result), unchanged from P2b:**
1. **Not a new economics result.** The cost×reliability dominance is P2b's *live* finding; P2c shows the search
   *converges on it*, on a landscape calibrated to those live numbers — not an independent re-measurement.
2. **Not the frozen-and-falsified winner.** The winner is **PROPOSED, not frozen.** P3 = freeze the genome JSON
   + apparatus SHA + route roster + price table, and score it **once** on the **sequestered ≥80-epic TEST set**
   spanning the n_eff seam-topology floor, via the **independent 2nd-oracle grader** (FREEZE §4/§6).
3. **Provisional cost + INTEG proxy.** opus-whole cost proxy + the **unmeasured bare-opus INTEG** (`iProxy`) —
   the **routed all-frontier baseline** (external workstream, STATE.md #3) is required for the full
   lethal-quadrant cost win.
4. **One seam-topology; deterministic landscape.** Diverse-template authoring + the 2nd hand-authored oracle
   remain prerequisites for any "confirmed" promotion; the live multi-seed search is P3.
5. **Knowledge-conditioning not switched on** (blocked on the 2nd oracle, above).

## Next (P2c→P3)

- **The routed all-frontier baseline** (external workstream) — converts the opus-whole/INTEG-proxy comparison
  into the full lethal-quadrant cost win, and gives the per-cell veto a *measured* baseline INTEG.
- **External validity:** author the diverse epic templates (the generator emits only one-template size-variants)
  + the **2nd hand-authored oracle** (unblocks "confirmed" promotion AND knowledge-conditioning).
- **P3 — freeze & falsify:** freeze the proposed winner, run the live multi-seed search + score once on the
  sequestered TEST via the independent grader; promote the load-bearing mutation (the integration-gate) into
  `docs/PROPOSAL-HYBRID.md`.
- **Tighten the lever — DONE (deterministic half).** The dominant Mode-A repair (uninitialized shared store) is
  now **surgical and deterministic** (`surgicalInitRepair` in `src/integration-gate.mjs`): it injects the init
  guard at the top of the function body instead of regenerating the surface, so it (a) **can never drop an
  obligation guard** (the X-CUT −3pp side-effect — eliminated by construction), (b) **always succeeds** and is
  **not** charged to the model `repairDepth` budget (lifts the INTEG floor at scale), and (c) stays $0. The
  model route-back (Mode-B drift) now also anchors on the current code + an explicit preserve-guards
  instruction. Validated: `gates/p2a-smoke.mjs` **44/44** (added the surgical-init + guard-preservation +
  single-line-robustness cases); **P0 GREEN 5/5**; live scale-d1 paired check — gate lifts **INTEG 50%→100%
  (+50pp) with X-CUT held at 100%** (no guard-drop regression), $0. Remaining: push INTEG past ~85% at the
  largest N (residual multi-seam drift within `repairDepth`).
