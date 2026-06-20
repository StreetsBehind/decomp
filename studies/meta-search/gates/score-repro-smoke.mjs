#!/usr/bin/env node
// GATE — Batch-2 #2b-POST: the POST score-reproducibility KILL (src/score-repro.mjs). Every assertion layer is
// SHOWN TO FIRE — a planted violation that trips it AND a no-false-positive control (the generalized rate()
// lesson: a check that can't be shown to fire is ABSENT).
//
//   BAND-IDENTITY — scoreReproVerdict's per-bucket margin EQUALS credit.mjs's restore-margin on a SHARED
//                   scorecard fixture (the reuse is literal, not a drifted copy).
//   KILL FIRES    — a survivor whose fresh-seed re-eval lethal frac drops BELOW original − 2×SE → kill:true,
//                   removed from kept.
//   NO-FALSE-POS  — within-band re-eval → kept; UPWARD re-eval (strictly better) → kept (NOT killed); a 0/n
//                   genuinely-broken bucket re-evaling 0/n again (jitter within the clamped [0.15,0.85] floor)
//                   → NOT killed.
//   K5 CHARGING + BOUND — runScoreReproKill charges every re-eval to the budget; a planted set whose
//                   survivors×K×epics exceeds the cap → budgetOk=false + STOPS (reported, not silently
//                   truncated); within budget → budgetOk=true, evalsUsed == survivors×K×epics.
//   STAMP         — verdict records carry eval_epoch=0.
//
// Run: node studies/meta-search/gates/score-repro-smoke.mjs

import url from 'node:url';
import { scoreReproVerdict, runScoreReproKill } from '../src/score-repro.mjs';
import { attributeBlame, bucketSE, lethalCounts } from '../src/credit.mjs';
import { buildScorecard } from '../src/scorecard.mjs';
import { RESTORE_MARGIN_SE, K5_EVAL_CAP, LETHAL_BUCKETS } from '../src/config.mjs';
import { epochOf } from '../src/eval-epoch.mjs';

let pass = 0, fail = 0; const fails = [];
function check(name, cond, detail = '') {
  if (cond) pass++; else { fail++; fails.push(name); }
  console.log(`  ${cond ? '✅' : '❌'} ${name}${detail ? `  [${detail}]` : ''}`);
}
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// ----------------------------------------------------------------------------------------------------------
// Fixture helpers — build a worst-of-K scorecard with chosen lethal pass-COUNTS (nested-prefix passing so a
// pass-count maps cleanly to a pass-fraction, exactly like scale-landscape's mkRun).
// ----------------------------------------------------------------------------------------------------------
const names = (b, n) => Array.from({ length: n }, (_, i) => `${b}${i}`);
const CELLNAMES = { wire: ['w0', 'w1'], happy: ['h0'], crosscut: names('c', 5), integration: names('i', 5) };
// nested-prefix passing: the first `cc`/`ig` cells of crosscut/integration pass (so a pass-COUNT maps cleanly
// to a pass-fraction, exactly like scale-landscape's mkRun).
function mkRun(cc, ig) {
  return {
    wire: { wired: Object.fromEntries(CELLNAMES.wire.map((n) => [n, true])) },
    happy: { fails: [] },
    crosscut: { fails: CELLNAMES.crosscut.slice(cc).map((n) => ({ name: n })) },
    integration: { fails: CELLNAMES.integration.slice(ig).map((n) => ({ name: n })) },
  };
}
// a worst-of-K scorecard with crosscut cc/5 and integration ig/5 passing (K identical runs → worst==that count).
function card(hash, cc, ig, K = 1) {
  const runs = Array.from({ length: K }, () => mkRun(cc, ig));
  return buildScorecard({ genome: null, genomeHash: hash, epics: [{ name: 'e', cellNames: CELLNAMES, runs }], ledger: null });
}

