// A SCALE-ECONOMICS evaluator backend for the P2c discovery search — a DETERMINISTIC landscape calibrated to
// the LIVE P2a/P2b measurements (records: P2a-RESULTS.md, P2b-RESULTS.md), NOT to invented numbers. It exists
// because a single live N=13 eval exceeds 150s (measured this session), so a multi-generation × multi-seed
// LIVE evolutionary search is not completable/safe here; the full live multi-seed sequestered-TEST search is
// P3 (gated on the routed baseline + diverse templates + 2nd oracle, STATE.md). This backend lets the
// ASSEMBLED P2 machinery (celled MAP-Elites + credit-attribution + surrogate) be exercised end-to-end and
// shown to autonomously REDISCOVER the P2b cost-dominating config from a naive seed pool — an instrument→
// product validation (the search can find the hand-found winner), exactly as K8 validates rediscovery on the
// calibration fixture, but here on a landscape shaped by the real measured economics.
//
// IMPORTANT (anti-circularity): this is calibrated to the P2b LIVE numbers — the economics CLAIM is P2b's
// (live, measured); this run's claim is only that the upgraded SEARCH converges on that config. It is
// ADDITIVE — it does not touch the frozen synthetic evaluator (evaluator.mjs) that K8/P0 depend on; nothing
// is voided. It uses the REAL epic cell-name lists (real N, real bucket totals) with modeled pass-rates.
//
// The model axes (the genome levers MCOH25/P2a/P2b isolated):
//   - INTEGRATION (the membership seam — the gate's domain, the P2b headline): driven by the integration-gate
//     (on/off) × N × tier, gated by whether a shape contract is present (shapes-off ⇒ the init-crash seam).
//   - CROSSCUT (per-surface obligations): mostly authored by the skeleton (MCOH25: cheap+sonnet AUTHOR the
//     obligation clause), with a small checker/obligation-depth lever.
//   - cost: the model-priced skeleton-author term (fusion $0 / sonnet ~$0.092 / opus ~$0.395), amortization
//     UNCREDITED (one seam-topology ⇒ M_distinct=1, §6) so a candidate can't vanish its cost by claiming M.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { makeLedger } from './ledger.mjs';
import { priceKeyFor } from './config.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', '..', 'build-gap');

// P2b-MEASURED deterministic-gate cells (record: P2b-RESULTS.md "Results — the full ladder"). [tier][gate]
// at each N ⇒ {x: X-CUT pass-frac, i: INTEG pass-frac}. These are the shapes-ON skeleton rows the sweep ran.
const P2B = {
  fusion: {
    off: { 5: { x: 1.00, i: 0.00 }, 9: { x: 0.89, i: 0.00 }, 13: { x: 0.88, i: 0.30 }, 17: { x: 0.89, i: 0.33 } },
    on:  { 5: { x: 1.00, i: 0.89 }, 9: { x: 0.89, i: 0.72 }, 13: { x: 0.90, i: 0.85 }, 17: { x: 0.89, i: 0.69 } },
  },
  opus: {
    off: { 5: { x: 1.00, i: 1.00 }, 9: { x: 0.97, i: 0.72 }, 13: { x: 0.92, i: 0.63 }, 17: { x: 0.86, i: 0.61 } },
    on:  { 5: { x: 1.00, i: 1.00 }, 9: { x: 1.00, i: 0.83 }, 13: { x: 0.94, i: 0.67 }, 17: { x: 0.86, i: 0.64 } },
  },
};
// the bare-opus all-frontier bar (MCOH25 Result 4 / P2b BAR). INTEG was NOT measured for bare-opus (the
// routed-baseline gap, STATE.md #3) — `iProxy` is an explicit UNMEASURED PROXY so the per-cell veto has a
// reference; it is flagged everywhere and does not enter any "confirmed" claim.
export const BARE_OPUS_BAR = {
  5:  { N: 5,  x: 1.00, iProxy: 1.00, cost: 0.278 },
  9:  { N: 9,  x: 0.94, iProxy: 0.70, cost: 0.361 },
  13: { N: 13, x: 0.78, iProxy: 0.55, cost: 0.387 },
  17: { N: 17, x: 0.80, iProxy: 0.50, cost: 0.431 },
};
const EPIC_FOR_N = { 5: 'scale-d1', 9: 'scale-d2', 13: 'scale-d3', 17: 'scale-d4' };

function tierKeyOf(model) { return priceKeyFor(model) === 'opus' ? 'opus' : 'fusion'; } // sonnet ~ fusion reliability
function gateOnOf(g) { return (g.integrationGate && g.integrationGate.kind) === 'deterministic'; } // cheap-judge = null (P2a)

