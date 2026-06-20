#!/usr/bin/env node
// HEAD-TO-HEAD (P3): the hybrid vs the routed all-frontier baseline, co-measured on IDENTICAL epics by the
// SAME independent oracles. The pre-registered win is parity-at-lower-cost; this harness measures it live.
//
//   ARM A — routed all-frontier baseline: per-surface frontier coding (haiku→CRUD, sonnet→writers, opus→seam).
//   ARM B — hybrid:                       per-surface CHEAP coding (free fusion gateway) + integration-gate.
//
// Both arms inject the SAME on-disk skeleton.md (the opus orchestration artifact) and pay the SAME $0.395 opus
// skeleton anchor, so the ONLY difference is the per-surface CODING TIER. Apples-to-apples (routed-baseline.mjs).
//
// LAYER-2 INSTRUMENTATION (the reason this harness exists, not just a pass/fail): the hybrid is graded at TWO
// stages and every surface is metered, so a shortfall DECOMPOSES:
//   * raw  (the bare cheap draw, after structural retry, BEFORE the gate) — the cheap tier's own reliability.
//   * final (after the integration-gate repair) — the shipped hybrid.
//   * baseline — the frontier comparator.
// Then:  raw.crosscut << baseline  => CODING-QUALITY gap on obligations (the gate never touches crosscut)  → LAYER-2 (gateway/prompt).
//        raw.integ low, final.integ recovers => a SEAM gap the gate HANDLES (no layer-2 needed there).
//        final.integ still << baseline       => RESIDUAL gap → gate-generalization and/or LAYER-2.
//        gate.pairs == 0 (non-membership topo) => the gate is a NO-OP here; raw==final by construction → the
//                                                 whole gap is unhandled-seam = the cheap tier on a novel invariant.
// Per surface we also record: structural-retry attempts, whether a valid draw was produced at all (a missing
// draw = a gateway JSON/format hazard, pure layer-2 signal), output tokens, resolved upstream route, and the
// verbatim oracle fail records ({name, why}) at raw and final (the `why` localises the failure mode).
//
// Run:  node studies/meta-search/head-to-head.mjs --mock                       # zero-spend wiring dry-run
//       node studies/meta-search/head-to-head.mjs --arms hybrid                # hybrid only, LIVE, ~$0 (free gateway)
//       node studies/meta-search/head-to-head.mjs --arms both                  # also re-run the baseline LIVE (spends $)
//       node studies/meta-search/head-to-head.mjs --epics approval-d1,membership-d1 --arms hybrid
//       node studies/meta-search/head-to-head.mjs --settled --k 8                    # P3 prereq: co-measure BOTH arms worst-of-K → runs/head-to-head-settled.json (LIVE $ on the baseline arm; add --mock to dry-run)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { claudeInvoke, makeMockInvoke, makeGatewayInvoke } from '../../runner/model-client.mjs';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { runIntegrationGate } from './src/integration-gate.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const MOCK = has('mock');
const RETRY = Math.max(1, parseInt(arg('retry', '2'), 10) || 2);          // structural-retry attempts per cheap draw
const REPAIR = Math.max(0, parseInt(arg('repair', '2'), 10));            // integration-gate model repairDepth
const CONC = Math.max(1, parseInt(arg('conc', '6'), 10) || 6);
const CALL_TIMEOUT_MS = Math.max(10000, parseInt(arg('callTimeout', '120000'), 10) || 120000); // bound a slow gateway call
const K = Math.max(1, parseInt(arg('k', '1'), 10) || 1);   // worst-of-K draws/epic (settled path only): the gateway re-routes each draw, so K spans the route zoo
const SETTLED = has('settled');
// the full DEV epic ladder for a settled co-measured run — NOT the sequestered TEST ids (sealed until P3).
const DEV_LADDER = [
  'membership-d1', 'membership-d2', 'membership-d3', 'membership-d4', 'membership-d5',
  'approval-d1', 'approval-d2', 'approval-d3', 'approval-d4',
  'lifecycle-d1', 'lifecycle-d2', 'lifecycle-d3', 'lifecycle-d4',
  'quota-d1', 'quota-d2', 'quota-d3', 'quota-d4',
];

