// STEP 0 — mutation-test the rulers. PREREQUISITE: until this passes, every edge/surface
// recall number downstream is vibes (SURFACE-DISCOVERY-SPEC §5.3, §7 Step 0).
//
// The spec mis-points Step 0 at eval/catch-rate.mjs; catch-rate matches planted-gap
// {class,location} and is NOT the edge ruler (see ARCHETYPE-PREMISE-EXPERIMENT.md §7.5).
// The edge rulers are:
//   (a) scoreEdgeCoverage — the RECALL ruler (transitive edge realized?), exercised here through
//       the public thick path scoreBuildCompleteness(snapshot, manifest).
//   (b) scoreJoin — the NEW join ruler (recall + PRECISION over produces/consumes).
//
// The mutation test proves each ruler MOVES BY EXACTLY THE RIGHT AMOUNT, LOCALIZED:
//   delete a known edge  -> recall drops by exactly that edge, named in missing[]
//   plant a fake edge     -> precision drops, the fake named in spurious[]
// and pins the load-bearing semantics (recall is TRANSITIVE; the join is vocabulary-EXACT).

import assert from 'node:assert/strict';
import { scoreBuildCompleteness } from '../build-completeness.mjs';
import { joinEdges, scoreJoin } from '../join.mjs';
import { canonical, parseResource } from '../lattice.mjs';

// ---- scaffolding ----------------------------------------------------------
const goodBead = (planKey) => ({
  id: `b-${planKey}`, type: 'task', title: planKey, status: 'open',
  metadata: { acceptanceCriteria: ['ac'], filesTouched: [`src/${planKey}.ts`], testPlanCases: ['t'], provenance: { planKey } },
});

// A "perfect" decomposition derived from a manifest: one ready bead per planKey, one snapshot
// edge per requiredEdge. This is the known-good the mutation test perturbs.
function perfectSnapshotFromManifest(manifest) {
  const planKeys = new Set();
  for (const r of manifest.requirements || []) planKeys.add(r.planKey);
  for (const e of manifest.requiredEdges || []) { planKeys.add(e.fromPlanKey); planKeys.add(e.toPlanKey); }
  return {
    beads: [{ id: 'E', type: 'epic', title: 'app' }, ...[...planKeys].map(goodBead)],
    edges: (manifest.requiredEdges || []).map((e) => ({ from: `b-${e.fromPlanKey}`, to: `b-${e.toPlanKey}`, kind: 'blocks' })),
    ready: [],
  };
}
const withoutEdges = (snap, dropped) => ({
  ...snap,
  edges: snap.edges.filter((e) => !dropped.some(([f, t]) => e.from === `b-${f}` && e.to === `b-${t}`)),
});
const edgeCov = (snap, manifest) => scoreBuildCompleteness(snap, manifest).edgeCoverage;

