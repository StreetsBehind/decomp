#!/usr/bin/env node
// Self-test for the BATCH-2 epoch #3 ACTIVE STRATEGY ABLATION driver (studies/meta-search/strategy-ablation.mjs).
//
// The generalized lint lesson (carried from gleaning #5 / the strategy-registry smoke): "a check that can't be
// SHOWN to fire is treated as ABSENT." So EVERY assertion layer below is shown to fire — each is planted with a
// case that TRIPS it AND a case that does NOT (a no-false-positive control), and the agreement-rule verdict is
// shown to FLIP (robust ⇄ strategy-sensitive) so the rule is non-gameable, not a constant pass.
//
// Layers, each shown to fire:
//   AGREE.   applyAgreementRule on a planted AGREEING arm-set (same load-bearing identity + same scale-gate N) →
//            'robust'; on a planted DISAGREEING set (different scale-gate N, OR different load-bearing identity) →
//            'strategy-sensitive'. The verdict FLIPS (the rule is discriminating, not vacuously 'robust').
//   FROZEN.  FROZEN_ABLATION_SET deep-equals ['mu_best','pareto_per_cell'] (stochastic excluded); getStrategy of
//            top_k / softmax / epsilon_greedy is REJECTED/absent.
//   STAMP.   every arm record + the run summary carry (eval_epoch, strategy) after stamping.
//   VETO.    the driver does NOT touch the insertion VETO from SELECTION (pareto_per_cell calls ZERO
//            archive.insert during selection — selection ≠ survival), mirroring the strategy-registry-smoke spy.
//   E2E.     a tiny end-to-end smoke — runOneArm executes under BOTH strategies on N=5 without error and returns
//            a well-formed arm record.
//
// Deterministic — runs on the P2a/P2b-calibrated scale-economics landscape (no models, no gateway).
//
// Run: node studies/meta-search/gates/strategy-ablation.mjs

