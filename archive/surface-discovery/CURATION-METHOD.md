# Library Curation — Method Spec

_Last updated: 2026-06-02. This develops **§4 of [`SURFACE-DISCOVERY-SPEC.md`](SURFACE-DISCOVERY-SPEC.md)**
("Curation — many sources of intake, one gate of trust") into an operational method. Read it after that
spec's §3 (the obligations library) and §4. It assumes the spec's vocabulary — archetype, intrinsic
surface, obligation, state-probe, the join, seam, the floor-not-ceiling invariant — and does not redefine
them except in the glossary._

> **The thesis in one line:** the canonical library is the engine's *learned prior*, and curation is how
> that prior earns trust without ever becoming a ceiling — **many untrusted sources propose** candidates in
> one normalized envelope, **one source-agnostic gate disposes**, and every uncertain branch of the gate
> resolves to the **safe error** (under-promote), so a wrong assumption can never enter canon by accident.

---

## 0. Scope — what "curating the library" is

The library has two paths that share one entry schema:

```
  WRITE-PATH (this document)            READ-PATH (SURFACE-DISCOVERY-SPEC §3.3)
  candidates → gate → versioned canon   classify → instantiate → resolve obligations → seed the search
```

This spec is the **write-path**: the intake contract, the candidate lifecycle, the gate mechanics made
falsifiable, and versioning — with the spec's safety properties (no edges in the library, floor-not-ceiling,
anchoring-rejected) enforced **mechanically at the boundaries**, not by reviewer discipline. The read-path is
out of scope here except where the gate reuses it (it does — see §5.1, §5.3, §9).

The unit the method produces is a **hash-pinned, versioned archetype entry**: a set of promoted components
(intrinsic surfaces + obligations + state-probes) plus full provenance. The unit the method *trusts* is the
individual **component**, not the entry (§1.2).

---

## 1. The design decisions that make §4 operational

§4 gives the philosophy (diverse sources, one gate, three checks) and the right safety instinct. Six
decisions turn it from a flat list into an executable method. Two of the six are resolved by external
inputs (the human chose recurrence; a panel decided the audit); the rest follow from the spec's own
invariants.

### 1.1 One candidate envelope — what makes "source-agnostic gate" real

Every source — AST-miner, OWASP/ASVS parser, CVE corpus, model-author, emergence — emits the **same** shape,
or the gate is not actually one gate. Content-addressing is load-bearing: the same surface proposed by three
sources collapses to **one candidate carrying three provenance records**, which is exactly the substrate
source-diverse recurrence consumes (§5.2).

```jsonc
Candidate {
  id          = hash(archetypeKey + kind + canonical(payload))   // content-addressed; dedup key
  archetypeKey,                                                   // oidc-sso-login, crud-resource, …
  kind        ∈ { "intrinsic-surface", "obligation", "state-probe" },   // NEVER "edge"
  payload,    // typed over the resource lattice; for an obligation a typed QUERY, never an answer
  provenance: [ { source, sourceRef, rawEvidence, proposedAt } ]  // one record per proposing source
}
```

**Enforced at intake (invariant C1):** the `obligation` payload schema has **no edge field**. The spec's
invariant 6.1 ("the library never stores an edge") is checked at the *intake boundary* — a thing that names
a `from→to` pair is rejected before it is even a candidate, not caught later in review.

### 1.2 The component is the promotion unit, not the entry

