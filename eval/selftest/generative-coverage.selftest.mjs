// Pins the GENERATIVE-coverage orchestration (eval/generative-coverage.mjs) using a
// DETERMINISTIC TWO-PART STUB judge — so the PURE orchestration is tested at zero spend /
// zero variance. (CHARTER §6.4 + §8: the only non-determinism is the judge, which here is a
// fixed stub.)
//
// TWO-PART verdict contract { presence, sufficiency }:
//   - presence    = a packet/edge of the RIGHT SCOPE exists, regardless of completeness.
//   - sufficiency = building that packet/edge would ACTUALLY deliver the requirement / realize
//                   the dependency. sufficiency is false whenever presence is false.
//
// Stub contract (deterministic stand-in for the production claude-backed judge):
//   - a latent requirement is PRESENT iff its planKey appears as a bead title in the digest;
//     it is SUFFICIENT iff that present bead is ALSO well-specified (>=1 AC AND >=1 file).
//     A bead present but with no acceptance criteria / no files is present-but-thin
//     (presence true, sufficiency false) — this is the calibration finding we now report.
//   - a required edge is PRESENT iff BOTH endpoints appear as bead titles; it is SUFFICIENT iff
//     it is present AND a real dependency edge exists between those endpoints in the digest.

import assert from 'node:assert/strict';
import { scoreGenerativeCoverage, buildSnapshotDigest } from '../generative-coverage.mjs';

// --- the constant: a manifest whose requirements/edges are the LATENT set -----
const manifest = {
  fixture: 'selftest',
  outcomes: [],
  requirements: [
    { id: 'R-schema', planKey: 'schema', description: 'items table' },
    { id: 'R-list', planKey: 'list-view', description: 'render list' },
    { id: 'R-add', planKey: 'add-item', description: 'create item' },
    { id: 'R-toggle', planKey: 'toggle-done', description: 'flip done flag' },
  ],
  surfaces: [],
  concerns: [],
  mustHaves: [],
  requiredEdges: [
    { fromPlanKey: 'list-view', toPlanKey: 'schema', why: 'list reads table' },
    { fromPlanKey: 'add-item', toPlanKey: 'schema', why: 'add writes table' },
  ],
};

// Deterministic TWO-PART stub judge over the snapshotDigest.
function makeStubJudge() {
  return async ({ kind, target, snapshotDigest }) => {
    const byTitle = new Map(snapshotDigest.beads.map((b) => [b.title, b]));
    const edgeSet = new Set(snapshotDigest.edges.map((e) => `${e.from}->${e.to}`));
    if (kind === 'requirement') {
      const bead = byTitle.get(target.planKey);
      const presence = !!bead;
      const wellSpecified =
        presence && (bead.acceptanceCriteria || []).length >= 1 && (bead.files || []).length >= 1;
      const sufficiency = presence && wellSpecified;
      return {
        presence,
        sufficiency,
        beadRef: presence ? target.planKey : undefined,
        evidence: !presence
          ? `no bead titled '${target.planKey}'`
          : sufficiency
            ? `bead '${target.planKey}' present and well-specified`
            : `bead '${target.planKey}' present but thin (missing AC/files)`,
      };
    }
    // edge: present iff both endpoints exist; sufficient iff a real edge realizes it.
    const presence = byTitle.has(target.fromPlanKey) && byTitle.has(target.toPlanKey);
    const sufficiency = presence && edgeSet.has(`${target.fromPlanKey}->${target.toPlanKey}`);
    return {
      presence,
      sufficiency,
      evidence: !presence
        ? 'an endpoint bead is absent'
        : sufficiency
          ? 'both endpoints present and a dependency edge realizes the dependency'
          : 'both endpoints present but no dependency edge between them',
    };
  };
}

