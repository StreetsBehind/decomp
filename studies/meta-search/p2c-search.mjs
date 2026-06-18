#!/usr/bin/env node
// P2c — the EVOLUTIONARY SEARCH (the instrument→product discovery step). The deferred P2 machinery is now
// built + instrument-re-validated (P0 GREEN, K8 ≥0.90 under each): celled MAP-Elites (gates/p2c-map-elites),
// credit-attribution (gates/p2c-credit), the surrogate under K7 (gates/p2c-surrogate). This driver SWITCHES
// THEM ALL ON AT ONCE and asks the instrument→product question:
//
//   starting from the NAIVE pool (cheap build, no skeleton shapes, no gate, checker off = "naive /build-batch"),
//   does the assembled search AUTONOMOUSLY REDISCOVER the P2b cost-dominating config, reproducibly across
//   independent mutator seeds (R2C-4)?
//
// It runs on the P2a/P2b-CALIBRATED scale-economics landscape (src/scale-landscape.mjs) — deterministic, real
// epic cell-counts, pass-rates set to the LIVE measured numbers — because one live N=13 eval exceeds 150s
// (measured), so a multi-generation × multi-seed LIVE search is not completable/safe here; the full live
// multi-seed sequestered-TEST search is P3 (FREEZE §4/§6; gated on the routed baseline + diverse templates +
// 2nd oracle). The economics CLAIM is P2b's (live, measured); THIS run's claim is only that the upgraded
// SEARCH converges on that config — an instrument validation (cf. K8 rediscovery, here on real-shaped economics).
//
// Run: node studies/meta-search/p2c-search.mjs [--N 13,17] [--seeds 1,2] [--gens 8]

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { makeRng } from './src/rng.mjs';
import { runSearch } from './src/loop.mjs';
import { makeMapElitesArchive, makeCelledSelect } from './src/map-elites.mjs';
import { makeCreditStep } from './src/credit.mjs';
import { makeSurrogate, spearman } from './src/surrogate.mjs';
import { evalGenome } from './src/worker.mjs';
import { buildScorecard } from './src/scorecard.mjs';
import { defaultGenome, cloneGenome, genomeLabel, genomeHash } from './src/genome.mjs';
import { perCellVetoOk } from './src/archive.mjs';
import { DELTA, K7_RHO_FLOOR } from './src/config.mjs';
import { makeScaleEconomicsEvaluator, makeBareOpusBaseline, modeledFractions, BARE_OPUS_BAR } from './src/scale-landscape.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };

// the NAIVE seed pool — the cheap "naive /build-batch" candidate (no shapes, no gate, checker off) + 2 mild variants.
function naivePool() {
  const n0 = defaultGenome();
  const n1 = cloneGenome(n0); n1.retry.count = 2;
  const n2 = cloneGenome(n0); n2.builder.K = 2;
  return [n0, n1, n2];
}

// a deterministic, model-free proposer that includes the P2 integration-gate operators in its lethal-first
// gradient (the frozen heuristic proposer predates the gate node; left untouched). Kept inline so proposer.mjs
// — a shared path — is not modified.
function discoveryProposer() {
  const LETHAL = ['toggleIntegrationGate', 'integrationGateRepair', 'skeletonShapes', 'skeletonDepth', 'toggleChecker', 'checkerClasses'];
  const EXPLORE = ['builderK', 'retryCount', 'checkerKind', 'integrationGateKind'];
  return (digest, opNames, rng) => {
    const lethal = digest && digest.lethalFailCount > 0;
    const pool = (lethal ? LETHAL : EXPLORE).filter((n) => opNames.includes(n));
    const from = pool.length ? pool : opNames;
    return from[Math.floor((rng ? rng.next() : 0) * from.length)];
  };
}

const isWinnerConfig = (g) => g.skeletonAuthor.model !== 'opus' && g.skeletonAuthor.shapesIncluded === true && (g.integrationGate && g.integrationGate.kind === 'deterministic');

async function runOneSeed({ N, seed, gens, evaluate, baseline }) {
  const rng = makeRng(seed * 1009 + N);
  const surrogate = makeSurrogate();
  const preq = []; // prequential (predict-then-observe) K7 pairs over the live evals
  const onEval = (sc, genome) => {
    const p = surrogate.predict(genome); // predict from the PRIOR cache (honest held-out fidelity)
    if (p) { const tl = (sc.digest.failCounts.crosscut + sc.digest.failCounts.integration); preq.push({ pred: p.reliability, tru: sc.reliability, predLethalMiss: 0, truLethalMiss: tl }); }
    surrogate.observe(genome, sc);
  };
  const res = await runSearch({
    seedGenomes: naivePool(), evaluate, baseline, rng,
    archive: makeMapElitesArchive(), budget: { maxGen: gens, maxEvals: 400 },
    childrenPerParent: 3, populationSize: 6,
    proposer: discoveryProposer(),
    selectParents: makeCelledSelect(),
    creditAttribution: makeCreditStep(),
    onEval,
    stopWhen: (arc) => arc.members.some((m) => m.cost <= 1e-9 && m.reliability >= baseline.reliability - 1e-9 && isWinnerConfig(m.genome)),
  });
  // the proposed winner = the cheapest veto-passing archive member (every member already passes the per-cell
  // lethal veto vs the baseline at insertion), tie-broken by reliability.
  const members = res.archive.members.slice().sort((a, b) => (a.cost - b.cost) || (b.reliability - a.reliability));
  const winner = members[0] || null;
  // prequential K7 over the run (Spearman of predicted vs true reliability on held-out-at-prediction-time evals)
  const rho = preq.length >= 2 ? spearman(preq.map((p) => p.pred), preq.map((p) => p.tru)) : 1;
  return {
    N, seed, found: res.found, gens: res.gen, evals: res.evalCount, coverage: res.archive.coverage(), haltReason: res.haltReason,
    winner: winner ? { label: genomeLabel(winner.genome), hash: winner.hash, cost: winner.cost, reliability: winner.reliability, isWinnerConfig: isWinnerConfig(winner.genome), genome: winner.genome } : null,
    surrogate: { preqRho: rho, k7Held: rho >= K7_RHO_FLOOR, nPairs: preq.length, projectedScreenable: preq.length / Math.max(1, res.evalCount) },
    frontSize: res.archive.front().length,
  };
}