// ---- routing (baseline arm) — the cost-optimized roster (verbatim from routed-baseline.mjs) ----------
const TIER = { haiku: 'claude-haiku-4-5', sonnet: 'claude-sonnet-4-6', opus: 'claude-opus-4-8' };
const TIER_PRICE_KEY = { 'claude-haiku-4-5': 'haiku', 'claude-sonnet-4-6': 'sonnet', 'claude-opus-4-8': 'opus' };
const SKELETON_OPUS_ANCHOR_USD = 0.395; // identical orchestration cost for BOTH arms (the on-disk skeleton.md)
const SEAM_VERBS = ['post', 'execute', 'ship', 'settle', 'pay', 'run', 'disburse', 'land', 'issue', 'get', 'withdraw', 'redeem', 'spend', 'debit', 'draw', 'drain', 'consume'];
const CRUD_VERBS = ['create', 'list'];
function routeFor(surface) {
  const s = surface.toLowerCase();
  if (CRUD_VERBS.some((v) => s.startsWith(v))) return TIER.haiku;
  if (SEAM_VERBS.some((v) => s.startsWith(v))) return TIER.opus;
  return TIER.sonnet;
}

const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';
const chunkPrompt = (preamble, skeleton, surfaceText) => ['## Shared context (every surface uses this)', preamble, skeleton ? `\n${skeleton}` : '', '\n## Your task', surfaceText].join('\n');

// ---- epic spec / loader (verbatim shape from routed-baseline.mjs: diverse on-disk + membership→oracle2) --
function epicSpec(id) {
  if (id.startsWith('membership-d')) {
    const D = id.split('-d')[1];
    return { id, dir: path.join(BUILD_GAP, 'epics', `scale-d${D}`), testsPath: path.join(HERE, 'gates', 'lib', `oracle2-tests-d${D}.mjs`) }; // 2nd oracle, depth-matched

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

// HARDENED (2026-06-18): a missing/empty bucket is a FAIL (0), never a pass (see coevo-rung1.mjs for the
// VOID-92/92 footgun this removes). A whole harnessError/timeout/empty grade carries no buckets ⇒ epicOK is
// false and relOf reads 0, instead of the old `: 1` default silently scoring a grading crash as 100%.
const rate = (b) => (b && b.total ? b.pass / b.total : 0);
const frac = (b) => (b ? `${b.pass}/${b.total}` : '0/0');
const isGrade = (g) => !!(g && (g.crosscut || g.integration || g.happy));
const epicOK = (g) => isGrade(g) && rate(g.crosscut) === 1 && rate(g.integration) === 1;
const relOf = (g) => ({ happy: rate(g.happy), crosscut: rate(g.crosscut), integration: rate(g.integration) });
const failsOf = (g) => ({ crosscut: (g.crosscut?.fails || []).map((f) => ({ name: f.name, why: f.why })), integration: (g.integration?.fails || []).map((f) => ({ name: f.name, why: f.why })) });

// worst-of-K aggregation (verbatim convention from coevo-rung1.mjs §worst-of-K): per-bucket worst=min over the
// K logged draws. Frozen rule (DESIGN §5/A5): worst-of-K for both cost AND reliability; a missing/empty draw is
// 0 via the fail-CLOSED rate() above → counts as the worst, never excluded.
const min = (xs) => xs.reduce((a, b) => Math.min(a, b), Infinity);
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const max = (xs) => xs.reduce((a, b) => Math.max(a, b), -Infinity);
const stat = (xs) => ({ worst: +min(xs).toFixed(4), median: +med(xs).toFixed(4), best: +max(xs).toFixed(4) });
// cost axis: higher $ = worse, so worst-of-K cost = MAX draw, best = MIN (reliability uses stat() where worst=min).
const costStat = (xs) => ({ worst: +max(xs).toFixed(4), median: +med(xs).toFixed(4), best: +min(xs).toFixed(4) });

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); } }));
  return out;
}

// structural validity gate (mirrors evaluator.mjs / epic-run.mjs isValidSurface).
function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h2h-'));
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

