# OKF (Open Knowledge Format) — study of `GoogleCloudPlatform/knowledge-catalog` + how to take full advantage of our bundle

> Study date 2026-06-19. Source studied: `GoogleCloudPlatform/knowledge-catalog` (cloned, OKF v0.1 Draft).
> Spec: that repo's `okf/SPEC.md`. Reference toolchain: its `okf/src/enrichment_agent/` (Python) and
> `toolbox/` (TypeScript, GCP-bound). This doc records what the format/tooling/agent-consumption model are,
> where **our** `okf/agentic-workflow-optimization/` bundle stands against them (measured), and the concrete
> moves to take full advantage. Findings were produced by four parallel read-agents over the clone and then
> **verified by running the canonical tooling against our bundle**.

---

## 1. What OKF is (one paragraph)

OKF is a **vendor-neutral knowledge-interchange format**: a directory tree of UTF-8 markdown files, each with a
YAML frontmatter block, distributed as a git repo / tarball / subdir. *"If you can `cat` a file you can read
OKF; if you can `git clone` you can ship it."* It is deliberately minimal — no schema registry, no central
taxonomy, no required tooling — and forward-compatible by contract: **consumers MUST be permissive** (tolerate
unknown `type`s, missing optional fields, extension keys, broken links). The format is the contribution; the
enrichment agent + HTML viewer in the repo are just a reference *producer* and *consumer*.

- **Concept doc** = `<frontmatter>` + markdown body. **Concept ID** = file path minus `.md`.
- **Reserved filenames**: `index.md` (per-dir listing, progressive disclosure) and `log.md` (changelog). Every
  other `.md` is a concept. There is **no JSON manifest** — the bundle is self-describing.
- **Required frontmatter**: the *spec* requires only `type`; the *reference validator* (`bundle/document.py`)
  requires **`type, title, description, timestamp`**. Recommended set also includes `resource`, `tags`.
- **Cross-links** = plain markdown links, untyped (a link asserts *a* relationship; the kind is prose).
  Spec **prefers bundle-absolute** (`/tables/x.md`, stable under moves); the shipped exemplars use relative.
  Backlinks ("Cited by") are *computed*, not stored. Provenance lives in a `# Citations` body section + the
  `resource` URI. **No status/confidence/version fields in core** — use extension keys (preserved by consumers).

## 2. Where OUR bundle stands — measured, and it is strong

Our `okf/agentic-workflow-optimization/` (47 files, `okf_version: "0.1"` in the root index):

| Check | Result | How verified |
|---|---|---|
| Canonical validator (`OKFDocument.parse`+`.validate`) | **40/40 concept docs PASS, 0 failures** | ran the real `bundle/document.py` against our bundle |
| Required keys (type/title/description/timestamp) | **40/40 present** | validator + a JS scan |
| `# Citations` provenance section | **40/40 present** | scan |
| Cross-link integrity (bundle-absolute `/…md`) | **219 links, 0 broken** | scan |
| `type` vocabulary | 7 values (Method 14 · Finding 10 · Concept 7 · Synthesis 4 · Survey 3 · Reference 1 · Critique 1) | scan |
| Link convention | spec-**preferred** absolute `/…` (exemplars use relative) | scan |

**Conclusion: our bundle already exceeds the canonical data-catalog exemplars on provenance discipline**
(100% Citations, richer type vocabulary, spec-preferred links, `okf_version` declared — the exemplars declare
none). "Take full advantage" is therefore **not** a conformance-repair job. The payoff is in (a) tooling we've
never run, (b) the agent-consumption wiring we don't have, and (c) lifecycle fields we don't yet use.

## 3. The tooling — what to lift, what to ignore

Two stacks. Adopt the first; treat the second as design reference only.

