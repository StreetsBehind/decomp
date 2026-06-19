#!/usr/bin/env node
// CAUSAL REPLAY of the SELF-REPAIR lever over already-dumped RAW draws (the 2026-06-19 census dumps).
//
// Why replay, not a fresh live run: the gateway pool is NON-STATIONARY and only ~3/32 census draws carried a
// free-id bug, so a fresh K=8 run might draw zero broken routes and the lever would (correctly) no-op — telling
// us nothing about whether the REPAIR works. This isolates the lever on the EXACT broken draws the census
// caught (quota-A d4 `bio`, quota-B d5 `bio`, approval-A d4 `generateUniqueId`): load the raw files, grade,
// run the repair gate with a LIVE route-back (re-prompt the SAME cheap pool with the runtime error), re-grade.
// This is the dump-replay causality discipline (memory: incompetence-is-the-target / the persistence misread)
// applied to a model-routed lever. $0 (free gateway).
//
// Run: node studies/meta-search/replay-repair.mjs --epic quota-d1 --dump runs/dump/census-q1-A/quota-d1-d4
//      node studies/meta-search/replay-repair.mjs --epic approval-d1 --dump runs/dump/census-a1-A/approval-d1-d4

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { makeGatewayInvoke } from '../../runner/model-client.mjs';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { runRepairGate } from './src/repair-gate.mjs';
import { runShapeGate } from './src/shape-gate.mjs';
import { runContractGate } from './src/contract-gate.mjs';
import { runPersistenceGate } from './src/persistence-gate.mjs';
import { runSeamGate } from './src/seam-gate.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const EPIC = arg('epic', 'quota-d1');
const DUMP = arg('dump', 'runs/dump/census-q1-A/quota-d1-d4');
const REPAIRS = Math.max(1, parseInt(arg('repair', '3'), 10) || 3);
const GATE = { kind: 'deterministic', repairDepth: REPAIRS };

const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';
const chunkPrompt = (preamble, skeleton, surfaceText) => ['## Shared context (every surface uses this)', preamble, skeleton ? `\n${skeleton}` : '', '\n## Your task', surfaceText].join('\n');

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
const failWhy = (g) => [...((g.integration?.fails) || []), ...((g.crosscut?.fails) || [])].map((f) => String(f.why).split('\n')[0].slice(0, 70)).slice(0, 4);

function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repl-'));
  const f = path.join(dir, `${surface}.mjs`); fs.writeFileSync(f, code);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    let done = false; const fin = (ok) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(ok); };
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} fin(false); }, timeoutMs);
    child.on('close', (c) => fin(c === 0)); child.on('error', () => fin(false));
  });
}

const invoke = makeGatewayInvoke({ timeoutMs: 120000 });
// live route-back: re-prompt the same cheap pool with the repair prompt; keep the first structurally-valid draw.
const rebuild = async (surface, rp) => {
  for (let a = 0; a < 2; a++) {
    let g; try { g = await invoke({ prompt: rp, system: SYS_ONE, model: null }); } catch { continue; }
    if (await isValidSurface(g.text, surface)) return g.text;
  }
  return '';
};

const rawDir = path.join(path.resolve(HERE, DUMP), 'raw');
const files = {};
for (const s of order) { const f = path.join(rawDir, `${s}.mjs`); if (fs.existsSync(f)) files[s] = fs.readFileSync(f, 'utf8'); }
const prompts = Object.fromEntries(order.map((s) => [s, chunkPrompt(preamble, skeleton, fs.readFileSync(path.join(spec.dir, 'surfaces', `${s}.md`), 'utf8'))]));

console.log(`REPLAY-REPAIR — epic=${EPIC} dump=${DUMP} repairDepth=${REPAIRS}\n`);
const gRaw = await grade(files);
console.log(`  raw:        c ${pct(gRaw.crosscut)}  i ${pct(gRaw.integration)}   fails: ${JSON.stringify(failWhy(gRaw))}`);

const before = { ...files };
const r = await runRepairGate({ surfaces: order, files, prompts, gate: GATE, rebuild });
const gFix = await grade(files);
console.log(`  afterRepair: c ${pct(gFix.crosscut)}  i ${pct(gFix.integration)}   fails: ${JSON.stringify(failWhy(gFix))}`);
console.log(`\n  repair gate: flagged=${r.surfacesFlagged} freeIds=${r.freeIds} repairs=${r.repairs} fixed=${r.fixed} leak=${r.leak}`);
console.log(`  detail: ${JSON.stringify(r.detail)}`);
const changed = order.filter((s) => before[s] !== files[s]);
console.log(`  surfaces rewritten: ${JSON.stringify(changed)}`);
const dC = rate(gFix.crosscut) - rate(gRaw.crosscut), dI = rate(gFix.integration) - rate(gRaw.integration);
const verdict = (dC > 0 || dI > 0) ? (rate(gFix.crosscut) >= 1 && rate(gFix.integration) >= 1 ? '✅ RECOVERED to 100/100' : `▲ LIFTED (Δc${(dC * 100).toFixed(0)} Δi${(dI * 100).toFixed(0)})`) : (dC < 0 || dI < 0 ? '⛔ REGRESSION' : '— no change');
console.log(`\n  VERDICT (repair-only): ${verdict}`);

// --stack: after repair, run the rest of the deterministic-leaning stack (shape→contract→persist→seam) with
// the SAME live route-back, to show whether repair UNBLOCKS the other levers on the residual form modes.
if (process.argv.includes('--stack')) {
  await runShapeGate({ surfaces: order, files, prompts, skeleton, baseModel: preamble, gate: GATE, rebuild });
  await runContractGate({ surfaces: order, files, prompts, skeleton, gate: GATE, rebuild });
  await runPersistenceGate({ surfaces: order, files, skeleton, baseModel: preamble, gate: GATE });
  await runSeamGate({ surfaces: order, files, prompts, skeleton, baseModel: preamble, gate: GATE, rebuild });
  const gStk = await grade(files);
  const sC = rate(gStk.crosscut) - rate(gRaw.crosscut), sI = rate(gStk.integration) - rate(gRaw.integration);
  const sv = (rate(gStk.crosscut) >= 1 && rate(gStk.integration) >= 1) ? '✅ RECOVERED to 100/100' : (sC > 0 || sI > 0 ? `▲ LIFTED (Δc${(sC * 100).toFixed(0)} Δi${(sI * 100).toFixed(0)})` : '— no change');
  console.log(`  afterStack:  c ${pct(gStk.crosscut)}  i ${pct(gStk.integration)}   fails: ${JSON.stringify(failWhy(gStk))}`);
  console.log(`  VERDICT (repair+shape+contract+persist+seam): ${sv}`);
}
