#!/usr/bin/env node
// DETERMINISTIC REPLAY of the store-persistence lever over already-dumped RAW draws ($0, no gateway).
//
// The live worst-of-K fitness is a minimum over a NON-STATIONARY route pool (codex×opus deliberation): a K=8
// run may simply not draw the `?? []` local-copy pattern on a given day, so a live A/B cannot cleanly attribute
// the persistence lever. This replay removes that noise: it loads the RAW surface files the harness dumped
// (--dump), grades them through the SAME frozen evaluateEpic + oracle, then applies the deterministic
// persistence gate (optionally the full shape→contract→persist→seam stack, deterministic parts only) and
// re-grades. Because the dumps are the exact population the progress doc inspected, this answers the
// load-bearing question directly: does repairing the persistence pattern RECOVER integration on real draws?
//
// Run: node studies/meta-search/replay-persist.mjs --dump runs/dump/q1-cgA --epic quota-d1
//      node studies/meta-search/replay-persist.mjs --dump runs/dump/q1-cgB --epic quota-d1 --stack

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { runPersistenceGate, persistenceViolations, candidateStores } from './src/persistence-gate.mjs';
import { runShapeGate } from './src/shape-gate.mjs';
import { runContractGate } from './src/contract-gate.mjs';
import { runSeamGate } from './src/seam-gate.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);

const DUMP = arg('dump', 'runs/dump/q1-cgA');
const EPIC = arg('epic', 'quota-d1');
const STACK = has('stack'); // also run shape+contract+seam (deterministic parts) around persist, mirroring the live pipeline
const GATE = { kind: 'deterministic', repairDepth: 2 };

function epicSpec(id) {
  if (id.startsWith('membership-d')) { const D = id.split('-d')[1]; return { dir: path.join(BUILD_GAP, 'epics', `scale-d${D}`), testsPath: path.join(HERE, 'gates', 'lib', `oracle2-tests-d${D}.mjs`) }; }
  return { dir: path.join(HERE, 'epics', id), testsPath: path.join(HERE, 'epics', id, 'tests.mjs') };
}
const spec = epicSpec(EPIC);
const preamble = fs.readFileSync(path.join(spec.dir, 'preamble.md'), 'utf8');
const skeleton = fs.existsSync(path.join(spec.dir, 'skeleton.md')) ? fs.readFileSync(path.join(spec.dir, 'skeleton.md'), 'utf8') : '';
const tests = await import(url.pathToFileURL(spec.testsPath).href);
const order = Array.isArray(tests.EXPECTS) ? tests.EXPECTS.slice() : [];

const rate = (b) => (b && b.total ? b.pass / b.total : 0);
const pct = (b) => `${(rate(b) * 100).toFixed(0)}%`;
const grade = (files) => evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: spec.testsPath });
const failWhy = (g) => [...((g.integration?.fails) || []), ...((g.crosscut?.fails) || [])].map((f) => f.why).slice(0, 3);

const dumpRoot = path.resolve(HERE, DUMP);
const drawDirs = fs.readdirSync(dumpRoot).filter((d) => fs.existsSync(path.join(dumpRoot, d, 'raw'))).sort();
console.log(`REPLAY persist lever — dump=${DUMP} epic=${EPIC} stack=${STACK} — ${drawDirs.length} draws`);
console.log(`candidate persist stores (skeleton∖base): ${JSON.stringify(candidateStores(skeleton, preamble))}\n`);

const rebuildNoop = async (_s, _p) => ''; // deterministic replay: model route-back returns nothing (keeps current code)
let rawFail = 0, persistRecovered = 0, persistFlaggedDraws = 0, regressions = 0;
let stackRecovered = 0, stackRegressions = 0;

for (const dir of drawDirs) {
  const rawDir = path.join(dumpRoot, dir, 'raw');
  const files = {};
  for (const s of order) { const f = path.join(rawDir, `${s}.mjs`); if (fs.existsSync(f)) files[s] = fs.readFileSync(f, 'utf8'); }
  const rawFiles = { ...files };

  const gRaw = await grade(rawFiles);
  const rawI = rate(gRaw.integration), rawC = rate(gRaw.crosscut);

  // which surfaces carry the persistence pattern (deterministic, oracle-blind)?
  const stores = candidateStores(skeleton, preamble);
  const flagged = order.filter((s) => files[s] && persistenceViolations(files[s], stores).length);

  // apply persist (isolated), then grade
  const pf = { ...rawFiles };
  const pr = await runPersistenceGate({ surfaces: order, files: pf, skeleton, baseModel: preamble, gate: GATE });
  const gP = await grade(pf);
  const pI = rate(gP.integration), pC = rate(gP.crosscut);

  // optionally the full deterministic stack (shape→contract→persist→seam), to mirror the live pipeline
  let sI = null, sC = null;
  if (STACK) {
    const sf = { ...rawFiles };
    await runShapeGate({ surfaces: order, files: sf, prompts: {}, skeleton, baseModel: preamble, gate: GATE, rebuild: rebuildNoop });
    await runContractGate({ surfaces: order, files: sf, prompts: {}, skeleton, gate: GATE, rebuild: rebuildNoop });
    await runPersistenceGate({ surfaces: order, files: sf, skeleton, baseModel: preamble, gate: GATE });
    await runSeamGate({ surfaces: order, files: sf, prompts: {}, skeleton, baseModel: preamble, gate: GATE, rebuild: rebuildNoop });
    const gS = await grade(sf); sI = rate(gS.integration); sC = rate(gS.crosscut);
  }

  if (rawI < 1) rawFail++;
  if (flagged.length) persistFlaggedDraws++;
  if (rawI < 1 && pI > rawI) persistRecovered++;
  if (pI < rawI || pC < rawC) regressions++;
  if (STACK) { if (rawI < 1 && sI >= 1) stackRecovered++; if (sI < rawI || sC < rawC) stackRegressions++; }

  const recovered = STACK ? (rawI < 1 && sI >= 1) : (rawI < 1 && pI >= 1);
  const regressed = STACK ? (sI < rawI || sC < rawC) : (pI < rawI || pC < rawC);
  const tag = recovered ? ' ✅RECOVERED' : regressed ? ' ⛔REGRESSION' : '';
  console.log(`  ${dir}: raw c${pct(gRaw.crosscut)} i${pct(gRaw.integration)} → persist c${pct(gP.crosscut)} i${pct(gP.integration)}${STACK ? ` → stack c${(sC * 100).toFixed(0)}% i${(sI * 100).toFixed(0)}%` : ''}  [persist ${pr.surfacesFlagged}f/${pr.repairs}r on ${JSON.stringify(flagged)}]${tag}`);
  if (rawI < 1) console.log(`      raw fails: ${JSON.stringify(failWhy(gRaw))}`);
  if (rawI < 1 && pI < 1) console.log(`      residual fails: ${JSON.stringify(failWhy(gP))}`);
}

console.log(`\nSUMMARY: ${drawDirs.length} draws | raw-integ-FAIL ${rawFail} | persist-flagged ${persistFlaggedDraws} | persist-only-RECOVERED ${persistRecovered}/${rawFail} | persist-regressions ${regressions}`);
if (STACK) console.log(`STACK (shape[model-routed→noop here] + contract[DETERMINISTIC] + persist + seam[Mode-A det]): deterministic-RECOVERED ${stackRecovered}/${rawFail} | stack-regressions ${stackRegressions}`);
