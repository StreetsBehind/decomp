#!/usr/bin/env node
// LEVER-A SCOPING DIAGNOSIS ($0, no gateway) — attribute the non-membership integration stall.
//
// The ladder ran WITH --seamgate, i.e. the GENERALIZED seam-gate (src/seam-gate.mjs) — Mode-A (uninitialized
// shared store) + Mode-B (representation drift), keyed off the PUBLIC declared store — was ON for
// approval/lifecycle/quota, and integration still stalled at i42-63 (LADDER-RESULTS.md). This script replays
// the EXACT committed raw draws (runs/dump-ladder/<cell>-d<k>/raw/) through the seam-gate's DETERMINISTIC
// detection + surgical-init repair (NO model rebuild → $0, no non-stationarity), grades raw vs after-seam with
// the same deterministic oracle, and classifies the residual into:
//   - profile-not-resolved / Mode-A|B coverage gap  -> ADMISSIBLE Lever A (surfaces-only, buildable)
//   - semantics (conservation / approval-idempotency / ordering) -> Lever B / the (C) crux (modeCIssues hook)
// The headline question: on the integration-GATING (worst-of-K) draw of each non-membership cell, does the
// generalized seam-gate even FIND a profile+pairs, and is the residual a coverage gap (A) or semantics (B)?
//
// Oracle-blindness: the seam-gate detection reads ONLY public inputs (skeleton + emitted code); grading uses
// the harness's deterministic oracle (the normal measurement path). This is research-lead diagnostic tooling,
// not a graded candidate — no K3 surface.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { runSeamGate, resolveSeamProfile } from './src/seam-gate.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const DUMP_ROOT = path.join(HERE, 'runs', 'dump-ladder');
const K = 8;

// FLOOR predicate (Rule 1) — a draw is admissible iff every surface parses + exports its required shape
// (validate-surface), matching the committed --floor worst-of-K. Below-floor draws are EXCLUDED here too, so
// the gating draw we attribute is the same above-floor real-but-broken draw the ladder verdict gated on.
function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diag-'));
  const f = path.join(dir, `${surface}.mjs`); fs.writeFileSync(f, code);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    let done = false; const fin = (ok) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(ok); };
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} fin(false); }, timeoutMs);
    child.on('close', (c) => fin(c === 0)); child.on('error', () => fin(false));
  });
}
const CELLS = [
  'approval-d1', 'approval-d2', 'approval-d3', 'approval-d4',
  'lifecycle-d1', 'lifecycle-d2', 'lifecycle-d3', 'lifecycle-d4',
  'quota-d1', 'quota-d2', 'quota-d3', 'quota-d4',
];

// VERBATIM from census-classify.mjs classifyFail (form / semantics / incompetence). Kept inline so the
// diagnosis is self-contained; the cls taxonomy is the program's, not a new one.
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
  if (w.includes('assert.ok') || w.includes('expected truthy') || w.includes('to be truthy')) return { mode: 'return-shape', cls: 'form-inadmissible' };
  return { mode: `other:${String(why || '').slice(0, 36)}`, cls: 'unknown' };
}

function epicSpec(id) {
  if (id.startsWith('membership-d')) { const D = id.split('-d')[1]; return { dir: path.join(BUILD_GAP, 'epics', `scale-d${D}`), testsPath: path.join(HERE, 'gates', 'lib', `oracle2-tests-d${D}.mjs`) }; }
  return { dir: path.join(HERE, 'epics', id), testsPath: path.join(HERE, 'epics', id, 'tests.mjs') };
}
const rate = (b) => (b && b.total ? b.pass / b.total : 0);
const noopRebuild = async () => '';

async function diagDraw(cell, k, spec, preamble, skeleton, order) {
  const rawDir = path.join(DUMP_ROOT, `${cell}-d${k}`, 'raw');
  if (!fs.existsSync(rawDir)) return null;
  const files = {};
  let present = 0;
  for (const s of order) { const f = path.join(rawDir, `${s}.mjs`); if (fs.existsSync(f)) { files[s] = fs.readFileSync(f, 'utf8'); present++; } }
  if (!present) return null;
  // FLOOR: admissible iff all surfaces present AND each passes validate-surface (parse + exports its shape).
  let belowFloor = present < order.length;
  if (!belowFloor) { for (const s of order) { if (!(await isValidSurface(files[s], s))) { belowFloor = true; break; } } }

  const profile = resolveSeamProfile(skeleton, order);
  const gRaw = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: spec.testsPath });

  // deterministic seam-gate, NO model rebuild (surgical Mode-A init only; Mode-B drift detected, not repaired).
  const after = { ...files };
  const seam = await runSeamGate({ surfaces: order, files: after, prompts: {}, skeleton, baseModel: preamble, gate: { kind: 'deterministic', repairDepth: 2 }, rebuild: noopRebuild });
  const gSeam = await evaluateEpic({ mode: 'isolated', files: { ...after }, testsPath: spec.testsPath });

  const integFails = (gSeam.integration?.fails) || [];
  const residual = [...integFails, ...((gSeam.crosscut?.fails) || [])].map((f) => classifyFail(f.why));
  const integResidual = integFails.map((f) => classifyFail(f.why));
  return {
    k, belowFloor,
    integTotal: gSeam.integration?.total || 0,
    profileTopology: profile ? profile.topology : null,
    profileStore: profile ? profile.store : null,
    writers: profile ? profile.writers.length : 0,
    readers: profile ? profile.readers.length : 0,
    pairs: seam.pairs, mismatches: seam.mismatches, repairs: seam.repairs, ranGate: seam.ranGate,
    iRaw: rate(gRaw.integration), iSeam: rate(gSeam.integration),
    cRaw: rate(gRaw.crosscut), cSeam: rate(gSeam.crosscut),
    integResidualClasses: integResidual.map((r) => r.cls),
    integResidualModes: [...new Set(integResidual.map((r) => r.mode))],
    integFailWhy: integFails.map((f) => String(f.why).split('\n')[0].slice(0, 80)).slice(0, 3),
    residualModes: [...new Set(residual.map((r) => r.mode))],
  };
}

