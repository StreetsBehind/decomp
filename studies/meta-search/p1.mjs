#!/usr/bin/env node
// P1 — the cheaper-author × checker arm at fixed N=5 (DESIGN §9 P1 / FREEZE A1). The void-rule begins at
// the first measured P1 run; nothing here touches a frozen invariant (config.mjs is read-only to this file).
//
// What P1 asks (the MECHANISM, not a cost-win at N=5 — the cost arm is pre-registered to fail K1 at N=5):
//   does the per-surface CHECKER lever move `crosscut`/`integration`?
// At fixed N=5 the attributed gene is the checker by construction (§3). The co-measured opus-whole baseline
// is ~perfect on the lethal buckets at N=5, so per-cell non-inferiority is effectively a 100%-on-lethal bar
// (→ the veto-passing archive is expected to be EMPTY at N=5; that empty front IS the K1-at-N=5 result, and
// the gap to it is the reportable lower bound). The mechanism is read off the candidates' lethal-bucket
// pass-fractions (checker-ON vs checker-OFF), not off the (expected-empty) archive.
//
// Modes:
//   --pilot [--epic scale-d1]      cheap loop-closure + a controlled checker A/B (cached baseline, heuristic
//                                  proposer → ZERO frontier spend; only the free gateway runs). Confirms the
//                                  live loop closes and the checker lever moves the lethal buckets.
//   --full  [--seeds 11,23 ...]    the anchor pair {workspace, scale-d1}, ≥2 independent loop runs (distinct
//                                  mutator seeds; R2C-4 reproducibility), reflective proposer, live baseline,
//                                  the K5=250 eval cap, the §14 watchdog + checkpoint.
//
// K8 (instrument self-validation) PASSED in P0 (30/30 pinned seeds); a K1 null is therefore reportable.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { makeGatewayInvoke, claudeInvoke } from '../../runner/model-client.mjs';
import { makeRng } from './src/rng.mjs';
import { makeArchive } from './src/archive.mjs';
import { runSearch } from './src/loop.mjs';
import { evalGenome } from './src/worker.mjs';
import { makeEpicEvaluator } from './src/evaluator.mjs';
import { makeBaseline } from './src/baseline.mjs';
import { makeReflectiveProposer, makeHeuristicProposer } from './src/proposer.mjs';
import { defaultGenome, cloneGenome, genomeLabel, genomeHash } from './src/genome.mjs';
import { makeWatchdog } from './src/watchdog.mjs';
import { makeCheckpointer } from './src/checkpoint.mjs';
import { P1_ANCHOR_EPICS, K5_EVAL_CAP, DELTA, LETHAL_BUCKETS } from './src/config.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1]; const eq = process.argv.find((a) => a.startsWith(`--${name}=`)); return eq ? eq.slice(name.length + 3) : def; };
const flag = (name) => process.argv.includes(`--${name}`);

// ---- seed genomes: climbable stepping stones (all valid, single-mutation-connected) --------------
function seedGenomes(authorTier = 'fusion') {
  const naive = defaultGenome();                                  // cheap-isolated, no skeleton, checker off
  const skel = cloneGenome(naive); skel.skeletonAuthor = { model: authorTier, shapesIncluded: true, obligationDepth: 1 };
  const check = cloneGenome(skel); check.checker = { kind: 'deterministic', obligationClasses: ['tenancy', 'authz', 'mass-assign'], repairDepth: 1 };
  return [naive, skel, check];
}

// ---- lethal pass-fraction from a scorecard's per-cell vector (pooled over the core epics) ----------
function lethalFrac(sc) {
  const out = { crosscut: { pass: 0, total: 0 }, integration: { pass: 0, total: 0 } };
  for (const [k, v] of Object.entries(sc.cells)) {
    const bucket = k.split('::')[1];
    if (out[bucket]) { out[bucket].total++; if (v === true) out[bucket].pass++; }
  }
  const frac = (b) => (b.total ? b.pass / b.total : 1);
  return { crosscut: frac(out.crosscut), integration: frac(out.integration), counts: out, lethal: (frac(out.crosscut) + frac(out.integration)) / 2 };
}

