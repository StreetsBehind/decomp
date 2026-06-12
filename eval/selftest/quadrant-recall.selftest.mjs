// Pins the cost-of-omission 2x2 edge recall (eval/generative-coverage.mjs edgeCoverageByQuadrant +
// costWeightedEdgeRecall) — BUILD-TOLERANT-REFRAME.md kill-test #1. Present ONLY on a quadrant-tagged
// manifest; absent (byte-for-byte unchanged) otherwise. The load-bearing assertion is the RE-ORDERING
// demo: a method with HIGHER uniform edge recall but LOWER lethal-quadrant recall must rank BELOW a
// method with the opposite profile under cost-weighting — the exact effect the kill-test looks for.
// Deterministic stub judge (zero spend / zero variance).

import assert from 'node:assert/strict';
import { scoreGenerativeCoverage } from '../generative-coverage.mjs';

// edge SUFFICIENT iff both endpoint beads exist AND a realizing dependency edge exists in the snapshot.
function stubJudge() {
  return async ({ kind, target, snapshotDigest }) => {
    if (kind === 'requirement') return { presence: false, sufficiency: false, evidence: '' };
    const titles = new Set(snapshotDigest.beads.map((x) => x.title));
    const edgeSet = new Set(snapshotDigest.edges.map((e) => `${e.from}->${e.to}`));
    const presence = titles.has(target.fromPlanKey) && titles.has(target.toPlanKey);
    const sufficiency = presence && edgeSet.has(`${target.fromPlanKey}->${target.toPlanKey}`);
    return { presence, sufficiency, evidence: '' };
  };
}

const b = (k) => ({ id: k, type: 'task', title: k, status: 'open', metadata: { acceptanceCriteria: ['x'], filesTouched: [`src/${k}.ts`], provenance: { planKey: k } } });
const dep = (from, to) => ({ from, to, kind: 'blocks' });

// 6 cheap (self-revealing) edges c0..c5, 2 lethal (silent+expensive) edges L0,L1.
const edge = (from, to, quadrant) => ({ fromPlanKey: from, toPlanKey: to, quadrant, why: `${quadrant} ${from}->${to}` });
const manifest = {
  fixture: 'quadrant-selftest',
  outcomes: [], requirements: [], surfaces: [], concerns: [], mustHaves: [],
  requiredEdges: [
    edge('c0a', 'c0b', 'cheap'), edge('c1a', 'c1b', 'cheap'), edge('c2a', 'c2b', 'cheap'),
    edge('c3a', 'c3b', 'cheap'), edge('c4a', 'c4b', 'cheap'), edge('c5a', 'c5b', 'cheap'),
    edge('L0a', 'L0b', 'lethal'), edge('L1a', 'L1b', 'lethal'),
  ],
};

// Build a snapshot that realizes a given list of "fromKey->toKey" edges (and includes the endpoint beads).
function snapshotRealizing(pairs) {
  const keys = new Set();
  const edges = [];
  for (const [from, to] of pairs) { keys.add(from); keys.add(to); edges.push(dep(from, to)); }
  return { beads: [{ id: 'E', type: 'epic', title: 'app' }, ...[...keys].map(b)], edges, ready: [] };
}

const pair = (e) => [e.fromPlanKey, e.toPlanKey];
const CHEAP = manifest.requiredEdges.filter((e) => e.quadrant === 'cheap').map(pair);
const LETHAL = manifest.requiredEdges.filter((e) => e.quadrant === 'lethal').map(pair);

export async function run() {
  const judge = stubJudge();

  // Method A: all 6 cheap, 0 lethal. Method B: 3 cheap, 2 lethal.
  const A = await scoreGenerativeCoverage(snapshotRealizing(CHEAP), manifest, judge);
  const B = await scoreGenerativeCoverage(snapshotRealizing([...CHEAP.slice(0, 3), ...LETHAL]), manifest, judge);

  // --- shape: a quadrant-tagged manifest yields the new fields ---
  assert.ok(A.edgeCoverageByQuadrant, 'quadrant-tagged manifest yields edgeCoverageByQuadrant');
  assert.ok(A.costWeightedEdgeRecall, 'quadrant-tagged manifest yields costWeightedEdgeRecall');

  // --- per-quadrant recall is correct and localized ---
  assert.equal(A.edgeCoverageByQuadrant.cheap.score, 1, 'A: cheap recall 6/6');
  assert.equal(A.edgeCoverageByQuadrant.lethal.score, 0, 'A: lethal recall 0/2');
  assert.equal(A.edgeCoverageByQuadrant.lethal.total, 2);
  assert.equal(B.edgeCoverageByQuadrant.cheap.score, 0.5, 'B: cheap recall 3/6');
  assert.equal(B.edgeCoverageByQuadrant.lethal.score, 1, 'B: lethal recall 2/2');

  // --- uniform edge recall: A (6/8) BEATS B (5/8) ---
  assert.equal(A.edgeCoverage.score, 6 / 8, 'A uniform edge recall = 6/8');
  assert.equal(B.edgeCoverage.score, 5 / 8, 'B uniform edge recall = 5/8');
  assert.ok(A.edgeCoverage.score > B.edgeCoverage.score, 'UNIFORM ranks A above B');

  // --- cost-weighted recall (default weights: lethal 1, cheap 0): B BEATS A ---
  assert.equal(A.costWeightedEdgeRecall.lethalRecall, 0, 'A lethal recall scalar = 0');
  assert.equal(B.costWeightedEdgeRecall.lethalRecall, 1, 'B lethal recall scalar = 1');
  assert.equal(A.costWeightedEdgeRecall.costWeighted, 0, 'A cost-weighted = 0 (only cheap covered, weight 0)');
  assert.equal(B.costWeightedEdgeRecall.costWeighted, 1, 'B cost-weighted = 1 (both lethal covered)');
  assert.ok(B.costWeightedEdgeRecall.costWeighted > A.costWeightedEdgeRecall.costWeighted, 'COST-WEIGHTED ranks B above A');

  // --- THE KILL-TEST EFFECT: the ranking flips between the two metrics ---
  const uniformRank = A.edgeCoverage.score > B.edgeCoverage.score ? 'A' : 'B';
  const weightedRank = A.costWeightedEdgeRecall.costWeighted > B.costWeightedEdgeRecall.costWeighted ? 'A' : 'B';
  assert.notEqual(uniformRank, weightedRank, 'cost-weighting RE-ORDERS the methods (uniform!=weighted winner)');

  // --- custom weights are honored ---
  const Aw = await scoreGenerativeCoverage(snapshotRealizing(CHEAP), manifest, judge, { quadrantWeights: { cheap: 1, lethal: 1 } });
  assert.equal(Aw.costWeightedEdgeRecall.costWeighted, 6 / 8, 'uniform weights reproduce uniform recall');

  // --- back-compat: an untagged manifest yields neither new field ---
  const untagged = { ...manifest, requiredEdges: manifest.requiredEdges.map(({ quadrant, ...e }) => e) };
  const r2 = await scoreGenerativeCoverage(snapshotRealizing(CHEAP), untagged, judge);
  assert.equal(r2.edgeCoverageByQuadrant, undefined, 'no quadrant tags -> no edgeCoverageByQuadrant');
  assert.equal(r2.costWeightedEdgeRecall, undefined, 'no quadrant tags -> no costWeightedEdgeRecall');

  return { name: 'quadrant-recall', assertions: 19 };
}

export default run;
