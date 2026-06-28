# LADDER-RESULTS-D — the STRONG INJECTION (`--inject-code`), the terminal lever → SCOPE-SHRINK on approve→execute

> **Run D — the 5-cell `--inject-code` ladder (the TERMINAL cheap-coder lever).** Pre-registered
> [`AMENDMENTS.md` §2026-06-28](AMENDMENTS.md) (Clauses 1–10 + the build-time GO/NO-GO); design
> [`STRONG-INJECT-PLAN.md`](STRONG-INJECT-PLAN.md). Full stack + Lever A (`--seamgate`) + Lever B
> (`--semantic --behavioural`) + the strong injection (`--inject-code`), floor + retry 3, K=8. **$0** (free-gateway
> cheap coding; the settled baseline is already spent), ~5.2 h wall, exit 0. Artifacts (gitignored):
> `runs/coevo-ladder-stack-D.json`, `runs/dump-ladder-D/`, log `runs/coevo-ladder-D.log`. **This doc is the durable
> record.**
>
> **VERDICT: SCOPE-SHRINK on the approve→execute / idempotency class (reliability-half).** The strong injection —
> the last admissible cheap-coder lever (Rule 2(e) now exhausted) — does **not** lift the hybrid to worst-of-K
> reliability parity on any approval cell (d1–d4 all wall; the SETTLED all-frontier baseline holds i100). The
> wiring hypothesis is falsified at **two** levels by the pre-registered apparatus: (1) the worst routes **botch
> the wiring** (`enforceExecute is not defined`), and (2) the Clause-7 **perturbation adjunct** shows that on the
> routes that DO pass, the frontier-authored primitive is **causally inert** — neutralizing its bindings flips
> **zero** obligation-oracle tests, so the passing routes pass by their **own** re-implementation, not by
> delegating the seam to the injected primitive. **No further cheap-coder lever** (Clause 8 epicycle guard); the
> named successor (a frontier-AUTHORED *surface* that replaces the cheap gate) is the thesis BOUNDARY, not a parity
> lever — declaring it IS the scope-shrink. **Reliability-half only — this does NOT settle the thesis** (the cost
> half is unmeasured, on a free-gateway proxy, adverse at N=5, and this lever adds frontier orchestration cost with
> zero coding-token savings).

---

## The command

```
node studies/meta-search/coevo-rung1.mjs \
  --epics approval-d1,approval-d2,approval-d3,approval-d4,lifecycle-d1 \
  --repairgate --shapegate --contractgate --obligation --bestofn 3 --seamgate --semantic --behavioural --inject-code \
  --floor --retry 3 --k 8 \
  --out coevo-ladder-stack-D.json --dump studies/meta-search/runs/dump-ladder-D
```

Header confirmed: `gate=repair+shape+contract+obligation+seam+semantic·beh+injectCode … floor=on inject=off injectCode=on`.
5 cells, not the full 17 — the four approval depths are the experiment; `lifecycle-d1` is the **inject-code no-op
control** (its skeleton declares no approve→execute rule → `scaffoldApplies → false` → byte-identical build,
0/8 wiring). The other 12 ladder cells only re-confirm known (B) classes (the Session-9 lesson: a full ladder is a
noisy instrument for one lever); narrowing is the cost fix. Inject-code is a BUILD-time intervention so it cannot
be replay-conditioned on existing dumps → a fresh-draw run is the correct instrument.

## The rollup (vs the SETTLED routed all-frontier baseline, worst-of-K=8, δ=0.05)

```
NON-INFERIOR: 1/5
  FAIL   approval-d1    base c100/i100 → hyb c100/i50  (Δc+0    Δi-0.50)   [residual authz-over/form]
  FAIL   approval-d2    base c100/i100 → hyb c100/i75  (Δc+0    Δi-0.25)   [residual shape/unwired/form]
  FAIL   approval-d3    base c100/i100 → hyb c71/i50   (Δc-0.29 Δi-0.50)   [residual body-must-be-non-empty/unknown]
  FAIL   approval-d4    base c93/i100  → hyb c86/i69   (Δc-0.07 Δi-0.31)   [residual Not requester/unknown]
  PASS   lifecycle-d1   base c80/i0    → hyb c80/i50   (Δc+0    Δi+0.50)   [residual seam/form]  ← no-op control
floor (GROUND-RULES Rule 1): mean below-floor rate 0 | pool-degenerate 0
```

Floor clean (0 below-floor, 0 pool-degenerate → every gating draw is above-floor real code; this is not a format
hazard). All four approval cells wall on integration; the SETTLED baseline holds i100 on all four.

## The wiring DID happen — this is a stronger null than run C

| cell | draws wiring `./_obligation` | per-draw FINAL integration | median i |
|------|:---:|---|:---:|
| approval-d1 | **8/8** | 100,100,100,50,50,100,50,100 | 100 |
| approval-d2 | **8/8** | 75,100,100,100,100,100,75,100 | 100 |
| approval-d3 | **8/8** | 83,75,67,50,100,83,100,100 | 83 |
| approval-d4 | **8/8** | 69,88,69,88,81,69,88,75 | 78 |
| lifecycle-d1 (control) | **0/8** | 50,50,100,100,100,50,100,100 | 100 |

