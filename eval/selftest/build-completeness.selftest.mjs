// Pins the build-completeness oracle math against a known-good and a known-broken
// snapshot. Must pass before the scorer is trusted (CHARTER §6.4).

import assert from 'node:assert/strict';
import { scoreBuildCompleteness, THRESHOLDS } from '../build-completeness.mjs';

// --- the constant: a tiny outcome manifest --------------------------------
const manifest = {
  fixture: 'selftest',
  outcomes: [{ id: 'O1', statement: 'user can see and add list items', satisfiedByAnyOf: ['feat-list'] }],
  requirements: [
    { id: 'R1', planKey: 'feat-list', description: 'list view + schema' },
    { id: 'R2', planKey: 'feat-add', description: 'add item' },
  ],
  surfaces: [],
  concerns: [{ id: 'validation', status: 'required' }],
  mustHaves: [{ id: 'M1', planKey: 'feat-add', statement: 'must be able to add an item' }],
  requiredEdges: [{ fromPlanKey: 'feat-add', toPlanKey: 'feat-list', why: 'add depends on the list schema' }],
};

const goodBead = (id, planKey, concerns) => ({
  id, type: 'task', title: id, status: 'open',
  metadata: {
    acceptanceCriteria: ['does the thing'],
    filesTouched: [`src/${planKey}.ts`],
    testPlanCases: ['it works'],
    concerns: concerns || [],
    provenance: { planKey },
  },
});

// --- known-good: should be BUILD-COMPLETE ---------------------------------
const good = {
  beads: [
    { id: 'E', type: 'epic', title: 'app' },
    goodBead('B1', 'feat-list'),
    goodBead('B2', 'feat-add', ['validation']),
  ],
  edges: [{ from: 'B2', to: 'B1', kind: 'blocks' }],
  ready: ['B1'],
};

// --- known-broken: dropped edge + missing concern + thin bead + scope-drift bead ---
const broken = {
  beads: [
    { id: 'E', type: 'epic', title: 'app' },
    goodBead('B1', 'feat-list'),
    { id: 'B2', type: 'task', title: 'B2', metadata: { acceptanceCriteria: ['x'], provenance: { planKey: 'feat-add' } } }, // no files, no cases, no concern
    { id: 'B3', type: 'task', title: 'ghost', metadata: { provenance: { planKey: 'feat-ghost' } } }, // scope-drift
  ],
  edges: [], // dropped the feat-add -> feat-list edge
  ready: ['B1'],
};

