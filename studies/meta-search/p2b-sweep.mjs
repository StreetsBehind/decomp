#!/usr/bin/env node
// P2b — the SCALE SWEEP (the win-condition measurement). P2a confirmed the cross-surface integration-gate
// recovers the membership seam (INTEG 0%→100% at N=5, +61pp at N=13). P2b asks the program's headline
// question with the gate switched on across the size ladder:
//
//   does the HYBRID (cheap coding + a frozen skeleton + the deterministic integration-gate) HOLD the lethal
//   quadrant (crosscut+integration) where bare-opus ERODES and gets pricier (N≥13), at ≤ cost?
//
// The cached all-frontier reference is MCOH25 Result 4 (the bar this whole program is measured against):
//   N   bare-opus EPIC✓  X-CUT  $/epic   harness(no-gate) EPIC✓  X-CUT
//   5   100%             100%   $0.278   80%                     97%
//   13  33%              78%    $0.387   20%                     93%
//   17  0%               80%    $0.431   0%                      95%
// The bare harness already HOLDS X-CUT (95%) but its EPIC✓ collapses — its weak spot at scale is INTEGRATION,
// exactly what the gate targets. This sweep measures harness+GATE crosscut/integration/EPIC across the ladder.
//
// MEASUREMENT = PAIRED, like the P2a probe (build each surface ONCE per round, grade OFF, copy+gate+grade ON →
// the gate's effect with zero build-noise; deterministic gate only — cheap-judge was P2a-null). COST is
// ANALYTIC, not re-measured: all builds/repairs run on the free gateway ($0); the skeleton is CACHED so its
// authoring cost is the metered MCOH25 anchor (fusion $0, opus $0.395, amortizable over M same-topology epics).
// Run: node studies/meta-search/p2b-sweep.mjs [--epics scale-d1,..,scale-d4] [--tiers fusion,opus] [--rounds 3]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { makeGatewayInvoke } from '../../runner/model-client.mjs';
import { stampEpoch, stampEach } from './src/eval-epoch.mjs';
import { resolveSkeleton } from './src/skeleton-author.mjs';
import { runIntegrationGate } from './src/integration-gate.mjs';
import { buildScorecard } from './src/scorecard.mjs';
import { makeLedger } from './src/ledger.mjs';
import { defaultGenome, cloneGenome } from './src/genome.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1]; const eq = process.argv.find((a) => a.startsWith(`--${n}=`)); return eq ? eq.slice(n.length + 3) : d; };
const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';

// MCOH25 Result 4 — the cached all-frontier bar + the bare (no-gate) harness, per N.
const BAR = {
  'scale-d1': { N: 5,  opusEpic: 1.00, opusXcut: 1.00, opusCost: 0.278, harnessEpic: 0.80, harnessXcut: 0.97 },
  'scale-d2': { N: 9,  opusEpic: 0.67, opusXcut: 0.94, opusCost: 0.361, harnessEpic: 0.60, harnessXcut: 0.97 },
  'scale-d3': { N: 13, opusEpic: 0.33, opusXcut: 0.78, opusCost: 0.387, harnessEpic: 0.20, harnessXcut: 0.93 },
  'scale-d4': { N: 17, opusEpic: 0.00, opusXcut: 0.80, opusCost: 0.431, harnessEpic: 0.00, harnessXcut: 0.95 },
};

