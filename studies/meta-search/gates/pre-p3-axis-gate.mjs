#!/usr/bin/env node
// THE PRE-P3 PROXY→REAL HARD GATE (gleaning #1, trigger (b) RECLASSIFIED; DECISION-BRIEF #1).
//
// Trigger (b) "internal-vs-headline divergence" is INERT until measured-INTEG exists — wired as an in-loop
// detector it would silently never fire = a FALSE ALL-CLEAR. So the disposition RECLASSIFIES it into a HARD,
// run-ONCE-before-TEST BLOCKER: before the frozen PROPOSED winner is scored on the sequestered TEST set, this
// gate forces the question the whole program's caveats turn on —
//
//     "Is the headline resting on the opus-WHOLE proxy / the X-CUT sub-metric / UNMEASURED INTEG?"
//
// If yes, the routed all-frontier baseline (STATE.md #3) + a measured-INTEG path + the 2nd hand-authored
// oracle are PREREQUISITES, not afterthoughts — and TEST scoring must NOT proceed.
//
// THIS GATE IS DESIGNED TO BLOCK P3 TODAY. That is the point: as of this build the proxies are NOT yet
// converted to real (no SETTLED routed-baseline scale verdict, no LIVE co-measured head-to-head INTEG), so
// the gate reports BLOCKED + exits non-zero, enumerating exactly which prerequisites are unmet. It detects by
// the EXISTENCE of the real settled artifacts (src/axis-check.mjs checkPreP3Prerequisites) — there is NO
// hardcoded pass/fail; when the artifacts land, the gate flips to READY on its own.
//
// FREEZE POSTURE: Class B, report-only. This gate never touches a frozen invariant and never re-decides any
// candidate — it gates a HUMAN action (the one-time TEST draw). Run:
//   node studies/meta-search/gates/pre-p3-axis-gate.mjs

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { checkPreP3Prerequisites } from '../src/axis-check.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');

export function run({ root = ROOT } = {}) {
  const status = checkPreP3Prerequisites({ root, fs, path });
  return status;
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  console.log('\n=== PRE-P3 PROXY→REAL HARD GATE (gleaning #1, reclassified trigger (b)) ===\n');
  console.log('Question: is the P3 headline resting on the opus-whole proxy / X-CUT sub-metric / unmeasured INTEG?\n');

  const status = run();
  for (const d of status.details) {
    const mark = d.met ? '✅ MET ' : '⛔ UNMET';
    console.log(`  ${mark}  ${d.id}`);
    console.log(`           removes proxy: ${d.what}`);
    if (d.found.length) console.log(`           found: ${d.found.join('; ')}`);
    console.log(`           ${d.note}`);
    console.log('');
  }

  console.log('================================================================');
  if (status.blocked) {
    console.log(`PRE-P3 GATE: BLOCKED — ${status.unmet.length}/${status.details.length} prerequisites unmet: [${status.unmet.join(', ')}]`);
    console.log('P3 (sequestered-TEST scoring of the frozen winner) MUST NOT proceed: the headline is still');
    console.log('proxy-bound (opus-whole / X-CUT / unmeasured INTEG). Convert the proxies to real first.');
    console.log('  → This BLOCKED status is EXPECTED as of this build (the prerequisite artifacts do not exist yet).');
    console.log('================================================================\n');
    process.exit(1);
  }
  console.log(`PRE-P3 GATE: READY — all ${status.details.length} prerequisites met: [${status.met.join(', ')}]`);
  console.log('The proxies are converted to real; P3 TEST scoring of the frozen winner may proceed.');
  console.log('================================================================\n');
  process.exit(0);
}
