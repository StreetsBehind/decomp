#!/usr/bin/env node
// M-coh: the COHESION study. Build the `workspace` epic under several conditions and grade the ASSEMBLED
// result with the multi-module oracle (wire / happy / crosscut-uniformity / integration). The question:
// which (harness SHAPE × task SIZE) lets a cheap model match a frontier model run BARE — not just per
// task, but as one cohesive epic?
//
// Conditions (the harness-shape axis):
//   frontier-whole   one frontier call sees the WHOLE epic, emits one module        = THE BAR (per --frontier-model)
//   cheap-whole      one cheap call sees the whole epic                              (isolates "whole context" from tier)
//   cheap-isolated   N cheap calls, each sees ONE surface, assembled                 = naive /build-batch (BARE)
//   cheap-skeleton   N cheap calls, each sees ONE surface + the FROZEN SKELETON      = the cohesion lever
//
// Cost shape is friendly: frontier-whole = 1 call/epic; cheap = free; oracle = free.
//
// Run:
//   node studies/build-gap/epic-run.mjs --conditions frontier-whole,cheap-isolated,cheap-skeleton --k 3
//   node studies/build-gap/epic-run.mjs --conditions cheap-isolated,cheap-skeleton --k 5     ($0)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { makeGatewayInvoke, claudeInvoke } from '../../runner/model-client.mjs';
import { evaluateEpic } from './lib/epic-sandbox.mjs';
import { extractModule } from './lib/sandbox.mjs';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : def;
};

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const EPIC = arg('epic', 'workspace'); // fixture name under epics/ — lets size/provenance tracks add fixtures without touching core
const EPIC_DIR = path.join(HERE, 'epics', EPIC);
const VALIDATE = path.join(HERE, 'lib', 'validate-surface.mjs');

// Reliability lever: does the generated surface module import and export the expected function? Run in a
// child (safety) with a short timeout. Used as the retry gate so a re-route past an invalid free-model
// draw is structural-only (no behaviour/obligation leakage).
function isValidSurface(code, surface, timeoutMs = 8000) {
  const c = extractModule(code);
  if (!c || c.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'epicval-'));
  const f = path.join(dir, `${surface}.mjs`);
  fs.writeFileSync(f, c);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    let done = false;
    const finish = (ok) => { if (done) return; done = true; clearTimeout(timer); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(ok); };
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} finish(false); }, timeoutMs);
    child.on('close', (code2) => finish(code2 === 0));
    child.on('error', () => finish(false));
  });
}

const K = Number(arg('k', 3));
const FRONTIER_MODELS = arg('frontier-model', 'claude-sonnet-4-6,claude-opus-4-8').split(',').map((s) => s.trim()).filter(Boolean);
const CONDITIONS = arg('conditions', 'frontier-whole,cheap-isolated,cheap-skeleton').split(',').map((s) => s.trim()).filter(Boolean);
const SURFACE_CONCURRENCY = Number(arg('concurrency', 3));

const SYS_WHOLE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements and exports ALL of the requested functions. No prose, no explanation, no markdown code fences.';
const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';

async function loadFixture() {
  const testsPath = path.join(EPIC_DIR, 'tests.mjs');
  // The oracle's EXPECTS is the single source of truth for the surface set AND order (prompt composition).
  const tests = await import(url.pathToFileURL(testsPath).href);
  const order = Array.isArray(tests.EXPECTS) ? tests.EXPECTS : [];
  if (!order.length) throw new Error(`epic '${EPIC}': tests.mjs must export EXPECTS (the surface list)`);
  const preamble = fs.readFileSync(path.join(EPIC_DIR, 'preamble.md'), 'utf8');
  // skeleton.md is optional; the provenance track may inject a generated skeleton via --skeleton-file instead.
  const skFile = arg('skeleton-file', path.join(EPIC_DIR, 'skeleton.md'));
  const skeleton = fs.existsSync(skFile) ? fs.readFileSync(skFile, 'utf8') : '';
  const surfaces = {};
  for (const s of order) surfaces[s] = fs.readFileSync(path.join(EPIC_DIR, 'surfaces', `${s}.md`), 'utf8');
  return { order, preamble, skeleton, surfaces, testsPath };
}

