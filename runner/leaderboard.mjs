// The leaderboard: aggregate per-run scorecards into a per-strategy ranking across
// the four axes, with a Pareto frontier so "best" is defensible.
//
//   axes per strategy (mean over fixtures x K):
//     fidelity        -> higher better   (composite of fidelity + buildCompleteness + catchRate)
//     reliability     -> higher better   (1 - normalized stddev of the fidelity composite)
//     cost            -> lower  better   (mean outputTokens + per-agent penalty)
//     efficiency      -> lower  better   (mean wallClockSec)
//
// Output: a Pareto frontier (a strategy is on it iff nothing dominates it on ALL axes)
// + a transparent composite that ranks the frontier. The frontier AND every per-axis
// number are always shown — no axis hides behind the composite (CHARTER §3 / §5.5).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const RUNS_DIR = path.join(REPO_ROOT, 'runs');

// --- documented constants ---------------------------------------------------
//
// FIDELITY COMPOSITE weights — how the three fidelity-family signals combine into
// the single "fidelity" axis. Documented + exported so the selftest can pin them.
// All three are normalized to 0..1 (higher better) before weighting. catchRate
// recall is treated as NOT-APPLICABLE when null (clean control / no planted gaps):
// it is dropped from the blend and the remaining weights are renormalized, rather
// than scored as 0 (which would unfairly punish a method on a control fixture).
export const FIDELITY_WEIGHTS = Object.freeze({
  fidelity: 0.5,        // parametric expansion-fidelity (axes.fidelity / 100)
  buildComplete: 0.4,   // fraction of runs that were build-complete (the keystone)
  catchRate: 0.1,       // omission recall, when applicable
});

// THIN-FIXTURE FIDELITY COMPOSITE weights. On a THIN fixture (lock ⊊ manifest — no `features` map)
// the test IS the GENERATIVE leap: a method invents its own beads + planKeys.
//
// KEYSTONE FOLD (this phase): the keystone's presence+edge sub-scores on thin input are now
// computed FROM the judge's semantic coverage (eval/build-completeness.mjs thin path), NOT from
// planKey string-matching. So `buildComplete` is now MEANINGFUL on a thin plan — a high-coverage
// generative method reads buildComplete=TRUE. We therefore RE-ADMIT buildComplete to the thin blend
// (it was DROPPED in the prior phase because planKey matching scored it ~0 for everyone). It carries
// a SMALLER weight than generativeCoverage: genCov is the continuous primary signal (the leap), and
// buildComplete is the folded keystone VERDICT (a thresholded boolean over the same coverage). The
// frontier + every per-axis number are STILL always shown (CHARTER §3); only the single "fidelity"
// axis blend changes, and which blend was used + its weights are printed in the leaderboard footer.
export const THIN_FIDELITY_WEIGHTS = Object.freeze({
  generativeCoverage: 0.5, // the GENERATIVE leap — the continuous signal thin fixtures exist to measure
  buildComplete: 0.3,      // the JUDGE-folded keystone verdict (re-admitted now that the fold makes it real)
  fidelity: 0.1,           // parametric expansion-fidelity (structural sanity: atomicity, topology)
  catchRate: 0.1,          // omission recall, when applicable
});

// COST MODEL — a run's cost is its mean output tokens plus a fixed penalty per agent
// spawned (CHARTER §6: "every agent costs a point on the Cost axis, by design").
// AGENT_PENALTY is in token-equivalent units so tokens + agents live on one scale.
export const AGENT_PENALTY = 1000; // token-equivalent cost charged per agent spawned

// COMPOSITE weights — ONLY used to RANK the Pareto frontier. The frontier itself and
// every per-axis number are always shown regardless of these weights (CHARTER §3).
// Each axis is min-max normalized to 0..1 (best=1) across the compared strategies
// before weighting, so axes on different scales (tokens vs seconds) combine fairly.
export const COMPOSITE_WEIGHTS = Object.freeze({
  fidelity: 0.45,
  reliability: 0.25,
  cost: 0.2,
  efficiency: 0.1,
});

