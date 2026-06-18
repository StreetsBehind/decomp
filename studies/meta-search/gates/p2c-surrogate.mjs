// P2c-3 gate — the surrogate-scorer under the K7 calibration kill (DESIGN §5/§11/§7-K7). Validates, on the
// deterministic synthetic landscape:
//   A. FIDELITY: a surrogate trained on part of the gene family predicts held genomes well enough that the
//      Spearman ρ on the lethal sub-metric clears the FROZEN K7 floor (0.80) → the surrogate is TRUSTED.
//   B. K7 KILL FIRES: when predictions are decorrelated from truth (each genome paired with another's true
//      scorecard), ρ collapses below the floor and the surrogate is KILLED (driver reverts to all-true evals)
//      — a drifting surrogate can never silently mis-rank the search.
//   C. COST SAVING: the surrogate actually predicts (cache-hit / k-NN) instead of forcing a true eval, and
//      returns null on a cold/too-far genome (which the caller must true-eval) — so it screens, never guesses
//      blind.
// All deterministic — no models.

import url from 'node:url';
import { makeSurrogate, spearman } from '../src/surrogate.mjs';
import { makeSyntheticEvaluator } from '../src/evaluator.mjs';
import { buildScorecard } from '../src/scorecard.mjs';
import { defaultGenome, cloneGenome, genomeHash } from '../src/genome.mjs';
import { K7_RHO_FLOOR } from '../src/config.mjs';

const ev = makeSyntheticEvaluator({ epicK: 2 });
const scoreOf = (g) => { const raw = ev(g); return buildScorecard({ genome: g, genomeHash: genomeHash(g), epics: raw.epics, ledger: raw.ledger }); };

// a spread of genomes over the load-bearing genes (shapes × checker kind × #classes) → varied reliabilities.
function genomeFamily() {
  const out = [];
  for (const shapes of [false, true])
    for (const ck of ['off', 'deterministic'])
      for (const nClasses of [0, 1, 2, 3])
        for (const repair of [0, 1, 2]) {
          const g = cloneGenome(defaultGenome());
          g.skeletonAuthor = { model: 'fusion', shapesIncluded: shapes, obligationDepth: shapes ? 2 : 0 };
          if (ck === 'off') g.checker = { kind: 'off', obligationClasses: [], repairDepth: 0 };
          else g.checker = { kind: 'deterministic', obligationClasses: ['tenancy', 'authz', 'mass-assign'].slice(0, nClasses), repairDepth: repair };
          out.push(g);
        }
  // de-dup by hash (off-checker rows collapse across nClasses/repair)
  const seen = new Set(); const uniq = [];
  for (const g of out) { const h = genomeHash(g); if (seen.has(h)) continue; seen.add(h); uniq.push(g); }
  return uniq;
}

export async function run() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

  const fam = genomeFamily();
  const train = fam.filter((_, i) => i % 2 === 0);
  const held = fam.filter((_, i) => i % 2 === 1);

  // A. fidelity: train, then predict the held set via k-NN; ρ on lethal reliability must clear K7.
  const sur = makeSurrogate();
  for (const g of train) sur.observe(g, scoreOf(g));
  const heldSample = held.map((g) => ({ genome: g, trueScorecard: scoreOf(g) }));
  const calA = sur.calibrate(heldSample);
  ok(`A surrogate fidelity clears K7 (ρ ≥ ${K7_RHO_FLOOR}) on held genomes`, calA.pass && calA.rho >= K7_RHO_FLOOR, `ρ=${calA.rho.toFixed(3)} over n=${calA.n}; alive=${calA.alive}`);
  const predictedFraction = held.filter((g) => sur.predict(g)).length / held.length;
  ok('C cost saving: surrogate predicts held genomes (k-NN/cache) instead of true-eval', predictedFraction > 0.5, `predicted ${(predictedFraction * 100).toFixed(0)}% of held; stats ${JSON.stringify(sur.stats())}`);

  // B. K7 kill fires on decorrelated predictions: pair each held genome with a DIFFERENT genome's true score.
  const sur2 = makeSurrogate();
  for (const g of train) sur2.observe(g, scoreOf(g));
  const shifted = heldSample.map((s, i) => ({ genome: s.genome, trueScorecard: heldSample[(i + 1) % heldSample.length].trueScorecard }));
  const calB = sur2.calibrate(shifted);
  ok(`B K7 kill fires when predictions decorrelate (ρ < ${K7_RHO_FLOOR} → killed)`, !calB.pass && !sur2.alive, `ρ=${calB.rho.toFixed(3)}; alive=${sur2.alive}`);
  ok('B a killed surrogate forces true evals (predict → null)', sur2.predict(held[0]) === null, `alive=${sur2.alive}`);

  // D. cold cache: predict before any observe → null (caller must true-eval).
  const sur3 = makeSurrogate();
  ok('D cold cache predicts null (no blind guess)', sur3.predict(defaultGenome()) === null);

  // E. the Spearman helper is correct on a known monotone pair.
  ok('E spearman(monotone) == 1', Math.abs(spearman([1, 2, 3, 4], [2, 4, 6, 8]) - 1) < 1e-9, `${spearman([1, 2, 3, 4], [2, 4, 6, 8])}`);

  const pass = checks.every((c) => c.pass);
  return { name: 'P2c-3 surrogate-scorer under K7', pass, checks };
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => { for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`); console.log(`\n${r.pass ? 'OK' : 'FAIL'} — ${r.name}`); process.exit(r.pass ? 0 : 1); });
}
