#!/usr/bin/env node
// PHASE −1 — TWO-AXIS variance characterization harness (RUN-FOR-DAYS-PLAN.md "BUILD, in order" #3).
//
// Characterizes the post-output-QA-stack worst-of-K (raw-min) metric on the harness we ALREADY have
// (coevo-rung1.mjs with the FULL stack), so we know whether the metric is rankable above its own instability
// BEFORE paying to build the search. It does NOT touch the frozen tree or the metric path — it WRAPS
// coevo-rung1.mjs (spawns it per rep/cell) and adds the labeler + live repair micro-arm on top.
//
// TWO AXES (gate GO on the LARGER instability):
//   • BUILD-DRAW axis (temporal drift). Per cell, ≥3 reps × K=8 full-stack, interleaved cell order. Each rep
//     yields one worst-of-K (raw-min) post-stack value → within-block raw-min SD. Block-to-block drift needs a
//     SECOND temporally separated block (run `--block B` a later session) — Phase −1 spans sessions BY DESIGN.
//   • REPAIR-DRAW axis (route-luck). On each block's worst draw, re-run the MODEL route-back r≈3× (the labeler's
//     model axis IS the micro-arm) → repair-route spread. This replaces the unmeasurable "best-of-N stabilizes
//     it" clause (best-of-N is OFF here — not built).
//
// INSTABILITY BAND = max(2×within-block SD, block-to-block drift, repair-route spread), conservative.
// GO/HALT is NOT applied here (it needs both blocks). Block A reports the within-block + repair-route
// components and the replay-anchored label of each worst draw; the band + GO/HALT finalize after block B.
//
// PROVISIONAL until the check-of-checks manifest is GREEN (gates/phase-neg1-manifest.mjs) — enforced below.
//
// Run: node studies/meta-search/phase-neg1.mjs --probe                 # B1 throughput probe first
//      node studies/meta-search/phase-neg1.mjs --block A               # block A (this session)
//      node studies/meta-search/phase-neg1.mjs --block B               # block B (a LATER session/day)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { makeGatewayInvoke } from '../../runner/model-client.mjs';
import { loadEpicCtx, readDrawFiles, labelDraw } from './src/label-draw.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const COEVO = path.join(HERE, 'coevo-rung1.mjs');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);

const BLOCK = (arg('block', 'A') || 'A').toUpperCase();
const REPS = Math.max(1, parseInt(arg('reps', '3'), 10) || 3);
const K = Math.max(1, parseInt(arg('k', '8'), 10) || 8);
const CELLS = arg('cells', 'quota-d1,approval-d1,membership-d1').split(',').map((s) => s.trim()).filter(Boolean);
const MICRO_REPS = Math.max(1, parseInt(arg('microreps', '3'), 10) || 3);
const MOCK = has('mock');
const STACK = ['--repairgate', '--shapegate', '--contractgate', '--persistgate', '--seamgate'];
const SURF = { 'quota-d1': 4, 'approval-d1': 4, 'membership-d1': 5, 'membership-d3': 13 };

const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';

// ── instrument precondition: the check-of-checks manifest MUST be green, else GO/HALT is ABSENT, not provisional.
function manifestGreen() {
  const r = spawnSyncNode([path.join(HERE, 'gates', 'phase-neg1-manifest.mjs')]);
  return r.code === 0;
}
function spawnSyncNode(args) {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}

// ── spawn one coevo-rung1 run; return { code, wallMs, json } (json parsed from --out file). ──────────────
function runCoevo({ cells, k, dumpDir, outName, mock }) {
  const args = [COEVO, '--k', String(k), '--epics', cells, ...STACK, '--out', outName];
  if (dumpDir) args.push('--dump', dumpDir);
  if (mock) args.push('--mock');
  const t0 = Date.now();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_OPTIONS: '' } });
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      const wallMs = Date.now() - t0;
      let json = null;
      try { json = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', outName.endsWith('.json') ? outName : `${outName}.json`), 'utf8')); } catch {}
      resolve({ code, wallMs, json, out, err });
    });
    child.on('error', () => resolve({ code: -1, wallMs: Date.now() - t0, json: null, out, err }));
  });
}

