// The battery runner: execute the matrix (strategy x fixture x K repeats), score
// every run on every axis, persist per-run scorecards + an aggregate report.
//
// Loop (per (strategy, fixture)):
//   K = repeatsFor(strategy, MIN_REPEATS)
//   for r in 0..K:
//     dir = fresh workspace
//     { snapshot, cost } = await strategy.run(fixture, ctx)
//     scorecard = {
//       strategy, fixture, fixtureHash, repeat: r,
//       axes: { fidelity, buildCompleteness, catchRate }, cost,
//     }
//     write runs/<strategy>/<fixture>/r<r>/scorecard.json ; append ledger row
//   aggregate mean + stddev over K
//
// Honesty guards (CHARTER §6): fresh workspace per run; fixtureHash pinned and only
// compared within a hash; one blessed scorer; append-only ledger.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { STRATEGIES } from '../strategies/registry.mjs';
import { repeatsFor, assertRunResult } from '../strategies/adapter.mjs';
import { scoreBuildCompleteness } from '../eval/build-completeness.mjs';
import { scoreFidelity } from '../eval/fidelity.mjs';
import { scoreCatchRate } from '../eval/catch-rate.mjs';
import { scoreOutcomeCoverage } from '../eval/outcome-coverage.mjs';
import { scoreGenerativeCoverage } from '../eval/generative-coverage.mjs';
import { scoreGranularity } from '../eval/granularity.mjs';
import { GRANULARITY_LEVEL_IDS } from '../strategies/granularity.mjs';
import { claudeInvoke, makeGatewayInvoke } from './model-client.mjs';
import { makeBatteryMockInvoke, makeStubJudge } from './mock-table.mjs';
import { makeClaudeJudge } from './judge.mjs';
import { validate } from './validate-schema.mjs';

export const MIN_REPEATS = 5; // minimum K for a credible reliability number on stochastic strategies

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(REPO_ROOT, 'fixtures');
const RUNS_DIR = path.join(REPO_ROOT, 'runs');
const LEDGER_PATH = path.join(REPO_ROOT, 'ledger.md');
const SCHEMAS_DIR = path.join(REPO_ROOT, 'schemas');

// --- mode -------------------------------------------------------------------
// MOCK (default) runs the WHOLE matrix at ZERO spend: ctx.invoke = a deterministic canned
// table, the generative-coverage judge = a deterministic stub. LIVE wires the real claude CLI
// (ctx.invoke = claudeInvoke) and a claude-backed bounded judge. Default is 'mock' so a bare
// `npm run battery` can never spend money. Precedence: --mode flag > BATTERY_MODE env > 'mock'.
function resolveMode(opts = {}) {
  if (opts.mode) return String(opts.mode).toLowerCase();
  const flagIdx = process.argv.indexOf('--mode');
  if (flagIdx !== -1 && process.argv[flagIdx + 1]) return String(process.argv[flagIdx + 1]).toLowerCase();
  const eq = process.argv.find((a) => a.startsWith('--mode='));
  if (eq) return eq.slice('--mode='.length).toLowerCase();
  if (process.env.BATTERY_MODE) return String(process.env.BATTERY_MODE).toLowerCase();
  return 'mock';
}

/** Read a `--flag value` / `--flag=value` string arg from argv (returns null if absent). */
function readStringFlag(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return String(process.argv[idx + 1]);
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(`--${name}=`.length);
  return null;
}

// --- the MODEL SWEEP dimension ----------------------------------------------
// opts.models is an ARRAY of model labels to sweep; default a SINGLE element so a bare run is
// unchanged. CLI: `--models a,b,c`. For each label we re-run the GENERATIVE strategies with
// ctx.model = that label (tagging variant = `${strategy}@${model}`); pure-code controls IGNORE
// the label and run exactly ONCE (variant = the strategy name). MOCK CAVEAT: the canned invoke
// ignores the real model, so in mock the labels only prove the SWEEP PLUMBING — variants are
// tagged + grouped + split in the leaderboard, but genCov will not DIFFER by label (real model
// differences appear only live). The mock is authored so the rows are distinctly TAGGED regardless.
function resolveModels(opts = {}) {
  if (Array.isArray(opts.models) && opts.models.length) return opts.models.map(String);
  const flag = readStringFlag('models');
  if (flag) {
    const labels = flag.split(',').map((s) => s.trim()).filter(Boolean);
    if (labels.length) return labels;
  }
  // Default single element: a bare run sweeps exactly one (the strategies' pinned default).
  return [null];
}

