#!/usr/bin/env node
// M0 (Build stage) gap measurement: generate a solution for each build task with a given transport
// (cheap gateway vs frontier claude), run it against the two-bucket test oracle, and report the
// cost-vs-quality picture — separating GENERATION VALIDITY (did it produce runnable code?) from, among
// valid runs, HAPPY-path pass-rate and OBLIGATION pass-rate (the dangerous, silently-missed stuff).
//
// BARE baseline: 1 attempt per run, NO retry (retry is a harness lever added in M1). An invalid
// generation scores 0/0. Grading is deterministic + free (executable tests); the only spend is the
// frontier generations (gateway is free).
//
// Run:
//   node studies/build-gap/run.mjs --transport gateway --k 5
//   node studies/build-gap/run.mjs --transport claude --frontier-model claude-sonnet-4-6 --k 5
//   node studies/build-gap/run.mjs --transport both --k 5            (gateway + claude)
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { makeGatewayInvoke, claudeInvoke } from '../../runner/model-client.mjs';
import { evaluate } from './lib/sandbox.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const TASKS_DIR = path.join(HERE, 'tasks');

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : def;
};

const K = Number(arg('k', 5));
const TRANSPORT = arg('transport', 'gateway'); // gateway | claude | both
const FRONTIER_MODEL = arg('frontier-model', 'claude-sonnet-4-6');
const ONLY_TASK = arg('task', null); // comma-separated list, or null = all discovered tasks
const TASK_FILTER = ONLY_TASK ? new Set(ONLY_TASK.split(',').map((s) => s.trim()).filter(Boolean)) : null;
const CONCURRENCY = Number(arg('concurrency', 3));

const SYSTEM = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the requested function. No prose, no explanation, no markdown code fences.';

function discoverTasks() {
  return fs.readdirSync(TASKS_DIR)
    .filter((d) => fs.existsSync(path.join(TASKS_DIR, d, 'spec.md')) && fs.existsSync(path.join(TASKS_DIR, d, 'tests.mjs')))
    .filter((d) => !TASK_FILTER || TASK_FILTER.has(d))
    .map((d) => ({ name: d, spec: fs.readFileSync(path.join(TASKS_DIR, d, 'spec.md'), 'utf8'), testsPath: path.join(TASKS_DIR, d, 'tests.mjs') }));
}

function makeInvoke(transport) {
  if (transport === 'gateway') return { invoke: makeGatewayInvoke({ timeoutMs: 240000 }), model: null, label: 'gateway' };
  return { invoke: claudeInvoke, model: FRONTIER_MODEL, label: `claude:${FRONTIER_MODEL}` };
}

async function oneRun(task, t) {
  let gen;
  try {
    gen = await t.invoke({ prompt: task.spec, system: SYSTEM, model: t.model });
  } catch (e) {
    return { valid: false, reason: `transport: ${String(e.message).slice(0, 80)}`, happy: { pass: 0, total: 0 }, obligation: { pass: 0, total: 0 }, usd: 0, outputTokens: 0, wallClockSec: 0 };
  }
  const evalResult = await evaluate(gen.text, task.testsPath);
  const valid = !!(evalResult.happy && evalResult.obligation) && !evalResult.importError && !evalResult.timeout && !evalResult.empty && !evalResult.harnessError;
  return {
    valid,
    reason: valid ? null : (evalResult.importError ? 'import-error' : evalResult.timeout ? 'timeout' : evalResult.empty ? 'empty' : evalResult.harnessError ? 'harness' : 'unknown'),
    happy: evalResult.happy || { pass: 0, total: 0 },
    obligation: evalResult.obligation || { pass: 0, total: 0 },
    usd: gen.usd ?? 0,
    outputTokens: gen.outputTokens ?? 0,
    wallClockSec: gen.wallClockSec ?? 0,
    model: gen.model ?? t.model ?? null,
    route: gen.route ?? null,
  };
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) { const i = next++; if (i >= items.length) return; out[i] = await fn(items[i], i); }
  }));
  return out;
}

function pct(n, d) { return d ? `${((100 * n) / d).toFixed(0)}%` : '—'; }

async function measure(transport) {
  const t = makeInvoke(transport);
  const tasks = discoverTasks();
  console.error(`\n[${t.label}] K=${K} over ${tasks.length} task(s)...`);
  const perTask = [];
  for (const task of tasks) {
    const runs = await pool(Array.from({ length: K }), CONCURRENCY, () => oneRun(task, t));
    const valid = runs.filter((r) => r.valid);
    // happy/obligation "passed" = ALL tests in the bucket pass (a partial pass isn't a working feature).
    const happyOk = (r) => r.happy.total > 0 && r.happy.pass === r.happy.total;
    const oblOk = (r) => r.obligation.total > 0 && r.obligation.pass === r.obligation.total;
    const row = {
      task: task.name,
      transport: t.label,
      k: K,
      validRate: valid.length / K,
      // end-to-end (invalid counts as a miss):
      happyRate: runs.filter(happyOk).length / K,
      obligationRate: runs.filter(oblOk).length / K,
      // conditional on a valid (runnable) generation:
      happyRateGivenValid: valid.length ? valid.filter(happyOk).length / valid.length : 0,
      obligationRateGivenValid: valid.length ? valid.filter(oblOk).length / valid.length : 0,
      avgUsd: runs.reduce((s, r) => s + r.usd, 0) / K,
      avgTokens: Math.round(runs.reduce((s, r) => s + r.outputTokens, 0) / K),
      avgWallSec: +(runs.reduce((s, r) => s + r.wallClockSec, 0) / K).toFixed(1),
      reasons: runs.filter((r) => !r.valid).map((r) => r.reason),
      runs,
    };
    perTask.push(row);
    console.error(`  ${task.name.padEnd(15)} valid ${pct(valid.length, K)} | happy ${pct(runs.filter(happyOk).length, K)} | OBLIGATION ${pct(runs.filter(oblOk).length, K)} | (given-valid: happy ${pct(valid.filter(happyOk).length, valid.length)}, obl ${pct(valid.filter(oblOk).length, valid.length)}) | $${row.avgUsd.toFixed(4)}/run`);
  }
  return { transport: t.label, perTask };
}

(async () => {
  const transports = TRANSPORT === 'both' ? ['gateway', 'claude'] : [TRANSPORT];
  const results = [];
  for (const tr of transports) results.push(await measure(tr));

  // Aggregate table
  console.log(`\n=== M0 BUILD-STAGE GAP — cost vs quality (K=${K}) ===\n`);
  console.log('transport            task            valid  happy  OBLIGATION  obl|valid   $/run');
  console.log('-------------------  --------------  -----  -----  ----------  ---------  --------');
  for (const res of results) {
    for (const r of res.perTask) {
      console.log(`${r.transport.padEnd(19)}  ${r.task.padEnd(14)}  ${pct(r.validRate * r.k, r.k).padStart(5)}  ${pct(r.happyRate * r.k, r.k).padStart(5)}  ${pct(r.obligationRate * r.k, r.k).padStart(10)}  ${pct(r.obligationRateGivenValid * 100, 100).padStart(9)}  ${('$' + r.avgUsd.toFixed(4)).padStart(8)}`);
    }
  }
  const outPath = path.join(HERE, 'runs', `m0-${transports.join('-')}-k${K}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ k: K, frontierModel: FRONTIER_MODEL, results }, null, 2) + '\n');
  console.log(`\nwrote ${path.relative(path.join(HERE, '..', '..'), outPath)}`);
})();
