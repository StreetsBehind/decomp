#!/usr/bin/env node
// WORST-TAIL CENSUS classifier (codex×opus Deliberation #2, runs/deliberations/20260619T145118Z/).
//
// The deliberation's agreed primary deliverable: classify EVERY worst draw of a live K=8 cell into the
// four buckets that decide reachability —
//   deterministically-form-repairable : the deterministic-only stack (model route-back OFF) clears raw→100/100.
//   model-route-back-only              : deterministic stack does NOT clear it, but the LIVE pipeline (with
//                                        shape/seam Mode-B model route-back ON) does → a real fix, but it
//                                        smuggles a single gateway draw into a worst-of-K (route-luck risk).
//   route-incompetence                 : residual is a route coding crash / MISSING surface → only "fix" is
//                                        re-draw = INADMISSIBLE under model-agnosticism → unreachable.
//   semantics-oracle-needed            : residual is wrong arithmetic/predicate → needs the held-out oracle →
//                                        an oracle-blind lever CANNOT close it → (C) thesis boundary.
//   (form-unhandled-no-lever           : a 5th, honest residual — a FORM defect that NEITHER deterministic nor
//                                        model-route-back fixes → "build a NEW lever IF admissible".)
//
// It is $0 + deterministic: it replays the RAW dumped files (--dump) through the frozen evaluateEpic + oracle,
// then through the deterministic-only stack (rebuildNoop), and JOINS the live-run JSON (--run) for the
// route-back-ON final per draw. ADDITIVE — touches nothing frozen; reuses the exported gates verbatim.
//
// Run: node studies/meta-search/census-classify.mjs --epic quota-d1 \
//        --dump runs/dump/census-q1-A --run runs/census-quota-d1-A.json --out runs/census-class-quota-A.json

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { runShapeGate } from './src/shape-gate.mjs';
import { runContractGate } from './src/contract-gate.mjs';
import { runPersistenceGate } from './src/persistence-gate.mjs';
import { runSeamGate } from './src/seam-gate.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };

const EPIC = arg('epic', 'quota-d1');
const DUMP = arg('dump', `runs/dump/census-q1-A`);
const RUN = arg('run', null);     // the paired coevo-rung1 run JSON (for the route-back-ON live final)
const OUT = arg('out', null);
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
const grade = (files) => evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: spec.testsPath });
const rebuildNoop = async () => ''; // deterministic replay: model route-back contributes nothing
const failsWhy = (g) => [...((g.integration?.fails) || []), ...((g.crosscut?.fails) || [])].map((f) => ({ name: f.name, why: f.why }));

// failure classifier — VERBATIM from coevo-rung1.mjs (form / semantics / incompetence).
function classifyFail(why) {
  const w = String(why || '').toLowerCase();
  if (w.includes('is not a function') || w.includes('touched-unwired')) return { mode: 'shape/unwired', cls: 'form' };
  if (w.includes('not defined') || w.includes('cannot read properties of undefined') || w.includes('assignment to constant')) return { mode: 'coding-bug', cls: 'incompetence' };
  if (w.includes('admin')) return { mode: 'authz-over', cls: 'form' };
  if (w.includes('overspend') || w.includes('still there') || w.includes('was charged') || w.includes('remains') || w.includes('conserve') || w.includes('negative') || w.includes('exactly') || w.includes('lost or made')) return { mode: 'conservation', cls: 'semantics' };
  if (w.includes('not approved') || w.includes('approval') || w.includes('self-approv') || w.includes('idempotent') || w.includes('audit')) return { mode: 'approval/idempotency', cls: 'semantics' };
  if (w.includes('not found') || w.includes('not published') || w.includes('not a member') || w.includes('not publicly') || w.includes('no member')) return { mode: 'seam', cls: 'form' };
  if (w.includes('leak') || w.includes('foreign') || w.includes(' org') || w.includes('tenan') || w.includes('not in caller')) return { mode: 'tenancy', cls: 'form' };
  if (w.includes('invalid input') || w.includes('not allowed') || w.includes('must not') || w.includes('unexpected field')) return { mode: 'input-validation', cls: 'form' };
  if (w.includes('assert.ok') || w.includes('expected truthy') || w.includes('to be truthy')) return { mode: 'return-shape', cls: 'form-inadmissible' }; // Delib #1: no declared return shape → fixing it is oracle-shaped
  return { mode: `other:${String(why || '').slice(0, 36)}`, cls: 'unknown' };
}

