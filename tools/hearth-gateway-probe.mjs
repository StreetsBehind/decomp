#!/usr/bin/env node
// $0 viability probe: can the FREE gateway decompose the large hearth fixture at all, or does it
// truncate/exhaust? Method-only (NO judge) → zero spend. Informs whether C (the hearth 3-arm sweep)
// is viable on the gateway transport. Mirrors the battery's A8 retry (empty-bead = invalid → re-route).
//
// Run: node tools/hearth-gateway-probe.mjs [K=5] [attempts=3]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import singleSession from '../strategies/single-session/index.mjs';
import { makeGatewayInvoke } from '../runner/model-client.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const K = Number(process.argv[2]) || 5;
const ATTEMPTS = Number(process.argv[3]) || 3;

const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures/hearth/plan.lock.json'), 'utf8'));
const planMd = fs.readFileSync(path.join(ROOT, 'fixtures/hearth/plan.md'), 'utf8');
const invoke = makeGatewayInvoke({ timeoutMs: 240000 });

function taskBeads(s) { return s.beads.filter((b) => b.type !== 'epic').length; }

(async () => {
  console.log(`Hearth gateway viability probe — single-session x K=${K}, ${ATTEMPTS} attempts each, FREE methods, NO judge ($0).\n`);
  const rows = [];
  for (let k = 0; k < K; k++) {
    const routes = [];
    let ok = null;
    let lastErr = null;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const wrapped = async (a) => { const r = await invoke(a); routes.push(r); return r; };
      try {
        const { snapshot } = await singleSession.run({ name: 'hearth', lock, planMd, dir: ROOT }, { invoke: wrapped, model: null });
        const tb = taskBeads(snapshot);
        if (tb === 0) throw new Error('empty (0 task beads)');
        ok = { beads: snapshot.beads.length, taskBeads: tb, edges: snapshot.edges.length };
        break;
      } catch (e) {
        lastErr = e;
        const last = routes[routes.length - 1];
        console.log(`  run ${k + 1} attempt ${attempt}/${ATTEMPTS}: ${last ? last.route || last.model : '—'} fin=${last ? last.finishReason : '—'} tok=${last ? last.outputTokens : '—'} INVALID (${e.message.slice(0, 40)})`);
      }
    }
    const last = routes[routes.length - 1];
    if (ok) {
      console.log(`  run ${k + 1}: OK — ${ok.taskBeads} task beads, ${ok.edges} edges  [${last.route || last.model} fin=${last.finishReason} tok=${last.outputTokens}, ${routes.length} attempt(s)]`);
      rows.push({ k, status: 'ok', ...ok, attempts: routes.length, route: last.route || last.model, finishReason: last.finishReason, outputTokens: last.outputTokens });
    } else {
      console.log(`  run ${k + 1}: EXHAUSTED after ${ATTEMPTS} attempts (${lastErr.message.slice(0, 40)})`);
      rows.push({ k, status: 'exhausted', attempts: ATTEMPTS, reason: lastErr.message });
    }
  }
  const ok = rows.filter((r) => r.status === 'ok');
  const trunc = rows.filter((r) => r.finishReason === 'length').length;
  console.log(`\n=== VIABILITY ===`);
  console.log(`valid decompositions: ${ok.length}/${K}  (exhausted: ${K - ok.length})`);
  if (ok.length) {
    const tb = ok.map((r) => r.taskBeads), ed = ok.map((r) => r.edges), at = ok.map((r) => r.attempts);
    const avg = (xs) => (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1);
    console.log(`task beads: ${Math.min(...tb)}–${Math.max(...tb)} (avg ${avg(tb)}) | edges: ${Math.min(...ed)}–${Math.max(...ed)} (avg ${avg(ed)}) | attempts to first valid: avg ${avg(at)}`);
  }
  console.log(`runs whose winning draw hit finish=length (truncation): ${trunc}/${K}`);
  fs.writeFileSync(path.join(ROOT, 'runs', 'hearth-gateway-probe.json'), JSON.stringify({ K, attempts: ATTEMPTS, rows }, null, 2) + '\n');
  console.log(`wrote runs/hearth-gateway-probe.json`);
})();
