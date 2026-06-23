# LADDER RESULTS — full-stack hybrid worst-of-K=8 vs SETTLED routed-baseline (floor-respecting decision gate)

> **Run: 2026-06-23 (Session-7).** The [`LADDER-RUNBOOK.md`](LADDER-RUNBOOK.md) decision-gate ladder, read
> against [`GROUND-RULES.md`](GROUND-RULES.md). This is the **conservative floor-WITHOUT-extraction first
> pass** (extraction is unbuilt; `--floor` excludes below-floor draws but does not yet recover them). $0
> (free-gateway hybrid; baseline already spent). Wall time ~12h45m. Artifact:
> `runs/coevo-ladder-stack.json`; raw dumps `runs/dump-ladder/`; log `runs/ladder-stack.log`.

**Command (exactly as pre-registered):**
```
node studies/meta-search/coevo-rung1.mjs --ladder \
  --repairgate --shapegate --contractgate --obligation --bestofn 3 --seamgate \
  --floor --retry 3 --k 8 --out coevo-ladder-stack.json --dump studies/meta-search/runs/dump-ladder
```

## Headline

**NON-INFERIOR: 2/17** (δ=0.05) vs the SETTLED routed all-frontier worst-of-K=8 baseline. **→ NOT a freeze.**
This is a clear conservative-pass FAIL of the broad-non-inferiority bar — but it is **not a (C) thesis-kill**
(Rule 2 not met on any cell; see below) and the residual partition points at a specific, named (B) lever, not
a wall. Floor (Rule 1): **mean below-floor rate 0.096, pool-degenerate 0** — every cell kept an admissible
pool; format hazards are **not** the bottleneck.

## The rollup (17 cells)

| Cell | base c/i | hyb c/i | Δc / Δi | verdict | bf | residual class |
|---|---|---|---|---|---|---|
| membership-d1 | 100/100 | 86/100 | −.14 / +0 | FAIL | 0/8 | authz under-enforce (crosscut) — **(B) form** |
| membership-d2 | 83/50 | 92/83 | +.08 / +.33 | **PASS** | 0/8 | — |
| membership-d3 | 100/100 | 88/89 | −.12 / −.11 | FAIL | 0/8 | seam — **(B) form** |
| membership-d4 | 91/75 | 77/75 | −.14 / +0 | FAIL | 0/8 | coding-bug — **(B) repair** |
| membership-d5 | 93/80 | 89/80 | −.04 / +0 | **PASS** | 1/8 | seam — **(B) form** |
| approval-d1 | 100/100 | 100/50 | +0 / **−.50** | FAIL | 1/8 | approve→execute / idempotency — **(C)-cand** |
| approval-d2 | 100/100 | 79/50 | −.21 / **−.50** | FAIL | 2/8 | over-applied authz — **(B) form** |
| approval-d3 | 100/100 | 91/42 | −.10 / **−.58** | FAIL | 0/8 | approve→execute / idempotency — **(C)-cand** |
| approval-d4 | 93/100 | 82/44 | −.11 / **−.56** | FAIL | 0/8 | approve→execute / idempotency — **(C)-cand** |
| lifecycle-d1 | 80/0 | 60/50 | −.20 / +.50 | FAIL | 1/8 | seam — **(B) form** |
| lifecycle-d2 | 80/100 | 60/50 | −.20 / −.50 | FAIL | 0/8 | tenancy — **(B) form** |
| lifecycle-d3 | 73/100 | 73/50 | +0 / −.50 | FAIL | 0/8 | tenancy — **(B) form** |
| lifecycle-d4 | 100/100 | 70/63 | −.30 / −.375 | FAIL | 1/8 | coding-bug — **(B) repair** |
| quota-d1 | 100/25 | 40/0 | **−.60** / −.25 | FAIL | 1/8 | seam — **(B) form** |
| quota-d2 | 100/100 | 70/50 | −.30 / −.50 | FAIL | 1/8 | seam — **(B) form** |
| quota-d3 | 100/75 | 67/17 | −.33 / −.58 | FAIL | 2/8 | seam — **(B) form** |
| quota-d4 | 100/63 | 75/38 | −.25 / −.25 | FAIL | 3/8 | conservation arithmetic — **(C)-cand** |

## Rule 1 (floor) — extraction is deprioritized by the data

13 below-floor draws out of 136 (rate 0.096); **0 pool-degenerate cells**. The worst-of-K gating draw is an
**above-floor** draw (real, parseable, surface-exporting code that is broken or semantically wrong) in **every
failing cell**. Extraction — the pre-registered Rule-3 named lever #1 — recovers *below-floor* format garbage;
with only ~10% of draws below floor and no degenerate cell, recovering them cannot lift a worst-of-K whose
gating draw is already above the floor. **Finding: extraction is not load-bearing on this ladder; the named
lever menu should be re-pointed** (logged in [`AMENDMENTS.md`](AMENDMENTS.md) per Rule 3).