// ============================== ARM A — routed all-frontier baseline ===============================
async function runBaseline(spec, invoke) {
  const fx = await loadEpic(spec);
  const files = {}; const routeDist = {}; let surfUsd = 0;
  await pool(fx.order, CONC, async (s) => {
    const model = routeFor(s);
    let g; try { g = await invoke({ prompt: chunkPrompt(fx.preamble, fx.skeleton, fx.surfaces[s]), system: SYS_ONE, model }); } catch { g = { text: '', usd: 0 }; }
    files[s] = g.text || '';
    const k = TIER_PRICE_KEY[model] || model; routeDist[k] = (routeDist[k] || 0) + 1;
    if (Number.isFinite(g.usd)) surfUsd += g.usd;
  });
  const grade = await evaluateEpic({ mode: 'isolated', files, testsPath: spec.testsPath });
  return {
    arm: 'baseline', id: spec.id, surfaces: fx.order.length, routeDist,
    reliability: relOf(grade), buckets: { crosscut: frac(grade.crosscut), integration: frac(grade.integration) }, epicOK: epicOK(grade),
    surfaceUsd: +surfUsd.toFixed(4), totalUsd: +(surfUsd + SKELETON_OPUS_ANCHOR_USD).toFixed(4),
  };
}

// ============================== ARM B — hybrid (cheap + integration-gate) ==========================
async function runHybrid(spec, invoke) {
  const fx = await loadEpic(spec);
  const files = {}; const prompts = {}; const perSurface = {}; const routeDist = {};
  const gateCfg = { kind: 'deterministic', repairDepth: REPAIR };

  const drawSurface = async (prompt, surface) => {
    let attempts = 0, lastTokens = 0, route = null, valid = false, text = '';
    for (let a = 1; a <= RETRY; a++) {
      attempts = a;
      let g; try { g = await invoke({ prompt, system: SYS_ONE, model: null }); } catch { continue; }
      lastTokens = g.outputTokens || 0; if (g.route) route = g.route;
      const ok = await isValidSurface(g.text, surface);
      if (ok) { valid = true; text = g.text; break; }
      text = g.text || text; // keep last draw even if invalid (graded as fail, but recorded)
    }
    return { text, attempts, valid, tokens: lastTokens, route };
  };

  // 1. build every surface on the cheap tier (with the skeleton injected) + structural retry
  await pool(fx.order, CONC, async (surface) => {
    const buildPrompt = chunkPrompt(fx.preamble, fx.skeleton, fx.surfaces[surface]);
    prompts[surface] = buildPrompt;
    const r = await drawSurface(buildPrompt, surface);
    files[surface] = r.valid ? r.text : (r.text || '');
    perSurface[surface] = { attempts: r.attempts, valid: r.valid, route: r.route, tokens: r.tokens, route_tier: routeFor(surface) };
    if (r.route) routeDist[r.route] = (routeDist[r.route] || 0) + 1;
  });

  // 2. grade RAW (pre-gate snapshot) — the bare cheap-tier reliability (layer-2 baseline)
  const rawFiles = { ...files };
  const rawGrade = await evaluateEpic({ mode: 'isolated', files: rawFiles, testsPath: spec.testsPath });

  // 3. the integration-gate (deterministic): cross-surface seam check + surgical/route-back repair. Mutates `files`.
  const gateRes = await runIntegrationGate({
    surfaces: fx.order, files, prompts, skeleton: fx.skeleton, baseModel: fx.preamble, gate: gateCfg,
    rebuild: async (surface, rp) => (await drawSurface(rp, surface)).text,
    judgeInvoke: (a) => invoke(a),
  });

  // 4. grade FINAL (post-gate) — the shipped hybrid
  const finalGrade = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: spec.testsPath });

  return {
    arm: 'hybrid', id: spec.id, surfaces: fx.order.length, routeDist,
    raw: { reliability: relOf(rawGrade), buckets: { crosscut: frac(rawGrade.crosscut), integration: frac(rawGrade.integration) }, epicOK: epicOK(rawGrade), fails: failsOf(rawGrade) },
    final: { reliability: relOf(finalGrade), buckets: { crosscut: frac(finalGrade.crosscut), integration: frac(finalGrade.integration) }, epicOK: epicOK(finalGrade), fails: failsOf(finalGrade) },
    gate: { kind: gateCfg.kind, fired: gateRes.pairs > 0, pairs: gateRes.pairs, mismatches: gateRes.mismatches, repairs: gateRes.repairs, leak: gateRes.leak },
    perSurface,
    surfaceUsd: 0, totalUsd: SKELETON_OPUS_ANCHOR_USD, // free gateway coding + repairs; only the shared skeleton anchor
    missingDraws: Object.entries(perSurface).filter(([, v]) => !v.valid).map(([s]) => s),
  };
}

