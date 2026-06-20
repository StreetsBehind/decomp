// Batch-2 epoch #2b-POST — the POST score-reproducibility KILL (gleaning #2 / DECISION-BRIEF #2 / EVO-GLEANINGS-PLAN §"#2 (2b POST)").
//
// THE GUARD. evo's verifier re-runs a surviving candidate's eval on a FRESH logged seed set and requires the
// worst-of-K to REPRODUCE within the K-run noise band; "noisy benches commit lucky winners" — a survivor whose
// original score was a LUCKY OVER-estimate that does not reproduce must be killed. This is the dynamic sibling
// of the static aggregate-consistency lint (#5): the lint proves the *aggregate* is worst-of-K everywhere; this
// proves a *surviving worst-of-K score* is itself reproducible (not a lucky high draw on a noisy bench).
//
// THE BAND IS THE FROZEN CREDIT BAND (single source of truth). The K-run noise band is EXACTLY the
// credit-attribution restore-margin: margin = RESTORE_MARGIN_SE × bucketSE(frac, n), with bucketSE clamping
// pHat to [0.15,0.85] so a genuinely-broken 0/n lethal bucket still carries a non-zero noise floor (a
// single-cell jitter can't kill). We do NOT re-derive a band — we IMPORT bucketSE + lethalCounts from
// src/credit.mjs (the SAME functions attributeBlame uses), so the kill band literally is credit's band. The
// gate's BAND-IDENTITY layer proves this is not a drifted copy.
//
// THE KILL IS ONE-SIDED (DOWNWARD). A survivor is killed iff its fresh-seed re-eval lethal pass-fraction is
// BELOW (original − margin) on ANY lethal bucket — i.e. the original was a lucky OVER-estimate that does not
// reproduce (same family as worst-of-K: never commit a lucky winner). An UPWARD re-eval (re-eval strictly
// better) is NOT a kill (a survivor that under-promised is not irreproducible-in-the-dangerous-direction). We
// also expose the two-sided within-band flag per bucket for transparency, but the KILL uses the downward breach.
//
// PHASE-BOUNDARY, CHARGED TO K5, BOUNDED. This runs ONCE at the phase boundary over the survivor (WIN-front)
// set, NEVER per-generation (that blows K5=250). Every re-eval is CHARGED to the K5 budget tracker; the bound
// is survivors × K × CORE-epics. If charging the next survivor's re-eval would exceed the cap, runScoreReproKill
// STOPS and reports budgetOk=false + the remaining survivors — it NEVER silently truncates or passes a survivor
// it could not re-evaluate.
//
// FREEZE POSTURE. This is a survivor-CHANGING kill → it belongs to a clean-restart epoch (THIS one). It touches
// NO frozen invariant: it CONSUMES the frozen RESTORE_MARGIN_SE band, respects the frozen K5_EVAL_CAP, and is a
// POST-HOC phase-boundary filter that is never wired into the per-generation loop. The frozen P0/K8 path never
// constructs or calls it → BIT-IDENTICAL. eval_epoch stays 0 (no fitness defect — the metric is unchanged; we
// only re-measure whether a surviving worst-of-K score reproduces). Every trace/record is stamped (eval_epoch, …).
//
// NOTE on "promote from audit → kill": Batch-1 only built #2b PRE (the broken-eval guard, GLEANING2B-PRE-RESULTS.md);
// POST was DEFERRED. There is therefore NO prior mid-run audit instance to "promote" — POST is built DIRECTLY
// here as the phase-boundary kill, because THIS is the clean-restart epoch in which a survivor-changing kill is
// admissible. (The "promotion" in the disposition is conceptual: audit-only mid-run → active kill post-restart.)

import { RESTORE_MARGIN_SE, K5_EVAL_CAP, LETHAL_BUCKETS } from './config.mjs';
import { bucketSE, lethalCounts } from './credit.mjs';
import { stampEpoch, stampEach, EVAL_EPOCH } from './eval-epoch.mjs';

