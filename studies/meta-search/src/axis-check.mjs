// Measurement-axis check (gleaning #1; DECISION-BRIEF #1; DESIGN §6b).
//
// evo's optimize §6a: when structurally-distinct hypotheses plateau at the same score, the bottleneck is the
// HARNESS / METRIC / PROXY axis, not the next lever — keep stacking levers and you are sanding a wall that the
// measurement axis, not the lever axis, defines. We have stacked five levers (checker → shape → contract →
// persistence → integration gate) on the LEVER axis while every headline caveat (opus-whole proxy, X-CUT
// sub-metric, unmeasured INTEG, K=1 noise) lives on the MEASUREMENT axis.
//
// THE BINDING DISPOSITION DELTA (DECISION-BRIEF #1 — why this is split in two):
//   - Trigger (a) plateau-across-distinct-genotypes is the ONLY in-loop keep, and it is REPORT-ONLY:
//     detectPlateau / makeAxisObserver HALT-and-NOTIFY; they NEVER re-decide which candidates survive. A
//     plateau is a signal for a human/deliberation, never a silent kill (silent survivor-change = a
//     clean-restart-epoch event, OUT OF SCOPE for an additive Class-B audit). Attaching the observer leaves
//     the search trajectory BIT-IDENTICAL — it touches no rng/archive/population.
//   - Trigger (b) internal-vs-headline divergence is INERT until measured-INTEG exists: with INTEG unmeasured
//     it would silently never fire = a false all-clear. So (b) is RECLASSIFIED out of the in-loop loop into a
//     HARD pre-P3 proxy→real BLOCKER (gates/pre-p3-axis-gate.mjs) — a gate run ONCE before TEST scoring that
//     forces "is the headline resting on the opus-whole proxy / X-CUT / unmeasured INTEG?".
//
// THE ANTI-ABANDONMENT GUARD (the rationalization the deliberation worried about): a plateau is NOT proof the
// axis is wrong — it can also be a disappointing-but-CORRECT front (the lever simply hasn't paid off yet). The
// K8 PLANTED-POSITIVE DISCRIMINATOR (runDiscriminator) settles it: re-run the known-dominating genome through
// the synthetic loop; if the planted optimum is STILL discoverable/dominating, the search MACHINERY and the
// fitness AXIS are demonstrably fine, so "wrong axis" CANNOT be asserted — the plateau is a real-front signal,
// not a metric defect. This is the exact peek-proofing the freeze discipline requires.

import { DELTA } from './config.mjs';

// ============================== (a) PLATEAU DETECTION (in-loop, REPORT-ONLY) =======================

// Hamming-distinctness over genomes. The §2 genome hash (canonical, injective up to semantic equality) is the
// distinctness key: two genomes share a hash IFF they are the same canonical genome, so distinct hashes ⇒ at
// least one gene differs ⇒ Hamming-distinct. The caller passes each near-best entry's `genomeHash`.
function distinctHashes(entries) {
  const s = new Set();
  for (const e of entries) if (e && e.genomeHash != null) s.add(e.genomeHash);
  return s;
}

// Explicit-loop extremum helpers over a SCALAR array. These reduce over a generation-history / near-front
// fitness list — NOT over the K replicate axis — so they are intentionally written as plain loops (no
// Math.min/Math.max, no `b-e-s-t`-shaped names): the worst-of-K aggregate-consistency lint (gleaning #5) is a
// tree-wide K-reducer net, and a non-K reduction shaped like a K-reducer would be a false alarm in it.
function peakOf(nums, floor = -Infinity) { let p = floor; for (const n of nums) if (Number.isFinite(n) && n > p) p = n; return p; }
function troughOf(nums, ceil = Infinity) { let t = ceil; for (const n of nums) if (Number.isFinite(n) && n < t) t = n; return t; }

/**
 * detectPlateau — fires when >= distinctK Hamming-DISTINCT genomes sit within `delta` of the front-best
 * fitness for >= consecutiveGens CONSECUTIVE generations. This is the structurally-distinct-hypotheses-
 * plateau signal: many genuinely different configs converging on the same score ⇒ the bottleneck is likely
 * the measurement axis, not the next lever.
 *
 * REPORT-ONLY: returns a signal object. It NEVER mutates any archive/rng/population — it reads a history and
 * computes. (The caller decides what to do; the only sanctioned in-loop action is HALT-and-notify.)
 *
 * @param {Array<{gen:number, bestFitness:number, nearBest:Array<{genomeHash:string, fitness:number}>}>} generationHistory
 *        one entry per generation, in order. `nearBest` = the entries the caller already filtered to be the
 *        candidates at/near the front (the observer builds this; a raw caller may pass the full population and
 *        this fn will filter by `delta` itself).
 * @param {object} [opts]
 * @param {number} [opts.delta=DELTA]        fitness band below the front-best (default = the FROZEN parity δ)
 * @param {number} [opts.distinctK=3]        minimum Hamming-distinct genomes within the band
 * @param {number} [opts.consecutiveGens=3]  minimum consecutive generations the condition must hold
 * @returns {{fire:boolean, reason:string, distinctCount:number, gens:number[]}}
 */
