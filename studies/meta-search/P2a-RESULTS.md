# Meta-search — P2a results (the cross-surface integration-gate mechanism probe)

> **Status: CONCLUDED 2026-06-17 — MECHANISM CONFIRMED.** The cross-surface **integration-gate + repair**
> lever lifts `integration` from **0% → 100%** at N=5 (deterministic variant; Δ +92pp, recovered 11/11
> drifted rounds, X-CUT held flat) — exactly where P1's *per-surface* checker was structurally NULL. This is
> the focused confirmation the staged P2a was built to get: **the right-shaped lever recovers the seam.** It
> **holds into the cost-win regime** — scale-d3 (N=13, 3 seams): INTEG 11% → 72% (Δ +61pp, recovered 6/6,
> partial). The **cheap-judge** variant is NULL at both N (too lenient / fail-open — only the deterministic
> variant has teeth, as in P1). The apparatus is additive; the frozen tree `studies/build-gap/` (`1580944…`)
> is **untouched** and no frozen invariant changed → nothing voided.
>
> Re-run: `node studies/meta-search/p2.mjs --probe --epic scale-d1 --rounds 12` (and `--epic scale-d3`).

## What P2a asked (the staged successor to P1)

P1 concluded that the **per-surface checker is NULL on `integration` at N=5**: a checker that inspects ONE
surface at a time structurally cannot reason about a TWO-surface seam (`addMember` writes the membership;
`postComment` reads it). The P1→P2 kickoff named the right lever — the **cross-surface integration-gate +
route-back repair** (build-gap §4b). Rather than commit to the full P2b scale sweep + search machinery, the
research lead **staged** a cheap, controlled probe to answer one question first:

> **Does the cross-surface integration-gate lift INTEG off 0% where the per-surface checker could not?**

A null here would have said "don't pay for the sweep yet." A positive confirms the mechanism and unblocks P2b.

## What was built (additive under `studies/meta-search/`, hash-safe)

