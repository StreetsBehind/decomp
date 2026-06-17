// The schema-bounded scorecard + the §6 per-cell fitness metric.
//
// This is the heart of the G1 wiring: the harness already grades an assembled epic into bucket counts
// {wire, happy, crosscut, integration} (lib/epic-sandbox.mjs → epic-run-one.mjs), where crosscut/
// integration carry a `fails:[{name}]` list and wire carries a `wired:{name:bool}` map. From those we
// reconstruct the PER-CELL pass-vector (one bool per individual test item) the per-cell non-inferiority
// veto (§6/§4.4) needs — *without* ever reading the oracle, only its already-emitted results.
//
// TWO CHANNELS, never crossed (§2.3):
//   - `cells`  (mechanical insertion channel): the full per-cell pass-vector, keyed epic::bucket::name.
//              Consumed by the archive veto. NEVER rendered to any model.
//   - `digest` (mutator channel): quadrant-and-count ONLY — per-bucket fail COUNTS, no cell/seam/epic
//              names. This is all the reflective mutator may see (a frontier model would otherwise
//              reconstruct the broken seam from names → oracle→trace→prompt leak).
//
// Aggregation across the K runs of one epic is WORST-OF-K (DESIGN §5): a cell counts as passing only if
// it passed in EVERY run; a harness error / timeout / empty in ANY run is a hard worst-of-K FAIL for
// that epic's lethal cells (§4.5) — never excluded.

import { WEIGHTS, ALL_BUCKETS, LETHAL_BUCKETS } from './config.mjs';

const QUADRANT = { crosscut: 'lethal', integration: 'lethal', happy: 'silent-cheap', wire: 'cheap' };

function isHarnessFail(r) {
  return !r || r.harnessError != null || r.timeout === true || r.empty === true || !r.wire;
}

// Per-cell pass map for ONE run of ONE epic, given the full cell-name lists. Harness fail => all-false.
function cellsForRun(run, cellNames) {
  const out = { wire: {}, happy: {}, crosscut: {}, integration: {} };
  const fail = isHarnessFail(run);
  for (const bucket of ALL_BUCKETS) {
    const names = cellNames[bucket] || [];
    if (bucket === 'wire') {
      const wired = (!fail && run.wire && run.wire.wired) || {};
      for (const n of names) out.wire[n] = fail ? false : !!wired[n];
    } else {
      const fails = (!fail && run[bucket] && Array.isArray(run[bucket].fails)) ? new Set(run[bucket].fails.map((f) => f.name)) : null;
      for (const n of names) out[bucket][n] = fail ? false : (fails ? !fails.has(n) : false);
    }
  }
  return out;
}

// Worst-of-K fold of per-run cell maps → one cell map (cell passes iff it passed in ALL runs).
function worstOfK(runCellMaps, cellNames) {
  const out = { wire: {}, happy: {}, crosscut: {}, integration: {} };
  for (const bucket of ALL_BUCKETS) {
    for (const n of cellNames[bucket] || []) {
      out[bucket][n] = runCellMaps.every((m) => m[bucket][n] === true);
    }
  }
  return out;
}

/**
 * Build a candidate's scorecard.
 * @param {object} p
 * @param {object} p.genome
 * @param {string} p.genomeHash
 * @param {Array<{name:string, cellNames:object, runs:object[]}>} p.epics   per-epic: K raw evaluateEpic results + the bucket cell-name lists
 * @param {object} p.ledger    cost ledger (ledger.mjs) for this candidate's build
 * @param {object} [p.routeDist]  aggregated gateway route counts {route:count}
 * @param {string} [p.baselineHash]  hash of the co-measured baseline (provenance)
 */
export function buildScorecard({ genome, genomeHash, epics, ledger, routeDist = {}, baselineHash = null }) {
  // mechanical channel: epic::bucket::name -> bool (worst-of-K)
  const cells = {};
  const perEpic = {};
  let harnessFailRuns = 0;
  let totalRuns = 0;

  // pooled bucket counts across epics (worst-of-K)
  const pooled = {}; for (const b of ALL_BUCKETS) pooled[b] = { pass: 0, total: 0 };

  for (const ep of epics) {
    const runMaps = ep.runs.map((r) => cellsForRun(r, ep.cellNames));
    const wok = worstOfK(runMaps, ep.cellNames);
    totalRuns += ep.runs.length;
    harnessFailRuns += ep.runs.filter(isHarnessFail).length;

    const bucketCounts = {};
    for (const b of ALL_BUCKETS) {
      const names = ep.cellNames[b] || [];
      const pass = names.filter((n) => wok[b][n]).length;
      bucketCounts[b] = { pass, total: names.length };
      pooled[b].pass += pass; pooled[b].total += names.length;
      for (const n of names) cells[`${ep.name}::${b}::${n}`] = wok[b][n];
    }
    const epicCheck = ALL_BUCKETS.every((b) => bucketCounts[b].total === 0 || bucketCounts[b].pass === bucketCounts[b].total);
    perEpic[ep.name] = { buckets: bucketCounts, epicCheck };
  }

  // §6 reported scalar: cost-weighted reliability over pooled bucket pass-fractions.
  let num = 0, den = 0;
  for (const b of ALL_BUCKETS) {
    const frac = pooled[b].total ? pooled[b].pass / pooled[b].total : 1;
    num += WEIGHTS[b] * frac; den += WEIGHTS[b];
  }
  const reliability = den ? num / den : 0;

  // mutator-channel digest: quadrant-and-count ONLY (no names).
  const failCounts = {};
  for (const b of ALL_BUCKETS) failCounts[b] = pooled[b].total - pooled[b].pass;
  const lethalFailCount = LETHAL_BUCKETS.reduce((s, b) => s + failCounts[b], 0);
  const digest = {
    failCounts,
    lethalFailCount,
    quadrant: lethalFailCount > 0 ? 'lethal-miss' : (failCounts.happy > 0 ? 'happy-miss' : 'clean'),
    harnessFail: harnessFailRuns > 0,
  };

  const epicCheckCount = Object.values(perEpic).filter((e) => e.epicCheck).length;

  return {
    genomeHash,
    genomeRef: genome ? { skeletonAuthorModel: genome.skeletonAuthor?.model, checkerKind: genome.checker?.kind } : null,
    reliability,
    epicPass: { count: epicCheckCount, total: epics.length, all: epicCheckCount === epics.length },
    perEpic,
    cells,                 // MECHANICAL CHANNEL — veto only, never to a model
    digest,                // MUTATOR CHANNEL — quadrant+count only
    cost: { total: ledger ? ledger.total() : 0, byNode: ledger ? ledger.byNode() : {}, byModel: ledger ? ledger.byModel() : {} },
    routeDist,
    harnessFailRate: totalRuns ? harnessFailRuns / totalRuns : 0,
    baselineHash,
  };
}

// The set of lethal cell keys present in a scorecard (epic::bucket::name for crosscut+integration).
export function lethalCellKeys(scorecard) {
  return Object.keys(scorecard.cells).filter((k) => {
    const bucket = k.split('::')[1];
    return LETHAL_BUCKETS.includes(bucket);
  });
}

export { QUADRANT };