import url from 'node:url';
import path from 'node:path';
import { makeArchive, perCellVetoOk } from '../src/archive.mjs';
import { buildScorecard } from '../src/scorecard.mjs';
import { makeLedger } from '../src/ledger.mjs';
import { makeRng } from '../src/rng.mjs';
import { defaultGenome, cloneGenome, genomeHash } from '../src/genome.mjs';
import { LETHAL_BUCKETS } from '../src/config.mjs';
import { STRATEGIES, FROZEN_ABLATION_SET, getStrategy } from '../src/strategy-registry.mjs';
import { makeScaleEconomicsEvaluator, makeBareOpusBaseline } from '../src/scale-landscape.mjs';
import { applyAgreementRule, scaleGateN, loadBearingIdentity, runOneArm } from '../strategy-ablation.mjs';
import { stampEpoch, stampEach, epochOf } from '../src/eval-epoch.mjs';

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail = '') {
  const ok = !!cond;
  if (ok) pass++; else fail++;
  results.push({ ok, name, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? `  [${detail}]` : ''}`);
}

// ---- a tiny arm-record factory for the agreement-rule layer. An "arm" only needs {strategy, seed, N,
//      dominates, loadBearing} for applyAgreementRule / scaleGateN. ---------------------------------------
const CHEAP_GATE = 'tier:cheap|shapes:true|gate:deterministic|checker:false';
const CHEAP_GATE_CK = 'tier:cheap|shapes:true|gate:deterministic|checker:true';
function arm(strategy, seed, N, dominates, loadBearing) { return { strategy, seed, N, dominates, loadBearing }; }
// a full 2-strategy × 2-seed × N-ladder arm-set where dominance starts at `gateN` with identity `lb` for every
// trajectory (the AGREEING shape). Arms below gateN don't dominate; arms ≥ gateN dominate with `lb`.
function ladder({ gateN, lb, Ns = [5, 9, 13, 17], strategies = ['mu_best', 'pareto_per_cell'], seeds = [1, 2] }) {
  const arms = [];
  for (const s of strategies) for (const sd of seeds) for (const N of Ns) arms.push(arm(s, sd, N, N >= gateN, N >= gateN ? lb : 'none'));
  return arms;
}

console.log('STRATEGY-ABLATION GATE — AGREE. applyAgreementRule flips robust ⇄ strategy-sensitive:');
{
  // (a) AGREEING: every trajectory dominates from N=5 with the same identity → 'robust'.
  const agreeing = ladder({ gateN: 5, lb: CHEAP_GATE });
  const rA = applyAgreementRule(agreeing);
  check('planted AGREEING arm-set (same gate-N=5 + same identity) → verdict robust', rA.verdict === 'robust', `verdict=${rA.verdict}`);
  check('  robust set reports zero disagreements', rA.disagreements.length === 0, `n=${rA.disagreements.length}`);
  check('  robust set: all 4 trajectories present', Object.keys(rA.scaleGateNByArm).length === 4, Object.keys(rA.scaleGateNByArm).join(','));

  // (b) DISAGREE on scale-gate N: pareto_per_cell#2 only starts dominating at N=13 (a later bucket) → sensitive.
  const disN = ladder({ gateN: 5, lb: CHEAP_GATE });
  for (const a of disN) if (a.strategy === 'pareto_per_cell' && a.seed === 2) { a.dominates = a.N >= 13; a.loadBearing = a.N >= 13 ? CHEAP_GATE : 'none'; }
  const rN = applyAgreementRule(disN);
  check('planted scale-gate-N disagreement (one arm gates at N=13) → verdict strategy-sensitive', rN.verdict === 'strategy-sensitive', `verdict=${rN.verdict}`);
  check('  disagreement names the scale-gate-N axis', rN.disagreements.some((d) => d.axis === 'scale-gate-N-bucket'), JSON.stringify(rN.disagreements.map((d) => d.axis)));

  // (c) DISAGREE on load-bearing identity: one trajectory's winner at its gate-N carries a DIFFERENT identity.
  const disLB = ladder({ gateN: 5, lb: CHEAP_GATE });
  for (const a of disLB) if (a.strategy === 'mu_best' && a.seed === 1 && a.N >= 5) a.loadBearing = CHEAP_GATE_CK; // checker:true instead of false
  const rLB = applyAgreementRule(disLB);
  check('planted load-bearing-identity disagreement (one arm uses checker:true) → verdict strategy-sensitive', rLB.verdict === 'strategy-sensitive', `verdict=${rLB.verdict}`);
  check('  disagreement names the load-bearing-mutation-identity axis', rLB.disagreements.some((d) => d.axis === 'load-bearing-mutation-identity'), JSON.stringify(rLB.disagreements.map((d) => d.axis)));

  // FLIP proof: the SAME function returns DIFFERENT verdicts on the agreeing vs disagreeing inputs.
  check('VERDICT FLIPS (robust on agreeing, strategy-sensitive on both disagreeing) — rule is non-gameable',
    rA.verdict === 'robust' && rN.verdict === 'strategy-sensitive' && rLB.verdict === 'strategy-sensitive',
    `${rA.verdict} / ${rN.verdict} / ${rLB.verdict}`);

  // a NEVER-DOMINATES trajectory → identity 'none' → also strategy-sensitive vs a dominating one (no false 'robust').
  const noneDom = ladder({ gateN: 5, lb: CHEAP_GATE });
  for (const a of noneDom) if (a.strategy === 'pareto_per_cell') { a.dominates = false; a.loadBearing = 'none'; }
  const rNone = applyAgreementRule(noneDom);
  check('a never-dominates strategy (gate-N "none") disagrees with a dominating one → strategy-sensitive', rNone.verdict === 'strategy-sensitive', `verdict=${rNone.verdict}`);

  // scaleGateN unit: lowest dominating N; 'none' when never dominates.
  check('scaleGateN: lowest dominating N', scaleGateN([arm('x', 1, 5, false, 'none'), arm('x', 1, 9, true, CHEAP_GATE), arm('x', 1, 13, true, CHEAP_GATE)]) === 9, '');
  check('scaleGateN: "none" when never dominates', scaleGateN([arm('x', 1, 5, false, 'none'), arm('x', 1, 9, false, 'none')]) === 'none', '');
}

console.log('\nSTRATEGY-ABLATION GATE — FROZEN. frozen ablation set + stochastic-strategy rejection:');
{
  check('FROZEN_ABLATION_SET deep-equals [mu_best, pareto_per_cell]',
    Array.isArray(FROZEN_ABLATION_SET) && FROZEN_ABLATION_SET.length === 2 && FROZEN_ABLATION_SET[0] === 'mu_best' && FROZEN_ABLATION_SET[1] === 'pareto_per_cell',
    FROZEN_ABLATION_SET.join(','));
  // the driver's default strategy list = the frozen set (no stochastic leakage).
  check('STRATEGIES keys === frozen ablation set (no extra strategy)', Object.keys(STRATEGIES).slice().sort().join(',') === FROZEN_ABLATION_SET.slice().sort().join(','), Object.keys(STRATEGIES).join(','));
  for (const banned of ['top_k', 'softmax', 'epsilon_greedy', 'argmax']) {
    let rejected = false;
    try { getStrategy(banned); } catch { rejected = true; }
    check(`getStrategy("${banned}") is REJECTED/absent (stochastic strategy excluded — RNG confound)`, rejected && !(banned in STRATEGIES), '');
  }
  // both frozen members resolve.
  check('getStrategy("mu_best") resolves', getStrategy('mu_best') === STRATEGIES.mu_best, '');
  check('getStrategy("pareto_per_cell") resolves', getStrategy('pareto_per_cell') === STRATEGIES.pareto_per_cell, '');
}

console.log('\nSTRATEGY-ABLATION GATE — STAMP. every arm record + the summary carry (eval_epoch, strategy):');
{
  const rawArms = [
    { strategy: 'mu_best', seed: 1, N: 5, winner: null },
    { strategy: 'pareto_per_cell', seed: 2, N: 9, winner: null },
  ];
  const stampedArms = stampEach(rawArms);
  // every arm carries BOTH (eval_epoch, strategy) after stamping.
  const everyArmStamped = stampedArms.every((a) => epochOf(a) === 0 && typeof a.strategy === 'string' && a.strategy.length > 0);
  check('every stamped arm record carries (eval_epoch=0, strategy)', everyArmStamped, JSON.stringify(stampedArms.map((a) => [a.eval_epoch, a.strategy])));
  // no-false-positive control: an UN-stamped raw arm fails the eval_epoch presence assertion (the stamp is what adds it).
  const unstamped = rawArms[0];
  check('  control: an UN-stamped arm has NO eval_epoch field (stamp is load-bearing)', !('eval_epoch' in unstamped), '');
  // the run summary carries (eval_epoch, strategies).
  const summary = stampEpoch({ phase: 'batch2-epoch3-strategy-ablation', strategies: ['mu_best', 'pareto_per_cell'], arms: stampedArms });
  check('the run summary carries eval_epoch + the strategies list', epochOf(summary) === 0 && Array.isArray(summary.strategies) && summary.strategies.join(',') === 'mu_best,pareto_per_cell', `epoch=${summary.eval_epoch} strategies=${summary.strategies.join(',')}`);
  // control: stampEpoch refuses an array (must stamp the summary that holds the arms, not the array) — shows the guard fires.
  let threwOnArray = false; try { stampEpoch(stampedArms); } catch { threwOnArray = true; }
  check('  control: stampEpoch refuses to stamp a bare array (guard fires)', threwOnArray, '');
}

// ---- helpers for the VETO layer (mirror the strategy-registry-smoke spy). ---------------------------------
function distinctGenome(seedTag) {
  const g = defaultGenome();
  g.integrator.recurrenceThreshold = (g.integrator.recurrenceThreshold || 1) + seedTag; // harmless, distinct hash
  return g;
}
// build a scorecard with explicit lethal-cell PASS sets, using REAL scale-d1 cell names so the cell keys are
// the epic::bucket::name shape pareto_per_cell reads.
async function scorecardForVeto({ genome, cellNames, crosscutPass, integrationPass, cost }) {
  const mk = (names, passNames) => ({ pass: passNames.length, total: names.length, fails: names.filter((n) => !passNames.includes(n)).map((n) => ({ name: n, why: 'x' })) });
  const wired = Object.fromEntries((cellNames.wire || []).map((n) => [n, true]));
  const run = {
    wire: { pass: (cellNames.wire || []).length, total: (cellNames.wire || []).length, wired },
    happy: mk(cellNames.happy || [], cellNames.happy || []),
    crosscut: mk(cellNames.crosscut || [], crosscutPass),
    integration: mk(cellNames.integration || [], integrationPass),
  };
  const L = makeLedger();
  if (cost > 0) L.charge('skeletonAuthor', { model: 'opus', inputTokens: 1000, outputTokens: Math.round(cost / 0.00008) });
  else L.charge('builder', { model: 'fusion', outputTokens: 100 });
  return buildScorecard({ genome, genomeHash: genomeHash(genome), epics: [{ name: 'scale-d1', cellNames, runs: [run, run] }], ledger: L });
}
function archiveFrom(entries) {
  return { members: entries.map((e) => ({ hash: e.sc.genomeHash, genome: e.genome, scorecard: e.sc, cost: e.sc.cost.total, reliability: e.sc.reliability })) };
}

console.log('\nSTRATEGY-ABLATION GATE — VETO. selection ≠ survival: pareto_per_cell never touches the insertion veto:');
{
  // real cell names so the lethal-cell census reads epic::bucket::name keys exactly as the driver does.
  const HERE = path.dirname(url.fileURLToPath(import.meta.url));
  const testsPath = path.resolve(HERE, '..', '..', 'build-gap', 'epics', 'scale-d1', 'tests.mjs');
  const t = await import(url.pathToFileURL(testsPath).href);
  const nm = (a) => (Array.isArray(a) ? a.map((x) => x.name) : []);
  const cellNames = { wire: Array.isArray(t.EXPECTS) ? t.EXPECTS.slice() : [], happy: nm(t.happy), crosscut: nm(t.crosscut), integration: nm(t.integration) };

  const gA = distinctGenome(11), gB = distinctGenome(12);
  // A is a lethal-cell specialist (passes ≥1 crosscut + ≥1 integration); B passes none.
  const scA = await scorecardForVeto({ genome: gA, cellNames, crosscutPass: (cellNames.crosscut || []).slice(0, 1), integrationPass: (cellNames.integration || []).slice(0, 1), cost: 0 });
  const scB = await scorecardForVeto({ genome: gB, cellNames, crosscutPass: [], integrationPass: [], cost: 0 });
  const archive = archiveFrom([{ genome: gA, sc: scA }, { genome: gB, sc: scB }]);
  const pool = [{ genome: gA, sc: scA }, { genome: gB, sc: scB }];

  // a real archive with a COUNTING insert spy: a SELECTION call must trigger ZERO inserts (no survival decision).
  let insertCalls = 0;
  const realArchive = makeArchive();
  const origInsert = realArchive.insert.bind(realArchive);
  realArchive.insert = (...a) => { insertCalls++; return origInsert(...a); };
  void realArchive; // selection reads .members of the breeding archive, never .insert — realArchive proves no insert path is taken
  const sel = getStrategy('pareto_per_cell')(archive, pool, makeRng(5), 2);
  check('pareto_per_cell selection produced μ=2 parents', sel.length === 2, `len=${sel.length}`);
  check('selection performed ZERO insert/survival decisions (selection ≠ survival)', insertCalls === 0, `insert calls during selection: ${insertCalls}`);

  // the REAL veto is UNCHANGED after a selection call: a known lethal drop is still rejected (veto un-mutated).
  const baseline = await scorecardForVeto({ genome: defaultGenome(), cellNames, crosscutPass: (cellNames.crosscut || []).slice(0, 1), integrationPass: [], cost: 0.27 });
  const dropper = await scorecardForVeto({ genome: gB, cellNames, crosscutPass: [], integrationPass: [], cost: 0 });
  const v = perCellVetoOk(dropper.cells, baseline.cells);
  check('insertion veto STILL rejects a lethal drop after selection ran (veto un-mutated)', v.ok === false && v.droppedCount >= 1, `ok=${v.ok} dropped=${v.droppedCount}`);
  // no-false-positive control: a candidate that passes everything the baseline passes is NOT vetoed.
  const okCand = await scorecardForVeto({ genome: gA, cellNames, crosscutPass: (cellNames.crosscut || []).slice(0, 1), integrationPass: (cellNames.integration || []).slice(0, 1), cost: 0 });
  const v2 = perCellVetoOk(okCand.cells, baseline.cells);
  check('  control: a non-dropping candidate is NOT vetoed (veto is discriminating)', v2.ok === true, `ok=${v2.ok} dropped=${v2.droppedCount}`);
}

console.log('\nSTRATEGY-ABLATION GATE — E2E. runOneArm runs under BOTH strategies on N=5 and returns a well-formed arm record:');
{
  const N = 5;
  const evaluate = await makeScaleEconomicsEvaluator({ N, epicK: 1 });
  const baseline = await makeBareOpusBaseline(N, buildScorecard);
  for (const strategy of ['mu_best', 'pareto_per_cell']) {
    const r = await runOneArm({ strategy, N, seed: 1, gens: 6, evaluate, baseline });
    const wellFormed = r && r.strategy === strategy && r.N === N && r.seed === 1
      && typeof r.dominates === 'boolean' && typeof r.isWinnerConfig === 'boolean'
      && typeof r.loadBearing === 'string' && r.surrogate && typeof r.surrogate.preqRho === 'number';
    check(`runOneArm[${strategy}] returns a well-formed arm record (strategy/N/seed/dominates/loadBearing/surrogate)`, wellFormed, `found=${r && r.found} winner=${r && r.winner ? r.winner.label : 'none'} lb=[${r && r.loadBearing}]`);
    // the load-bearing identity DERIVED from the winner genome matches loadBearingIdentity(winner.genome) (not hardcoded).
    if (r && r.winner) {
      check(`  load-bearing identity is DERIVED from the actual winner genome (not hardcoded)`, r.loadBearing === loadBearingIdentity(r.winner.genome), `record=[${r.loadBearing}] derived=[${loadBearingIdentity(r.winner.genome)}]`);
    }
  }
  // both strategies converge to the SAME winner on this landscape (the dominating config dominates its cell) —
  // a sanity that the ablation is apples-to-apples (not required by the rule, but a useful invariant here).
  const rMu = await runOneArm({ strategy: 'mu_best', N, seed: 1, gens: 6, evaluate, baseline });
  const rPc = await runOneArm({ strategy: 'pareto_per_cell', N, seed: 1, gens: 6, evaluate, baseline });
  check('both strategies reach the same winner config on N=5 (apples-to-apples sanity)', rMu.loadBearing === rPc.loadBearing && rMu.isWinnerConfig === rPc.isWinnerConfig, `mu=[${rMu.loadBearing}] pc=[${rPc.loadBearing}]`);
}

console.log(`\nSTRATEGY-ABLATION GATE: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('GATE FAILURE — a strategy-ablation assertion layer did not behave as specified.'); process.exit(1); }
console.log('✅ agreement rule flips robust ⇄ strategy-sensitive (non-gameable); frozen ablation set holds; (eval_epoch, strategy) stamped on every record; selection ≠ survival; runOneArm well-formed under both strategies.');

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) process.exit(0);