// ====================================================================================================
// LAYER 1 — BAND-IDENTITY: scoreReproVerdict's margin === credit's restore-margin on a SHARED fixture.
// ====================================================================================================
console.log('LAYER BAND-IDENTITY — the kill band IS credit.mjs\'s restore-margin (single source of truth):');
{
  // shared lethal fixture: crosscut 2/5, integration 4/5. The verdict's per-bucket margin must equal
  // RESTORE_MARGIN_SE × bucketSE(frac,total) — and that is EXACTLY what attributeBlame computes on the same card.
  const orig = card('shared', 2, 4);
  const reEval = card('shared-re', 2, 4);
  const v = scoreReproVerdict(orig, reEval);
  const lc = lethalCounts(orig);
  for (const pb of v.perBucket) {
    const expected = RESTORE_MARGIN_SE * bucketSE(lc[pb.bucket].frac, lc[pb.bucket].total);
    check(`margin on ${pb.bucket} == RESTORE_MARGIN_SE × bucketSE(frac,total)`, approx(pb.margin, expected),
      `verdict=${pb.margin.toFixed(6)} credit=${expected.toFixed(6)} frac=${lc[pb.bucket].frac.toFixed(2)} n=${lc[pb.bucket].total}`);
  }
  // ...and literally equals the margin attributeBlame derives on the worst lethal bucket of the SAME card.
  // attributeBlame targets the LOWEST-frac lethal bucket (crosscut 2/5=0.40 here) and exposes `margin`.
  const ab = attributeBlame({ candidateGenome: { skeletonAuthor: {}, checker: { kind: 'off', obligationClasses: [], repairDepth: 0 } }, candidateScorecard: orig, evaluate: () => ({ epics: [], ledger: null }) });
  // attributeBlame is async; resolve and compare on the crosscut bucket margin.
  await ab.then((a) => {
    const cross = v.perBucket.find((p) => p.bucket === 'crosscut');
    check('verdict crosscut margin == attributeBlame restore-margin on the SAME card (literal reuse)', approx(cross.margin, a.margin),
      `verdict=${cross.margin.toFixed(6)} attributeBlame=${a.margin.toFixed(6)} (target=${a.target})`);
  });
  // the [0.15,0.85] clamp floor: a 0/5 broken bucket still carries a non-zero margin (so a single jitter can't kill).
  const broken = card('broken', 5, 0); // integration 0/5
  const vb = scoreReproVerdict(broken, broken);
  const intM = vb.perBucket.find((p) => p.bucket === 'integration').margin;
  check('a 0/n genuinely-broken lethal bucket carries a NON-ZERO margin (the clamped noise floor)', intM > 0,
    `integration 0/5 margin=${intM.toFixed(6)} (== ${RESTORE_MARGIN_SE}×bucketSE(0,5)=${(RESTORE_MARGIN_SE * bucketSE(0, 5)).toFixed(6)})`);
}

// ====================================================================================================
// LAYER 2 — KILL FIRES: a re-eval that drops BELOW original − 2×SE on a lethal bucket → kill.
// ====================================================================================================
console.log('\nLAYER KILL-FIRES — a downward breach below original − 2×SE kills:');
{
  // original crosscut 5/5 (frac 1.0 → clamped pHat 0.85, margin = 2×sqrt(0.85·0.15/5) ≈ 0.319 → 5 cells, so a
  // drop to ≤ round((1.0−0.319)×5)=round(3.4)=3 passing is a downward breach). Re-eval crosscut 2/5 (0.40) is a
  // breach of (1.0−0.319)−0.40 ≈ 0.28 below floor → KILL.
  const orig = card('lucky', 5, 5);
  const reEval = card('lucky-re', 2, 5); // crosscut collapsed 5/5 → 2/5
  const v = scoreReproVerdict(orig, reEval);
  check('downward breach on crosscut → kill:true', v.kill === true && v.reproducible === false,
    `kill=${v.kill} worstDownBreach=${v.worstDownBreach ? v.worstDownBreach.bucket : 'none'} depth=${v.worstDownBreach ? v.worstDownBreach.breachDepth.toFixed(3) : '—'}`);
  check('  the breached bucket is reported (crosscut)', v.worstDownBreach && v.worstDownBreach.bucket === 'crosscut');
  const cross = v.perBucket.find((p) => p.bucket === 'crosscut');
  check('  per-bucket downBreach flag set on the breached bucket', cross.downBreach === true && cross.withinBand === false);
}