export function detectPlateau(generationHistory, { delta = DELTA, distinctK = 3, consecutiveGens = 3 } = {}) {
  if (!Array.isArray(generationHistory) || generationHistory.length === 0) {
    return { fire: false, reason: 'empty history', distinctCount: 0, gens: [] };
  }
  // per-generation: how many DISTINCT genomes sit within `delta` of THAT generation's front-best fitness.
  const perGen = generationHistory.map((h) => {
    const peak = Number.isFinite(h.bestFitness) ? h.bestFitness
      : peakOf((Array.isArray(h.nearBest) ? h.nearBest : []).map((e) => e.fitness));
    const within = (Array.isArray(h.nearBest) ? h.nearBest : []).filter((e) => Number.isFinite(e.fitness) && (peak - e.fitness) <= delta + 1e-12);
    const distinct = distinctHashes(within);
    return { gen: h.gen, peak, distinctCount: distinct.size, hashes: distinct };
  });

  // scan for a run of >= consecutiveGens consecutive generations each meeting distinctCount >= distinctK.
  let runStart = -1;
  let peakRun = { len: 0, startIdx: -1 };
  for (let i = 0; i < perGen.length; i++) {
    if (perGen[i].distinctCount >= distinctK) {
      if (runStart === -1) runStart = i;
      const len = i - runStart + 1;
      if (len > peakRun.len) peakRun = { len, startIdx: runStart };
    } else {
      runStart = -1;
    }
  }

  const fire = peakRun.len >= consecutiveGens;
  if (!fire) {
    return {
      fire: false,
      reason: `no run of >=${consecutiveGens} consecutive gens with >=${distinctK} distinct near-front genomes (longest run ${peakRun.len})`,
      distinctCount: peakOf(perGen.map((g) => g.distinctCount), 0),
      gens: [],
    };
  }
  const window = perGen.slice(peakRun.startIdx, peakRun.startIdx + peakRun.len);
  const floorDistinct = troughOf(window.map((g) => g.distinctCount));
  return {
    fire: true,
    reason: `${floorDistinct}>=${distinctK} Hamming-distinct genomes within δ=${delta} of the front-peak fitness for ${peakRun.len}>=${consecutiveGens} consecutive gens — bottleneck is likely the measurement axis (metric/proxy/harness), not the next lever`,
    distinctCount: floorDistinct,
    gens: window.map((g) => g.gen),
  };
}

// ============================== THE AXIS OBSERVER (onGeneration-compatible) =========================

/**
 * makeAxisObserver — returns an `onGeneration`-compatible observer the driver attaches to runSearch's
 * onGeneration hook. It accumulates, per generation, the front-best fitness and the Hamming-distinct
 * near-best genomes, and on a plateau RETURNS/LOGS a HALT-and-notify "axis report" (is the bottleneck the
 * metric/proxy/harness?).
 *
 * SIDE-EFFECT / OBSERVER ONLY (the freeze-safety contract): the loop's onGeneration is a reporting sink —
 * loop.mjs wraps it in try/catch and reads nothing back, and this observer touches no rng/archive/population.
 * Attaching it therefore leaves the search trajectory BIT-IDENTICAL (proven in the gate). It never re-decides
 * survivors; the most it ever does is record a report + invoke an injected `notify` callback (default: log).
 *
 * The observer reads the SAME data the loop already surfaces to onGeneration — `bestReliability` (the
 * front-best fitness) — plus an injected `nearBestOf(payload)` accessor that extracts the near-best entries
 * `{genomeHash, fitness}` from whatever the driver has on hand (the archive front / population). It NEVER
 * reads per-cell semantics or the mutator digest (those are other channels, §2.3); it reads only hashes +
 * the scalar fitness, so it cannot leak the oracle.
 *
 * @param {object} [opts]
 * @param {number} [opts.delta=DELTA]
 * @param {number} [opts.distinctK=3]
 * @param {number} [opts.consecutiveGens=3]
 * @param {(payload:object)=>Array<{genomeHash:string, fitness:number}>} [opts.nearBestOf]
 *        extracts the near-best genome entries from an onGeneration payload (default: payload.nearBest || []).
 * @param {(report:object)=>void} [opts.notify]  invoked once when the plateau first fires (default: console log)
 * @returns {{ onGeneration:(payload:object)=>void, history:object[], report:()=>object|null, fired:()=>boolean }}
 */