async function main() {
  const Ns = arg('N', '13,17').split(',').map(Number);
  const seeds = arg('seeds', '1,2').split(',').map(Number);
  const gens = Number(arg('gens', 8));
  const started = new Date().toISOString();
  const lines = []; const log = (s) => { console.log(s); lines.push(s); };

  log(`\n=== Meta-search P2c — the EVOLUTIONARY SEARCH (MAP-Elites + credit-attribution + surrogate, all ON) ===\n(${started})`);
  log(`question: from the NAIVE pool, does the assembled search autonomously rediscover the P2b cost-dominating config, reproducibly?`);
  log(`landscape: P2a/P2b-calibrated scale-economics (deterministic; real epic cell-counts; LIVE-measured pass-rates). N=${Ns.join(',')}, seeds=${seeds.join(',')}, ≤${gens} gens.\n`);

  const all = [];
  for (const N of Ns) {
    const evaluate = await makeScaleEconomicsEvaluator({ N, epicK: 1 });
    const baseline = await makeBareOpusBaseline(N, buildScorecard);
    const bar = BARE_OPUS_BAR[N];
    // sanity: the known P2b winner config genome's modeled scorecard, for the header.
    const wg = cloneGenome(defaultGenome()); wg.skeletonAuthor = { model: 'fusion', shapesIncluded: true, obligationDepth: 1 }; wg.integrationGate = { kind: 'deterministic', repairDepth: 2 };
    const wf = modeledFractions(wg, N);
    log(`--- N=${N} (${({5:'scale-d1',9:'scale-d2',13:'scale-d3',17:'scale-d4'})[N]}) — bare-opus bar: X-CUT ${(bar.x*100).toFixed(0)}% INTEG(proxy) ${(bar.iProxy*100).toFixed(0)}% $${bar.cost.toFixed(3)}, rel ${baseline.reliability.toFixed(3)} ---`);
    log(`    (fusion+shapes+gate modeled: X-CUT ${(wf.crosscut*100).toFixed(0)}% INTEG ${(wf.integration*100).toFixed(0)}% $0)`);
    const perSeed = [];
    for (const seed of seeds) {
      const r = await runOneSeed({ N, seed, gens, evaluate, baseline });
      perSeed.push(r); all.push(r);
      const w = r.winner;
      log(`  seed ${seed}: ${r.found ? 'FOUND' : 'halt:' + r.haltReason} in ${r.gens} gens / ${r.evals} evals; coverage ${r.coverage} cells; winner = [${w ? w.label : 'none'}]  $${w ? w.cost.toFixed(3) : '—'} rel ${w ? w.reliability.toFixed(3) : '—'} ${w && w.isWinnerConfig ? '✓winner-config' : ''}; surrogate K7 ρ=${r.surrogate.preqRho.toFixed(3)} ${r.surrogate.k7Held ? '≥floor✓' : '<floor✗'}`);
    }
    // reproducibility (R2C-4): do all seeds converge on the same load-bearing config (shapes+gate, cheap skeleton)?
    const allWinner = perSeed.every((r) => r.winner && r.winner.isWinnerConfig);
    const dominates = perSeed.every((r) => r.winner && r.winner.cost < baseline.cost.total - 1e-9 && r.winner.reliability >= baseline.reliability - DELTA);
    log(`  → reproducible across ${seeds.length} seeds: ${allWinner ? 'YES — all converge on cheap-skel+shapes+gate' : 'NO'}; dominates bare-opus (cost< & lethal non-inf & rel≥parity): ${dominates ? 'YES' : 'NO'}\n`);
  }

  log(`================================================================`);
  log(`P2c SEARCH verdict (PROVISIONAL — instrument validation on the measured-economics landscape; NOT P3):`);
  for (const N of Ns) {
    const rs = all.filter((r) => r.N === N);
    const ok = rs.every((r) => r.winner && r.winner.isWinnerConfig);
    const k7 = rs.every((r) => r.surrogate.k7Held);
    log(`  N=${N}: ${ok ? 'REDISCOVERED the cost-dominating config (cheap-skel + shapes + integration-gate, $0) on all seeds' : 'did NOT converge on all seeds'}; surrogate K7 held=${k7}`);
  }
  log(`  caveats: opus-whole cost proxy + bare-opus INTEG proxy (routed-baseline gap, STATE.md #3); one seam-topology;`);
  log(`  deterministic measured-economics landscape (live multi-seed sequestered-TEST search = P3). Winner is PROPOSED, not frozen.`);
  log(`================================================================`);

  const outDir = path.join(HERE, 'runs'); fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'p2c-search.json'), JSON.stringify({ phase: 'P2c-search', started, finishedAt: new Date().toISOString(), Ns, seeds, gens, results: all }, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'p2c-search.log'), lines.join('\n') + '\n');
  log(`\nwrote studies/meta-search/runs/p2c-search.json`);
}
main().catch((e) => { console.error('P2c search error:', e); process.exit(1); });
