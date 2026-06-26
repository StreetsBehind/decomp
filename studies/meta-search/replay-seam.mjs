#!/usr/bin/env node
// STEP-1 (Lever-A build sequence, LEVER-A-SCOPE.md §"Recommended build sequence"): CONFIRM THE MODE-B GAP.
//
// The Lever-A scoping diagnosis (diag-seam-residual.mjs) ran DETECTION-ONLY — Mode-A surgical init applied,
// the Mode-B *model* route-back disabled (noopRebuild) to stay $0/stationary. So the `.get/.has is not a
// function` container-drift residuals it reported are AFTER Mode-A only. The committed ladder ran the FULL
// seam-gate (with a live rebuild) and still stalled at i42-63. This script closes that gap: it replays the
// EXACT dumped raw draw(s) through the GENERALIZED seam-gate with a LIVE free-gateway route-back (the same
// gate config the ladder used: deterministic, repairDepth 2), grades raw vs after-seam, and shows whether the
// existing Mode-B model rebuild detects + closes the drift — i.e. whether A1 (deterministic container-style
// reconciliation) would DUPLICATE existing machinery or fill a real gap.
//
// $0 (free gateway), non-stationary (live), on the exact committed draws. Research-lead diagnostic tooling
// (not a graded candidate → no K3 surface); the seam-gate detection reads ONLY public inputs, grading uses the
// harness's deterministic oracle.
//
// Run: node studies/meta-search/replay-seam.mjs --cell lifecycle-d3 --draws d3
//      node studies/meta-search/replay-seam.mjs --cell lifecycle-d2 --draws d8
//      node studies/meta-search/replay-seam.mjs --cell approval-d3  --draws d2
//      node studies/meta-search/replay-seam.mjs --cell lifecycle-d1 --draws d7   (the ambiguous cell)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { makeGatewayInvoke } from '../../runner/model-client.mjs';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { runSeamGate, resolveSeamProfile } from './src/seam-gate.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const DUMP_ROOT = path.join(HERE, 'runs', 'dump-ladder');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const CELL = arg('cell', 'lifecycle-d3');
const DRAWS = arg('draws', 'd3').split(',').map((s) => s.trim()).filter(Boolean);
const REPAIRS = Math.max(0, parseInt(arg('repair', '2'), 10));   // matches the ladder's REPAIR default
const GATE = { kind: 'deterministic', repairDepth: REPAIRS };

const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';
const chunkPrompt = (preamble, skeleton, surfaceText) => ['## Shared context (every surface uses this)', preamble, skeleton ? `\n${skeleton}` : '', '\n## Your task', surfaceText].join('\n');

function epicSpec(id) {
  if (id.startsWith('membership-d')) { const D = id.split('-d')[1]; return { dir: path.join(BUILD_GAP, 'epics', `scale-d${D}`), testsPath: path.join(HERE, 'gates', 'lib', `oracle2-tests-d${D}.mjs`) }; }
  return { dir: path.join(HERE, 'epics', id), testsPath: path.join(HERE, 'epics', id, 'tests.mjs') };
}

function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rseam-'));
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

const rate = (b) => (b && b.total ? b.pass / b.total : 0);
const pct = (b) => `${(rate(b) * 100).toFixed(0)}%`;
const failWhy = (g) => [...((g.integration?.fails) || []), ...((g.crosscut?.fails) || [])].map((f) => String(f.why).split('\n')[0].slice(0, 72)).slice(0, 6);

async function main() {
  const spec = epicSpec(CELL);
  const preamble = fs.readFileSync(path.join(spec.dir, 'preamble.md'), 'utf8');
  const skeleton = fs.existsSync(path.join(spec.dir, 'skeleton.md')) ? fs.readFileSync(path.join(spec.dir, 'skeleton.md'), 'utf8') : '';
  const tests = await import(url.pathToFileURL(spec.testsPath).href);
  const order = Array.isArray(tests.EXPECTS) ? tests.EXPECTS.slice() : [];
  const grade = (files) => evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: spec.testsPath });

  console.log(`REPLAY-SEAM — cell=${CELL} draws=${DRAWS.join(',')} repairDepth=${REPAIRS} (LIVE route-back)\n`);
  for (const d of DRAWS) {
    const rawDir = path.join(DUMP_ROOT, `${CELL}-${d}`, 'raw');
    if (!fs.existsSync(rawDir)) { console.log(`  ${d}: NO DUMP at ${rawDir}`); continue; }
    const files = {};
    for (const s of order) { const f = path.join(rawDir, `${s}.mjs`); if (fs.existsSync(f)) files[s] = fs.readFileSync(f, 'utf8'); }
    const profile = resolveSeamProfile(skeleton, order);
    const prompts = Object.fromEntries(order.map((s) => {
      const sf = path.join(spec.dir, 'surfaces', `${s}.md`);
      return [s, fs.existsSync(sf) ? chunkPrompt(preamble, skeleton, fs.readFileSync(sf, 'utf8')) : ''];
    }));

    const gRaw = await grade(files);
    const before = { ...files };
    const seam = await runSeamGate({ surfaces: order, files, prompts, skeleton, baseModel: preamble, gate: GATE, rebuild });
    const gFix = await grade(files);
    const changed = order.filter((s) => before[s] !== files[s]);
    const dI = rate(gFix.integration) - rate(gRaw.integration), dC = rate(gFix.crosscut) - rate(gRaw.crosscut);
    const verdict = (dI > 0 || dC > 0) ? `▲ LIFTED (Δi${(dI * 100).toFixed(0)} Δc${(dC * 100).toFixed(0)})` : (dI < 0 || dC < 0 ? '⛔ REGRESSION' : '— no change');

    console.log(`  [${d}] profile=${profile ? `${profile.topology}/${profile.store} w${profile.writers.length}/r${profile.readers.length}` : 'NONE'}  pairs=${seam.pairs} mismatches=${seam.mismatches} repairs=${seam.repairs} leak=${seam.leak}`);
    console.log(`       raw:   i ${pct(gRaw.integration)}  c ${pct(gRaw.crosscut)}   fails: ${JSON.stringify(failWhy(gRaw))}`);
    console.log(`       seam:  i ${pct(gFix.integration)}  c ${pct(gFix.crosscut)}   fails: ${JSON.stringify(failWhy(gFix))}`);
    console.log(`       rewritten: ${JSON.stringify(changed)}   VERDICT: ${verdict}`);
    // does any `.get/.has/.set is not a function` (container drift) survive?
    const drift = failWhy(gFix).filter((w) => /is not a function/.test(w));
    if (drift.length) console.log(`       ⚠ container-drift SURVIVES after live seam-gate: ${JSON.stringify(drift)}`);
    console.log();
  }
}

main().catch((e) => { console.error(e?.stack || e); process.exit(1); });