// run the DETERMINISTIC-ONLY stack (shape detect / contract surgical / persist / seam Mode-A) with route-back OFF.
async function deterministicStack(rawFiles) {
  const f = { ...rawFiles };
  await runShapeGate({ surfaces: order, files: f, prompts: {}, skeleton, baseModel: preamble, gate: GATE, rebuild: rebuildNoop });
  await runContractGate({ surfaces: order, files: f, prompts: {}, skeleton, gate: GATE, rebuild: rebuildNoop });
  await runPersistenceGate({ surfaces: order, files: f, skeleton, baseModel: preamble, gate: GATE });
  await runSeamGate({ surfaces: order, files: f, prompts: {}, skeleton, baseModel: preamble, gate: GATE, rebuild: rebuildNoop });
  return f;
}

function classifyResidual(fails, missing) {
  const tally = {};
  for (const f of fails) { const c = classifyFail(f.why); tally[c.cls] = (tally[c.cls] || 0) + 1; }
  if (missing && missing.length) tally.incompetence = (tally.incompetence || 0) + missing.length; // MISSING surface = re-draw-only
  // worst-first priority: an unclearable class anywhere gates the worst-of-K.
  if (tally.semantics) return { bucket: 'semantics-oracle-needed', tally };
  if (tally.incompetence) return { bucket: 'route-incompetence', tally };
  if (tally['form-inadmissible']) return { bucket: 'form-inadmissible(return-shape)', tally };
  if (tally.form) return { bucket: 'form-unhandled-no-lever', tally };
  if (tally.unknown) return { bucket: 'unknown', tally };
  return { bucket: 'form-unhandled-no-lever', tally };
}

const dumpRoot = path.resolve(HERE, DUMP);
const drawDirs = fs.readdirSync(dumpRoot).filter((d) => fs.existsSync(path.join(dumpRoot, d, 'raw'))).sort((a, b) => {
  const na = parseInt(a.split('-d').pop(), 10), nb = parseInt(b.split('-d').pop(), 10);
  return (Number.isFinite(na) && Number.isFinite(nb)) ? na - nb : a.localeCompare(b);
});
const runJson = RUN && fs.existsSync(path.resolve(HERE, RUN)) ? JSON.parse(fs.readFileSync(path.resolve(HERE, RUN), 'utf8')) : null;
const liveDraws = runJson?.epics?.[0]?.draws || null;

console.log(`CENSUS-CLASSIFY — epic=${EPIC} dump=${DUMP} run=${RUN || '(none)'} — ${drawDirs.length} draws, live-join=${liveDraws ? 'yes' : 'NO'}\n`);