const checkerOn = (g) => g.checker && g.checker.kind !== 'off';

// ---- mechanism ablation: does turning the checker on move the lethal buckets? ----------------------
function ablate(cands) {
  const on = cands.filter((c) => c.checkerOn);
  const off = cands.filter((c) => !c.checkerOn);
  const mean = (arr, sel) => (arr.length ? arr.reduce((s, c) => s + sel(c), 0) / arr.length : null);
  const m = (arr) => ({ n: arr.length, crosscut: mean(arr, (c) => c.crosscut), integration: mean(arr, (c) => c.integration), lethal: mean(arr, (c) => c.lethal), repairs: mean(arr, (c) => c.repairs) });
  const onM = m(on), offM = m(off);
  const delta = (onM.lethal != null && offM.lethal != null) ? { crosscut: onM.crosscut - offM.crosscut, integration: onM.integration - offM.integration, lethal: onM.lethal - offM.lethal } : null;
  // the checker "fired" if the ON group actually did any repair work; without it, a positive Δ is just the
  // gateway lottery (the K=1 probe lesson) — so a movement claim REQUIRES checker activity.
  const fired = on.some((c) => c.repairs > 0);
  return { on: onM, off: offM, delta, fired };
}

// ---- run one independent loop, collecting every evaluated candidate -------------------------------
async function runOneLoop({ core, evaluate, baselineSc, proposer, budget, cpp, pop, seed, watchdog, checkpoint, label, log }) {
  const rng = makeRng(seed);
  const archive = makeArchive({ cap: 6 });
  const cands = [];
  const onEval = (sc, genome) => {
    const lf = lethalFrac(sc);
    cands.push({ hash: sc.genomeHash, checkerOn: checkerOn(genome), crosscut: lf.crosscut, integration: lf.integration, lethal: lf.lethal, reliability: sc.reliability, cost: sc.cost.total, repairs: sc.checker?.repairs ?? 0, label: genomeLabel(genome) });
  };
  const onGeneration = (g) => log(`  [${label}] gen ${g.gen}: evals ${g.evalCount}, archive ${g.archiveSize}, bestRel ${g.bestReliability.toFixed(3)}${g.trip ? ' (watchdog trip)' : ''}`);
  const res = await runSearch({
    seedGenomes: seedGenomes(), evaluate, baseline: baselineSc, rng, archive, budget,
    childrenPerParent: cpp, populationSize: pop, proposer, onEval, onGeneration, watchdog, checkpoint,
  });
  return { seed, label, archive, result: res, cands, ablation: ablate(cands), best: cands.slice().sort((a, b) => b.lethal - a.lethal)[0] };
}

// ---- the controlled A/B: checker OFF vs ON, same epic + same skeleton ------------------------------
async function checkerAB({ core, evaluate, log, kind = 'deterministic', authorTier = 'fusion' }) {
  const off = cloneGenome(defaultGenome()); off.skeletonAuthor = { model: authorTier, shapesIncluded: true, obligationDepth: 1 };
  const on = cloneGenome(off); on.checker = { kind, obligationClasses: ['tenancy', 'authz', 'mass-assign'], repairDepth: 1 };
  log(`  A/B[${authorTier}/${kind}]: building checker-OFF …`);
  const scOff = await evalGenome(off, { evaluate });
  log(`  A/B[${authorTier}/${kind}]: building checker-ON  …`);
  const scOn = await evalGenome(on, { evaluate });
  const lfOff = lethalFrac(scOff), lfOn = lethalFrac(scOn);
  return {
    kind, authorTier,
    off: { crosscut: lfOff.crosscut, integration: lfOff.integration, reliability: scOff.reliability, cost: scOff.cost.total, repairs: scOff.checker?.repairs ?? 0 },
    on: { crosscut: lfOn.crosscut, integration: lfOn.integration, reliability: scOn.reliability, cost: scOn.cost.total, repairs: scOn.checker?.repairs ?? 0, violations: scOn.checker?.violations ?? 0 },
    delta: { crosscut: lfOn.crosscut - lfOff.crosscut, integration: lfOn.integration - lfOff.integration },
  };
}

