// The deterministic JOIN over a typed produces/consumes interface, and its scorer.
// SURFACE-DISCOVERY-SPEC §1: stop asking a model to GENERATE the dependency edges
// (a global O(n²) task it fails at) — make edges a deterministic join over a LOCAL,
// typed per-packet interface:
//
//     edge  consumer -> producer   iff   consumer.consumes ∩ producer.produces ≠ ∅
//
// This is the Step-1 (join-ceiling) and Step-2 (extraction A/B) machinery. It is a PURE
// function over data, like every other scorer. It NEVER calls a model.
//
// Direction note (matches schemas/snapshot.schema.json and outcome-manifest.requiredEdges):
//   an edge `{ from, to }` means `from` DEPENDS ON / is blocked by `to`.
//   So `from` is the CONSUMER and `to` is the PRODUCER:  from.consumes ∩ to.produces ≠ ∅.

import { canonical } from './lattice.mjs';

const edgeKey = (from, to) => `${from} -> ${to}`;

/**
 * Compute the dependency edges implied by a set of typed nodes.
 * @param {Array<{planKey:string, produces?:string[], consumes?:string[]}>} nodes
 * @returns {Array<{fromPlanKey:string, toPlanKey:string, via:string[]}>}  from=consumer, to=producer
 */
export function joinEdges(nodes) {
  // resource -> set of producer planKeys
  const producersOf = new Map();
  for (const n of nodes) {
    for (const r of n.produces || []) {
      const c = canonical(r);
      if (!producersOf.has(c)) producersOf.set(c, new Set());
      producersOf.get(c).add(n.planKey);
    }
  }

  const via = new Map(); // edgeKey -> Set(resource) — dedup + accumulate the mediating resources
  const order = []; // preserve first-seen edge order for stable output
  for (const consumer of nodes) {
    for (const r of consumer.consumes || []) {
      const c = canonical(r);
      for (const producerPK of producersOf.get(c) || []) {
        if (producerPK === consumer.planKey) continue; // a node consuming what it produces is not a self-edge
        const k = edgeKey(consumer.planKey, producerPK);
        if (!via.has(k)) { via.set(k, new Set()); order.push({ fromPlanKey: consumer.planKey, toPlanKey: producerPK, _k: k }); }
        via.get(k).add(c);
      }
    }
  }

  return order.map((e) => ({ fromPlanKey: e.fromPlanKey, toPlanKey: e.toPlanKey, via: [...via.get(e._k)].sort() }));
}

/**
 * Score computed edges against the manifest's required-edge set.
 *   recall    = required edges the join recovered / required        (the "resource-mediated fraction")
 *   precision = computed edges that are required / computed          (the over-wiring guard)
 * Localizes every required-but-unjoined edge (missing[]) and every computed-but-not-required
 * edge (spurious[]). When the manifest's edges carry a `partition` tag, recall is also broken
 * out per partition (e.g. intra-feature vs seam).
 *
 * @param {Array<{fromPlanKey,toPlanKey,via?}>} computedEdges
 * @param {{requiredEdges?:Array<{fromPlanKey,toPlanKey,why?,partition?}>}} manifest
 */
export function scoreJoin(computedEdges, manifest) {
  const required = (manifest.requiredEdges || []).map((e) => ({ ...e, key: edgeKey(e.fromPlanKey, e.toPlanKey) }));
  const reqKeys = new Set(required.map((e) => e.key));
  const compKeys = new Set(computedEdges.map((e) => edgeKey(e.fromPlanKey, e.toPlanKey)));

  const missing = required
    .filter((e) => !compKeys.has(e.key))
    .map((e) => ({ ref: e.key, what: 'required edge is NOT resource-mediated by the join', evidence: e.why || '', partition: e.partition }));

  const spurious = computedEdges
    .filter((e) => !reqKeys.has(edgeKey(e.fromPlanKey, e.toPlanKey)))
    .map((e) => ({ ref: edgeKey(e.fromPlanKey, e.toPlanKey), what: 'join computed an edge not in the manifest (over-wire OR a real edge the manifest omits)', via: e.via || [] }));

  const covered = required.length - missing.length;
  const recall = required.length ? covered / required.length : 1;
  const precision = computedEdges.length ? (computedEdges.length - spurious.length) / computedEdges.length : 1;

  // per-partition recall (only if the manifest tags partitions)
  const byPartition = {};
  for (const e of required) {
    if (!e.partition) continue;
    const p = (byPartition[e.partition] ||= { required: 0, covered: 0 });
    p.required++;
    if (compKeys.has(e.key)) p.covered++;
  }
  for (const p of Object.keys(byPartition)) {
    byPartition[p].recall = byPartition[p].required ? byPartition[p].covered / byPartition[p].required : 1;
  }

  return {
    recall,
    precision,
    covered,
    required: required.length,
    computed: computedEdges.length,
    missing,
    spurious,
    byPartition: Object.keys(byPartition).length ? byPartition : undefined,
  };
}

export default { joinEdges, scoreJoin };