// modeled lethal pass-fractions for a genome at N.
export function modeledFractions(genome, N) {
  const sk = genome.skeletonAuthor || {};
  const tier = tierKeyOf(sk.model);
  const gateOn = gateOnOf(genome);
  const cell = P2B[tier][gateOn ? 'on' : 'off'][N];
  // INTEGRATION: the P2b cell, gated by the shape contract. shapes-off ⇒ the init-crash seam; the gate can
  // still init-repair some of it (P2a Mode-A), but the shape contract is what makes the seam hold ⇒ 0.45×.
  const shapesFactor = sk.shapesIncluded ? 1.0 : (gateOn ? 0.45 : 0.0);
  const integration = cell.i * shapesFactor;
  // CROSSCUT: the P2b base + a small checker/obligation-depth lever (the secondary lethal lever).
  const ck = genome.checker || {};
  const xBonus = (ck.kind !== 'off' ? 0.03 : 0) + 0.015 * (sk.obligationDepth || 0);
  const crosscut = Math.min(0.97, cell.x + xBonus);
  return { crosscut, integration, happy: 0.95, wire: 1.0 };
}

// the model-priced skeleton-author cost (amortization UNCREDITED at one seam-topology, §6). Cheap nodes $0.
function chargeCost(genome) {
  const L = makeLedger();
  const sk = genome.skeletonAuthor || {};
  const out = 3000 + (sk.shapesIncluded ? 1500 : 0) + (sk.obligationDepth || 0) * 250;
  L.charge('skeletonAuthor', { model: sk.model, inputTokens: 2000, outputTokens: out });
  // builder/checker/gate run on the cheap free pool → $0 (the thesis).
  L.charge('builder', { model: 'fusion', outputTokens: 1200 });
  return L;
}

// nested-prefix run: the first floor(frac×total) cells of each bucket pass (so a higher pass-COUNT ⊇ a lower
// one — the per-cell non-inferiority veto reduces cleanly to a count comparison under nested passing).
function mkRun(cellNames, fr) {
  const cnt = (b, frac) => Math.round(frac * (cellNames[b] || []).length);
  const lst = (b, frac) => { const names = cellNames[b] || []; const p = cnt(b, frac); return { pass: p, total: names.length, fails: names.slice(p).map((n) => ({ name: n, why: 'modeled-miss' })) }; };
  const wiredCount = cnt('wire', fr.wire);
  const wired = Object.fromEntries((cellNames.wire || []).map((n, i) => [n, i < wiredCount]));
  return {
    wire: { pass: wiredCount, total: (cellNames.wire || []).length, wired },
    happy: lst('happy', fr.happy), crosscut: lst('crosscut', fr.crosscut), integration: lst('integration', fr.integration),
  };
}

async function cellNamesFor(epic) {
  const t = await import(url.pathToFileURL(path.join(BUILD_GAP, 'epics', epic, 'tests.mjs')).href);
  const nm = (a) => (Array.isArray(a) ? a.map((x) => x.name) : []);
  return { wire: Array.isArray(t.EXPECTS) ? t.EXPECTS.slice() : [], happy: nm(t.happy), crosscut: nm(t.crosscut), integration: nm(t.integration) };
}

/**
 * A deterministic evaluator at a fixed N (epicK identical runs since the landscape is deterministic).
 * @param {{N:number, epicK?:number}} p
 * @returns {Promise<(genome)=>{epics,ledger,routeDist}>}
 */
export async function makeScaleEconomicsEvaluator({ N, epicK = 1 } = {}) {
  const epic = EPIC_FOR_N[N];
  if (!epic) throw new Error(`no scale epic for N=${N}`);
  const cellNames = await cellNamesFor(epic);
  return function evaluate(genome) {
    const fr = modeledFractions(genome, N);
    const runs = Array.from({ length: epicK }, () => mkRun(cellNames, fr));
    return { epics: [{ name: epic, cellNames, runs }], ledger: chargeCost(genome), routeDist: { 'scale-economics': epicK } };
  };
}

// the co-measured bare-opus baseline scorecard at N (the veto reference), built from the bar + the iProxy.
export async function makeBareOpusBaseline(N, buildScorecard) {
  const epic = EPIC_FOR_N[N];
  const cellNames = await cellNamesFor(epic);
  const bar = BARE_OPUS_BAR[N];
  const run = mkRun(cellNames, { wire: 1.0, happy: 0.95, crosscut: bar.x, integration: bar.iProxy });
  const L = makeLedger();
  // the bar's metered cost as the opus-whole proxy term (the interim baseline, §6/§13.3).
  L.charge('baseline-opus-whole', { model: 'opus', usd: bar.cost });
  return buildScorecard({ genome: null, genomeHash: `bare-opus-N${N}`, epics: [{ name: epic, cellNames, runs: [run, run] }], ledger: L });
}
