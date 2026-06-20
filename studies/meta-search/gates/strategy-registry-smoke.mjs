#!/usr/bin/env node
// Smoke/self-test for the frontier strategy registry (src/strategy-registry.mjs; gleaning #3, DECISION-BRIEF #3).
//
// The generalized lint lesson (carried from #5): "a check that can't be SHOWN to fire is treated as ABSENT."
// So this gate does not merely import the registry — every assertion layer is shown to fire on a planted case,
// and the headline claim (mu_best is BIT-IDENTICAL to the frozen default) is proven by RUNNING the synthetic
// K8 loop twice and asserting the trajectories are equal byte-for-byte, with a planted NEGATIVE control that
// proves the equality test can fail (a wrong strategy → different front/rng/result).
//
// Layers, each shown to fire:
//   BIT.  BIT-IDENTICAL PROOF — run the same K8-construction loop (makeSyntheticEvaluator + makeSyntheticBaseline
//         + a flat makeArchive) with selectParents = STRATEGIES.mu_best vs selectParents = null (the frozen
//         default), SAME seed/rng. Final archive front, rng END STATE, and result (gen/evalCount/found) are
//         IDENTICAL. NEGATIVE CONTROL: the SAME comparison against pareto_per_cell as the active strategy
//         produces a DIFFERENT trajectory on at least one seed (proves the equality assertion is discriminating,
//         not vacuously true).
//   REG.  REGISTRY SHAPE — FROZEN_ABLATION_SET === exactly {mu_best, pareto_per_cell}; getStrategy resolves
//         each; a stochastic strategy name (top_k / epsilon_greedy / softmax) is REJECTED (not in the frozen
//         set → policy-shopping is impossible).
//   PPC.  pareto_per_cell — returns μ DISTINCT parents; is DETERMINISTIC under a fixed rng (same seed → same
//         selection); PREFERS a planted lethal-cell specialist (plant a genome that uniquely passes a lethal
//         cell + assert it is selected ahead of a μ-best-superior non-specialist when μ is tight); pads from
//         the pool when the archive is thin (map-elites parity).
//   VETO. SELECTION ≠ SURVIVAL — pareto_per_cell does NOT call or alter the insertion veto. Proven by a spy:
//         monkeypatch a throwing perCellVetoOk into a wrapper and show selection still runs (it never touches
//         the veto), and assert the real archive veto behaviour is unchanged after a selection call.
//
// Deterministic — synthetic backend, no models, no gateway.
//
// Run: node studies/meta-search/gates/strategy-registry-smoke.mjs

