// The GRANULARITY KNOB (RESEARCH-PROGRAM §2.2 / §4.2): five operational levels L0–L4, each
// with (a) a prompt clause asking a generative method to decompose TO that level, and (b) a
// deterministic POST-PASS that ENFORCES the level's bounds by mechanically merging/splitting
// out-of-band beads — so the dose is enforced, not requested (assumption A5: knobs are leaky).
//
// The SAME transform doubles as the DERIVED-G merger (E2): apply it to a natively-L4 snapshot
// to derive every coarser rung with the generative content held constant — the control that
// separates "how it's sliced" from "what got generated".
//
// PURE: no model, no clock, no I/O. All grouping/ordering is canonical (topological order,
// lexicographic tie-break) so the transform is deterministic and idempotent-per-level.
//
// Merge/split semantics (content-preserving, best-effort on bounds):
//   split  — a bead with more ACs than the level allows becomes ceil(n/max) parts: ACs chunked
//            in order; files/tests copied (mechanical attribution is impossible); every part
//            inherits the original's edges; parts are CHAINED (part i+1 depends on part i) to
//            preserve internal ordering. Ids `<id>--pN` (stable).
//   merge  — beads are grouped by PRIMARY stated outcome (lexicographically first outcomeId),
//            ordered topologically within the group, then combined: ACs/tests concatenated,
//            files/outcomeIds/concerns unioned, planKey kept only when every member agrees;
//            member edges remapped to the merged bead (self-loops dropped, deduped). Ids
//            `merged--<first member id>` (stable: first member is deterministic).
//   Epics pass through untouched; `ready` is recomputed (non-epic beads with no outgoing edge).
//   Bounds are TARGETS: a tail group can sit under the AC minimum when the arithmetic forces
//   it — the MEASURED dose (eval/granularity.mjs) is what analyses regress on, by design.

/**
 * The five levels. acMax drives splitting; acMin drives within-outcome merging; beadsPerOutcome
 * drives outcome-group merging (L0/L1, where bead size is defined by scope, not AC count).
 */
export const GRANULARITY_LEVELS = Object.freeze({
  L0: Object.freeze({
    id: 'L0',
    label: 'outcome',
    beadsPerOutcome: 1,
    acMin: null,
    acMax: null,
    clause:
      'GRANULARITY (L0 — outcome-level): produce exactly ONE build packet per stated outcome. ' +
      'Each packet carries that outcome’s ENTIRE scope of work; list as many acceptance ' +
      'criteria as the scope needs (the 1..6 guideline does not apply at this level).',
  }),
  L1: Object.freeze({
    id: 'L1',
    label: 'epic',
    beadsPerOutcome: 3, // target midpoint of the 2–4 band
    acMin: null,
    acMax: null,
    clause:
      'GRANULARITY (L1 — epic-level): produce 2 to 4 feature-slice packets per stated outcome. ' +
      'Each packet is a coherent slice of that outcome; list as many acceptance criteria as the ' +
      'slice needs (the 1..6 guideline does not apply at this level).',
  }),
  L2: Object.freeze({
    id: 'L2',
    label: 'task',
    beadsPerOutcome: null,
    acMin: 3,
    acMax: 6,
    clause:
      'GRANULARITY (L2 — task-level): each packet is a PR-sized change carrying 3 to 6 ' +
      'acceptance criteria.',
  }),
  L3: Object.freeze({
    id: 'L3',
    label: 'atomic',
    beadsPerOutcome: null,
    acMin: 1,
    acMax: 3,
    clause:
      'GRANULARITY (L3 — atomic): each packet is the smallest independently buildable AND ' +
      'testable unit, carrying 1 to 3 acceptance criteria and a single concern.',
  }),
  L4: Object.freeze({
    id: 'L4',
    label: 'micro',
    beadsPerOutcome: null,
    acMin: 1,
    acMax: 1,
    clause:
      'GRANULARITY (L4 — micro): each packet is a single-file or single-function edit carrying ' +
      'EXACTLY ONE acceptance criterion. Emit as many packets as that requires.',
  }),
});

export const GRANULARITY_LEVEL_IDS = Object.freeze(Object.keys(GRANULARITY_LEVELS));

/** The prompt clause for a level (appended to the snapshot contract). Throws on unknown level. */
export function granularityClause(level) {
  const spec = GRANULARITY_LEVELS[level];
  if (!spec) throw new Error(`granularityClause: unknown level '${level}' (have: ${GRANULARITY_LEVEL_IDS.join(', ')})`);
  return spec.clause;
}

// ---- canonical ordering ------------------------------------------------------

