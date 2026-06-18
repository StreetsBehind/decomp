# P3 sequestered TEST set — assembled, validated, content-hashed (prerequisite #2)

> **Status (2026-06-17): ASSEMBLED + VALIDATED + HASHED.** 86 epics across the 4 distinct seam topologies
> (the `n_eff` floor); every epic's reference scores full marks under its independent grader (0 false
> positives); the new catalog domains' mutant batteries kill at K6 = 1.00. Content hash committed as a
> pre-registration amendment (`AMENDMENTS.md`, void-on-change). Re-derive:
> `node studies/meta-search/gen-test-set.mjs`.
>
> **CONTENT HASH:** `74f10cbc4d7f40d40474e10efbcb86aeab5ba9e3bb4c85f605b10fbbf1ab149a`

## What it is

The sequestered hold-out P3 scores the frozen winner against **exactly once** (FREEZE §4 / DESIGN §5). It is
materialized on demand from a **pinned generator + manifest** (`gen-test-set.mjs` → `runs/test-set-manifest.json`)
rather than hundreds of committed files; the content hash pins the generator, the grader sources, and the
per-epic grader structure, so regeneration is deterministic and any change voids the run.

## Composition — 86 epics, 4 seam topologies (the n_eff floor)

| topology | epics | grader | cross-surface invariant |
|---|---|---|---|
| membership (frozen) | 5 (D=1..5) | **independent 2nd oracle** (`src/oracle2.mjs`) | `post ⟹ is-member` |
| approval | 27 | `epics-src/approval.mjs` | `execute ⟹ approved-by-distinct-admin` |
| lifecycle | 27 | `epics-src/lifecycle.mjs` | legal state-transition ordering + gated read |
| quota | 27 | `epics-src/quota.mjs` | counter conservation + no-overspend + idempotent |

Each new topology contributes lexically-distinct **windows** over an 8-domain catalog × sizes 1–4 (different
noun subsets), so the draws within a topology are clustered — the analysis is design-effect-adjusted by
topology (R2C-1), and `n_eff` is anchored by the **4 distinct seam invariants**, not the raw count. The
membership stratum is graded by the independent 2nd oracle (not oracle #1), so every TEST epic is scored by a
second-provenance-class grader (§10).

## Validation (gating the hash)

- **No false positive.** All **86/86** references earn full marks (happy + crosscut + integration) under
  their independent graders — confirms the expanded catalogs are typo-free and every epic is gradable.
- **Mutants bite.** Full single-obligation mutant batteries on windows exercising the **newly-added** catalog
  domains (approval `deployment,grant`; lifecycle `listing,campaign`; quota `allowance,plan`) kill at
  **K6 = 1.00** on both lethal buckets — the graders detect defects, they don't merely pass the reference.
- Prior multi-size validation (D=1,2,3 prefixes) already ran full batteries per topology at K6 = 1.00.

## The content hash covers

`sha256` over: the per-epic grader structure (topology + domain-window keys + EXPECTS + crosscut/integration
cell names) for all 86 epics, plus the `sha256` of each grader source (`approval/lifecycle/quota.mjs`,
`oracle2.mjs`, `gen-test-set.mjs`) and the frozen `build-gap` apparatus tree pin (`1580944…`). Editing any
grader, the generator, or the epic enumeration changes the hash → void-on-change, exactly as the
pre-registration rule requires.

## Status & what remains

- ✅ **Prerequisite #1 (2nd oracle)** and **#1b (diverse templates, n_eff floor)** — done.
- ✅ **Prerequisite #2 (TEST set + hash)** — assembled, validated, hashed, recorded in `AMENDMENTS.md`.
  *Reversible until committed to git* (apparatus is uncommitted); binding from the commit.
- ⏭️ **Prerequisite #3 (routed all-frontier baseline)** — independent track; next.
- 🔒 **The winner-freeze** — the one human gate: freeze the PROPOSED winner genome, then score it once on this
  TEST set via the independent graders.
