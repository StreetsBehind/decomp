// Counterfactual credit-attribution (DESIGN §3, the round-2-corrected mechanism) — a P2 lever, OFF by
// default (FREEZE.md §5; credit-assignment is explicitly NOT a frozen P1 invariant, R2-7). At P1 there is one
// lever (the checker) so blame is unambiguous and no attribution is needed; at P2 the gene pool is wide
// (skeleton-shapes, checker, integration-gate all touch the lethal buckets) so a failing candidate's blame
// is genuinely ambiguous and a wrong guess wastes the reflective budget on the wrong gene.
//
// The mechanism, with all three round-2 corrections baked in:
//   1. SKELETON-FIRST, not single-node (R2). MCOH25 showed the cross-surface membership-seam fix is a
//      *skeleton* clause owned by no leaf node; the crosscut/integration buckets are precisely the
//      cross-surface obligations no single node owns. So counterfactual reversions are tried SKELETON-FIRST,
//      then the other cross-surface nodes (integration-gate, checker); single leaf reversions are reserved
//      for wire/happy regressions (not lethal blame).
//   2. BOUNDED COMPUTE (R2-3). Run attribution on ONLY the single worst lethal-bucket candidate per
//      generation, and CHARGE every counterfactual re-eval to the §7-K5 eval budget (the loop adds
//      evalsUsed to evalCount) so it can never silently blow the budget.
//   3. A MIS-ATTRIBUTION KILL (R2-5/L6-5). A reversion is only credited if it restores the target lethal
//      bucket by a margin ABOVE K-run noise — FROZEN margin = 2× the worst-of-K standard error on the bucket
//      (config.RESTORE_MARGIN_SE). Below that margin → "unattributable" → route to typed-random; NEVER
//      auto-force the skeleton (auto-skeleton-on-noise is the rev.1 behavior this kill was raised against).
//
// The counterfactual genomes are re-scored through the SAME §6 metric path as every candidate (worker.mjs →
// scorecard.mjs), so attribution reads only the mechanical bucket channel — it is never shown to a model and
// cannot leak the oracle (the attributed gene name is a genome lever, not a cell/seam name).

import { cloneGenome } from './genome.mjs';
import { LETHAL_BUCKETS, RESTORE_MARGIN_SE } from './config.mjs';
import { evalGenome } from './worker.mjs';

// pooled per-lethal-bucket {pass,total,frac} from a scorecard (mechanical channel; same pooling as §6).
function lethalCounts(scorecard) {
  const acc = {}; for (const b of LETHAL_BUCKETS) acc[b] = { pass: 0, total: 0 };
  for (const ep of Object.values(scorecard.perEpic || {})) {
    for (const b of LETHAL_BUCKETS) { acc[b].pass += ep.buckets[b].pass; acc[b].total += ep.buckets[b].total; }
  }
  const out = {}; for (const b of LETHAL_BUCKETS) out[b] = { ...acc[b], frac: acc[b].total ? acc[b].pass / acc[b].total : 1 };
  return out;
}

// binomial-proportion SE on a bucket, with pHat clamped off the {0,1} extremes so a genuinely-broken bucket
// (0/n) still carries a non-zero noise floor (else any reversion would "attribute" on a single-cell jitter).
function bucketSE(frac, n) {
  const p = Math.min(0.85, Math.max(0.15, frac));
  return Math.sqrt(p * (1 - p) / Math.max(1, n));
}

// The reference reversions, SKELETON-FIRST. Each sets ONE node to its reference-good configuration; `op` is
// the constructive operator the loop should prefer for that node, computed on the CANDIDATE's current value
// so the bias points the right way (e.g. checker off → 'toggleChecker'; checker on-but-thin → 'checkerClasses').
const REVERSIONS = [
  {
    node: 'skeletonAuthor',
    op: (g) => (g.skeletonAuthor.shapesIncluded ? 'skeletonDepth' : 'skeletonShapes'),
    apply: (g) => { g.skeletonAuthor.shapesIncluded = true; g.skeletonAuthor.obligationDepth = Math.max(g.skeletonAuthor.obligationDepth || 0, 2); },
  },
  {
    node: 'integrationGate',
    op: (g) => (((g.integrationGate && g.integrationGate.kind) || 'off') === 'off' ? 'toggleIntegrationGate' : 'integrationGateRepair'),
    apply: (g) => { g.integrationGate = { kind: 'deterministic', repairDepth: Math.max(1, (g.integrationGate && g.integrationGate.repairDepth) || 1) }; },
  },
  {
    node: 'checker',
    op: (g) => (g.checker.kind === 'off' ? 'toggleChecker' : 'checkerClasses'),
    apply: (g) => { g.checker = { kind: 'deterministic', obligationClasses: ['tenancy', 'authz', 'mass-assign'], repairDepth: Math.max(1, g.checker.repairDepth || 1) }; },
  },
];