/** Kahn topological order over a bead subset (deps first), lexicographic tie-break. */
function topoOrder(beads, edges) {
  const ids = new Set(beads.map((b) => b.id));
  const depsOf = new Map(); // id -> Set of in-subset ids it depends on
  const dependents = new Map(); // id -> ids that depend on it
  for (const b of beads) { depsOf.set(b.id, new Set()); dependents.set(b.id, new Set()); }
  for (const e of edges) {
    if (ids.has(e.from) && ids.has(e.to)) {
      depsOf.get(e.from).add(e.to);
      dependents.get(e.to).add(e.from);
    }
  }
  const remaining = new Map([...depsOf].map(([id, s]) => [id, s.size]));
  const frontier = beads.filter((b) => remaining.get(b.id) === 0).map((b) => b.id).sort();
  const out = [];
  const inOut = new Set();
  while (frontier.length) {
    const id = frontier.shift();
    out.push(id);
    inOut.add(id);
    const next = [];
    for (const dep of dependents.get(id)) {
      remaining.set(dep, remaining.get(dep) - 1);
      if (remaining.get(dep) === 0) next.push(dep);
    }
    if (next.length) {
      frontier.push(...next.sort());
      frontier.sort();
    }
  }
  // cycles: append leftovers lexicographically so the order is still total + deterministic.
  for (const b of beads) if (!inOut.has(b.id)) out.push(b.id);
  return out;
}

/** Primary stated outcome for grouping: lexicographically first outcomeId (or '_none'). */
function primaryOutcome(bead) {
  const oids = bead.metadata?.provenance?.outcomeIds || [];
  return oids.length ? [...oids].sort()[0] : '_none';
}

// ---- merge / split primitives -------------------------------------------------

function unionInOrder(lists) {
  const seen = new Set();
  const out = [];
  for (const xs of lists) for (const x of xs || []) if (!seen.has(x)) { seen.add(x); out.push(x); }
  return out;
}

/** Combine an ordered member list into one merged bead. */
function mergeBeads(members) {
  const first = members[0];
  const planKeys = new Set(members.map((b) => b.metadata?.provenance?.planKey).filter(Boolean));
  const samePlanKey = planKeys.size === 1 && members.every((b) => b.metadata?.provenance?.planKey);
  const concerns = members.some((b) => Array.isArray(b.metadata?.concerns))
    ? unionInOrder(members.map((b) => b.metadata?.concerns || []))
    : null;
  return {
    id: `merged--${first.id}`,
    type: first.type,
    title: members.length > 1 ? `${first.title} (+${members.length - 1} merged)` : first.title,
    status: 'open',
    parent: first.parent ?? null,
    metadata: {
      provenance: {
        ...(samePlanKey ? { planKey: first.metadata.provenance.planKey } : {}),
        outcomeIds: unionInOrder(members.map((b) => b.metadata?.provenance?.outcomeIds || [])).sort(),
      },
      acceptanceCriteria: members.flatMap((b) => b.metadata?.acceptanceCriteria || []),
      filesTouched: unionInOrder(members.map((b) => b.metadata?.filesTouched || [])),
      testPlanCases: members.flatMap((b) => b.metadata?.testPlanCases || []),
      ...(concerns ? { concerns } : {}),
    },
  };
}

/** Split one bead's ACs into ceil(n/max) near-even parts. Returns [parts, chainEdges]. */
function splitBead(bead, acMax) {
  const acs = bead.metadata?.acceptanceCriteria || [];
  if (acs.length <= acMax) return [[bead], []];
  const k = Math.ceil(acs.length / acMax);
  const base = Math.floor(acs.length / k);
  const extra = acs.length % k;
  const parts = [];
  const chain = [];
  let at = 0;
  for (let i = 0; i < k; i++) {
    const size = base + (i < extra ? 1 : 0);
    const id = `${bead.id}--p${i + 1}`;
    parts.push({
      ...bead,
      id,
      title: `${bead.title} (part ${i + 1}/${k})`,
      metadata: {
        ...bead.metadata,
        provenance: { ...(bead.metadata?.provenance || {}) },
        acceptanceCriteria: acs.slice(at, at + size),
        filesTouched: [...(bead.metadata?.filesTouched || [])],
        testPlanCases: [...(bead.metadata?.testPlanCases || [])],
      },
    });
    if (i > 0) chain.push({ from: id, to: `${bead.id}--p${i}`, kind: 'blocks' });
    at += size;
  }
  return [parts, chain];
}