## Rule 2 (the (C)-trigger) — NO cell is (C)-confirmed; 4 are (C)-candidates

The residual partition (per-gate stage attribution, below): **11 of 15 failing cells are (B)** — form
(seam/tenancy/over-authz/under-authz) or coding-bug (repair targets). **4 are semantics (C)-candidates** —
approval-d1/d3/d4 (`approve→execute` ordering / idempotency) and quota-d4 (conservation arithmetic). **None
clears the Rule-2 (C) bar**, because condition **(e) is unmet**: the lever menu is *not* exhausted (the
generalized seam/integration lever for the non-membership topologies is the obvious untried admissible (B)
lever, and the approval ordering-obligation has not been attempted as an inject+verify contract). Per Rule 2
the thesis is therefore **CONTINUE**, not KILL and not SCOPE-SHRINK.

## The structural read — the stack works, but the seam-recovery is membership-specific

The gate stack is **demonstrably load-bearing** (worst-of-K, raw→final):
- **repair** lifted approval-d1 **c14→71 / i0→25** (the self-repair unblocker at the bottom of the stack);
- **obligation+best-of-3** lifted membership-d2 **c83→92 / i50→100** and approval-d1 **c71→100 / i25→50**;
- **shape** lifted integration on lifecycle-d2/d3/d4 and quota-d2/d3 (e.g. lifecycle-d4 **i38→63**);
- **contract** lifted quota-d2 **i13→50** and quota-d4 **i19→38** (admin-scoped `deposit` over-strip removal).

But the **dominant residual gating axis is integration (the seam)** on the three non-membership topologies:
membership integration recovers to 80–100 (the proven membership integration-gate fires), while approval /
lifecycle / quota integration stalls at **i42–63** (Δi −.375 to −.58). This **reproduces the head-to-head
finding** (`HEAD-TO-HEAD.md`): the integration-gate is membership-specific and **no-ops** on the other
topologies, and the generalized seam-gate (Mode-C semantic invariants staged off) does not close their seam.
The crosscut misses are secondary and smaller (Δc −.04 to −.33, one −.60 at quota-d1).

### By topology
- **membership — at the bar.** 2 PASS (d2, d5); 3 small FAILs (Δc −.12 to −.14, integration held). The
  strong topology; its integration-gate is load-bearing.
- **approval — the (C)-boundary crux.** Integration collapses to i42–50 across all four depths; 3 cells
  classed `approve→execute / idempotency` semantics. The genuine (C)-candidate cluster.
- **lifecycle — (B) form.** Seam (d1) + tenancy (d2/d3) + one coding-bug (d4); integration stalls at 50–63.
  Shape-gate helps (i25→50) but does not close it.
- **quota — (B) form + one (C)-candidate.** Seam (d1/d2/d3) with big crosscut drops (Δc −.30 to −.60);
  conservation arithmetic at d4. Contract lifts quota integration but trades crosscut.

## Decision (per GROUND-RULES Rule 3 lever time-box)

1. **Not a freeze** (2/17 non-inferior). **Not a (C)-kill / not a scope-shrink** (Rule 2 unmet; dominant
   residual is (B) form, 11/15).
2. **Re-point the ≤2 named admissible levers** (the pre-registered set was {extraction, shape-depth};
   extraction is deprioritized by the Rule-1 data above). The evidence names:
   - **Lever A — generalized seam/integration recovery for approval + lifecycle + quota.** The single
     dominant axis (Δi −.50 collapse on 8 cells); the membership integration-gate proves the *mechanism*
     exists, the work is generalizing it past membership. **(B), highest-value.**
   - **Lever B — the approval `approve→execute` / idempotency obligation as an inject+verify contract.** The
     crux question: is "must be approved before execution" a *form* contract the obligation-gate can enforce
     (→ (B), reachable) or a genuine *semantic* (C) wall? Resolving this either lifts the approval cluster or
     produces the program's first **evidence-based (C)** finding (Rule 2 (a)–(e) all met).
3. Log the lever re-pointing in `AMENDMENTS.md` (Rule 3: every change to the time-boxed menu is logged).

## Caveats
- **Single snapshot.** The free gateway is non-stationary (route zoo varied 14–20 distinct routes/cell:
  mistral-codestral, nemotron, minimax, gpt-oss, kilo, poolside, cohere). worst-of-K=8 absorbs within-run
  variance, but a borderline cell can flip on a re-run; the co-measured `head-to-head.mjs --settled` is the
  authoritative freeze instrument.
- **Conservative pass.** floor-WITHOUT-extraction. Reading: extraction would not change the verdict here
  (Rule-1 data), so the conservatism is not masking a win.
- **Frozen invariants untouched** — weights / per-cell veto / δ-α / TEST-hash all unchanged; `--floor` is the
  opt-in flag, not a frozen-invariant change.
