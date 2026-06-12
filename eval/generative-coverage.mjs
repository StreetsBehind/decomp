// GENERATIVE coverage — the bounded-judgment half of the thin-input split.
//
// CHARTER §8 (the load-bearing distinction): STRUCTURAL completeness is mechanically
// checkable (graph invariants over what EXISTS). GENERATIVE completeness — "did the method
// enumerate the right things AT ALL?" — cannot be flagged by any invariant over what exists,
// because no invariant can point at a node nobody created. It can only be MEASURED, by reading
// the produced artifact and asking, per LATENT requirement / per required edge, "is this
// covered (semantically), and where?"
//
// The thin plan STATES only themes + outcomes. The LATENT requirements/edges (provider config,
// callback route, session store, token refresh, CSRF, error states, ...) are NOT in the plan the
// method saw, so a method cannot tag a bead with their planKey and build-completeness's
// planKey matching cannot find them. Only judgment can decide whether the decomposition reached
// them. That judgment is irreducibly non-deterministic — so it lives behind an INJECTED judge:
//
//   - In PRODUCTION the runner injects a claude-backed judge (one bounded `claude -p` call per
//     item, or batched): it reads the snapshotDigest + the target and returns a verdict + evidence.
//   - In TESTS a deterministic STUB judge is injected, so this orchestration is itself testable
//     with zero spend and zero variance.
//
// THIS MODULE NEVER CALLS A MODEL. The orchestration here is PURE: it builds a compact digest,
// asks the injected judge about each latent item, and aggregates. All non-determinism is the
// judge's, by construction.

import { buildIndex, nonEpicBeads } from './graph/build-graph.mjs';

/**
 * Build a compact, model-friendly digest of the snapshot for a judge to read.
 * Deterministic (stable order = snapshot order). Includes only what a coverage judgment needs:
 * bead titles, acceptance criteria, files touched, and the dependency edge list.
 *
 * @param {object} snapshot
 * @returns {{ beads:Array<{id,title,acceptanceCriteria:string[],files:string[]}>, edges:Array<{from,to}> }}
 */
export function buildSnapshotDigest(snapshot) {
  const index = buildIndex(snapshot);
  const beads = nonEpicBeads(index).map((b) => ({
    id: b.id,
    title: b.title || '',
    acceptanceCriteria: (b.metadata && b.metadata.acceptanceCriteria) || [],
    files: (b.metadata && b.metadata.filesTouched) || [],
  }));
  const edges = (snapshot.edges || []).map((e) => ({ from: e.from, to: e.to }));
  return { beads, edges };
}

// Aggregate one population over a chosen boolean field ('sufficiency' or 'presence'):
// an item is missing when that field is false; score is the covered fraction.
function aggregate(items, total, field) {
  const missing = items.filter((i) => !i[field]).map((i) => i.miss);
  const score = total ? (total - missing.length) / total : 1;
  return { score, missing };
}

// Pooled fraction over both populations for one boolean field (matches "every latent item
// must be reached" — proportional weighting, not an average of averages).
function pooledOverall(reqResults, edgeResults, field) {
  const totalItems = reqResults.length + edgeResults.length;
  const totalMissing =
    reqResults.filter((i) => !i[field]).length + edgeResults.filter((i) => !i[field]).length;
  return totalItems ? (totalItems - totalMissing) / totalItems : 1;
}

// Per-bucket SUFFICIENCY edge recall, keyed on an arbitrary edge field, computed ONLY when at least
// one requiredEdge carries that field. Two uses:
//   - field='partition' (intra-feature vs seam): the library-covered-vs-seam split the anchoring
//     metric reads — a primed arm is safe iff it raises library-covered recall AND does not lower
//     SEAM recall.
//   - field='quadrant' (lethal/loud-exp/cheap/silent-cheap): the cost-of-omission 2x2 split
//     (BUILD-TOLERANT-REFRAME.md). lethal-quadrant recall is the veto endpoint (RECONCILIATION §3 B).
// Returns undefined (no such field) so untagged fixtures are byte-for-byte unchanged.
// edgeResults[i] aligns with requiredEdges[i] (mapPool preserves order).
function edgeCoverageByField(requiredEdges, edgeResults, field) {
  if (!requiredEdges.some((e) => e && e[field])) return undefined;
  const buckets = {};
  for (let i = 0; i < requiredEdges.length; i++) {
    const p = requiredEdges[i] && requiredEdges[i][field];
    if (!p) continue;
    const b = (buckets[p] ||= { total: 0, missing: [] });
    b.total++;
    if (!edgeResults[i].sufficiency) b.missing.push(edgeResults[i].miss);
  }
  const out = {};
  for (const [p, b] of Object.entries(buckets)) {
    out[p] = { score: b.total ? (b.total - b.missing.length) / b.total : 1, total: b.total, missing: b.missing };
  }
  return out;
}

