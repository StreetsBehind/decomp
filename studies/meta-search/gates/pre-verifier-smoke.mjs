#!/usr/bin/env node
// Smoke/self-test for the PRE verifier (src/pre-verifier.mjs; gleaning #2b PRE, DECISION-BRIEF #2).
//
// The generalized `rate()` lesson (carried from #5): "a check that can't be SHOWN to fire is treated as
// ABSENT." So this gate does not merely run the verifier — it PLANTS a violation that trips every assertion
// layer AND proves the no-false-positive case, then proves the worker wiring is INERT by default.
//
// Layers exercised, each shown to fire:
//   A. assertFullCore — SUBSETTED eval (ran 1 of 2 declared CORE epics) → missing/throw
//   B. assertFullCore — EXTRA/unexpected epic graded → extra/throw
//   C. assertFullCore — an epic with too-few K runs (minK=2, ran 1) → underK/throw
//   D. assertFresh    — a stale/empty scorecard fails; a no-bucket-footprint scorecard fails;
//                       a non-numeric harnessFailRate fails
//   E. NO-FALSE-POSITIVE — a correct full-CORE fresh scorecard passes BOTH
//   F. WORKER INERTNESS — evalGenome on the synthetic backend with NO expectedCore is unchanged; and a
//                         deliberately-subsetting evaluator passed WITHOUT expectedCore does NOT throw
//                         (proves the guard is gated on the caller's declaration, not always-on); WITH
//                         expectedCore the same subset DOES throw (proves the wiring is live when asked).
//
// Deterministic — synthetic backend, no models, no gateway.
//
// Run: node studies/meta-search/gates/pre-verifier-smoke.mjs