// ---- prompt construction -------------------------------------------------------------------------
function chunkPrompt(fx, surface, withSkeleton) {
  return [
    '## Shared context (every surface uses this)', fx.preamble,
    withSkeleton ? `\n${fx.skeleton}` : '',
    '\n## Your task', fx.surfaces[surface],
  ].join('\n');
}
function wholePrompt(fx, withSkeleton) {
  const body = fx.order.map((s) => `### ${s}\n${fx.surfaces[s]}`).join('\n\n');
  return [
    '## Shared context (all surfaces use this)', fx.preamble,
    withSkeleton ? `\n${fx.skeleton}` : '',
    `\n## Your task — implement ALL of the following in ONE module that exports all ${fx.order.length} functions`,
    body,
    `\nExport exactly these functions: ${fx.order.join(', ')}. Return ONLY the one JavaScript module.`,
  ].join('\n');
}

// ---- transports ----------------------------------------------------------------------------------
const gateway = makeGatewayInvoke({ timeoutMs: 240000 });
function invokerFor(transport) {
  if (transport === 'gateway') return { invoke: gateway, model: null };
  return { invoke: claudeInvoke, model: transport }; // transport IS the claude model id
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) { const i = next++; if (i >= items.length) return; out[i] = await fn(items[i], i); }
  }));
  return out;
}

// Build one epic ARTIFACT under a condition; returns { mode, moduleText|files, calls:[...] }.
async function buildEpic(fx, cond) {
  const t = invokerFor(cond.transport);
  const calls = [];
  const meter = (g, label) => { calls.push({ label, usd: g.usd ?? 0, outputTokens: g.outputTokens ?? 0, wallClockSec: g.wallClockSec ?? 0, model: g.model ?? t.model ?? null, route: g.route ?? null }); };
  if (cond.mode === 'whole') {
    try {
      const g = await t.invoke({ prompt: wholePrompt(fx, cond.skeleton), system: SYS_WHOLE, model: t.model });
      meter(g, 'whole');
      return { mode: 'whole', moduleText: g.text, calls };
    } catch (e) {
      calls.push({ label: 'whole', error: String(e.message).slice(0, 100), usd: 0 });
      return { mode: 'whole', moduleText: '', calls };
    }
  }
  // isolated: one call per surface. With cond.retry > 1, re-route past an invalid draw (reliability lever).
  const files = {};
  const maxAttempts = Math.max(1, cond.retry || 1);
  await pool(fx.order, SURFACE_CONCURRENCY, async (surface) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let g;
      try {
        g = await t.invoke({ prompt: chunkPrompt(fx, surface, cond.skeleton), system: SYS_ONE, model: t.model });
      } catch (e) {
        calls.push({ label: `${surface}#${attempt}`, error: String(e.message).slice(0, 100), usd: 0 });
        continue;
      }
      meter(g, `${surface}#${attempt}`);
      const ok = maxAttempts === 1 ? !!(g.text && g.text.trim()) : await isValidSurface(g.text, surface);
      if (ok) { files[surface] = g.text; return; }
    }
  });
  return { mode: 'isolated', files, calls };
}

const RETRY = Number(arg('retry', 3)); // attempts per surface for the *-retry conditions
const CONDITION_DEFS = {
  'cheap-whole': () => [{ name: 'cheap-whole', transport: 'gateway', mode: 'whole', skeleton: false }],
  'cheap-isolated': () => [{ name: 'cheap-isolated', transport: 'gateway', mode: 'isolated', skeleton: false }],
  'cheap-isolated-retry': () => [{ name: 'cheap-isolated-retry', transport: 'gateway', mode: 'isolated', skeleton: false, retry: RETRY }],
  'cheap-skeleton': () => [{ name: 'cheap-skeleton', transport: 'gateway', mode: 'isolated', skeleton: true }],
  'cheap-skeleton-retry': () => [{ name: 'cheap-skeleton-retry', transport: 'gateway', mode: 'isolated', skeleton: true, retry: RETRY }],
  'frontier-whole': () => FRONTIER_MODELS.map((m) => ({ name: `frontier-whole:${m}`, transport: m, mode: 'whole', skeleton: false })),
};

