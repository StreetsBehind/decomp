# Surface & Edge Discovery — Design Spec & Next Steps

_Last updated: 2026-06-02. This is a **forward-looking design spec + execution plan**, written as a
handoff to a fresh session. Read it **after** [`CHARTER.md`](CHARTER.md) (what we're trying to
accomplish + what "best" means) and [`FINDINGS.md`](FINDINGS.md) (what the apparatus is and what the
first live sweep actually taught us). This document does not repeat those; it builds on them._

> **The thesis in one line:** stop asking a model to *generate* the dependency edges of a decomposition
> (a global O(n²) task it fails at — edge recall 0.27–0.57 in the first sweep). Instead make edges a
> **deterministic join** over a typed per-packet interface, seed the search with a **library of
> obligations** (never edges), and define ground truth as the **adversarially-verified union of diverse
> generators**, frozen — so iterating on edge/surface discovery becomes cheap, trustworthy, and
> falsifiable.

---

## 0. Where this came from (the one robust finding it answers)

FINDINGS §5 reports one empirical result that survives all the caveats (n=1 fixture, low K, two infra
bugs, an uncalibrated judge): **edges are the universal weak point.** Every method enumerates the *work
packets* reasonably but under-wires the *dependencies* between them (edge coverage 0.27–0.57; raw
single-session wired ~18% of edges in the calibration smoke). This is triangulated across the smoke and
the sweep and is mechanically what you'd predict. It is the first thing worth attacking, and this spec is
the attack.

