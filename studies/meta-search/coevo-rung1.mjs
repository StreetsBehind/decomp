#!/usr/bin/env node
// CO-EVOLUTION rung-1 STARTING LINE (COEVOLUTION-SPEC §5 rung 1, §3.2 worst-of-K-across-routes).
//
// The head-to-head (HEAD-TO-HEAD.md) graded the hybrid with a SINGLE gateway draw per surface. Under the
// model-agnostic principle (memory: model-agnostic-and-failure-attribution) a lucky-route 100% is NOT a
// model-agnostic 100% — fitness must be WORST-OF-K ACROSS ROUTES. This harness re-measures the CURRENT
// system (cheap fusion coding + the membership-only integration-gate, UNCHANGED) at K draws per surface and
// reports worst-of-K on the lethal buckets, so we know the honest rung-1 starting line BEFORE expanding the
// genome / generalizing the gate. It answers two questions:
//   (1) Do the head-to-head WINS (membership, lifecycle) survive worst-of-K?  (route-robustness of the wins)
//   (2) How deep are the losses (quota, approval) at worst-of-K, and which LAYER (A/B/C) owns each failure?
//
// It is ADDITIVE — it does not touch the frozen tree (studies/build-gap/) or any committed apparatus; it
// re-uses the exported integration-gate + the frozen evaluateEpic, and replicates head-to-head.mjs's thin
// build/grade path (which is not exported) inside a K-loop. Hybrid-only ⇒ $0 (free gateway). The routed
// baseline is the already-measured reference (100/100 at d1; HEAD-TO-HEAD.md / routed-baseline-live.json) —
// NOT re-run here (it spends real $).
//
// Run:  node studies/meta-search/coevo-rung1.mjs --mock                 # zero-spend wiring dry-run
//       node studies/meta-search/coevo-rung1.mjs                        # LIVE, K=3, the 4 d1 topos, ~$0
//       node studies/meta-search/coevo-rung1.mjs --k 5 --epics quota-d1,approval-d1

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { makeMockInvoke, makeGatewayInvoke } from '../../runner/model-client.mjs';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { runIntegrationGate } from './src/integration-gate.mjs';
import { runSeamGate } from './src/seam-gate.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const MOCK = has('mock');
const K = Math.max(1, parseInt(arg('k', '3'), 10) || 3);                  // worst-of-K draws per epic
const RETRY = Math.max(1, parseInt(arg('retry', '2'), 10) || 2);         // structural-retry attempts per cheap draw
const REPAIR = Math.max(0, parseInt(arg('repair', '2'), 10));            // integration-gate model repairDepth (current membership gate)
const CONC = Math.max(1, parseInt(arg('conc', '6'), 10) || 6);
const CALL_TIMEOUT_MS = Math.max(10000, parseInt(arg('callTimeout', '120000'), 10) || 120000);
// --seamgate swaps the membership-only integration-gate for the GENERALIZED seam-gate (src/seam-gate.mjs),
// so for non-membership topologies raw=gate-OFF and final=gate-ON are PAIRED on the same draws (the
// COEVOLUTION-SPEC §4 generalized-gate validation). Without it, the current membership gate runs (no-ops
// off-membership → raw==final), which measures the honest gate-OFF base rate.
const GATE_FN = has('seamgate') ? runSeamGate : runIntegrationGate;

// The routed all-frontier baseline reference at d1 (already measured live — HEAD-TO-HEAD.md table; NOT re-run).
const BASELINE_D1 = {
  'membership-d1': { c: 1, i: 1, usd: 0.785 },
  'lifecycle-d1': { c: 1, i: 1, usd: 0.701 },
  'quota-d1': { c: 1, i: 1, usd: 0.742 },
  'approval-d1': { c: 1, i: 1, usd: 0.811 },
};
const HYBRID_SKELETON_USD = 0.395; // the shared opus skeleton anchor (both arms pay it)

