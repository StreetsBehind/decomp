// Candidate-eval worker (DESIGN §1: the beads-builder analog). Takes a genome + an evaluator backend,
// runs the eval, and returns the schema-bounded scorecard through the ONE §6 metric path. Worst-of-K and
// harness-error-as-hard-fail are handled inside buildScorecard (scorecard.mjs §4.5/§5), so a slow or
// stub-emitting genome can never score as "no failures observed".

import { genomeHash } from './genome.mjs';
import { buildScorecard } from './scorecard.mjs';

/**
 * @param {object} genome
 * @param {{evaluate:Function, baselineHash?:string|null}} ctx  evaluate(genome) -> {epics, ledger, routeDist}
 * @returns {Promise<object>} scorecard
 */
export async function evalGenome(genome, { evaluate, baselineHash = null }) {
  const { epics, ledger, routeDist, checkerMeta, gateMeta } = await evaluate(genome);
  const extra = {};
  if (checkerMeta) extra.checker = checkerMeta;
  if (gateMeta) extra.integrationGate = gateMeta;
  return buildScorecard({ genome, genomeHash: genomeHash(genome), epics, ledger, routeDist, baselineHash, extra });
}