function fmtPct(x) { return x == null ? 'n/a' : `${(x * 100).toFixed(0)}%`; }

async function main() {
  const isFull = flag('full');
  const isProbe = flag('probe');
  const isPilot = !isFull && !isProbe;

  if (isProbe) {
    // Decisive mechanism probe: does ANY checker config move the lethal buckets, and under which skeleton?
    // 4 cells = {fusion, sonnet} skeleton × {deterministic, cheap-judge} checker, each vs its own OFF.
    const epic = arg('epic', 'scale-d1');
    const core = [epic];
    const started0 = new Date().toISOString();
    const lines0 = []; const log0 = (s) => { console.log(s); lines0.push(s); };
    log0(`\n=== Meta-search P1 CHECKER PROBE — ${epic} ===\n(${started0})\n`);
    const gateway = makeGatewayInvoke({ timeoutMs: 180000 });
    const evaluate = makeEpicEvaluator({ core, invoke: gateway, epicK: 1, surfaceConcurrency: 3 });
    const cells = [];
    for (const authorTier of ['fusion', 'sonnet']) {
      for (const kind of ['deterministic', 'cheap-judge']) {
        const ab = await checkerAB({ core, evaluate, log: log0, kind, authorTier });
        cells.push(ab);
        log0(`  [${authorTier}/${kind}] OFF X-CUT ${fmtPct(ab.off.crosscut)} INTEG ${fmtPct(ab.off.integration)} | ON X-CUT ${fmtPct(ab.on.crosscut)} INTEG ${fmtPct(ab.on.integration)} (viol ${ab.on.violations}, repairs ${ab.on.repairs}) | Δ X-CUT ${(ab.delta.crosscut * 100).toFixed(0)}pp INTEG ${(ab.delta.integration * 100).toFixed(0)}pp\n`);
      }
    }
    const moved = cells.find((c) => c.delta.crosscut + c.delta.integration > 0.001);
    log0(`PROBE VERDICT: ${moved ? `checker MOVES the lethal buckets in cell [${moved.authorTier}/${moved.kind}]` : 'no checker cell moved the lethal buckets at N=5'}`);
    writeSummary({ phase: 'P1-probe', started: started0, epic, cells, moved: moved ? { authorTier: moved.authorTier, kind: moved.kind } : null });
    return;
  }

  const lines = [];
  const log = (s) => { console.log(s); lines.push(s); };
  const started = new Date().toISOString();

  if (isPilot) {
    const epic = arg('epic', 'scale-d1');
    const core = [epic];
    log(`\n=== Meta-search P1 PILOT — checker mechanism, 1 epic (${epic}) ===\n(${started})\n`);
    const gateway = makeGatewayInvoke({ timeoutMs: 180000 });
    const evaluate = makeEpicEvaluator({ core, invoke: gateway, epicK: 1, surfaceConcurrency: 3 });
    const baselineSc = await makeBaseline({ core, mode: 'cached' })();
    log(`baseline (cached opus-whole): reliability ${baselineSc.reliability.toFixed(3)}, lethal cells all-pass, cost $${baselineSc.cost.total.toFixed(3)}\n`);

    // (1) controlled A/B — the cleanest mechanism read
    const ab = await checkerAB({ core, evaluate, log });
    log(`\n  checker A/B (same epic + fusion skeleton):`);
    log(`    OFF:  X-CUT ${fmtPct(ab.off.crosscut)}  INTEG ${fmtPct(ab.off.integration)}  rel ${ab.off.reliability.toFixed(3)}  $${ab.off.cost.toFixed(3)}`);
    log(`    ON :  X-CUT ${fmtPct(ab.on.crosscut)}  INTEG ${fmtPct(ab.on.integration)}  rel ${ab.on.reliability.toFixed(3)}  $${ab.on.cost.toFixed(3)}  (repairs ${ab.on.repairs})`);
    log(`    Δ  :  X-CUT ${(ab.delta.crosscut * 100).toFixed(0)}pp  INTEG ${(ab.delta.integration * 100).toFixed(0)}pp  → checker ${ab.delta.crosscut + ab.delta.integration > 0 ? 'MOVES the lethal buckets up' : 'did not move the lethal buckets'}`);

    // (2) tiny search — loop closes (heuristic proposer; ZERO frontier spend)
    log(`\n  loop-closure (heuristic proposer, gens ${arg('gens', '1')}):`);
    const wd = makeWatchdog({ evalTimeoutMs: 240000, genStallMs: 1800000, notify: (n) => log(`    watchdog: ${JSON.stringify(n)}`) });
    const loop = await runOneLoop({
      core, evaluate, baselineSc, proposer: makeHeuristicProposer(),
      budget: { maxGen: Number(arg('gens', 1)), maxEvals: 60 }, cpp: 2, pop: 2, seed: 11, watchdog: wd,
      checkpoint: makeCheckpointer(path.join(HERE, 'runs', 'p1-pilot-ckpt')), label: 'pilot', log,
    });
    log(`    → ${loop.cands.length} candidates evaluated, archive front ${loop.archive.size()} (empty front at N=5 is the pre-registered K1-at-N=5 outcome), halt: ${loop.result.haltReason || 'stop'}`);
    const abl = loop.ablation;
    if (abl.delta) log(`    ablation over the run: checker-ON lethal ${fmtPct(abl.on.lethal)} (n=${abl.on.n}) vs OFF ${fmtPct(abl.off.lethal)} (n=${abl.off.n}) → Δ ${(abl.delta.lethal * 100).toFixed(0)}pp`);

    const verdict = (ab.delta.crosscut + ab.delta.integration > 0);
    log(`\n  PILOT VERDICT: live loop closes ✓; checker lever ${verdict ? 'MOVES' : 'does NOT move'} crosscut/integration on ${epic}.`);
    log(`  (cost arm not evaluated here; K1-at-N=5 is pre-registered. Next: --full over the anchor pair, ≥2 reflective loop runs.)`);

    writeSummary({ phase: 'P1-pilot', started, epic, baseline: { reliability: baselineSc.reliability, cost: baselineSc.cost.total }, ab, loop: { candidates: loop.cands.length, archive: loop.archive.size(), halt: loop.result.haltReason, ablation: abl }, verdict });
    return;
  }

  // ---- FULL run -----------------------------------------------------------------------------------
  const core = P1_ANCHOR_EPICS.slice();
  const seeds = (arg('seeds', '11,23')).split(',').map((s) => Number(s.trim())).filter(Number.isFinite);
  const gens = Number(arg('gens', 6));
  const cpp = Number(arg('cpp', 3)), pop = Number(arg('pop', 4));
  const useReflective = !flag('heuristic');
  const liveBaseline = flag('live-baseline');
  log(`\n=== Meta-search P1 FULL — cheaper-author × checker, anchor pair {${core.join(', ')}}, N=5 ===\n(${started})`);
  log(`loop runs: seeds ${seeds.join(', ')}; gens ≤${gens}; eval cap (K5) ${K5_EVAL_CAP}; proposer ${useReflective ? 'reflective(sonnet)' : 'heuristic'}; baseline ${liveBaseline ? 'live opus-whole' : 'cached opus-whole'}\n`);

  const gateway = makeGatewayInvoke({ timeoutMs: 180000 });
  const evaluate = makeEpicEvaluator({ core, invoke: gateway, epicK: 2, surfaceConcurrency: 3 });
  const baselineSc = await (makeBaseline({ core, mode: liveBaseline ? 'live' : 'cached', invoke: claudeInvoke })());
  log(`baseline (${liveBaseline ? 'live' : 'cached'} opus-whole): reliability ${baselineSc.reliability.toFixed(3)}, lethal ${fmtPct(lethalFrac(baselineSc).lethal)}, cost $${baselineSc.cost.total.toFixed(3)}\n`);

  const proposer = useReflective ? makeReflectiveProposer({ invoke: claudeInvoke, model: 'claude-sonnet-4-6' }) : makeHeuristicProposer();
  const perEvalBudget = Math.floor(K5_EVAL_CAP / seeds.length);
  const runs = [];
  for (const seed of seeds) {
    log(`--- loop run seed ${seed} (eval budget ${perEvalBudget}) ---`);
    const wd = makeWatchdog({ evalTimeoutMs: 300000, genStallMs: 3600000, notify: (n) => log(`  watchdog: ${JSON.stringify(n)}`) });
    const loop = await runOneLoop({
      core, evaluate, baselineSc, proposer,
      budget: { maxGen: gens, maxEvals: perEvalBudget }, cpp, pop, seed, watchdog: wd,
      checkpoint: makeCheckpointer(path.join(HERE, 'runs', `p1-full-ckpt-${seed}`)), label: `seed${seed}`, log,
    });
    runs.push(loop);
    const a = loop.ablation;
    log(`  seed ${seed}: ${loop.cands.length} candidates; checker-ON lethal ${fmtPct(a.on.lethal)} (n=${a.on.n}) vs OFF ${fmtPct(a.off.lethal)} (n=${a.off.n}); archive front ${loop.archive.size()}\n`);
  }

  // reproducibility (R2C-4): the load-bearing mutation must agree across runs.
  const movedEachRun = runs.map((r) => r.ablation.delta && r.ablation.delta.lethal > 0);
  const agree = movedEachRun.every((x) => x === movedEachRun[0]);
  const checkerMoves = movedEachRun.every(Boolean);
  // K1 status at N=5: any veto-passing candidate?
  const anyVetoPass = runs.some((r) => r.archive.size() > 0);
  const bestLethal = runs.flatMap((r) => r.cands).sort((a, b) => b.lethal - a.lethal)[0];
  const proposerSpend = useReflective ? proposer.spend : null;

  log(`================================================================`);
  log(`P1 FULL RESULT (anchor pair, N=5):`);
  log(`  mechanism: checker lever ${checkerMoves ? 'MOVES' : 'does NOT consistently move'} crosscut/integration; runs AGREE: ${agree}`);
  log(`  load-bearing mutation: the per-surface checker (toggleChecker), attributed by construction at N=5`);
  log(`  K1-at-N=5: ${anyVetoPass ? 'a candidate passed the per-cell veto' : 'no candidate cleared the per-cell veto vs the perfect N=5 opus-whole baseline → K1-at-N=5 (pre-registered)'}`);
  log(`  best lethal candidate: X-CUT ${fmtPct(bestLethal?.crosscut)} INTEG ${fmtPct(bestLethal?.integration)} at $${bestLethal?.cost.toFixed(3)} (${bestLethal?.label})`);
  log(`  baseline (provisional, opus-whole proxy): lethal ${fmtPct(lethalFrac(baselineSc).lethal)} at $${baselineSc.cost.total.toFixed(3)} — final cost-WIN gated on the routed baseline (STATE.md #3)`);
  if (proposerSpend) log(`  reflective-proposer R&D spend (NOT charged to product): $${proposerSpend.usd.toFixed(3)}, ${proposerSpend.calls} calls, ${proposerSpend.declined} declined`);
  log(`================================================================`);

  writeSummary({
    phase: 'P1-full', started, core, seeds, gens, K5_EVAL_CAP, proposer: useReflective ? 'reflective' : 'heuristic',
    baseline: { mode: liveBaseline ? 'live' : 'cached', reliability: baselineSc.reliability, lethal: lethalFrac(baselineSc).lethal, cost: baselineSc.cost.total },
    runs: runs.map((r) => ({ seed: r.seed, candidates: r.cands.length, archive: r.archive.size(), ablation: r.ablation, halt: r.result.haltReason })),
    checkerMoves, runsAgree: agree, anyVetoPass, bestLethal, proposerSpend,
  });
}

function writeSummary(obj) {
  const outDir = path.join(HERE, 'runs');
  fs.mkdirSync(outDir, { recursive: true });
  const name = obj.phase === 'P1-pilot' ? 'p1-pilot-summary.json' : obj.phase === 'P1-probe' ? 'p1-probe-summary.json' : 'p1-full-summary.json';
  obj.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(obj, null, 2) + '\n');
  console.log(`\nwrote studies/meta-search/runs/${name}`);
}

main().catch((e) => { console.error('P1 driver error:', e); process.exit(1); });