// seam topology of an epic id (from the diverse-template family); membership = the d1 anchor (scale-d1).
function topologyOf(id) {
  if (id.startsWith('membership')) return 'membership';
  if (id.startsWith('approval')) return 'approval';
  if (id.startsWith('lifecycle')) return 'lifecycle';
  if (id.startsWith('quota')) return 'quota';
  return 'unknown';
}

const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';
const chunkPrompt = (preamble, skeleton, surfaceText) => ['## Shared context (every surface uses this)', preamble, skeleton ? `\n${skeleton}` : '', '\n## Your task', surfaceText].join('\n');

// epic spec / loader — verbatim shape from head-to-head.mjs (membership → scale-d + oracle2; others on-disk).
function epicSpec(id) {
  if (id.startsWith('membership-d')) {
    const D = id.split('-d')[1];
    // depth-matched ORACLE #2: domainsFor(D) schema (d1=5, d2=9, d3=13 surfaces). d1 path is bit-identical to before.
    return { id, dir: path.join(BUILD_GAP, 'epics', `scale-d${D}`), testsPath: path.join(HERE, 'gates', 'lib', `oracle2-tests-d${D}.mjs`) };
  }
  return { id, dir: path.join(HERE, 'epics', id), testsPath: path.join(HERE, 'epics', id, 'tests.mjs') };
}
async function loadEpic(spec) {
  const tests = await import(url.pathToFileURL(spec.testsPath).href);
  const order = Array.isArray(tests.EXPECTS) ? tests.EXPECTS.slice() : [];
  const preamble = fs.readFileSync(path.join(spec.dir, 'preamble.md'), 'utf8');
  const skeleton = fs.existsSync(path.join(spec.dir, 'skeleton.md')) ? fs.readFileSync(path.join(spec.dir, 'skeleton.md'), 'utf8') : '';
  const surfaces = Object.fromEntries(order.map((s) => [s, fs.readFileSync(path.join(spec.dir, 'surfaces', `${s}.md`), 'utf8')]));
  return { order, preamble, skeleton, surfaces };
}

const rate = (b) => (b && b.total ? b.pass / b.total : 1);
const frac = (b) => (b ? `${b.pass}/${b.total}` : '0/0');
const relOf = (g) => ({ crosscut: rate(g.crosscut), integration: rate(g.integration), happy: rate(g.happy) });
const failsOf = (g) => ({ crosscut: (g.crosscut?.fails || []).map((f) => ({ name: f.name, why: f.why })), integration: (g.integration?.fails || []).map((f) => ({ name: f.name, why: f.why })) });

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); } }));
  return out;
}

function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coevo-'));
  const f = path.join(dir, `${surface}.mjs`);
  fs.writeFileSync(f, code);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    let done = false;
    const finish = (ok) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(ok); };
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} finish(false); }, timeoutMs);
    child.on('close', (c) => finish(c === 0));
    child.on('error', () => finish(false));
  });
}