/** Remap edges through oldId->newId, drop self-loops, dedupe. */
function remapEdges(edges, idMap) {
  const out = [];
  const seen = new Set();
  for (const e of edges) {
    const from = idMap.get(e.from) ?? e.from;
    const to = idMap.get(e.to) ?? e.to;
    if (from === to) continue;
    const k = `${from}->${to}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ from, to, kind: e.kind ?? 'blocks' });
  }
  return out;
}

function recomputeReady(beads, edges) {
  const hasOutgoing = new Set(edges.map((e) => e.from));
  return beads.filter((b) => b.type !== 'epic' && !hasOutgoing.has(b.id)).map((b) => b.id);
}

/** Partition an ordered list into k near-even contiguous chunks. */
function chunkEven(xs, k) {
  const out = [];
  const base = Math.floor(xs.length / k);
  const extra = xs.length % k;
  let at = 0;
  for (let i = 0; i < k; i++) {
    const size = base + (i < extra ? 1 : 0);
    out.push(xs.slice(at, at + size));
    at += size;
  }
  return out.filter((c) => c.length);
}

// ---- the post-pass --------------------------------------------------------------

/**
 * Enforce a granularity level on a snapshot via deterministic merge/split. Content-preserving:
 * the multiset of acceptance criteria is unchanged (only their packaging moves).
 *
 * @param {{beads:object[], edges:object[], ready?:string[]}} snapshot
 * @param {string} level  one of GRANULARITY_LEVEL_IDS
 * @returns {{beads:object[], edges:object[], ready:string[]}}
 */
export function applyGranularity(snapshot, level) {
  const spec = GRANULARITY_LEVELS[level];
  if (!spec) throw new Error(`applyGranularity: unknown level '${level}' (have: ${GRANULARITY_LEVEL_IDS.join(', ')})`);

  const epics = (snapshot.beads || []).filter((b) => b.type === 'epic');
  let beads = (snapshot.beads || []).filter((b) => b.type !== 'epic');
  let edges = (snapshot.edges || []).slice();
  if (!beads.length) return { beads: [...epics], edges: [], ready: [] };

  // SPLIT first (when the level bounds ACs): afterwards every bead is <= acMax, so merging
  // never has to re-split. Chain edges keep each split's internal order.
  if (spec.acMax !== null) {
    const newBeads = [];
    const chainEdges = [];
    const cloneMap = new Map(); // oldId -> partIds (for edge fan-out)
    for (const b of beads) {
      const [parts, chain] = splitBead(b, spec.acMax);
      newBeads.push(...parts);
      chainEdges.push(...chain);
      if (parts.length > 1) cloneMap.set(b.id, parts.map((p) => p.id));
    }
    // fan original edges out to every part (a part inherits all the whole's dependencies).
    const fanned = [];
    const seen = new Set();
    for (const e of edges) {
      const froms = cloneMap.get(e.from) ?? [e.from];
      const tos = cloneMap.get(e.to) ?? [e.to];
      for (const f of froms) for (const t of tos) {
        if (f === t) continue;
        const k = `${f}->${t}`;
        if (seen.has(k)) continue;
        seen.add(k);
        fanned.push({ from: f, to: t, kind: e.kind ?? 'blocks' });
      }
    }
    for (const e of chainEdges) {
      const k = `${e.from}->${e.to}`;
      if (!seen.has(k)) { seen.add(k); fanned.push(e); }
    }
    beads = newBeads;
    edges = fanned;
  }

  // MERGE second: outcome-scope merging (L0/L1) or AC-minimum merging (L2+).
  if (spec.beadsPerOutcome !== null || spec.acMin !== null) {
    // group by primary outcome, canonical order within each group.
    const groups = new Map();
    for (const b of beads) {
      const key = primaryOutcome(b);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(b);
    }
    const byId = new Map(beads.map((b) => [b.id, b]));
    const idMap = new Map(); // memberId -> mergedId
    const merged = [];

    for (const key of [...groups.keys()].sort()) {
      const group = groups.get(key);
      const order = topoOrder(group, edges);
      const ordered = order.map((id) => byId.get(id));

      let clusters;
      if (spec.beadsPerOutcome !== null) {
        // L0/L1: chunk the group into the target packet count (never more than the group has).
        const n = ordered.length;
        const k = spec.beadsPerOutcome === 1 ? 1 : Math.min(Math.max(2, Math.min(4, Math.ceil(n / spec.beadsPerOutcome))), n);
        clusters = chunkEven(ordered, Math.min(k, n));
      } else {
        // L2+: greedy AC bin-packing — accumulate until >= acMin without crossing acMax.
        clusters = [];
        let cur = [];
        let acSum = 0;
        for (const b of ordered) {
          const n = (b.metadata?.acceptanceCriteria || []).length;
          if (cur.length && acSum >= spec.acMin) { clusters.push(cur); cur = []; acSum = 0; }
          if (cur.length && acSum + n > spec.acMax) { clusters.push(cur); cur = []; acSum = 0; }
          cur.push(b);
          acSum += n;
        }
        if (cur.length) {
          // under-min tail: fold into the previous cluster when that stays within acMax.
          const tailAcs = cur.reduce((a, b) => a + (b.metadata?.acceptanceCriteria || []).length, 0);
          const prev = clusters[clusters.length - 1];
          const prevAcs = prev ? prev.reduce((a, b) => a + (b.metadata?.acceptanceCriteria || []).length, 0) : null;
          if (prev && tailAcs < spec.acMin && prevAcs + tailAcs <= spec.acMax) prev.push(...cur);
          else clusters.push(cur);
        }
      }

      for (const cluster of clusters) {
        if (cluster.length === 1) { merged.push(cluster[0]); continue; }
        const mb = mergeBeads(cluster);
        for (const m of cluster) idMap.set(m.id, mb.id);
        merged.push(mb);
      }
    }

    beads = merged;
    edges = remapEdges(edges, idMap);
  } else {
    edges = remapEdges(edges, new Map());
  }

  const all = [...epics, ...beads];
  return { beads: all, edges, ready: recomputeReady(all, edges) };
}

export default { GRANULARITY_LEVELS, GRANULARITY_LEVEL_IDS, granularityClause, applyGranularity };