function loadFixture(epic) {
  const dir = path.join(BUILD_GAP, 'epics', epic);
  return { dir, testsPath: path.join(dir, 'tests.mjs'), preamble: fs.readFileSync(path.join(dir, 'preamble.md'), 'utf8') };
}
async function cellNamesFor(testsPath) {
  const t = await import(url.pathToFileURL(testsPath).href);
  const nm = (a) => (Array.isArray(a) ? a.map((x) => x.name) : []);
  return { wire: Array.isArray(t.EXPECTS) ? t.EXPECTS.slice() : [], happy: nm(t.happy), crosscut: nm(t.crosscut), integration: nm(t.integration) };
}
const chunk = (pre, skel, s) => ['## Shared context (every surface uses this)', pre, skel ? `\n${skel}` : '', '\n## Your task', s].join('\n');
function isValid(code, surface, t = 8000) {
  const V = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'swval-'));
  const f = path.join(d, `${surface}.mjs`); fs.writeFileSync(f, code);
  return new Promise((res) => { const c = spawn(process.execPath, [V, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } }); let done = false; const fin = (ok) => { if (done) return; done = true; clearTimeout(t2); try { fs.rmSync(d, { recursive: true, force: true }); } catch {} res(ok); }; const t2 = setTimeout(() => { try { c.kill('SIGKILL'); } catch {} fin(false); }, t); c.on('close', (x) => fin(x === 0)); c.on('error', () => fin(false)); });
}
async function pool(items, limit, fn) { const out = new Array(items.length); let next = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { for (;;) { const i = next++; if (i >= items.length) return; out[i] = await fn(items[i], i); } })); return out; }
async function draw(invoke, prompt, surface, maxAttempts) { for (let a = 1; a <= maxAttempts; a++) { let g; try { g = await invoke({ prompt, system: SYS_ONE, model: null }); } catch { continue; } if (await isValid(g.text, surface)) return g.text; } return ''; }
async function grade(evaluateEpic, epic, cellNames, files) {
  const run = await evaluateEpic({ mode: 'isolated', files, testsPath: path.join(BUILD_GAP, 'epics', epic, 'tests.mjs') });
  const sc = buildScorecard({ genome: null, genomeHash: 'sweep', epics: [{ name: epic, cellNames, runs: [run] }], ledger: makeLedger() });
  const b = sc.perEpic[epic].buckets; const frac = (x) => (x.total ? x.pass / x.total : 1);
  return { xcut: frac(b.crosscut), integ: frac(b.integration), epicOk: sc.perEpic[epic].epicCheck ? 1 : 0 };
}
const pct = (x) => (x == null ? 'n/a' : `${(x * 100).toFixed(0)}%`);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

async function sweepCell(invoke, evaluateEpic, epic, tier, rounds, repairDepth, maxAttempts, conc) {
  const fx = loadFixture(epic);
  const cellNames = await cellNamesFor(fx.testsPath);
  const order = cellNames.wire;
  const g = cloneGenome(defaultGenome()); g.skeletonAuthor = { model: tier, shapesIncluded: true, obligationDepth: 1 };
  const skel = resolveSkeleton(g, epic);
  const cost = (skel.baseUsd || 0);          // analytic: skeleton authoring (cached) + $0 cheap builds/repairs
  const off = { xcut: [], integ: [], epic: [] }, on = { xcut: [], integ: [], epic: [] };
  let mismatches = 0, repairs = 0;
  for (let r = 0; r < rounds; r++) {
    const base = {}, prompts = {};
    await pool(order, conc, async (s) => { const txt = fs.readFileSync(path.join(fx.dir, 'surfaces', `${s}.md`), 'utf8'); const p = chunk(fx.preamble, skel.text, txt); prompts[s] = p; const code = await draw(invoke, p, s, maxAttempts); if (code) base[s] = code; });
    const o = await grade(evaluateEpic, epic, cellNames, { ...base }); off.xcut.push(o.xcut); off.integ.push(o.integ); off.epic.push(o.epicOk);
    const files = { ...base };
    const gr = await runIntegrationGate({ surfaces: order, files, prompts, skeleton: skel.text, baseModel: fx.preamble, gate: { kind: 'deterministic', repairDepth }, rebuild: (s, rp) => draw(invoke, rp, s, maxAttempts), judgeInvoke: (a) => invoke(a) });
    mismatches += gr.mismatches; repairs += gr.repairs;
    const n = await grade(evaluateEpic, epic, cellNames, files); on.xcut.push(n.xcut); on.integ.push(n.integ); on.epic.push(n.epicOk);
  }
  const agg = (d) => ({ xcut: mean(d.xcut), integ: mean(d.integ), epic: mean(d.epic) });
  return { epic, N: BAR[epic]?.N, tier, cost, rounds, mismatches, repairs, off: agg(off), on: agg(on) };
}