// ====================================================================================================
// LAYER 3 — NO-FALSE-POSITIVE: within-band kept; upward kept; 0/n→0/n jitter kept.
// ====================================================================================================
console.log('\nLAYER NO-FALSE-POSITIVE — within-band / upward / broken-stable are KEPT:');
{
  // (a) within-band: original 4/5, re-eval 4/5 (Δ=0) — clearly within margin → reproducible, NOT killed.
  const v1 = scoreReproVerdict(card('wb', 4, 4), card('wb-re', 4, 4));
  check('within-band re-eval (Δ=0) → reproducible, NOT killed', v1.kill === false && v1.reproducible === true,
    `kill=${v1.kill} withinBand=${v1.perBucket.every((p) => p.withinBand)}`);

  // (b) within-band, small drop INSIDE the floor: original 5/5 (margin ≈ 0.319 → 1.6 cells), re-eval 4/5 (Δ=−0.2)
  //     is within the band → NOT killed (a single-cell jitter does not kill).
  const v2 = scoreReproVerdict(card('jit', 5, 5), card('jit-re', 4, 5));
  check('single-cell drop INSIDE the noise floor → NOT killed', v2.kill === false,
    `crosscut 5/5→4/5 Δ=−0.20 vs margin≈${v2.perBucket.find((p) => p.bucket === 'crosscut').margin.toFixed(3)} → withinBand`);

  // (c) UPWARD re-eval (strictly better): original 2/5, re-eval 5/5 → up-breach, NOT a kill.
  const v3 = scoreReproVerdict(card('up', 2, 2), card('up-re', 5, 5));
  check('UPWARD re-eval (re-eval strictly better) → NOT killed (one-sided downward kill)', v3.kill === false && v3.reproducible === true,
    `kill=${v3.kill} upBreach(crosscut)=${v3.perBucket.find((p) => p.bucket === 'crosscut').upBreach}`);

  // (d) a genuinely-broken 0/5 bucket re-evaling 0/5 again (jitter within the clamped floor) → NOT killed.
  const v4 = scoreReproVerdict(card('brk', 5, 0), card('brk-re', 5, 0));
  check('0/n broken bucket re-evaling 0/n again (within clamped floor) → NOT killed', v4.kill === false,
    `integration 0/5→0/5 Δ=0, margin=${v4.perBucket.find((p) => p.bucket === 'integration').margin.toFixed(3)}>0`);
}

// ====================================================================================================
// LAYER 4 — K5 CHARGING + BOUND: every re-eval charged; over-budget STOPS (reported, not truncated).
// ====================================================================================================
console.log('\nLAYER K5-CHARGING + BOUND — re-evals charged to K5; over-budget STOPS, not silently truncates:');
{
  // a deterministic stochastic-per-seed re-eval fixture: survivor sA is a LUCKY over-estimate (its re-eval on a
  // fresh seed drops), survivor sB is stable. This is the in-gate analog of the surrogate/credit fixtures —
  // deterministic per seed but varying across seeds.
  const sA = { genome: { id: 'A' }, scorecard: card('A', 5, 5), hash: 'A' };       // lucky: original 5/5 crosscut
  const sB = { genome: { id: 'B' }, scorecard: card('B', 4, 4), hash: 'B' };       // stable
  // reEvaluate: for genome A on a fresh seed it reproduces LOW (2/5 crosscut → downward breach); B stays 4/4.
  const reEvaluate = (genome /*, seed */) => (genome.id === 'A' ? card('A-re', 2, 5) : card('B-re', 4, 4));

  // within budget: survivors=2, K=1, coreEpics=2 → bound=4 ≤ cap.
  const budget = { spent: 0, cap: K5_EVAL_CAP };
  const r = await runScoreReproKill({ survivors: [sA, sB], reEvaluate, K: 1, coreEpics: 2, budget });
  check('within budget: budgetOk=true', r.budgetOk === true, `budgetOk=${r.budgetOk}`);
  check('  evalsUsed == survivors × K × coreEpics (every re-eval charged)', r.evalsUsed === 2 * 1 * 2, `evalsUsed=${r.evalsUsed} (==4)`);
  check('  budget.spent advanced by evalsUsed', budget.spent === 4, `spent=${budget.spent}`);
  check('  the lucky survivor A is KILLED, the stable survivor B is KEPT', r.killed.length === 1 && r.killed[0].hash === 'A' && r.kept.length === 1 && r.kept[0].hash === 'B',
    `killed=[${r.killed.map((k) => k.hash)}] kept=[${r.kept.map((k) => k.hash)}]`);
  check('  freshSeeds logged for every survivor', Array.isArray(r.freshSeeds) && r.freshSeeds.length === 2);

  // over budget: cap so low that even the FIRST survivor's re-eval (cost K×coreEpics) cannot be charged.
  const tightCap = 1; // bound per survivor = 1×2 = 2 > cap 1 → STOP before any charge
  const budget2 = { spent: 0, cap: tightCap };
  const r2 = await runScoreReproKill({ survivors: [sA, sB], reEvaluate, K: 1, coreEpics: 2, budget: budget2 });
  check('over budget: budgetOk=false (STOPS, does not truncate)', r2.budgetOk === false, `budgetOk=${r2.budgetOk}`);
  check('  no survivor silently passed: remaining lists the unprocessed survivors', r2.remaining.length === 2,
    `remaining=${r2.remaining.length} kept=${r2.kept.length} killed=${r2.killed.length}`);
  check('  budget not overspent past the cap', budget2.spent <= tightCap, `spent=${budget2.spent} cap=${tightCap}`);
  check('  the reported bound == survivors × K × coreEpics', r2.bound === 2 * 1 * 2, `bound=${r2.bound}`);

  // partial budget: cap allows exactly ONE survivor, then STOPS on the second (the precise STOP boundary).
  const budget3 = { spent: 0, cap: 2 }; // first survivor costs 2 → fits; second would push to 4 > 2 → STOP
  const r3 = await runScoreReproKill({ survivors: [sA, sB], reEvaluate, K: 1, coreEpics: 2, budget: budget3 });
  check('partial budget: processes survivors up to the cap then STOPS (no truncation of the rest)',
    r3.budgetOk === false && (r3.kept.length + r3.killed.length) === 1 && r3.remaining.length === 1,
    `processed=${r3.kept.length + r3.killed.length} remaining=${r3.remaining.length} evalsUsed=${r3.evalsUsed}`);
}

