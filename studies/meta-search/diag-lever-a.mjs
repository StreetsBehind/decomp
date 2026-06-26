#!/usr/bin/env node
// STEP-2 VALIDATION ($0, no gateway) — does the DETERMINISTIC Lever A (container-recon.mjs) lift the
// worst-of-K integration on the non-membership cells? Replays the EXACT committed ladder draws
// (runs/dump-ladder/<cell>-d<k>/raw/) through the seam-gate with reconcile OFF vs reconcile ON — both
// deterministic (noopRebuild, Mode-A surgical init only) so the ONLY difference is Lever A. Computes
// worst-of-K=8 integration over admissible (--floor) draws each way, matching the committed ladder statistic.
//
// This is the pre-registered "validate CAUSALITY by dump-replay BEFORE the expensive run" discipline (memory:
// incompetence-is-the-target / the persistence misread). Lever A is deterministic, so this $0 replay is a
// high-fidelity predictor of the seam-gate's contribution in the live ladder (the ladder additionally runs the
// Mode-B model route-back, which STEP 1 showed moves these residuals 0pp).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { runSeamGate } from './src/seam-gate.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const argv = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const DUMP_ROOT = path.isAbsolute(argv('dump', '')) ? argv('dump', '') : path.join(HERE, argv('dump', 'runs/dump-ladder'));
const K = 8;

function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dla-'));
  const f = path.join(dir, `${surface}.mjs`); fs.writeFileSync(f, code);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    let done = false; const fin = (ok) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(ok); };
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} fin(false); }, timeoutMs);
    child.on('close', (c) => fin(c === 0)); child.on('error', () => fin(false));
  });
}
const verify = (surface, code) => isValidSurface(code, surface);

const CELLS = [
  'approval-d1', 'approval-d2', 'approval-d3', 'approval-d4',
  'lifecycle-d1', 'lifecycle-d2', 'lifecycle-d3', 'lifecycle-d4',
  'quota-d1', 'quota-d2', 'quota-d3', 'quota-d4',
];
function epicSpec(id) { return { dir: path.join(HERE, 'epics', id), testsPath: path.join(HERE, 'epics', id, 'tests.mjs') }; }
const rate = (b) => (b && b.total ? b.pass / b.total : 0);
const noopRebuild = async () => '';

async function gradeWith(reconcile, files, order, skeleton, preamble, testsPath) {
  const f = { ...files };
  const seam = await runSeamGate({ surfaces: order, files: f, prompts: {}, skeleton, baseModel: preamble, gate: { kind: 'deterministic', repairDepth: 2, reconcile }, rebuild: noopRebuild, verify });
  const g = await evaluateEpic({ mode: 'isolated', files: { ...f }, testsPath });
  return { i: rate(g.integration), c: rate(g.crosscut), reconT: seam.recon ? seam.recon.transforms : 0, reconChanged: seam.recon ? seam.recon.surfacesChanged : [] };
}

async function main() {
  console.log(`DIAG-LEVER-A — deterministic recon OFF vs ON, worst-of-K=${K}, $0 ($floor-admissible draws)\n`);
  const rows = [];
  for (const cell of CELLS) {
    const spec = epicSpec(cell);
    const preamble = fs.readFileSync(path.join(spec.dir, 'preamble.md'), 'utf8');
    const skeleton = fs.existsSync(path.join(spec.dir, 'skeleton.md')) ? fs.readFileSync(path.join(spec.dir, 'skeleton.md'), 'utf8') : '';
    const tests = await import(url.pathToFileURL(spec.testsPath).href);
    const order = Array.isArray(tests.EXPECTS) ? tests.EXPECTS.slice() : [];

    const draws = [];
    for (let k = 1; k <= K; k++) {
      const rawDir = path.join(DUMP_ROOT, `${cell}-d${k}`, 'raw');
      if (!fs.existsSync(rawDir)) continue;
      const files = {}; let present = 0;
      for (const s of order) { const f = path.join(rawDir, `${s}.mjs`); if (fs.existsSync(f)) { files[s] = fs.readFileSync(f, 'utf8'); present++; } }
      if (!present) continue;
      let belowFloor = present < order.length;
      if (!belowFloor) { for (const s of order) { if (!(await isValidSurface(files[s], s))) { belowFloor = true; break; } } }
      const off = await gradeWith(false, files, order, skeleton, preamble, spec.testsPath);
      const on = await gradeWith(true, files, order, skeleton, preamble, spec.testsPath);
      draws.push({ k, belowFloor, off, on, integTotal: (await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: spec.testsPath })).integration?.total || 0 });
    }
    if (!draws.length) { console.log(`${cell}: NO DUMPS`); continue; }
    const adm = draws.filter((d) => !d.belowFloor && d.integTotal > 0);
    const pool = adm.length ? adm : draws.filter((d) => d.integTotal > 0);
    if (!pool.length) { console.log(`${cell.padEnd(12)} | pool-degenerate`); continue; }
    const wOff = Math.min(...pool.map((d) => d.off.i));
    const wOn = Math.min(...pool.map((d) => d.on.i));
    const totalReconT = draws.reduce((a, d) => a + d.on.reconT, 0);
    const d = (wOn - wOff);
    const flag = d > 0.001 ? `▲ +${(d * 100).toFixed(0)}pp` : (d < -0.001 ? `⛔ ${(d * 100).toFixed(0)}pp` : '— 0pp');
    rows.push({ cell, wOff, wOn, d, totalReconT });
    console.log(`${cell.padEnd(12)} | worst-of-K integ  OFF ${(wOff * 100).toFixed(0)}%  →  ON ${(wOn * 100).toFixed(0)}%   ${flag}   | recon transforms (all draws): ${totalReconT}  | adm ${adm.length}/${draws.length}`);
  }
  const lifted = rows.filter((r) => r.d > 0.001);
  const regressed = rows.filter((r) => r.d < -0.001);
  console.log(`\n==== LEVER-A $0 CAUSAL SUMMARY ====`);
  console.log(`  cells lifted:    ${lifted.length}  [${lifted.map((r) => `${r.cell}+${(r.d * 100).toFixed(0)}`).join(', ') || 'none'}]`);
  console.log(`  cells regressed: ${regressed.length}  [${regressed.map((r) => `${r.cell}${(r.d * 100).toFixed(0)}`).join(', ') || 'none'}]`);
  console.log(`  total recon transforms applied: ${rows.reduce((a, r) => a + r.totalReconT, 0)}`);
}
main().catch((e) => { console.error(e?.stack || e); process.exit(1); });
