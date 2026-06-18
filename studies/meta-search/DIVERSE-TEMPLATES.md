# Diverse epic templates — seam-topology degrees of freedom (P3 prerequisite)

> **Status (2026-06-17): n_eff FLOOR REACHED — 4 distinct seam topologies, each K6-validated.** The frozen
> battery emitted only size-variants of ONE seam (membership), i.e. "zero seam-topology degrees of freedom"
> (round-2 R2-7) → a ≥80-epic TEST set of clones has collapsed `n_eff`. This authors three more, structurally
> distinct, seam topologies — **approval**, **lifecycle**, **quota** — so the TEST set can span an `n_eff`
> distinct-seam-topology floor (FREEZE §4 / DESIGN §5). All additive under `studies/meta-search/`; the
> content-pinned `build-gap/` tree (`1580944…`) is untouched. Re-run:
> `node studies/meta-search/gates/g-diverse-templates.mjs`.

## The four seam topologies (each a different cross-surface invariant)

| # | topology | cross-surface invariant | hidden seam store | distinctive obligation classes |
|---|---|---|---|---|
| 1 | **membership** (frozen) | `post ⟹ caller ∈ members(container)` | `membersDb` | tenancy, authz, mass-assignment |
| 2 | **approval** | `execute ⟹ approved by a DISTINCT admin` | `approvalsDb` | **separation-of-duties, idempotency, audit** |
| 3 | **lifecycle** | legal-transition **ordering** + state-gated read | `transitionsDb` (append-only log) | **temporal ordering, state-gated visibility** |
| 4 | **quota** | counter **conservation** (no overspend) + idempotent keys | `ledgerDb` | **arithmetic conservation, exactly-once** |

Each invariant is a genuinely different *kind* of agreement two independently-built surfaces must reach — set
membership, a two-party authorization protocol, a state-machine ordering, and numeric conservation — so the
four are not relabelled clones. The validity gate asserts their surface sets are **pairwise-disjoint** and
disjoint from the membership seam.

## Files (all under `studies/meta-search/`, additive)

| File | Role |
|---|---|
| `epics-src/approval.mjs`, `epics-src/lifecycle.mjs`, `epics-src/quota.mjs` | the templates: catalog, reference surfaces, genuine mutant battery, independent property-based grader |
| `gen-diverse-epics.mjs` | registry-driven writer — emits `epics/<name>-d<D>/` in the build-gap epic shape so the live harness can build + grade them |
| `epics/approval-d1/`, `epics/lifecycle-d1/`, `epics/quota-d1/` | the emitted, buildable, gradable epics |
| `gates/lib/{approval,lifecycle,quota}-tests-d1.mjs` | drop-in graders for `evaluateEpic` |
| `gates/g-diverse-templates.mjs` | one validity + diversity gate over all topologies |
| `gates/g-template-approval.mjs` | focused gate for the approval template (superseded by the generic gate; kept) |

## Grader independence & determinism (uniform across templates, same discipline as oracle #2)

Every grader is **property-based + metamorphic + differential** and **representation-agnostic about its seam
store**: it NEVER reads `membersDb` / `approvalsDb` / `transitionsDb` / `ledgerDb` directly — it establishes
state through the writer surface and observes it through the gate surface (post / execute / getPublic /
withdraw). The quota grader observes balance **purely behaviorally** (what a subsequent withdraw accepts),
never reading a ledger or balance field. All randomness is the frozen mulberry32 RNG, seeded per-cell →
bit-deterministic, order-independent.

## Validation (`gates/g-diverse-templates.mjs`, all PASS)

- **Diversity.** All 4 seam topologies are pairwise-distinct (disjoint surface sets).
- **No false positive.** Each correct reference earns full marks: approval (h4/c7/i4), lifecycle (h4/c5/i4),
  quota (h4/c5/i4).
- **K6 met with margin.** Genuine single-obligation mutants killed at **1.000** on **both** lethal buckets for
  all three new templates (≥ the frozen floor **K6 = 0.90**).
- **Gradable on disk.** Each *emitted* `epics/<name>-d1/` grades end-to-end through the real `evaluateEpic`
  path (reference full marks; an integration mutant killed).

## What remains (toward the ≥80-epic TEST set — prerequisite #2)

1. **Per-size validation + scale.** `*-DomainsFor` scales each topology to D=2,3 (each catalog has 3 domains);
   each emitted size needs its K6 self-test before joining the set. 4 topologies × 3 sizes × ~7 lexical
   variants ≈ the ≥80-epic, n_eff-spanning pool.
2. **Assemble the TEST set + commit its content hash** to `AMENDMENTS.md` (void-on-change). This is P3
   prerequisite #2; the diverse topologies built here are its substrate.
3. **Independent grading at P3.** These graders (with oracle #2 on the membership stratum) are the
   second-provenance-class graders that score the frozen winner on the sequestered TEST.