// ====================================================================================================
// LAYER 5 — STAMP: verdict records carry eval_epoch=0.
// ====================================================================================================
console.log('\nLAYER STAMP — verdict records carry eval_epoch=0:');
{
  const s = { genome: { id: 'A' }, scorecard: card('S', 5, 5), hash: 'S' };
  const r = await runScoreReproKill({ survivors: [s], reEvaluate: () => card('S-re', 2, 5), K: 1, coreEpics: 2, budget: { spent: 0, cap: K5_EVAL_CAP } });
  check('every verdict record is stamped eval_epoch=0', r.verdicts.length === 1 && epochOf(r.verdicts[0]) === 0 && r.verdicts[0].eval_epoch === 0,
    `eval_epoch=${r.verdicts[0] && r.verdicts[0].eval_epoch}`);
  check('  the run summary carries eval_epoch=0', r.eval_epoch === 0);
}

// ====================================================================================================
// SANITY — the kill is genuinely ONE-SIDED: an all-upward survivor set kills nobody even under tight scrutiny.
// ====================================================================================================
console.log('\nLAYER ONE-SIDED SANITY — an all-reproducing/upward set kills nobody:');
{
  const survivors = [
    { genome: { id: 'p' }, scorecard: card('p', 4, 4), hash: 'p' },
    { genome: { id: 'q' }, scorecard: card('q', 3, 3), hash: 'q' },
  ];
  const reEvaluate = (g) => (g.id === 'p' ? card('p-re', 4, 4) : card('q-re', 5, 5)); // p stable, q upward
  const r = await runScoreReproKill({ survivors, reEvaluate, K: 1, coreEpics: 2, budget: { spent: 0, cap: K5_EVAL_CAP } });
  check('reproducing + upward survivors → 0 killed (no false fire)', r.killed.length === 0 && r.kept.length === 2,
    `killed=${r.killed.length} kept=${r.kept.length}`);
}

console.log(`\nSCORE-REPRO SMOKE: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('GATE FAILURE — score-repro kill not proven: ' + fails.join('; ')); process.exit(1); }
console.log('✅ band is credit\'s 2×SE (single source), the downward kill fires, no-false-positive on within-band/upward/0-of-n, re-evals charged to K5 with a reported bound + STOP-not-truncate, records stamped eval_epoch=0.');

export const ok = true;

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) { /* ran above */ }