export const AXES = Object.freeze([
  { key: 'fidelity', dir: 'max' },
  { key: 'reliability', dir: 'max' },
  { key: 'cost', dir: 'min' },
  { key: 'efficiency', dir: 'min' },
]);

// --- pure helpers -----------------------------------------------------------
function mean(xs) {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Sample standard deviation (n-1). 0 for a single sample. */
function sampleStddev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function round(x, digits = 4) {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

/**
 * Blend the fidelity-family signals into one 0..1 score, dropping null recall (it renormalizes
 * over the present weights rather than scoring 0, which would unfairly punish a control fixture).
 *
 * THICK fixture (default): fidelity*0.5 + buildComplete*0.4 + recall*0.1 — build-completeness is the
 * keystone because the method only TRANSCRIBES a decomposition (planKeys are handed to it).
 *
 * THIN fixture (`thin:true`): generativeCoverage*0.5 + buildComplete*0.3 + fidelity*0.1 + recall*0.1.
 * generativeCoverage (the continuous GENERATIVE leap) is primary; buildComplete is the JUDGE-FOLDED
 * keystone verdict — re-admitted this phase now that the fold makes it meaningful on thin (it is a
 * thresholded boolean over the SAME semantic coverage, so it tracks but does not double-count it).
 */
export function fidelityComposite({ fidelity, buildComplete, recall, generativeCoverage, thin = false }) {
  const parts = thin
    ? [
        { w: THIN_FIDELITY_WEIGHTS.generativeCoverage, v: generativeCoverage ?? 0 },
        { w: THIN_FIDELITY_WEIGHTS.buildComplete, v: buildComplete ? 1 : 0 },
        { w: THIN_FIDELITY_WEIGHTS.fidelity, v: fidelity / 100 },
      ]
    : [
        { w: FIDELITY_WEIGHTS.fidelity, v: fidelity / 100 },
        { w: FIDELITY_WEIGHTS.buildComplete, v: buildComplete ? 1 : 0 },
      ];
  const catchWeight = thin ? THIN_FIDELITY_WEIGHTS.catchRate : FIDELITY_WEIGHTS.catchRate;
  if (recall !== null && recall !== undefined) {
    parts.push({ w: catchWeight, v: recall });
  }
  const wsum = parts.reduce((a, p) => a + p.w, 0);
  if (wsum === 0) return 0;
  return parts.reduce((a, p) => a + p.w * p.v, 0) / wsum; // renormalized over present weights
}

// --- Pareto frontier --------------------------------------------------------
/**
 * A point is ON the frontier iff NO OTHER point is at-least-as-good on ALL axes and
 * strictly better on at least one (i.e. nothing dominates it). Pure function.
 * @param {object[]} points
 * @param {{key:string, dir:'max'|'min'}[]} axes
 * @returns {boolean[]} parallel to points: true iff that point is on the frontier
 */
export function paretoFrontier(points, axes) {
  // atLeastAsGood(a, b, axis): is a no worse than b on this axis?
  const atLeastAsGood = (a, b, axis) =>
    axis.dir === 'max' ? a[axis.key] >= b[axis.key] : a[axis.key] <= b[axis.key];
  const strictlyBetter = (a, b, axis) =>
    axis.dir === 'max' ? a[axis.key] > b[axis.key] : a[axis.key] < b[axis.key];

  // q dominates p iff q is >= p on all axes AND > on at least one.
  const dominates = (q, p) => {
    let strict = false;
    for (const axis of axes) {
      if (!atLeastAsGood(q, p, axis)) return false;
      if (strictlyBetter(q, p, axis)) strict = true;
    }
    return strict;
  };

  return points.map((p, i) =>
    !points.some((q, j) => j !== i && dominates(q, p)),
  );
}

// --- scorecard loading ------------------------------------------------------
// Runs are NAMESPACED BY MODE (runs/live/**, runs/mock/**) so mock plumbing rows can never
// pollute a live leaderboard (FINDINGS §7). Default: LIVE (the science). `--mode mock` (or
// loadScorecardsFromDisk('mock')) renders the zero-spend plumbing board explicitly.
function resolveLeaderboardMode() {
  const idx = process.argv.indexOf('--mode');
  if (idx !== -1 && process.argv[idx + 1]) return String(process.argv[idx + 1]).toLowerCase();
  const eq = process.argv.find((a) => a.startsWith('--mode='));
  if (eq) return eq.slice('--mode='.length).toLowerCase();
  return 'live';
}

/** Recursively collect every runs/<mode>/**\/scorecard.json. */
function loadScorecardsFromDisk(mode = resolveLeaderboardMode()) {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === 'scorecard.json') out.push(JSON.parse(fs.readFileSync(full, 'utf8')));
    }
  };
  walk(path.join(RUNS_DIR, mode));
  return out;
}