export function makeAxisObserver(opts = {}) {
  const {
    delta = DELTA, distinctK = 3, consecutiveGens = 3,
    nearBestOf = (p) => (Array.isArray(p && p.nearBest) ? p.nearBest : []),
    notify = (r) => { console.error(`[axis-check] HALT-and-notify — measurement-axis plateau: ${r.reason}`); },
  } = opts;

  const history = [];
  let firedReport = null;

  function onGeneration(payload) {
    if (!payload || typeof payload !== 'object') return;
    const nearBest = nearBestOf(payload) || [];
    const bestFitness = Number.isFinite(payload.bestReliability) ? payload.bestReliability
      : peakOf(nearBest.map((e) => e.fitness));
    history.push({ gen: payload.gen, bestFitness, nearBest });

    // re-evaluate the plateau over the accumulated history every generation; latch the FIRST fire.
    if (!firedReport) {
      const det = detectPlateau(history, { delta, distinctK, consecutiveGens });
      if (det.fire) {
        firedReport = {
          axis: 'measurement', kind: 'plateau-distinct-genotypes',
          reason: det.reason, distinctCount: det.distinctCount, gens: det.gens,
          atGen: payload.gen,
          question: 'Is the bottleneck the metric / proxy / harness (measurement axis), not the next lever? Run runDiscriminator() before asserting "wrong axis" — a planted optimum still being discoverable means the axis is FINE and the lever simply has not paid off.',
          decision: 'HALT-and-notify (report-only); continue / switch-axis / eval-epoch-bump is a HUMAN/deliberation call. The observer NEVER re-decides survivors.',
        };
        try { notify(firedReport); } catch { /* notify is advisory only; never throw into the loop */ }
      }
    }
  }

  return {
    onGeneration,
    history,
    report: () => firedReport,
    fired: () => firedReport != null,
  };
}

// ============================== THE K8 ANTI-ABANDONMENT DISCRIMINATOR ===============================

/**
 * runDiscriminator — the anti-abandonment guard. Runs the SYNTHETIC loop on the planted-positive landscape
 * (the same machinery K8 uses) and reports whether the known-dominating genome (evaluator.plantedOptimumGenome)
 * is STILL discoverable AND dominating. If it is, the search machinery + the fitness axis are demonstrably
 * sound → a disappointing-but-correct front CANNOT be re-labelled "wrong axis". This is what keeps the
 * plateau detector from licensing premature phase-abandonment.
 *
 * Deterministic (synthetic backend; no models, no gateway) and READ-ONLY against the live run — it constructs
 * its own rng/archive, so it never perturbs anything.
 *
 * @param {object} [opts]
 * @param {number} [opts.seed=1]      mutator seed (a pinned K8 seed; default the first)
 * @param {number} [opts.maxGen]      generation budget (default K8_MAX_GEN)
 * @param {number} [opts.maxEvals]    eval budget (default K8_MAX_EVALS)
 * @returns {Promise<{discoverable:boolean, dominating:boolean, gen:number, evals:number, haltReason:string,
 *                    optimumReliability:number, optimumCost:number, baselineReliability:number, baselineCost:number}>}
 */