// --- the GRANULARITY SWEEP dimension ------------------------------------------
// opts.granularities / `--granularity L1,L3` is an ARRAY of levels (L0–L4) to sweep; default a
// SINGLE null element so a bare run is unchanged (no clause, no post-pass). For each level the
// GENERATIVE strategies re-run with ctx.granularity = that level (variant gains a `#level`
// suffix); pure-code controls ignore it. The level CLAUSE asks the model for the dose; the
// strategy's deterministic POST-PASS enforces it; the runner records the MEASURED granularity
// on every scorecard regardless (RESEARCH-PROGRAM §4.2 / assumption A5).
function resolveGranularities(opts = {}) {
  let levels = null;
  if (Array.isArray(opts.granularities) && opts.granularities.length) levels = opts.granularities.map(String);
  else {
    const flag = readStringFlag('granularity');
    if (flag) levels = flag.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (!levels || !levels.length) return [null];
  const unknown = levels.filter((l) => !GRANULARITY_LEVEL_IDS.includes(l));
  if (unknown.length) {
    throw new Error(`--granularity: unknown level(s) ${unknown.join(', ')} (have: ${GRANULARITY_LEVEL_IDS.join(', ')})`);
  }
  return levels;
}

/** Read a numeric `--flag value` / `--flag=value` arg (returns null if absent/non-numeric). */
function readNumberFlag(name) {
  const raw = readStringFlag(name);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Restrict the run to a subset of fixtures by name. CLI: `--fixture sso-greenfield` (repeatable
 * via comma: `--fixture a,b`). Default: all discovered fixtures. Lets a scoped live sweep target
 * ONE thin fixture without moving any fixture dir (fixtures stay immutable on disk).
 */
function resolveFixtureFilter(opts = {}) {
  let names = null;
  if (Array.isArray(opts.fixtures) && opts.fixtures.length) names = opts.fixtures.map(String);
  else if (opts.fixture) names = String(opts.fixture).split(',').map((s) => s.trim()).filter(Boolean);
  else {
    const flag = readStringFlag('fixture');
    if (flag) names = flag.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return names && names.length ? new Set(names) : null;
}

/**
 * Restrict the run to a subset of strategies by name. CLI: `--strategy single-session` (repeatable
 * via comma). Default: all registered strategies. Lets a cheap live SMOKE target one variant.
 */
function resolveStrategyFilter(opts = {}) {
  let names = null;
  if (Array.isArray(opts.strategies) && opts.strategies.length) names = opts.strategies.map(String);
  else if (opts.strategy) names = String(opts.strategy).split(',').map((s) => s.trim()).filter(Boolean);
  else {
    const flag = readStringFlag('strategy');
    if (flag) names = flag.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return names && names.length ? new Set(names) : null;
}

/** The JUDGE model is HELD FIXED across a method sweep (CHARTER §5.3 — it is a separate control). */
function resolveJudgeModel(opts = {}) {
  if (opts.judgeModel) return String(opts.judgeModel);
  const flag = readStringFlag('judge-model');
  if (flag) return flag;
  return undefined; // makeClaudeJudge falls back to its fixed mid-tier default
}

/**
 * The METHOD transport in LIVE mode: 'claude' (the CLI) or 'gateway' (the jnoccio free-model supply,
 * the A1 cheap-tier precondition). The JUDGE NEVER moves — it stays on the pinned claude regardless
 * (CHARTER §5.3). CLI: `--transport gateway`. Default 'claude'. Ignored in mock mode.
 */
function resolveTransport(opts = {}) {
  const t = (opts.transport || readStringFlag('transport') || 'claude').toLowerCase();
  if (t !== 'claude' && t !== 'gateway') {
    throw new Error(`--transport: unknown '${t}' (expected 'claude' or 'gateway')`);
  }
  return t;
}

// A8: a method that can't produce a valid snapshot gets a budgeted number of RETRIES (the gateway
// re-routes to a different free upstream each time), and an EXHAUSTED method scores 0 (an empty
// snapshot) rather than being silently dropped — dropping would bias its average upward by counting
// only its lucky runs. Free models are the flakiest, so this lives in the runner, not the smoke.
const METHOD_MAX_ATTEMPTS = 3;

// --- fixture discovery ------------------------------------------------------
const FIXTURE_FILES = ['plan.lock.json', 'outcome-manifest.json', 'planted-gaps.json'];

/** Scan fixtures/*\/ for dirs that contain the full oracle bundle. */
function discoverFixtures() {
  const out = [];
  if (!fs.existsSync(FIXTURES_DIR)) return out;
  const entries = fs.readdirSync(FIXTURES_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(FIXTURES_DIR, e.name);
    if (!FIXTURE_FILES.every((f) => fs.existsSync(path.join(dir, f)))) continue;
    out.push({ name: e.name, dir });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Load a discovered fixture: raw bytes hash of the lock + parsed bundle. */
function loadFixture(fx) {
  const lockBytes = fs.readFileSync(path.join(fx.dir, 'plan.lock.json'));
  const fixtureHash = crypto.createHash('sha256').update(lockBytes).digest('hex');
  const lock = JSON.parse(lockBytes.toString('utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(fx.dir, 'outcome-manifest.json'), 'utf8'));
  const plantedGaps = JSON.parse(fs.readFileSync(path.join(fx.dir, 'planted-gaps.json'), 'utf8'));
  const planMdPath = path.join(fx.dir, 'plan.md');
  const planMd = fs.existsSync(planMdPath) ? fs.readFileSync(planMdPath, 'utf8') : '';
  // THIN ⇔ the lock carries no `features` map (lock ⊊ manifest — see fixtures/README.md "Thin
  // fixtures"). On a thin fixture the generative leap is the test, so the leaderboard ranks by
  // generativeCoverage, not build-completeness. This is read from the immutable lock, not declared.
  const thin = !lock || typeof lock.features !== 'object' || lock.features === null;
  return { name: fx.name, dir: fx.dir, fixtureHash, lock, manifest, plantedGaps, planMd, thin };
}

// A8 score-0: the snapshot a method that exhausted its retries is scored on — an epic-only
// decomposition. Every coverage axis scores ~0 against it (verified: fidelity/granularity/outcome/
// generative all return 0/empty), so an unrecoverable method counts as a miss, not a dropped run.
export function emptySnapshot(fixtureName) {
  return { beads: [{ id: 'epic-0', type: 'epic', title: fixtureName, status: 'open', metadata: {} }], edges: [], ready: [] };
}

/**
 * Run one strategy with A8 budgeted retries. Each attempt re-invokes the strategy (with the gateway
 * transport that means re-routing to a different free upstream). An attempt is VALID iff the result
 * passes assertRunResult + assertSnapshotShape AND has ≥1 non-epic bead — the last guard rejects a
 * truncated/garbled response that parsed into a structurally-valid but EMPTY snapshot (the exact
 * gateway output-cap failure mode; without it that scores a silent 0 and never retries).
 * @returns {Promise<{result:object|null, lastErr:Error|null, attemptsUsed:number}>} result=null ⇒ exhausted.
 */
export async function attemptRun({ strategy, fixtureArg, ctx, attempts, onRetry }) {
  let lastErr = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const cand = await strategy.run(fixtureArg, ctx);
      assertRunResult(strategy.name, cand);
      assertSnapshotShape(strategy.name, cand.snapshot);
      if (cand.snapshot.beads.filter((b) => b.type !== 'epic').length === 0) {
        throw new Error('empty decomposition (0 task beads) — likely truncated/invalid model output');
      }
      return { result: cand, lastErr: null, attemptsUsed: attempt };
    } catch (e) {
      lastErr = e;
      if (attempt < attempts && onRetry) onRetry(attempt, e);
    }
  }
  return { result: null, lastErr, attemptsUsed: attempts };
}

// --- minimal snapshot validation (no ajv; reuse assertRunResult + extra) ----
/** Extra structural checks beyond assertRunResult: ready[] present, each bead id+type. */
function assertSnapshotShape(strategyName, snapshot) {
  if (!Array.isArray(snapshot.ready)) {
    throw new Error(`strategy ${strategyName}: snapshot.ready must be an array`);
  }
  for (const b of snapshot.beads) {
    if (!b || typeof b !== 'object' || typeof b.id !== 'string' || typeof b.type !== 'string') {
      throw new Error(`strategy ${strategyName}: every bead must have string id + type`);
    }
  }
}

// --- workspace --------------------------------------------------------------
// NAMESPACED BY MODE (FINDINGS §7): runs/mock/** and runs/live/** never mix, so the
// leaderboard can read a clean series. Keyed by VARIANT (filesystem-safe) below that,
// so swarm@mock-a and swarm@mock-b never collide.
function modeRunsDir(mode) {
  return path.join(RUNS_DIR, mode);
}
function variantDir(variant) {
  return String(variant).replace(/[^a-zA-Z0-9._@-]/g, '_');
}
function freshWorkspace(mode, variant, fixture, r) {
  const ws = path.join(modeRunsDir(mode), variantDir(variant), fixture, `r${r}`, 'ws');
  fs.rmSync(ws, { recursive: true, force: true });
  fs.mkdirSync(ws, { recursive: true });
  return ws;
}

// --- stats ------------------------------------------------------------------
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

function round(x, digits = 3) {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

// --- ledger -----------------------------------------------------------------
function ledgerRow(seq, sc, K) {
  const bc = sc.axes.buildCompleteness;
  const gc = sc.axes.generativeCoverage;
  const cr = sc.axes.catchRate;
  const cost = sc.cost || {};
  const recall = cr.recall === null || cr.recall === undefined ? 'n/a' : round(cr.recall, 3);
  const catchCell = `recall=${recall} fp=${cr.falsePositives}`;
  return [
    '',
    seq,
    sc.variant || sc.strategy,
    sc.fixture,
    sc.fixtureHash.slice(0, 12),
    K,
    sc.axes.fidelity,
    bc.buildComplete,
    catchCell,
    cost.outputTokens ?? '',
    cost.agents ?? '',
    round(cost.wallClockSec ?? 0, 4),
    `gen=${round(gc.overall, 3)} edge=${round(bc.edgeCoverage, 3)} present=${round(bc.beadPresence, 3)} ready=${round(bc.buildReadiness, 3)}`,
    'scored',
    '',
  ].join(' | ').replace(/^ \| /, '| ').replace(/ \| $/, ' |');
}

function appendLedgerRows(rows) {
  if (!rows.length) return;
  fs.appendFileSync(LEDGER_PATH, '\n' + rows.join('\n'), 'utf8');
}

// --- the runner -------------------------------------------------------------
export async function runBattery(opts = {}) {
  const minRepeats = opts.minRepeats ?? readNumberFlag('min-repeats') ?? MIN_REPEATS;
  const mode = resolveMode(opts);
  if (mode !== 'mock' && mode !== 'live') {
    throw new Error(`unknown BATTERY_MODE/--mode '${mode}' (expected 'mock' or 'live')`);
  }
  const models = resolveModels(opts);       // the sweep dimension (labels; [null] = one bare run)
  const granularities = resolveGranularities(opts); // the dose dimension ([null] = no knob)
  const judgeModel = resolveJudgeModel(opts); // HELD FIXED across the whole sweep
  const transport = resolveTransport(opts);   // method transport in LIVE mode (claude|gateway)
  const fixtureFilter = resolveFixtureFilter(opts); // null = all; else a Set of fixture names
  const strategyFilter = resolveStrategyFilter(opts); // null = all; else a Set of strategy names
  if (strategyFilter) {
    const unknown = [...strategyFilter].filter((n) => !STRATEGIES.some((s) => s.name === n));
    if (unknown.length) throw new Error(`--strategy: unknown strategy(ies) ${unknown.join(', ')} (have: ${STRATEGIES.map((s) => s.name).join(', ')})`);
  }
  let discovered = discoverFixtures();
  if (!discovered.length) throw new Error(`no fixtures found under ${FIXTURES_DIR}`);
  if (fixtureFilter) {
    const unknown = [...fixtureFilter].filter((n) => !discovered.some((d) => d.name === n));
    if (unknown.length) throw new Error(`--fixture: unknown fixture(s) ${unknown.join(', ')} (have: ${discovered.map((d) => d.name).join(', ')})`);
    discovered = discovered.filter((d) => fixtureFilter.has(d.name));
  }
  const fixtures = discovered.map(loadFixture);

  // Wire the mode's invoke + generative-coverage judge. MOCK = zero spend, deterministic;
  // LIVE = real claude CLI + a claude-backed bounded judge. Both are injected, never reached
  // for by a strategy/scorer directly (so the same code paths run under test and in production).
  let invoke;
  let judge;
  if (mode === 'mock') {
    invoke = makeBatteryMockInvoke(fixtures.map((f) => ({ name: f.name, manifest: f.manifest })));
    judge = makeStubJudge();
  } else {
    // METHOD transport: the swept cheap-tier gateway, or the claude CLI. The JUDGE is ALWAYS claude
    // (apparatus stays on the pinned strong model — CHARTER §5.3), independent of the method transport.
    invoke = transport === 'gateway' ? makeGatewayInvoke() : claudeInvoke;
    judge = makeClaudeJudge(claudeInvoke, judgeModel ? { model: judgeModel } : {});
  }
  console.log(`Battery mode: ${mode.toUpperCase()}${mode === 'mock' ? ' (ZERO spend — deterministic mock invoke + stub judge)' : ` (real ${transport === 'gateway' ? 'jnoccio GATEWAY (free cheap-tier) methods + claude JUDGE' : 'claude CLI'} — ${transport === 'gateway' ? 'judge spends' : 'spends money'})`}`);
  console.log(`Model sweep: ${models.map((m) => m ?? '(strategy default)').join(', ')}   |   judge model (fixed): ${judgeModel ?? '(judge default)'}`);
  console.log(`Granularity sweep: ${granularities.map((g) => g ?? '(none)').join(', ')}`);

  // Load the scorecard schema once so we can round-trip-validate every emitted scorecard.
  const scorecardSchema = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'scorecard.schema.json'), 'utf8'));
  const costSchema = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'cost-record.schema.json'), 'utf8'));
  const schemaRefs = { [costSchema.$id]: costSchema };

  fs.mkdirSync(modeRunsDir(mode), { recursive: true });

  let validatedOnce = false; // round-trip-validate the first emitted scorecard, loudly
  const skipped = [];
  const aggregate = {}; // key `${variant}::${fixture}` -> { ... }
  const summaryRows = [];
  const ledgerRows = [];
  let seq = 0;

  for (const strategy of STRATEGIES) {
    if (strategyFilter && !strategyFilter.has(strategy.name)) continue;
    // PURE-CODE CONTROLS (deterministic) ignore the model + granularity knobs and run exactly
    // ONCE regardless of the sweep. Generative methods run once per (model label × level).
    const sweep = strategy.deterministic ? [null] : models;
    const granSweep = strategy.deterministic ? [null] : granularities;

    for (const model of sweep) {
    for (const gran of granSweep) {
      // variant = the swept identity: `${strategy}@${model}#${level}` for generative methods
      // (each suffix only when swept); pure-code controls keep the bare strategy name.
      const variant = strategy.deterministic
        ? strategy.name
        : `${strategy.name}${model == null ? '' : `@${model}`}${gran == null ? '' : `#${gran}`}`;

      for (const fixture of fixtures) {
        const K = repeatsFor(strategy, minRepeats);
        const fidelities = [];
        const edgeCoverages = [];
        const beadPresences = [];
        const buildReadinesses = [];
        const genOveralls = [];
        const granAtoms = []; // measured dose (G.atoms) per repeat
        const partitionSeries = {}; // partition -> [edge-sufficiency score per repeat] (partitioned fixtures only)
        let lastBuildComplete = null;
        let anyScored = false;

        for (let r = 0; r < K; r++) {
          const ws = freshWorkspace(mode, variant, fixture.name, r);
          const fixtureArg = {
            name: fixture.name,
            lock: fixture.lock,
            planMd: fixture.planMd,
            dir: ws,
          };

          // A8 retries: the gateway re-routes to a different free upstream on each attempt, so a flaky
          // free model gets METHOD_MAX_ATTEMPTS tries; claude/mock keep their single deterministic try
          // (claudeInvoke does its own transient retry). Per-call resolved routes are captured for A8
          // reproducibility and persisted alongside the snapshot.
          const gatewayLive = mode === 'live' && transport === 'gateway';
          const attempts = gatewayLive && !strategy.deterministic ? METHOD_MAX_ATTEMPTS : 1;
          const routes = [];
          const runInvoke = gatewayLive
            ? async (a) => {
                const rr = await invoke(a);
                routes.push({ model: rr.model ?? null, route: rr.route ?? null, requestId: rr.requestId ?? null, finishReason: rr.finishReason ?? null });
                return rr;
              }
            : invoke;

          // ctx carries the mode's invoke + the swept knobs; a strategy NEVER reaches for the CLI itself.
          const { result: ran, lastErr } = await attemptRun({
            strategy,
            fixtureArg,
            ctx: { signal: undefined, invoke: runInvoke, model, granularity: gran },
            attempts,
            onRetry: (attempt, e) => console.log(`  ${variant}/${fixture.name}/r${r}: attempt ${attempt}/${attempts} invalid (${e.message.slice(0, 80)}) — re-routing`),
          });
          let result = ran;

          if (!result) {
            if (attempts === 1) {
              // claude/mock: a failure here is most likely a real bug, not a routing flake. Preserve the
              // original behavior — record + skip the remaining repeats for this (variant, fixture).
              skipped.push({ variant, strategy: strategy.name, fixture: fixture.name, skipped: true, reason: lastErr.message });
              break;
            }
            // gateway exhausted its budgeted retries → SCORE 0 (epic-only snapshot), don't drop the run
            // (dropping biases the method's average upward). Repeats are independent draws, so continue.
            skipped.push({ variant, strategy: strategy.name, fixture: fixture.name, scoredZero: true, reason: `gateway method exhausted ${attempts} attempts: ${lastErr.message}` });
            result = { snapshot: emptySnapshot(fixture.name), gaps: [], cost: { outputTokens: 0, agents: 0, wallClockSec: 0, usd: 0, model: model ?? null } };
          }

          // A8: record WHICH free upstream(s) actually served this run on the cost record (the gateway
          // route is the resolved model; the requested model is just the gateway alias). The variant
          // label keeps the requested id; the cost record carries ground truth for reproducibility.
          if (gatewayLive && routes.length && result.cost) {
            const distinct = [...new Set(routes.map((x) => x.route || x.model).filter(Boolean))];
            if (distinct.length) result.cost.model = distinct.join('+');
          }

          // Persist the snapshot (KT#1: the literal kill-test re-score was impossible because Step-2/3
          // discarded theirs — never again) + the resolved routes (A8 reproducibility) into the run's ws.
          if (mode === 'live') {
            try {
              fs.writeFileSync(path.join(ws, 'snapshot.json'), JSON.stringify(result.snapshot, null, 2));
              if (routes.length) fs.writeFileSync(path.join(ws, 'routes.json'), JSON.stringify(routes, null, 2));
            } catch { /* persistence is best-effort; never fail a scored run over it */ }
          }

          const fidelity = scoreFidelity(result.snapshot, fixture.manifest);
          const catchRate = scoreCatchRate(result.gaps || [], fixture.plantedGaps);
          // MEASURED granularity on every run (assumption A5: analyses regress on the measured
          // dose, never on the requested level — the knob is leaky by nature).
          const granularity = scoreGranularity(result.snapshot, fixture.manifest);
          // THIN-input axes computed FIRST: mechanical STATED-outcome coverage + bounded-judgment
          // LATENT requirement/edge coverage (the judge is the mode's injected judge — stub in mock).
          const outcomeCoverage = scoreOutcomeCoverage(result.snapshot, fixture.manifest);
          // GRADER COST (FINDINGS §7): delta the judge's accumulator around the judged pass so
          // each scorecard carries what GRADING it cost — separate from the method's cost record.
          const graderBefore = judge.cost ? { ...judge.cost } : null;
          const generativeCoverage = await scoreGenerativeCoverage(result.snapshot, fixture.manifest, judge);
          const graderCost = graderBefore
            ? {
                calls: judge.cost.calls - graderBefore.calls,
                outputTokens: judge.cost.outputTokens - graderBefore.outputTokens,
                usd: round(judge.cost.usd - graderBefore.usd, 6),
                wallClockSec: round(judge.cost.wallClockSec - graderBefore.wallClockSec, 4),
              }
            : null;

          // KEYSTONE FOLD: on a THIN fixture (lock ⊊ manifest — no `features`), a generative method
          // invents its own planKeys so the mechanical planKey match scores ~0. So we fold the
          // ALREADY-COMPUTED judge coverage + stated-outcome coverage INTO the keystone, making
          // `buildComplete` mean the same thing thin or thick. THICK fixtures stay mechanical.
          const buildCompleteness = fixture.thin
            ? scoreBuildCompleteness(result.snapshot, fixture.manifest, {
                coverage: generativeCoverage,
                outcomeCoverage,
              })
            : scoreBuildCompleteness(result.snapshot, fixture.manifest);

          const scorecard = {
            strategy: strategy.name,
            variant,
            fixture: fixture.name,
            fixtureHash: fixture.fixtureHash,
            repeat: r,
            thin: fixture.thin,
            granularityLevel: gran, // the REQUESTED dose (null = knob off)
            granularity,            // the MEASURED dose (always recorded)
            axes: {
              fidelity,
              generativeCoverage: {
                // SUFFICIENCY (existing field names — eval/build-completeness.mjs's thin fold and the
                // keystone read these as sufficiency; their meaning is UNCHANGED).
                requirementCoverage: generativeCoverage.requirementCoverage.score,
                edgeCoverage: generativeCoverage.edgeCoverage.score,
                outcomeCoverage: outcomeCoverage.score,
                overall: generativeCoverage.overall,
                // PRESENCE (NEW — the softer 'scope exists' view). In MOCK the stub sets
                // sufficiency===presence so these match the sufficiency numbers; LIVE is where they
                // diverge (a present-but-thin packet reads presence:true, sufficiency:false).
                presenceRequirement: generativeCoverage.presence.requirementCoverage.score,
                presenceEdge: generativeCoverage.presence.edgeCoverage.score,
                presenceOverall: generativeCoverage.presence.overall,
                // PER-PARTITION edge recall (library-covered vs SEAM) — present ONLY on a partitioned
                // manifest. The anchoring read: a primed arm is safe iff covered recall rises AND seam
                // recall does not fall. Bare sufficiency scores per partition.
                ...(generativeCoverage.edgeCoverageByPartition
                  ? { edgeByPartition: Object.fromEntries(Object.entries(generativeCoverage.edgeCoverageByPartition).map(([p, v]) => [p, round(v.score, 4)])) }
                  : {}),
                // PER-QUADRANT edge recall (cost-of-omission 2x2) + COST-WEIGHTED recall — present
                // ONLY on a quadrant-tagged manifest (BUILD-TOLERANT-REFRAME.md kill-test #1). The
                // kill-test read: if cost-weighting re-orders methods vs uniform edgeCoverage, uniform
                // recall measured the wrong thing. lethalRecall is the veto scalar (RECONCILIATION B).
                ...(generativeCoverage.edgeCoverageByQuadrant
                  ? { edgeByQuadrant: Object.fromEntries(Object.entries(generativeCoverage.edgeCoverageByQuadrant).map(([q, v]) => [q, round(v.score, 4)])) }
                  : {}),
                ...(generativeCoverage.costWeightedEdgeRecall
                  ? { costWeightedEdgeRecall: round(generativeCoverage.costWeightedEdgeRecall.costWeighted, 4), lethalEdgeRecall: round(generativeCoverage.costWeightedEdgeRecall.lethalRecall, 4) }
                  : {}),
              },
              buildCompleteness: {
                buildComplete: buildCompleteness.buildComplete,
                edgeCoverage: buildCompleteness.edgeCoverage.score,
                beadPresence: buildCompleteness.beadPresence.score,
                buildReadiness: buildCompleteness.buildReadiness.score,
              },
              catchRate: {
                recall: catchRate.recall,
                falsePositives: catchRate.falsePositives,
              },
            },
            cost: result.cost,
            ...(graderCost ? { graderCost } : {}),
          };

          // Honesty guard: every emitted scorecard MUST validate against the evolved schema
          // (additionalProperties:false stays satisfied). Validate the first one loudly; if it
          // ever fails the run aborts rather than silently writing an off-contract row.
          if (!validatedOnce) {
            const v = validate(scorecard, scorecardSchema, { refs: schemaRefs });
            if (!v.valid) {
              throw new Error(`scorecard failed schema validation:\n  - ${v.errors.join('\n  - ')}`);
            }
            validatedOnce = true;
            console.log(`Round-trip schema check: scorecard for ${variant}/${fixture.name} VALID against schemas/scorecard.schema.json`);
          }

          const scPath = path.join(modeRunsDir(mode), variantDir(variant), fixture.name, `r${r}`, 'scorecard.json');
          fs.writeFileSync(scPath, JSON.stringify(scorecard, null, 2) + '\n', 'utf8');

          fidelities.push(fidelity);
          edgeCoverages.push(scorecard.axes.buildCompleteness.edgeCoverage);
          beadPresences.push(scorecard.axes.buildCompleteness.beadPresence);
          buildReadinesses.push(scorecard.axes.buildCompleteness.buildReadiness);
          genOveralls.push(scorecard.axes.generativeCoverage.overall);
          granAtoms.push(granularity.atomsPerRequirement);
          if (generativeCoverage.edgeCoverageByPartition) {
            for (const [p, v] of Object.entries(generativeCoverage.edgeCoverageByPartition)) {
              (partitionSeries[p] ||= []).push(v.score);
            }
          }
          lastBuildComplete = buildCompleteness.buildComplete;
          anyScored = true;

          ledgerRows.push(ledgerRow(++seq, scorecard, K));
        }

        if (!anyScored) {
          summaryRows.push({
            variant,
            strategy: strategy.name,
            fixture: fixture.name,
            K: 0,
            skipped: true,
          });
          continue;
        }

        const agg = {
          variant,
          strategy: strategy.name,
          model: model ?? null,
          granularityLevel: gran ?? null,
          granularity: { atomsPerRequirement: { mean: round(mean(granAtoms), 4), stddev: round(sampleStddev(granAtoms), 4) } },
          fixture: fixture.name,
          fixtureHash: fixture.fixtureHash,
          K: fidelities.length,
          buildComplete: lastBuildComplete,
          fidelity: { mean: round(mean(fidelities), 3), stddev: round(sampleStddev(fidelities), 3) },
          // generativeCoverage is the PRIMARY fidelity signal on a THIN fixture (see note below).
          generativeCoverage: { mean: round(mean(genOveralls), 4), stddev: round(sampleStddev(genOveralls), 4) },
          edgeCoverage: { mean: round(mean(edgeCoverages), 4), stddev: round(sampleStddev(edgeCoverages), 4) },
          beadPresence: { mean: round(mean(beadPresences), 4), stddev: round(sampleStddev(beadPresences), 4) },
          buildReadiness: { mean: round(mean(buildReadinesses), 4), stddev: round(sampleStddev(buildReadinesses), 4) },
          // per-partition edge recall (library-covered vs SEAM), mean±stddev over K — partitioned fixtures only.
          ...(Object.keys(partitionSeries).length
            ? { edgeByPartition: Object.fromEntries(Object.entries(partitionSeries).map(([p, xs]) => [p, { mean: round(mean(xs), 4), stddev: round(sampleStddev(xs), 4) }])) }
            : {}),
        };
        aggregate[`${variant}::${fixture.name}`] = agg;
        summaryRows.push({
          variant,
          strategy: strategy.name,
          fixture: fixture.name,
          K: agg.K,
          buildComplete: agg.buildComplete,
          genCov: agg.generativeCoverage.mean,
          fidelityMean: agg.fidelity.mean,
          fidelityStddev: agg.fidelity.stddev,
          edge: agg.edgeCoverage.mean,
          present: agg.beadPresence.mean,
          ready: agg.buildReadiness.mean,
          atoms: agg.granularity.atomsPerRequirement.mean,
        });
      }
    }
    }
  }

  // persist aggregate
  const aggregateOut = {
    generatedAt: null, // deterministic: no clock in the report body
    mode,
    minRepeats,
    models: models.map((m) => m ?? null), // the swept model labels (null = strategy default)
    granularities: granularities.map((g) => g ?? null), // the swept dose levels (null = no knob)
    judgeModel: judgeModel ?? null,       // held fixed across the sweep
    fixtures: fixtures.map((f) => ({ name: f.name, fixtureHash: f.fixtureHash })),
    // TOTAL grader (judge) cost for the whole battery — apparatus cost, reported separately
    // from every method cost record (FINDINGS §7: the judge dominated L1 spend invisibly).
    graderTotal: judge.cost
      ? { ...judge.cost, usd: round(judge.cost.usd, 4), wallClockSec: round(judge.cost.wallClockSec, 2) }
      : null,
    results: aggregate,
    skipped,
  };
  fs.writeFileSync(path.join(modeRunsDir(mode), 'aggregate.json'), JSON.stringify(aggregateOut, null, 2) + '\n', 'utf8');

  // Ledger discipline (ledger.md header): MOCK runs are plumbing, not science — only LIVE
  // scored runs are ledgered. (An earlier version accumulated ~900 mock rows; purged.)
  if (mode === 'live') appendLedgerRows(ledgerRows);

  printSummary(summaryRows, skipped, mode);

  return { aggregate: aggregateOut, skipped, summaryRows, mode };
}

// --- console summary --------------------------------------------------------
function printSummary(rows, skipped, mode) {
  const header = ['variant', 'fixture', 'K', 'buildComplete', 'genCov*', 'fidelity(mean±sd)', 'edge', 'present', 'ready', 'G.atoms'];
  const lines = [header];
  for (const r of rows) {
    if (r.skipped) {
      lines.push([r.variant, r.fixture, '0', 'SKIPPED', '-', '-', '-', '-', '-', '-']);
      continue;
    }
    lines.push([
      r.variant,
      r.fixture,
      String(r.K),
      String(r.buildComplete),
      String(r.genCov),
      `${r.fidelityMean}±${r.fidelityStddev}`,
      String(r.edge),
      String(r.present),
      String(r.ready),
      String(r.atoms),
    ]);
  }
  // column widths
  const widths = header.map((_, i) => Math.max(...lines.map((l) => String(l[i]).length)));
  const fmt = (l) => l.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  console.log(`\nBattery summary  [mode=${mode}]`);
  console.log('===============');
  console.log(fmt(lines[0]));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (let i = 1; i < lines.length; i++) console.log(fmt(lines[i]));
  if (skipped.length) {
    console.log('\nSkipped:');
    for (const s of skipped) console.log(`  - ${s.variant || s.strategy} / ${s.fixture}: ${s.reason}`);
  }
  // KEYSTONE FOLD note (CHARTER §8 / phase intent): on THIN fixtures the keystone's presence+edge
  // sub-scores are now FOLDED from the judge's semantic coverage (not planKey matching), so
  // buildComplete MEANS THE SAME THING thin or thick. A high-coverage generative method now reads
  // buildComplete=TRUE on a thin plan (it was always false before the fold).
  console.log('');
  console.log('* genCov (generativeCoverage.overall) is the GENERATIVE-leap signal. On THIN fixtures the');
  console.log('  keystone (buildComplete + edge/present) is now JUDGE-folded — semantic, not planKey — so');
  console.log('  buildComplete is meaningful thin or thick. edge/present on thin reflect the judge coverage.');
  console.log('');
  if (mode === 'mock') {
    console.log('MOCK CAVEAT: the canned invoke ignores the real model, so sweeping model LABELS in mock only');
    console.log('  proves the SWEEP PLUMBING (variants tagged + grouped + split in the leaderboard). genCov will');
    console.log('  NOT differ by model label in mock — real model differences appear only in a LIVE run.');
    console.log('');
  }
}

// CLI entry (npm run battery)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('battery.mjs')) {
  runBattery().catch((e) => { console.error(e.message); process.exit(1); });
}