// Default cost-of-omission weights per quadrant — the value of discovering an edge UPFRONT.
// Operationalizes value(edge) ∝ P(missed) × cost(discover late) × cost(recover late): the build
// drives both late-costs → 0 for the cheap quadrant (weight ≈ 0 — let the build find it), so the
// metric concentrates on the expensive-recovery column and emphasizes the silent (lethal) row.
const DEFAULT_QUADRANT_WEIGHTS = { lethal: 1.0, 'loud-exp': 0.5, cheap: 0.0, 'silent-cheap': 0.1 };

// Cost-weighted edge recall: Σ(w_q · covered_q) / Σ(w_q · total_q). The uniform edge recall is the
// special case w≡1. If cost-weighting RE-ORDERS methods vs uniform recall, uniform recall was
// measuring the wrong thing (BUILD-TOLERANT-REFRAME.md kill-test #1). Undefined on an untagged
// manifest. Also returns the pure lethal-quadrant recall (the veto scalar).
function costWeightedEdgeRecall(requiredEdges, edgeResults, weights = DEFAULT_QUADRANT_WEIGHTS) {
  if (!requiredEdges.some((e) => e && e.quadrant)) return undefined;
  let num = 0;
  let den = 0;
  let lethalHit = 0;
  let lethalTot = 0;
  for (let i = 0; i < requiredEdges.length; i++) {
    const q = requiredEdges[i] && requiredEdges[i].quadrant;
    if (!q) continue;
    const w = weights[q] ?? 0;
    const hit = edgeResults[i].sufficiency ? 1 : 0;
    num += w * hit;
    den += w;
    if (q === 'lethal') {
      lethalTot++;
      lethalHit += hit;
    }
  }
  return {
    costWeighted: den ? num / den : 1,
    lethalRecall: lethalTot ? lethalHit / lethalTot : 1,
    weights,
  };
}

// Bounded-concurrency map preserving input order (results[i] aligns with items[i]), so the
// aggregation + missing[] order stay deterministic regardless of completion order. Pure control
// flow — the only I/O is the injected judge. A worker pool keeps at most `limit` judge calls in
// flight (the live judge is one CLI process per call; serial would be hours, this caps the fan-out).
async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const lanes = Math.max(1, Math.min(limit | 0 || 1, items.length));
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

// Normalize a judge verdict to the two-part contract { presence, sufficiency }.
// Two-part judges return { presence, sufficiency, ... }. Legacy judges return only { covered }:
// treat covered as sufficiency, and presence := covered (so an old stub can't break this).
// sufficiency MUST be false whenever presence is false.
function normalizeVerdict(v) {
  const has2 = typeof v.presence === 'boolean' || typeof v.sufficiency === 'boolean';
  let presence;
  let sufficiency;
  if (has2) {
    sufficiency = !!v.sufficiency;
    presence = !!v.presence;
  } else {
    sufficiency = !!v.covered;
    presence = !!v.covered;
  }
  if (!presence) sufficiency = false; // enforce the contract invariant
  return { presence, sufficiency };
}