/**
 * scoreReproVerdict — does a survivor's fresh-seed re-eval REPRODUCE its original worst-of-K lethal score
 * within the frozen K-run noise band? One-sided downward kill (lucky-over-estimate guard).
 *
 * @param {object} originalScorecard  the survivor's original worst-of-K scorecard (perEpic bucket counts)
 * @param {object} reEvalScorecard    a FRESH-seed worst-of-K scorecard for the SAME genome
 * @param {object} [opts]
 * @param {number} [opts.marginSE=RESTORE_MARGIN_SE]  the FROZEN restore-margin multiplier (2×)
 * @returns {{reproducible:boolean, kill:boolean, worstDownBreach:(object|null),
 *            perBucket:Array<{bucket,originalFrac,originalTotal,reEvalFrac,margin,downBreach,upBreach,withinBand}>}}
 *   reproducible = reEvalFrac ≥ originalFrac − margin for ALL lethal buckets (one-sided downward). kill = !reproducible.
 *   withinBand (per bucket) = two-sided |Δ| ≤ margin (transparency only; NOT the kill).
 */
export function scoreReproVerdict(originalScorecard, reEvalScorecard, { marginSE = RESTORE_MARGIN_SE } = {}) {
  const origLc = lethalCounts(originalScorecard); // {bucket:{pass,total,frac}} — IMPORTED from credit (frozen pooling)
  const reLc = lethalCounts(reEvalScorecard);

  const perBucket = [];
  let reproducible = true;
  let worstDownBreach = null; // the lethal bucket with the largest downward breach (drives the kill report)

  for (const b of LETHAL_BUCKETS) {
    const originalFrac = origLc[b].frac;
    const originalTotal = origLc[b].total;
    const reEvalFrac = reLc[b].frac;
    // the band is credit's band: margin = RESTORE_MARGIN_SE × bucketSE(originalFrac, originalTotal). It is
    // anchored on the ORIGINAL (the score under test) — the survivor we are asking to reproduce — exactly as
    // attributeBlame anchors its restore-margin on the candidate's current bucket frac/total.
    const margin = marginSE * bucketSE(originalFrac, originalTotal);
    const delta = reEvalFrac - originalFrac;               // + = re-eval better; − = re-eval worse
    const downBreach = delta < -margin - 1e-12;            // re-eval BELOW original − margin → lucky over-estimate
    const upBreach = delta > margin + 1e-12;               // re-eval ABOVE original + margin → under-promised (NOT a kill)
    const withinBand = !downBreach && !upBreach;           // two-sided, transparency only
    if (downBreach) {
      reproducible = false;
      const breachDepth = (originalFrac - margin) - reEvalFrac; // how far below the floor (always > 0 here)
      if (!worstDownBreach || breachDepth > worstDownBreach.breachDepth) {
        worstDownBreach = { bucket: b, originalFrac, reEvalFrac, margin, breachDepth };
      }
    }
    perBucket.push({ bucket: b, originalFrac, originalTotal, reEvalFrac, margin, downBreach, upBreach, withinBand });
  }

  return { reproducible, kill: !reproducible, worstDownBreach, perBucket };
}

/**
 * runScoreReproKill — the active phase-boundary kill. Re-evaluate each surviving candidate on a FRESH logged
 * seed set, charge every re-eval to the K5 budget, and partition kept (reproducible) vs killed (irreproducible).
 *
 * @param {object} p
 * @param {Array<{genome:object, scorecard:object, hash?:string}>} p.survivors  the WIN-front candidates (each
 *        already veto-passing). Their `scorecard` is the ORIGINAL worst-of-K score under test.
 * @param {(genome:object, seed:number)=>(object|Promise<object>)} p.reEvaluate  a FRESH-seed re-eval → a fresh
 *        K-run worst-of-K scorecard for that genome on that seed.
 * @param {number[]} [p.freshSeeds]  the fresh logged seed per survivor (logged for reproducibility). If absent,
 *        a deterministic per-survivor seed is derived and logged.
 * @param {number} [p.coreEpics=1]   the number of CORE epics each re-eval covers (for the K5 bound; at P1 = 2).
 * @param {number} [p.K=1]           the K-runs per epic per re-eval (for the K5 bound).
 * @param {{spent:number, cap?:number}} [p.budget]  the K5 budget tracker (mutated in place). cap defaults to K5_EVAL_CAP.
 * @param {number} [p.marginSE=RESTORE_MARGIN_SE]   the frozen restore-margin multiplier.
 * @param {number} [p.epoch=EVAL_EPOCH]             the eval epoch to stamp (0 — no fitness defect).
 * @returns {Promise<{kept:Array, killed:Array, verdicts:Array, evalsUsed:number, budgetOk:boolean,
 *                    remaining:Array, freshSeeds:number[], bound:number, budget:object}>}
 */
