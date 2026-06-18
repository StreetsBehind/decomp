// P2c-1 gate — INSTRUMENT RE-VALIDATION under the celled MAP-Elites archive (the search spine).
//
// MAP-Elites is a P2 mechanism (FREEZE.md §5 — NOT frozen) that replaces the P1 flat Pareto list. Admitting
// it changes the archive AND parent selection, so — exactly as P2b re-validated K8 under the widened
// operator set — the instrument must be re-validated under the new mechanism before any search result is
// trusted. This gate is the MAP-Elites analog of gates/k8-instrument-validation.mjs:
//   1. REDISCOVERY: the loop, breeding from the CELLED archive, still rediscovers the planted known-dominating
//      genome within the FROZEN K8 budget (≤8 gen AND ≤300 evals) on ≥90% of the pinned seeds.
//   2. VETO IN-LOOP: the per-cell lethal veto still fires at MAP-Elites insertion (a trap that drops a lethal
//      cell below baseline is rejected) — the load-bearing veto is not bypassed by the new archive.
//   3. NO COLLAPSE (K4): the celled archive fills >1 cell on a representative run — the diversity machinery
//      MAP-Elites exists to provide is actually working (a flat μ-best pool would collapse toward one point).
// All deterministic (synthetic landscape; no models), so the gate is reproducible like K8.

import url from 'node:url';
import { makeRng } from '../src/rng.mjs';
import { makeMapElitesArchive, makeCelledSelect } from '../src/map-elites.mjs';
import { makeSyntheticEvaluator, makeSyntheticBaseline, plantedOptimumGenome, SYNTH_CELLS } from '../src/evaluator.mjs';
import { buildScorecard } from '../src/scorecard.mjs';
import { makeLedger } from '../src/ledger.mjs';
import { runSearch } from '../src/loop.mjs';
import { defaultGenome, cloneGenome, genomeHash, validateGenome } from '../src/genome.mjs';
import { K8_MAX_GEN, K8_MAX_EVALS } from '../src/config.mjs';

// Same search shape as the frozen K8 gate (cpp=7×mu=5 = 35 evals/gen → ≤300 over ≤8 gens). The pinned seed
// set + pass floor are reused verbatim so this is a like-for-like re-validation, only the archive differs.
const CPP = 7;
const POP = 5;
const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const MIN_PASS_FRACTION = 0.90;

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

export async function run() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

  ok('planted optimum is a valid genome', validateGenome(plantedOptimumGenome()).ok);
  const baseline = makeSyntheticBaseline();
  const select = makeCelledSelect();

  // 1. rediscovery under the celled archive + celled selection.
  let found = 0; const results = []; let maxCoverage = 0;
  for (const seed of SEEDS) {
    const rng = makeRng(seed);
    const archive = makeMapElitesArchive();
    const res = await runSearch({
      seedGenomes: handicappedPool(), evaluate: makeSyntheticEvaluator({ epicK: 2 }), baseline, rng,
      archive, budget: { maxGen: K8_MAX_GEN, maxEvals: K8_MAX_EVALS },
      childrenPerParent: CPP, populationSize: POP,
      selectParents: select,
      stopWhen: (arc) => reachedOptimum(arc),
    });
    const within = res.found && res.gen <= K8_MAX_GEN && res.evalCount <= K8_MAX_EVALS;
    if (within) found++;
    maxCoverage = Math.max(maxCoverage, archive.coverage());
    results.push({ seed, found: res.found, gen: res.gen, evals: res.evalCount, coverage: archive.coverage(), halt: res.haltReason });
  }
  const frac = found / SEEDS.length;
  const foundRes = results.filter((r) => r.found);
  ok(`rediscovers planted optimum within budget on ≥${MIN_PASS_FRACTION * 100}% of pinned seeds (MAP-Elites)`,
    frac >= MIN_PASS_FRACTION,
    `${found}/${SEEDS.length} (${(frac * 100).toFixed(0)}%); worst evals ${foundRes.length ? Math.max(...foundRes.map((r) => r.evals)) : 'n/a'}/${K8_MAX_EVALS}, worst gen ${foundRes.length ? Math.max(...foundRes.map((r) => r.gen)) : 'n/a'}/${K8_MAX_GEN}`);

  // 3. no collapse (K4): the celled archive spreads across multiple cells (a flat μ-best pool would not).
  const medCoverage = results.map((r) => r.coverage).sort((a, b) => a - b)[Math.floor(results.length / 2)];
  ok('K4 no-collapse: celled archive fills >1 cell (median over seeds)', medCoverage > 1, `median coverage ${medCoverage} cells, max ${maxCoverage}`);

  // 2. the per-cell veto fires OPERATIONALLY at MAP-Elites insertion (same trap as the K8 gate).
  const trapLedger = makeLedger(); trapLedger.charge('builder', { model: 'fusion', outputTokens: 500 });
  const trapRuns = [{
    wire: { pass: 5, total: 5, wired: Object.fromEntries(SYNTH_CELLS.wire.map((n) => [n, true])) },
    happy: { pass: 3, total: 3, fails: [] },
    crosscut: { pass: 0, total: 5, fails: SYNTH_CELLS.crosscut.map((n) => ({ name: n, why: 'trap' })) },
    integration: { pass: 0, total: 3, fails: SYNTH_CELLS.integration.map((n) => ({ name: n, why: 'trap' })) },
  }];
  const trap = buildScorecard({ genome: defaultGenome(), genomeHash: 'p2c-trap', epics: [{ name: 'synthA', cellNames: SYNTH_CELLS, runs: trapRuns }], ledger: trapLedger });
  const arc = makeMapElitesArchive();
  const ins = arc.insert(trap, defaultGenome(), baseline);
  ok('veto fires in-loop under MAP-Elites: a lethal-cell-dropping trap is rejected', ins.inserted === false && ins.reason.startsWith('lethal-veto'), ins.reason);

  const pass = checks.every((c) => c.pass);
  return { name: 'P2c-1 MAP-Elites instrument re-validation', pass, checks, results, passFraction: frac };
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => { for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`); console.log(`\n${r.pass ? 'OK' : 'FAIL'} — ${r.name}`); process.exit(r.pass ? 0 : 1); });
}
