# okf/tools — gate + viewer for our OKF bundles

`okf.py` is a single, **dependency-free (stdlib-only)** tool for our OKF (Open Knowledge Format) bundles. It
reimplements the two genuinely reusable pieces of `GoogleCloudPlatform/knowledge-catalog` — validate + visualize
— correctly handling the spec-**preferred** bundle-absolute links (`/foo/bar.md`) that the upstream reference
viewer drops. Background + rationale: [`../OKF-STUDY-AND-ADOPTION.md`](../OKF-STUDY-AND-ADOPTION.md).

## lint — the conformance gate
```bash
python3 okf/tools/okf.py lint                 # every bundle dir under okf/ (default)
python3 okf/tools/okf.py lint okf/<bundle>    # one bundle
```
Checks, per the OKF v0.1 spec + the reference validator:
- every non-reserved `.md` (not `index.md`/`log.md`) has a `---`-delimited frontmatter with the four
  reference-required keys **non-empty**: `type`, `title`, `description`, `timestamp`;
- every in-bundle markdown link to a `*.md` (relative **or** `/`-absolute) resolves to a real file.

Exit code is **0 (GREEN)** or **1** with a per-problem list — wire it as a CI/commit gate. Extension keys
(e.g. `status`, `resource`, `tags`) are allowed and ignored by the gate.

## viz — the interactive map
```bash
python3 okf/tools/okf.py viz okf/<bundle>               # → okf/<bundle>/viz.html
python3 okf/tools/okf.py viz okf/<bundle> -o /tmp/x.html
```
Writes a self-contained HTML graph (Cytoscape + marked via CDN — needs internet to *render*, not to generate):
nodes colored by `type`, edges from cross-links (relative + absolute), click a node for its rendered body,
"Cited by" backlinks, type-legend filter, and a node search box. `viz.html` is a build artifact — generate on
demand; it is not committed into the bundle (the gate ignores non-`.md` files).

## okf_mcp.py — the MCP server (agent consumption surface)
`okf_mcp.py` is a **stdlib-only MCP (Model Context Protocol) server** that exposes the bundle to any MCP client
(Claude Code, Claude Desktop, subagents) as the canonical **enumerate → fetch** surface — no embeddings; the LLM
ranks relevance over names/tags/links. Registered for this repo in `.mcp.json` (Claude Code launches it).

Tools (READ-ONLY in v1; write tools — status promotion / proposals — are deliberately phase 2):
- `okf_list({status?, type?, tag?, query?})` → concept index rows `{id,title,type,status,description,tags}` (no bodies)
- `okf_get({id})` → one concept `{id, frontmatter, body, links_to, cited_by}`
- `okf_backlinks({id})` → concepts that cite this one (the computed reverse link graph)

**K3 oracle-blindness guard (load-bearing):** the server serves ONLY the leak-safe allowlist
(`agentic-workflow-optimization`). Pointing it at an oracle-adjacent bundle (`hybrid-builder-domain`,
`meta-search-learnings`) **refuses to start** (exit 2) unless a human passes `--allow-unsafe` for a deliberately
non-builder context. So a code-building / meta-search candidate agent given only this MCP cannot leak
oracle-shaped knowledge.

```bash
python3 okf/tools/okf_mcp.py                     # serve the default leak-safe bundle over stdio (MCP)
python3 okf/tools/okf_mcp.py --bundle okf/<x>    # serve another allowlisted bundle
```
No `pip install` — it implements the MCP stdio JSON-RPC transport directly (stdlib only).

## Conventions this tooling assumes
- **Links:** prefer bundle-absolute (`/concepts/x.md`) — stable under moves, spec-preferred, and supported here.
- **`status` extension key** (on `findings/` + `synthesis/`): `confirmed | provisional | superseded` — see the
  bundle `log.md` for the rubric.
