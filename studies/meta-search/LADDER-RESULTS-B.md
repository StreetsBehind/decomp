# LADDER-RESULTS-B — full-stack hybrid worst-of-K=8 with Lever A + Lever B + option 3

> **Run:** `coevo-rung1.mjs --ladder --repairgate --shapegate --contractgate --obligation --bestofn 3
> --seamgate --semantic --behavioural --floor --retry 3 --k 8` (the [`LADDER-RUNBOOK.md`](LADDER-RUNBOOK.md)
> turnkey command). **$0** (free gateway; settled baseline already spent), **~14h**, exit 0. Artifacts:
> `runs/coevo-ladder-stack-B.json` + `runs/dump-ladder-B/` (gitignored — this writeup is the durable record).
> Date: 2026-06-26/27 (Session-11).

## Headline

**NON-INFERIOR 5/17 (δ=0.05) vs the SETTLED routed all-frontier worst-of-K=8 baseline.** Floor (GROUND-RULES
Rule 1): mean below-floor rate **0.059**, **pool-degenerate 0** → the worst-of-K gating draw is above-floor
*real code* in every failing cell (extraction stays deprioritized, as in Session-8/9).

**This is the best of the three ladder runs** — Session-8 (pre-Lever-A) 2/17, Session-9 (Lever A) 1/17, now
(Lever A + Lever B `--semantic` + option 3 `--behavioural`) **5/17**. The semantic/behavioural levers + the
full stack lifted the non-inferiority count and produced the clearest obligation-lever wins yet
(`lifecycle-d1` baseline-eroded **80/0 → hybrid 100/100**; `lifecycle-d3` 73/100 → 87/100; `quota-d1` parity).

**It is NOT freeze-ready** (broadly inferior, 12/17 fail) and it is **NOT a thesis (C)-KILL.** The 12 failing
cells partition cleanly: **8 are (B) output-QA targets** (broken code, tenancy/seam/shape drift, container-drift
conservation) and **4 are the approve→execute/idempotency semantic class** (approval d1–d4) — the
(C)-boundary candidate, now **confirmed on the live worst-of-K instrument**, not just the $0 conditioned
diagnostic. **But Rule 2(e) is not yet exhausted** — one named, admissible, unbuilt lever remains for that
class (the obligation **INJECT** half), so the verdict is **CONTINUE**, with the inject lever as the next move.

## Per-cell rollup

| Cell | base c/i | hybrid worst c/i | verdict | worst-draw residual | class |
|---|---|---|---|---|---|
| membership-d1 | 100/100 | 71/67 | FAIL | `this must be of type Crypto` crash + under-authz | **(B)** crash/authz |
| membership-d2 | 83/50 | 83/50 | **PASS** | shape/unwired | (B) form (non-inf) |
| membership-d3 | 100/100 | 88/89 | FAIL | `Only members may post` (under-authz) | **(B)** crosscut |
| membership-d4 | 91/75 | 86/75 | **PASS** | shape/unwired | (B) form (non-inf) |
| membership-d5 | 93/80 | 89/73 | FAIL | tenancy | **(B)** form |
| approval-d1 | 100/100 | 71/50 | FAIL | approve→execute / idempotency | **(C)-cand** |
| approval-d2 | 100/100 | 79/50 | FAIL | approve→execute (+ authz draws) | **(C)-cand** |
| approval-d3 | 100/100 | 67/33 | FAIL | approve→execute (worst draw a crash) | **(C)-cand** |
| approval-d4 | 93/100 | 89/44 | FAIL | approve→execute (worst draw IS semantic, i43) | **(C)-cand** |
| lifecycle-d1 | 80/0 | **100/100** | **PASS** | — (8/8 solid) | win |
| lifecycle-d2 | 80/100 | 60/100 | FAIL | tenancy (6/8 PASS) | **(B)** form |
| lifecycle-d3 | 73/100 | 87/100 | **PASS** | prohibited-fields | (B) (non-inf) |
| lifecycle-d4 | 100/100 | 80/75 | FAIL | `Assignment to constant variable` crash + tenancy | **(B)** crash/form |
| quota-d1 | 100/25 | 100/25 | **PASS** | conservation (baseline also i25) | (B) (non-inf) |
| quota-d2 | 100/100 | 50/25 | FAIL | conservation = container-drift | **(B)** container-drift |
| quota-d3 | 100/75 | 73/17 | FAIL | `Invalid wallet` (existence-seam) | **(B)** seam |
| quota-d4 | 100/63 | 70/44 | FAIL | conservation = container-drift | **(B)** container-drift |

## The load-bearing finding — the approve→execute/idempotency wall is now LIVE-confirmed

The runbook's surface classifier labels each cell by its single worst draw, which masked the structure. Reading
the **per-draw** integration failures (`runs/coevo-ladder-stack-B.json` → `draws[].final.fails`) and correcting
for the known classifier under-count (`Request/Payout/Release/Expense not approved` and `status advanced to
executed` are BOTH the approve→execute/idempotency class, not "unknown") gives the real picture:

- **The semantic class fails on ~6/8 draws in every approval cell d1–d4.** (d1 6/8, d2 6/8, d3 6/8, d4 6/8;
  the other 1–2 draws per cell are a (B) crash or an authz-over draw that scores *even lower*.)
- **The worst-of-K integration among the semantic draws ALONE is i43–50**, versus a SETTLED baseline that holds
  **i100** on all four cells (even the worst of 8 routed-frontier routes gets approve→execute right). So the
  hybrid is genuinely inferior by 50–67pp on integration *because of the semantic class* — repairing the
  incidental (B) crash draws would not lift these cells off the wall.
- **Lever B (`--semantic`) and option 3 (`--behavioural`) are IN this stack and do not clear it.** This
  confirms the $0 conditioned diagnostic ([`LEVER-B-DIAGNOSTIC.md`](LEVER-B-DIAGNOSTIC.md)) on the live
  instrument: the cheap pool writes a structurally/behaviourally-present-but-semantically-wrong approve→execute
  gate even re-prompted with the declared obligation, across the zoo. The variance-robust unanimous-failure
  read holds on the real worst-of-K, not just the conditioned subset.

**This is the program's first LIVE-instrument-confirmed (C)-leaning** (Session-9's variance-robustness
asymmetry realized: a universal-failure read survives the non-stationary pool).

### Why it is still CONTINUE, not a confirmed (C) scope-shrink (Rule 2(e))

A confirmed (C) requires the **named admissible lever menu exhausted.** It is not: the **obligation INJECT
half** is named, admissible, and unbuilt. The stack so far only *verifies+repairs* what the cheap coder wrote
(obligation-contract → Lever B → option 3). The diagnostic's failure mode is precisely *"the cheap pool writes
a semantically-wrong gate even when handed the obligation"* — which is the signature case for moving the
authoring of the approve→execute idempotency state-machine **out of the cheap coder and into the frozen
skeleton / orchestration layer** (`injectBlock`, already exported + smoke-tested per the runbook, not in the
build path). This is exactly the M-coh-2 / M-coh-2.5 result applied to a new seam: *the frontier-orchestration
artifact must carry both shared shapes AND the typed obligations; where the cheap coder can't author the seam,
the skeleton injects it.* It is **Premise-1-faithful** (no route selection) and **Premise-3-faithful** (mutate
the harness/orchestration), so it must be tried before any (C) verdict ([[incompetence-is-the-target]]).

## The (B) work-list (8 cells — CONTINUE)

1. **Repair-gate robustness on hard crashes.** `membership-d1` (`Value of "this" must be of type Crypto` — a
   WebCrypto binding misuse), `lifecycle-d4` (`Assignment to constant variable`), and the incidental
   `approval-d3/d4` crash draws survived the smoke-execute + route-back. The repair gate isn't catching/fixing
   these on the worst route — a lever-tuning target (still (B)).
2. **Quota container-drift (the read-modify-write seam).** `quota-d2/d4` conservation failures
   (`the 50 is still there after the refused`, `only 40 charged ⇒ 60 remains`, `Insufficient funds`) are
   **balance corruption from the Map/Array ledger drift**, NOT a conservation-arithmetic (C) wall — Lever B
   detection fired on 0/8 quota draws here (0/32 in the enlarged diagnostic), confirming the re-attribution.
   This is Lever A's *unreached* read-modify-write class: build container reconciliation on the
   read-modify-write path (`quota-d3` `Invalid wallet` is the adjacent existence-seam).
3. **Tenancy / seam generalization.** `membership-d3` (under-authz `Only members may post`), `membership-d5`,
   `lifecycle-d2` (tenancy, 6/8 PASS = borderline route-variance). Seam/tenancy lever depth.

## Decision (pre-registered tree, [`LADDER-RUNBOOK.md`](LADDER-RUNBOOK.md) §"After the run")

- **NOT freeze** (5/17; broadly inferior).
- **NOT a (C)-KILL** (no whole-class wall with the lever menu exhausted; the inject half remains; d2 retains a
  thin conditioned (B) tail; cost-dominance intact; parity demonstrated on membership/lifecycle classes).
- **CONTINUE.** Highest-EV next lever = the **obligation INJECT half** for the approve→execute/idempotency
  state-machine (targets the live-confirmed (C)-leaning AND is the orchestration-layer move the thesis predicts;
  $0). In parallel (B): repair-gate crash robustness + the quota read-modify-write container reconciliation.
- If the inject lever is built and the approve→execute class **still** walls unanimously across the zoo with the
  baseline holding → **then** Rule 2(e) is exhausted and the honest verdict is a **SCOPE-SHRINK**: claim the win
  on the obligation classes the hybrid holds, and flag approve→execute/idempotency as requiring frontier
  authorship (skeleton-injected), not cheap-coder authorship.

## Provenance / invariants

Frozen tree untouched; no frozen invariant (weights / per-cell veto / δ-α / TEST-hash) touched. Apparatus
UNCOMMITTED (the `--semantic`/`--behavioural`/Lever-A code is from Session-10; this run added only the
gitignored artifact + this writeup). The settled baseline comparator (`baseline-settled-vector.json`,
`runs/routed-baseline-settled.json`) is unchanged.
