// K8 — instrument self-validation (DESIGN §0/§9 / kill K8). The most consequential possible outcome of
// the program is a K1 null ("no hybrid reaches parity at ≤ cost"); a null is only interpretable if the
// search CAN find a winner when one exists. So this gate seeds a deliberately-handicapped pool plus a
// hand-built KNOWN-DOMINATING genome and requires the loop to REDISCOVER it within the FROZEN budget
// (≤ 8 generations AND ≤ 300 evals). It also asserts the per-cell veto fires OPERATIONALLY inside the
// loop (a planted trap that drops a lethal cell below baseline is rejected). No K1 null is reportable
// until this passes.
//
// Run over a set of pinned mutator seeds and require near-unanimous rediscovery, so the result reflects
// the search MACHINERY, not one lucky trajectory (the 100% base rate over 120 random seeds is recorded in
// P0-RESULTS.md). All deterministic (synthetic landscape; no models).

import url from 'node:url';
import { makeRng } from '../src/rng.mjs';
import { makeArchive } from '../src/archive.mjs';
import { makeSyntheticEvaluator, makeSyntheticBaseline, plantedOptimumGenome, SYNTH_CELLS } from '../src/evaluator.mjs';
import { buildScorecard } from '../src/scorecard.mjs';
import { makeLedger } from '../src/ledger.mjs';
import { runSearch } from '../src/loop.mjs';
import { defaultGenome, cloneGenome, genomeHash, validateGenome } from '../src/genome.mjs';
import { K8_MAX_GEN, K8_MAX_EVALS } from '../src/config.mjs';

// FROZEN K8 search parameters (pinned in P0; cpp=7×mu=5 = 35 evals/gen → ≤300 over ≤8 gens, worst 269).
// Base rate over 500 random seeds = 99.4% rediscovery within budget (P0-RESULTS.md); the pinned set
// (seeds 1..30) is all-pass (30/30), and the gate threshold carries margin so it is not a lucky single
// trajectory.
const K8_CHILDREN_PER_PARENT = 7;
const K8_POPULATION = 5;
const K8_SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const K8_MIN_PASS_FRACTION = 0.90; // require ≥90% of pinned seeds to rediscover within budget (actual: 30/30)

function handicappedPool() {
  const h0 = defaultGenome();                              // cheap, checker off, no shapes
  const h1 = cloneGenome(h0); h1.builder.K = 2;
  const h2 = cloneGenome(h0); h2.retry.count = 2;
  return [h0, h1, h2];
}

// the planted optimum's Pareto point (reliability 1, cost 0) — "rediscovered" = the archive reaches it.
function reachedOptimum(archive) {
  return archive.members.some((m) => m.reliability >= 1 - 1e-9 && m.cost <= 1e-9
    && m.genome.checker.kind !== 'off' && m.genome.skeletonAuthor.shapesIncluded === true);
}

export async function run() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

  const opt = plantedOptimumGenome();
  ok('planted optimum is a valid genome', validateGenome(opt).ok);
  const baseline = makeSyntheticBaseline();

  // sanity: the planted optimum genuinely dominates the baseline (cheaper AND reliability-parity).
  const ev = makeSyntheticEvaluator({ epicK: 2 });
  const optRaw = ev(opt);
  const optSc = buildScorecard({ genome: opt, genomeHash: genomeHash(opt), epics: optRaw.epics, ledger: optRaw.ledger });
  ok('planted optimum dominates baseline (cost< & reliability≥)', optSc.cost.total < baseline.cost.total && optSc.reliability >= baseline.reliability, `opt(rel ${optSc.reliability.toFixed(3)},$${optSc.cost.total}) vs base(rel ${baseline.reliability.toFixed(3)},$${baseline.cost.total})`);

  // the search: rediscover the optimum from the handicapped pool across pinned seeds.
  let found = 0; const results = [];
  for (const seed of K8_SEEDS) {
    const rng = makeRng(seed);
    const res = await runSearch({
      seedGenomes: handicappedPool(), evaluate: makeSyntheticEvaluator({ epicK: 2 }), baseline, rng,
      archive: makeArchive(), budget: { maxGen: K8_MAX_GEN, maxEvals: K8_MAX_EVALS },
      childrenPerParent: K8_CHILDREN_PER_PARENT, populationSize: K8_POPULATION,
      stopWhen: (arc) => reachedOptimum(arc),
    });
    const within = res.found && res.gen <= K8_MAX_GEN && res.evalCount <= K8_MAX_EVALS;
    if (within) found++;
    results.push({ seed, found: res.found, gen: res.gen, evals: res.evalCount, halt: res.haltReason });
  }
  const frac = found / K8_SEEDS.length;
  ok(`rediscovers planted optimum within budget on ≥${K8_MIN_PASS_FRACTION * 100}% of pinned seeds`, frac >= K8_MIN_PASS_FRACTION, `${found}/${K8_SEEDS.length} (${(frac * 100).toFixed(0)}%); worst evals ${Math.max(...results.filter((r) => r.found).map((r) => r.evals))}/${K8_MAX_EVALS}, worst gen ${Math.max(...results.filter((r) => r.found).map((r) => r.gen))}/${K8_MAX_GEN}`);

  // the per-cell veto fires OPERATIONALLY inside the loop: a trap that drops a lethal cell below baseline
  // is rejected at archive insertion (proves the veto isn't bypassed during the search).
  const trapLedger = makeLedger(); trapLedger.charge('builder', { model: 'fusion', outputTokens: 500 });
  // baseline passes crosscut c1 (1/5); the trap drops c1 (crosscut 0/5) while inflating happy/wire.
  const trapRuns = [{
    wire: { pass: 5, total: 5, wired: Object.fromEntries(SYNTH_CELLS.wire.map((n) => [n, true])) },
    happy: { pass: 3, total: 3, fails: [] },
    crosscut: { pass: 0, total: 5, fails: SYNTH_CELLS.crosscut.map((n) => ({ name: n, why: 'trap' })) },
    integration: { pass: 0, total: 3, fails: SYNTH_CELLS.integration.map((n) => ({ name: n, why: 'trap' })) },
  }];
  const trap = buildScorecard({ genome: defaultGenome(), genomeHash: 'k8-trap', epics: [{ name: 'synthA', cellNames: SYNTH_CELLS, runs: trapRuns }], ledger: trapLedger });
  const arc = makeArchive();
  const ins = arc.insert(trap, defaultGenome(), baseline);
  ok('veto fires in-loop: a lethal-cell-dropping trap is rejected', ins.inserted === false && ins.reason.startsWith('lethal-veto'), ins.reason);

  const pass = checks.every((c) => c.pass);
  return { name: 'K8 instrument self-validation', pass, checks, results, passFraction: frac };
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => { for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`); console.log(`\n${r.pass ? 'OK' : 'FAIL'} — ${r.name}`); process.exit(r.pass ? 0 : 1); });
}