/**
 * Bounded-judgment coverage of the LATENT requirements + required edges.
 *
 * @param {object} snapshot  conforms to schemas/snapshot.schema.json
 * @param {object} manifest  conforms to schemas/outcome-manifest.schema.json — its requirements
 *                           and requiredEdges are the LATENT set the thin plan never enumerated.
 * The injected judge now returns the TWO-PART verdict
 *   { presence:boolean, sufficiency:boolean, beadRef?:string, evidence:string }
 *   - presence    = a packet/edge of the RIGHT SCOPE exists, regardless of how complete it is.
 *   - sufficiency = that packet/edge is specified well enough that BUILDING it would actually
 *                   deliver the requirement / realize the dependency (false whenever presence is).
 * Legacy judges that return only { covered } are accepted: covered is read as BOTH presence
 * and sufficiency (back-compat — old stubs don't break).
 *
 * The TOP-LEVEL requirementCoverage/edgeCoverage/overall are the SUFFICIENCY fractions (their
 * meaning is UNCHANGED — eval/build-completeness.mjs's thin fold + the runner's mapping read
 * these as sufficiency). A NEW presence:{...} sub-tree carries the softer "scope exists" view.
 *
 * @param {(q:{kind:'requirement'|'edge', target:object, snapshotDigest:object})
 *           => Promise<{presence:boolean, sufficiency:boolean, covered?:boolean, beadRef?:string, evidence:string}>} judge
 *           INJECTED async judge. THE ONLY source of non-determinism. Never a model call here.
 * @returns {Promise<{
 *   requirementCoverage:{score:number, missing:Array<{ref,what,evidence}>},  // SUFFICIENCY
 *   edgeCoverage:{score:number, missing:Array<{ref,what,evidence}>},         // SUFFICIENCY
 *   overall:number,                                                          // SUFFICIENCY
 *   presence:{
 *     requirementCoverage:{score:number, missing:Array<{ref,what,evidence}>},
 *     edgeCoverage:{score:number, missing:Array<{ref,what,evidence}>},
 *     overall:number
 *   }
 * }>}
 */
export async function scoreGenerativeCoverage(snapshot, manifest, judge, opts = {}) {
  const snapshotDigest = buildSnapshotDigest(snapshot);
  const concurrency = opts.concurrency || 6; // bounded judge fan-out (1 CLI process per call when live)

  // ---- latent requirements (judged with bounded concurrency, order preserved) ----
  const requirements = manifest.requirements || [];
  const reqResults = await mapPool(requirements, concurrency, async (r) => {
    const v = normalizeVerdict(await judge({ kind: 'requirement', target: r, snapshotDigest }));
    return {
      presence: v.presence,
      sufficiency: v.sufficiency,
      miss: {
        ref: r.id,
        what: `latent requirement '${r.planKey || r.id}' not covered by the decomposition`,
        evidence: v.evidence || r.description || '',
      },
    };
  });

  // ---- required edges ----
  const requiredEdges = manifest.requiredEdges || [];
  const edgeResults = await mapPool(requiredEdges, concurrency, async (e) => {
    const v = normalizeVerdict(await judge({ kind: 'edge', target: e, snapshotDigest }));
    return {
      presence: v.presence,
      sufficiency: v.sufficiency,
      miss: {
        ref: `${e.fromPlanKey} -> ${e.toPlanKey}`,
        what: 'required dependency not realized between the decomposition\'s beads',
        evidence: v.evidence || e.why || '',
      },
    };
  });

  // SUFFICIENCY trees (top-level — unchanged meaning). An item is missing when sufficiency===false.
  const requirementCoverage = aggregate(reqResults, requirements.length, 'sufficiency');
  const edgeCoverage = aggregate(edgeResults, requiredEdges.length, 'sufficiency');
  const overall = pooledOverall(reqResults, edgeResults, 'sufficiency');

  // PRESENCE tree (NEW — the softer "scope exists" view). Item missing when presence===false.
  const presence = {
    requirementCoverage: aggregate(reqResults, requirements.length, 'presence'),
    edgeCoverage: aggregate(edgeResults, requiredEdges.length, 'presence'),
    overall: pooledOverall(reqResults, edgeResults, 'presence'),
  };

  // Per-partition edge recall (library-covered vs seam) — present only on a partitioned manifest.
  const byPartition = edgeCoverageByField(requiredEdges, edgeResults, 'partition');
  // Per-quadrant edge recall + cost-weighted recall — present only on a 2x2-tagged manifest.
  const byQuadrant = edgeCoverageByField(requiredEdges, edgeResults, 'quadrant');
  const costWeighted = costWeightedEdgeRecall(requiredEdges, edgeResults, opts.quadrantWeights);

  return {
    requirementCoverage,
    edgeCoverage,
    overall,
    presence,
    ...(byPartition ? { edgeCoverageByPartition: byPartition } : {}),
    ...(byQuadrant ? { edgeCoverageByQuadrant: byQuadrant } : {}),
    ...(costWeighted ? { costWeightedEdgeRecall: costWeighted } : {}),
  };
}

export default scoreGenerativeCoverage;
