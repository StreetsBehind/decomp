#!/usr/bin/env node
// BATCH-2 epoch #2b-POST — the POST SCORE-REPRODUCIBILITY KILL, demonstrated ONCE at a phase boundary over a
// survivor set (gleaning #2 / DECISION-BRIEF #2 / EVO-GLEANINGS-PLAN §"#2 (2b POST)").
//
// THE QUESTION. The P2c search produces a WIN-front of survivors (each already veto-passing). A noisy bench can
// commit a "lucky" survivor — one whose original worst-of-K lethal score was a high draw that does not
// reproduce on a fresh seed set. POST score-reproducibility re-runs each survivor on a FRESH logged seed set and
// KILLS any whose re-eval lethal pass-fraction drops BELOW (original − 2×SE) on a lethal bucket (the frozen
// credit restore-margin band; the kill is one-sided/downward — the lucky-over-estimate guard). This runs ONCE at
// the phase boundary, every re-eval CHARGED to K5, bounded by survivors × K × CORE-epics.
//
// TWO DEMOS, both at the integration (full-machinery) level over a real survivor set:
//   DEMO A (no-false-positive on a STABLE bench): survivors re-evaluated on the DETERMINISTIC scale landscape
//       (src/scale-landscape.mjs — reEvaluate is deterministic ⇒ re-eval == original) → 0 killed, budgetOk,
//       evals charged. Proves the kill does NOT false-fire on a stable bench.
//   DEMO B (kill fires on a NOISY bench): the SAME survivor set, but one planted survivor's ORIGINAL lethal
//       score was a LUCKY high draw; its fresh-seed re-eval (a noise-injected reEvaluate) drops below the 2×SE
//       band → KILLED; the stable survivors kept; evals charged to K5, within budget.
//
// FREEZE POSTURE. eval_epoch stays 0 (no fitness defect — the metric is unchanged; we re-measure whether a
// surviving worst-of-K score reproduces). This is a survivor-CHANGING kill → it belongs to THIS clean-restart
// epoch; it is the ONLY trajectory-perturbing change (no #4-bump / #6-ideator co-batched, per the cross-cutting
// one-perturbation-per-epoch rule). It CONSUMES the frozen RESTORE_MARGIN_SE band + respects the frozen
// K5_EVAL_CAP; it is NEVER wired into the per-generation loop → the frozen P0/K8 path is BIT-IDENTICAL.
//
// Run: node studies/meta-search/score-repro-kill.mjs

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { runScoreReproKill } from './src/score-repro.mjs';
import { buildScorecard } from './src/scorecard.mjs';
import { makeScaleEconomicsEvaluator, makeBareOpusBaseline } from './src/scale-landscape.mjs';
import { defaultGenome, cloneGenome, genomeHash, genomeLabel } from './src/genome.mjs';
import { stampEpoch, EVAL_EPOCH } from './src/eval-epoch.mjs';
import { K5_EVAL_CAP, LETHAL_BUCKETS, P1_ANCHOR_EPICS } from './src/config.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));

// ----------------------------------------------------------------------------------------------------------
// The survivor set — three veto-passing candidates on the N=13 scale-economics landscape (the P2b crossover
// regime where the cheap+gate hybrid holds). All score genuinely (no proxy hacks): we EVALUATE each genome
// through the deterministic scale-economics evaluator and BUILD its worst-of-K scorecard, exactly as the search
// does. These ARE the "original" scores under test.
// ----------------------------------------------------------------------------------------------------------
function winnerGenome() {
  const g = cloneGenome(defaultGenome());
  g.skeletonAuthor = { model: 'fusion', shapesIncluded: true, obligationDepth: 1 };
  g.integrationGate = { kind: 'deterministic', repairDepth: 2 };
  return g;
}
function checkerVariant() {
  const g = winnerGenome();
  g.checker = { kind: 'deterministic', obligationClasses: ['tenancy', 'authz'], repairDepth: 1 };
  return g;
}
function depthVariant() {
  const g = winnerGenome();
  g.skeletonAuthor = { model: 'fusion', shapesIncluded: true, obligationDepth: 2 };
  return g;
}

const N = 13;

async function buildSurvivors() {
  const evaluate = await makeScaleEconomicsEvaluator({ N, epicK: 1 });
  const genomes = [winnerGenome(), checkerVariant(), depthVariant()];
  return genomes.map((g) => {
    const raw = evaluate(g);
    const sc = buildScorecard({ genome: g, genomeHash: genomeHash(g), epics: raw.epics, ledger: raw.ledger });
    return { genome: g, scorecard: sc, hash: sc.genomeHash, label: genomeLabel(g) };
  });
}

