# CLAUDE.md

`decomp` is a **research** repo (a falsifiable cost-vs-reliability research program, not a product codebase).
Operational source of truth: **`STATE.md`**. North-star / win condition: **`docs/PROPOSAL-HYBRID.md`**. Read
those first for what the program is currently doing.

## Frozen — do not edit
Pre-registration / frozen apparatus: `studies/meta-search/DESIGN.md`, `studies/meta-search/FREEZE.md`, and
everything under `studies/build-gap/`. Treat these as read-only unless explicitly told otherwise. **One sanctioned
exception for `DESIGN.md`:** purely **additive, non-void-invariant** amendments (anything that does NOT touch the
weights vector, the per-cell veto definition, the parity δ/α, or the committed TEST-set hash) are permitted
**when logged** in [`studies/meta-search/AMENDMENTS.md`](studies/meta-search/AMENDMENTS.md) per its void-rule.
`FREEZE.md` and the `studies/build-gap/` tree remain strictly read-only.

## OKF knowledge bundle — how agents should use it for context

There is a curated **OKF** (Open Knowledge Format) knowledge bundle at **`okf/agentic-workflow-optimization/`**:
the external research field of automated agentic-workflow optimization (GEPA/ADAS/AFlow/… + surveys) **and** this
program's own findings/synthesis. It is **reference material, not the repo's goal** (the goal is the hybrid
system in `docs/PROPOSAL-HYBRID.md`). Tooling: **`okf/tools/okf.py`** (`lint` gate + `viz` graph). Format study
+ adoption notes: `okf/OKF-STUDY-AND-ADOPTION.md`.

When a task touches what this bundle covers — agentic-workflow optimization/search, the meta-search program's
findings, or the fitness / lethal-quadrant / two-term framing — **consult the bundle as part of gathering
context**, like this:

1. **Enumerate, then fetch.** If the **`okf` MCP server** is connected (registered in `.mcp.json`), use its
   tools — `okf_list` (optionally filtered by `status`/`type`/`tag`/`query`) to see what exists, then
   `okf_get`/`okf_backlinks` for the specific concepts you need. Otherwise read
   `okf/agentic-workflow-optimization/index.md` (and the per-section `index.md`s) and open the concept files
   directly. Either way: **do not** treat it as a vector store — navigate by the index and the markdown
   cross-links (the bundle is graph-shaped).
2. **Trust by frontmatter.** Each concept carries a `type`; `findings/` and `synthesis/` carry
   `status: confirmed | provisional | superseded`. Weight `confirmed` over `provisional`; treat `superseded` as
   historical. Provenance is each concept's `# Citations` section.
3. **Keep it conformant when you edit it.** If you add or change a concept, run
   `python3 okf/tools/okf.py lint` (required keys + link integrity — must be GREEN) and add a dated entry to the
   bundle's `log.md`.

### K3 read-scope guard (oracle-blindness — load-bearing)
The `agentic-workflow-optimization/` bundle is **leak-safe to read in any context**. But agents whose output is
graded by the program's **hidden oracle** — i.e. **code-building** agents and **meta-search candidates** — MUST
NOT read oracle-adjacent bundles: `okf/hybrid-builder-domain/` and `okf/meta-search-learnings/` (planned) will
carry domain/solution knowledge, so reading them from inside a builder or a search candidate is a **K3
provenance leak**. Only general orientation/context agents may read those; never a builder or a scored candidate.
