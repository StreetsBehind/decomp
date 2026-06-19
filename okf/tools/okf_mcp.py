#!/usr/bin/env python3
"""okf_mcp — a stdlib-only MCP (Model Context Protocol) server over an OKF knowledge bundle.

Exposes the enumerate->fetch consumption surface (the canonical OKF agent-consumption pattern: NO embeddings —
the LLM ranks relevance over names/tags/links) as MCP tools, so any MCP client (Claude Code, Claude Desktop,
subagents) can consult the bundle on demand instead of dumping it into context or reading raw files.

Tools (READ-ONLY in v1; write tools — status promotion / proposals — are deliberately phase 2):
  okf_list({status?, type?, tag?, query?})  -> concept index rows {id,title,type,status,description,tags} (no bodies)
  okf_get({id})                              -> one concept {id, frontmatter, body, links_to, cited_by}
  okf_backlinks({id})                        -> concepts that cite this one (the computed reverse link graph)

K3 oracle-blindness guard (load-bearing): this server serves ONLY explicitly leak-safe bundles (ALLOW below).
Oracle-adjacent bundles (hybrid-builder-domain / meta-search-learnings) are refused, so a code-building or
meta-search candidate agent given ONLY this MCP physically cannot leak oracle-shaped knowledge. A human can
override with --allow-unsafe for a deliberately-non-builder context.

Why stdlib-only (no `mcp` SDK): matches okf.py's dependency-free design and runs with bare `python3` — no
`pip install` step before an MCP client can launch it. Implements the MCP stdio transport: newline-delimited
JSON-RPC 2.0 (initialize / tools/list / tools/call / ping). stdout carries ONLY protocol messages; logs -> stderr.

Run (normally launched by an MCP client via .mcp.json):
  python3 okf/tools/okf_mcp.py [--bundle okf/<name>] [--allow-unsafe]
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]  # okf/tools -> okf -> repo root
SERVER_NAME = "okf"
SERVER_VERSION = "0.1.0"
DEFAULT_PROTOCOL = "2024-11-05"

# K3: only these bundle dir names may be served (default-deny). Oracle-adjacent bundles are intentionally absent.
ALLOW = {"agentic-workflow-optimization"}


def log(*a):
    print("[okf_mcp]", *a, file=sys.stderr, flush=True)


# ---- reuse okf.py's parser/link-resolver as the single source of truth (load by path, no namespace clash) ----
def _load_okf_tool():
    spec = importlib.util.spec_from_file_location("okf_tool", HERE / "okf.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


OKF = _load_okf_tool()


# ---- bundle model ------------------------------------------------------------------------------------------
def _norm_id(raw: str) -> str:
    s = (raw or "").strip()
    if not s.startswith("/"):
        s = "/" + s
    if s.endswith(".md"):
        s = s[:-3]
    return s


def load_bundle(bundle: Path) -> dict:
    bundle = bundle.resolve()
    concepts = OKF._concepts(bundle)
    index: dict[str, dict] = {}
    raw_links: dict[str, list[str]] = {}
    for p in concepts:
        cid = "/" + p.relative_to(bundle).as_posix()[:-3]
        text = p.read_text(encoding="utf-8")
        fm = OKF._parse_frontmatter(text) or {}
        m = OKF._FM_RE.match(text)
        body = text[m.end():].strip() if m else text
        index[cid] = {"id": cid, "frontmatter": fm, "body": body}
        raw_links[cid] = [mm.group("t") for mm in OKF._LINK_RE.finditer(text)]
    ids = set(index)
    links_to: dict[str, list[str]] = {cid: [] for cid in ids}
    cited_by: dict[str, list[str]] = {cid: [] for cid in ids}
    for cid, p in zip(index, concepts):
        for target in raw_links[cid]:
            resolved = OKF._resolve_link(target, p, bundle)
            if resolved is None or not resolved.exists():
                continue
            tid = "/" + resolved.resolve().relative_to(bundle).as_posix()[:-3]
            if tid in ids and tid != cid and tid not in links_to[cid]:
                links_to[cid].append(tid)
                cited_by[tid].append(cid)
    for cid in ids:
        index[cid]["links_to"] = sorted(links_to[cid])
        index[cid]["cited_by"] = sorted(cited_by[cid])
    return index


# ---- tool implementations ----------------------------------------------------------------------------------
def _row(c: dict) -> dict:
    fm = c["frontmatter"]
    tags = fm.get("tags") or []
    return {"id": c["id"], "title": fm.get("title", ""), "type": fm.get("type", ""),
            "status": fm.get("status", ""), "description": fm.get("description", ""),
            "tags": tags if isinstance(tags, list) else [tags]}


def tool_okf_list(idx: dict, status=None, type=None, tag=None, query=None) -> dict:
    rows = [_row(c) for c in idx.values()]
    if status:
        rows = [r for r in rows if r["status"] == status]
    if type:
        rows = [r for r in rows if r["type"] == type]
    if tag:
        rows = [r for r in rows if tag in r["tags"]]
    if query:
        q = query.lower()
        rows = [r for r in rows if q in (r["id"] + " " + r["title"] + " " + r["description"] + " " + " ".join(r["tags"])).lower()]
    rows.sort(key=lambda r: r["id"])
    return {"count": len(rows), "concepts": rows}


def tool_okf_get(idx: dict, id: str) -> dict:
    cid = _norm_id(id)
    c = idx.get(cid)
    if not c:
        raise KeyError(f"no concept with id {cid!r}. Use okf_list to see valid ids.")
    return {"id": c["id"], "frontmatter": c["frontmatter"], "body": c["body"],
            "links_to": c["links_to"], "cited_by": c["cited_by"]}


def tool_okf_backlinks(idx: dict, id: str) -> dict:
    cid = _norm_id(id)
    c = idx.get(cid)
    if not c:
        raise KeyError(f"no concept with id {cid!r}. Use okf_list to see valid ids.")
    return {"id": c["id"], "cited_by": [{"id": b, "title": idx[b]["frontmatter"].get("title", "")} for b in c["cited_by"]]}


TOOLS = [
    {"name": "okf_list",
     "description": "List concepts in the OKF bundle (ids + title/type/status/description/tags; NO bodies). Optional filters narrow the set. Use this first to see what exists, then okf_get the ones you need.",
     "inputSchema": {"type": "object", "properties": {
         "status": {"type": "string", "description": "filter by lifecycle status: confirmed | provisional | superseded"},
         "type": {"type": "string", "description": "filter by concept type, e.g. Finding, Method, Concept, Synthesis, Survey"},
         "tag": {"type": "string", "description": "filter to concepts carrying this tag"},
         "query": {"type": "string", "description": "case-insensitive substring over id+title+description+tags"}}}},
    {"name": "okf_get",
     "description": "Fetch one concept's full frontmatter + markdown body + its forward links (links_to) and backlinks (cited_by). id may be with or without a leading slash or .md.",
     "inputSchema": {"type": "object", "properties": {"id": {"type": "string", "description": "concept id, e.g. /findings/lethal-quadrant"}}, "required": ["id"]}},
    {"name": "okf_backlinks",
     "description": "List the concepts that cite (link to) the given concept — the computed reverse link graph.",
     "inputSchema": {"type": "object", "properties": {"id": {"type": "string", "description": "concept id"}}, "required": ["id"]}},
]
DISPATCH = {"okf_list": tool_okf_list, "okf_get": tool_okf_get, "okf_backlinks": tool_okf_backlinks}


# ---- MCP stdio JSON-RPC loop -------------------------------------------------------------------------------
def _send(msg: dict):
    sys.stdout.write(json.dumps(msg) + "\n")
    sys.stdout.flush()


def _result(rid, result):
    _send({"jsonrpc": "2.0", "id": rid, "result": result})


def _error(rid, code, message):
    _send({"jsonrpc": "2.0", "id": rid, "error": {"code": code, "message": message}})


def serve(idx: dict, bundle_name: str):
    log(f"serving bundle '{bundle_name}' ({len(idx)} concepts); tools: {', '.join(DISPATCH)}")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue
        method, rid, params = req.get("method"), req.get("id"), req.get("params") or {}
        is_notification = "id" not in req
        try:
            if method == "initialize":
                proto = (params.get("protocolVersion") or DEFAULT_PROTOCOL)
                _result(rid, {"protocolVersion": proto,
                              "capabilities": {"tools": {}},
                              "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION,
                                             "instructions": f"OKF knowledge bundle '{bundle_name}'. Enumerate with okf_list, then okf_get by id. No semantic search — rank relevance yourself over names/tags/links."}})
            elif method in ("notifications/initialized", "initialized"):
                pass  # notification, no response
            elif method == "ping":
                _result(rid, {})
            elif method == "tools/list":
                _result(rid, {"tools": TOOLS})
            elif method == "tools/call":
                name = params.get("name")
                args = params.get("arguments") or {}
                fn = DISPATCH.get(name)
                if fn is None:
                    _result(rid, {"content": [{"type": "text", "text": f"unknown tool: {name}"}], "isError": True})
                else:
                    try:
                        out = fn(idx, **args)
                        _result(rid, {"content": [{"type": "text", "text": json.dumps(out, indent=2, ensure_ascii=False)}], "isError": False})
                    except Exception as e:  # tool-level error -> isError content (not a protocol error)
                        _result(rid, {"content": [{"type": "text", "text": f"{type(e).__name__}: {e}"}], "isError": True})
            elif is_notification:
                pass  # ignore unknown notifications
            else:
                _error(rid, -32601, f"method not found: {method}")
        except Exception as e:  # noqa: BLE001 — never let one bad message kill the loop
            log("handler error:", repr(e))
            if not is_notification:
                _error(rid, -32603, f"internal error: {e}")
    log("stdin closed; exiting")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bundle", default=str(REPO_ROOT / "okf" / "agentic-workflow-optimization"))
    ap.add_argument("--allow-unsafe", action="store_true", help="serve a bundle not on the K3 allowlist (NEVER for a builder/search agent)")
    args = ap.parse_args()
    bundle = Path(args.bundle)
    if not bundle.is_dir():
        log(f"FATAL: bundle not found: {bundle}")
        return 2
    if bundle.name not in ALLOW and not args.allow_unsafe:
        log(f"FATAL (K3 guard): '{bundle.name}' is not on the leak-safe allowlist {sorted(ALLOW)}.")
        log("Oracle-adjacent bundles must not be served to builder/search agents. Use --allow-unsafe only for a non-builder context.")
        return 2
    idx = load_bundle(bundle)
    serve(idx, bundle.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
