#!/usr/bin/env node
// P0 driver — smoke + wiring + instrument self-validation (DESIGN §9 / FREEZE.md §7). Runs, in order:
//   G0  freeze-consistency  — config.mjs pinned values == the FREEZE.md record (no silent drift)
//   G1  per-cell metric     — §6 metric wired against the real apparatus; veto rejects a lethal drop
//   G2  oracle kill-rate    — lethal-bucket kill-rate ≥ K6 (0.90) on a genuine mutant battery
//   K8  instrument self-val — the loop rediscovers a planted dominating genome within ≤8 gen/≤300 evals;
//                             the per-cell veto fires operationally in-loop
//   §14 autonomy round-trip — checkpoint→kill→resume deterministic; watchdog halts-to-checkpoint on hang
//   live  gateway smoke     — NON-BLOCKING: the live build path returns a real scorecard
// Exits non-zero iff any BLOCKING gate fails. "No conclusions" — P0 validates wiring, not the thesis.
//
// Run: node studies/meta-search/p0.mjs

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import * as cfg from './src/config.mjs';
import { run as g1 } from './gates/g1-per-cell-metric.mjs';
import { run as g2 } from './gates/g2-oracle-gate.mjs';
import { run as k8 } from './gates/k8-instrument-validation.mjs';
import { run as autonomy } from './gates/autonomy-roundtrip.mjs';
import { run as liveSmoke } from './gates/smoke-live.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));

// G0 — assert the frozen values in code match the FREEZE.md record (the values void-on-change post-P1).
function freezeConsistency() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });
  ok('weights == (crosscut 1.0, integration 1.0, happy 0.1, wire 0.0)', cfg.WEIGHTS.crosscut === 1 && cfg.WEIGHTS.integration === 1 && cfg.WEIGHTS.happy === 0.1 && cfg.WEIGHTS.wire === 0);
  ok('parity δ == 0.05, α == 0.05', cfg.DELTA === 0.05 && cfg.ALPHA === 0.05);
  ok('K5 eval cap == 250', cfg.K5_EVAL_CAP === 250);
  ok('K6 kill-rate floor == 0.90', cfg.K6_KILL_FLOOR === 0.90);
  ok('K7 ρ floor == 0.80', cfg.K7_RHO_FLOOR === 0.80);
  ok('K8 budget == ≤8 gen AND ≤300 evals', cfg.K8_MAX_GEN === 8 && cfg.K8_MAX_EVALS === 300);
  ok('amortization max-M == 12', cfg.MAX_M === 12);
  ok('credit-attribution restore-margin == 2× SE', cfg.RESTORE_MARGIN_SE === 2);
  ok('P1 anchor pair == {workspace, scale-d1}', cfg.P1_ANCHOR_EPICS.join(',') === 'workspace,scale-d1');
  // the freeze content pins exist for the anchor epics + apparatus
  ok('content pins present (apparatus + both anchors)', !!cfg.CONTENT_PINS.apparatus && !!cfg.CONTENT_PINS.workspace && !!cfg.CONTENT_PINS['scale-d1']);
  return { name: 'G0 freeze-consistency', pass: checks.every((c) => c.pass), checks };
}

async function main() {
  const started = new Date().toISOString();
  console.log(`\n=== Meta-search P0 — smoke + wiring + instrument self-validation ===\n(${started})\n`);

  const blocking = [];
  blocking.push(freezeConsistency());
  blocking.push(await g1());
  blocking.push(await g2());
  blocking.push(await k8());
  blocking.push(await autonomy());

  for (const g of blocking) {
    console.log(`[${g.pass ? 'PASS' : 'FAIL'}] ${g.name}`);
    for (const c of g.checks) console.log(`    ${c.pass ? '✓' : '✗'} ${c.name}${c.detail ? `  — ${c.detail}` : ''}`);
    console.log('');
  }

  // non-blocking live smoke
  const live = await liveSmoke();
  console.log(`[${live.status}] ${live.name} (non-blocking)\n    ${live.detail}\n`);

  const allPass = blocking.every((g) => g.pass);
  console.log('================================================================');
  console.log(`P0 BLOCKING GATES: ${blocking.filter((g) => g.pass).length}/${blocking.length} passed → ${allPass ? 'GREEN' : 'RED'}`);
  console.log(`live smoke: ${live.status} (non-blocking)`);
  console.log('================================================================\n');

  // machine-readable summary for the record
  const summary = {
    phase: 'P0', startedAt: started, finishedAt: new Date().toISOString(), green: allPass,
    gates: blocking.map((g) => ({ name: g.name, pass: g.pass, checks: g.checks })),
    extras: { k8PassFraction: blocking.find((g) => g.name.startsWith('K8'))?.passFraction, g2KillRates: blocking.find((g) => g.name.startsWith('G2'))?.killRates },
    liveSmoke: live,
  };
  const outDir = path.join(HERE, 'runs');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'p0-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`wrote ${path.relative(path.resolve(HERE, '..', '..'), path.join(outDir, 'p0-summary.json'))}`);

  process.exit(allPass ? 0 : 1);
}

main();