import url from 'node:url';
import { buildScorecard } from '../src/scorecard.mjs';
import { makeLedger } from '../src/ledger.mjs';
import { makeSyntheticEvaluator, SYNTH_CELLS } from '../src/evaluator.mjs';
import { defaultGenome, genomeHash } from '../src/genome.mjs';
import { evalGenome } from '../src/worker.mjs';
import {
  assertFullCore, assertFullCoreOrThrow, assertFresh, assertFreshOrThrow,
  runPreVerifier, isPreVerifierError,
} from '../src/pre-verifier.mjs';

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail = '') {
  const ok = !!cond;
  if (ok) pass++; else fail++;
  results.push({ ok, name, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? `  [${detail}]` : ''}`);
}
// assert a thunk throws a typed PreVerifierError (the §4.5 hard-fail), reporting the kind.
function throwsPre(name, thunk, wantKind = null) {
  let threw = null;
  try { thunk(); } catch (e) { threw = e; }
  const okType = threw && isPreVerifierError(threw);
  const okKind = wantKind ? (threw && threw.kind === wantKind) : true;
  check(name, okType && okKind, threw ? `threw kind=${threw.kind}` : 'DID NOT THROW');
}

// A synthetic per-epic run-block (full bucket footprint) for an epic of an arbitrary name.
function synthRunBlock() {
  const mk = (names, p) => ({ pass: p, total: names.length, fails: names.slice(p).map((n) => ({ name: n, why: 'x' })) });
  const wired = Object.fromEntries(SYNTH_CELLS.wire.map((n) => [n, true]));
  return {
    wire: { pass: 5, total: 5, wired }, happy: mk(SYNTH_CELLS.happy, 3),
    crosscut: mk(SYNTH_CELLS.crosscut, 5), integration: mk(SYNTH_CELLS.integration, 3),
  };
}
// Build a scorecard over the named epics, each with `k` runs.
function scorecardFor(epicNames, k = 2) {
  const L = makeLedger(); L.charge('builder', { model: 'fusion', outputTokens: 100 });
  const epics = epicNames.map((name) => ({ name, cellNames: SYNTH_CELLS, runs: Array.from({ length: k }, synthRunBlock) }));
  const sc = buildScorecard({ genome: null, genomeHash: 'pv-test', epics, ledger: L });
  const runsByEpic = Object.fromEntries(epicNames.map((n) => [n, k]));
  return { sc, runsByEpic };
}

const CORE = ['workspace', 'scale-d1']; // the P1 epoch-relative CORE-of-record for these tests

console.log('PRE-VERIFIER SMOKE — A. assertFullCore: subsetted eval (1 of 2 declared CORE epics):');
{
  const { sc, runsByEpic } = scorecardFor(['workspace']); // ran only 1 of the 2 declared
  const r = assertFullCore(sc, CORE, { runsByEpic });
  check('subset → ok=false, missing=[scale-d1], no extra/underK', r.ok === false && r.missing.join(',') === 'scale-d1' && r.extra.length === 0 && r.underK.length === 0, JSON.stringify(r));
  throwsPre('subset → assertFullCoreOrThrow throws PreVerifierError(subsetted-eval)', () => assertFullCoreOrThrow(sc, CORE, { runsByEpic }), 'subsetted-eval');
}

console.log('\nPRE-VERIFIER SMOKE — B. assertFullCore: extra/unexpected epic graded:');
{
  const { sc, runsByEpic } = scorecardFor(['workspace', 'scale-d1', 'rogue-epic']);
  const r = assertFullCore(sc, CORE, { runsByEpic });
  check('extra → ok=false, extra=[rogue-epic], no missing', r.ok === false && r.extra.join(',') === 'rogue-epic' && r.missing.length === 0, JSON.stringify(r));
  throwsPre('extra → throws PreVerifierError(subsetted-eval)', () => assertFullCoreOrThrow(sc, CORE, { runsByEpic }), 'subsetted-eval');
}

console.log('\nPRE-VERIFIER SMOKE — C. assertFullCore: an epic with too-few K runs (minK=2, ran 1):');
{
  // both declared epics present, but scale-d1 carries only 1 run while minK demands 2.
  const L = makeLedger(); L.charge('builder', { model: 'fusion', outputTokens: 100 });
  const epics = [
    { name: 'workspace', cellNames: SYNTH_CELLS, runs: [synthRunBlock(), synthRunBlock()] },
    { name: 'scale-d1', cellNames: SYNTH_CELLS, runs: [synthRunBlock()] },
  ];
  const sc = buildScorecard({ genome: null, genomeHash: 'pv-underk', epics, ledger: L });
  const runsByEpic = { workspace: 2, 'scale-d1': 1 };
  const r = assertFullCore(sc, CORE, { minK: 2, runsByEpic });
  check('under-K → ok=false, underK=[scale-d1], no missing/extra', r.ok === false && r.underK.join(',') === 'scale-d1' && r.missing.length === 0 && r.extra.length === 0, JSON.stringify(r));
  throwsPre('under-K → throws PreVerifierError(subsetted-eval)', () => assertFullCoreOrThrow(sc, CORE, { minK: 2, runsByEpic }), 'subsetted-eval');
  // and minK=1 (the default) on the SAME card passes (the floor is the lever, not an accident).
  check('under-K guard is minK-relative: same card passes at minK=1', assertFullCore(sc, CORE, { minK: 1, runsByEpic }).ok === true);
}

console.log('\nPRE-VERIFIER SMOKE — C2. zero-footprint epic trips under-K even with NO runsByEpic:');
{
  // an empty/cached perEpic entry (no buckets) → bucketCellTotal 0 → under-K, caught without a runsByEpic map.
  const sc = { perEpic: { workspace: { buckets: { wire: { pass: 5, total: 5 } }, epicCheck: true }, 'scale-d1': { buckets: {}, epicCheck: true } }, harnessFailRate: 0 };
  const r = assertFullCore(sc, CORE); // no runsByEpic supplied → falls back to structural footprint
  check('zero-footprint epic → underK=[scale-d1] (no runsByEpic needed)', r.ok === false && r.underK.join(',') === 'scale-d1', JSON.stringify(r));
}

console.log('\nPRE-VERIFIER SMOKE — D. assertFresh: stale / empty / no-footprint / bad-rate scorecards fail:');
{
  check('null scorecard → not fresh', assertFresh(null).ok === false);
  check('empty perEpic → not fresh', assertFresh({ perEpic: {}, harnessFailRate: 0 }).ok === false, assertFresh({ perEpic: {}, harnessFailRate: 0 }).reason);
  check('epic with no buckets map → not fresh', assertFresh({ perEpic: { workspace: { epicCheck: true } }, harnessFailRate: 0 }).ok === false);
  check('epic with no finite bucket counts → not fresh', assertFresh({ perEpic: { workspace: { buckets: { wire: {} } } }, harnessFailRate: 0 }).ok === false);
  check('non-numeric harnessFailRate → not fresh', assertFresh({ perEpic: { workspace: { buckets: { wire: { pass: 5, total: 5 } } } }, harnessFailRate: undefined }).ok === false);
  check('out-of-range harnessFailRate → not fresh', assertFresh({ perEpic: { workspace: { buckets: { wire: { pass: 5, total: 5 } } } }, harnessFailRate: 1.7 }).ok === false);
  throwsPre('assertFreshOrThrow throws PreVerifierError(stale-eval) on empty perEpic', () => assertFreshOrThrow({ perEpic: {}, harnessFailRate: 0 }), 'stale-eval');
}

console.log('\nPRE-VERIFIER SMOKE — D2. no-core-declared is itself a broken request:');
{
  const { sc } = scorecardFor(CORE);
  throwsPre('assertFullCore([]) throws PreVerifierError(no-core-declared)', () => assertFullCore(sc, []), 'no-core-declared');
  throwsPre('assertFullCore(null) throws PreVerifierError(no-core-declared)', () => assertFullCore(sc, null), 'no-core-declared');
}

console.log('\nPRE-VERIFIER SMOKE — E. NO-FALSE-POSITIVE: a correct full-CORE fresh scorecard passes BOTH:');
{
  const { sc, runsByEpic } = scorecardFor(CORE, 2);
  check('full CORE fresh card → assertFresh ok', assertFresh(sc).ok === true, assertFresh(sc).reason);
  check('full CORE fresh card → assertFullCore ok (no missing/extra/underK)', assertFullCore(sc, CORE, { runsByEpic }).ok === true);
  let threw = false;
  try { runPreVerifier(sc, CORE, { runsByEpic }); } catch { threw = true; }
  check('full CORE fresh card → runPreVerifier does NOT throw', threw === false);
  // a legitimate 1-epic PILOT passes ITS declared core (epoch-relative CORE is the caller's, not hard-coded).
  const pilot = scorecardFor(['scale-d1'], 1);
  check('1-epic pilot passes ITS declared core (epoch-relative)', assertFullCore(pilot.sc, ['scale-d1'], { runsByEpic: pilot.runsByEpic }).ok === true);
}

console.log('\nPRE-VERIFIER SMOKE — F. WORKER WIRING is INERT by default + live when asked:');
{
  const g = defaultGenome();
  // F1. evalGenome with NO expectedCore on the synthetic backend behaves EXACTLY as before this wiring:
  //     same genomeHash + same reliability + same perEpic keys (bit-identical scorecard shape).
  const evalSynth = makeSyntheticEvaluator({ epicK: 2, epicName: 'synthA' });
  const scNoCore = await evalGenome(g, { evaluate: evalSynth });
  const wantHash = genomeHash(g);
  check('inert: synthetic eval w/o expectedCore returns the normal scorecard (hash + reliability + 1 epic)',
    scNoCore.genomeHash === wantHash && Number.isFinite(scNoCore.reliability) && Object.keys(scNoCore.perEpic).join(',') === 'synthA',
    `hash=${scNoCore.genomeHash === wantHash} rel=${scNoCore.reliability.toFixed(3)} epics=${Object.keys(scNoCore.perEpic).join(',')}`);

  // F2. A deliberately-SUBSETTING evaluator (declares a 2-epic CORE but the backend only grades 1). Without
  //     expectedCore the worker must NOT throw (the guard is gated on the caller's declaration, not always-on).
  const evalSubset = () => ({
    epics: [{ name: 'workspace', cellNames: SYNTH_CELLS, runs: [synthRunBlock(), synthRunBlock()] }],
    ledger: (() => { const L = makeLedger(); L.charge('builder', { model: 'fusion', outputTokens: 10 }); return L; })(),
    routeDist: {},
  });
  let inertThrew = false;
  try { await evalGenome(g, { evaluate: evalSubset }); } catch { inertThrew = true; }
  check('inert: subsetting evaluator WITHOUT expectedCore does NOT throw (guard is opt-in)', inertThrew === false);

  // F3. The SAME subsetting evaluator WITH expectedCore = the 2-epic CORE → the worker THROWS the §4.5 hard-fail.
  let liveErr = null;
  try { await evalGenome(g, { evaluate: evalSubset, expectedCore: CORE }); } catch (e) { liveErr = e; }
  check('live: subsetting evaluator WITH expectedCore throws PreVerifierError(subsetted-eval)',
    liveErr && isPreVerifierError(liveErr) && liveErr.kind === 'subsetted-eval',
    liveErr ? `kind=${liveErr.kind} payload=${JSON.stringify(liveErr.payload)}` : 'DID NOT THROW');

  // F4. A COMPLETE evaluator WITH expectedCore declaring its single graded epic passes (no false hard-fail).
  let okErr = null;
  try { await evalGenome(g, { evaluate: () => evalSubset(), expectedCore: ['workspace'] }); } catch (e) { okErr = e; }
  check('live: complete eval WITH matching expectedCore does NOT throw (no false §4.5 hard-fail)', okErr === null, okErr ? String(okErr.message) : '');
}

console.log(`\nPRE-VERIFIER SMOKE: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('GATE FAILURE — a PRE-verifier assertion layer did not behave as specified.'); process.exit(1); }
console.log('✅ every PRE-verifier assertion fires on a planted violation; no false positives; worker wiring inert by default + live when asked.');

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) process.exit(0);