// A well-specified bead (>=1 AC, >=1 file) — present AND sufficient.
const titledBead = (planKey) => ({
  id: planKey, type: 'task', title: planKey, status: 'open',
  metadata: { acceptanceCriteria: ['x'], filesTouched: [`src/${planKey}.ts`], provenance: { planKey } },
});

// A present-but-THIN bead (no AC, no files) — presence true, sufficiency false.
const thinBead = (planKey) => ({
  id: planKey, type: 'task', title: planKey, status: 'open',
  metadata: { acceptanceCriteria: [], filesTouched: [], provenance: { planKey } },
});

const dep = (from, to) => ({ from, to, kind: 'blocks' });

export async function run() {
  const judge = makeStubJudge();

  // ---- buildSnapshotDigest: compact + complete enough for a judge ----
  const dig = buildSnapshotDigest({
    beads: [{ id: 'E', type: 'epic', title: 'app' }, titledBead('schema')],
    edges: [{ from: 'schema', to: 'x', kind: 'blocks' }],
    ready: [],
  });
  assert.equal(dig.beads.length, 1, 'digest excludes epics (nonEpicBeads)');
  assert.equal(dig.beads[0].title, 'schema');
  assert.equal(dig.edges.length, 1, 'digest carries the edge list');

  // ---- fully covering: every latent requirement well-specified + every edge realized ----
  const full = {
    beads: [
      { id: 'E', type: 'epic', title: 'app' },
      titledBead('schema'),
      titledBead('list-view'),
      titledBead('add-item'),
      titledBead('toggle-done'),
    ],
    edges: [dep('list-view', 'schema'), dep('add-item', 'schema')],
    ready: [],
  };
  const f = await scoreGenerativeCoverage(full, manifest, judge);
  assert.equal(f.requirementCoverage.score, 1, 'all 4 latent requirements sufficient -> 1');
  assert.equal(f.requirementCoverage.missing.length, 0);
  assert.equal(f.edgeCoverage.score, 1, 'both required edges sufficient -> 1');
  assert.equal(f.edgeCoverage.missing.length, 0);
  assert.equal(f.overall, 1, 'sufficiency overall 1 when nothing latent is missed');
  // presence agrees with sufficiency when everything is well-specified + realized.
  assert.equal(f.presence.requirementCoverage.score, 1, 'presence reqs all 1 on full cover');
  assert.equal(f.presence.edgeCoverage.score, 1, 'presence edges all 1 on full cover');
  assert.equal(f.presence.overall, 1, 'presence overall 1 on full cover');

  // ---- thin (absent beads): missing N latent requirements (no add-item, no toggle-done) ----
  // 4 requirements, 2 absent -> sufficiency & presence both 2/4. Edges: list-view->schema both
  // present + edge realizes it (sufficient); add-item->schema endpoint absent -> 1/2 edges.
  // overall = (6 - 3)/6 = 0.5. Here presence === sufficiency because absent things are missing
  // under BOTH views.
  const thin = {
    beads: [
      { id: 'E', type: 'epic', title: 'app' },
      titledBead('schema'),
      titledBead('list-view'),
    ],
    edges: [dep('list-view', 'schema')],
    ready: [],
  };
  const t = await scoreGenerativeCoverage(thin, manifest, judge);
  assert.equal(t.requirementCoverage.score, 2 / 4, 'thin snapshot misses 2 of 4 latent requirements');
  assert.equal(t.requirementCoverage.missing.length, 2, 'two requirements localized');
  const reqRefs = t.requirementCoverage.missing.map((m) => m.ref).sort();
  assert.deepEqual(reqRefs, ['R-add', 'R-toggle'], 'the RIGHT requirements are flagged missing');
  assert.match(t.requirementCoverage.missing[0].what, /latent requirement/, 'miss is labelled latent');
  assert.equal(t.edgeCoverage.score, 1 / 2, 'one of two required edges uncoverable (add-item absent)');
  assert.equal(t.edgeCoverage.missing.length, 1, 'one edge localized');
  assert.equal(t.edgeCoverage.missing[0].ref, 'add-item -> schema', 'the RIGHT edge is flagged');
  assert.equal(t.overall, 0.5, 'sufficiency overall = (total - missing)/total = (6-3)/6');
  // For purely-ABSENT items, presence and sufficiency coincide.
  assert.equal(t.presence.overall, 0.5, 'presence overall also 0.5 when misses are absences');
  assert.equal(t.presence.requirementCoverage.score, 2 / 4, 'presence reqs 2/4 (absent beads)');

  // ---- PRESENT-BUT-THIN: the calibration case — presence > sufficiency ----
  // All 4 requirement beads PRESENT (right scope exists), but add-item + toggle-done are THIN
  // (no AC / no files) so building them would NOT deliver the requirement -> sufficiency false.
  // Edges: both endpoint-pairs present, but only list-view->schema has a realizing edge; the
  // add-item->schema edge is absent so it is present-but-not-sufficient.
  //   presence:    reqs 4/4, edges 2/2  -> overall (6-0)/6 = 1
  //   sufficiency: reqs 2/4, edges 1/2  -> overall (6-3)/6 = 0.5
  const present = {
    beads: [
      { id: 'E', type: 'epic', title: 'app' },
      titledBead('schema'),
      titledBead('list-view'),
      thinBead('add-item'),
      thinBead('toggle-done'),
    ],
    edges: [dep('list-view', 'schema')],
    ready: [],
  };
  const p = await scoreGenerativeCoverage(present, manifest, judge);
  // presence: scope for everything exists.
  assert.equal(p.presence.requirementCoverage.score, 1, 'all 4 requirement packets PRESENT');
  assert.equal(p.presence.edgeCoverage.score, 1, 'both required edges PRESENT (endpoints exist)');
  assert.equal(p.presence.overall, 1, 'presence overall 1 — all scope exists');
  // sufficiency: the thin packets + unrealized edge are not deliverable.
  assert.equal(p.requirementCoverage.score, 2 / 4, 'only 2 of 4 requirement packets SUFFICIENT');
  const suffMissing = p.requirementCoverage.missing.map((m) => m.ref).sort();
  assert.deepEqual(suffMissing, ['R-add', 'R-toggle'], 'the THIN packets are flagged not-sufficient');
  assert.equal(p.presence.requirementCoverage.missing.length, 0, 'no requirement missing under presence');
  assert.equal(p.edgeCoverage.score, 1 / 2, 'only the realized edge is SUFFICIENT');
  assert.equal(p.edgeCoverage.missing[0].ref, 'add-item -> schema', 'unrealized edge not sufficient');
  assert.equal(p.overall, 0.5, 'sufficiency overall = (6-3)/6');
  // THE TWO TREES DIFFER — presence is strictly the softer view.
  assert.ok(p.presence.overall > p.overall, 'presence.overall > sufficiency.overall on present-but-thin');

  // ---- back-compat: a LEGACY judge returning only { covered } maps to BOTH views ----
  // covered === sufficiency, and presence := covered, so old stubs keep working.
  const legacyJudge = async ({ kind, target, snapshotDigest }) => {
    const titles = new Set(snapshotDigest.beads.map((b) => b.title));
    if (kind === 'requirement') return { covered: titles.has(target.planKey), evidence: 'legacy' };
    return { covered: titles.has(target.fromPlanKey) && titles.has(target.toPlanKey), evidence: 'legacy' };
  };
  const lg = await scoreGenerativeCoverage(present, manifest, legacyJudge);
  // legacy 'covered' = title present -> all 4 reqs + both edges "covered" -> 1 under both views.
  assert.equal(lg.overall, 1, 'legacy covered maps to sufficiency overall 1');
  assert.equal(lg.presence.overall, 1, 'legacy covered maps to presence overall 1 (presence:=covered)');

  return { name: 'generative-coverage', assertions: 33 };
}

export default run;
