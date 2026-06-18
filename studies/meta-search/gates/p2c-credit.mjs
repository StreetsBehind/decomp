// P2c-2 gate — credit-attribution (skeleton-first, gated). Validates the DESIGN §3 mechanism on the planted
// synthetic landscape (deterministic, reproducible):
//   A. SKELETON-FIRST: a candidate whose integration seam is broken (shapes off) attributes to the skeleton
//      gene, not a leaf — the MCOH25 lesson (the seam is a skeleton clause no leaf owns) encoded as a test.
//   B. LEAF-CULPRIT: a candidate whose crosscut is broken (checker off) attributes to the checker gene.
//   C. MIS-ATTRIBUTION KILL: a candidate already near-max on its worst lethal bucket — where the only
//      available recovery is below the 2×SE noise floor — is UNATTRIBUTABLE (→ typed-random), not auto-skeleton.
//   D. NO-LETHAL: a clean candidate attributes nothing.
//   E. BUDGET CHARGING (R2-3): counterfactual reversion evals are bounded (≤ #reversions) and, in the live
//      loop, charged to the eval budget (K5); the loop still rediscovers the optimum with credit ON.
// All deterministic — no models.

import url from 'node:url';
import { makeRng } from '../src/rng.mjs';
import { makeArchive } from '../src/archive.mjs';
import { makeSyntheticEvaluator, makeSyntheticBaseline, plantedOptimumGenome } from '../src/evaluator.mjs';
import { buildScorecard } from '../src/scorecard.mjs';
import { runSearch } from '../src/loop.mjs';
import { attributeBlame, makeCreditStep } from '../src/credit.mjs';
import { defaultGenome, cloneGenome, genomeHash } from '../src/genome.mjs';
import { K8_MAX_GEN } from '../src/config.mjs';

const ev = makeSyntheticEvaluator({ epicK: 2 });
const scoreOf = (g) => { const raw = ev(g); return buildScorecard({ genome: g, genomeHash: genomeHash(g), epics: raw.epics, ledger: raw.ledger }); };

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

  // A. skeleton-first: broken integration seam (shapes off, checker full) → attribute to the skeleton gene.
  const skelBroken = { ...cloneGenome(plantedOptimumGenome()), skeletonAuthor: { model: 'fusion', shapesIncluded: false, obligationDepth: 0 } };
  const aA = await attributeBlame({ candidateGenome: skelBroken, candidateScorecard: scoreOf(skelBroken), evaluate: ev });
  ok('A skeleton-first: broken seam attributes to skeletonAuthor (op skeletonShapes)', aA.node === 'skeletonAuthor' && aA.attributed === 'skeletonShapes', `node=${aA.node} op=${aA.attributed} target=${aA.target} recovery=${aA.recovery.toFixed(2)}≥margin=${aA.margin.toFixed(2)}`);

  // B. leaf culprit: broken crosscut (checker off, shapes on) → attribute to the checker gene.
  const ckBroken = { ...cloneGenome(plantedOptimumGenome()), checker: { kind: 'off', obligationClasses: [], repairDepth: 0 } };
  const aB = await attributeBlame({ candidateGenome: ckBroken, candidateScorecard: scoreOf(ckBroken), evaluate: ev });
  ok('B leaf culprit: broken crosscut attributes to checker (op toggleChecker)', aB.node === 'checker' && aB.attributed === 'toggleChecker', `node=${aB.node} op=${aB.attributed} target=${aB.target} recovery=${aB.recovery.toFixed(2)}≥margin=${aB.margin.toFixed(2)}`);

  // C. mis-attribution kill: crosscut already 4/5 (checker on, 2 classes) — the only recovery (+0.2) is below
  //    the 2×SE noise floor → UNATTRIBUTABLE, not auto-skeleton.
  const nearOk = { ...cloneGenome(plantedOptimumGenome()), checker: { kind: 'deterministic', obligationClasses: ['tenancy', 'authz'], repairDepth: 1 } };
  const aC = await attributeBlame({ candidateGenome: nearOk, candidateScorecard: scoreOf(nearOk), evaluate: ev });
  ok('C mis-attribution kill: sub-noise recovery is UNATTRIBUTABLE (→ typed-random)', aC.attributed === null && aC.node === null, `attributed=${aC.attributed} target=${aC.target} bestRecovery<margin=${aC.margin.toFixed(2)}; trials=${aC.trials.map((t) => `${t.node}:${(t.recovery ?? 0).toFixed(2)}`).join(',')}`);

  // D. no lethal failure → nothing to attribute.
  const aD = await attributeBlame({ candidateGenome: plantedOptimumGenome(), candidateScorecard: scoreOf(plantedOptimumGenome()), evaluate: ev });
  ok('D clean candidate attributes nothing', aD.attributed === null && aD.target === null, `attributed=${aD.attributed} target=${aD.target}`);

  // E. bounded compute: reversion evals ≤ #reversions (3).
  ok('E reversion evals bounded (≤3 per attribution)', aA.evalsUsed <= 3 && aB.evalsUsed <= 3 && aC.evalsUsed <= 3, `A=${aA.evalsUsed} B=${aB.evalsUsed} C=${aC.evalsUsed}`);

  // F. live loop with credit ON: still rediscovers the optimum; reversion evals are charged to the budget.
  let creditEvals = 0, attributions = 0;
  const rng = makeRng(7);
  const res = await runSearch({
    seedGenomes: handicappedPool(), evaluate: ev, baseline: makeSyntheticBaseline(), rng,
    archive: makeArchive(), budget: { maxGen: K8_MAX_GEN, maxEvals: 400 },
    childrenPerParent: 5, populationSize: 5,
    creditAttribution: makeCreditStep(),
    onGeneration: (g) => { if (g.credit) { creditEvals += g.credit.evalsUsed || 0; if (g.credit.preferOp) attributions++; } },
    stopWhen: (arc) => reachedOptimum(arc),
  });
  ok('F loop with credit ON rediscovers the optimum', res.found, `found=${res.found} gen=${res.gen} evals=${res.evalCount} halt=${res.haltReason}`);
  ok('F reversion evals were charged to the budget (K5)', creditEvals > 0 && res.evalCount > 0, `creditEvals=${creditEvals}, attributions=${attributions}, totalEvals=${res.evalCount}`);

  const pass = checks.every((c) => c.pass);
  return { name: 'P2c-2 credit-attribution (skeleton-first, gated)', pass, checks };
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => { for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`); console.log(`\n${r.pass ? 'OK' : 'FAIL'} — ${r.name}`); process.exit(r.pass ? 0 : 1); });
}
