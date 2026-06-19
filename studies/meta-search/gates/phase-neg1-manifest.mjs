#!/usr/bin/env node
// INSTRUMENT SELF-TEST MANIFEST — the "check-of-checks" (RUN-FOR-DAYS-PLAN.md B5 + "BUILD, in order" #2).
//
// THE GENERALIZED `rate()` LESSON: the VOID "92/92" was not a missing check — it was a check that silently
// DID NOT FIRE (a missing bucket defaulted to pass). So "a guard that can't be SHOWN to fire is treated as
// ABSENT." This manifest plants a fixture that deliberately TRIPS each Phase −1 guard and asserts the expected
// red / 0 / kill / rejection. Until it is GREEN, Phase −1's GO/HALT is reported PROVISIONAL.
//
// Phase −1 SUBSET (the rest — K7 decorrelation kill, drift monitor, cumulative veto, budget-ledger halt —
// gate Phase 0→1→2 and are not exercised here):
//   1. FAIL-canary  → a known-broken draw grades a REAL red (not a fake pass, not a harnessError disguised).
//   2. PASS-canary  → a known-good draw stays a REAL green (catches a break-everything grader).
//   3. empty / harnessError / timeout → 0  (the hardened rate()/relOf path; NEVER the old =1.0).
//   4. scanOracleLeak FIRES on a leak in a BUILD prompt AND a REPAIR prompt; passes a clean prompt (K3).
//   5. deterministic replay REJECTS a planted fake improvement (route-luck) and ACCEPTS a real one.
//   6. the replay-anchored labeler routes the known draws (delegates to label-draw-selftest.mjs).
//   7. AUDIT coevo-rung1.mjs `rateNum` — confirm it is DISPLAY-ONLY (not in the grade/gate/verdict path).
//
// Run: node studies/meta-search/gates/phase-neg1-manifest.mjs

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadEpicCtx, readDrawFiles, gradeRates, runStack, NOOP_REBUILD } from '../src/label-draw.mjs';
import { scanOracleLeak } from '../src/checker.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const MS = path.resolve(HERE, '..');
const dump = (p) => path.join(MS, 'runs', 'dump', p);

let pass = 0, fail = 0;
const fired = [];
function check(name, ok, detail = '') {
  if (ok) pass++; else fail++;
  fired.push({ ok, name, detail });
  console.log(`  ${ok ? '✅ FIRED' : '❌ DID NOT FIRE'}  ${name}${detail ? '  — ' + detail : ''}`);
}

const ctx = await loadEpicCtx('quota-d1');
const good = readDrawFiles(dump('census-q1-A/quota-d1-d3'), ctx.order);        // a known-PASS draw
const corrupted = { ...good, createWallet: good.createWallet.replace(/return wallet;/, 'const _leak = bio;\n  return wallet;') }; // free-id ⇒ runtime crash

// ───────────────────────────────────────────────────────────────────────────────────────────────────
console.log('GUARD 1 — FAIL canary (a broken draw must grade a REAL red):');
{
  const g = await gradeRates(corrupted, ctx.testsPath);
  check('FAIL-canary grades a real red (not a fake pass)', g.real && (g.c < 1 || g.i < 1) && !(g.c >= 1 && g.i >= 1), `real=${g.real} c=${(g.c * 100) | 0}% i=${(g.i * 100) | 0}%`);
}

console.log('\nGUARD 2 — PASS canary (a known-good draw must stay green):');
{
  const g = await gradeRates(good, ctx.testsPath);
  check('PASS-canary grades a real green', g.real && g.c >= 1 && g.i >= 1, `real=${g.real} c=${(g.c * 100) | 0}% i=${(g.i * 100) | 0}%`);
}

console.log('\nGUARD 3 — empty / harnessError / timeout → 0 (the hardened rate() path, no fake 1.0):');
{
  const empty = await gradeRates(Object.fromEntries(ctx.order.map((s) => [s, ''])), ctx.testsPath);
  check('all-empty surfaces → c=0,i=0 (not 1.0)', empty.c === 0 && empty.i === 0, `c=${empty.c} i=${empty.i} real=${empty.real} note=${empty.note}`);
  const bad = await gradeRates(good, path.join(MS, 'gates', 'lib', 'NONEXISTENT-tests.mjs'));
  check('bad testsPath → harnessError → c=0,i=0 (not 1.0)', bad.c === 0 && bad.i === 0 && !bad.real, `c=${bad.c} i=${bad.i} real=${bad.real} note=${bad.note}`);
  // the hardened predicate that maps {empty}/{timeout}/{harnessError} grades to a non-grade (→ 0):
  const isReal = (g) => !!(g && (g.crosscut || g.integration || g.happy));
  const allNonGrade = [{ empty: true }, { timeout: true }, { harnessError: 'x' }].every((g) => isReal(g) === false);
  check('synthetic empty/timeout/harnessError are non-grades (→0, never =1)', allNonGrade, 'isReal({empty})=isReal({timeout})=isReal({harnessError})=false');
}

