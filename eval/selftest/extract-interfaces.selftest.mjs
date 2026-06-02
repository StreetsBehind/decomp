// Pins the Step-2 derivation: the produces/consumes annotation pass (eval/extract-interfaces.mjs),
// the canonicalizer (vocabulary alignment), and the extraction A/B (eval/extraction-ab.mjs) — all with
// a DETERMINISTIC stub annotator (zero spend / zero variance). Also pins parseInterface (the live
// annotator's reply parser) so the live path's parsing is tested without a model.

import assert from 'node:assert/strict';
import { extractInterfaces, slugName, exactName } from '../extract-interfaces.mjs';
import { extractionAB } from '../extraction-ab.mjs';
import { makeStubAnnotator, parseInterface } from '../../runner/annotator.mjs';

const bead = (planKey, id = planKey) => ({
  id, type: 'task', title: planKey, status: 'open',
  metadata: { acceptanceCriteria: ['x'], filesTouched: [`src/${planKey}.ts`], provenance: { planKey } },
});
const dep = (from, to) => ({ from, to, kind: 'blocks' });
const nodeFor = (nodes, pk) => nodes.find((n) => n.planKey === pk);

export async function run() {
  // ---- extractInterfaces: per-bead local annotation -> typed nodes (node set = non-epic beads) ----
  const snap = {
    beads: [{ id: 'E', type: 'epic', title: 'app' }, bead('schema'), bead('list'), bead('add')],
    edges: [dep('list', 'schema')], // model's depends_on MISSES add->schema
    ready: [],
  };
  const annotate = makeStubAnnotator({
    schema: { produces: ['Schema:item'] },
    list: { consumes: ['Schema:item'] },
    add: { consumes: ['Schema:item'] },
  });
  const nodes = await extractInterfaces(snap, annotate);
  assert.equal(nodes.length, 3, 'one node per non-epic bead (epic excluded)');
  assert.deepEqual(nodeFor(nodes, 'schema').produces, ['Schema:item'], 'producer interface extracted');
  assert.deepEqual(nodeFor(nodes, 'list').consumes, ['Schema:item'], 'consumer interface extracted');

  // ---- the A/B money-shot: local extraction + join recovers an edge the model's depends_on dropped ----
  const manifest = {
    requiredEdges: [
      { fromPlanKey: 'list', toPlanKey: 'schema', why: 'list reads the schema' },
      { fromPlanKey: 'add', toPlanKey: 'schema', why: 'add writes the schema' },
    ],
  };
  const ab = await extractionAB(snap, manifest, annotate);
  assert.equal(ab.arm1.recall, 0.5, 'Arm 1 (model depends_on) recovers only 1/2 edges');
  assert.equal(ab.arm2.recall, 1, 'Arm 2 (extraction -> join) recovers 2/2 edges');
  assert.equal(ab.arm2.precision, 1, 'Arm 2 over-wires nothing (precision 1)');
  assert.equal(ab.arm2.missing.length, 0, 'no manifest edge unmediated');
  assert.equal(ab.delta, 0.5, 'the join recovers +0.5 recall over the model depends_on on this snapshot');

  // ---- canonicalization (§1.1): the normalizer aligns trivially-different resource names ----
  const vocab = {
    beads: [{ id: 'E', type: 'epic', title: 'app' }, bead('writer'), bead('reader')],
    edges: [], ready: [],
  };
  const vocabAnn = makeStubAnnotator({
    writer: { produces: ['Store:Session Store'] },  // capitalized + spaced
    reader: { consumes: ['Store:session-store'] },   // kebab
  });
  const vMan = { requiredEdges: [{ fromPlanKey: 'reader', toPlanKey: 'writer', why: 'reader reads the store' }] };
  const slugAB = await extractionAB(vocab, vMan, vocabAnn, { normalize: slugName });
  assert.equal(slugAB.arm2.recall, 1, 'slug normalizer aligns "Session Store" with "session-store" -> edge computed');
  const exactAB = await extractionAB(vocab, vMan, vocabAnn, { normalize: exactName });
  assert.equal(exactAB.arm2.recall, 0, 'exact normalizer leaves them mismatched -> the join misses the edge');

  // ---- malformed resource ids are dropped (a model emits an off-lattice kind / garbage) ----
  const dirty = { beads: [bead('x')], edges: [], ready: [] };
  const dirtyNodes = await extractInterfaces(dirty, makeStubAnnotator({ x: { produces: ['Bogus:y', 'Store:s', 'no-colon', 'Store:'] } }));
  assert.deepEqual(nodeFor(dirtyNodes, 'x').produces, ['Store:s'], 'only the valid lattice resource survives');

  // ---- mergeByPlanKey: multiple beads serving one planKey union their interfaces ----
  const multi = { beads: [bead('x', 'x1'), bead('x', 'x2')], edges: [], ready: [] };
  const mergedNodes = await extractInterfaces(multi, makeStubAnnotator({ x1: { produces: ['Store:a'] }, x2: { consumes: ['Store:b'] } }));
  assert.equal(mergedNodes.length, 1, 'two beads, one planKey -> one merged node');
  assert.deepEqual(mergedNodes[0].produces, ['Store:a'], 'union of produces');
  assert.deepEqual(mergedNodes[0].consumes, ['Store:b'], 'union of consumes');
  assert.equal(mergedNodes[0].beadIds.length, 2, 'both beads recorded');

  // ---- parseInterface tolerates fences / prose / garbage (the live reply parser) ----
  assert.deepEqual(parseInterface('{"produces":["Store:s"],"consumes":[]}'), { produces: ['Store:s'], consumes: [] }, 'plain JSON');
  assert.deepEqual(parseInterface('```json\n{"produces":["Store:s"],"consumes":["Config:c"]}\n```').consumes, ['Config:c'], 'fenced JSON');
  assert.deepEqual(parseInterface('sure: {"produces":["Route:r"],"consumes":[]} ok').produces, ['Route:r'], 'prose-wrapped JSON');
  assert.deepEqual(parseInterface('not json at all'), { produces: [], consumes: [] }, 'garbage -> empty interface');
  assert.deepEqual(parseInterface(null), { produces: [], consumes: [] }, 'null -> empty interface');

  return { name: 'extract-interfaces', assertions: 20 };
}

export default run;
