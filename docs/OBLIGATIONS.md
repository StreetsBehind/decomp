# The Obligations Layer — the typed lethal quadrant

_Promoted to the trunk 2026-06-11 during the unified-direction reshape. This is the live statement of
the obligations layer, extracted from the now-archived `SURFACE-DISCOVERY-SPEC.md` + `CURATION-METHOD.md`
(see [`../archive/edge-join/`](../archive/edge-join/) for the full original design). It is the typed
definition of the **lethal quadrant** from [`BUILD-TOLERANT-REFRAME.md`](BUILD-TOLERANT-REFRAME.md), and
it is what the reconciliation ([`RECONCILIATION.md`](RECONCILIATION.md) changes B/C/D) says must be
restored to make the deferral economics measurable._

---

## Why this is the main line now

The build-tolerant reframe split every latent dependency into a 2×2 by *who recovers the omission and at
what cost*. Three of the four quadrants the build process handles for free — a compiler, a linker, a
failing test fire exactly when a self-revealing, cheap-recovery edge binds. The one quadrant the build
**cannot** save you from is the **silent + expensive** corner: omissions that pass every test, ship
clean, and detonate later (a missing tenancy check, an un-audited security action, a broken idempotency
guarantee).

**That quadrant is small, typed, and tractable — and it is exactly the obligations layer.** So the
research target is not "discover every edge" (the dormant edge-join chased that — see the archive). It is
"discover the obligations whose omission is silent and expensive, upfront, and let the build find the
rest." Obligations are therefore promoted from one layer of a three-layer edge-discovery design to **the
thing the apparatus is built to find and measure**.

## What an obligation is (and is not)

An obligation is a **typed hole** — a *query* posed against the live plan, never a stored fact.

> **Core invariant (archived SURFACE-DISCOVERY-SPEC §6.1 / CURATION-METHOD C1):** *"The library never
> stores an edge. Edges are always computed against the live plan. Enforce in the entry schema (no edge
> field)."*

Resolving an obligation against a plan returns **one of exactly two things** (archived §3.2):

- **an edge-to-compute** — the queried resource is present, so a `produces`/`consumes` annotation is
  written and the deterministic join computes the edge; **or**
- **an open-question** — the queried resource is absent, so a typed hole is surfaced, tagged `gap` or
  `intentional-exclusion`.