// the lethal pass-counts of a scorecard's first epic (for printing).
function lethalLine(sc) {
  const ep = sc.perEpic[Object.keys(sc.perEpic)[0]];
  return LETHAL_BUCKETS.map((b) => `${b} ${ep.buckets[b].pass}/${ep.buckets[b].total}`).join(', ');
}

// ----------------------------------------------------------------------------------------------------------
// DEMO A — the DETERMINISTIC re-eval: re-evaluate each survivor through the SAME deterministic scale-economics
// evaluator ⇒ re-eval == original ⇒ 0 killed. This is the no-false-positive control at the integration level.
// ----------------------------------------------------------------------------------------------------------
async function demoA(survivors, log) {
  const evaluate = await makeScaleEconomicsEvaluator({ N, epicK: 1 });
  const reEvaluate = (genome /*, seed */) => {
    const raw = evaluate(genome);
    return buildScorecard({ genome, genomeHash: genomeHash(genome), epics: raw.epics, ledger: raw.ledger });
  };
  const budget = { spent: 0, cap: K5_EVAL_CAP };
  const r = await runScoreReproKill({
    survivors, reEvaluate, K: 1, coreEpics: P1_ANCHOR_EPICS.length, budget,
  });
  log(`\nDEMO A — DETERMINISTIC re-eval on the scale-economics bench (re-eval == original ⇒ no false fire):`);
  log(`  survivors=${survivors.length}; bound = survivors×K×CORE = ${r.bound} evals; cap K5=${budget.cap}`);
  log(`  kept=${r.kept.length}  killed=${r.killed.length}  evalsUsed=${r.evalsUsed} (charged to K5; spent=${budget.spent}/${budget.cap})  budgetOk=${r.budgetOk}`);
  for (const v of r.verdicts) log(`    ${v.hash}: ${v.kill ? 'KILL' : 'keep'} — ${v.perBucket.map((p) => `${p.bucket} ${(p.reEvalFrac * 100).toFixed(0)}%≥(${(p.originalFrac * 100).toFixed(0)}%−${(p.margin * 100).toFixed(0)}pp)`).join('; ')}`);
  return { ...r, budget };
}

// ----------------------------------------------------------------------------------------------------------
// DEMO B — the NOISE-INJECTED re-eval: ONE planted survivor's ORIGINAL lethal score was a LUCKY high draw. We
// model this by re-evaluating that survivor on a fresh seed through a noise-injected evaluator whose lethal
// pass-fraction drops below the 2×SE band; the others reproduce. The lucky survivor is KILLED, the stable ones
// kept, evals charged to K5.
//
// "lucky over-estimate" is modeled honestly: the planted survivor's ORIGINAL scorecard already records a high
// integration count; the fresh-seed re-eval (a different seed → a different draw on a NOISY bench) realizes a
// LOW integration count (the lucky draw did not reproduce). We collapse the integration bucket to 1/total on the
// re-eval, which is a downward breach beyond 2×SE — exactly the lucky-winner the worst-of-K family guards against.
// ----------------------------------------------------------------------------------------------------------
async function demoB(survivors, log) {
  const evaluate = await makeScaleEconomicsEvaluator({ N, epicK: 1 });
  // pick the FIRST survivor as the planted lucky over-estimate (its original integration is high).
  const luckyHash = survivors[0].hash;
  const cellNamesOf = (genome) => evaluate(genome).epics[0].cellNames;
  const reEvaluate = (genome, seed) => {
    const raw = evaluate(genome);
    const h = genomeHash(genome);
    if (h === luckyHash) {
      // NOISE: on this fresh seed the lethal integration draw collapses (the lucky high draw did not reproduce).
      const epic = raw.epics[0];
      const cn = cellNamesOf(genome);
      const collapsedRun = {
        ...epic.runs[0],
        integration: { pass: 1, total: cn.integration.length, fails: cn.integration.slice(1).map((n) => ({ name: n, why: 'noisy-non-reproduction' })) },
      };
      return buildScorecard({ genome, genomeHash: h, epics: [{ name: epic.name, cellNames: cn, runs: [collapsedRun] }], ledger: raw.ledger });
    }
    // the stable survivors reproduce exactly (deterministic).
    return buildScorecard({ genome, genomeHash: h, epics: raw.epics, ledger: raw.ledger });
  };
  const budget = { spent: 0, cap: K5_EVAL_CAP };
  const r = await runScoreReproKill({
    survivors, reEvaluate, K: 1, coreEpics: P1_ANCHOR_EPICS.length, budget,
  });
  log(`\nDEMO B — NOISE-INJECTED re-eval (survivor ${luckyHash}'s lucky integration draw does NOT reproduce):`);
  log(`  survivors=${survivors.length}; bound = survivors×K×CORE = ${r.bound} evals; cap K5=${budget.cap}`);
  log(`  kept=${r.kept.length}  killed=${r.killed.length}  evalsUsed=${r.evalsUsed} (charged to K5; spent=${budget.spent}/${budget.cap})  budgetOk=${r.budgetOk}`);
  for (const v of r.verdicts) {
    const dn = v.worstDownBreach;
    log(`    ${v.hash}: ${v.kill ? 'KILL' : 'keep'}${dn ? ` — ${dn.bucket}: re-eval ${(dn.reEvalFrac * 100).toFixed(0)}% < (orig ${(dn.originalFrac * 100).toFixed(0)}% − ${(dn.margin * 100).toFixed(0)}pp), breach ${(dn.breachDepth * 100).toFixed(0)}pp` : ` — ${v.perBucket.map((p) => `${p.bucket} ${(p.reEvalFrac * 100).toFixed(0)}%`).join('; ')}`}`);
  }
  return { ...r, budget, luckyHash };
}