// ============================== worst-of-K wrappers (settled path) ==================================
// K independent whole-epic draws per arm, aggregated per cell. For the hybrid arm the free gateway re-routes
// each draw, so the K draws span the route zoo (the model-agnosticism test, not noise reduction). For the
// fixed-policy baseline arm K measures the frontier models' own nondeterminism.
async function runBaselineWorstOfK(spec, invoke, k) {
  const draws = [];
  for (let i = 0; i < k; i++) {
    let d; try { d = await runBaseline(spec, invoke); } catch (e) { d = { reliability: { happy: 0, crosscut: 0, integration: 0 }, totalUsd: SKELETON_OPUS_ANCHOR_USD, surfaces: 0, routeDist: {}, harnessError: String((e && e.message) || e) }; } // §4.5 hard worst-of-K FAIL, never excluded
    draws.push(d);
  }
  const bk = (sel) => stat(draws.map(sel));
  const worst = { happy: +min(draws.map((d) => d.reliability.happy)).toFixed(4), crosscut: +min(draws.map((d) => d.reliability.crosscut)).toFixed(4), integration: +min(draws.map((d) => d.reliability.integration)).toFixed(4) };
  return {
    arm: 'baseline', id: spec.id, surfaces: draws[0].surfaces, k, routeDist: draws[0].routeDist,
    reliability: { happy: bk((d) => d.reliability.happy), crosscut: bk((d) => d.reliability.crosscut), integration: bk((d) => d.reliability.integration) },
    worst, epicOK_worst: worst.crosscut === 1 && worst.integration === 1,
    cost: costStat(draws.map((d) => d.totalUsd)),
  };
}
async function runHybridWorstOfK(spec, invoke, k) {
  const draws = [];
  for (let i = 0; i < k; i++) {
    let d; try { d = await runHybrid(spec, invoke); } catch (e) { d = { raw: { reliability: { crosscut: 0, integration: 0 } }, final: { reliability: { happy: 0, crosscut: 0, integration: 0 } }, gate: { fired: false }, missingDraws: [], totalUsd: SKELETON_OPUS_ANCHOR_USD, harnessError: String((e && e.message) || e) }; } // §4.5 hard worst-of-K FAIL, never excluded
    draws.push(d);
  }
  const bk = (sel) => stat(draws.map(sel));
  const rawWorst = { crosscut: +min(draws.map((d) => d.raw.reliability.crosscut)).toFixed(4), integration: +min(draws.map((d) => d.raw.reliability.integration)).toFixed(4) };
  const worst = { happy: +min(draws.map((d) => d.final.reliability.happy)).toFixed(4), crosscut: +min(draws.map((d) => d.final.reliability.crosscut)).toFixed(4), integration: +min(draws.map((d) => d.final.reliability.integration)).toFixed(4) };
  return {
    arm: 'hybrid', id: spec.id, surfaces: draws[0].surfaces, k,
    raw: { crosscut: bk((d) => d.raw.reliability.crosscut), integration: bk((d) => d.raw.reliability.integration) },
    final: { happy: bk((d) => d.final.reliability.happy), crosscut: bk((d) => d.final.reliability.crosscut), integration: bk((d) => d.final.reliability.integration) },
    worst, rawWorst, epicOK_worst: worst.crosscut === 1 && worst.integration === 1,
    gateFiredAny: draws.some((d) => d.gate.fired), missingDrawsAny: draws.some((d) => (d.missingDraws || []).length > 0),
    cost: costStat(draws.map((d) => d.totalUsd)),
  };
}