// ONE hybrid draw of a whole epic (identical to head-to-head.runHybrid; the current membership-only gate).
async function runHybridOnce(fx, invoke) {
  const files = {}; const prompts = {}; const perSurface = {}; const routes = [];
  const gateCfg = { kind: 'deterministic', repairDepth: REPAIR };

  const drawSurface = async (prompt, surface) => {
    let attempts = 0, lastTokens = 0, route = null, valid = false, text = '';
    for (let a = 1; a <= RETRY; a++) {
      attempts = a;
      let g; try { g = await invoke({ prompt, system: SYS_ONE, model: null }); } catch { continue; }
      lastTokens = g.outputTokens || 0; if (g.route) route = g.route;
      const ok = await isValidSurface(g.text, surface);
      if (ok) { valid = true; text = g.text; break; }
      text = g.text || text;
    }
    return { text, attempts, valid, tokens: lastTokens, route };
  };

  await pool(fx.order, CONC, async (surface) => {
    const buildPrompt = chunkPrompt(fx.preamble, fx.skeleton, fx.surfaces[surface]);
    prompts[surface] = buildPrompt;
    const r = await drawSurface(buildPrompt, surface);
    files[surface] = r.valid ? r.text : (r.text || '');
    perSurface[surface] = { attempts: r.attempts, valid: r.valid, route: r.route, tokens: r.tokens };
    if (r.route) routes.push(r.route);
  });

  const rawGrade = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: fx.testsPath });
  const gateRes = await GATE_FN({
    surfaces: fx.order, files, prompts, skeleton: fx.skeleton, baseModel: fx.preamble, gate: gateCfg,
    rebuild: async (surface, rp) => (await drawSurface(rp, surface)).text,
    judgeInvoke: (a) => invoke(a),
  });
  const finalGrade = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: fx.testsPath });

  return {
    raw: { ...relOf(rawGrade), buckets: { crosscut: frac(rawGrade.crosscut), integration: frac(rawGrade.integration) }, fails: failsOf(rawGrade) },
    final: { ...relOf(finalGrade), buckets: { crosscut: frac(finalGrade.crosscut), integration: frac(finalGrade.integration) }, fails: failsOf(finalGrade) },
    gate: { fired: gateRes.pairs > 0, pairs: gateRes.pairs, mismatches: gateRes.mismatches, repairs: gateRes.repairs, leak: gateRes.leak },
    routes,
    missingDraws: Object.entries(perSurface).filter(([, v]) => !v.valid).map(([s]) => s),
  };
}

// ---- worst-of-K aggregation + A/B/C credit attribution -------------------------------------------
const min = (xs) => xs.reduce((a, b) => Math.min(a, b), Infinity);
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const max = (xs) => xs.reduce((a, b) => Math.max(a, b), -Infinity);
const stat = (xs) => ({ worst: +min(xs).toFixed(3), median: +med(xs).toFixed(3), best: +max(xs).toFixed(3) });

// Layer attribution (COEVOLUTION-SPEC §1 failure-attribution lens): A=orchestration, B=output-QA, C=boundary.
// Uses the head-to-head layer-2 decomposition rules, evaluated on the WORST-OF-K draw of each bucket.
function attribute(epic) {
  const tags = [];
  const draws = epic.draws;
  const anyMissing = draws.some((d) => d.missingDraws.length);
  const gateNoOp = draws.every((d) => !d.gate.fired);
  const worstFinalC = epic.final.crosscut.worst;
  const worstFinalI = epic.final.integration.worst;
  const worstRawI = epic.raw.integration.worst;
  const gateRecovers = draws.some((d) => rateNum(d.final.integration) > rateNum(d.raw.integration));

  if (anyMissing) tags.push({ layer: 'B', mechanism: 'MISSING_DRAW', note: 'some route emitted no structurally-valid module (verbose reasoning blob / format hazard) → extraction/format-forcing gene' });
  if (worstFinalC < 1) tags.push({ layer: 'B', mechanism: 'CROSSCUT_GAP', note: 'cheap-tier obligation coding-quality gap (the gate never touches crosscut) — may also be (A) over-applied/hallucinated obligation; inspect fails' });
  if (worstFinalI < 1) {
    if (gateNoOp) tags.push({ layer: 'A/B', mechanism: 'SEAM_GATE_NOOP', note: `gate is a no-op on ${epic.topology} (membership-only) → unhandled cross-surface invariant: needs gate-generalization (B) and/or per-surface decomposition (A)` });
    else if (gateRecovers && worstFinalI < 1) tags.push({ layer: 'A/B', mechanism: 'SEAM_GATE_RESIDUAL', note: 'gate fires + recovers some draws but worst-of-K integ still <1 → residual seam not fully handled' });
    else tags.push({ layer: 'A/B', mechanism: 'SEAM_UNRECOVERED', note: 'integ low and gate did not recover it' });
  }
  if (!tags.length) tags.push({ layer: '-', mechanism: 'SOLID', note: 'worst-of-K crosscut+integration both 100% — route-robust pass' });
  return tags;
}
function rateNum(fracStr) { const [a, b] = String(fracStr).split('/').map(Number); return b ? a / b : 1; }

