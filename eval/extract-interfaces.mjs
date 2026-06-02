// The LIVE produces/consumes annotation pass — the Step-2 derivation (SURFACE-DISCOVERY-SPEC §1, §7).
//
// The reframe: instead of asking a model for the dependency RELATION directly (a global O(n²) task it
// fails — edge recall 0.27–0.57), ask each packet a LOCAL question with strong priors: "what does THIS
// packet read and write?" Collect a typed interface per packet (produces/consumes over the lattice),
// then let the deterministic JOIN (eval/join.mjs) compute the edges. n local extractions it passes +
// one pure join, in place of one global task it fails.
//
// This module is PURE orchestration; the only non-determinism is the INJECTED annotator (live =
// claude-backed runner/annotator.mjs; test = a deterministic stub), exactly like the generative-
// coverage judge. It holds the NODE SET CONSTANT (one node per non-epic bead, keyed by planKey) — so
// in a Step-2 A/B any edge delta is attributable to the derivation mechanism, not to enumerating
// different packets.

import { parseResource, LATTICE } from './lattice.mjs';
import { buildIndex, nonEpicBeads } from './graph/build-graph.mjs';

// Vocabulary-alignment normalizers (§1.1): the join is EXACT, so "Store:session" only wires to
// "Store:session". A normalizer canonicalizes resource NAMES before the join so trivial wording
// differences ("Session Store" vs "session-store") still match. It is a pluggable representation
// hypothesis you can re-grade cached annotations under for free (the spec's instant/free tier).
export const slugName = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const exactName = (s) => String(s).trim();

// Canonicalize one "Kind:name" id: validate the kind against the lattice, normalize the name. Throws
// on a bad id (unknown kind / no colon) so the caller can DROP a malformed model emission.
function canonicalizeResource(id, normalize) {
  const { kind, name } = parseResource(id);
  return `${kind}:${normalize(name)}`;
}

// Coerce an annotator's { produces, consumes } into clean, canonical, deduped lattice ids. A bad id
// is dropped (the model emitted an off-lattice kind or garbage), never throws.
function cleanResources(arr, normalize) {
  const out = new Set();
  if (!Array.isArray(arr)) return [];
  for (const r of arr) {
    if (typeof r !== 'string' || !r.trim()) continue;
    try { out.add(canonicalizeResource(r, normalize)); } catch { /* drop malformed resource id */ }
  }
  return [...out].sort();
}

// Compact LOCAL context for the annotator — title + acceptance criteria + files. Deliberately does
// NOT include other beads (the point is a LOCAL question), only this packet.
function digestBead(b) {
  const md = b.metadata || {};
  return {
    id: b.id,
    title: b.title || '',
    acceptanceCriteria: Array.isArray(md.acceptanceCriteria) ? md.acceptanceCriteria : [],
    files: Array.isArray(md.filesTouched) ? md.filesTouched : [],
  };
}

// Bounded-concurrency map preserving input order (results[i] aligns with items[i]) — same shape as
// generative-coverage's pool: the live annotator is one CLI process per call, so cap the fan-out.
async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const lanes = Math.max(1, Math.min(limit | 0 || 1, items.length || 1));
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: lanes }, () => worker()));
  return results;
}

// Multiple beads can serve one planKey; union their interfaces into a single node so the join sees
// one producer/consumer per plan entry (matches how manifest edges are keyed by planKey).
function mergeByPlanKey(nodes) {
  const byKey = new Map();
  for (const n of nodes) {
    if (!byKey.has(n.planKey)) byKey.set(n.planKey, { planKey: n.planKey, beadIds: [], produces: new Set(), consumes: new Set() });
    const m = byKey.get(n.planKey);
    m.beadIds.push(n.beadId);
    for (const p of n.produces) m.produces.add(p);
    for (const c of n.consumes) m.consumes.add(c);
  }
  return [...byKey.values()].map((m) => ({
    planKey: m.planKey,
    beadIds: m.beadIds,
    produces: [...m.produces].sort(),
    consumes: [...m.consumes].sort(),
  }));
}

/**
 * Annotate every non-epic bead with a typed produces/consumes interface and return nodes ready for
 * joinEdges(). The NODE SET equals the snapshot's non-epic beads (constant).
 *
 * @param {object} snapshot   conforms to schemas/snapshot.schema.json
 * @param {(q:{bead:{id,title,acceptanceCriteria,files}, lattice:string[]}) => Promise<{produces?:string[], consumes?:string[]}>} annotate
 *        INJECTED async annotator — THE ONLY source of non-determinism. Never a model call here.
 * @param {{ concurrency?: number, normalize?: (s:string)=>string }} [opts]
 * @returns {Promise<Array<{planKey:string, beadIds:string[], produces:string[], consumes:string[]}>>}
 */
export async function extractInterfaces(snapshot, annotate, opts = {}) {
  const index = buildIndex(snapshot);
  const beads = nonEpicBeads(index);
  const concurrency = opts.concurrency || 6;
  const normalize = typeof opts.normalize === 'function' ? opts.normalize : slugName;

  const raw = await mapPool(beads, concurrency, async (b) => {
    const planKey = (b.metadata && b.metadata.provenance && b.metadata.provenance.planKey) || b.id;
    const ann = (await annotate({ bead: digestBead(b), lattice: LATTICE })) || {};
    return {
      planKey,
      beadId: b.id,
      produces: cleanResources(ann.produces, normalize),
      consumes: cleanResources(ann.consumes, normalize),
    };
  });

  return mergeByPlanKey(raw);
}

export default extractInterfaces;