// SETTLED driver (P3 prereq): co-measure BOTH arms on IDENTICAL epics by the SAME oracles, worst-of-K, →
// runs/head-to-head-settled.json + a per-epic parity-at-lower-cost verdict. Mock writes a *-settled-mock.json
// so it can NEVER flip the pre-p3 gate (which keys on the existence of the real filename).
async function runSettled(baselineInvoke, hybridInvoke) {
  const ids = (arg('epics', null) || DEV_LADDER.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  console.log(`HEAD-TO-HEAD — SETTLED — ${MOCK ? 'MOCK (zero spend)' : 'LIVE'} — co-measured both arms — worst-of-K=${K} — ${ids.length} epics\n`);
  const results = [];
  const outDir = path.join(HERE, 'runs'); fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, MOCK ? 'head-to-head-settled-mock.json' : 'head-to-head-settled.json');
  const flush = (payload) => fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n'); // incremental — long live runs survive a kill
  for (const id of ids) {
    const spec = epicSpec(id);
    const base = await runBaselineWorstOfK(spec, baselineInvoke, K);
    const hy = await runHybridWorstOfK(spec, hybridInvoke, K);
    const integParity = hy.worst.integration >= base.worst.integration - 1e-9;     // hybrid FINAL lethal-non-inferior to baseline, worst-of-K
    const crosscutParity = hy.worst.crosscut >= base.worst.crosscut - 1e-9;
    const costWin = hy.cost.worst < base.cost.worst;                               // §7: total_cost STRICTLY < baseline; worst-of-K cost = max draw (costStat)
    const verdict = {
      lethalNonInferior: integParity && crosscutParity, integParity, crosscutParity, costWin,
      win: integParity && crosscutParity && costWin,
      deltaInteg: +(hy.worst.integration - base.worst.integration).toFixed(3),
      deltaCostUsd: +(base.cost.worst - hy.cost.worst).toFixed(4),
    };
    results.push({ id, topo: id.split('-d')[0], depth: id.includes('-d') ? +id.split('-d').pop() : null, baseline: base, hybrid: hy, verdict });
    flush({ settled: true, mock: MOCK, generatedAt: new Date().toISOString(), arms: 'both', k: K, epics: ids, results, verdict: null });
    console.log(`${id}: base i ${(base.worst.integration * 100).toFixed(0)}% $${base.cost.median} | hybrid i ${(hy.worst.integration * 100).toFixed(0)}% $${hy.cost.median} → ${verdict.win ? 'WIN' : (verdict.lethalNonInferior ? 'parity' : 'LOSS')} (Δinteg ${verdict.deltaInteg >= 0 ? '+' : ''}${(verdict.deltaInteg * 100).toFixed(0)}pp, Δcost $${verdict.deltaCostUsd})`);
  }
  const byTopo = {};
  for (const r of results) {
    byTopo[r.topo] = byTopo[r.topo] || { epics: 0, wins: 0, lethalNonInf: 0, losses: 0 };
    byTopo[r.topo].epics++;
    if (r.verdict.win) byTopo[r.topo].wins++;
    if (r.verdict.lethalNonInferior) byTopo[r.topo].lethalNonInf++; else byTopo[r.topo].losses++;
  }
  const baselineTotalCostWorst = +results.reduce((a, r) => a + r.baseline.cost.worst, 0).toFixed(4);
  const hybridTotalCostWorst = +results.reduce((a, r) => a + r.hybrid.cost.worst, 0).toFixed(4);
  const allLethalNonInferior = results.length > 0 && results.every((r) => r.verdict.lethalNonInferior);
  const overall = {
    epics: results.length, k: K,
    // §7 battery DOMINANCE: EVERY cell lethal-non-inferior AND battery total_cost STRICTLY < baseline (worst-of-K cost).
    win: allLethalNonInferior && hybridTotalCostWorst < baselineTotalCostWorst,
    allLethalNonInferior,
    wins: results.filter((r) => r.verdict.win).length,
    lethalNonInferior: results.filter((r) => r.verdict.lethalNonInferior).length,
    losses: results.filter((r) => !r.verdict.lethalNonInferior).length,
    baselineTotalCostWorst, hybridTotalCostWorst,
    baselineTotalCostMedian: +results.reduce((a, r) => a + r.baseline.cost.median, 0).toFixed(4),
    hybridTotalCostMedian: +results.reduce((a, r) => a + r.hybrid.cost.median, 0).toFixed(4),
    byTopo,
    note: 'Co-measured worst-of-K on IDENTICAL epics by the SAME oracles. Reliability worst-of-K = min over K; cost worst-of-K = max over K (costStat). Battery `win` = ALL cells lethal-non-inferior (crosscut+integration ≥ baseline non-inferiority) AND battery total_cost STRICTLY < baseline (DESIGN §7). Per-epic `win` is a per-cell indicator, NOT the §7 battery verdict. PROVISIONAL until run LIVE (real $ on the baseline arm) and scored at P3 on the sequestered TEST.',
  };
  flush({ settled: true, mock: MOCK, generatedAt: new Date().toISOString(), arms: 'both', k: K, epics: ids, results, verdict: overall });
  console.log(`\noverall: battery §7 win=${overall.win}  (${overall.lethalNonInferior}/${overall.epics} cells lethal-non-inferior; baseline $${overall.baselineTotalCostWorst} vs hybrid $${overall.hybridTotalCostWorst} worst-of-K total)`);
  console.log(`wrote ${path.relative(ROOT, outFile)}`);
}

