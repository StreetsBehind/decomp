// Candidate-eval worker (DESIGN §1: the beads-builder analog). Takes a genome + an evaluator backend,
// runs the eval, and returns the schema-bounded scorecard through the ONE §6 metric path. Worst-of-K and
// harness-error-as-hard-fail are handled inside buildScorecard (scorecard.mjs §4.5/§5), so a slow or
// stub-emitting genome can never score as "no failures observed".

import { genomeHash } from './genome.mjs';
import { buildScorecard } from './scorecard.mjs';
import { runPreVerifier } from './pre-verifier.mjs';

/**
 * @param {object} genome
 * @param {{evaluate:Function, baselineHash?:string|null, expectedCore?:string[], minK?:number}} ctx
 *        evaluate(genome) -> {epics, ledger, routeDist}.
 *        OPTIONAL expectedCore (gleaning #2b PRE, epoch-relative CORE): when supplied, the built scorecard
 *        is run through the broken-eval PRE verifier (assertFresh + assertFullCore) and a typed
 *        PreVerifierError is THROWN on a stale/cached scorecard or a silently-subsetted/extra/under-K CORE
 *        battery — the §4.5 hard-fail surface. When ABSENT, the verifier is INERT: the frozen P0/K8
 *        synthetic path (which passes no expectedCore) is BIT-IDENTICAL to before this wiring.
 * @returns {Promise<object>} scorecard
 */
export async function evalGenome(genome, { evaluate, baselineHash = null, expectedCore = null, minK = 1 }) {
  const { epics, ledger, routeDist, checkerMeta, gateMeta } = await evaluate(genome);
  const extra = {};
  if (checkerMeta) extra.checker = checkerMeta;
  if (gateMeta) extra.integrationGate = gateMeta;
  const scorecard = buildScorecard({ genome, genomeHash: genomeHash(genome), epics, ledger, routeDist, baselineHash, extra });
  // PRE verifier — INERT unless the caller declares its epoch's CORE (default-off → bit-identical frozen path).
  if (expectedCore) {
    const runsByEpic = {};
    for (const ep of epics) runsByEpic[ep.name] = Array.isArray(ep.runs) ? ep.runs.length : 0;
    runPreVerifier(scorecard, expectedCore, { minK, runsByEpic });  // throws PreVerifierError on a broken eval
  }
  return scorecard;
}