Surfaces, obligations, and probes accrete evidence at different rates — one obligation recurs across five
groundings while a probe is seen once. Promote whole entries and you either hold back proven components or
admit unproven ones. **Components are promoted individually; entry version `N+1` = entry `N` + the components
that cleared the gate this round.** (Author's recommendation; not yet human-signed-off — §11.)

### 1.3 Recurrence is source-*diverse*, not a count — **DECIDED**

See §5.2. Resolved 2026-06-02: promote on grounding across **≥2 distinct provenance classes**, not ≥N
fixtures.

### 1.4 The intrinsic-vs-contextual audit is a falsifiable contrast test — **DECIDED**

See §5.3. Resolved 2026-06-02 by panel: deterministic contrast-pair instantiation + three companions.

### 1.5 The anchoring ratchet is version-relative and held-out-gated

See §5.4. "Library-covered" is defined relative to a library *version*; a candidate is graded on fixtures it
was **not** mined from. This is what makes the ratchet honest, and it is why the gate is corpus-gated (§7).

### 1.6 Full provenance is retained through promotion

§3.2's thin `{promotedFrom, audited, version}` throws away what demotion needs. Canon components keep the
**complete** intake + gate history (every proposing source, every grounding fixture, the audit verdict + host
version, the ratchet evidence + version) so a later failure can be traced and the component demoted (§8).

---

## 2. The candidate lifecycle (the spine)

```
proposed ──grounds against ≥1 real plan (§5.1)──────────▶ grounded
   │  never resolves → DROP (hallucination)
   │
grounded ──source-diverse recurrence, ≥2 prov. classes (§5.2)──▶ recurrent
   │  single occurrence → stays an instance, not canon          [BOOTSTRAP caps here = "provisional"]
   │
recurrent ──contrast-pair audit (§5.3)──▶ audited
   │  CONTEXTUAL → demote to obligation · SPLIT → surface promoted, seams → join · undecidable → reject
   │
audited ──held-out anchoring ratchet, V→V+c (§5.4)──▶ CANON  @ entry vN+1, hash-pinned
   │  lowers seam recall → REJECT / QUARANTINE
   │
CANON ──fails ratchet on a newly-added fixture──▶ DEMOTE   (library versions are A/B'd — invariant 6.7)
```

Every transition is a gate check with a localized, falsifiable output. The terminal state in the **bootstrap
regime** is `provisional` (capped at `recurrent`); only in **steady-state** can a component reach `canon`
(§7).

---

## 3. The gate — each check made falsifiable

The gate is **source-agnostic**: emergence's own outputs pass the same four checks as an OWASP-derived
candidate (invariant 6.5 — nothing is epistemically privileged; the *gate* is). Checks run in order; a
failure stops the candidate at its current state with evidence attached.

### 3.1 Grounded — "does it resolve against a real plan at all?"

Run the read-path: instantiate the candidate's archetype against ≥1 real fixture and attempt to resolve it
(a surface must instantiate; an obligation's query must be well-posed and resolve to a binding *or* an
open-question; a probe must name a reachable lifecycle cell). **Pass:** resolves against ≥1 plan. **Fail:**
never resolves → drop as hallucination. *Output:* the fixture(s) it grounded on + the resolved binding/question.

### 3.2 Recurrent — source-diversity weighted — **DECIDED 2026-06-02**

**Rule:** a component is `recurrent` iff it grounds across **≥2 distinct provenance classes** (e.g. a
hand-authored fixture *and* a real AST-mined codebase, or *and* an OWASP/ASVS item) — **not** on a raw count
of ≥N fixtures.

**Why:** the corpus has admitted selection bias (invariant 6.5). A surface recurring across two same-shape
hand-authored fixtures is the **fixture-author's prior echoing**, not independent evidence; the same count
across *different kinds* of source is genuinely independent. **Consequence for the work order:** the path to
a trusted library runs through **provenance diversity**, so the first real curation build is wiring ≥2
*different* source adapters (cheap pair: an OWASP/ASVS parser + one AST-mined real auth repo) — adding more
hand-authored fixtures of the same shape can never satisfy this check. *Output:* the set of provenance
classes it grounded across.

### 3.3 Audited — intrinsic-vs-contextual, by contrast-pair instantiation — **DECIDED 2026-06-02 (panel)**

This is the check that decides whether a candidate is **intrinsic** to the archetype (true wherever the
archetype appears → promotable as canon) or a **contextual artifact** of the particular plans it was mined
from (an `auth→teams` seam that exists only because those plans had teams → must *not* be canon; it belongs
to the per-plan join as a computed edge / open obligation).

**The asymmetry that controls the whole check.** Wrong in the **dangerous** direction (promote a contextual
artifact as intrinsic) bakes a plan-specific assumption into canon — the confident-but-wrong **ceiling** the
entire three-layer design exists to prevent. Wrong in the **safe** direction (a real intrinsic stays an
obligation) merely costs seeding power; the obligation still fires per-plan and the search still converges.
So **every uncertain branch resolves to reject-as-intrinsic.**

**Mechanism — contrast-pair instantiation (deterministic core).** Instantiate the de-instantiated candidate
against two synthetic hosts derived from the archetype spec, read the existing produces/consumes **join**,
and decide on the **delta**:

- **Minimal host** = the archetype's intrinsic block instantiated *alone*, no sibling features.
- **Saturated host** = minimal + a fixed **generic sibling pack** (one neutral bead of every *other* lattice
  resource kind, each carrying a neutral produces/consumes so the join *can* fire if the candidate genuinely
  reaches for a sibling).

| Join behavior across the pair | Verdict |
| --- | --- |
| survives minimal **and** no edge-set change in saturated | **INTRINSIC** → promote |
| evaporates in minimal **but** appears in saturated | **CONTEXTUAL** → reject; demote to an obligation |
| survives minimal **but** edge-set **grows** in saturated | **SPLIT** → promote the surface, demote the extra edges to the per-plan join |
| undecidable (binds only via a same-typed intrinsic = type-collision; or grounds via a generic sibling that could plausibly be archetype-specific) | one bounded judge call, **default REJECT-as-intrinsic** |

The **SPLIT** verdict is the differentiator: it operationalizes invariant 6.1 *at curation time* — a
candidate can be partly canon (its surface) while its seams are pushed to where edges belong (the computed
join). The audit is, in effect, a type-checker for "are you trying to put a plan-level fact in the library."

**Three companions — required to make it safe-by-construction, not safe-by-discipline:**

1. **Audited-seeded hosts (the load-bearing fix).** The minimal host is generated from the archetype's
   intrinsic block, but seeded **only** from intrinsics whose own provenance is `audited:true`. This breaks
   the self-referential loop in which a wrong promotion contaminates the host that audits the *next*
   candidate. Without it the mechanism poisons itself.
2. **Bounded adversarial judge, on the dangerous minority only.** Fired solely on (a) candidates that
   *survive* the minimal host (the dangerous direction), (b) type-collision survivors, and (c) the
   obligation-wording check (§ per-kind bars). It **defaults to reject-as-intrinsic** on abstention,
   variance, or parse-failure — so the judge's known variance tax can only ever push toward the *safe* error.
   One agent point, spent exactly where a pure join is provably blind (on-ethos per CHARTER §6).
3. **Anchoring ratchet kept strictly downstream** (§5.4) as the only *empirical* backstop against a fooled or
   contaminated audit.

**Statistical prevalence is demoted** to a *safe-direction-only* pre-filter: once a real same-archetype
population exists it may **reject** a candidate below a low floor; it may **never promote** (a common
contextual seam would otherwise clear a threshold and promote with full confidence — the exact failure the
design forbids).

**Per-kind bars** (the audit's correctness is the host's correctness; hosts are hash-pinned, peer-reviewed):

- **intrinsic-surface — strictest** (over-promotion here is the most dangerous): promote **iff** the typed
  node resolves in the minimal host **and** its join edge-set is **identical** between minimal and saturated.
  Edge growth → **SPLIT** (surface kept, seams demoted). Resolves *only* by binding a same-typed intrinsic
  (e.g. a contextual second `Store` joining the genuinely-intrinsic session `Store`, zero saturated delta —
  the modal failure under a coarse lattice) → forced **undecidable** → judge → default reject. No surface
  promotes on a type-collision alone.
- **obligation — audit the query's PRECONDITION, never its answer** (the kind a pure join is weakest on):
  promote the **question** iff it is well-posed using only archetype-intrinsic resources (e.g. "does a
  consumer of `Identity` exist?" — `Identity` is intrinsic to oidc, so the query is always well-posed and
  correctly resolves to an open-question when no consumer is present). Reject iff posing the query *at all*
  requires a sibling present only in the saturated host. **Hardening:** because a producer-side join cannot
  see whether the wording hardcodes a consumer (an edge wearing a query's clothes), every passing obligation
  is routed to the bounded judge with one narrow task — *"name the consumer this query secretly assumes"*; if
  it names a concrete hardcoded consumer, reject. The audit always promotes the **hole**, never the **edge**.
- **state-probe — most permissive** (an over-promoted probe only adds a coverage cell; it cannot terminate
  discovery, so its dangerous-direction harm is bounded): instantiate the archetype's lifecycle in the
  minimal host and promote iff the cell is **reachable from intrinsic surfaces alone** (computed with the
  existing `transitiveDeps` over the minimal-host join). Reject iff unreachable without a sibling
  actor/lifecycle (`invite-expired` needs a sibling invitation `Store` → belongs to the invites archetype).
  No judge call unless reachability is via a degenerate single-hop path → undecidable → default reject.

**Runner-up & fallback.** Runner-up is the **plain single-host counterfactual** (minimal host only; binary
survives/evaporates; no saturated pack, no SPLIT, no judge). Fall back to it if, at build time, **either**
(a) the saturated pack manufactures false promotions under a coarse lattice (type-collision makes the
saturated delta read intrinsic too often), **or** (b) the judge band can't be calibrated without ground-truth
labels at n=2. In the fallback, keep audited-only host seeding and the downstream ratchet, and under-promote
everything ambiguous.

**Critical gating condition (see §9).** This mechanism presupposes the typed produces/consumes **join
read-path, which does not exist in the repo yet.** It is therefore a *commitment*, buildable only after spec
§7 **Step 1** (the join-ceiling GO/NO-GO) clears. If Step 1's ceiling is low **and** the un-mediated true
edges look intrinsic, the read-path is the wrong substrate and **this decision is void** — revert to
under-promoting everything and reopen the representation question.

### 3.4 Anchoring ratchet — "does priming with this candidate stay a floor?"

The empirical backstop. Partition a **held-out** fixture's manifest (one the candidate was *not* mined from)
into **library-covered** vs **seam/contextual** surfaces, computed under the current library version `V` and
under `V + candidate`. **Safe iff** library-covered recall **rises** and **seam recall does not fall**
`V → V+c`. **Fail:** seam recall regresses → the candidate anchors → reject/quarantine. A canon component that
later fails this on a *newly added* fixture is **demoted** (invariant 6.7 — versions are A/B'd against each
other). This check is **version-relative** and **held-out-gated**, which is the second reason the gate is
corpus-gated (§7).

---

## 4. Emergence, de-circularized

§4.3 calls emergence both *a source* and *the arbiter*, which reads circular. The resolution:

- **Emergence-the-source** ("decompose fixtures, watch which surfaces/obligations recur") *proposes*
  candidates that clear the same gate as any other source.
- **Emergence-the-mechanism** is that the gate's **grounding** and **recurrence** checks *are* emergence runs
  (instantiate against real plans; watch convergence).

What is epistemically privileged is **the act of grounding against real plans**, not the *source* called
emergence. So invariant 6.5 holds (emergence's own proposals are not exempt from the gate) *and* §4.3 holds
(grounding is the only thing that confirms), with no contradiction.

---

## 5. Two regimes — bootstrap vs steady-state

With ~2 hand-authored fixtures and one archetype family, the **recurrence** (needs source-diverse groundings)
and **ratchet** (needs held-out fixtures the candidate wasn't mined from) checks structurally *cannot fire*.
Rather than block, split the terminal states:

| Regime | Condition (per archetype) | Terminal state | Behavior |
| --- | --- | --- | --- |
| **Bootstrap** | corpus below the per-archetype threshold (recurrence/ratchet unsatisfiable) | `provisional` (capped at `recurrent`) | candidate is emitted to the search as a **floor-only probe** (invariant 6.2 — can only *add* surfaces/questions, never terminate discovery), tagged untrusted, and **never counts toward convergence** |
| **Steady-state** | enough source-diverse groundings + held-out fixtures exist for the archetype | `canon` reachable | the full gate fires; `provisional → canon` promotions become possible |

The flip is **per-archetype**, not global. This is what lets curation **start now** — seed `provisional`
entries from OWASP + a real codebase and feed them to the search as untrusted probes — without anything
masquerading as canon. **Cold-start caveat:** companion #1 (audited-seeded hosts) needs an `audited:true`
predecessor, but the *first* entry has none, so its minimal host is hand-authored and itself unaudited; during
bootstrap the audit must therefore promote **almost nothing** and lean on the (later) ratchet + source-diverse
recurrence to hold the line.

---

## 6. Provenance & versioning

- **Entries, hosts, and library versions are hash-pinned and immutable** (invariant 6.7 / CHARTER §6). A
  change starts a new version; `v(N)` vs `v(N+1)` is itself an A/B run through the ratchet.
- **Per-archetype synthetic hosts** (minimal + saturated sibling pack) are **first-class reviewed artifacts**,
  hash-pinned per archetype-version, because the audit's correctness *is* the host's correctness.
- A canon component carries its **full** history (§1.6): proposing sources, grounding fixtures, audit verdict
  + host version, ratchet evidence + version. Demotion is a traceable operation, not a guess.

---

## 7. Dependency map — what is buildable now

Curation is not one block; it splits by what each layer depends on.

| Layer | Depends on | Buildable now? |
| --- | --- | --- |
| Candidate schema + intake (no-edge enforcement, C1), dedup / provenance-merge, lifecycle store | nothing | **Yes — standalone** |
| Source adapters → candidate envelope (OWASP/ASVS parser, AST-miner, …) | the schema | **Yes** |
| `grounded` / `recurrent` / the contrast-pair `audit` | the join read-path (spec §1 join + §3.3 instantiate) — **does not exist yet** | **No — needs Step 1 first** |
| `ratchet-cleared` | the seam-recall partition (staircase Step 3 machinery) | **No — needs Step 3** |

**So "developing the curation method" yields, now:** the complete *method design* (this document) **plus** a
buildable *intake + lifecycle + provenance + source-adapter* layer that is genuinely independent of the join.
The executable **gate** (grounding, recurrence, audit, ratchet) inherits the proof staircase's Step 1 and
Step 3 as hard prerequisites. The design is unblocked; the runtime gate is substrate-gated.

---

## 8. Invariants (curation-specific — collected)

1. **C1 — no edge at intake.** The candidate envelope's `obligation` payload has no edge field; an edge-shaped
   candidate is rejected before it exists. (Enforces spec 6.1 at the boundary.)
2. **C2 — component-level trust.** The promotion unit is the component; the entry is the versioned union of
   promoted components.
3. **C3 — every uncertain branch fails safe.** Evaporation under a thin host, judge abstention, type-collision,
   generic-sibling ambiguity → all default to reject-as-intrinsic (demote to obligation). The dangerous
   direction is unreachable by accident.
4. **C4 — audited-only host seeding.** A host that audits a candidate is built only from `audited:true`
   intrinsics; no unaudited component can influence another's audit.
5. **C5 — recurrence is source-diverse.** ≥2 distinct provenance classes, never a raw fixture count.
6. **C6 — the ratchet is held-out and version-relative.** A candidate is never graded on a fixture it was
   mined from; "covered" is relative to the library version under test.
7. **C7 — nothing bypasses the gate, including emergence.** The gate is privileged; no source is.
8. **C8 — provisional entries are floor-only and never count toward convergence.** (Enforces spec 6.2 across
   the bootstrap regime.)
9. **C9 — hosts, entries, and versions are hash-pinned and immutable.** A change is a new version and an A/B.

---

## 9. Open decisions for the human

1. **Promotion unit (§1.2).** Component-level is the author's recommendation and is assumed throughout; sign
   off or revise before the lifecycle store is built.
2. **Provenance-class taxonomy (§5.2).** The exact set of classes that count as "distinct" for recurrence
   (proposed: hand-authored-fixture · real-codebase · standard/spec · incident/CVE · expert-author · emergence)
   and whether ≥2 is the right bar or some classes are worth more than others.
3. **Bootstrap → steady-state threshold (§7).** What per-archetype evidence flips the regime — and whether the
   first, necessarily-unaudited, cold-start host is hand-authored once and grandfathered, or rebuilt after the
   first audited components exist.
4. **Saturated sibling-pack composition (§5.3).** Lattice-dependent and unknown until the lattice draft +
   Step 1 exist; this is the main input to the runner-up/fallback decision.
5. **Build order under the §7 gating.** Build the standalone intake/lifecycle/adapter layer now (independent of
   the join), or hold all curation work until Step 1 clears so the gate and its intake are built together?

---

## 10. Glossary (curation terms; see SURFACE-DISCOVERY-SPEC §10 for the rest)

- **Candidate** — a normalized, content-addressed proposal `{archetypeKey, kind, payload, provenance[]}`; the
  one shape every source emits.
- **Provenance class** — a *kind* of source (hand-authored fixture, real codebase, standard, incident corpus,
  expert author, emergence); the unit recurrence diversity is counted over.
- **Grounded / recurrent / audited / canon** — the candidate lifecycle states (§2).
- **Contrast-pair / minimal host / saturated host** — the two synthetic hosts the audit instantiates against;
  the verdict reads the join *delta* between them (§5.3).
- **SPLIT verdict** — promote the intrinsic surface, demote its contextual seams to the per-plan join.
- **Audited-seeded host** — a minimal host built only from `audited:true` intrinsics; the fix that breaks the
  audit's self-referential loop.
- **Provisional** — a bootstrap-regime component, capped at `recurrent`, emitted to the search as an untrusted
  floor-only probe that never counts toward convergence.
- **Demotion** — removing a canon component (or downgrading it to obligation) after it fails the ratchet on a
  newly added fixture.
```