function rate(b) { return b.total ? b.pass / b.total : 0; }
function pct(x) { return `${Math.round(x * 100)}%`; }

async function runCondition(fx, cond) {
  const runs = [];
  for (let k = 0; k < K; k++) {
    const artifact = await buildEpic(fx, cond);
    const evalInput = cond.mode === 'whole'
      ? { mode: 'whole', moduleText: artifact.moduleText, testsPath: fx.testsPath }
      : { mode: 'isolated', files: artifact.files, testsPath: fx.testsPath };
    const r = await evaluateEpic(evalInput);
    const buckets = (r && r.wire) ? r : { wire: { pass: 0, total: 5 }, happy: { pass: 0, total: 4 }, crosscut: { pass: 0, total: 7 }, integration: { pass: 0, total: 3 } };
    const usd = artifact.calls.reduce((s, c) => s + (c.usd || 0), 0);
    const full = rate(buckets.wire) === 1 && rate(buckets.happy) === 1 && rate(buckets.crosscut) === 1 && rate(buckets.integration) === 1;
    runs.push({ k, usd, full, wire: rate(buckets.wire), happy: rate(buckets.happy), crosscut: rate(buckets.crosscut), integration: rate(buckets.integration), buckets, calls: artifact.calls });
    console.error(`  [${cond.name}] run ${k + 1}/${K}: wire ${pct(rate(buckets.wire))} happy ${pct(rate(buckets.happy))} crosscut ${pct(rate(buckets.crosscut))} integ ${pct(rate(buckets.integration))} ${full ? '✓EPIC' : ''} $${usd.toFixed(3)}`);
  }
  const avg = (sel) => runs.reduce((s, r) => s + sel(r), 0) / runs.length;
  return {
    condition: cond.name, mode: cond.mode, skeleton: cond.skeleton, transport: cond.transport, k: K,
    wire: avg((r) => r.wire), happy: avg((r) => r.happy), crosscut: avg((r) => r.crosscut), integration: avg((r) => r.integration),
    epicPassRate: runs.filter((r) => r.full).length / runs.length, avgUsd: avg((r) => r.usd), runs,
  };
}

(async () => {
  const fx = await loadFixture();
  const conds = CONDITIONS.flatMap((c) => (CONDITION_DEFS[c] ? CONDITION_DEFS[c]() : []));
  if (!conds.length) { console.error(`no valid conditions in: ${CONDITIONS.join(',')}`); process.exit(1); }
  console.error(`\nM-coh: workspace epic — K=${K} — conditions: ${conds.map((c) => c.name).join(', ')}\n`);
  const results = [];
  for (const cond of conds) { console.error(`[${cond.name}]`); results.push(await runCondition(fx, cond)); }

  console.log(`\n=== M-coh — workspace epic cohesion (K=${K}) ===\n`);
  console.log('condition                       wire  happy  X-CUT  INTEG  EPIC✓   $/epic');
  console.log('------------------------------  ----  -----  -----  -----  -----  --------');
  for (const r of results) {
    console.log(`${r.condition.padEnd(30)}  ${pct(r.wire).padStart(4)}  ${pct(r.happy).padStart(5)}  ${pct(r.crosscut).padStart(5)}  ${pct(r.integration).padStart(5)}  ${pct(r.epicPassRate).padStart(5)}  ${('$' + r.avgUsd.toFixed(3)).padStart(8)}`);
  }
  console.log('\n  X-CUT = cross-cutting uniformity (authz/tenancy/mass-assign enforced on every surface).');
  console.log('  INTEG = integration flows (membership seam + cross-org isolation across surfaces).');

  const outPath = path.join(HERE, 'runs', `mcoh-${EPIC}-${CONDITIONS.join('_')}-k${K}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ k: K, conditions: CONDITIONS, frontierModels: FRONTIER_MODELS, results }, null, 2) + '\n');
  console.log(`\nwrote ${path.relative(path.join(HERE, '..', '..'), outPath)}`);
})();