async function main() {
  const epics = (arg('epics', 'scale-d1,scale-d2,scale-d3,scale-d4')).split(',');
  const tiers = (arg('tiers', 'fusion,opus')).split(',');
  const rounds = Number(arg('rounds', 3));
  const repairDepth = Number(arg('repair', 2));
  const maxAttempts = Number(arg('retry', 2));
  const timeoutMs = Number(arg('timeout', 60000)); // slow free-pool routes fail fast → retry picks another
  const conc = Number(arg('conc', 5));
  const started = new Date().toISOString();
  const lines = []; const log = (s) => { console.log(s); lines.push(s); };
  log(`\n=== Meta-search P2b SCALE SWEEP — harness+integration-gate vs bare-opus (paired, ${rounds} rounds, deterministic gate) ===\n(${started})`);
  log(`question: does the hybrid HOLD the lethal quadrant where bare-opus erodes (N≥13), at ≤ cost?\n`);
  log(`(gateway timeout ${timeoutMs}ms, concurrency ${conc})\n`);
  const gateway = makeGatewayInvoke({ timeoutMs });
  const evaluateEpic = (await import('../build-gap/lib/epic-sandbox.mjs')).evaluateEpic;
  const rows = [];
  for (const epic of epics) {
    const bar = BAR[epic] || {};
    log(`--- ${epic} (N=${bar.N}) — bare-opus bar: EPIC✓ ${pct(bar.opusEpic)}, X-CUT ${pct(bar.opusXcut)}, $${bar.opusCost?.toFixed(3)}; bare-harness(no-gate) EPIC✓ ${pct(bar.harnessEpic)} X-CUT ${pct(bar.harnessXcut)} ---`);
    for (const tier of tiers) {
      const c = await sweepCell(gateway, evaluateEpic, epic, tier, rounds, repairDepth, maxAttempts, conc);
      rows.push(c);
      log(`  ${tier}-skel: gate OFF X-CUT ${pct(c.off.xcut)} INTEG ${pct(c.off.integ)} EPIC✓ ${pct(c.off.epic)}  →  gate ON X-CUT ${pct(c.on.xcut)} INTEG ${pct(c.on.integ)} EPIC✓ ${pct(c.on.epic)}  (Δinteg ${((c.on.integ - c.off.integ) * 100).toFixed(0)}pp; mm ${c.mismatches}, rep ${c.repairs})  cost $${c.cost.toFixed(3)} (M=1)`);
    }
    log('');
  }

  const D = 0.05;
  log(`================================================================`);
  log(`P2b SWEEP — lethal-quadrant-at-≤-cost (provisional vs the opus-whole proxy; δ=${D}, cost at M=1 & amortized M=12):`);
  for (const r of rows) {
    const bar = BAR[r.epic];
    const xcutHold = r.on.xcut >= bar.opusXcut - D;
    const integRecovered = (r.on.integ - r.off.integ) > D;
    const costM12 = r.cost / 12;
    const cheaperM1 = r.cost < bar.opusCost - 1e-9, cheaperM12 = costM12 < bar.opusCost - 1e-9;
    const win = xcutHold && cheaperM1;
    log(`  N=${r.N} ${r.tier}+gate: X-CUT ${pct(r.on.xcut)} vs opus ${pct(bar.opusXcut)} ${xcutHold ? '✓' : '✗'}; INTEG ${pct(r.on.integ)} (gate ${(r.on.integ - r.off.integ) >= 0 ? '+' : ''}${((r.on.integ - r.off.integ) * 100).toFixed(0)}pp ${integRecovered ? '✓' : ''}); EPIC✓ ${pct(r.on.epic)} vs opus ${pct(bar.opusEpic)}; $${r.cost.toFixed(3)}/M12 $${costM12.toFixed(3)} vs $${bar.opusCost.toFixed(3)} ${cheaperM1 ? '✓M1' : cheaperM12 ? '✓M12' : '✗'} → ${win ? 'WIN (X-CUT-hold + cheaper)' : cheaperM1 || cheaperM12 ? 'cheaper, check X-CUT' : 'no win'}`);
  }
  log(`(X-CUT-hold = within δ of bare-opus; the full lethal-quadrant win also needs bare-opus per-bucket INTEG`);
  log(` — the routed-baseline workstream — and the sequestered TEST at P3. Cost = opus-whole proxy → provisional.)`);
  log(`================================================================`);
  const outDir = path.join(HERE, 'runs'); fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'p2b-sweep.json'), JSON.stringify(stampEpoch({ phase: 'P2b-sweep', started, finishedAt: new Date().toISOString(), rounds, epics, tiers, bar: BAR, rows: stampEach(rows) }), null, 2) + '\n');
  log(`\nwrote studies/meta-search/runs/p2b-sweep.json`);
}
main().catch((e) => { console.error('P2b sweep error:', e); process.exit(1); });