Run C (prompt-inject) failed because the cheap pool *ignored the prose* and wrote its own wrong gate. Run D is a
**stronger** null: every approval draw actually **imported `./_obligation.mjs` and called `enforceExecute(...)`** —
the injection mechanism fired — and the worst-of-K still walls. The **median** route reaches i78–100, so the cell
walls are driven by the **worst 1–2 routes per cell**, not a uniform collapse.

## The experiment: inject-code ON (run D) vs inject-OFF (run B), with the no-op control as the noise floor

| approval cell | run B (inject **OFF**) i-worst | run D (`--inject-code` **ON**) i-worst | Δ |
|---|:---:|:---:|:---:|
| d1 | 50 | 50 | **0** |
| d2 | 50 | 75 | +25 |
| d3 | 33 | 50 | +17 |
| d4 | 44 | 69 | +25 |
| **lifecycle-d1 (no-op control)** | **100** | **50** | **−50** |

The control — where inject-code is a *verified* no-op (0/8 wired, byte-identical build) — swung **−50pp from route
noise alone**, *larger* than every approval uptick (+0/+25/+17/+25). So the approval upticks are **not a credible
inject-code lift**; they sit inside the demonstrated route-noise floor. This is the **4th** worst-of-K
non-stationarity sighting (after VOID-92/92, Lever A, and run C). The variance-ROBUST read is the legitimate one,
and it reads run D as a NULL on the worst-of-K. (The deterministic instrument problem documented since Session-9:
worst-of-K=8 over a non-stationary pool cannot resolve a lever whose target is the gating residual on only a
minority of draws — `AMENDMENTS.md` §2026-06-25.)

## What actually fails (the integration-fail decomposition)

The worst-of-K is *not* cleanly gated by the approve→execute semantic — it is a mix, dominated by **wiring-botch**:

- **WIRING-BOTCH — `enforceExecute is not defined`** (the dominant mode; d1, d3, d4): the surface references the
  primitive's entry point but the import/binding is broken → ReferenceError. The cheap pool *tries* to wire the
  supplied primitive and **fails to do so correctly** — the WIRING hypothesis failing directly.
- **Genuine approve→execute / idempotency SEMANTIC** (d4 especially): `Not requester`, `status advanced to
  executed`, `double-execute must append exactly one audit entry (idempotency)`, `not approved`, `Only admins can
  execute`. Even where the code runs, the SoD/idempotency obligation is violated.
- **(B) container / shape** (d2): `ctx.db.releases.getByReleaseId is not a function` — the diverse-template store
  drift, Lever A's unreached read-modify-write/seam class, unrelated to the obligation.
- **(B) generic incompetence** (d3 crosscut c71): `body must be a non-empty string`, `generateUniqueId is not
  defined`, `Assignment to constant variable`-style coding bugs.

## The Clause-7 discriminator (the load-bearing, variance-robust evidence)

Per the GO/NO-GO finding, mechanical null-wiring for approve→execute is **non-constructible leak-clean** (binding
`matchApproval`/`requesterIdOf`/`isAdmin` needs forbidden semantic-identifier matching), so the **perturbation
adjunct** is the operative probe: neutralize **one** binding in the KNOWN, generator-emitted primitive source and
re-grade — if a previously-passing obligation-oracle test flips pass→fail, the cheap WIRING carried real semantic
content (WIN-eligible); if nothing flips, the wiring is a no-op and the scaffold absorbed nothing (SCOPE-SHRINK).

