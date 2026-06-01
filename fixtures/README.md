# Fixtures — the corpus (the constant)

Each fixture is a **plan + its oracle bundle**. Fixtures are **hash-pinned and immutable**: never
edit one to make a run pass — that starts a new baseline series (note it in `ledger.md`). A method
never sees the oracle; oracles only *grade* the snapshot a method produces.

## A fixture directory

```
<name>/
  plan.lock.json        the structured plan a strategy consumes (sha256 of this is the fixture hash)
  plan.md               the prose plan
  outcome-manifest.json the oracle ground truth      -> schemas/outcome-manifest.schema.json
  planted-gaps.json     seeded defects for catch-rate -> schemas/planted-gaps.schema.json
                        (empty `gaps: []` + `control: true` on a clean fixture)
```

## What the corpus must span (CHARTER §5.2)

- **Size** — tiny / medium / large feature counts.
- **Domain** — CRUD app, CLI, data pipeline, service — so no method is tuned to one shape.
- **Input thinness** — hand-perfect lock ... deliberately thin vision. Thinness is where *generative*
  completeness is won or lost; the right failure mode on thin input is "surface open decisions," not
  "confidently emit a wrong plan."

For each defect class in `planted-gaps.schema.json`, author at least one variant fixture that plants
it, plus one **clean control** (`control: true`) to measure false positives.

## Authoring the outcome manifest (the load-bearing part)

The manifest is what makes "were all the edges caught?" and "is every needed bead present?"
*falsifiable*. Author it from the plan, by hand, capturing:

1. Every **outcome** the plan promises, and which plan-keys satisfy it.
2. Every **requirement / must-have / required concern**, each tagged with the `planKey` a covering
   bead must carry (resolve by planKey, never by title).
3. The **complete expected dependency-edge set** (`requiredEdges`), expressed between plan-keys — this
   is the ground truth the edge-coverage check runs against.

Keep it auditable: a reviewer should be able to read the plan and confirm the manifest is neither
missing a required item nor inventing one.

## Thin fixtures — the generative corpus (lock ⊊ manifest)

`quicklist` is a *thick* fixture: its `plan.lock.json` already enumerates every feature, surface,
cross-feature dependency, and concern. A method consuming it only has to **transcribe** a
decomposition a human already did — it never has to *decompose* anything. That measures expansion
fidelity, not the real problem.

The real problem is **generative**: turning a thin, abstract plan ("users can log in via SSO and log
out") into the full set of atomic work packets nobody enumerated up front (provider config, callback
route, session store, token refresh, logout, CSRF, error states, tests…). That leap needs a model's
world-knowledge and judgment; it is irreducibly non-deterministic. **Thin fixtures** exist to measure
*that*.

A thin fixture splits the world in two:

- **The lock is THIN** — `plan.lock.json` contains only `app`, `summary`, `stack`, the high-level
  **stated** `outcomes:[{id, statement}]`, and maybe a couple of thematic `notes`. It MUST NOT
  contain a `features` map or a `crossFeatureDependencies` list (nor per-feature surfaces/concerns).
  Those are exactly what a method must GENERATE. *(The check in `runs/_verify/check-fixtures.mjs`
  asserts the absence of those keys, so a thin fixture cannot quietly grow thick.)*
- **The manifest is RICH** — `outcome-manifest.json` carries the same outcome ids PLUS the full
  **latent** set: every `requirement` (each with a `planKey` + `description`), `surfaces`, required
  and explicitly-`excluded` `concerns`, `mustHaves`, and the COMPLETE `requiredEdges` between
  planKeys. This is the ground truth the oracle grades against and the method NEVER sees.

So `lock ⊊ manifest`. The gap between the thin stated outcomes and the rich latent requirements/edges
**is** the generative test. The manifests are authored by hand from domain knowledge and kept
auditable: a reviewer can read `plan.md` and confirm the manifest neither omits a needed item nor
invents one.

### Outcome-id tagging convention

Outcome ids are **stable** (`O-login`, `O-logout`, `O-load`, …) and identical between the lock and the
manifest, because the method tags the beads it generates with the STATED outcomes they serve:

```
bead.metadata.provenance.outcomeIds = ["O-login", ...]   // which stated outcomes this bead serves
```

That is the only ground-truth key a method is expected to know — it can see the stated outcomes, so it
can tag against them. The **latent** requirements, surfaces, concerns, and `requiredEdges` are NOT
handed to the method; they are graded by **judgment** (does a generated bead cover this latent
requirement? is this required edge realized as a transitive edge?), not by the method knowing their
planKeys in advance. Coverage is graded by OUTCOME — any decomposition that reaches the required
outcomes/edges passes; we do not diff against an exact "ideal" bead set, because valid decompositions
legitimately differ.

### Thin fixtures in this corpus

- [`sso-greenfield/`](sso-greenfield/) — auth/SSO in a greenfield app. Three stated outcomes
  (`O-login`, `O-session`, `O-logout`); the manifest unfolds them into provider-config, login/callback
  routes, token validation, session store/middleware, refresh, logout, account-linking, CSRF, secret
  management, and error states, with `local-password-login` explicitly **excluded**.
- [`ingest-pipeline/`](ingest-pipeline/) — a batch data pipeline (ingest → validate → dedupe →
  idempotent load → alert). A different shape: a heavier **ordering-edge** structure where each stage
  depends on the prior one, plus cross-cutting idempotency/batch-tracking edges. `streaming` is
  explicitly **excluded**.

## Examples

- [`quicklist/`](quicklist/) — a worked tiny CRUD example with a full, clean oracle bundle
  (`control: true`). Use it as the template for the *thick* shape; use the thin fixtures above for the
  generative shape.