export function run() {
  // =========================================================================
  // (a) RECALL RULER — scoreEdgeCoverage (transitive). Synthetic topology with a known
  //     transitive backup (X->Y->Z masks a deleted direct X->Z) and a bridge (P->Q).
  // =========================================================================
  const recallManifest = {
    fixture: 'ruler-recall',
    outcomes: [],
    requirements: ['X', 'Y', 'Z', 'P', 'Q'].map((k) => ({ id: `R-${k}`, planKey: k, description: k })),
    surfaces: [], concerns: [], mustHaves: [],
    requiredEdges: [
      { fromPlanKey: 'X', toPlanKey: 'Y', why: 'x needs y' },
      { fromPlanKey: 'Y', toPlanKey: 'Z', why: 'y needs z' },
      { fromPlanKey: 'X', toPlanKey: 'Z', why: 'x needs z (also reachable transitively via Y)' },
      { fromPlanKey: 'P', toPlanKey: 'Q', why: 'p needs q (a bridge — no alternate path)' },
    ],
  };
  const perfect = perfectSnapshotFromManifest(recallManifest);

  // perfect -> full recall, no misses
  let c = edgeCov(perfect, recallManifest);
  assert.equal(c.score, 1, 'recall ruler: perfect decomposition -> 1.0');
  assert.equal(c.missing.length, 0, 'recall ruler: perfect -> no misses');

  // delete the DIRECT X->Z edge: recall must STAY 1.0 because X->Y->Z still realizes it
  // transitively. This pins the "real (transitive) edge" semantics — a regression to
  // direct-only matching would (wrongly) drop here.
  c = edgeCov(withoutEdges(perfect, [['X', 'Z']]), recallManifest);
  assert.equal(c.score, 1, 'recall ruler is TRANSITIVE: deleting direct X->Z is masked by X->Y->Z');
  assert.equal(c.missing.length, 0, 'transitive backup -> still no miss');

  // delete the bridge P->Q: recall drops by exactly 1/4, localized to that edge.
  c = edgeCov(withoutEdges(perfect, [['P', 'Q']]), recallManifest);
  assert.equal(c.score, 3 / 4, 'recall ruler: deleting a bridge drops recall by exactly 1/4');
  assert.equal(c.missing.length, 1, 'one localized miss');
  assert.match(c.missing[0].ref, /P -> Q/, 'the dropped edge is named');

  // delete Y->Z (X->Z stays direct): only Y->Z is unrealized -> 3/4, localized.
  c = edgeCov(withoutEdges(perfect, [['Y', 'Z']]), recallManifest);
  assert.equal(c.score, 3 / 4, 'recall ruler: deleting Y->Z drops exactly 1/4 (X->Z still direct)');
  assert.match(c.missing[0].ref, /Y -> Z/);

  // delete BOTH X->Z direct and Y->Z: X can no longer reach Z by ANY path -> both drop -> 2/4.
  c = edgeCov(withoutEdges(perfect, [['X', 'Z'], ['Y', 'Z']]), recallManifest);
  assert.equal(c.score, 2 / 4, 'recall ruler: removing the edge AND its transitive backup drops exactly 2/4');
  assert.equal(c.missing.length, 2, 'two localized misses');
  const refs = c.missing.map((m) => m.ref).sort();
  assert.ok(refs.some((r) => /X -> Z/.test(r)) && refs.some((r) => /Y -> Z/.test(r)), 'both dropped edges named');

  // =========================================================================
  // (b) JOIN RULER — scoreJoin (recall + PRECISION). The recall ruler above has NO precision
  //     (a clique scores recall 1.0); precision is exactly what the join adds and must be proven.
  // =========================================================================
  const joinManifest = { requiredEdges: [{ fromPlanKey: 'B', toPlanKey: 'A', why: 'B reads store s' }] };

  // J1 perfect: B consumes what A produces -> edge B->A. C consumes a resource nobody produces -> no edge.
  const base = [
    { planKey: 'A', produces: ['Store:s'], consumes: [] },
    { planKey: 'B', produces: [], consumes: ['Store:s'] },
    { planKey: 'C', produces: [], consumes: ['Config:x'] },
  ];
  let j = scoreJoin(joinEdges(base), joinManifest);
  assert.equal(j.recall, 1, 'join: perfect annotation -> recall 1');
  assert.equal(j.precision, 1, 'join: perfect annotation -> precision 1');
  assert.equal(j.computed, 1, 'join: exactly one edge computed (C consumes an unproduced resource -> no edge)');
  assert.equal(j.missing.length, 0, 'join: perfect -> no missing');
  assert.equal(j.spurious.length, 0, 'join: perfect -> no spurious');

  // J2 delete the producer (A no longer produces Store:s): B->A evaporates, localized; precision intact.
  const noProducer = [{ planKey: 'A', produces: [], consumes: [] }, base[1], base[2]];
  j = scoreJoin(joinEdges(noProducer), joinManifest);
  assert.equal(j.recall, 0, 'join: deleting the producer drops recall to 0');
  assert.equal(j.missing.length, 1, 'join: one localized miss');
  assert.equal(j.missing[0].ref, 'B -> A', 'join: the unmediated edge is named');
  assert.equal(j.precision, 1, 'join: zero computed edges -> precision 1 (nothing wrong was emitted)');

  // J3 plant a fake: F also consumes Store:s -> computes F->A, which is NOT required -> precision drops, localized.
  const withFake = [...base, { planKey: 'F', produces: [], consumes: ['Store:s'] }];
  j = scoreJoin(joinEdges(withFake), joinManifest);
  assert.equal(j.recall, 1, 'join: the real edge B->A is still found');
  assert.equal(j.precision, 0.5, 'join: a planted spurious edge drops precision to 1/2');
  assert.equal(j.spurious.length, 1, 'join: one localized spurious edge');
  assert.equal(j.spurious[0].ref, 'F -> A', 'join: the fake edge is named');

  // J4 vocabulary mismatch (§1.1): producer "Store:session" vs consumer "Store:sessions" -> NO edge.
  const mismatch = [
    { planKey: 'A', produces: ['Store:session'], consumes: [] },
    { planKey: 'B', produces: [], consumes: ['Store:sessions'] },
  ];
  j = scoreJoin(joinEdges(mismatch), { requiredEdges: [{ fromPlanKey: 'B', toPlanKey: 'A', why: 'plural typo breaks the join' }] });
  assert.equal(j.computed, 0, 'join is vocabulary-EXACT: session != sessions -> no edge');
  assert.equal(j.recall, 0, 'vocabulary mismatch -> required edge missed');
  assert.equal(j.missing[0].ref, 'B -> A', 'the missed edge is localized');

  // J5 partitioned recall (the anchoring instrument the experiment depends on): seam recall must be
  // readable separately from intra-feature recall, and must drop in ISOLATION when a seam producer dies.
  const partNodes = [
    { planKey: 'A', produces: ['Store:s'], consumes: [] },
    { planKey: 'B', produces: [], consumes: ['Store:s'] }, // intra-feature edge B->A
    { planKey: 'C', produces: ['Event:e'], consumes: [] },
    { planKey: 'D', produces: [], consumes: ['Event:e'] }, // seam edge D->C
  ];
  const partManifest = { requiredEdges: [
    { fromPlanKey: 'B', toPlanKey: 'A', partition: 'intra-feature', why: 'intra' },
    { fromPlanKey: 'D', toPlanKey: 'C', partition: 'seam', why: 'seam' },
  ] };
  j = scoreJoin(joinEdges(partNodes), partManifest);
  assert.equal(j.byPartition['intra-feature'].recall, 1, 'partition: intra-feature recall readable');
  assert.equal(j.byPartition['seam'].recall, 1, 'partition: seam recall readable');
  // kill the seam producer only -> seam recall drops, intra untouched (anchoring is measurable in isolation)
  const seamDown = [partNodes[0], partNodes[1], { planKey: 'C', produces: [], consumes: [] }, partNodes[3]];
  j = scoreJoin(joinEdges(seamDown), partManifest);
  assert.equal(j.byPartition['seam'].recall, 0, 'partition: seam recall drops in isolation');
  assert.equal(j.byPartition['intra-feature'].recall, 1, 'partition: intra-feature recall unaffected');

  // ---- lattice guards -----------------------------------------------------
  assert.throws(() => parseResource('Bogus:x'), /unknown lattice kind/, 'lattice rejects an off-lattice kind');
  assert.throws(() => parseResource('Store'), /Kind:name/, 'lattice rejects a kind-less id');
  assert.equal(canonical(' Store : session '), 'Store:session', 'lattice canonicalizes (trims) ids');
  // a node consuming what it produces must not self-edge
  assert.equal(joinEdges([{ planKey: 'S', produces: ['Store:x'], consumes: ['Store:x'] }]).length, 0, 'no self-edge');

  return { name: 'ruler-mutation', assertions: 36 };
}

export default run;