async function main() {
  const rows = [];
  for (const cell of CELLS) {
    const spec = epicSpec(cell);
    const preamble = fs.readFileSync(path.join(spec.dir, 'preamble.md'), 'utf8');
    const skeleton = fs.existsSync(path.join(spec.dir, 'skeleton.md')) ? fs.readFileSync(path.join(spec.dir, 'skeleton.md'), 'utf8') : '';
    const tests = await import(url.pathToFileURL(spec.testsPath).href);
    const order = Array.isArray(tests.EXPECTS) ? tests.EXPECTS.slice() : [];

    const draws = [];
    for (let k = 1; k <= K; k++) { const d = await diagDraw(cell, k, spec, preamble, skeleton, order); if (d) draws.push(d); }
    if (!draws.length) { console.log(`${cell}: NO DUMPS`); continue; }

    // worst-of-K AFTER the deterministic seam-gate = the gating draw, over ADMISSIBLE draws on which the
    // oracle actually ran integration tests (integTotal>0). This matches the committed --floor worst-of-K.
    const admissible = draws.filter((d) => !d.belowFloor && d.integTotal > 0);
    const pool = admissible.length ? admissible : draws.filter((d) => d.integTotal > 0);
    if (!pool.length) { console.log(`${cell.padEnd(12)} | NO admissible draw with integration tests (pool-degenerate-ish)`); continue; }
    const gating = pool.reduce((a, b) => (b.iSeam < a.iSeam ? b : a));
    const worstRawI = Math.min(...pool.map((d) => d.iRaw));
    const profResolvedCount = draws.filter((d) => d.profileTopology).length;

    rows.push({ cell, gating, worstRawI, profResolvedCount, nDraws: draws.length, nAdmissible: admissible.length });
    console.log(
      `${cell.padEnd(12)} | ${gating.profileTopology ? `${gating.profileTopology}/${gating.profileStore} w${gating.writers}/r${gating.readers}` : 'NO-PROFILE'}`
      + ` | adm ${admissible.length}/${draws.length}`
      + ` | gate d${gating.k}: i_raw ${(gating.iRaw * 100).toFixed(0)}->i_seam ${(gating.iSeam * 100).toFixed(0)} (pairs ${gating.pairs} mism ${gating.mismatches} rep ${gating.repairs})`
      + ` | integ-residual ${gating.integResidualModes.join(',') || '(none)'} [${[...new Set(gating.integResidualClasses)].join(',') || '-'}]`,
    );
    if (gating.integFailWhy.length) console.log(`             why: ${JSON.stringify(gating.integFailWhy)}`);
  }

  // ---- verdict: how much of the non-membership integration stall is admissible Lever A vs Lever B ----------
  console.log('\n==== SCOPING VERDICT ====');
  for (const r of rows) {
    const g = r.gating;
    const cls = new Set(g.integResidualClasses);
    let bucket;
    if (!g.profileTopology) bucket = 'A: profile-NOT-resolved (coverage gap — admissible, surfaces-only)';
    else if (cls.has('semantics')) bucket = 'B: semantics residual (modeCIssues / the (C) crux)';
    else if (g.iSeam < 1 && (cls.has('form') || cls.has('incompetence'))) bucket = `A?: form/coding residual after seam (${g.integResidualModes.join(',')}) — check if Mode-A/B coverage or (B)-repair`;
    else if (g.iSeam >= 1) bucket = 'OK: seam-gate already closes integration on the gating draw';
    else bucket = `?: ${g.integResidualModes.join(',') || 'no integ fails but i<1'}`;
    console.log(`  ${r.cell.padEnd(12)} -> ${bucket}`);
  }
}

main().catch((e) => { console.error(e?.stack || e); process.exit(1); });
