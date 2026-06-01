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
import { claudeInvoke } from './model-client.mjs';
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
// Keyed by VARIANT (filesystem-safe) so swarm@mock-a and swarm@mock-b never collide.
function variantDir(variant) {
  return String(variant).replace(/[^a-zA-Z0-9._@-]/g, '_');
}
function freshWorkspace(variant, fixture, r) {
  const ws = path.join(RUNS_DIR, variantDir(variant), fixture, `r${r}`, 'ws');
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
  const judgeModel = resolveJudgeModel(opts); // HELD FIXED across the whole sweep
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
    invoke = claudeInvoke;
    // The judge model is HELD FIXED for the whole run (a separate control from the swept method model).
    judge = makeClaudeJudge(claudeInvoke, judgeModel ? { model: judgeModel } : {});
  }
  console.log(`Battery mode: ${mode.toUpperCase()}${mode === 'mock' ? ' (ZERO spend — deterministic mock invoke + stub judge)' : ' (real claude CLI — spends money)'}`);
  console.log(`Model sweep: ${models.map((m) => m ?? '(strategy default)').join(', ')}   |   judge model (fixed): ${judgeModel ?? '(judge default)'}`);

  // Load the scorecard schema once so we can round-trip-validate every emitted scorecard.
  const scorecardSchema = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'scorecard.schema.json'), 'utf8'));
  const costSchema = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'cost-record.schema.json'), 'utf8'));
  const schemaRefs = { [costSchema.$id]: costSchema };

  fs.mkdirSync(RUNS_DIR, { recursive: true });

  let validatedOnce = false; // round-trip-validate the first emitted scorecard, loudly
  const skipped = [];
  const aggregate = {}; // key `${variant}::${fixture}` -> { ... }
  const summaryRows = [];
  const ledgerRows = [];
  let seq = 0;

  for (const strategy of STRATEGIES) {
    if (strategyFilter && !strategyFilter.has(strategy.name)) continue;
    // PURE-CODE CONTROLS (deterministic) ignore the model knob and run exactly ONCE regardless of
    // the sweep — never multiplied per model. Generative methods run once per swept model label.
    const sweep = strategy.deterministic ? [null] : models;

    for (const model of sweep) {
      // variant = the swept identity. Generative: `${strategy}@${model}`; pure-code control: the
      // strategy name (it ignores the model). A bare run (model=null) -> just the strategy name.
      const variant = strategy.deterministic || model == null ? strategy.name : `${strategy.name}@${model}`;

      for (const fixture of fixtures) {
        const K = repeatsFor(strategy, minRepeats);
        const fidelities = [];
        const edgeCoverages = [];
        const beadPresences = [];
        const buildReadinesses = [];
        const genOveralls = [];
        let lastBuildComplete = null;
        let anyScored = false;

        for (let r = 0; r < K; r++) {
          const ws = freshWorkspace(variant, fixture.name, r);
          const fixtureArg = {
            name: fixture.name,
            lock: fixture.lock,
            planMd: fixture.planMd,
            dir: ws,
          };

          let result;
          try {
            // ctx carries the mode's invoke + the swept model; a strategy NEVER reaches for the
            // CLI itself. ctx.model is read by generative strategies (controls ignore it).
            result = await strategy.run(fixtureArg, { signal: undefined, invoke, model });
          } catch (e) {
            // One strategy must never crash the matrix. Record + continue.
            const note = { variant, strategy: strategy.name, fixture: fixture.name, skipped: true, reason: e.message };
            skipped.push(note);
            break; // skip remaining repeats for this (variant, fixture)
          }

          assertRunResult(strategy.name, result);
          assertSnapshotShape(strategy.name, result.snapshot);

          const fidelity = scoreFidelity(result.snapshot, fixture.manifest);
          const catchRate = scoreCatchRate(result.gaps || [], fixture.plantedGaps);
          // THIN-input axes computed FIRST: mechanical STATED-outcome coverage + bounded-judgment
          // LATENT requirement/edge coverage (the judge is the mode's injected judge — stub in mock).
          const outcomeCoverage = scoreOutcomeCoverage(result.snapshot, fixture.manifest);
          const generativeCoverage = await scoreGenerativeCoverage(result.snapshot, fixture.manifest, judge);

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

          const scPath = path.join(RUNS_DIR, variantDir(variant), fixture.name, `r${r}`, 'scorecard.json');
          fs.writeFileSync(scPath, JSON.stringify(scorecard, null, 2) + '\n', 'utf8');

          fidelities.push(fidelity);
          edgeCoverages.push(scorecard.axes.buildCompleteness.edgeCoverage);
          beadPresences.push(scorecard.axes.buildCompleteness.beadPresence);
          buildReadinesses.push(scorecard.axes.buildCompleteness.buildReadiness);
          genOveralls.push(scorecard.axes.generativeCoverage.overall);
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
        });
      }
    }
  }

  // persist aggregate
  const aggregateOut = {
    generatedAt: null, // deterministic: no clock in the report body
    mode,
    minRepeats,
    models: models.map((m) => m ?? null), // the swept model labels (null = strategy default)
    judgeModel: judgeModel ?? null,       // held fixed across the sweep
    fixtures: fixtures.map((f) => ({ name: f.name, fixtureHash: f.fixtureHash })),
    results: aggregate,
    skipped,
  };
  fs.writeFileSync(path.join(RUNS_DIR, 'aggregate.json'), JSON.stringify(aggregateOut, null, 2) + '\n', 'utf8');

  appendLedgerRows(ledgerRows);

  printSummary(summaryRows, skipped, mode);

  return { aggregate: aggregateOut, skipped, summaryRows, mode };
}

// --- console summary --------------------------------------------------------
function printSummary(rows, skipped, mode) {
  const header = ['variant', 'fixture', 'K', 'buildComplete', 'genCov*', 'fidelity(mean±sd)', 'edge', 'present', 'ready'];
  const lines = [header];
  for (const r of rows) {
    if (r.skipped) {
      lines.push([r.variant, r.fixture, '0', 'SKIPPED', '-', '-', '-', '-', '-']);
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
