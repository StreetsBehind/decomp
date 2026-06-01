// Pins the STATED-outcome coverage math (eval/outcome-coverage.mjs) against a fully-covering
// and a partially-covering snapshot. Mechanical, deterministic — must pass before trust (CHARTER §6.4).

import assert from 'node:assert/strict';
import { scoreOutcomeCoverage } from '../outcome-coverage.mjs';

// --- the constant: a thin manifest stating three outcomes -----------------
const manifest = {
  fixture: 'selftest',
  outcomes: [
    { id: 'O-see', statement: 'see the list', satisfiedByAnyOf: ['list-view'] },
    { id: 'O-add', statement: 'add an item', satisfiedByAnyOf: ['add-item'] },
    { id: 'O-toggle', statement: 'toggle done', satisfiedByAnyOf: ['toggle-done'] },
  ],
  requirements: [],
  surfaces: [],
  concerns: [],
  mustHaves: [],
  requiredEdges: [],
};

// A bead that tags the STATED outcome ids it serves (generative methods CAN carry these,
// because the outcome ids were in the thin plan they saw).
const bead = (id, outcomeIds) => ({
  id, type: 'task', title: id, status: 'open',
  metadata: { provenance: { outcomeIds } },
});

export function run() {
  // ---- fully covering: every stated outcome carried by >=1 bead -> score 1 ----
  const full = {
    beads: [
      { id: 'E', type: 'epic', title: 'app' },
      bead('B1', ['O-see']),
      bead('B2', ['O-add', 'O-toggle']), // one bead may serve several outcomes
    ],
    edges: [],
    ready: ['B1'],
  };
  const f = scoreOutcomeCoverage(full, manifest);
  assert.equal(f.score, 1, 'fully-covering -> score 1');
  assert.equal(f.missing.length, 0, 'nothing missing');
  assert.equal(f.covered.length, 3, 'all three outcomes covered');

  // ---- partial: O-toggle carried by nobody -> 2/3, localized ----
  const partial = {
    beads: [
      { id: 'E', type: 'epic', title: 'app' },
      bead('B1', ['O-see']),
      bead('B2', ['O-add']),
      { id: 'B3', type: 'task', title: 'untagged', metadata: {} }, // no provenance.outcomeIds
    ],
    edges: [],
    ready: ['B1'],
  };
  const p = scoreOutcomeCoverage(partial, manifest);
  assert.equal(p.score, 2 / 3, 'one of three uncovered -> 2/3');
  assert.equal(p.missing.length, 1, 'one localized miss');
  assert.equal(p.missing[0].ref, 'O-toggle', 'localizes the uncovered outcome');
  assert.match(p.missing[0].evidence, /toggle done/, 'carries the outcome statement as evidence');
  assert.deepEqual(p.covered.sort(), ['O-add', 'O-see'], 'covered set is exact');

  // ---- no outcomes -> vacuously 1 ----
  const empty = scoreOutcomeCoverage({ beads: [], edges: [], ready: [] }, { ...manifest, outcomes: [] });
  assert.equal(empty.score, 1, 'no stated outcomes -> vacuous 1');

  return { name: 'outcome-coverage', assertions: 11 };
}

export default run;
