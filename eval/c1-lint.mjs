// C1 — "no edge at intake" (CURATION-METHOD §1.1, §8 C1; SURFACE-DISCOVERY-SPEC invariant 6.1).
//
// The single most dangerous failure for an archetype library is storing an EDGE: a per-feature
// "from -> to" fact converts the correct epistemic state ("I might be missing wiring") into a false
// one ("here is the complete set ✓"). Edges must always be COMPUTED by the join over THIS plan; the
// library only ever supplies surfaces + obligations (typed holes) + state-probes.
//
// This lint enforces C1 STRUCTURALLY (at the FIELD/schema level — faithful to CURATION C1: "the
// obligation payload schema has no edge field") on an archetype entry BEFORE its block is injected
// into a primed decompose prompt — so a from->to stored as DATA is rejected at the boundary, not
// caught later in review. It is a pure function.
//
// SCOPE (deliberate, per the review caveat): a deterministic lint canNOT catch an edge smuggled in
// natural-language PROSE — "the callback must validate the token" names a directed dependency without
// any `A->B` field, and the spec's own legal obligations routinely use "->" to describe RESOLUTION
// LOGIC ("producer found -> edge-to-compute; none -> open-question", "no writer->reader edge"). A
// regex cannot tell that generic idiom from a concrete `planKey -> planKey` smuggle without false
// positives. So prose-level edge detection is explicitly the bounded-adversarial-JUDGE's job at
// curation time (CURATION §3.3 hardening: "name the consumer this query secretly assumes"). This
// lint is the structural boundary guard those judges sit behind.

// Any of these keys, anywhere in an entry, means a from->to relation is being stored AS DATA.
const EDGE_KEYS = new Set(['from', 'to', 'fromplankey', 'toplankey', 'edge', 'edges', 'dependson', 'depends_on', 'dependencies', 'blocks', 'blockedby']);
// An obligation resolves to one of exactly these — never "an edge exists".
const LEGAL_RESOLVES = new Set(['edge-to-compute', 'open-question']);

function scan(node, path, violations) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => scan(v, `${path}[${i}]`, violations));
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (EDGE_KEYS.has(k.toLowerCase())) {
      violations.push({ path: `${path}.${k}`, reason: `edge-shaped field "${k}" — the library never stores an edge (C1)` });
    }
    scan(v, `${path}.${k}`, violations);
  }
}

/**
 * Lint one archetype entry for C1 compliance.
 * @param {object} entry  an archetype entry { archetypeKey, intrinsicSurfaces, obligations, stateProbes, ... }
 * @returns {{ ok: boolean, archetypeKey: string, violations: Array<{path:string, reason:string}> }}
 */
export function lintArchetype(entry) {
  const violations = [];
  const key = (entry && entry.archetypeKey) || '(unknown)';
  if (!entry || typeof entry !== 'object') {
    return { ok: false, archetypeKey: key, violations: [{ path: '$', reason: 'entry is not an object' }] };
  }

  // 1) no edge-shaped field anywhere in the entry.
  scan(entry, '$', violations);

  // 2) per-obligation bar: resolvesTo must be one of the two legal resolutions — an obligation
  //    resolves to an edge-to-COMPUTE or an open-question, NEVER asserts that an edge EXISTS.
  const obligations = Array.isArray(entry.obligations) ? entry.obligations : [];
  obligations.forEach((o, i) => {
    if (o && o.resolvesTo !== undefined && !LEGAL_RESOLVES.has(String(o.resolvesTo))) {
      violations.push({ path: `$.obligations[${i}].resolvesTo`, reason: `resolvesTo="${o.resolvesTo}" is illegal — must be one of ${[...LEGAL_RESOLVES].join(' | ')} (an obligation NEVER asserts an edge exists)` });
    }
  });

  // dedupe identical (path,reason) pairs
  const seen = new Set();
  const deduped = violations.filter((v) => {
    const k = `${v.path}|${v.reason}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return { ok: deduped.length === 0, archetypeKey: key, violations: deduped };
}

/**
 * Lint a set of entries; throws with all violations if any fail. Used by the primed strategy to
 * ABORT a run rather than inject an edge-smuggling block.
 * @param {object[]} entries
 */
export function assertC1(entries) {
  const failures = [];
  for (const e of entries || []) {
    const r = lintArchetype(e);
    if (!r.ok) failures.push(r);
  }
  if (failures.length) {
    const lines = failures.flatMap((f) => f.violations.map((v) => `  [${f.archetypeKey}] ${v.path}: ${v.reason}`));
    throw new Error(`C1 lint FAILED — archetype block would smuggle an edge:\n${lines.join('\n')}`);
  }
}

export default { lintArchetype, assertC1 };
