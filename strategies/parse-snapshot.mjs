// Defensive parser: turn a model's reply (assistant text) into a normalized snapshot.
//
// The invoke layer (runner/model-client.mjs) already strips ONE wrapping markdown fence,
// but a real model can still wrap JSON in prose, emit a fenced block mid-text, or add a
// trailing apology. This helper is the belt-and-suspenders: it finds the first balanced
// top-level JSON object in the text and parses THAT, then coerces it into the snapshot
// shape the scorers read (beads[]/edges[]/ready[]).
//
// PURE: no clock, no randomness, no model. Used by every generative strategy so they all
// tolerate the same real-world sloppiness identically (no drift).

/**
 * Find the first balanced {...} object substring in `text` and JSON.parse it.
 * Tolerates leading/trailing prose and an inner ```json fence. Returns null on failure.
 * @param {string} text
 * @returns {object|null}
 */
export function extractJsonObject(text) {
  if (typeof text !== 'string') return null;
  let s = text.trim();

  // Strip any residual code fences anywhere (the invoke layer only strips a single wrap).
  // Replace fence markers with whitespace so offsets of the JSON body are preserved-ish.
  s = s.replace(/```(?:json|JSON)?/g, ' ').replace(/```/g, ' ');

  // Fast path: the whole thing parses.
  try {
    const whole = JSON.parse(s);
    if (whole && typeof whole === 'object' && !Array.isArray(whole)) return whole;
  } catch { /* fall through to scanning */ }

  // Scan for the first balanced object, respecting strings + escapes.
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const candidate = s.slice(start, i + 1);
        try {
          const obj = JSON.parse(candidate);
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
        } catch { /* keep scanning for a later balanced object */ }
      }
    }
  }
  return null;
}

const STR_ARR = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

/**
 * Coerce a loosely-shaped object into a snapshot-schema bead.
 * Guards every field so a missing optional never throws. Drops beads without a usable id.
 * @param {any} raw
 * @returns {object|null}
 */
export function coerceBead(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : null;
  if (!id) return null;
  const type = ['epic', 'feature', 'task', 'bug'].includes(raw.type) ? raw.type : 'task';

  const md = raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {};
  const prov = md.provenance && typeof md.provenance === 'object' ? md.provenance : {};
  const metadata = {
    provenance: {
      ...(typeof prov.planKey === 'string' ? { planKey: prov.planKey } : {}),
      outcomeIds: STR_ARR(prov.outcomeIds),
    },
    acceptanceCriteria: STR_ARR(md.acceptanceCriteria),
    filesTouched: STR_ARR(md.filesTouched),
    testPlanCases: STR_ARR(md.testPlanCases),
  };
  if (Array.isArray(md.concerns)) metadata.concerns = STR_ARR(md.concerns);

  return {
    id,
    type,
    title: typeof raw.title === 'string' ? raw.title : id,
    status: typeof raw.status === 'string' ? raw.status : 'open',
    parent: typeof raw.parent === 'string' ? raw.parent : null,
    metadata,
  };
}

/**
 * Coerce a parsed object into a normalized snapshot { beads, edges, ready }.
 * Edges are kept only when both endpoints are strings. ready defaults to the set of
 * non-epic beads with no outgoing dependency edge if the model omitted/garbled it.
 * @param {object|null} parsed
 * @returns {{ beads: object[], edges: object[], ready: string[] }}
 */
export function coerceSnapshot(parsed) {
  const beads = [];
  const seen = new Set();
  if (parsed && Array.isArray(parsed.beads)) {
    for (const b of parsed.beads) {
      const cb = coerceBead(b);
      if (cb && !seen.has(cb.id)) { beads.push(cb); seen.add(cb.id); }
    }
  }

  const ids = new Set(beads.map((b) => b.id));
  const edges = [];
  const edgeSeen = new Set();
  if (parsed && Array.isArray(parsed.edges)) {
    for (const e of parsed.edges) {
      if (!e || typeof e.from !== 'string' || typeof e.to !== 'string') continue;
      if (!ids.has(e.from) || !ids.has(e.to)) continue;
      const key = `${e.from}->${e.to}`;
      if (edgeSeen.has(key)) continue;
      edgeSeen.add(key);
      edges.push({ from: e.from, to: e.to, kind: typeof e.kind === 'string' ? e.kind : 'blocks' });
    }
  }

  let ready;
  if (parsed && Array.isArray(parsed.ready) && parsed.ready.every((x) => typeof x === 'string')) {
    ready = parsed.ready.filter((x) => ids.has(x));
  } else {
    const hasOutgoing = new Set(edges.map((e) => e.from));
    ready = beads.filter((b) => b.type !== 'epic' && !hasOutgoing.has(b.id)).map((b) => b.id);
  }

  return { beads, edges, ready };
}

/**
 * One-shot: assistant text -> normalized snapshot. Never throws; returns an empty snapshot
 * ({ beads:[], edges:[], ready:[] }) when nothing parseable is found.
 * @param {string} text
 * @returns {{ beads: object[], edges: object[], ready: string[] }}
 */
export function parseSnapshot(text) {
  return coerceSnapshot(extractJsonObject(text));
}