/**
 * Attribute a candidate's worst lethal-bucket failure to a single gene by counterfactual reversion.
 * @param {object} p
 * @param {object} p.candidateGenome     the worst lethal candidate this generation
 * @param {object} p.candidateScorecard  its scorecard (worst-of-K, §6)
 * @param {Function} p.evaluate          the eval backend (genome -> raw {epics,ledger,...})
 * @param {string|null} [p.baselineHash]
 * @param {number} [p.restoreMarginSE]   FROZEN = config.RESTORE_MARGIN_SE (2×)
 * @returns {Promise<{attributed:string|null, node:string|null, target:string, recovery:number, margin:number, evalsUsed:number, trials:object[]}>}
 *   attributed = the constructive operator to prefer (or null = unattributable → typed-random).
 */
export async function attributeBlame({ candidateGenome, candidateScorecard, evaluate, baselineHash = null, restoreMarginSE = RESTORE_MARGIN_SE }) {
  const lc = lethalCounts(candidateScorecard);
  // target = the worst lethal bucket (lowest pass-fraction); nothing to attribute if no lethal failure.
  let target = null, worst = Infinity;
  for (const b of LETHAL_BUCKETS) { if (lc[b].total > 0 && lc[b].frac < worst) { worst = lc[b].frac; target = b; } }
  if (target == null || worst >= 1 - 1e-9) return { attributed: null, node: null, target: null, recovery: 0, margin: 0, evalsUsed: 0, trials: [] };

  const margin = restoreMarginSE * bucketSE(lc[target].frac, lc[target].total);
  const trials = [];
  let evalsUsed = 0;

  for (const rev of REVERSIONS) {
    const op = rev.op(candidateGenome);
    const cf = cloneGenome(candidateGenome);
    rev.apply(cf);
    // a reversion that doesn't actually change the node (already at reference) carries no counterfactual
    // signal — skip it WITHOUT spending an eval.
    if (JSON.stringify(cf) === JSON.stringify(candidateGenome)) { trials.push({ node: rev.node, skipped: 'no-op', recovery: 0 }); continue; }
    const sc = await evalGenome(cf, { evaluate, baselineHash });
    evalsUsed++;
    const newFrac = lethalCounts(sc)[target].frac;
    const recovery = newFrac - lc[target].frac;
    trials.push({ node: rev.node, op, recovery, newFrac, attributed: recovery >= margin });
    if (recovery >= margin) {
      // SKELETON-FIRST priority: the first reversion (in skeleton-first order) that clears the margin wins.
      return { attributed: op, node: rev.node, target, recovery, margin, evalsUsed, trials };
    }
  }
  // no reversion cleared the noise floor → unattributable (the mis-attribution kill) → typed-random.
  return { attributed: null, node: null, target, recovery: 0, margin, evalsUsed, trials };
}

// The generic per-generation credit step the loop injects (loop.mjs calls this; it imports no credit
// internals). Picks the worst lethal child, attributes blame, and returns the loop-facing {evalsUsed,
// preferOp, detail}. evalsUsed is charged to the §7-K5 budget by the loop; preferOp biases next-gen mutation.
export function makeCreditStep({ restoreMarginSE = RESTORE_MARGIN_SE } = {}) {
  return async function creditStep({ children, evaluate, baselineHash = null }) {
    const worst = worstLethalCandidate(children);
    if (!worst) return { evalsUsed: 0, preferOp: null, detail: { reason: 'no-lethal-candidate' } };
    const attr = await attributeBlame({ candidateGenome: worst.genome, candidateScorecard: worst.sc, evaluate, baselineHash, restoreMarginSE });
    return { evalsUsed: attr.evalsUsed, preferOp: attr.attributed, detail: { node: attr.node, target: attr.target, recovery: attr.recovery, margin: attr.margin, worstHash: worst.sc.genomeHash } };
  };
}

// ADDITIVE EXPORT (Batch-2 #2b POST, behaviour-unchanged) — the FROZEN restore-margin band as a single
// source of truth. The score-reproducibility kill (src/score-repro.mjs) MUST reuse the SAME band the
// credit-attribution mis-attribution kill uses (margin = RESTORE_MARGIN_SE × bucketSE on the lethal bucket),
// not a drift-prone copy. bucketSE carries the [0.15,0.85] clamp so a genuinely-broken 0/n bucket still has a
// non-zero noise floor (a single-cell jitter can't kill). These functions were already module-private and used
// by attributeBlame above; exporting them changes NO existing behaviour (gates/p2c-credit.mjs + p0.mjs stay
// green — the credit path is byte-identical, the export is purely additive).
export { bucketSE, lethalCounts };

// Pick the single worst lethal-bucket candidate among a generation's children (highest lethal fail count;
// tie-break highest cost so we don't burn attribution on a cheap-but-clean genome). Returns null if none has
// a lethal failure (nothing to attribute this generation).
export function worstLethalCandidate(children) {
  let best = null, bestKey = -1;
  for (const c of children || []) {
    const lf = c.sc && c.sc.digest ? c.sc.digest.lethalFailCount : 0;
    if (lf <= 0) continue;
    const key = lf * 1000 + (c.sc.cost.total || 0);
    if (key > bestKey) { bestKey = key; best = c; }
  }
  return best;
}
