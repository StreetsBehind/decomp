// The surrogate-scorer (DESIGN §5/§11) — a P2 COMPUTE lever, OFF by default (FREEZE.md §5). On the live arm
// each true eval is many gateway builds; the surrogate predicts a genome's reliability cheaply (≈0.025% of a
// true eval) so the search can SCREEN many candidates and pay the true-eval cost only on the promising ones.
// It is SEARCH-COST only — never product-charged (§6) — and it never feeds the archive veto: a surrogate
// prediction is a screen, the survivors still get a true scorecard (per-cell veto needs the real cell vector).
//
// Calibration kill K7 (FROZEN ρ ≥ 0.80, round-2 R2-8): the surrogate is only trusted while its predicted
// ranking tracks the true scorer. Periodically re-score a held sample with the true `evaluate` and compute
// the Spearman rank-correlation on the lethal sub-metric; if it drops below the floor the surrogate is
// killed (the driver reverts to all-true evals) so a drifting surrogate can never silently mis-rank the search.
//
// Implementation: a distance-weighted k-NN over already-observed genomes, keyed by a gene vector (the same
// closed genome fields the descriptor uses). It is exact on a cache hit, interpolates from the k nearest
// neighbors otherwise, and returns null on a cold cache (the caller must do a true eval). Deterministic — no
// models, no rng — so the K7 gate is reproducible; the live arm swaps in a model-backed predictor behind the
// same interface (observe/predict/calibrate) without touching the loop.

import { genomeHash } from './genome.mjs';
import { LETHAL_BUCKETS, K7_RHO_FLOOR } from './config.mjs';

// local gene vector (kept independent of the frozen genome.mjs hashing path; behavioral features only).
function geneVector(g) {
  const ig = g.integrationGate || {};
  return [
    g.skeletonAuthor?.model, g.skeletonAuthor?.shapesIncluded ? 1 : 0, g.skeletonAuthor?.obligationDepth || 0,
    g.decomposer?.model, g.decomposer?.lensEnsemble ? 1 : 0, g.decomposer?.nLenses || 1,
    g.builder?.K || 1,
    g.retry?.count || 1, g.retry?.gateStrictness,
    g.checker?.kind, g.checker?.repairDepth || 0, (g.checker?.obligationClasses || []).length,
    ig.kind || 'off', ig.repairDepth || 0,
    g.integrator?.recurrenceThreshold || 1,
    g.amortizationM || 1,
  ];
}
function hamming(a, b) { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; }

function lethalFracs(scorecard) {
  const acc = {}; for (const b of LETHAL_BUCKETS) acc[b] = { p: 0, t: 0 };
  for (const ep of Object.values(scorecard.perEpic || {})) for (const b of LETHAL_BUCKETS) { acc[b].p += ep.buckets[b].pass; acc[b].t += ep.buckets[b].total; }
  const out = {}; for (const b of LETHAL_BUCKETS) out[b] = acc[b].t ? acc[b].p / acc[b].t : 1;
  return out;
}

// Spearman rank-correlation (average ranks for ties) — the K7 statistic on the lethal sub-metric.
export function spearman(xs, ys) {
  const n = xs.length;
  if (n < 2) return 1;
  const rank = (arr) => {
    const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(n);
    let i = 0;
    while (i < n) { let j = i; while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; }
    return r;
  };
  const rx = rank(xs), ry = rank(ys);
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = mean(rx), my = mean(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = rx[i] - mx, b = ry[i] - my; num += a * b; dx += a * a; dy += b * b; }
  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
}

/**
 * @param {{k?:number, rhoFloor?:number, maxDist?:number}} [opts]
 *   k = neighbors to blend; rhoFloor = K7 (FROZEN 0.80); maxDist = predict null beyond this gene-Hamming
 *   (a cold/too-far genome must take a true eval rather than a low-confidence guess).
 */
export function makeSurrogate({ k = 3, rhoFloor = K7_RHO_FLOOR, maxDist = 6 } = {}) {
  const cache = new Map(); // hash -> { vec, reliability, lethal }
  let alive = true; let lastRho = 1; let calibrations = 0; let truEvals = 0; let predicts = 0;

  function observe(genome, scorecard) {
    truEvals++;
    cache.set(scorecard.genomeHash, { vec: geneVector(genome), reliability: scorecard.reliability, lethal: lethalFracs(scorecard) });
  }

  function predict(genome) {
    if (!alive) return null; // killed by K7 → force true evals
    const h = genomeHash(genome);
    const hit = cache.get(h);
    if (hit) { predicts++; return { reliability: hit.reliability, lethal: hit.lethal, source: 'cache-hit', dist: 0 }; }
    if (cache.size === 0) return null;
    const vec = geneVector(genome);
    const neigh = [...cache.values()].map((e) => ({ e, d: hamming(vec, e.vec) })).sort((a, b) => a.d - b.d).slice(0, k);
    if (!neigh.length || neigh[0].d > maxDist) return null;
    const w = neigh.map((n) => 1 / (1 + n.d)); const wsum = w.reduce((s, x) => s + x, 0);
    const reliability = neigh.reduce((s, n, i) => s + w[i] * n.e.reliability, 0) / wsum;
    const lethal = {}; for (const b of LETHAL_BUCKETS) lethal[b] = neigh.reduce((s, n, i) => s + w[i] * n.e.lethal[b], 0) / wsum;
    predicts++;
    return { reliability, lethal, source: 'knn', dist: neigh[0].d };
  }

  /**
   * K7 calibration over a held sample. Each entry = { genome, trueScorecard }. Computes the Spearman ρ
   * between the surrogate's predicted lethal reliability and the true lethal reliability; kills the surrogate
   * if ρ < the frozen floor. Held genomes the surrogate can't predict (cold/too-far) are excluded from ρ.
   * @returns {{rho:number, pass:boolean, n:number, alive:boolean}}
   */
  function calibrate(sample) {
    calibrations++;
    const pred = [], tru = [];
    for (const { genome, trueScorecard } of sample) {
      const p = predict(genome); if (!p) continue;
      const tl = lethalFracs(trueScorecard);
      const trueLethal = LETHAL_BUCKETS.reduce((s, b) => s + tl[b], 0) / LETHAL_BUCKETS.length;
      const predLethal = LETHAL_BUCKETS.reduce((s, b) => s + p.lethal[b], 0) / LETHAL_BUCKETS.length;
      pred.push(predLethal); tru.push(trueLethal);
    }
    const rho = pred.length >= 2 ? spearman(pred, tru) : 1;
    lastRho = rho;
    const pass = rho >= rhoFloor;
    if (!pass) alive = false; // K7 kill: revert to all-true evals
    return { rho, pass, n: pred.length, alive };
  }

  return {
    observe, predict, calibrate,
    get alive() { return alive; },
    revive() { alive = true; },
    stats() { return { cacheSize: cache.size, truEvals, predicts, calibrations, lastRho, alive }; },
  };
}