Everything else in the first sweep that *looks* like a finding (method ranking, "cheap matches
expensive") is Tier-3 — compromised by the argv bug, the confounded audit A/B, and noise at low K. Do
not build on those. Build on the edge finding.

---

## 1. The core reframe — edges are *computed*, not *generated*

**Human view of decomposition** (what every current method does): list the packets, then reason about
which depends on which. Asking for the dependency *relation* directly is a global, all-pairs reasoning
task — exactly the task the models fail.

**Linker / build-system view** (the computer-native move): a build tool never asks "what depends on
what." Each unit declares a **typed interface** — `produces: [symbols]`, `requires/consumes: [symbols]`
— and the dependency graph is the **deterministic join** of consumes against produces. Make is a DAG
because target B's inputs are target A's outputs, not because someone drew arrows.

Apply it here. Represent a bead not as `{ work, depends_on: [...] }` but as a node over a **typed
resource lattice**:

```
bead.produces = [ Route:/auth/callback, Store:sessions, Token:refresh ]
bead.consumes = [ Token:refresh, Config:OIDC_CLIENT_ID ]
```

Then **an edge A→B exists iff B.consumes ∩ A.produces ≠ ∅** — a pure function. Edge coverage stops being
something the model is good or bad at; it is correct by construction *given correct interfaces*. And
"for THIS packet, what does it read and write?" is a **local** question with strong priors — the thing
models are actually good at. We convert one global task it fails into *n* local extractions it passes,
plus a deterministic join.

### 1.1 Where the hard part goes (be honest)

The reframe does not delete the difficulty; it **relocates and reshapes** it — which is the only real
kind of progress here. After the move, edge completeness becomes two sub-problems:

| Sub-problem | What it is | How it's attacked |
| --- | --- | --- |
| **Vocabulary alignment** | packet A's `sessions` must equal packet B's `session_store` or the join misses the edge | deterministic canonicalization: the model builds a resource **dictionary first**; packets reference dictionary ids, not free strings (symbol resolution) |
| **Resource discovery** | a latent resource nobody named → still missing | the **irreducible generative wall**; contained by the library (§3) + measured by convergence (§5) |

This is strictly better-shaped than raw edges: *"did we find all the edges (O(n²), opaque)"* becomes
*"did we find all the resources (O(n), typed, checklistable)."* Resources are fewer, **typed**, and
typed sets have **floors** — every web-auth feature has Routes, a session Store, Tokens, Middleware,
ErrorStates. You can hold a per-type completeness checklist over resources that you could never hold
over raw edges.

### 1.2 The resource lattice (the keystone modeling decision)

The lattice is the set of typed resource kinds the join operates over. A candidate starting set:

```
Route · Store/Table · Schema/Type · Token/Credential · Config/Env · Event
Migration · Job · Middleware · ExternalIntegration · ErrorState
```

Too coarse → the join over-wires (everything shares a type). Too fine → it under-wires (nothing
matches). Getting this right is the single highest-leverage design choice; it is also cheap to draft and
revise. **This is the first artifact to build (§7, Step 1).**

---

## 2. The three-layer separation (the spine)

Everything below rests on keeping three layers distinct, because the **dangerous** layer (edges) must
always be the **computed** one:

```
  LIBRARY            →   PLAN                →   JOIN
  (what TYPES to        (what's actually        (the EDGES — deterministic,
   hunt for: surfaces    here: the instances     computed fresh against this
   + obligations)        this plan declares)     plan's resources)
```

The library supplies *vocabulary and obligations*. The plan supplies *instances*. The join supplies
*edges*. The library **never asserts an edge** — it can't; the entry schema has no field to hold one.

---

## 3. The obligations library

> **One-line definition:** a typed catalog of **obligations**, keyed by feature-archetype, **mined** from
> converged decompositions (not authored from intuition) — not a catalog of answers, and **never** a
> catalog of edges.

### 3.1 Why a naive "canonical edges" library is dangerous (the constraint that shapes everything)

A checklist of "the edges feature X needs" converts the *correct* epistemic state ("I might be missing
wiring") into a *false* one ("here is the complete set ✓"). That is **worse** than today's quiet
incompleteness — it's loud, confident incompleteness, and the things it stops looking for are exactly
the **contextual seams** that matter. Two structural facts make this unavoidable for any per-feature
edge list:

1. **There is no such thing as a canonical edge.** An edge is relational — it exists only between two
   specific resources that both live in *this* plan. "SSO needs a user table" is an edge only because
   *this* plan has a user table. Store an edge in a library and you've made the category error.
2. **The hard edges live at the seams *between* features, not inside any one.** A per-feature SSO entry
   structurally *cannot* contain the SSO↔logout, SSO↔authorization, SSO↔audit seams — those belong to
   the interaction, not to SSO. So a per-feature edge list captures the *easy* (intra-feature) edges and
   is constitutionally blind to the *hard* (inter-feature) ones.

The fix: the library holds **surfaces and obligations**, and edges are **always computed** (§2). The
join over *this plan's* actual resources is precisely what catches the contextual seams a template never
could.

### 3.2 Entry shape

An entry is keyed by **archetype** (a recurring feature-shape: `email-password-auth`, `oidc-sso-login`,
`crud-resource`, `ingest-pipeline`, `payments-checkout`, `file-upload`, `realtime-feed`, …) and has
exactly three kinds of content plus provenance:

- **Intrinsic surfaces** — the resources the archetype *always* introduces by being itself, typed over
  the lattice and parameterized (not hardcoded). The only thing close to "canonical," and even these are
  types-to-instantiate, not facts.
- **Obligations** — typed **queries over the host plan**. This is the heart. An obligation is *a typed
  hole*, and resolving it returns **one of two things: an edge-to-compute, or an open-question.** It
  never returns "an edge exists."
- **State probes** — lifecycle/actor cells where surfaces hide (expired, revoked, concurrent,
  first-time, error). An uncovered cell becomes a candidate surface.
- **Provenance** — `{ promotedFrom: [fixtures…], audited: true, version: N }`.

Illustrative `oidc-sso-login` entry (prose form; the schema has **no edge field**):

```
intrinsic:   Route(login-init, callback) · ExternalIntegration(oidc-provider, CAN-FAIL)
             Token(access; refresh) · Config(client-id, secret, issuer, redirect-uri) · Store(session)
obligations: produces Identity        → find consumers in plan {authz, profile, audit}; unwired ⇒ OPEN-Q
             mutates  Store:session    → find every other reader/writer of session in plan ⇒ seam edges
             requires User record      → plan has a user store? yes ⇒ JIT-provision obligation; no ⇒ GAP
             external dep CAN-FAIL      → plan's error convention covers provider-down/exchange-fail?
stateProbes: first-login(JIT) · returning · access-expired(silent refresh) · refresh-failed(re-auth)
             revoked/logout-all-devices(invalidation fan-out) · concurrent
```

### 3.3 How it functions at decomposition time

1. **Classify** plan features → archetypes (recognition — the reliable direction). Unmatched features →
   a "novel" bucket that gets **no** library help (correct: novelty is where you shouldn't have a prior).
2. **Instantiate** each matched archetype's intrinsic surfaces as candidate resources, parameterized to
   this plan.
3. **Resolve obligations against the plan.** Each obligation runs as a query: does a producer/consumer
   for this resource exist here?
   - **Found** → write the `produces`/`consumes` annotation; the **join** turns it into an edge. (Library
     supplied the vocabulary to hunt; the *plan* supplied that it's present; the *join* supplied the edge.)
   - **Not found** → emit an **open question**, tagged `gap` or `intentional-exclusion`. The library's
     effect here is to *raise a question the model wasn't asking* — it **increases** the open-question
     count, which is the correct thin-input behavior ("surface more, don't confidently emit wrong").
4. **State-probe sweep** — uncovered lifecycle cells → candidate surfaces.
5. **Hand to the search.** The library's entire output is a *seed* (candidate surfaces + open questions)
   flowing into the diverse-ensemble fill. **It can only add probes; it has no power to terminate.**
   Convergence ends the search (§5), never library-satisfaction. Template-**blind** generators run
   alongside it.

The functional invariant: the library is a **generator of probes**, and a probe can only enlarge the
surface/question set — so it is a **floor, not a ceiling, by construction**, not by discipline.

### 3.4 Worked example (condensed — the onboarding device)

Decomposing a thin **team task-tracker** plan ("users sign up / log in; teams + invites; tasks
created/assigned/commented; activity feed"). Decomposition reaches "sign up and log in":

- **Classify** → `email-password-auth`. Entry exists.
- **Instantiate** → signup/login/logout Routes, Store:session, Credential:password-hash, Store:user,
  reset Token, verification Token. (No edges yet — just typed nodes.)
- **Resolve obligations:**
  - *"who consumes Identity?"* → plan has Teams (membership), Tasks (assignee/author), Feed (actor) →
    join **computes** auth→teams, auth→tasks, auth→feed. **These are the contextual seams a template
    could never hardcode** — they exist only because this plan has those features.
  - *"external email dep — covered?"* → plan never mentions email → **OPEN QUESTION**: "auth needs
    transactional email for verification + reset; plan declares no email surface — in scope or omission?"
  - *"authorization?"* → plan implies team-scoped access but names no model → **OPEN QUESTION**.
- **State probes** → wrong-password (rate-limit? plan silent → candidate), unverified-email login,
  expired session, reset-token expiry → candidate surfaces / questions.
- **Hand off.** A template-**blind** generator additionally flags CSRF-on-login and auth-event audit
  logging; the adversarial verifier confirms both; they join *this* decomposition **and** become
  promotion candidates for the entry. The search ends on **convergence**, not on the checklist.

**Proof it's contextual, not baked-in:** run the *same* entry against a solo notes app (no teams, no
assignees, no feed). Identical intrinsic surfaces, but *"who consumes Identity?"* resolves to ~nothing,
so the join computes **almost no seam edges**. Same entry, different plan, different edges — because
edges live in the plan, not the library. That is the "Lego danger" defused in action.

---

## 4. Curation — many sources of intake, one gate of trust

> **Developed in full in [`CURATION-METHOD.md`](CURATION-METHOD.md)** — the candidate envelope, the lifecycle
> state machine, and the gate made falsifiable, including the two resolved forks (recurrence = source-diversity
> weighted; the intrinsic-vs-contextual audit = deterministic contrast-pair instantiation + bounded judge +
> ratchet). This section is the rationale; that document is the method.

The question "is the only way to build the library by decomposing things and watching archetypes
emerge?" → **No.** Separate **provenance** (where a candidate came from) from **trust** (whether it
survived validation). Many sources *propose*; one **source-agnostic gate** *disposes*.

### 4.1 Sources (intake — diverse, fast, untrusted)

| Source | Strongest for | Note |
| --- | --- | --- |
| **Emergence** (decompose → watch what recurs) | trusted, self-grounded obligations | the only self-grounding source, but **slow** and **cold-starts from zero** |
| **Real codebases** (AST-mine apps that have feature X) | intrinsic surface floors | code is ground truth about what actually shipped & worked; weak on the *why*/seam-question |
| **Standards / specs** (OWASP ASVS, OAuth/OIDC RFCs, PCI-DSS) | obligations + commonly-missed failure modes | a security checklist *is* a list of obligations; encodes industry-wide failures no single repo shows |
| **Incident / CVE / post-mortem corpora** | the *commonly-omitted* surfaces (highest value) | negative evidence; weight the library toward what people actually miss |
| **Expert / model authoring** | fast cold-start hypotheses | allowed, but **untrusted** — enters as a candidate like any other |
| **Cross-archetype transfer** | propagating a discovery to siblings | a taxonomy lets one find seed related leaves without independent recurrence |

### 4.2 The gate (source-agnostic — this is where safety lives)

Every candidate, regardless of source — **including emergence's own outputs** — passes the same gate
before it becomes canon:

1. **Recurrence / grounding** — does it actually resolve against real plans? (promote only on recurrence
   across **N independent fixtures**; a single occurrence is an instance, not canon.)
2. **Adversarial intrinsic-vs-contextual audit** — "is this intrinsic to the archetype, or an artifact
   of these particular plans?" (guards over-generalization.)
3. **Anchoring ratchet** — blind-vs-primed on **held-out** fixtures; **reject** any version that raises
   library-covered recall but lowers **seam** recall (§6). A version that anchors cannot merge.

### 4.3 Emergence's real role, and cold-start

Emergence is not just *a* source — it is the **arbiter**. External sources propose; **building and
watching them converge on real fixtures is the only thing that can confirm** an obligation actually
fires and actually lifts recall without anchoring. So: **seed generation from the whole world's evidence
(fast recall, untrusted), let emergence judge what survives (slow trust), and never let either skip the
gate.** External seeds break the chicken-and-egg (the library is useless until it has content); the
convergence loop corrects the seeds over time. The library and the oracle (§5) **co-evolve** — a
blind-found, verifier-confirmed surface beyond the current manifest *grows ground truth* rather than
scoring as a miss.

---

## 5. Ground truth, "done," and the iteration loop

### 5.1 The oracle = the adversarially-verified union of diverse generators, frozen

Completeness over an unknown latent set is **unprovable from inside** — but **convergence is
observable**. Run an ensemble of deliberately diverse generators, pool everything they propose,
canonicalize to the lattice, dedup, and **adversarially verify** each surface/edge (a skeptic tries to
refute it). The verified union is the **golden manifest** for a fixture — hash-pinned, frozen, the eval
set. Grading any run against it is then **free, deterministic, zero grader-variance** (set recall /
precision).

### 5.2 "Found all the surfaces" = convergence, not a checklist

Keep looping fresh diverse generators and watch the **new-surface discovery rate**. When K rounds
surface nothing new, you've hit a **practical fixpoint** — the operational meaning of "we found all the
development surfaces." Not proven-complete; *converged*.

### 5.3 Honesty about the ruler

Two computer-native moves keep the (cheap, frozen) oracle trustworthy:

- **Mutation-test the ruler** (Step 0): surgically delete a known edge/surface from a perfect snapshot;
  the scorer **must** drop by exactly the right amount, localized. Plant a fake; precision must catch it.
  Proves the grader measures what it claims, independent of any method. (The unexercised `catch-rate`
  scorer's real job.)
- **Measure the ruler's incompleteness**: route every beyond-manifest proposal to the verifier; the
  **confirmed-real-beyond-manifest rate** is a *direct measurement of how incomplete our oracle is.* High
  → recall numbers are soft and we know by how much; decaying to ~0 across diverse generators → manifest
  converged, numbers trustworthy.

### 5.4 The three-speed iteration loop (why this enables fast experimentation)

| Speed | Tests | Cost |
| --- | --- | --- |
| **Instant / free** | scorer, edge-join rule, canonicalizer, representation hypotheses — by **re-grading cached generations** | $0 |
| **Cheap** | a new generator method on one fixture, graded vs frozen manifest | cents |
| **Investment** | extend the frozen oracle / add a fixture | rare |

> ⚠️ **Caveat for the new session:** the "re-grade cached generations for free" speed assumes a cache.
> `runs/` is **gitignored and empty on a fresh checkout** — the Series L1 generations do **not** travel
> with the repo. On a clean machine, budget a cheap one-fixture regeneration to create the Arm-1 baseline
> for Step 2 (still cents, not the full sweep).

---

## 6. Invariants (the non-negotiables — collected)

1. **The library never stores an edge.** Edges are always computed against the live plan. Enforce in the
   entry schema (no edge field).
2. **The library is a floor, never a ceiling.** It can only *add* probes/questions; it can never
   *terminate* discovery. The stop condition is **convergence**, never library-satisfaction.
3. **Template-blind generators are always in the ensemble** — so the search can find what a template
   would anchor it away from; the blind-vs-primed gap is a live signal.
4. **Anchoring is a measured quantity, not a hope.** Partition manifest surfaces into **library-covered**
   vs **seam/contextual**. A library version is safe **iff** priming raises library-covered recall **and
   does not lower seam recall**. The damage is `confidence-gain − recall-gain`, made concrete as **seam-
   recall regression**. Any version that anchors is rejected.
5. **Nothing bypasses the gate** (§4.2) — including emergence's own outputs (our fixture set has its own
   selection bias). Emergence is not epistemically privileged; the *gate* is.
6. **Promote on recurrence, not occurrence** — N independent fixtures, then de-instantiate to the typed
   shape, then adversarially audit, before anything becomes canon.
7. **Fixtures, manifests, and library versions are hash-pinned and immutable** (CHARTER §6). A change
   starts a new baseline series; v(N) vs v(N+1) is itself an A/B.

---

## 7. The proof staircase (the execution plan)

We don't prove the whole design at once — we **decompose the proof** into independent falsifiable claims,
ordered **cheapest-and-most-decisive first**, each gating the next. The methodological move: **test the
type system before the inference, and the ruler before the measurement.**

### Step 0 — Mutation-test the ruler · *free, pure code, PREREQUISITE*
**Claim:** the edge/surface scorer is accurate. **Method:** take a synthetic perfect decomposition;
delete one known edge → edge-recall must drop by exactly the right amount, localized; plant a fake edge →
precision must catch it. Wire this through the existing **`eval/catch-rate.mjs`** (currently
unexercised). **Kill criterion:** if the scorer mis-localizes or mis-scores, fix it before trusting any
number downstream. *Until this passes, every other number is vibes.*

### Step 1 — Join-ceiling test · *nearly free, pure code, GO/NO-GO on the whole thesis*
**Claim:** the typed produces/consumes representation can *express* the true edges. **Method:** draft the
resource lattice (§1.2); annotate **one fixture's golden manifest** (start: `sso-greenfield`,
`8aceba61b344`) with produces/consumes; run the deterministic join; measure the **resource-mediated
fraction of true edges** = the *architectural ceiling* of the approach. **Read the number, not pass/fail:**
95% → the join can catch almost everything, proceed; 60% → some edges (pure ordering/policy deps) aren't
resource-mediated and need a supplementary mechanism — and we learned it for free, before extraction.
**Kill criterion:** if the ceiling is low *and* the un-mediated edges look intrinsic (not a lattice gap
fixable by adding a resource type), the reframe is insufficient alone.

### Step 2 — Extraction A/B (the money shot) · *cheap, controlled*
**Claim:** local produces/consumes extraction + join recovers more edges than directly asking for them.
**Method:** hold the **node set constant** and vary only edge-derivation:
- **Arm 1 (today):** the method's directly-asked `depends_on` edges → recall vs manifest.
- **Arm 2 (new):** a cheap **local** produces/consumes annotation pass over the *same* packets → join →
  recall vs manifest.

On a fresh checkout, generate one fixture's packets once (cheap; see §5.4 caveat — no cache), then run
both arms over them. Because nodes are identical, any edge-recall delta is attributable *purely* to the
derivation mechanism. **Kill criterion:** Arm 2 fails to beat Arm 1 → the reframe doesn't pay off in
practice even though the ceiling (Step 1) was high → the bottleneck is *extraction quality*, investigate
that.

### Step 3 — Anti-anchoring A/B · *cheap, validates the library is safe*
**Claim:** priming with an obligations-library raises recall without anchoring. **Method:** blind vs
library-primed generator; grade against the manifest **partitioned** into library-covered vs seam
surfaces. **Safe iff** library-covered recall rises **and** seam recall does not fall. **Kill criterion:**
seam recall regresses → that library version anchors → reject it (this is the CI ratchet of §6.4).

### Step 4 — Convergence + beyond-manifest rate · *phase 2, ongoing*
**Claim:** the diverse ensemble converges (new-surface rate → 0) and the manifest's incompleteness is
measurable. **Method:** run the ensemble in rounds; plot new-surface discovery rate; route beyond-
manifest proposals to the verifier and track the confirmed-real rate. This both *proves* "found all
surfaces" is a real observable state and *quantifies* how much to trust §5.1's frozen manifest.

---

## 8. Next steps (prioritized — start here)

1. **Step 0 first (free).** Wire mutation testing through `eval/catch-rate.mjs`; prove the ruler. Without
   it nothing downstream is trustworthy.
2. **Then the first real move: draft the resource lattice (§1.2) + run Step 1** on `sso-greenfield`.
   Deliverable: **the resource-mediated fraction of true edges** — a single number that says whether this
   whole direction is alive. Free.
3. If Step 1 clears the bar, **Step 2** (regenerate one fixture's packets cheaply — `runs/` is empty,
   §5.4 — then the held-nodes-constant A/B). This is the result that earns the reframe on real data.
4. **Step 3** to prove a first library entry (`email-password-auth` or `oidc-sso-login`) accelerates
   without anchoring, against a partitioned manifest.
5. In parallel, **seed the first library entries from external sources** (§4.1 — OWASP ASVS + a couple of
   real auth codebases) so we're not cold-starting from zero; run everything through the gate (§4.2).
6. Only then invest in **Step 4 / the convergence loop** and growing the frozen-manifest oracle across
   more fixtures.

**Also still open from FINDINGS (orthogonal but relevant):** the argv→stdin transport bug (§6.1) and the
confounded audit A/B (§6.2). Step 2 regenerates packets live, so **fix the stdin transport first** or the
biggest prompts will fail the same way they did in L1.

---

## 9. Open decisions for the human (genuine forks, not assumptions)

1. **Ambition of the unit.** Are we building a *better decomposition method* (a ranked decomposer), or a
   *surface-discovery search engine* whose union output is the truth and whose convergence is the goal?
   This spec leans to the latter — it subsumes the former — but it's the bigger commitment.
2. **Ground-truth philosophy.** Accept "truth = adversarially-verified union of diverse generators,
   frozen and grown over time" as the working definition? It's what unlocks free iteration, but it is
   *converged*, not *proven* — we'd trade a noisy live judge for a frozen, mutation-tested, but still
   *estimated* reference.
3. **The resource lattice.** Sign off on (or revise) the §1.2 type set before it's committed — it's the
   highest-leverage modeling choice and it shapes Steps 1–2.
4. **Where the irreducible generation lives.** This spec claims resource *discovery* is the last
   irreducible wall and everything else can be made deterministic around it. If the wall is elsewhere,
   the attack changes.

---

## 10. Glossary

- **Resource lattice** — the set of typed resource kinds (Route, Store, Token, …) the join operates over.
- **produces / consumes** — a bead's typed interface; the inputs the join matches on.
- **Join** — the deterministic computation `edge A→B iff B.consumes ∩ A.produces ≠ ∅`.
- **Archetype** — a recurring feature-shape that keys a library entry (`email-password-auth`, …).
- **Obligation** — a typed query over the host plan; resolves to an *edge-to-compute* or an
  *open-question*; never asserts an edge.
- **Intrinsic surface** — a resource an archetype always introduces by being itself (parameterized).
- **State probe** — a lifecycle/actor cell (expired, revoked, concurrent, …) checked for coverage.
- **Seam** — an inter-feature dependency; the hard, commonly-missed edge a per-feature template can't hold.
- **Golden manifest** — a fixture's frozen, hash-pinned ground-truth surface/edge set (the eval set).
- **Convergence** — new-surface discovery rate → 0 across diverse generators; the practical "done" signal.
- **Anchoring** — premature closure induced by a prior; measured as **seam-recall regression** under
  priming; a library version that anchors is rejected.
- **The gate** — the source-agnostic validation (recurrence + audit + anchoring ratchet) every library
  candidate must pass.