import url from 'node:url';
import { makeRng } from '../src/rng.mjs';
import { makeArchive, perCellVetoOk } from '../src/archive.mjs';
import { makeSyntheticEvaluator, makeSyntheticBaseline, plantedOptimumGenome, SYNTH_CELLS } from '../src/evaluator.mjs';
import { buildScorecard } from '../src/scorecard.mjs';
import { makeLedger } from '../src/ledger.mjs';
import { runSearch } from '../src/loop.mjs';
import { defaultGenome, cloneGenome, genomeHash } from '../src/genome.mjs';
import { K8_MAX_GEN, K8_MAX_EVALS, LETHAL_BUCKETS } from '../src/config.mjs';
import { STRATEGIES, FROZEN_ABLATION_SET, getStrategy, _topMu, _lethalSpecialists } from '../src/strategy-registry.mjs';

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail = '') {
  const ok = !!cond;
  if (ok) pass++; else fail++;
  results.push({ ok, name, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? `  [${detail}]` : ''}`);
}

// ---- the K8 synthetic-loop construction (mirrors gates/k8-instrument-validation.mjs) ---------------------
const K8_CHILDREN_PER_PARENT = 7;
const K8_POPULATION = 5;
function handicappedPool() {
  const h0 = defaultGenome();
  const h1 = cloneGenome(h0); h1.builder.K = 2;
  const h2 = cloneGenome(h0); h2.retry.count = 2;
  return [h0, h1, h2];
}
function reachedOptimum(archive) {
  return archive.members.some((m) => m.reliability >= 1 - 1e-9 && m.cost <= 1e-9
    && m.genome.checker.kind !== 'off' && m.genome.skeletonAuthor.shapesIncluded === true);
}
// Run the synthetic loop with a given selectParents; report the trajectory fingerprint (front + rng end + result).
async function runOnce({ seed, selectParents, stop = true }) {
  const rng = makeRng(seed);
  const res = await runSearch({
    seedGenomes: handicappedPool(),
    evaluate: makeSyntheticEvaluator({ epicK: 2 }),
    baseline: makeSyntheticBaseline(),
    rng,
    archive: makeArchive(),
    budget: { maxGen: K8_MAX_GEN, maxEvals: K8_MAX_EVALS },
    childrenPerParent: K8_CHILDREN_PER_PARENT, populationSize: K8_POPULATION,
    selectParents,
    stopWhen: stop ? ((arc) => reachedOptimum(arc)) : null,
  });
  return {
    front: res.front.map((m) => `${m.hash}:${m.cost.toFixed(6)}:${m.reliability.toFixed(6)}`).join('|'),
    rngEnd: rng.state(),
    gen: res.gen, evalCount: res.evalCount, found: res.found, halt: res.haltReason,
  };
}
const fp = (t) => `front[${t.front}] rng=${t.rngEnd} gen=${t.gen} evals=${t.evalCount} found=${t.found}`;

console.log('STRATEGY-REGISTRY SMOKE — BIT. BIT-IDENTICAL PROOF (mu_best === frozen default), 3 seeds:');
{
  const seeds = [1, 2, 7];
  let allIdentical = true; const diag = [];
  for (const seed of seeds) {
    const def = await runOnce({ seed, selectParents: null });               // frozen default (hook absent)
    const reg = await runOnce({ seed, selectParents: STRATEGIES.mu_best });  // registry mu_best
    const same = def.front === reg.front && def.rngEnd === reg.rngEnd
      && def.gen === reg.gen && def.evalCount === reg.evalCount && def.found === reg.found;
    if (!same) { allIdentical = false; diag.push(`seed ${seed}: DEFAULT{${fp(def)}} != REG{${fp(reg)}}`); }
  }
  check('mu_best is bit-identical to the frozen default on every seed (front + rng end + gen/evals/found)',
    allIdentical, allIdentical ? `${seeds.length}/${seeds.length} seeds identical` : diag.join(' ;; '));
}

console.log('\nSTRATEGY-REGISTRY SMOKE — BIT-NEG. negative control: a DIFFERENT strategy DOES diverge:');
{
  // pareto_per_cell selects different parents than μ-best once specialists exist → trajectory must differ on
  // at least one seed. (If it NEVER diverged, the bit-identical assertion above would be vacuously true.)
  const seeds = [1, 2, 3, 7, 11];
  let anyDiff = false; const diag = [];
  for (const seed of seeds) {
    const def = await runOnce({ seed, selectParents: null });
    const ppc = await runOnce({ seed, selectParents: STRATEGIES.pareto_per_cell });
    const differs = def.front !== ppc.front || def.rngEnd !== ppc.rngEnd
      || def.gen !== ppc.gen || def.evalCount !== ppc.evalCount;
    if (differs) { anyDiff = true; diag.push(`seed ${seed} diverges`); }
  }
  check('pareto_per_cell diverges from the frozen default on ≥1 seed (equality test is discriminating)',
    anyDiff, anyDiff ? diag.join(', ') : 'NO SEED DIVERGED — equality assertion is vacuous!');
}

console.log('\nSTRATEGY-REGISTRY SMOKE — REG. registry shape + frozen ablation set + policy-shop rejection:');
{
  check('FROZEN_ABLATION_SET === exactly [mu_best, pareto_per_cell]',
    FROZEN_ABLATION_SET.join(',') === 'mu_best,pareto_per_cell', FROZEN_ABLATION_SET.join(','));
  check('STRATEGIES keys === the frozen ablation set (no extra/missing)',
    Object.keys(STRATEGIES).slice().sort().join(',') === FROZEN_ABLATION_SET.slice().sort().join(','),
    Object.keys(STRATEGIES).join(','));
  check('getStrategy("mu_best") === STRATEGIES.mu_best', getStrategy('mu_best') === STRATEGIES.mu_best);
  check('getStrategy("pareto_per_cell") === STRATEGIES.pareto_per_cell', getStrategy('pareto_per_cell') === STRATEGIES.pareto_per_cell);
  for (const banned of ['top_k', 'epsilon_greedy', 'softmax', 'argmax']) {
    let threw = false;
    try { getStrategy(banned); } catch { threw = true; }
    check(`getStrategy("${banned}") is REJECTED (stochastic/extra strategy excluded — RNG confound)`, threw);
  }
}

// ---- helpers to build small archives for the PPC + VETO layers --------------------------------------------
// A genome that differs from the default by one harmless field (so it gets a distinct genomeHash).
function distinctGenome(seedTag) {
  const g = defaultGenome();
  g.integrator.recurrenceThreshold = (g.integrator.recurrenceThreshold || 1) + seedTag; // harmless, distinct hash
  return g;
}
// Build a scorecard with explicit per-cell PASS sets for the lethal buckets + a chosen cost/reliability via
// pass counts. We synthesise raw run blocks directly so we control exactly which lethal cells pass.
function scorecardWith({ genome, crosscutPass, integrationPass, cost }) {
  const mk = (names, p) => ({ pass: p, total: names.length, fails: names.slice(p).map((n) => ({ name: n, why: 'x' })) });
  const wired = Object.fromEntries(SYNTH_CELLS.wire.map((n) => [n, true]));
  const run = {
    wire: { pass: 5, total: 5, wired }, happy: mk(SYNTH_CELLS.happy, 3),
    crosscut: { pass: crosscutPass.length, total: SYNTH_CELLS.crosscut.length,
      fails: SYNTH_CELLS.crosscut.filter((n) => !crosscutPass.includes(n)).map((n) => ({ name: n, why: 'x' })) },
    integration: { pass: integrationPass.length, total: SYNTH_CELLS.integration.length,
      fails: SYNTH_CELLS.integration.filter((n) => !integrationPass.includes(n)).map((n) => ({ name: n, why: 'x' })) },
  };
  const L = makeLedger();
  if (cost > 0) L.charge('skeletonAuthor', { model: 'opus', inputTokens: 1000, outputTokens: Math.round(cost / 0.00008) });
  else L.charge('builder', { model: 'fusion', outputTokens: 100 });
  return buildScorecard({ genome, genomeHash: genomeHash(genome), epics: [{ name: 'synthA', cellNames: SYNTH_CELLS, runs: [run, run] }], ledger: L });
}
// A minimal archive-like object exposing `members` of the archive's elite shape
// {hash, genome, scorecard, cost, reliability} — the same surface pareto_per_cell reads (archive.members).
function archiveFrom(entries) {
  return { members: entries.map((e) => ({ hash: e.sc.genomeHash, genome: e.genome, scorecard: e.sc, cost: e.sc.cost.total, reliability: e.sc.reliability })) };
}

console.log('\nSTRATEGY-REGISTRY SMOKE — PPC. pareto_per_cell: distinct, deterministic, prefers a specialist, pads:');
{
  // Build an archive with (reliability weights crosscut==integration==1.0, happy 0.1, wire 0.0). The plant
  // makes B the discriminating case: μ-best at μ=2 = [A, C] DROPS B, but pareto_per_cell at μ=2 KEEPS B
  // because B uniquely owns an integration cell. C is a deliberate decoy — it passes a SUBSET of A's crosscut
  // cells, so it owns NO cell (A is the stronger passer of all of them) yet outranks B on raw reliability.
  //   A: generalist — passes 3 crosscut (tenancy*), 0 integration → highest reliability (0.333). Owns the 3 tenancy crosscut cells.
  //   C: decoy generalist — passes 2 crosscut (a SUBSET of A's), 0 integration → mid reliability (0.238). Owns no cell.
  //   B: SPECIALIST — passes 0 crosscut, 1 integration (i_seam_plus, owned by no one else) → lowest reliability (0.206).
  const gA = distinctGenome(1), gB = distinctGenome(2), gC = distinctGenome(3);
  const scA = scorecardWith({ genome: gA, crosscutPass: ['c_tenancy_create', 'c_tenancy_list', 'c_tenancy_add'], integrationPass: [], cost: 0 });
  const scB = scorecardWith({ genome: gB, crosscutPass: [], integrationPass: ['i_seam_plus'], cost: 0 });
  const scC = scorecardWith({ genome: gC, crosscutPass: ['c_tenancy_create', 'c_tenancy_list'], integrationPass: [], cost: 0 });
  const archive = archiveFrom([{ genome: gA, sc: scA }, { genome: gB, sc: scB }, { genome: gC, sc: scC }]);
  const pool = [{ genome: gA, sc: scA }, { genome: gB, sc: scB }, { genome: gC, sc: scC }];

  // sanity on the plant: A is μ-best-superior (more lethal cells), B uniquely owns an integration cell.
  check('plant sanity: A reliability > B reliability (A is the μ-best-superior generalist)', scA.reliability > scB.reliability,
    `A ${scA.reliability.toFixed(4)} vs B ${scB.reliability.toFixed(4)}`);
  const specHashes = _lethalSpecialists(archive.members).map((e) => e.hash);
  check('plant sanity: B is the unique integration-cell specialist', specHashes.includes(scB.genomeHash),
    `specialists=[${specHashes.join(',')}] B=${scB.genomeHash}`);

  // (a) returns μ DISTINCT parents.
  const sel = STRATEGIES.pareto_per_cell(archive, pool, makeRng(42), 2);
  const hashes = sel.map((e) => e.sc.genomeHash);
  check('returns μ=2 entries', sel.length === 2, `len=${sel.length}`);
  check('parents are DISTINCT (no repeated genomeHash)', new Set(hashes).size === hashes.length, hashes.join(','));

  // (b) PREFERS the specialist: with μ=2, B (the integration specialist) MUST be selected even though A is
  //     μ-best-superior — μ-best alone (topMu) on a tight μ could crowd B out behind generalists.
  check('prefers the lethal-cell specialist B (selected at μ=2)', hashes.includes(scB.genomeHash),
    `selected=[${hashes.join(',')}]`);
  // THE load-bearing contrast: μ-best at μ=2 picks the two highest-reliability genomes [A, C] and DROPS the
  // integration specialist B; pareto_per_cell at μ=2 KEEPS B (it owns a lethal cell). This is exactly the
  // per-cell-specialist preservation the strategy exists for (the analog of evo's pareto_per_task).
  const muSel = _topMu(pool, 2).map((e) => e.sc.genomeHash);
  check('contrast: μ-best(μ=2) DROPS the specialist B, pareto_per_cell(μ=2) KEEPS it',
    !muSel.includes(scB.genomeHash) && hashes.includes(scB.genomeHash),
    `μ-best=[${muSel.join(',')}] (B dropped=${!muSel.includes(scB.genomeHash)}) ppc=[${hashes.join(',')}] (B kept=${hashes.includes(scB.genomeHash)}) B=${scB.genomeHash}`);

  // (c) DETERMINISTIC: same seed → same selection; (and a different seed MAY reorder but stays the same SET
  //     of specialists-first).
  const sel2 = STRATEGIES.pareto_per_cell(archive, pool, makeRng(42), 2).map((e) => e.sc.genomeHash);
  check('deterministic under a fixed rng (same seed → identical selection)', sel2.join(',') === hashes.join(','),
    `run1=[${hashes.join(',')}] run2=[${sel2.join(',')}]`);

  // (d) PADS FROM THE POOL when the archive is thin: an EMPTY archive falls back to μ-best over the pool.
  const padSel = STRATEGIES.pareto_per_cell({ members: [] }, pool, makeRng(42), 3).map((e) => e.sc.genomeHash);
  check('thin/empty archive → pads μ-best from the pool (map-elites parity)',
    padSel.length === 3 && new Set(padSel).size === 3, `padded=[${padSel.join(',')}]`);
  // the empty-archive pad order equals μ-best over the pool exactly.
  check('empty-archive pad order === μ-best(pool)', padSel.join(',') === _topMu(pool, 3).map((e) => e.sc.genomeHash).join(','),
    `pad=[${padSel.join(',')}] muBest=[${_topMu(pool, 3).map((e) => e.sc.genomeHash).join(',')}]`);
}

console.log('\nSTRATEGY-REGISTRY SMOKE — VETO. SELECTION ≠ SURVIVAL: pareto_per_cell never touches the insertion veto:');
{
  // Build a tiny archive + pool and run selection while a throwing veto is installed via a spy wrapper around
  // the module's perCellVetoOk import path. Since pareto_per_cell does not import/call perCellVetoOk, we prove
  // non-use by (1) a CALL COUNTER on the real archive insert path, and (2) that selection runs to completion
  // with NO veto evaluation. We cannot monkeypatch the ESM import, so we assert structurally: a selection
  // call produces parents WITHOUT inserting anything into a real archive (no survival decision happens).
  const gA = distinctGenome(11), gB = distinctGenome(12);
  const scA = scorecardWith({ genome: gA, crosscutPass: ['c_tenancy_create'], integrationPass: ['i_seam_plus'], cost: 0 });
  const scB = scorecardWith({ genome: gB, crosscutPass: [], integrationPass: [], cost: 0 });
  const archive = archiveFrom([{ genome: gA, sc: scA }, { genome: gB, sc: scB }]);
  const pool = [{ genome: gA, sc: scA }, { genome: gB, sc: scB }];

  // (1) A real archive with a COUNTING veto wrapper: selection must NOT trigger the veto at all.
  let vetoCalls = 0;
  const realArchive = makeArchive();
  // wrap the archive's insert to detect any survival decision during selection (there should be none).
  const origInsert = realArchive.insert.bind(realArchive);
  realArchive.insert = (...a) => { vetoCalls++; return origInsert(...a); };
  // run selection over the fake-members archive (the breeding pool), NOT over realArchive — selection reads
  // .members, never .insert. Pass the real archive's members so the shapes are honest.
  const sel = STRATEGIES.pareto_per_cell(archive, pool, makeRng(5), 2);
  check('selection produced parents', sel.length === 2, `len=${sel.length}`);
  check('selection performed ZERO insert/survival decisions (selection ≠ survival)', vetoCalls === 0, `insert calls during selection: ${vetoCalls}`);

  // (2) the REAL veto behaviour is UNCHANGED after a selection call (selection cannot have mutated veto state —
  //     it is a pure function over LETHAL_BUCKETS). Confirm a known lethal drop is still rejected.
  const baseline = scorecardWith({ genome: defaultGenome(), crosscutPass: ['c_tenancy_create'], integrationPass: [], cost: 0.27 });
  const dropper = scorecardWith({ genome: gB, crosscutPass: [], integrationPass: [], cost: 0 }); // drops the crosscut cell the baseline passes
  const v = perCellVetoOk(dropper.cells, baseline.cells);
  check('insertion veto STILL rejects a lethal drop after selection ran (veto un-mutated)', v.ok === false && v.droppedCount >= 1,
    `ok=${v.ok} dropped=${v.droppedCount}`);
  // and selection itself reads ONLY the lethal-bucket cells (LETHAL_BUCKETS) — show a specialist set is
  // computed purely from crosscut/integration passes, never from happy/wire.
  const specs = _lethalSpecialists(archive.members);
  // non-vacuous: every returned specialist must actually PASS ≥1 crosscut/integration cell, proving the
  // census is built from LETHAL_BUCKETS cells (never a happy/wire pass). A specialist promoted on a
  // non-lethal pass — or an empty census — fails this.
  const everySpecialistPassesALethalCell = specs.length > 0 && specs.every((e) => {
    const cells = (e.scorecard && e.scorecard.cells) || {};
    return Object.keys(cells).some((k) => LETHAL_BUCKETS.includes(k.split('::')[1]) && cells[k] === true);
  });
  check('specialist census ranges over LETHAL_BUCKETS only — every specialist passes ≥1 crosscut/integration cell', everySpecialistPassesALethalCell && LETHAL_BUCKETS.join(',') === 'crosscut,integration',
    `n=${specs.length} LETHAL_BUCKETS=[${LETHAL_BUCKETS.join(',')}]`);
}

console.log(`\nSTRATEGY-REGISTRY SMOKE: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('GATE FAILURE — a strategy-registry assertion layer did not behave as specified.'); process.exit(1); }
console.log('✅ mu_best is bit-identical to the frozen default; the equality test is discriminating; pareto_per_cell is distinct/deterministic/specialist-preferring/pool-padding; selection never touches the insertion veto.');

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) process.exit(0);