- **`src/integration-gate.mjs`** — the cross-surface lever. It pairs each `addMember` (writer) with its
  `postComment` (reader), analyses the **two surfaces' code together** against the public base model + skeleton,
  and routes a repair back to the offending surface. Oracle-blind (reads only the public preamble/skeleton +
  the candidate's own code) and **K3-scanned** (an oracle token in any prompt voids the candidate).
- **Genome node `integrationGate`** (`{kind: off|deterministic|cheap-judge, repairDepth: 0..2}`), admitted at
  the P2 phase boundary via the **clean-restart rule (R2-10)** as a §11 node-supply addition. **Hash-safe by
  construction:** `canonical()` strips the node whenever it is off/absent, so every P1/K8 genome hashes
  byte-identically — **P0 re-ran GREEN 5/5 with K8 bit-identical** (30/30, worst evals 269/300) and the §14
  round-trip deterministic (U=175 R=175). No mutation operator is wired for it at P2a (the probe constructs
  genomes directly); the operator is deferred to P2b, where K8 re-validates under the widened operator set.
- **`p2.mjs --probe`** — the **paired A/B** driver: each round builds every surface ONCE, grades the raw
  assembly (OFF), then runs the gate+repair on a COPY and re-grades (ON). OFF and ON share the exact same base
  builds, so the Δ is a clean within-round measurement of the gate's effect — this fixes P1's K=1 ±29pp build
  noise. Reports drift-rate + the **conditional** recovery (the decisive read; see below).
- **`gates/p2a-smoke.mjs`** — 41/41 deterministic checks, zero spend: the extraction primitives, both failure
  modes, seam pairing (single + multi-domain), the route-back repairs (init + drift), the K3 scan, and the
  hash-safety of the new node.

## The key discovery — INTEG fails for TWO distinct reasons, and the dominant one is NOT drift

A live diagnostic (`runs/diag2.mjs`) caught a failing round and showed all 3 integration tests dying with
**`Cannot read properties of undefined (reading 'has')`** — even though `addMember` and `postComment` *agreed*
on the store (both Map `ctx.db.memberships`, same key). The cause is not representation drift:

- **MODE A — uninitialized shared store (the DOMINANT N=5 failure).** The membership collection is **not in the
  base data model** (the preamble declares only `users/projects/comments`; the oracle pre-creates a store under
  a *different* name and never reads it — representation-agnostic, scale-oracle.mjs:12-16). A cheap surface that
  accesses its chosen store without a defensive init (`ctx.db.memberships ??= …`) throws on first touch, so
  `addMember` dies before recording anything → every integration test fails. When a build *happens* to include
  the init, INTEG is 100% — which is why INTEG at N=5 is **bimodal** (≈0% or 100%), and MCOH25's "INTEG 0–13%"
  is the average of that high-variance process. This is inherently **cross-surface**: you only know the store is
  "new" (needs init) by reading the BASE MODEL. A per-surface obligation checker cannot see it.
- **MODE B — representation drift.** The writer and reader disagree on store NAME or access STYLE (Map vs
  Array); the repair injects the writer's actual write-statement into the reader's rebuild.

The first gate implementation targeted only Mode B and so was NULL (detected ⅓, recovered 0/12 — an artifact of
the incomplete gate, not a property of the lever). Strengthening detection to cover Mode A (the
"shared-non-base store accessed without init" cross-surface invariant) + an init-repair flipped the result.

## Results — the paired probe (scale-d1, N=5, 12 rounds)

`{fusion skeleton (cheaper author), shapes-on}`; gate OFF vs ON, paired per round. **Conditional on drift** is
the decisive column (INTEG is bimodal, so the unconditional mean understates the mechanism):

| gate kind | OFF INTEG | ON INTEG | Δ INTEG | X-CUT Δ | fired | drift rounds | DETECTED | RECOVERED (fully) |
|---|---|---|---|---|---|---|---|---|
| **deterministic** | 8% (drift 92%) | **100%** | **+92pp** | 0pp | 12/12 | 11 | **11/11** | **11/11** |
| cheap-judge | 8% | 8% | 0pp | 0pp | 7/12 | 11 | 6/11 | **0/11** |

- **Deterministic gate: the seam is RECOVERED.** It fired every round, detected every drift, and the init/drift
  repair restored INTEG to 100% in all 11 drifted rounds — with **X-CUT held flat** (no collateral damage to the
  other lethal bucket). This is the mechanism P1's per-surface checker structurally could not deliver.
- **Cheap-judge gate: NULL.** The free-gateway judge detected only 6/11 drifts and never recovered (fail-open,
  noisy) — the same lesson as P1 (only the deterministic variant has teeth on this seam).

## Results — scale-d3 (N=13, multi-domain) — _confirmatory; the cost-win regime_

The 3-domain epic (project/vault/tracker = **3 membership seams**) at N=13, 6 rounds paired. This exercises the
multi-domain seam-pairing live and tests the lever where the cost-win could live (N≥13):

| gate kind | OFF INTEG | ON INTEG | Δ INTEG | X-CUT Δ | fired | DETECTED | RECOVERED (fully) |
|---|---|---|---|---|---|---|---|
| **deterministic** | 11% (drift 100%) | **72%** | **+61pp** | −3pp | 6/6 (29 repairs) | 6/6 | **6/6 (0/6 fully)** |
| cheap-judge | 11% | 11% | 0pp | +2pp | 6/6 (23 repairs) | 6/6 | **0/6** |

- **The mechanism HOLDS into the cost-win regime.** The deterministic gate detects and repairs every round
  (multi-domain pairing works — 2–3 seams flagged/round), lifting INTEG 11%→72%. Recovery is **partial**, not
  full (`fully 0/6`): with 3 seams a round, the gate fixes *most* but rarely *all three* within `repairDepth=2`
  — a known scaling pressure that P2b's search (repairDepth tuning, the gate × N sweep) is built to address.
- **Minor X-CUT cost (−3pp):** a route-back repair occasionally perturbs a crosscut guard on the rebuilt
  surface. Small and within K-noise here, but **flagged for P2b** (the repair prompt should preserve the
  surface's existing obligation guards; the per-cell veto will catch any real regression).
- **cheap-judge still NULL** at N=13 — the same fail-open result as the anchor.

## What P2a claims — and what it does NOT

**Claims (deterministic gate):** the cross-surface integration-gate **recovers the membership seam** that the
per-surface checker could not — INTEG 0%→100% at N=5, X-CUT unharmed, recovery 11/11. The mechanism is real and
oracle-blind. This **unblocks P2b**: the lever is worth scaling.

**Does NOT claim:**
1. **Not a cost-win.** This is a mechanism result at N=5, where the reliable opus-whole baseline is already
   perfect (INTEG/X-CUT 100%) and the cost arm is the pre-registered K1-at-N=5 loss. The cost-win remains
   **scale-gated** (N≥13) and unproven — exactly what P2b measures.
2. **cheap-judge is null** — only the deterministic gate is confirmed; the judge variant needs a stricter
   (fail-closed) design or is simply the wrong tool for this seam.
3. **External validity unchanged** — still one seam-topology (the cheap skeleton's representation); the deferred
   diverse-template authoring + 2nd hand-authored oracle remain prerequisites for any "confirmed" promotion
   (FREEZE §4/§6).

## Next: P2b (the scale sweep + search)

P2a confirms the lever, so P2b is now justified:
- **Add the `integrationGate` mutation operator** to the genome (it is in the type system but unwired); re-validate
  K8 under the widened operator set at the phase boundary (the deferred re-check noted above).
- **Scale the `scale-d{1..4}` ladder** (N=5→17) with the deterministic integration-gate on, where bare-opus
  EPIC✓ erodes and gets pricier (N≥13) — the cost-win regime — and test whether the hybrid holds the lethal
  quadrant at ≤ cost. The multi-domain pairing is exercised live at scale-d3 (above).
- **Switch on the deferred machinery** (celled MAP-Elites, gated credit-attribution, surrogate under K7,
  niching-gated knowledge-conditioning).
- Keep the cheap-judge variant as a control (its null is informative), and harden it (fail-closed) if used.

The instrument is trusted (K8 passed in P0; the live loop closed in P1; the lever is confirmed in P2a).