const rows = [];
for (let i = 0; i < drawDirs.length; i++) {
  const dir = drawDirs[i];
  const rawDir = path.join(dumpRoot, dir, 'raw');
  const files = {};
  for (const s of order) { const f = path.join(rawDir, `${s}.mjs`); if (fs.existsSync(f)) files[s] = fs.readFileSync(f, 'utf8'); }
  const missing = order.filter((s) => !files[s] || files[s].length < 10);

  const gRaw = await grade(files);
  const rawC = rate(gRaw.crosscut), rawI = rate(gRaw.integration);

  const detFiles = await deterministicStack(files);
  const gDet = await grade(detFiles);
  const detC = rate(gDet.crosscut), detI = rate(gDet.integration);

  // route-back-ON live final, from the paired run JSON (relOf already stored crosscut/integration as 0-1 rates).
  const live = liveDraws?.[i]?.final || null;
  const liveC = live ? live.crosscut : null, liveI = live ? live.integration : null;
  const liveMissing = liveDraws?.[i]?.missingDraws || missing;

  let bucket, tally = null;
  if (rawC >= 1 && rawI >= 1) bucket = 'PASS';
  else if (detC >= 1 && detI >= 1) bucket = 'deterministically-form-repairable';
  else if (liveC != null && liveC >= 1 && liveI >= 1) bucket = 'model-route-back-only';
  else {
    // still failing after both → classify the residual that gates the worst-of-K (prefer the live final fails).
    const residualFails = live && (liveC < 1 || liveI < 1) ? (liveDraws[i].fails ? [...(liveDraws[i].fails.integration || []), ...(liveDraws[i].fails.crosscut || [])] : failsWhy(gDet)) : failsWhy(gDet);
    const c = classifyResidual(residualFails, liveMissing);
    bucket = c.bucket; tally = c.tally;
  }

  const row = { draw: dir, rawC, rawI, detC, detI, liveC, liveI, missing: liveMissing, bucket, residualTally: tally };
  rows.push(row);
  const p = (x) => x == null ? ' -- ' : `${(x * 100).toFixed(0)}%`;
  console.log(`  ${dir}: raw c${p(rawC)} i${p(rawI)} → det c${p(detC)} i${p(detI)} → live c${p(liveC)} i${p(liveI)}  ⇒ ${bucket}${tally ? '  ' + JSON.stringify(tally) : ''}${missing.length ? `  MISSING:${missing.join(',')}` : ''}`);
}

// worst draw = the live worst-of-K gating draw (min live integration, then crosscut); fall back to det if no run.
const keyI = (r) => (r.liveI != null ? r.liveI : r.detI);
const keyC = (r) => (r.liveC != null ? r.liveC : r.detC);
const worst = [...rows].sort((a, b) => (keyI(a) - keyI(b)) || (keyC(a) - keyC(b)))[0];
const bucketTally = {};
for (const r of rows) bucketTally[r.bucket] = (bucketTally[r.bucket] || 0) + 1;

const worstOfK = { rawI: Math.min(...rows.map((r) => r.rawI)), rawC: Math.min(...rows.map((r) => r.rawC)), liveI: Math.min(...rows.map((r) => keyI(r))), liveC: Math.min(...rows.map((r) => keyC(r))) };
// bar-mismatch test: did the stack's per-draw lift change the worst-of-K cell verdict?
const rawCellPass = worstOfK.rawC >= 1 && worstOfK.rawI >= 1;
const liveCellPass = worstOfK.liveC >= 1 && worstOfK.liveI >= 1;
const coMoves = rawCellPass !== liveCellPass; // the stack moved worst-of-K cell-pass

console.log(`\n=== CENSUS ${EPIC} (${DUMP}) ===`);
console.log(`worst-of-K  raw c${(worstOfK.rawC * 100).toFixed(0)}/i${(worstOfK.rawI * 100).toFixed(0)}  →  live(stack) c${(worstOfK.liveC * 100).toFixed(0)}/i${(worstOfK.liveI * 100).toFixed(0)}   cell ${liveCellPass ? 'PASS' : 'FAIL'}`);
console.log(`WORST DRAW: ${worst.draw} ⇒ ${worst.bucket}  (live c${(keyC(worst) * 100).toFixed(0)}/i${(keyI(worst) * 100).toFixed(0)})`);
console.log(`bucket census: ${Object.entries(bucketTally).map(([b, n]) => `${b}:${n}`).join(', ')}`);
console.log(`BAR-MISMATCH check: per-draw stack lift ${coMoves ? 'DOES' : 'does NOT'} move the worst-of-K cell verdict (raw cell ${rawCellPass ? 'PASS' : 'FAIL'} → live cell ${liveCellPass ? 'PASS' : 'FAIL'})`);

const result = { epic: EPIC, dump: DUMP, run: RUN, k: rows.length, worstOfK, worstDraw: { draw: worst.draw, bucket: worst.bucket }, bucketTally, liveCellPass, barMismatchCoMoves: coMoves, rows };
if (OUT) { fs.writeFileSync(path.resolve(HERE, OUT), JSON.stringify(result, null, 2) + '\n'); console.log(`\nwrote ${OUT}`); }