// --- min-max normalization for the composite --------------------------------
function normalize(values, dir) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  return values.map((v) => {
    if (span === 0) return 1; // all tied -> all best on this axis
    const t = (v - lo) / span; // 0..1, higher = larger value
    return dir === 'max' ? t : 1 - t; // best -> 1
  });
}

// --- aggregation ------------------------------------------------------------
/**
 * Aggregate per-strategy across fixtures x K and compute the four axes, the Pareto
 * frontier, and the transparent composite rank.
 * @param {object[]} [scorecards]  if omitted, loaded from runs/**\/scorecard.json
 * @param {object}   [weights]     override COMPOSITE_WEIGHTS
 * @returns {{strategies:object[], axes:typeof AXES, weights:object}}
 */
export function buildLeaderboard(scorecards, weights = COMPOSITE_WEIGHTS) {
  const cards = scorecards ?? loadScorecardsFromDisk();
  if (!cards.length) {
    throw new Error(
      `no scorecards found under ${path.join(RUNS_DIR, resolveLeaderboardMode())} ` +
      '(run `npm run battery` first; the leaderboard reads runs/live by default — pass --mode mock for the plumbing board)',
    );
  }

  // group by VARIANT (`${strategy}@${model}` for generative methods, the strategy name for
  // pure-code controls / bare runs). So swarm@haiku vs swarm@sonnet and expand-audit vs
  // expand-audit-noaudit are DISTINCT rows. Back-compat: a scorecard with no `variant` falls
  // back to its strategy name (so pre-sweep scorecards still group as before).
  const byVariant = new Map();
  for (const sc of cards) {
    const variant = sc.variant || sc.strategy;
    if (!byVariant.has(variant)) byVariant.set(variant, []);
    byVariant.get(variant).push(sc);
  }

  // per-variant axis values
  const rows = [];
  for (const [variant, runs] of byVariant) {
    const strategy = runs[0].strategy;
    // model: from the cost record (populated by every strategy). null for pure-code controls.
    const model = runs[0].cost?.model ?? null;
    // auditMode: the ±structural-audit A/B identity. Derived from the strategy name so the column
    // is meaningful only for the expand-audit family (n/a elsewhere).
    const auditMode = strategy === 'expand-audit-noaudit' ? 'off'
      : strategy === 'expand-audit' ? 'on'
      : 'n/a';
    // per-run fidelity composite (0..1). THIN runs lean on generativeCoverage; THICK runs lean on
    // build-completeness (per-run `thin` flag emitted by the battery from the immutable lock).
    const composites = runs.map((r) =>
      fidelityComposite({
        fidelity: r.axes.fidelity,
        buildComplete: r.axes.buildCompleteness.buildComplete,
        recall: r.axes.catchRate ? r.axes.catchRate.recall : null,
        generativeCoverage: r.axes.generativeCoverage ? r.axes.generativeCoverage.overall : 0,
        thin: !!r.thin,
      }),
    );

    const fidelity = mean(composites);

    // reliability: 1 - normalized stddev of the fidelity composite over repeats.
    // composite is bounded 0..1 so its stddev is already on a 0..1 scale; clamp.
    const sd = sampleStddev(composites);
    const reliability = Math.max(0, 1 - sd);

    // cost: mean output tokens + per-agent penalty
    const cost = mean(runs.map((r) => (r.cost?.outputTokens ?? 0) + AGENT_PENALTY * (r.cost?.agents ?? 0)));

    // efficiency: mean wall-clock seconds (lower better)
    const efficiency = mean(runs.map((r) => r.cost?.wallClockSec ?? 0));

    // transparency: the raw signals that fed the fidelity composite
    const meanFidelity = mean(runs.map((r) => r.axes.fidelity));
    const buildCompleteRate = mean(runs.map((r) => (r.axes.buildCompleteness.buildComplete ? 1 : 0)));
    const recallRuns = runs
      .map((r) => (r.axes.catchRate ? r.axes.catchRate.recall : null))
      .filter((x) => x !== null && x !== undefined);
    const recall = recallRuns.length ? mean(recallRuns) : null;

    // generative-coverage transparency: mean overall across ALL runs, and — separately — across only
    // the THIN runs (where it is the primary fidelity signal). Always shown per CHARTER §3.
    const genCovAll = mean(runs.map((r) => (r.axes.generativeCoverage ? r.axes.generativeCoverage.overall : 0)));
    const thinRuns = runs.filter((r) => r.thin);
    const genCovThin = thinRuns.length
      ? mean(thinRuns.map((r) => (r.axes.generativeCoverage ? r.axes.generativeCoverage.overall : 0)))
      : null;
    // PRESENCE (the softer 'scope exists' view) over the THIN runs only, next to genCovThin so the
    // presence-vs-sufficiency GAP is visible. The fidelity blend stays on SUFFICIENCY (genCov); this
    // column is REPORT-ONLY. In MOCK presence===sufficiency (stub), so presenceThin===genCovThin; the
    // LIVE judge is where they diverge (a present-but-thin packet lifts presence above sufficiency).
    const presenceThin = thinRuns.length
      ? mean(thinRuns.map((r) => (r.axes.generativeCoverage && r.axes.generativeCoverage.presenceOverall != null
          ? r.axes.generativeCoverage.presenceOverall
          : (r.axes.generativeCoverage ? r.axes.generativeCoverage.overall : 0))))
      : null;

    rows.push({
      variant,
      strategy,
      model,
      auditMode,
      K: runs.length,
      // the four axes
      fidelity, reliability, cost, efficiency,
      // transparency fields (always shown, never hidden behind the composite)
      meanFidelity, buildCompleteRate, recall, fidelityStddev: sd,
      genCovAll, genCovThin, presenceThin,
    });
  }

  rows.sort((a, b) => a.variant.localeCompare(b.variant));

  // Pareto frontier over the four axes
  const onFrontier = paretoFrontier(rows, AXES);
  rows.forEach((r, i) => { r.onFrontier = onFrontier[i]; });

  // transparent composite (min-max normalized per axis, then weighted) — RANK only
  const norm = {};
  for (const axis of AXES) norm[axis.key] = normalize(rows.map((r) => r[axis.key]), axis.dir);
  rows.forEach((r, i) => {
    r.composite =
      weights.fidelity * norm.fidelity[i] +
      weights.reliability * norm.reliability[i] +
      weights.cost * norm.cost[i] +
      weights.efficiency * norm.efficiency[i];
  });

  // composite rank: 1 = best composite (ties share a rank). Stable tiebreak on variant.
  const sortedByComposite = [...rows].sort((a, b) => (b.composite - a.composite) || a.variant.localeCompare(b.variant));
  let lastScore = null;
  let lastRank = 0;
  sortedByComposite.forEach((r, i) => {
    if (lastScore === null || r.composite < lastScore) { lastRank = i + 1; lastScore = r.composite; }
    r.rank = lastRank;
  });

  return { strategies: rows, axes: AXES, weights };
}

