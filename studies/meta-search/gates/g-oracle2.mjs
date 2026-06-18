// G-ORACLE2 — the independence + validity gate for ORACLE #2 (DESIGN §6 G2 / §10 / kill K6).
//
// The freeze requires a SECOND, independently authored oracle before any "confirmed" promotion and
// before P3 TEST (DESIGN §6 lines 329–331; §10 lines 469–475). A second oracle is only worth anything
// if it (1) is itself a VALID grader (kills genuine defects, ≥ K6, and does not false-positive on the
// correct reference) and (2) AGREES with oracle #1 on the lethal buckets for the shared, provenance-neutral
// mutant battery (the K6 "two oracles must not disagree" clause). This gate asserts both, and additionally
// DEMONSTRATES the independence is not redundant: a pair of "evasion" surfaces that pass oracle #1's fixed
// scenarios in the lethal buckets but are caught by oracle #2's randomized/metamorphic properties.
//
// Additive: oracle #2 + this gate live under studies/meta-search/; the frozen build-gap apparatus tree
// (FREEZE §1) is imported read-only and untouched.

import path from 'node:path';
import url from 'node:url';
import { evaluateEpic } from '../../build-gap/lib/epic-sandbox.mjs';
import { refImpls, MUTANTS } from './lib/impls.mjs';
import { domainsFor } from '../../build-gap/lib/scale-oracle.mjs';
import { K6_KILL_FLOOR, LETHAL_BUCKETS } from '../src/config.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const TESTS1 = path.resolve(HERE, '..', '..', 'build-gap', 'epics', 'scale-d1', 'tests.mjs');   // oracle #1
const TESTS2 = path.resolve(HERE, 'lib', 'oracle2-tests-d1.mjs');                                // oracle #2

const rate = (b) => (b && b.total ? b.pass / b.total : 1);
const killedIn = (rr, bucket) => rate(rr[bucket]) < 1;                 // a lethal cell dropped below full
const killedAnyLethal = (rr) => LETHAL_BUCKETS.some((b) => killedIn(rr, b));
const evalUnder = (files, testsPath) => evaluateEpic({ mode: 'isolated', files, testsPath });

// ---- evasion surfaces: correct under oracle #1's FIXED scenarios (org-1/org-2, fixed ids) in the lethal
// buckets, but defective in general. These are NOT a defect claim against the frozen oracle #1 and are NOT
// part of the K6 agreement set — they are independence-VALUE evidence (the second provenance class adds
// lethal-bucket coverage the first lacks). REF is the correct reference; each evasion swaps ONE surface.
const d = domainsFor(1)[0];
const REF = refImpls();
const withFn = (fn, body) => ({ ...REF, [fn]: body });
const EVASIONS = [
  { id: 'evade_list_leak_nonorg2', why: 'leaks every foreign org EXCEPT the literal "org-2" oracle #1 happens to seed',
    files: withFn(d.listFn, `export function ${d.listFn}(ctx){ return [...ctx.db.${d.containersDb}.values()].filter(p => p.orgId===ctx.session.orgId || p.orgId!=='org-2'); }`) },
  { id: 'evade_list_truncate_first', why: 'returns only the FIRST own-org record — a leak-of-omission oracle #1 catches only in the low-weight happy bucket',
    files: withFn(d.listFn, `export function ${d.listFn}(ctx){ const own=[...ctx.db.${d.containersDb}.values()].filter(p=>p.orgId===ctx.session.orgId); return own.slice(0,1); }`) },
];

export async function run() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

  // (a) false-positive guard — the correct reference earns FULL lethal marks under oracle #2.
  const ref2 = await evalUnder(REF, TESTS2);
  ok('oracle #2: reference build NOT killed (no false positive)', LETHAL_BUCKETS.every((b) => rate(ref2[b]) === 1),
    `crosscut ${ref2.crosscut.pass}/${ref2.crosscut.total} integration ${ref2.integration.pass}/${ref2.integration.total} happy ${ref2.happy.pass}/${ref2.happy.total}`);
  // oracle #1 reference (already trusted) — needed for the agreement baseline.
  const ref1 = await evalUnder(REF, TESTS1);
  ok('oracle #1 & #2 agree the reference is clean (both full on lethal)', LETHAL_BUCKETS.every((b) => rate(ref1[b]) === 1 && rate(ref2[b]) === 1));

  // (b) K6 kill-rate per lethal bucket under oracle #2 + (c) agreement with oracle #1, per frozen mutant.
  const tally = { crosscut: { killed: 0, total: 0, missed: [] }, integration: { killed: 0, total: 0, missed: [] } };
  const disagree = [];
  for (const m of MUTANTS) {
    const r2 = await evalUnder(m.body, TESTS2);
    const r1 = await evalUnder(m.body, TESTS1);
    const k2 = killedIn(r2, m.target);
    const k1 = killedIn(r1, m.target);
    tally[m.target].total++;
    if (k2) tally[m.target].killed++; else tally[m.target].missed.push(m.id);
    if (k1 !== k2) disagree.push(`${m.id}[${m.target}] o1=${k1?'kill':'miss'} o2=${k2?'kill':'miss'}`);
  }
  const killRates = {};
  for (const b of LETHAL_BUCKETS) {
    const t = tally[b];
    const kr = t.total ? t.killed / t.total : 1;
    killRates[b] = kr;
    ok(`oracle #2 kill-rate[${b}] ≥ K6 (${K6_KILL_FLOOR})`, kr >= K6_KILL_FLOOR - 1e-9, `${kr.toFixed(3)} (${t.killed}/${t.total})${t.missed.length ? ' missed: ' + t.missed.join(',') : ''}`);
  }
  ok('oracle #1 & #2 AGREE on every frozen mutant (no lethal-bucket disagreement)', disagree.length === 0, disagree.length ? disagree.join(' | ') : 'all agree');

  // (d) independence VALUE — evasion surfaces caught by oracle #2's lethal buckets.
  const evidence = [];
  for (const e of EVASIONS) {
    const r2 = await evalUnder(e.files, TESTS2);
    const r1 = await evalUnder(e.files, TESTS1);
    const o2kill = killedAnyLethal(r2);
    const o1kill = killedAnyLethal(r1);
    evidence.push({ id: e.id, why: e.why, oracle1LethalKill: o1kill, oracle2LethalKill: o2kill });
    // gate condition: oracle #2 MUST catch it in a lethal bucket (validates the claimed independent strength).
    ok(`oracle #2 catches evasion "${e.id}" in a lethal bucket`, o2kill,
      `o2 crosscut ${r2.crosscut.pass}/${r2.crosscut.total} integration ${r2.integration.pass}/${r2.integration.total} | oracle #1 lethal-kill=${o1kill}`);
  }

  const pass = checks.every((c) => c.pass);
  return { name: 'G-oracle2 independence + validity gate', pass, checks, killRates, tally, disagree, evidence };
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => {
    for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`);
    console.log('\n  independence-value evidence (non-defect; oracle #1 is frozen):');
    for (const e of r.evidence) console.log(`    · ${e.id}: oracle#1 lethal-kill=${e.oracle1LethalKill}  oracle#2 lethal-kill=${e.oracle2LethalKill}  — ${e.why}`);
    console.log(`\n${r.pass ? 'OK' : 'FAIL'} — ${r.name}`);
    process.exit(r.pass ? 0 : 1);
  });
}
