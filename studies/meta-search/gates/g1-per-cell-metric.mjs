// G1 — the §6 per-cell metric is wired (and doubles as the genome→worker→scorecard→archive end-to-end
// smoke through the REAL apparatus). It builds a correct epic and a single-lethal-cell-drop epic, grades
// BOTH with the frozen evaluateEpic, runs them through the same buildScorecard the worker uses, and
// asserts:
//   (a) the per-cell pass-vector is reconstructed correctly from real bucket data;
//   (b) the cost-weighted reliability matches the frozen weights, computed by hand;
//   (c) the two channels are separated — `cells` carries names (mechanical/veto), `digest` is
//       quadrant-and-count ONLY (no cell/seam names leak to the mutator channel);
//   (d) the per-cell lethal veto rejects the dropped-cell build at archive insertion.
// No model calls — deterministic, against the scale-d1 anchor epic.

import path from 'node:path';
import url from 'node:url';
import { evaluateEpic } from '../../build-gap/lib/epic-sandbox.mjs';
import { refImpls, dropAuthzAddMember } from './lib/impls.mjs';
import { buildScorecard } from '../src/scorecard.mjs';
import { makeArchive, perCellVetoOk } from '../src/archive.mjs';
import { makeLedger } from '../src/ledger.mjs';
import { WEIGHTS } from '../src/config.mjs';

const TESTS = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..', 'build-gap', 'epics', 'scale-d1', 'tests.mjs');

async function cellNamesFor(testsPath) {
  const t = await import(url.pathToFileURL(testsPath).href);
  const nm = (a) => (Array.isArray(a) ? a.map((x) => x.name) : []);
  return { wire: t.EXPECTS.slice(), happy: nm(t.happy), crosscut: nm(t.crosscut), integration: nm(t.integration) };
}

function ledgerWith(model) { const l = makeLedger(); for (let i = 0; i < 5; i++) l.charge('builder', { model: 'fusion', outputTokens: 1000 }); if (model) l.charge('skeletonAuthor', { model, inputTokens: 1500, outputTokens: 3000 }); return l; }

export async function run() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

  const cellNames = await cellNamesFor(TESTS);
  const K = 2;
  const runRef = await Promise.all(Array.from({ length: K }, () => evaluateEpic({ mode: 'isolated', files: refImpls(), testsPath: TESTS })));
  const runMut = await Promise.all(Array.from({ length: K }, () => evaluateEpic({ mode: 'isolated', files: dropAuthzAddMember(), testsPath: TESTS })));

  const ref = buildScorecard({ genome: null, genomeHash: 'g1-ref', epics: [{ name: 'scale-d1', cellNames, runs: runRef }], ledger: ledgerWith(null) });
  const mut = buildScorecard({ genome: null, genomeHash: 'g1-mut', epics: [{ name: 'scale-d1', cellNames, runs: runMut }], ledger: ledgerWith('opus') });

  // (a) per-cell vector reconstructed: ref passes every lethal cell; mut drops exactly the authz@addMember cell.
  const authzCell = cellNames.crosscut.find((n) => n.includes('authz@addMember'));
  ok('per-cell: authz@addMember cell exists in oracle', !!authzCell, authzCell || 'NOT FOUND');
  const refAllLethal = Object.entries(ref.cells).filter(([k]) => /::(crosscut|integration)::/.test(k)).every(([, v]) => v === true);
  ok('per-cell: ref passes every lethal cell', refAllLethal);
  const mutDropped = Object.entries(mut.cells).filter(([k]) => /::(crosscut|integration)::/.test(k)).filter(([, v]) => v === false);
  ok('per-cell: mut drops exactly 1 lethal cell (the authz cell)', mutDropped.length === 1 && mutDropped[0][0].includes('authz@addMember'), mutDropped.map(([k]) => k).join(','));

  // (b) cost-weighted reliability matches the frozen weights, by hand.
  ok('reliability: ref == 1.0', Math.abs(ref.reliability - 1) < 1e-9, String(ref.reliability));
  const expMut = (WEIGHTS.crosscut * (6 / 7) + WEIGHTS.integration * 1 + WEIGHTS.happy * 1 + WEIGHTS.wire * 1) / (WEIGHTS.crosscut + WEIGHTS.integration + WEIGHTS.happy + WEIGHTS.wire);
  ok('reliability: mut matches hand-computed cost-weighted scalar', Math.abs(mut.reliability - expMut) < 1e-9, `got ${mut.reliability.toFixed(6)} want ${expMut.toFixed(6)}`);
  ok('epicPass: ref EPIC✓, mut not', ref.epicPass.all === true && mut.epicPass.all === false);

  // (c) channel separation: digest is quadrant+count only — NO cell/seam names.
  const digestStr = JSON.stringify(mut.digest);
  ok('digest: carries no cell names (no oracle-token leak to mutator channel)', !digestStr.includes('authz@addMember') && !digestStr.includes('SEAM') && !digestStr.includes('addMember'), digestStr);
  ok('digest: lethalFailCount == 1, crosscut count == 1', mut.digest.lethalFailCount === 1 && mut.digest.failCounts.crosscut === 1, JSON.stringify(mut.digest.failCounts));
  ok('digest: quadrant flagged lethal-miss', mut.digest.quadrant === 'lethal-miss', mut.digest.quadrant);

  // (d) per-cell veto rejects the dropped-cell build vs ref-as-baseline, at archive insertion.
  const veto = perCellVetoOk(mut.cells, ref.cells);
  ok('veto: per-cell non-inferiority rejects mut vs ref baseline', veto.ok === false && veto.droppedCount === 1, JSON.stringify(veto));
  const arc = makeArchive();
  const insRef = arc.insert(ref, { tag: 'ref' }, null);
  const insMut = arc.insert(mut, { tag: 'mut' }, ref);
  ok('archive: ref inserts; mut rejected by lethal-veto', insRef.inserted === true && insMut.inserted === false && insMut.reason.startsWith('lethal-veto'), `${insRef.reason} / ${insMut.reason}`);

  // cost ledger sanity: the opus-author build carries nonzero cost; the cheap build is ~free.
  ok('cost: cheap build ~$0, opus-author build > $0 (model-priced ledger)', ref.cost.total === 0 && mut.cost.total > 0, `ref=$${ref.cost.total} mut=$${mut.cost.total.toFixed(3)}`);

  const pass = checks.every((c) => c.pass);
  return { name: 'G1 per-cell metric wiring', pass, checks };
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => { for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`); console.log(`\n${r.pass ? 'OK' : 'FAIL'} — ${r.name}`); process.exit(r.pass ? 0 : 1); });
}