// reconstructed gateway-call estimate from a coevo epic JSON (lower bound: 1 build call/surface/draw + repairs).
function estCalls(epic) {
  if (!epic) return 0;
  const surf = SURF[epic.id] || epic.surfaces || 4;
  let calls = surf * (epic.draws ? epic.draws.length : K);
  for (const d of epic.draws || []) {
    calls += (d.repair && d.repair.repairs) || 0;
    calls += (d.shape && d.shape.repairs) || 0;
    calls += (d.contract && d.contract.repairs) || 0;
    calls += (d.gate && d.gate.repairs) || 0;
  }
  return calls;
}

// ── live model route-back for the micro-arm (mirrors replay-repair.mjs: re-prompt the cheap pool, keep the
//    first structurally-valid draw). $0 (free gateway). ───────────────────────────────────────────────────
function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pn1-'));
  const f = path.join(dir, `${surface}.mjs`); fs.writeFileSync(f, code);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    let done = false; const fin = (ok) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(ok); };
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} fin(false); }, timeoutMs);
    child.on('close', (c) => fin(c === 0)); child.on('error', () => fin(false));
  });
}
function makeLiveRebuild(invoke) {
  return async (surface, rp) => {
    for (let a = 0; a < 2; a++) {
      let g; try { g = await invoke({ prompt: rp, system: SYS_ONE, model: null }); } catch { continue; }
      if (await isValidSurface(g.text, surface)) return g.text;
    }
    return '';
  };
}

// ── stats ──────────────────────────────────────────────────────────────────────────────────────────────
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
function sd(xs) { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); }
const range = (xs) => (xs.length ? Math.max(...xs) - Math.min(...xs) : 0);
const r3 = (x) => +x.toFixed(3);