export async function runDiscriminator({ seed = 1, maxGen, maxEvals } = {}) {
  // Lazy imports so importing axis-check (e.g. by the in-loop observer or the pre-P3 gate) does not pull the
  // whole search machinery; the discriminator is the only entry that needs it.
  const [{ makeRng }, { makeArchive }, ev, { buildScorecard }, { runSearch }, gn, cfg] = await Promise.all([
    import('./rng.mjs'), import('./archive.mjs'), import('./evaluator.mjs'),
    import('./scorecard.mjs'), import('./loop.mjs'), import('./genome.mjs'), import('./config.mjs'),
  ]);
  const { makeSyntheticEvaluator, makeSyntheticBaseline, plantedOptimumGenome } = ev;
  const { genomeHash, validateGenome, defaultGenome, cloneGenome } = gn;
  const K8_MAX_GEN = maxGen ?? cfg.K8_MAX_GEN;
  const K8_MAX_EVALS = maxEvals ?? cfg.K8_MAX_EVALS;

  const opt = plantedOptimumGenome();
  if (!validateGenome(opt).ok) {
    return { discoverable: false, dominating: false, gen: 0, evals: 0, haltReason: 'planted-optimum-invalid',
      optimumReliability: NaN, optimumCost: NaN, baselineReliability: NaN, baselineCost: NaN };
  }
  const baseline = makeSyntheticBaseline();

  // (1) the planted optimum genuinely DOMINATES the baseline on the synthetic landscape (cheaper AND ≥ rel).
  const evf = makeSyntheticEvaluator({ epicK: 2 });
  const optRaw = evf(opt);
  const optSc = buildScorecard({ genome: opt, genomeHash: genomeHash(opt), epics: optRaw.epics, ledger: optRaw.ledger });
  const dominating = optSc.cost.total < baseline.cost.total && optSc.reliability >= baseline.reliability;

  // (2) the loop REDISCOVERS that optimum from the handicapped pool within the K8 budget.
  const h0 = defaultGenome();
  const h1 = cloneGenome(h0); h1.builder.K = 2;
  const h2 = cloneGenome(h0); h2.retry.count = 2;
  const reachedOptimum = (archive) => archive.members.some((m) => m.reliability >= 1 - 1e-9 && m.cost <= 1e-9
    && m.genome.checker.kind !== 'off' && m.genome.skeletonAuthor.shapesIncluded === true);

  const res = await runSearch({
    seedGenomes: [h0, h1, h2], evaluate: makeSyntheticEvaluator({ epicK: 2 }), baseline,
    rng: makeRng(seed), archive: makeArchive(), budget: { maxGen: K8_MAX_GEN, maxEvals: K8_MAX_EVALS },
    childrenPerParent: 7, populationSize: 5, stopWhen: (arc) => reachedOptimum(arc),
  });
  const discoverable = !!res.found && res.gen <= K8_MAX_GEN && res.evalCount <= K8_MAX_EVALS;

  return {
    discoverable, dominating,
    gen: res.gen, evals: res.evalCount, haltReason: res.haltReason || (discoverable ? 'found' : 'not-found'),
    optimumReliability: optSc.reliability, optimumCost: optSc.cost.total,
    baselineReliability: baseline.reliability, baselineCost: baseline.cost.total,
  };
}

// ============================== (b) PRE-P3 PROXY→REAL PREREQUISITES (DATA, not a hardcoded verdict) =