// ============================== driver ==============================================================
async function main() {
  const armsArg = (arg('arms', 'hybrid')).toLowerCase();
  const runHy = armsArg === 'hybrid' || armsArg === 'both';
  const runBa = armsArg === 'baseline' || armsArg === 'both';
  const ids = (arg('epics', 'membership-d1,approval-d1,approval-d2,approval-d3,lifecycle-d1,lifecycle-d2,lifecycle-d3,quota-d1,quota-d2,quota-d3')).split(',').map((s) => s.trim()).filter(Boolean);

  const baselineInvoke = MOCK ? makeMockInvoke({}, { text: 'export function __noop(){ return null; }', outputTokens: 700, usd: 0 }) : claudeInvoke;
  const hybridInvoke = MOCK ? makeMockInvoke({}, { text: 'export function __noop(){ return null; }', outputTokens: 700, usd: 0 }) : makeGatewayInvoke({ timeoutMs: CALL_TIMEOUT_MS });
  if (SETTLED) return runSettled(baselineInvoke, hybridInvoke); // co-measured both arms, worst-of-K → head-to-head-settled.json

  console.log(`HEAD-TO-HEAD — ${MOCK ? 'MOCK (zero spend)' : 'LIVE'} — arms=${armsArg} retry=${RETRY} gate.repair=${REPAIR} conc=${CONC} callTimeout=${CALL_TIMEOUT_MS}ms — ${ids.length} epics\n`);
  const results = { mock: MOCK, arms: armsArg, retry: RETRY, repair: REPAIR, conc: CONC, epics: ids, baseline: [], hybrid: [] };
  const outDir = path.join(HERE, 'runs'); fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, MOCK ? 'head-to-head-mock.json' : `head-to-head-${armsArg}.json`);
  const flush = () => fs.writeFileSync(outFile, JSON.stringify(results, null, 2) + '\n'); // incremental — long runs survive a kill

  for (const id of ids) {
    const spec = epicSpec(id);
    if (runBa) {
      const t = Date.now();
      const b = await runBaseline(spec, baselineInvoke); results.baseline.push(b); flush();
      console.log(`[baseline] ${id}: c ${(b.reliability.crosscut * 100).toFixed(0)}% i ${(b.reliability.integration * 100).toFixed(0)}% epic✓ ${b.epicOK ? 'Y' : 'N'}  $${b.totalUsd}  routes ${JSON.stringify(b.routeDist)}  (${((Date.now() - t) / 1000).toFixed(0)}s)`);
    }
    if (runHy) {
      const t = Date.now();
      const h = await runHybrid(spec, hybridInvoke); results.hybrid.push(h); flush();
      const gtag = h.gate.fired ? `gate[${h.gate.pairs}p ${h.gate.repairs}r]` : 'gate[no-op]';
      console.log(`[hybrid]   ${id}: raw{c ${(h.raw.reliability.crosscut * 100).toFixed(0)}% i ${(h.raw.reliability.integration * 100).toFixed(0)}%} → final{c ${(h.final.reliability.crosscut * 100).toFixed(0)}% i ${(h.final.reliability.integration * 100).toFixed(0)}%} epic✓ ${h.final.epicOK ? 'Y' : 'N'}  ${gtag}  ${h.missingDraws.length ? `MISSING:${h.missingDraws.join(',')}` : ''}  (${((Date.now() - t) / 1000).toFixed(0)}s)`);
    }
  }
  flush();
  console.log(`\nwrote ${path.relative(ROOT, outFile)}`);
}

main().catch((e) => { console.error('head-to-head FAILED:', e); process.exit(1); });