It **never** returns "an edge exists." This is the line that separates a legitimate floor-raiser from the
confident-incompleteness failure mode (a library that hardcodes `auth → crud` ships a wrong answer the
moment the plan's shape differs). The distinction from neighbours:

| | What it is |
|---|---|
| **produces/consumes interface** | a *static declaration* on a bead — the typed vocabulary obligations query against |
| **edge** | a *computed fact* — the deterministic join's output, never authored, never stored |
| **obligation** | a *dynamic query* that fires at decomposition time and emits an edge-to-compute **or** an open-question |

This is enforced mechanically: [`../eval/c1-lint.mjs`](../eval/c1-lint.mjs) rejects any entry carrying a
`from`/`to`/`edge`/`dependsOn` field at intake (selftested). The empirical justification is on record —
*all six* hand-authored archetypes smuggled an edge and were caught by this gate
([`ARCHETYPE-PREMISE-EXPERIMENT.md`](ARCHETYPE-PREMISE-EXPERIMENT.md) §3).

## The taxonomy is parametric, not a fixed enum

An obligation is a *parametric query* over (1) a resource kind and (2) a question shape. The named
question shapes (archived §3.2, worked on `oidc-sso-login`):

| Query template | What it asks |
|---|---|
| `produces X` → find consumers in plan | who consumes a resource this archetype produces? (seam-finding) |
| `mutates Store:X` → find every other reader/writer of X | what else touches a store this archetype mutates? (conflict / consistency) |
| `requires R` → does the plan declare R? | is a prerequisite resource present? (prerequisite-finding) |
| `external dep CAN-FAIL` → does the plan's error convention cover it? | is this failure mode handled? (error-coverage) |

The *lethal-quadrant* obligation classes the build won't catch — the ones the reframe says to spend all
upfront effort on — are the silent, expensive ones: **security · privacy · consistency · tenancy ·
idempotency · compliance · audit · ownership**. These are the categories `τ` (RESEARCH-PROGRAM §2.4, per
the reconciliation) should target instead of an equal-weighted generic risk blend, and the categories the
**partitioned coverage endpoint** (RECONCILIATION change B) must score *separately* as a veto over any
deferral win.

## Data shape (intake)

A stored obligation entry (archived CURATION-METHOD §1.1):

```
Candidate {
  id          = hash(archetypeKey + kind + canonical(payload))
  archetypeKey                         // e.g. oidc-sso-login
  kind        = "obligation"           // never "edge"
  payload                              // a typed QUERY, never an answer:
                                       //   { queryType, resourceRef, condition, ... }
  provenance: [ { source, sourceRef, rawEvidence, proposedAt } ]
}
```

## Lifecycle — proposed → grounded → recurrent → audited → canon

(archived CURATION-METHOD §2–§3.4)

- **proposed** — candidate obligation from a raw source.
- **grounded** (§3.1) — the query is well-posed and resolves (to a binding *or* an open-question) against
  ≥1 real plan.
- **recurrent** (§3.2) — grounds across **≥2 distinct provenance classes** — *source-diversity weighted,
  not a raw fixture count* (classes: hand-authored fixture, real codebase, standard/spec e.g. OWASP ASVS,
  incident/CVE, expert-author, emergence).
- **audited** (§3.3) — a **precondition audit, never an answer audit**: promote the *question* iff it is
  well-posed using only archetype-**intrinsic** resources; reject if posing it requires a sibling present
  only in a saturated host. Every passing obligation is routed to a bounded judge asking the one thing the
  deterministic lint can't: *"does this query hardcode an edge disguised as a question?"* — reject if yes.
- **provisional | canon** — in bootstrap, capped at `recurrent` (untrusted, floor-only probe); in
  steady-state, reachable as `canon` if the anchoring ratchet (§3.4) clears.

The audit always promotes the **hole**, never the **edge**.

## The open-question channel — how obligations surface

At decomposition time (archived §3.3):

1. classify plan features → archetypes
2. instantiate intrinsic surfaces, parameterised to the plan
3. **resolve each obligation against the plan** → present ⇒ write the produces/consumes annotation (join
   computes the edge); absent ⇒ **emit an open-question** (`gap` | `intentional-exclusion`)
4. state-probe sweep → candidate surfaces
5. hand the seed (candidate surfaces + open-questions) to the diverse-ensemble fill; the library can only
   *add* probes — convergence ends the search

Crucially, the library's correct effect on a thin plan is to **raise the open-question count** — "surface
more, don't confidently emit wrong" (archived §6.2, the floor-not-ceiling invariant). This is exactly the
behaviour the live [`open-question-channel`](../eval/selftest/open-question-channel.selftest.mjs) and the
3-arm anchoring experiment measure: does obligation-priming lift *seam* recall (the lethal quadrant)
**without** lowering it elsewhere (anchoring)?

## What's live vs archived

- **Live on the trunk:** this doc; the `c1-lint` intake gate; the partition scorer
  (`generative-coverage.mjs`, seam-vs-intra recall = the lethal-quadrant endpoint); the 3-arm
  obligation-priming experiment ([`ARCHETYPE-PREMISE-EXPERIMENT.md`](ARCHETYPE-PREMISE-EXPERIMENT.md));
  the proven edge + join **rulers** (`build-completeness.mjs`, `join.mjs`, `lattice.mjs`).
- **Archived** ([`../archive/edge-join/`](../archive/edge-join/)): the model-facing edge-join *mechanism*
  (interface extraction, the join-ceiling tool, the Step-2 contest) and the full original
  `SURFACE-DISCOVERY-SPEC.md` / `CURATION-METHOD.md`. Dormant, not dead — see the archive tombstone for
  the revival path.