export function run() {
  // ---- good ----
  const g = scoreBuildCompleteness(good, manifest);
  assert.equal(g.verdict, 'BUILD-COMPLETE', 'good fixture must be build-complete');
  assert.equal(g.buildComplete, true);
  assert.equal(g.edgeCoverage.score, 1, 'good edgeCoverage');
  assert.equal(g.edgeCoverage.missing.length, 0);
  assert.equal(g.beadPresence.score, 1, 'good beadPresence');
  assert.equal(g.beadPresence.missing.length, 0);
  assert.equal(g.buildReadiness.score, 1, 'good buildReadiness');

  // ---- broken ----
  const b = scoreBuildCompleteness(broken, manifest);
  assert.equal(b.verdict, 'INCOMPLETE', 'broken fixture must be incomplete');
  assert.equal(b.buildComplete, false);
  // dropped edge -> edgeCoverage 0/1, one localized miss
  assert.equal(b.edgeCoverage.score, 0, 'dropped edge -> 0');
  assert.equal(b.edgeCoverage.missing.length, 1);
  assert.match(b.edgeCoverage.missing[0].ref, /feat-add -> feat-list/);
  // presence: 4/5 covered (validation concern missing), + scope-drift B3 flagged
  assert.equal(b.beadPresence.score, 0.8, 'broken presence = 4/5');
  assert.equal(b.beadPresence.missing.length, 2, 'missing concern + scope-drift bead');
  assert.ok(b.beadPresence.missing.some((m) => m.ref === 'validation'), 'flags missing concern');
  assert.ok(b.beadPresence.missing.some((m) => m.ref === 'B3'), 'flags scope-drift bead');
  // readiness: B1=1, B2=1/3, B3=0 -> mean 4/9 < threshold
  assert.ok(b.buildReadiness.score < THRESHOLDS.readiness, 'thin/empty beads drag readiness below threshold');
  assert.ok(b.buildReadiness.missing.length === 2, 'B2 and B3 flagged weak');

  // ===================================================================================
  // THIN-PATH (3rd-arg coverage folded in). Beads carry INVENTED planKeys the manifest
  // never names, so the mechanical path (no coverage) scores presence/edge ~0. The runner
  // hands us the judge's semantic coverage + the stated-outcome coverage instead.
  // ===================================================================================

  // A snapshot whose beads are readiness-complete (so buildReadiness=1, never the blocker)
  // but whose planKeys are invented — feat-list/feat-add/validation appear NOWHERE here.
  const thinSnap = {
    beads: [
      { id: 'E', type: 'epic', title: 'app' },
      goodBead('T1', 'invented-provider-config'),
      goodBead('T2', 'invented-callback-route'),
    ],
    edges: [{ from: 'T2', to: 'T1', kind: 'blocks' }],
    ready: ['T1'],
  };

  // SANITY: with NO coverage (mechanical path) this thin snapshot scores ~0 presence/edge and is
  // INCOMPLETE — exactly the failure the thin path fixes.
  const mech = scoreBuildCompleteness(thinSnap, manifest);
  assert.equal(mech.tier, 0, 'no coverage -> mechanical tier 0');
  assert.equal(mech.buildComplete, false, 'mechanical path: invented planKeys -> incomplete');
  assert.equal(mech.edgeCoverage.score, 0, 'mechanical edgeCoverage 0 (no planKey match)');
  assert.equal(mech.buildReadiness.score, 1, 'beads are readiness-complete');

  // HIGH coverage injected -> buildComplete becomes TRUE on the SAME thin snapshot.
  const highCoverage = {
    requirementCoverage: { score: 1, missing: [] },
    edgeCoverage: { score: 1, missing: [] },
    overall: 1,
  };
  const highOutcome = { score: 1, covered: ['O1'], missing: [] };
  const hi = scoreBuildCompleteness(thinSnap, manifest, { coverage: highCoverage, outcomeCoverage: highOutcome });
  assert.equal(hi.tier, 1, 'coverage given -> thin path folds in judgment (tier 1)');
  assert.equal(hi.buildComplete, true, 'thin high-coverage -> build-complete');
  assert.equal(hi.verdict, 'BUILD-COMPLETE');
  assert.equal(hi.edgeCoverage.score, 1, 'thin edgeCoverage from coverage');
  assert.equal(hi.edgeCoverage.missing.length, 0);
  assert.equal(hi.beadPresence.score, 1, 'thin beadPresence from semantic coverage');
  assert.equal(hi.beadPresence.missing.length, 0);
  assert.equal(hi.buildReadiness.score, 1, 'readiness stays mechanical (graph-intrinsic)');

  // LOW coverage injected -> buildComplete FALSE with LOCALIZED misses in both axes.
  // req 0.5 w/ 1 miss -> 2 items; outcome 0 w/ 1 miss -> 1 item; pooled presence = (3-2)/3 = 1/3.
  const lowCoverage = {
    requirementCoverage: { score: 0.5, missing: [{ ref: 'R-token-refresh', what: 'latent req uncovered', evidence: 'no refresh' }] },
    edgeCoverage: { score: 0.5, missing: [{ ref: 'feat-add -> feat-list', what: 'edge not realized', evidence: 'judge' }] },
    overall: 0.5,
  };
  const lowOutcome = { score: 0, covered: [], missing: [{ ref: 'O1', what: 'stated outcome carried by no bead', evidence: 'login' }] };
  const lo = scoreBuildCompleteness(thinSnap, manifest, { coverage: lowCoverage, outcomeCoverage: lowOutcome });
  assert.equal(lo.tier, 1, 'thin path tier 1');
  assert.equal(lo.buildComplete, false, 'thin low-coverage -> incomplete');
  assert.equal(lo.verdict, 'INCOMPLETE');
  assert.equal(lo.edgeCoverage.score, 0.5, 'thin edgeCoverage from coverage');
  assert.equal(lo.edgeCoverage.missing.length, 1, 'localized edge miss');
  assert.equal(lo.edgeCoverage.missing[0].ref, 'feat-add -> feat-list');
  assert.equal(lo.edgeCoverage.missing[0].tier, 1, 'edge miss tagged tier 1 (judge)');
  assert.equal(lo.beadPresence.score, 1 / 3, 'pooled presence = (2req+1out items - 2 miss)/3 = 1/3');
  assert.equal(lo.beadPresence.missing.length, 2, 'localized req + outcome misses');
  assert.ok(lo.beadPresence.missing.some((m) => m.ref === 'R-token-refresh' && m.tier === 1), 'req miss tier 1 (judge)');
  assert.ok(lo.beadPresence.missing.some((m) => m.ref === 'O1' && m.tier === 0), 'outcome miss tier 0 (mechanical)');
  assert.equal(lo.buildReadiness.score, 1, 'readiness still mechanical on thin path');

  return { name: 'build-completeness', assertions: 40 };
}

export default run;
