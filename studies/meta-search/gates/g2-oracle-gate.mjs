// G2 — the oracle-validity gate (DESIGN §6 G2 / kill K6). The epic battery's ground truth is one
// scale-oracle template, so a blind oracle would let real defects through and corrupt every fitness
// number. This gate runs a battery of GENUINE single-obligation mutants per lethal bucket and measures
// the oracle's KILL-RATE (fraction detected = targeted bucket drops below full). It gates the lethal
// buckets at the FROZEN floor K6 = 0.90. A reference (correct) build must NOT be killed (false-positive
// guard). Below floor ⇒ the battery is untrustworthy ⇒ fix the oracle first (K6).
//
// This upgrades the existing tools/scale-oracle-selftest.mjs (a pass/fail mutation test) into a numeric,
// pre-registered gate, without touching the frozen apparatus tree.

import path from 'node:path';
import url from 'node:url';
import { evaluateEpic } from '../../build-gap/lib/epic-sandbox.mjs';
import { refImpls, MUTANTS } from './lib/impls.mjs';
import { K6_KILL_FLOOR, LETHAL_BUCKETS } from '../src/config.mjs';

const TESTS = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..', 'build-gap', 'epics', 'scale-d1', 'tests.mjs');
const rate = (b) => (b && b.total ? b.pass / b.total : 1);

export async function run() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

  // false-positive guard: the correct reference must earn full marks (not "killed").
  const r = await evaluateEpic({ mode: 'isolated', files: refImpls(), testsPath: TESTS });
  ok('reference build is NOT killed (no false positive)', LETHAL_BUCKETS.every((b) => rate(r[b]) === 1), `crosscut ${r.crosscut.pass}/${r.crosscut.total} integration ${r.integration.pass}/${r.integration.total}`);

  // kill-rate per lethal bucket
  const tally = { crosscut: { killed: 0, total: 0, missed: [] }, integration: { killed: 0, total: 0, missed: [] } };
  for (const m of MUTANTS) {
    const rr = await evaluateEpic({ mode: 'isolated', files: m.body, testsPath: TESTS });
    const killed = rate(rr[m.target]) < 1;
    tally[m.target].total++;
    if (killed) tally[m.target].killed++; else tally[m.target].missed.push(m.id);
  }

  const killRates = {};
  for (const b of LETHAL_BUCKETS) {
    const t = tally[b];
    const kr = t.total ? t.killed / t.total : 1;
    killRates[b] = kr;
    ok(`kill-rate[${b}] ≥ K6 (${K6_KILL_FLOOR})`, kr >= K6_KILL_FLOOR - 1e-9, `${kr.toFixed(3)} (${t.killed}/${t.total})${t.missed.length ? ' missed: ' + t.missed.join(',') : ''}`);
  }

  const pass = checks.every((c) => c.pass);
  return { name: 'G2 oracle kill-rate gate', pass, checks, killRates, tally };
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => { for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`); console.log(`\n${r.pass ? 'OK' : 'FAIL'} — ${r.name}`); process.exit(r.pass ? 0 : 1); });
}