export async function runScoreReproKill({
  survivors, reEvaluate, freshSeeds = null, coreEpics = 1, K = 1,
  budget = { spent: 0, cap: K5_EVAL_CAP }, marginSE = RESTORE_MARGIN_SE, epoch = EVAL_EPOCH,
} = {}) {
  if (!Array.isArray(survivors)) throw new TypeError(`runScoreReproKill: survivors must be an array, got ${typeof survivors}`);
  if (typeof reEvaluate !== 'function') throw new TypeError('runScoreReproKill: reEvaluate must be a function');
  if (budget.cap == null) budget.cap = K5_EVAL_CAP;
  if (typeof budget.spent !== 'number') budget.spent = 0;

  // the cost of ONE survivor's re-eval, charged to K5: K runs × CORE epics.
  const costPerReEval = Math.max(1, K) * Math.max(1, coreEpics);
  // the full bound for the whole survivor set (reported up-front; the STOP rule guards the actual charge).
  const bound = survivors.length * costPerReEval;

  // fresh logged seeds — one per survivor. If the caller supplies them, use them (logged); else derive a
  // deterministic per-survivor seed so the re-eval is reproducible AND the seed set is LOGGED (never silent).
  const seeds = (Array.isArray(freshSeeds) && freshSeeds.length === survivors.length)
    ? freshSeeds.slice()
    : survivors.map((_, i) => 0xF0E5 + i); // deterministic fresh-seed base, logged in the return

  const kept = [], killed = [], verdicts = [], remaining = [];
  let evalsUsed = 0;
  let budgetOk = true;

  for (let i = 0; i < survivors.length; i++) {
    const s = survivors[i];
    // K5 STOP RULE: if charging this survivor's re-eval would exceed the cap, STOP and report — never silently
    // truncate, never pass a survivor we could not re-evaluate. The remaining survivors are returned UNPROCESSED.
    if (budget.spent + costPerReEval > budget.cap) {
      budgetOk = false;
      for (let j = i; j < survivors.length; j++) remaining.push(survivors[j]);
      break;
    }
    const seed = seeds[i];
    const reSc = await reEvaluate(s.genome, seed);
    // CHARGE the re-eval to K5 (the budget tracker) — exactly K×coreEpics evals per survivor.
    budget.spent += costPerReEval;
    evalsUsed += costPerReEval;

    const verdict = scoreReproVerdict(s.scorecard, reSc, { marginSE });
    const rec = stampEpoch({
      hash: s.hash || (s.scorecard && s.scorecard.genomeHash) || null,
      seed,
      reproducible: verdict.reproducible,
      kill: verdict.kill,
      worstDownBreach: verdict.worstDownBreach,
      perBucket: verdict.perBucket,
      reEvalGenomeHash: reSc && reSc.genomeHash,
    }, epoch);
    verdicts.push(rec);
    if (verdict.kill) killed.push({ ...s, reEvalScorecard: reSc, verdict }); else kept.push(s);
  }

  return {
    kept, killed, verdicts,
    evalsUsed,
    budgetOk,
    remaining,
    freshSeeds: seeds,
    bound,
    costPerReEval,
    budget: { spent: budget.spent, cap: budget.cap },
    eval_epoch: epoch,
  };
}

// re-export the frozen band pieces so a caller (gate/driver) can prove BAND-IDENTITY against credit without a
// second import path. These are credit's functions, unchanged.
export { bucketSE, lethalCounts, RESTORE_MARGIN_SE, K5_EVAL_CAP };

// convenience: stamp an array of survivor records (eval_epoch) — used by the driver for the kept/killed lists.
export function stampSurvivors(records, epoch = EVAL_EPOCH) { return stampEach(records, epoch); }