Run on **6 parity-passing wired routes** (d1's three i100 routes + three d4 i88 routes), `gates/null-wiring-ablation.mjs`:

| route | wired surfaces | base crosscut | isAdmin↛ | requester↛ | idempotency↛ | anyFlip |
|---|---|:---:|:---:|:---:|:---:|:---:|
| approval-d1-d1 | executeRequest | 7/7 | 0 | 0 | 0 | **false** |
| approval-d1-d2 | executeRequest | 6/7 | 0 | 0 | 0 | **false** |
| approval-d1-d3 | executeRequest | 7/7 | 0 | 0 | 0 | **false** |
| approval-d4-d2 | settlePayout, shipRelease | 22/28 | 0 | 0 | 0 | **false** |
| approval-d4-d4 | executeRequest, settlePayout, shipRelease | 19/28 | 0 | 0 | 0 | **false** |
| approval-d4-d7 | executeRequest, settlePayout, shipRelease | 27/28 | 0 | 0 | 0 | **false** |

**Zero flips on every route.** Neutralizing the primitive's admin check, its separation-of-duties requester check,
or its idempotency short-circuit changes **nothing** in the obligation oracle — so the passing routes do **not**
route the obligation decision through the injected primitive. They wire it (import + call) but pass approve→execute
by their **own** re-implementation; the frontier-authored primitive is **causally inert** where it passes. This is
the variance-robust SCOPE-SHRINK signal — it does not depend on the noise-floor-contaminated worst-of-K. Per
`ablationVerdict`: at the cell level `no-win` (no Clause-6 parity); on the parity-passing routes, the SCOPE-SHRINK
branch ("parity reached but no perturbation flips → the cheap wiring is a no-op").

## The pre-registered verdict (AMENDMENTS §2026-06-28, Clause 8)

- **WIN-on-class** requires Clause-6 worst-of-K parity AND the null-wiring/perturbation showing the cheap wiring is
  load-bearing. **Neither holds**: no cell reaches parity, and the perturbation shows the wiring is inert.
- **SCOPE-SHRINK** = parity-but-wiring-is-a-no-op, OR isolated cells wall. The whole approval class walls, and the
  Clause-7 evidence is the no-flip (wiring-is-a-no-op) reading → **SCOPE-SHRINK**, at near-KILL strength on the
  reliability half (the whole class walls while the baseline holds i100).
- **Rule 2(e) is now exhausted.** The terminal cheap-coder lever is built, run, and null. Per Clause 8 there is no
  further cheap-coder lever for approve→execute (epicycle guard). The already-named successor — a frontier-AUTHORED
  *surface* that replaces the cheap gate — violates the binding premise *"cheap models do ALL the coding"* and is
  therefore the **thesis BOUNDARY**, i.e. this SCOPE-SHRINK, not another parity lever (hard cap logged 2026-06-27).

## Honest scope of the claim (what this does and does not establish)

- **Reliability-half only.** This bounds the *reliability* claim; it says nothing favorable about cost. The cost
  half remains **unproven and adverse** (free-gateway proxy, adverse at N=5), and the strong injection makes it
  *harder* — it adds frontier orchestration cost (the amortized primitive) with **zero** coding-token savings. **A
  reliability SCOPE-SHRINK is not a thesis verdict either way; the WIN's cost half is still unmeasured.**
- **Not a clean SEMANTIC capability-(C) at worst-of-K.** Per [[incompetence-is-the-target]], the worst-of-K is
  partly gated by wiring-botch + (B) route-incompetence, and the no-op control walls identically — so the
  worst-of-K alone cannot call approve→execute a capability wall. The SCOPE-SHRINK rests on the **variance-robust**
  Clause-7 perturbation (the inert primitive) + the prior conditioned diagnostic
  ([`LEVER-B-DIAGNOSTIC.md`](LEVER-B-DIAGNOSTIC.md): d3 0/18, d4 0/14 cleared across the zoo), **not** on the
  noise-floored worst-of-K deltas.
- **The hybrid still wins where it holds.** Membership, lifecycle, quota-as-(B), and the **median** approval route
  satisfy the obligation. The SCOPE-SHRINK is specifically: the stateful approve→execute/idempotency **seam**
  cannot be held to worst-of-K parity across a non-stationary cheap zoo, even when the obligation is supplied as a
  frontier-authored, importable primitive the cheap coder need only wire.

## ▶ Next (a PI direction call — not a lever)

The reliability program has reached its pre-registered terminus on approve→execute. The two honest moves, both
*outside* the (now-closed) cheap-coder lever menu:

1. **Claim the bounded reliability result** — the hybrid holds reliability on the obligation classes a surface (or
   the median route) can author; approve→execute/idempotency is flagged as requiring frontier authorship of the
   seam itself (the M-coh-2.5 boundary). This is a *sharpened, still-standing* reliability claim, not a refutation.
2. **Unblock the WIN's cost half** — the conjunctive win needs cost dominance *at reliability parity*, and no one is
   currently running the measurement that could settle it (the deferred live-spend / co-measured integration
   head-to-head). The reliability half is now as characterized as this instrument allows; the cost half is the
   open frontier.

## Pointers

- **Apparatus:** `src/obligation-scaffold.mjs` (the generic primitive), `coevo-rung1.mjs --inject-code`
  (default-OFF byte-identical), `gates/null-wiring-ablation.mjs` (Clause-7 + perturbation adjunct), smokes
  `gates/inject-code-smoke.mjs` (32/32), `gates/null-wiring-ablation-smoke.mjs` (19/19).
- **Records:** [`LADDER-RESULTS-C.md`](LADDER-RESULTS-C.md) (run C, the prompt-inject null),
  [`LADDER-RESULTS-B.md`](LADDER-RESULTS-B.md) (inject-OFF baseline for the experiment),
  [`LEVER-B-DIAGNOSTIC.md`](LEVER-B-DIAGNOSTIC.md) (the $0 conditioned diagnostic),
  [`AMENDMENTS.md`](AMENDMENTS.md) §2026-06-28 (the pre-registration), [`STRONG-INJECT-PLAN.md`](STRONG-INJECT-PLAN.md).
- **OKF:** `okf/agentic-workflow-optimization/findings/obligation-supply-boundary-stateful-seam.md` (updated to
  `confirmed` SCOPE-SHRINK).
