#!/usr/bin/env python3
"""okf — a tiny, dependency-free gate + viewer for our OKF (Open Knowledge Format) bundles.

WHY ours (not the upstream tooling): the canonical validator lives in google-adk-flavoured packages and the
reference viewer (knowledge-catalog `viewer/generator.py`) SKIPS bundle-absolute links (`if t.startswith('/')`),
so it renders 0 edges on our bundles — which use the spec-PREFERRED absolute form. This reimplements the two
genuinely reusable pieces — validate + visualize — in one stdlib-only file that resolves BOTH relative and
bundle-absolute links correctly. See `okf/OKF-STUDY-AND-ADOPTION.md` (R1 + §6 gotcha).

Conformance checked (per OKF v0.1 + the reference validator `bundle/document.py`):
  - every non-reserved .md (not index.md/log.md) parses a `---`-delimited YAML-ish frontmatter mapping, and
  - carries the four reference-required keys: type, title, description, timestamp (non-empty); and
  - every markdown link to a `*.md` inside the bundle (relative OR `/`-absolute) resolves to a real file.

Usage:
  python3 okf/tools/okf.py lint [BUNDLE ...]      # default: every bundle dir under okf/. Exit 1 on any failure.
  python3 okf/tools/okf.py viz BUNDLE [-o OUT]    # write a self-contained interactive HTML graph (default <bundle>/viz.html)
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

REQUIRED_KEYS = ("type", "title", "description", "timestamp")
RESERVED = {"index.md", "log.md"}
_FM_RE = re.compile(r"^---\n(.*?)\n---", re.DOTALL)
_LINK_RE = re.compile(r"\]\((?P<t>[^)\s#]+\.md)(?:#[^)]*)?\)")
HERE = Path(__file__).resolve().parent
OKF_ROOT = HERE.parent  # the okf/ dir


def _parse_frontmatter(text: str) -> dict | None:
    """Minimal top-level scalar/inline-list frontmatter parse (stdlib only). Returns None if no frontmatter."""
    m = _FM_RE.match(text)
    if not m:
        return None
    fm: dict[str, object] = {}
    for line in m.group(1).splitlines():
        if not line.strip() or line[0] in " \t-#":  # skip blanks, nested/indented, list items, comments
            continue
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key, val = key.strip(), val.strip()
        if val.startswith("[") and val.endswith("]"):
            fm[key] = [x.strip().strip("'\"") for x in val[1:-1].split(",") if x.strip()]
        else:
            fm[key] = val.strip("'\"")
    return fm


def _concepts(bundle: Path) -> list[Path]:
    return [p for p in sorted(bundle.rglob("*.md")) if p.name not in RESERVED]


def _all_md_ids(bundle: Path) -> set[str]:
    ids: set[str] = set()
    for p in bundle.rglob("*.md"):
        rel = p.relative_to(bundle).as_posix()
        ids.add("/" + rel)
        ids.add("/" + rel[:-3])  # without .md
    return ids


def _resolve_link(target: str, doc: Path, bundle: Path) -> Path | None:
    """Resolve a markdown link target (relative or /-absolute) to a path inside the bundle, or None if outside."""
    if "://" in target:
        return None
    if target.startswith("/"):
        cand = (bundle / target.lstrip("/")).resolve()
    else:
        cand = (doc.parent / target).resolve()
    try:
        cand.relative_to(bundle.resolve())
    except ValueError:
        return None
    return cand


def lint_bundle(bundle: Path) -> tuple[int, int, list[str]]:
    """Return (concept_count, link_count, problems)."""
    problems: list[str] = []
    concepts = _concepts(bundle)
    ids = _all_md_ids(bundle)
    link_count = 0
    for p in concepts:
        rel = p.relative_to(bundle).as_posix()
        text = p.read_text(encoding="utf-8")
        fm = _parse_frontmatter(text)
        if fm is None:
            problems.append(f"{rel}: no frontmatter block")
            continue
        missing = [k for k in REQUIRED_KEYS if not str(fm.get(k, "")).strip()]
        if missing:
            problems.append(f"{rel}: missing/empty required key(s): {', '.join(missing)}")
    # link integrity across ALL md (incl. index.md, which carries the navigation links)
    for p in bundle.rglob("*.md"):
        rel = p.relative_to(bundle).as_posix()
        for m in _LINK_RE.finditer(p.read_text(encoding="utf-8")):
            target = m.group("t")
            if "://" in target:
                continue
            link_count += 1
            resolved = _resolve_link(target, p, bundle)
            if resolved is None:
                continue  # link points outside the bundle (e.g. ../../STATE.md) — not our integrity concern
            if not resolved.exists():
                problems.append(f"{rel}: broken link -> {target}")
    return len(concepts), link_count, problems


def cmd_lint(args: list[str]) -> int:
    bundles = [Path(a) for a in args] or [p.parent for p in OKF_ROOT.glob("*/index.md")]
    if not bundles:
        print("no bundles found under", OKF_ROOT)
        return 1
    total_problems = 0
    for b in bundles:
        if not b.is_dir():
            print(f"  ✗ {b}: not a directory")
            total_problems += 1
            continue
        n, links, problems = lint_bundle(b)
        status = "✓ OK" if not problems else f"✗ {len(problems)} PROBLEM(S)"
        try:
            label = b.resolve().relative_to(OKF_ROOT.parent)
        except ValueError:
            label = b
        print(f"  {status}  {label}  ({n} concepts, {links} internal links)")
        for pr in problems:
            print(f"       - {pr}")
        total_problems += len(problems)
    print(f"\nokf lint: {'GREEN — all bundles conformant' if total_problems == 0 else f'{total_problems} problem(s)'}")
    return 0 if total_problems == 0 else 1


# ---- viz ---------------------------------------------------------------------------------------------------
_PALETTE = {
    "Method": "#4e79a7", "Finding": "#59a14f", "Concept": "#9c755f", "Synthesis": "#e15759",
    "Survey": "#edc948", "Critique": "#b07aa1", "Reference": "#76b7b2",
}

_HTML = """<!doctype html><html><head><meta charset="utf-8"><title>__NAME__ — OKF graph</title>
<script src="https://cdn.jsdelivr.net/npm/cytoscape@3.28.1/dist/cytoscape.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>
<style>
 body{margin:0;font:14px/1.5 system-ui,sans-serif;display:flex;height:100vh}
 #cy{flex:1;background:#fafafa}
 #side{width:420px;overflow:auto;border-left:1px solid #ddd;padding:14px 18px;box-sizing:border-box}
 #side h2{margin:.2em 0;font-size:16px} #body{font-size:13px} #body pre{white-space:pre-wrap;background:#f4f4f4;padding:8px;border-radius:4px;overflow-x:auto}
 #ctl{position:fixed;top:8px;left:8px;background:#fff;border:1px solid #ddd;border-radius:6px;padding:8px 10px;font-size:12px;max-width:260px;box-shadow:0 1px 4px rgba(0,0,0,.1)}
 #ctl input{width:150px} .lg{display:inline-block;margin:2px 6px 2px 0;cursor:pointer;user-select:none}
 .sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:3px;vertical-align:middle}
 .citedby a,.links a{display:block;color:#2a6} a{color:#36c;text-decoration:none} a:hover{text-decoration:underline}
</style></head><body>
<div id="cy"></div>
<div id="ctl"><b>__NAME__</b><br><input id="q" placeholder="filter nodes…"><div id="legend"></div></div>
<div id="side"><em>Click a node to see its content.</em></div>
<script>
const G=__DATA__, PAL=__PAL__;
const elements=[...G.nodes.map(n=>({data:n.data})),...G.edges.map(e=>({data:e.data}))];
const cy=cytoscape({container:document.getElementById('cy'),elements,
 style:[{selector:'node',style:{'background-color':e=>PAL[e.data('type')]||'#999','label':'data(label)','font-size':7,'width':14,'height':14,'text-wrap':'wrap','text-max-width':90,'color':'#333'}},
 {selector:'edge',style:{'width':1,'line-color':'#ccc','target-arrow-color':'#ccc','target-arrow-shape':'triangle','curve-style':'bezier','arrow-scale':.6}},
 {selector:'.faded',style:{'opacity':.12}},{selector:'.sel',style:{'border-width':3,'border-color':'#e15759'}}],
 layout:{name:'cose',idealEdgeLength:90,nodeRepulsion:9000,animate:false}});
const types=[...new Set(G.nodes.map(n=>n.data.type))].sort();
document.getElementById('legend').innerHTML=types.map(t=>`<span class="lg" data-t="${t}"><span class="sw" style="background:${PAL[t]||'#999'}"></span>${t}</span>`).join('');
function show(id){const n=cy.getElementById(id);cy.nodes().removeClass('sel');n.addClass('sel');
 const body=G.bodies[id]||'';const out=cy.edges(`[source = "${id}"]`).map(e=>e.data('target'));
 const inc=cy.edges(`[target = "${id}"]`).map(e=>e.data('source'));
 const lk=a=>a.length?a.map(x=>`<a href="#" onclick="show('${x}');return false">${x}</a>`).join(''):'<em>none</em>';
 document.getElementById('side').innerHTML=`<h2>${id}</h2><div style="color:#888">${n.data('type')}</div>`+
  `<div id="body">${marked.parse(body)}</div><hr><b>Links to →</b><div class="links">${lk(out)}</div>`+
  `<b>Cited by ←</b><div class="citedby">${lk(inc)}</div>`;}
cy.on('tap','node',e=>show(e.target.id()));
document.getElementById('q').addEventListener('input',e=>{const q=e.target.value.toLowerCase();
 cy.nodes().forEach(n=>{const hit=!q||(n.id()+' '+n.data('label')+' '+(n.data('tags')||'')).toLowerCase().includes(q);n.toggleClass('faded',!hit)});});
document.querySelectorAll('.lg').forEach(el=>el.onclick=()=>{const t=el.dataset.t;el.style.opacity=el.style.opacity==='0.35'?'1':'0.35';
 cy.nodes(`[type = "${t}"]`).toggleClass('faded');});
</script></body></html>"""


def build_graph(bundle: Path) -> dict:
    concepts = _concepts(bundle)
    by_id: dict[str, dict] = {}
    bodies: dict[str, str] = {}
    for p in concepts:
        cid = "/" + p.relative_to(bundle).as_posix()[:-3]
        text = p.read_text(encoding="utf-8")
        fm = _parse_frontmatter(text) or {}
        body = text[_FM_RE.match(text).end():].strip() if _FM_RE.match(text) else text
        tags = fm.get("tags") or []
        by_id[cid] = {"data": {"id": cid, "label": str(fm.get("title") or cid.split("/")[-1]),
                               "type": str(fm.get("type") or "?"), "tags": " ".join(tags) if isinstance(tags, list) else str(tags)}}
        bodies[cid] = body
    ids = set(by_id)
    edges = []
    seen = set()
    for p in concepts:
        cid = "/" + p.relative_to(bundle).as_posix()[:-3]
        for m in _LINK_RE.finditer(p.read_text(encoding="utf-8")):
            resolved = _resolve_link(m.group("t"), p, bundle)
            if resolved is None or not resolved.exists():
                continue
            tid = "/" + resolved.relative_to(bundle.resolve()).as_posix()[:-3]
            if tid == cid or tid not in ids or (cid, tid) in seen:
                continue
            seen.add((cid, tid))
            edges.append({"data": {"id": f"{cid}->{tid}", "source": cid, "target": tid}})
    return {"nodes": list(by_id.values()), "edges": edges, "bodies": bodies}


def cmd_viz(args: list[str]) -> int:
    if not args:
        print("usage: okf.py viz BUNDLE [-o OUT]")
        return 1
    bundle = Path(args[0])
    out = Path(args[args.index("-o") + 1]) if "-o" in args else bundle / "viz.html"
    if not bundle.is_dir():
        print(f"not a directory: {bundle}")
        return 1
    g = build_graph(bundle)
    page = (_HTML.replace("__NAME__", html.escape(bundle.name))
            .replace("__DATA__", json.dumps(g))
            .replace("__PAL__", json.dumps(_PALETTE)))
    out.write_text(page, encoding="utf-8")
    print(f"wrote {out}  ({len(g['nodes'])} concepts, {len(g['edges'])} edges, {len(page)} bytes)")
    return 0


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] not in ("lint", "viz"):
        print(__doc__)
        return 2
    return cmd_lint(sys.argv[2:]) if sys.argv[1] == "lint" else cmd_viz(sys.argv[2:])


if __name__ == "__main__":
    raise SystemExit(main())