- **`okf/src/enrichment_agent/` (Python) — the real format tooling.** Its *format core* is **PyYAML-only,
  zero-GCP, runnable on any bundle today**:
  - `bundle/document.py` — `OKFDocument.parse/serialize/validate` (the validator). **VERIFIED on our bundle.**
  - `bundle/index.py` + `paths.py` — index regeneration + concept-id↔path. (index regen optionally calls Gemini
    for directory summaries, with a non-LLM fallback.)
  - `viewer/generator.py` + `viewer/static/{viz.css,viz.js}` + `templates/viz.html` — `generate_visualization`
    renders a **self-contained interactive HTML graph** (Cytoscape: nodes by `type`, edges from cross-links,
    computed "Cited by" backlinks, type filter, client-side substring search). No backend. **VERIFIED on our
    bundle** (see §6 for the one gotcha).
  - The *producer* (`runner.py`/`agent.py`/`sources/bigquery.py`) is bound to **google-adk + Gemini +
    BigQuery**, but exposes a clean `Source` ABC (`list_concepts`/`read_concept`/`sample_rows`/`find`) as the
    intended extension point.
- **`toolbox/mdcode` (`kcmd`, TypeScript) + `toolbox/enrichment` (`kcagent`) — GCP-bound; do NOT adopt.** These
  are "Metadata as Code": bidirectional sync with the Google **Dataplex / Knowledge Catalog cloud service**
  (`gcloud` ADC auth, real EntryGroups/aspects). Useful only as a *design reference* for a sync layer. The one
  reusable piece is the generic `md-fileset` MCP server (markdown directory search/read over any dir).
- **There is NO `okf lint` / `okf validate` CLI** — validation is the `OKFDocument.validate()` library function +
  the `okf/tests/` pytest suite as the implicit conformance spec. A thin CLI wrapper is trivial to add.

## 4. How agents are MEANT to consume an OKF bundle (answers the earlier "direct agents at our OKF" question)

The crux finding: **consumption is deliberately structural — there is NO embedding/vector/semantic retrieval
anywhere** (it is an explicit Non-Goal). The pattern is:

1. **Enumerate, then fetch by exact id.** `list-entries` / `list_concepts()` (or read `index.md`) to see what
   exists → `lookup-entry(name)` / `read_existing_doc(id)` to load the specific concept. Eager full-bundle load
   into a name→path map; **the consuming LLM does relevance ranking** by reasoning over names + the `index.md`
   hierarchy + tags + cross-links. The only mechanical narrowing is type/tag/substring filters.
2. **Traverse the graph** — follow cross-links and computed backlinks; the bundle is graph-shaped, not flat.
3. **Read frontmatter for routing & trust** — branch on `type`, filter on `tags`, deref `resource`,
   sanity-check `timestamp`; treat `# Citations` (+ an optional read-only `.ref` grounding layer) as provenance.
4. **The canonical machine surface is an MCP server** (`kcmd mcp --path <bundle>`) exposing `list-entries`,
   `lookup-entry`, `modify-entry`. The reference **viewer** is the human consumer.
5. **Close the loop (the learning pattern).** `conversation_learner` is an LLM-as-judge over live agent
   conversation logs → emits `{proposals:[ContextEnrichmentProposal]}` (classification, target asset, flaw,
   proposed enrichment, evidence quote, confidence) → the enrichment agent ingests them via `--feedback_dir` as
   **highest-priority context that overrides docs** → updates the bundle → grounds the next conversation. The
   contract is the shared `proposal.json` shape, run as an orchestrated step (no auto-wiring).

## 5. Recommendations — take full advantage (prioritized)

**R1 — Adopt the zero-GCP validator + viewer as in-repo tooling (a gate + a map). [highest leverage, proven]**
Lift `bundle/{document,index,paths}.py` + `viewer/` (PyYAML only). Wrap `OKFDocument.validate()` + a
broken-link walk in a tiny `okf-lint` CLI and run it as a gate (we already proved 40/40 pass + 0 broken links).
Ship `generate_visualization` to produce a navigable `viz.html` of the bundle — an instant map of the research
(41 concepts / 173 edges, generated). This is the cheapest, most concrete win and it is reusable across every
future bundle.

