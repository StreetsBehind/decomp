// Pins the expansion-fidelity composite math against known-good / known-broken
// snapshots (and a cyclic graph). Must pass before the scorer is trusted (CHARTER §6.4).
//
// Pinned facts:
//   - a fully-wired/atomic/traced snapshot scores >= 95 (in fact exactly 100);
//   - a broken snapshot (missing edges, oversized ACs, no provenance, missing concern)
//     scores materially lower (asserted < 40);
//   - a cyclic dependency graph zeroes the acyclicity sub-score (full-marks -> 0);
//   - at least one EXACT sub-score is pinned so weights can't drift silently.

import assert from 'node:assert/strict';
import { scoreFidelity, scoreFidelityDetail, WEIGHTS } from '../fidelity.mjs';

// --- the constant: a tiny outcome manifest (shape = outcome-manifest.schema) ---
const manifest = {
  fixture: 'selftest',
  outcomes: [
    { id: 'O-list', statement: 'see the list', satisfiedByAnyOf: ['list-view'] },
    { id: 'O-add', statement: 'add an item', satisfiedByAnyOf: ['add-item'] },
  ],
  requirements: [
    { id: 'R-schema', planKey: 'schema', description: 'items table' },
    { id: 'R-list', planKey: 'list-view', description: 'render list' },
    { id: 'R-add', planKey: 'add-item', description: 'create item' },
  ],
  surfaces: [],
  concerns: [{ id: 'input-validation', status: 'required' }],
  mustHaves: [
    { id: 'M-add', planKey: 'add-item', statement: 'can add' },
    { id: 'M-list', planKey: 'list-view', statement: 'can see' },
  ],
  requiredEdges: [
    { fromPlanKey: 'list-view', toPlanKey: 'schema', why: 'list reads table' },
    { fromPlanKey: 'add-item', toPlanKey: 'schema', why: 'add writes table' },
  ],
};

const goodBead = (id, planKey, concerns) => ({
  id, type: 'task', title: id, status: 'open',
  metadata: {
    acceptanceCriteria: ['does the thing', 'and verifies it'],
    filesTouched: [`src/${planKey}.ts`],
    testPlanCases: ['it works'],
    concerns: concerns || [],
    provenance: { planKey },
  },
});

// --- known-good: fully wired, atomic, traced; required concern carried ---------
const good = {
  beads: [
    { id: 'E', type: 'epic', title: 'app' },
    goodBead('B-schema', 'schema'),
    goodBead('B-list', 'list-view'),
    goodBead('B-add', 'add-item', ['input-validation']),
  ],
  edges: [
    { from: 'B-list', to: 'B-schema', kind: 'blocks' },
    { from: 'B-add', to: 'B-schema', kind: 'blocks' },
  ],
  ready: ['B-schema'],
};

// --- known-broken: dropped both edges, oversized ACs, NO provenance, no concern ---
const broken = {
  beads: [
    { id: 'E', type: 'epic', title: 'app' },
    // oversized ACs (7 > 6) AND no provenance.planKey -> drags atomicity + reverse-trace,
    // and (no planKey) zeroes pour-coverage / must-have / concern coverage too.
    { id: 'B1', type: 'task', title: 'B1', metadata: { acceptanceCriteria: ['a','b','c','d','e','f','g'] } },
    { id: 'B2', type: 'task', title: 'B2', metadata: { acceptanceCriteria: [] } }, // empty ACs -> not atomic
  ],
  edges: [], // dropped both required edges
  ready: [], // empty ready set
};

// --- cyclic graph: a real cycle B1 -> B2 -> B1 (acyclicity must zero) -----------
const cyclic = {
  beads: [
    goodBead('B1', 'schema'),
    goodBead('B2', 'list-view'),
  ],
  edges: [
    { from: 'B1', to: 'B2', kind: 'blocks' },
    { from: 'B2', to: 'B1', kind: 'blocks' },
  ],
  ready: ['B1'],
};

export function run() {
  // ---- weights sum to exactly 100 (guards against silent drift) ----
  const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  assert.equal(sum, 100, 'WEIGHTS must sum to 100');

  // ---- good: every fraction is 1 -> exact 100, and >= 95 ----
  const gScore = scoreFidelity(good, manifest);
  assert.equal(gScore, 100, 'fully-wired/atomic/traced snapshot scores exactly 100');
  assert.ok(gScore >= 95, 'good snapshot must score >= 95');

  const gd = scoreFidelityDetail(good, manifest);
  // PIN exact sub-scores so weights can't drift:
  assert.equal(gd.fractions.crossDep, 1, 'good crossDep fraction = 1');
  assert.equal(gd.points.crossDep, 18, 'good crossDep contributes exactly 18 points');
  assert.equal(gd.fractions.atomicity, 1, 'good atomicity fraction = 1');
  assert.equal(gd.fractions.reverseTrace, 1, 'good reverse-trace fraction = 1');
  assert.equal(gd.fractions.concernTrace, 1, 'good concern-trace fraction = 1');
  assert.equal(gd.fractions.readyNonEmpty, 1, 'good ready non-empty = 1');

  // ---- broken: materially lower ----
  const bScore = scoreFidelity(broken, manifest);
  const bd = scoreFidelityDetail(broken, manifest);
  // sub-fractions are all-zero for the failing axes:
  assert.equal(bd.fractions.pourCoverage, 0, 'no provenance -> 0 pour coverage');
  assert.equal(bd.fractions.mustHave, 0, 'no provenance -> 0 must-have coverage');
  assert.equal(bd.fractions.crossDep, 0, 'dropped both edges -> 0 cross-dep');
  assert.equal(bd.fractions.atomicity, 0, 'oversized/empty ACs -> 0 atomicity');
  assert.equal(bd.fractions.reverseTrace, 0, 'no provenance -> 0 reverse-trace');
  assert.equal(bd.fractions.concernTrace, 0, 'required concern uncovered -> 0');
  assert.equal(bd.fractions.readyNonEmpty, 0, 'empty ready set -> 0');
  // acyclicity still passes (no cycle) -> only the 12 acyclicity points survive.
  assert.equal(bd.fractions.acyclicity, 1, 'broken graph is still acyclic');
  assert.equal(bScore, WEIGHTS.acyclicity, 'broken score == only the acyclicity weight (12)');
  assert.ok(bScore < 40, 'broken snapshot scores materially lower (< 40)');
  assert.ok(gScore - bScore >= 60, 'good must beat broken by a wide margin');

  // ---- cyclic: acyclicity sub-score collapses to 0 ----
  const cd = scoreFidelityDetail(cyclic, manifest);
  assert.equal(cd.fractions.acyclicity, 0, 'a real cycle zeroes the acyclicity sub-score');

  return { name: 'fidelity', assertions: 19 };
}

export default run;