async function main() {
  const started = new Date().toISOString();
  const lines = []; const log = (s) => { console.log(s); lines.push(s); };

  log(`=== Batch-2 epoch #2b-POST — SCORE-REPRODUCIBILITY KILL at a phase boundary ===\n(${started})`);
  log(`eval_epoch=${EVAL_EPOCH} (no fitness defect — re-measuring whether a surviving worst-of-K score reproduces).`);
  log(`band = the FROZEN credit restore-margin (RESTORE_MARGIN_SE=2 × bucketSE, [0.15,0.85] clamp), imported from src/credit.mjs.`);
  log(`kill = one-sided DOWNWARD: re-eval lethal frac < original − margin on ANY lethal bucket (the lucky-over-estimate guard).`);
  log(`charged to K5 (cap=${K5_EVAL_CAP}); bound = survivors × K × CORE-epics; over-budget → STOP+report, never silently truncate.\n`);

  const survivors = await buildSurvivors();
  log(`survivor set (N=${N} scale-economics, each veto-passing — these ARE the original scores under test):`);
  for (const s of survivors) log(`  ${s.hash}  [${s.label}]  ${lethalLine(s.scorecard)}`);

  const a = await demoA(survivors, log);
  const b = await demoB(survivors, log);

  // verdict line.
  const aOk = a.killed.length === 0 && a.budgetOk;
  const bOk = b.killed.length === 1 && b.killed[0].hash === b.luckyHash && b.budgetOk;
  log(`\n================================================================`);
  log(`DEMO A (deterministic, no-false-positive): ${aOk ? 'PASS' : 'FAIL'} — 0 killed, budgetOk, ${a.evalsUsed} evals charged to K5.`);
  log(`DEMO B (noisy, kill fires): ${bOk ? 'PASS' : 'FAIL'} — 1 killed (${b.luckyHash}, the lucky over-estimate), ${b.kept.length} kept, ${b.evalsUsed} evals charged to K5, within budget.`);
  log(`================================================================`);

  // persist — label every record + the summary with (eval_epoch, phase).
  const summary = stampEpoch({
    phase: 'batch2-epoch2bPOST-score-repro-kill',
    eval_epoch_note: 'eval_epoch stays 0 — no fitness defect; we re-measure reproducibility of a surviving worst-of-K score',
    started, finishedAt: new Date().toISOString(),
    N, K: 1, coreEpics: P1_ANCHOR_EPICS.length, K5_cap: K5_EVAL_CAP,
    survivors: survivors.map((s) => ({ hash: s.hash, label: s.label })),
    demoA: { kept: a.kept.map((s) => s.hash), killed: a.killed.map((s) => s.hash), evalsUsed: a.evalsUsed, budgetOk: a.budgetOk, bound: a.bound, freshSeeds: a.freshSeeds, verdicts: a.verdicts },
    demoB: { luckyHash: b.luckyHash, kept: b.kept.map((s) => s.hash), killed: b.killed.map((s) => s.hash), evalsUsed: b.evalsUsed, budgetOk: b.budgetOk, bound: b.bound, freshSeeds: b.freshSeeds, verdicts: b.verdicts },
    verdict: { demoA: aOk ? 'PASS' : 'FAIL', demoB: bOk ? 'PASS' : 'FAIL' },
  }, EVAL_EPOCH);

  const outDir = path.join(HERE, 'runs'); fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'score-repro-kill.json'), JSON.stringify(summary, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'score-repro-kill.log'), lines.join('\n') + '\n');
  log(`\nwrote studies/meta-search/runs/score-repro-kill.json`);

  if (!aOk || !bOk) process.exit(1);
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => { console.error('score-repro-kill error:', e); process.exit(1); });
}

export { buildSurvivors, demoA, demoB };