**R2 — Add lifecycle/provenance EXTENSION keys (`status`, `confidence`) to `Finding`/`Synthesis` docs.
[strategic — unblocks meta-search knowledge-conditioning]**
OKF core has no status field, but extension keys are first-class and consumer-preserved. Our research lifecycle
is *literally* provisional→confirmed→superseded (the MEMORY era-buckets, the "PROVISIONAL" labels, the
"confirmed only on recurrence across ≥2 distinct oracles" rule). Encoding `status: provisional|confirmed|
superseded` (+ optional `confidence`) in frontmatter gives a queryable, machine-checkable record — and **is
exactly the `confirmed`-record store the meta-search knowledge-conditioning gene was deferred for** (it was
blocked pending such a store). Keep it lean (frontmatter = the index layer; don't bloat).

**R3 — Wire agents to consume via enumerate→fetch, respecting the K3 read-scope. [answers "direct agents at OKF"]**
Stand up the consumption surface — either run `kcmd mcp --path okf/agentic-workflow-optimization` (its OKF-layout
reader is `glob`+parse, no GCP; only push/pull need GCP — worth a standalone test) or write a ~50-line in-repo
loader/MCP exposing `list_concepts`/`get_concept`. THEN, if we want a standing directive (the earlier question),
add one line to `CLAUDE.md` / a memory entry pointing agents at it — **scoped to the leak-safe bundle only**:
`okf/agentic-workflow-optimization/` is safe; `okf/hybrid-builder-domain/` (when built), logs, and any
oracle-adjacent content are a **K3 leak risk** for builder/search agents and must stay out of scope.

**R4 — Keep our hand-authored `index.md` prose; do NOT auto-regenerate over it. [guardrail]**
The reference `regenerate_indexes` groups strictly by `type` with terse relative links + one-line descriptions —
that would **downgrade** our curated, sectioned index prose. Use index regen only as a *completeness cross-check*
(does every concept appear?), never as an overwrite.

**R5 — Build the planned bundles with this template + quality bar.**
`okf/meta-search-learnings/` and `okf/hybrid-builder-domain/` (mentioned in `workflow-search-m5-fit`): author to
the exemplar bar (one concept/file, full frontmatter, `# Citations` on every unit, hub-and-spoke cross-links,
runnable/atomic examples). Reuse the `okf-lint` gate from R1. **`hybrid-builder-domain/` carries oracle-adjacent
content → it is K3-leak-scoped (per R3), never readable by builder/search agents.**

**R6 — Model our retro/knowledge-capture loop on `conversation_learner`. [aspirational, aligns with §10 plan]**
The judge→`proposal.json`→enrich→bundle loop is a structured version of `/retro` + memory. A lightweight
"findings proposal" contract feeding the bundle would make knowledge capture a closed loop rather than ad hoc.

## 6. Caveats / gotchas (verified)

- **Viewer skips bundle-absolute links — our links produce 0 edges out of the box.** `viewer/generator.py`
  `_extract_links` does `if "://" in t or t.startswith("/"): continue` — it graphs **only relative** links. Our
  bundle uses the spec-*preferred* absolute form, so the **stock viewer renders 0 edges**. A 3-line patch
  (resolve `/…` against bundle root) restores the full graph (**0 → 173 edges, verified**). Decision: keep our
  absolute links (more robust, spec-preferred) and carry the 3-line viewer patch — do **not** downgrade to
  relative links just to satisfy the unpatched reference viewer.
- **Spec vs. reference impl mismatch on required keys.** Spec hard-requires only `type`; the tooling requires
  four. We satisfy both (six fields). Fine — just don't drop below the four.
- **Don't adopt `toolbox/` (Dataplex-bound).** It needs GCP and a cloud catalog service; nothing there runs on
  our bundles standalone except the generic `md-fileset` MCP server.
- **Frontmatter discipline:** keep it the lean queryable layer (`type`/`tags`/`resource`/`timestamp`/`status`);
  push schemas, prose, examples to the body. The format rewards structural bodies (`# Schema`/`# Citations` are
  machine-parsed; the web-enrich guard refuses writes that *shrink* Citations/Schema — augment, don't clobber).

## Appendix — reproduce
```bash
# validator + viewer (PyYAML only; clone of knowledge-catalog at /tmp/knowledge-catalog)
PYTHONPATH=/tmp/knowledge-catalog/okf/src python3 -c "
from pathlib import Path
from enrichment_agent.bundle.document import OKFDocument
b=Path('okf/agentic-workflow-optimization')
bad=[p for p in b.rglob('*.md') if p.name not in('index.md','log.md') and (lambda:[OKFDocument.parse(p.read_text()).validate()])() and False]
print('validated', sum(1 for p in b.rglob('*.md') if p.name not in('index.md','log.md')),'docs')"
# viewer needs the 3-line absolute-link patch in _extract_links to render our links (see §6).
```