// ── PROBE (B1 throughput): one K=1 d1 full-stack + one N=13 (membership-d3) K=1 full-stack. ──────────────
async function probe() {
  console.log('PHASE −1 PROBE (B1 throughput) — K=1 full-stack live\n');
  const out = { generatedAt: null, stack: STACK, samples: [] };
  for (const [tag, cell] of [['d1-quota', 'quota-d1'], ['N13-membership-d3', 'membership-d3']]) {
    const r = await runCoevo({ cells: cell, k: 1, dumpDir: null, outName: `_probe-${tag}.json`, mock: MOCK });
    const epic = r.json && r.json.epics && r.json.epics[0];
    const sample = { tag, cell, surfaces: SURF[cell], k: 1, wallMs: r.wallMs, estGatewayCalls: estCalls(epic), code: r.code, final: epic ? { c: epic.final.crosscut.worst, i: epic.final.integration.worst } : null };
    out.samples.push(sample);
    console.log(`  ${tag} (${cell}, ${SURF[cell]} surfaces): ${(r.wallMs / 1000).toFixed(1)}s  ~${sample.estGatewayCalls} gateway calls  final c${epic ? (epic.final.crosscut.worst * 100) | 0 : '?'}/i${epic ? (epic.final.integration.worst * 100) | 0 : '?'}`);
    try { fs.unlinkSync(path.join(HERE, 'runs', `_probe-${tag}.json`)); } catch {}
  }
  // extrapolate the full block wall-clock from the d1 sample.
  const d1 = out.samples.find((s) => s.tag === 'd1-quota');
  if (d1) {
    const perDrawMs = d1.wallMs; // K=1 ≈ one draw
    const d1Cells = CELLS.filter((c) => c.endsWith('-d1')).length || CELLS.length;
    const estBlockMs = perDrawMs * K * REPS * d1Cells;
    out.estBlock = { perDrawMs, K, reps: REPS, cells: d1Cells, estBlockMin: +(estBlockMs / 60000).toFixed(1) };
    console.log(`\n  EXTRAPOLATION: ~${(perDrawMs / 1000).toFixed(1)}s/draw × K${K} × ${REPS}reps × ${d1Cells}cells ≈ ${out.estBlock.estBlockMin} min for block ${BLOCK} (d1 cells; sequential).`);
  }
  fs.writeFileSync(path.join(HERE, 'runs', 'phase-neg1-probe.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`\nwrote runs/phase-neg1-probe.json`);
  return out;
}

// ── BLOCK: ≥REPS reps × cells (interleaved), K=8 full-stack; then label+micro-arm each cell's worst draw. ──
async function runBlock() {
  if (!MOCK && !manifestGreen()) { console.error('❌ check-of-checks manifest is NOT green — aborting (a guard that cannot fire is ABSENT).'); process.exit(1); }
  const blockDir = path.join(HERE, 'runs', 'dump', `phase-neg1-${BLOCK}`);
  fs.mkdirSync(blockDir, { recursive: true });
  const outFile = path.join(HERE, 'runs', `phase-neg1-${BLOCK}.json`);
  const result = { block: BLOCK, startedAt: null, mock: MOCK, k: K, reps: REPS, cells: CELLS, stack: STACK, microReps: MICRO_REPS, perCell: {}, status: 'running' };
  for (const c of CELLS) result.perCell[c] = { reps: [], worstDraw: null, label: null };
  const flush = () => fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n');
  flush();

  console.log(`PHASE −1 BLOCK ${BLOCK} — ${REPS} reps × [${CELLS.join(', ')}] × K=${K} full-stack ${MOCK ? '(MOCK)' : 'LIVE'}, interleaved\n`);
  // BUILD-DRAW axis: interleaved reps (rotate cell order per rep so each cell's reps spread across the window).
  for (let rep = 1; rep <= REPS; rep++) {
    const order = CELLS.map((_, i) => CELLS[(i + rep - 1) % CELLS.length]); // rotation = interleave
    for (const cell of order) {
      const dumpDir = path.join(blockDir, `${cell}-rep${rep}`);
      const outName = `_pn1-${BLOCK}-${cell}-rep${rep}.json`;
      process.stdout.write(`  rep ${rep} ${cell} … `);
      const r = await runCoevo({ cells: cell, k: K, dumpDir, outName, mock: MOCK });
      const epic = r.json && r.json.epics && r.json.epics[0];
      if (!epic) { console.log(`FAILED (code ${r.code}) ${r.err.slice(0, 200)}`); result.perCell[cell].reps.push({ rep, code: r.code, error: (r.err || '').slice(0, 300) }); flush(); continue; }
      const perDraw = epic.draws.map((d, idx) => ({ idx, rawC: d.raw.crosscut, rawI: d.raw.integration, finalC: d.final.crosscut, finalI: d.final.integration, missing: d.missingDraws, routes: d.routes, repairFired: !!(d.repair && d.repair.surfacesFlagged), regressions: (d.final.integration < d.raw.integration || d.final.crosscut < d.raw.crosscut), dumpDir: path.join(dumpDir, `${cell}-d${idx + 1}`) }));
      const rec = { rep, dumpDir, outName, wallMs: r.wallMs, worstOfK: { c: epic.final.crosscut.worst, i: epic.final.integration.worst }, rawWorstOfK: { c: epic.raw.crosscut.worst, i: epic.raw.integration.worst }, estGatewayCalls: estCalls(epic), routeDiversity: epic.routeDiversity, perDraw };
      result.perCell[cell].reps.push(rec);
      console.log(`${(r.wallMs / 1000).toFixed(0)}s  worst-of-K final c${(rec.worstOfK.c * 100) | 0}/i${(rec.worstOfK.i * 100) | 0}  (raw c${(rec.rawWorstOfK.c * 100) | 0}/i${(rec.rawWorstOfK.i * 100) | 0})  ~${rec.estGatewayCalls} calls`);
      flush();
    }
  }

  // within-block raw-min SD + REPAIR-DRAW micro-arm (label the worst draw across reps, live model route-back).
  console.log('\nPHASE −1 BLOCK — within-block SD + repair-route micro-arm (live labeler on each worst draw):');
  const invoke = MOCK ? null : makeGatewayInvoke({ timeoutMs: 120000 });
  const liveRebuild = invoke ? makeLiveRebuild(invoke) : (async () => '');
  for (const cell of CELLS) {
    const pc = result.perCell[cell];
    const okReps = pc.reps.filter((x) => x.worstOfK);
    if (!okReps.length) { console.log(`  ${cell}: no successful reps`); continue; }
    const wI = okReps.map((x) => x.worstOfK.i), wC = okReps.map((x) => x.worstOfK.c);
    pc.withinBlock = {
      worstOfK_i: wI, worstOfK_c: wC,
      mean_i: r3(mean(wI)), sd_i: r3(sd(wI)), range_i: r3(range(wI)), twoSD_i: r3(2 * sd(wI)),
      mean_c: r3(mean(wC)), sd_c: r3(sd(wC)), range_c: r3(range(wC)), twoSD_c: r3(2 * sd(wC)),
    };
    // worst draw across all reps (min final integration, then crosscut).
    const allDraws = okReps.flatMap((x) => x.perDraw);
    const worst = allDraws.slice().sort((a, b) => (a.finalI - b.finalI) || (a.finalC - b.finalC))[0];
    pc.worstDraw = { dumpDir: worst.dumpDir, finalC: worst.finalC, finalI: worst.finalI, rawC: worst.rawC, rawI: worst.rawI, missing: worst.missing, routes: worst.routes };
    // label + live micro-arm spread on the worst draw.
    try {
      const ctx = await loadEpicCtx(cell);
      const files = readDrawFiles(worst.dumpDir, ctx.order);
      const lab = await labelDraw({ ctx, files, rebuildModel: liveRebuild, reps: MICRO_REPS });
      pc.label = { bucket: lab.bucket, reachedPass: lab.reachedPass, raw: { c: r3(lab.raw.c), i: r3(lab.raw.i) }, det: lab.det ? { c: r3(lab.det.c), i: r3(lab.det.i), moved: lab.det.moved } : null, floor: lab.floor, advisory: lab.advisory, repairSpread: lab.repairSpread, leak: lab.leak };
      const rs = lab.repairSpread;
      pc.repairRouteSpread_i = rs ? rs.iSpread.range : 0;
      pc.repairRouteSpread_c = rs ? rs.cSpread.range : 0;
      // partial instability band (block A: within-block + repair-route; block-to-block drift deferred to block B).
      pc.instabilityBandPartial = { within2SD_i: pc.withinBlock.twoSD_i, repairSpread_i: pc.repairRouteSpread_i, partialBand_i: r3(Math.max(pc.withinBlock.twoSD_i, pc.repairRouteSpread_i)), note: 'PARTIAL — block-to-block drift requires block B (later session).' };
      console.log(`  ${cell}: worst-of-K i [${wI.map((x) => (x * 100) | 0).join(',')}] SD=${pc.withinBlock.sd_i} 2SD=${pc.withinBlock.twoSD_i} | worst draw final c${(worst.finalC * 100) | 0}/i${(worst.finalI * 100) | 0} → LABEL=${lab.bucket}${rs ? ` (model-spread i±${rs.iSpread.range}, ${rs.movedReps}/${rs.reps} moved)` : ''} advisory=${lab.advisory ? lab.advisory.lean : '-'}`);
    } catch (e) {
      pc.label = { error: String(e && e.message || e) };
      console.log(`  ${cell}: LABEL FAILED — ${e && e.message}`);
    }
    flush();
  }
  result.status = 'complete';
  flush();
  console.log(`\nwrote ${path.relative(ROOT, outFile)}`);
  console.log(`\nNOTE: block ${BLOCK} reports within-block SD + repair-route spread + worst-draw labels only.`);
  console.log('The block-to-block drift axis and the GO/HALT rule require a SECOND temporally separated block.');
}

async function main() {
  if (has('probe')) { await probe(); return; }
  await runBlock();
}
main().catch((e) => { console.error('phase-neg1 FAILED:', e); process.exit(1); });