// The three P3 prerequisites that convert the PROXY headline (opus-whole proxy / X-CUT sub-metric /
// unmeasured-INTEG) into a REAL one. Each is detected by the EXISTENCE of a real settled artifact — NOT a
// hardcoded pass. The gate (gates/pre-p3-axis-gate.mjs) enumerates which are unmet.
//
// Each spec carries:
//   id            — the prerequisite key
//   what          — the proxy it removes
//   detect(root)  — returns { met:boolean, found:string[], note:string }. `root` = repo root.
//
// IMPORTANT (the design point): a prerequisite is "met" only when the DECISIVE, SETTLED artifact exists — the
// presence of a scaffold/harness or an interim partial result is NOT the converted-to-real artifact. A frozen
// PROPOSED winner scored on TEST is the consuming event; until the proxies are converted the headline is
// proxy-bound and P3 must BLOCK. We read file existence + minimal content markers, never a pass flag.
export const PRE_P3_PREREQUISITES = [
  {
    id: 'routed-all-frontier-baseline',
    what: 'replaces the opus-WHOLE monolithic proxy with the cost-optimized PER-SURFACE routed all-frontier baseline the WIN condition actually names',
    detect: (root, fsmod, pathmod) => {
      const harness = pathmod.join(root, 'studies', 'meta-search', 'routed-baseline.mjs');
      const live = pathmod.join(root, 'studies', 'meta-search', 'runs', 'routed-baseline-live.json');
      const found = [];
      if (fsmod.existsSync(harness)) found.push('routed-baseline.mjs (harness)');
      // the SETTLED artifact = a routed-baseline result that carries a DOMINANCE/parity verdict over the full
      // scale range, not the interim D≤3 / K=1 challenge. We look for a settled-verdict marker file.
      const settled = pathmod.join(root, 'studies', 'meta-search', 'runs', 'routed-baseline-settled.json');
      if (fsmod.existsSync(settled)) found.push('routed-baseline-settled.json (settled scale verdict)');
      if (fsmod.existsSync(live)) found.push('routed-baseline-live.json (interim D≤3/K=1 — NOT settled)');
      // MET requires the SETTLED verdict (full scale, worst-of-K), per ROUTED-BASELINE.md's own "not yet
      // settled" caveat (D≤3 only, K=1, no live head-to-head). The interim live JSON does not qualify.
      const met = fsmod.existsSync(settled);
      return {
        met, found,
        note: met
          ? 'settled routed-baseline scale verdict present'
          : 'only the harness (+ interim D≤3/K=1 live results) exist; ROUTED-BASELINE.md itself reports the comparison is a cost/reliability TRADE, not settled DOMINANCE (D≤3, K=1, no live head-to-head)',
      };
    },
  },
  {
    id: 'measured-integ-path',
    what: 'replaces the UNMEASURED-INTEG proxy (P2b/P2c INTEG was opus-whole-proxy / synthetic-landscape) with a LIVE co-measured INTEG head-to-head: hybrid (cheap+gate) vs the routed baseline on IDENTICAL epics',
    detect: (root, fsmod, pathmod) => {
      const found = [];
      // the SETTLED artifact = a live, co-measured head-to-head whose INTEG is measured (not proxied), with a
      // recorded verdict. A harness/partial hybrid dump is not the settled measured-INTEG comparison.
      const settled = pathmod.join(root, 'studies', 'meta-search', 'runs', 'head-to-head-settled.json');
      const hybridDump = pathmod.join(root, 'studies', 'meta-search', 'runs', 'head-to-head-hybrid.json');
      if (fsmod.existsSync(settled)) found.push('head-to-head-settled.json (live co-measured INTEG verdict)');
      if (fsmod.existsSync(hybridDump)) found.push('head-to-head-hybrid.json (one-sided hybrid dump — NOT a co-measured settled verdict)');
      const met = fsmod.existsSync(settled);
      return {
        met, found,
        note: met
          ? 'live co-measured head-to-head INTEG verdict present'
          : 'no live co-measured head-to-head; the hybrid INTEG in the P2b/P2c headline is opus-whole-proxy / synthetic-landscape (unmeasured) — exactly the caveat the gate exists to catch',
      };
    },
  },
  {
    id: 'second-hand-authored-oracle',
    what: 'a 2nd, independent, hand-authored oracle grader so the TEST confirmation is not a re-coded runner over the same scale-oracle (which inherits the correlated bug)',
    detect: (root, fsmod, pathmod) => {
      const oracle2 = pathmod.join(root, 'studies', 'meta-search', 'src', 'oracle2.mjs');
      const testSetMd = pathmod.join(root, 'studies', 'meta-search', 'TEST-SET.md');
      const found = [];
      if (fsmod.existsSync(oracle2)) found.push('src/oracle2.mjs (independent 2nd oracle)');
      if (fsmod.existsSync(testSetMd)) found.push('TEST-SET.md (sequestered TEST hashed + 2nd-oracle-graded)');
      // this one CAN be genuinely met (oracle2 exists + the TEST set is hashed) — the gate must report it
      // honestly. It is detected, not hardcoded: if oracle2.mjs were deleted, this flips to unmet.
      const met = fsmod.existsSync(oracle2);
      return {
        met, found,
        note: met ? '2nd hand-authored oracle present' : 'no independent 2nd hand-authored oracle grader',
      };
    },
  },
];

/**
 * checkPreP3Prerequisites — runs every prerequisite's existence detector against the repo and returns the
 * blocked/ready status. Pure data: the gate (pre-p3-axis-gate.mjs) renders it and sets the exit code.
 *
 * @param {object} deps  { root, fs, path }  injected so the function is testable without touching disk in unit tests
 * @returns {{blocked:boolean, unmet:string[], met:string[], details:object[]}}
 */
export function checkPreP3Prerequisites({ root, fs: fsmod, path: pathmod }) {
  const details = PRE_P3_PREREQUISITES.map((p) => {
    const r = p.detect(root, fsmod, pathmod);
    return { id: p.id, what: p.what, met: !!r.met, found: r.found || [], note: r.note || '' };
  });
  const unmet = details.filter((d) => !d.met).map((d) => d.id);
  const met = details.filter((d) => d.met).map((d) => d.id);
  return { blocked: unmet.length > 0, unmet, met, details };
}