async function main() {
  const ids = (arg('epics', 'membership-d1,lifecycle-d1,quota-d1,approval-d1')).split(',').map((s) => s.trim()).filter(Boolean);
  const invoke = MOCK ? makeMockInvoke({}, { text: 'export function __noop(){ return null; }', outputTokens: 700, usd: 0 }) : makeGatewayInvoke({ timeoutMs: CALL_TIMEOUT_MS });

  console.log(`COEVO RUNG-1 — ${MOCK ? 'MOCK (zero spend)' : 'LIVE'} — worst-of-K=${K} retry=${RETRY} gate.repair=${REPAIR} conc=${CONC} — ${ids.length} epics\n`);
  const out = { mock: MOCK, k: K, retry: RETRY, repair: REPAIR, generatedAt: null, epics: [] };
  const outDir = path.join(HERE, 'runs'); fs.mkdirSync(outDir, { recursive: true });
  const outName = arg('out', MOCK ? 'coevo-rung1-mock.json' : 'coevo-rung1.json');
  const outFile = path.join(outDir, outName.endsWith('.json') ? outName : `${outName}.json`);
  const flush = () => fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n');

  for (const id of ids) {
    const spec = epicSpec(id);
    const fx = await loadEpic(spec);
    const topology = topologyOf(id);
    const t0 = Date.now();
    const draws = [];
    for (let k = 0; k < K; k++) {
      const d = await runHybridOnce(fx, invoke);
      draws.push(d);
      process.stdout.write(`  [${id}] draw ${k + 1}/${K}: raw{c ${(d.raw.crosscut * 100).toFixed(0)} i ${(d.raw.integration * 100).toFixed(0)}} → final{c ${(d.final.crosscut * 100).toFixed(0)} i ${(d.final.integration * 100).toFixed(0)}} ${d.gate.fired ? `gate[${d.gate.pairs}p ${d.gate.repairs}r]` : 'gate[no-op]'} ${d.missingDraws.length ? `MISSING:${d.missingDraws.join(',')}` : ''} routes:${d.routes.join('|') || '?'}\n`);
    }
    const agg = {
      id, topology, surfaces: fx.order.length, K,
      raw: { crosscut: stat(draws.map((d) => d.raw.crosscut)), integration: stat(draws.map((d) => d.raw.integration)) },
      final: { crosscut: stat(draws.map((d) => d.final.crosscut)), integration: stat(draws.map((d) => d.final.integration)) },
      routeDiversity: { distinct: new Set(draws.flatMap((d) => d.routes)).size, routes: [...new Set(draws.flatMap((d) => d.routes))] },
      gate: { firedAnyDraw: draws.some((d) => d.gate.fired), noOp: draws.every((d) => !d.gate.fired) },
      baseline: BASELINE_D1[id] || null,
      hybridUsd: HYBRID_SKELETON_USD,
      draws,
    };
    agg.attribution = attribute(agg);
    // verdict: route-robust WIN iff worst-of-K crosscut & integration both reach the baseline (100% at d1).
    const b = agg.baseline || { c: 1, i: 1 };
    agg.verdict = (agg.final.crosscut.worst >= b.c && agg.final.integration.worst >= b.i) ? 'WIN(worst-of-K)' : 'FAIL(worst-of-K)';
    out.epics.push(agg);
    flush();
    console.log(`  => ${id} [${topology}] worst-of-K final c ${(agg.final.crosscut.worst * 100).toFixed(0)}% i ${(agg.final.integration.worst * 100).toFixed(0)}%  vs baseline ${b.c * 100}/${b.i * 100}  routes:${agg.routeDiversity.distinct}  ${agg.verdict}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    console.log(`     attribution: ${agg.attribution.map((a) => `${a.layer}:${a.mechanism}`).join(', ')}\n`);
  }
  flush();
  console.log(`wrote ${path.relative(ROOT, outFile)}`);
}

main().catch((e) => { console.error('coevo-rung1 FAILED:', e); process.exit(1); });
