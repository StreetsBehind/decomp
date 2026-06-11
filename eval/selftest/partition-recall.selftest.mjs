// Pins the per-partition edge recall (eval/generative-coverage.mjs edgeCoverageByPartition) — the
// library-covered-vs-SEAM split the archetype experiment's anchoring rule reads (primed is safe iff
// covered recall rises AND seam recall does not fall). Present ONLY on a partitioned manifest; absent
// (byte-for-byte unchanged) otherwise. Uses a deterministic stub judge (zero spend / zero variance).

import assert from 'node:assert/strict';
import { scoreGenerativeCoverage } from '../generative-coverage.mjs';

// edge SUFFICIENT iff both endpoint titles are present AND a realizing dependency edge exists.
function stubJudge() {
  return async ({ kind, target, snapshotDigest }) => {
    const titles = new Set(snapshotDigest.beads.map((x) => x.title));
    const edgeSet = new Set(snapshotDigest.edges.map((e) => `${e.from}->${e.to}`));
    if (kind === 'requirement') return { presence: false, sufficiency: false, evidence: '' };
    const presence = titles.has(target.fromPlanKey) && titles.has(target.toPlanKey);
    const sufficiency = presence && edgeSet.has(`${target.fromPlanKey}->${target.toPlanKey}`);
    return { presence, sufficiency, evidence: '' };
  };
}

const b = (k) => ({ id: k, type: 'task', title: k, status: 'open', metadata: { acceptanceCriteria: ['x'], filesTouched: [`src/${k}.ts`], provenance: { planKey: k } } });
const dep = (from, to) => ({ from, to, kind: 'blocks' });

const partitioned = {
  fixture: 'partition-selftest',
  outcomes: [], requirements: [], surfaces: [], concerns: [], mustHaves: [],
  requiredEdges: [
    { fromPlanKey: 'a', toPlanKey: 'b', partition: 'intra-feature', why: 'intra 1' },
    { fromPlanKey: 'c', toPlanKey: 'd', partition: 'intra-feature', why: 'intra 2' },
    { fromPlanKey: 'e', toPlanKey: 'f', partition: 'seam', why: 'seam 1' },
    { fromPlanKey: 'g', toPlanKey: 'h', partition: 'seam', why: 'seam 2' },
  ],
};

export async function run() {
  const judge = stubJudge();

  // Both intra edges realized; one seam realized (e->f), one seam unrealizable (h absent).
  const snapshot = {
    beads: [{ id: 'E', type: 'epic', title: 'app' }, b('a'), b('b'), b('c'), b('d'), b('e'), b('f'), b('g')],
    edges: [dep('a', 'b'), dep('c', 'd'), dep('e', 'f')],
    ready: [],
  };

  const r = await scoreGenerativeCoverage(snapshot, partitioned, judge);

  assert.ok(r.edgeCoverageByPartition, 'a partitioned manifest yields edgeCoverageByPartition');
  const intra = r.edgeCoverageByPartition['intra-feature'];
  const seam = r.edgeCoverageByPartition['seam'];

  assert.equal(intra.score, 1, 'intra-feature (library-covered) recall = 2/2');
  assert.equal(intra.total, 2);
  assert.equal(intra.missing.length, 0, 'no intra-feature edge missed');

  assert.equal(seam.score, 0.5, 'SEAM recall = 1/2 (g->h unrealizable)');
  assert.equal(seam.total, 2);
  assert.equal(seam.missing.length, 1, 'the one missed seam edge is localized');
  assert.equal(seam.missing[0].ref, 'g -> h', 'the RIGHT seam edge is flagged');

  // the unpartitioned overall edge recall is still the pooled 3/4.
  assert.equal(r.edgeCoverage.score, 3 / 4, 'overall edge sufficiency = 3/4 across both partitions');

  // back-compat: a manifest WITHOUT partition tags yields no partition split.
  const unpartitioned = { ...partitioned, requiredEdges: partitioned.requiredEdges.map(({ partition, ...e }) => e) };
  const r2 = await scoreGenerativeCoverage(snapshot, unpartitioned, judge);
  assert.equal(r2.edgeCoverageByPartition, undefined, 'no partitions -> no edgeCoverageByPartition (unchanged shape)');

  return { name: 'partition-recall', assertions: 10 };
}

export default run;