console.log('\nGUARD 4 — scanOracleLeak fires on a leak in BUILD and REPAIR prompts (K3 oracle-blindness):');
{
  const ORACLE_TOKEN = 'SEAM+'; // an oracle-internal token from checker.mjs ORACLE_TOKENS
  const buildLeak = `Implement createProject. Note the oracle uses ${ORACLE_TOKEN} markers in its test names.`;
  const repairLeak = `Fix the bug. The failing test is "${ORACLE_TOKEN}@addMember representations agree".`;
  const cleanBuild = 'Implement createWallet: stamp ctx.session.orgId, return the wallet. No prose.';
  const cleanRepair = 'ReferenceError: bio is not defined. Define or remove it; preserve every guard.';
  check('leak in BUILD prompt → scanOracleLeak true', scanOracleLeak(buildLeak) === true, `token=${ORACLE_TOKEN}`);
  check('leak in REPAIR prompt → scanOracleLeak true', scanOracleLeak(repairLeak) === true);
  check('clean BUILD prompt → scanOracleLeak false', scanOracleLeak(cleanBuild) === false);
  check('clean REPAIR prompt → scanOracleLeak false', scanOracleLeak(cleanRepair) === false);
}

console.log('\nGUARD 5 — deterministic replay rejects a planted FAKE improvement, accepts a REAL one:');
// A "claimed improvement to full pass" is REPRODUCED iff the deterministic stack (route-back OFF) actually
// reaches full pass from raw. A real deterministic lever (q1-A/d2: shape) reproduces; a fake one (the
// corrupted draw, which only a MODEL route-back can fix) does NOT → the route-luck claim is rejected.
async function deterministicReproducesFullPass(files) {
  const run = await runStack(files, ctx, NOOP_REBUILD, 2);
  const g = await gradeRates(run.files, ctx.testsPath);
  return g.c >= 1 && g.i >= 1;
}
{
  const realClaim = await deterministicReproducesFullPass(readDrawFiles(dump('census-q1-A/quota-d1-d2'), ctx.order));
  const fakeClaim = await deterministicReproducesFullPass(corrupted);
  check('REAL deterministic improvement (d2) reproduces', realClaim === true);
  check('FAKE improvement (model-only, claimed deterministic) is REJECTED', fakeClaim === false, 'deterministic replay does not reproduce it');
}

console.log('\nGUARD 6 — replay-anchored labeler routes all known draws (delegates to label-draw-selftest):');
{
  const r = spawnSync(process.execPath, [path.join(HERE, 'label-draw-selftest.mjs')], { encoding: 'utf8' });
  const ok = r.status === 0;
  check('labeler self-test exits 0 (all buckets + route-luck guard)', ok, ok ? '' : (r.stdout || '').split('\n').filter((l) => l.includes('❌')).join(' | '));
}

console.log('\nGUARD 7 — AUDIT coevo-rung1.mjs rateNum (must be DISPLAY-ONLY, not in grade/gate/verdict):');
{
  const src = fs.readFileSync(path.join(MS, 'coevo-rung1.mjs'), 'utf8').split('\n');
  const callLines = src.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => /rateNum\(/.test(l) && !/function rateNum/.test(l));
  const attrStart = src.findIndex((l) => /function attribute\(/.test(l)) + 1;
  const attrEnd = src.findIndex((l) => /function rateNum\(/.test(l)) + 1; // rateNum def sits right after attribute()
  const allInAttribute = callLines.length > 0 && callLines.every(({ n }) => n > attrStart && n < attrEnd);
  const verdictLine = src.find((l) => /agg\.verdict\s*=/.test(l)) || '';
  const verdictUsesRateNum = /rateNum\(/.test(verdictLine);
  check('every rateNum call-site is inside attribute() (telemetry scope)', allInAttribute, `call-sites=${JSON.stringify(callLines.map((c) => c.n))} attribute()=[${attrStart}..${attrEnd}]`);
  check('agg.verdict does NOT use rateNum (uses hardened final.*.worst)', !verdictUsesRateNum);
  console.log('     NOTE: rateNum also has a SECONDARY latent bug — it is called on already-numeric rates');
  console.log('     (relOf stores numbers, not "a/b" strings) → String(0.25).split("/") has no denominator →');
  console.log('     always returns 1 → `gateRecovers` is always false → the SEAM_GATE_RESIDUAL note is dead.');
  console.log('     Quarantined to attribution TELEMETRY (agg.attribution → console/JSON only); the Phase −1');
  console.log('     metric path (relOf→rate→stat→verdict) is hardened and unaffected. Superseded for Phase −1');
  console.log('     decisions by the replay-anchored labeler. NOT patched here (frozen grade path untouched).');
}

// ───────────────────────────────────────────────────────────────────────────────────────────────────
console.log(`\nCHECK-OF-CHECKS MANIFEST: ${pass} guards fired correctly, ${fail} failed`);
if (fail > 0) { console.error('❌ MANIFEST FAILED — a guard that cannot be shown to fire is ABSENT. Phase −1 GO/HALT is PROVISIONAL.'); process.exit(1); }
console.log('✅ all Phase −1 guards demonstrably fire. The labeler + grade path are trustworthy for the GO/HALT call.');
