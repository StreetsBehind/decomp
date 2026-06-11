// Selftest: the granularity instrument (RESEARCH-PROGRAM §4.2 / E0.7).
//   eval/granularity.mjs        — the MEASURED dose
//   strategies/granularity.mjs  — the knob: level clauses + the deterministic merge/split post-pass
//
// Pins: metric math; split (AC preservation, chaining, edge fan-out); merge (outcome grouping,
// content preservation, edge remap without self-loops); level bounds; determinism; clause text.

import { scoreGranularity } from '../granularity.mjs';
import {
  GRANULARITY_LEVELS,
  GRANULARITY_LEVEL_IDS,
  granularityClause,
  applyGranularity,
} from '../../strategies/granularity.mjs';

let assertions = 0;
function ok(cond, msg) {
  assertions++;
  if (!cond) throw new Error(`granularity selftest: ${msg}`);
}
function eq(a, b, msg) {
  ok(Object.is(a, b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
}

function bead(id, acs, outcomeIds, extra = {}) {
  return {
    id,
    type: 'task',
    title: `do ${id}`,
    status: 'open',
    parent: extra.parent ?? null,
    metadata: {
      provenance: { outcomeIds, ...(extra.planKey ? { planKey: extra.planKey } : {}) },
      acceptanceCriteria: acs,
      filesTouched: extra.files ?? [`src/${id}.ts`],
      testPlanCases: extra.tests ?? [`${id}: happy path`],
    },
  };
}

const MANIFEST = { requirements: [{ planKey: 'r1' }, { planKey: 'r2' }, { planKey: 'r3' }, { planKey: 'r4' }] };

/** All acceptance criteria across non-epic beads, sorted — the content-preservation invariant. */
function acMultiset(snapshot) {
  return snapshot.beads
    .filter((b) => b.type !== 'epic')
    .flatMap((b) => b.metadata.acceptanceCriteria)
    .sort();
}

export default async function run() {
  // ---- the measured dose ----------------------------------------------------
  {
    const snap = {
      beads: [
        { id: 'e1', type: 'epic', title: 'epic', status: 'open', parent: null, metadata: { provenance: { outcomeIds: [] }, acceptanceCriteria: [], filesTouched: [], testPlanCases: [] } },
        bead('a', ['a1', 'a2'], ['O1'], { parent: 'e1' }),
        bead('b', ['b1', 'b2', 'b3', 'b4'], ['O1'], { parent: 'e1' }),
        bead('c', ['c1'], ['O2']),
      ],
      edges: [{ from: 'b', to: 'a', kind: 'blocks' }],
      ready: ['a', 'c'],
    };
    const g = scoreGranularity(snap, MANIFEST);
    eq(g.beadCount, 3, 'beadCount counts non-epic beads only');
    eq(g.atomsPerRequirement, 0.75, 'atomsPerRequirement = 3/4');
    eq(g.acMedian, 2, 'acMedian of [2,4,1] = 2');
    ok(Math.abs(g.acMean - 7 / 3) < 1e-3, 'acMean of [2,4,1] (scorer rounds to 4 digits)');
    ok(Math.abs(g.edgeDensity - 1 / 3) < 1e-3, 'edgeDensity = 1 edge / 3 beads (rounded)');
    eq(g.depth, 2, 'depth: task under epic = 2');

    const empty = scoreGranularity({ beads: [], edges: [], ready: [] }, MANIFEST);
    eq(empty.beadCount, 0, 'empty snapshot: beadCount 0');
    eq(empty.depth, 0, 'empty snapshot: depth 0');
    eq(empty.edgeDensity, 0, 'empty snapshot: edgeDensity 0');
  }

  // ---- level table + clauses -------------------------------------------------
  {
    eq(GRANULARITY_LEVEL_IDS.join(','), 'L0,L1,L2,L3,L4', 'five levels, stable order');
    for (const id of GRANULARITY_LEVEL_IDS) {
      ok(granularityClause(id).includes(`(${id} `), `clause for ${id} names its level`);
      eq(GRANULARITY_LEVELS[id].id, id, `level ${id} self-id`);
    }
    let threw = false;
    try { granularityClause('L9'); } catch { threw = true; }
    ok(threw, 'unknown level throws');
  }

  // ---- L4 split: AC preservation + chaining + edge fan-out --------------------
  {
    const snap = {
      beads: [bead('big', ['x1', 'x2', 'x3'], ['O1']), bead('dep', ['d1'], ['O1'])],
      edges: [{ from: 'big', to: 'dep', kind: 'blocks' }],
      ready: ['dep'],
    };
    const out = applyGranularity(snap, 'L4');
    const parts = out.beads.filter((b) => b.id.startsWith('big--p'));
    eq(parts.length, 3, 'L4 splits a 3-AC bead into 3 parts');
    ok(parts.every((p) => p.metadata.acceptanceCriteria.length === 1), 'every L4 part carries exactly 1 AC');
    eq(acMultiset(out).join('|'), 'd1|x1|x2|x3', 'split preserves the AC multiset');
    // chaining: part 2 depends on part 1, part 3 on part 2
    const edgeSet = new Set(out.edges.map((e) => `${e.from}->${e.to}`));
    ok(edgeSet.has('big--p2->big--p1') && edgeSet.has('big--p3->big--p2'), 'split parts are chained in order');
    // fan-out: every part inherits the original's dependency on dep
    ok(['big--p1', 'big--p2', 'big--p3'].every((id) => edgeSet.has(`${id}->dep`)), 'parts inherit original edges');
    // determinism
    const again = applyGranularity(snap, 'L4');
    eq(JSON.stringify(again), JSON.stringify(out), 'L4 transform is deterministic');
  }

  // ---- L0 merge: one bead per outcome group, content preserved ----------------
  {
    const snap = {
      beads: [
        bead('a', ['a1'], ['O1']),
        bead('b', ['b1', 'b2'], ['O1']),
        bead('c', ['c1'], ['O2']),
        bead('d', ['d1'], ['O2']),
      ],
      edges: [
        { from: 'b', to: 'a', kind: 'blocks' },   // intra-group: collapses away
        { from: 'c', to: 'a', kind: 'blocks' },   // cross-group: survives remapped
      ],
      ready: ['a'],
    };
    const out = applyGranularity(snap, 'L0');
    const tasks = out.beads.filter((b) => b.type !== 'epic');
    eq(tasks.length, 2, 'L0 yields one bead per outcome group');
    eq(acMultiset(out).join('|'), 'a1|b1|b2|c1|d1', 'merge preserves the AC multiset');
    eq(out.edges.length, 1, 'intra-group edges collapse; the cross-group edge survives');
    ok(out.edges[0].from !== out.edges[0].to, 'no self-loops after remap');
    // topological grouping: 'a' has no deps so it leads its group's merged bead identity
    ok(tasks.some((b) => b.id === 'merged--a'), 'merged id is stable (first member in topo order)');
    // outcomeIds union
    const o1 = tasks.find((b) => b.metadata.provenance.outcomeIds.includes('O1'));
    eq(o1.metadata.provenance.outcomeIds.join(','), 'O1', 'group outcomeIds preserved');
    // ready recomputed: beads with no outgoing edges
    ok(out.ready.includes('merged--a'), 'ready recomputed after merge');
  }

  // ---- L1 merge: 2–4 beads per outcome group ---------------------------------
  {
    const many = Array.from({ length: 9 }, (_, i) => bead(`t${i}`, [`ac${i}`], ['O1']));
    const out = applyGranularity({ beads: many, edges: [], ready: [] }, 'L1');
    const n = out.beads.filter((b) => b.type !== 'epic').length;
    ok(n >= 2 && n <= 4, `L1 puts a 9-bead outcome into 2..4 packets (got ${n})`);
    eq(acMultiset(out).length, 9, 'L1 merge preserves all 9 ACs');
  }

  // ---- L2: split >6 then bin-pack to 3..6 -------------------------------------
  {
    const snap = {
      beads: [
        bead('huge', ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'], ['O1']), // splits
        bead('tiny1', ['t1'], ['O1']),
        bead('tiny2', ['t2'], ['O1']),
        bead('tiny3', ['t3'], ['O1']),
      ],
      edges: [],
      ready: [],
    };
    const out = applyGranularity(snap, 'L2');
    eq(acMultiset(out).length, 11, 'L2 preserves all 11 ACs');
    const counts = out.beads.filter((b) => b.type !== 'epic').map((b) => b.metadata.acceptanceCriteria.length);
    ok(Math.max(...counts) <= 6, `L2 never exceeds 6 ACs per bead (got ${counts.join(',')})`);
    ok(counts.filter((c) => c < 3).length <= 1, `L2 leaves at most an unavoidable tail under 3 ACs (got ${counts.join(',')})`);
  }

  // ---- epics pass through; empty snapshot is safe ------------------------------
  {
    const epic = { id: 'e', type: 'epic', title: 'epic', status: 'open', parent: null, metadata: { provenance: { outcomeIds: [] }, acceptanceCriteria: [], filesTouched: [], testPlanCases: [] } };
    const out = applyGranularity({ beads: [epic, bead('a', ['a1'], ['O1'])], edges: [], ready: [] }, 'L0');
    ok(out.beads.some((b) => b.id === 'e' && b.type === 'epic'), 'epics pass through untouched');
    const none = applyGranularity({ beads: [], edges: [], ready: [] }, 'L2');
    eq(none.beads.length, 0, 'empty snapshot stays empty');
    let threw = false;
    try { applyGranularity({ beads: [], edges: [] }, 'nope'); } catch { threw = true; }
    ok(threw, 'unknown level throws in applyGranularity');
  }

  // ---- planKey: kept only when every member agrees -----------------------------
  {
    const same = applyGranularity({
      beads: [bead('a', ['a1'], ['O1'], { planKey: 'pk' }), bead('b', ['b1'], ['O1'], { planKey: 'pk' })],
      edges: [], ready: [],
    }, 'L0');
    eq(same.beads[0].metadata.provenance.planKey, 'pk', 'merge keeps a unanimous planKey');
    const mixed = applyGranularity({
      beads: [bead('a', ['a1'], ['O1'], { planKey: 'p1' }), bead('b', ['b1'], ['O1'], { planKey: 'p2' })],
      edges: [], ready: [],
    }, 'L0');
    ok(!('planKey' in mixed.beads[0].metadata.provenance), 'merge drops a disagreeing planKey');
  }

  return { name: 'granularity', assertions };
}