// --- rendering --------------------------------------------------------------
export function renderLeaderboard(board) {
  const { strategies, weights } = board;
  const header = [
    'rank', 'variant', 'model', 'audit', 'front', 'fidelity', 'reliab', 'cost', 'effic(s)',
    'composite', '| fidScore', 'bcRate', 'genCov(thin)', 'presence(thin)', 'recall',
  ];
  const lines = [header];
  // print ordered by composite rank, then variant name
  const ordered = [...strategies].sort((a, b) => (a.rank - b.rank) || a.variant.localeCompare(b.variant));
  for (const r of ordered) {
    lines.push([
      String(r.rank),
      r.variant,
      r.model ?? 'n/a',
      r.auditMode ?? 'n/a',
      r.onFrontier ? 'YES' : '-',
      String(round(r.fidelity, 4)),
      String(round(r.reliability, 4)),
      String(round(r.cost, 2)),
      String(round(r.efficiency, 6)),
      String(round(r.composite, 4)),
      String(round(r.meanFidelity, 2)),
      String(round(r.buildCompleteRate, 3)),
      r.genCovThin === null ? 'n/a' : String(round(r.genCovThin, 3)),
      r.presenceThin === null ? 'n/a' : String(round(r.presenceThin, 3)),
      r.recall === null ? 'n/a' : String(round(r.recall, 3)),
    ]);
  }
  const widths = header.map((_, i) => Math.max(...lines.map((l) => String(l[i]).length)));
  const fmt = (l) => l.map((c, i) => String(c).padEnd(widths[i])).join('  ');

  const out = [];
  out.push('\nLeaderboard — Pareto frontier + transparent composite (CHARTER §3 / §5.5)');
  out.push('========================================================================');
  out.push(fmt(lines[0]));
  out.push(widths.map((w) => '-'.repeat(w)).join('  '));
  for (let i = 1; i < lines.length; i++) out.push(fmt(lines[i]));
  out.push('');
  out.push('Axes:  fidelity (max)  reliability (max)  cost (min, tokens+agent-penalty)  efficiency (min, wall-clock s)');
  out.push(`Cost model:   outputTokens + ${AGENT_PENALTY} token-equiv per agent.`);
  out.push(`Fidelity blend — THICK fixture (renormalized when recall n/a):  fidelity*${FIDELITY_WEIGHTS.fidelity} + buildCompleteRate*${FIDELITY_WEIGHTS.buildComplete} + recall*${FIDELITY_WEIGHTS.catchRate}.`);
  out.push(`Fidelity blend — THIN fixture (lock⊊manifest; buildComplete JUDGE-FOLDED + re-admitted this phase):  generativeCoverage*${THIN_FIDELITY_WEIGHTS.generativeCoverage} + buildComplete*${THIN_FIDELITY_WEIGHTS.buildComplete} + fidelity*${THIN_FIDELITY_WEIGHTS.fidelity} + recall*${THIN_FIDELITY_WEIGHTS.catchRate}.`);
  out.push('genCov(thin) = mean generativeCoverage.overall (SUFFICIENCY) over THIN-fixture runs only (n/a if none); the GENERATIVE leap + the signal the fidelity blend uses. On thin, the keystone presence/edge sub-scores are FOLDED from this same SUFFICIENCY coverage (CHARTER §8 / this phase).');
  out.push('presence(thin) = mean generativeCoverage.presenceOverall (a packet/edge of the RIGHT SCOPE exists, however thin) over THIN runs. presence(thin) >= genCov(thin); the GAP is the present-but-thin set. REPORT-ONLY — the fidelity blend stays on SUFFICIENCY (genCov). In MOCK the stub sets presence==sufficiency so the columns match; the LIVE judge is where they diverge.');
  out.push('Rows are grouped by VARIANT (`${strategy}@${model}`, or the strategy name for pure-code controls). model + audit columns split swarm@haiku vs swarm@sonnet and expand-audit vs expand-audit-noaudit.');
  out.push(`Composite weights (RANK ONLY, frontier always shown):  fidelity=${weights.fidelity} reliability=${weights.reliability} cost=${weights.cost} efficiency=${weights.efficiency}.`);
  out.push('"front=YES" = on the Pareto frontier (nothing dominates it on all four axes).');
  out.push('');
  return out.join('\n');
}

// CLI entry (npm run leaderboard)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('leaderboard.mjs')) {
  try {
    const board = buildLeaderboard();
    console.log(renderLeaderboard(board));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
