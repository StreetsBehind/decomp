// Evaluators — the candidate-eval backends. Both return the SAME raw shape:
//   { epics: [{ name, cellNames:{wire,happy,crosscut,integration}, runs: [evaluateEpicResult,...K] }],
//     ledger, routeDist }
// so worker.mjs builds the scorecard through the ONE §6 metric path (scorecard.mjs) for both backends —
// the live path and the deterministic path are graded by identical code (this is what G1 proves).
//
// Two backends:
//   - makeSyntheticEvaluator: a PURE, deterministic, planted fitness landscape. No models, no gateway.
//     Used by the K8 instrument-self-validation gate and the §14 autonomy round-trip (both must be
//     reproducible). It is a CALIBRATION FIXTURE that by construction CONTAINS a dominating genome — it
//     deliberately decouples the seam from model tier (cheap shapes+depth restore integration) so a
//     winner EXISTS to be rediscovered. It does NOT model the real MCOH25 economics (where only opus
//     restores the seam) — that is the live arm's job, not the instrument self-test's.
//   - makeEpicEvaluator: the LIVE path — builds each surface on the cheap gateway, assembles, and grades
//     with the frozen apparatus (evaluateEpic). Used by the non-blocking live smoke.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { makeLedger } from './ledger.mjs';
import { buildScorecard } from './scorecard.mjs';
import { resolveSkeleton, chargeSkeletonAuthor } from './skeleton-author.mjs';
import { runChecker } from './checker.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', '..', 'build-gap');

// ============================== SYNTHETIC (planted-positive) =======================================

// One synthetic epic's cell-name lists (a single seam-topology, mirroring the anchor pair's N=5 shape).
const SYNTH_CELLS = {
  wire: ['s_create', 's_list', 's_add', 's_post', 's_profile'],
  happy: ['h_create', 'h_list', 'h_add'],
  crosscut: ['c_tenancy_create', 'c_tenancy_list', 'c_tenancy_add', 'c_authz_add', 'c_authz_post'],
  integration: ['i_seam_plus', 'i_seam_minus', 'i_iso'],
};

// pass counts as a deterministic function of the genome's load-bearing genes.
function synthPassCounts(g) {
  const ck = g.checker || {};
  const sk = g.skeletonAuthor || {};
  // A clean TWO-GENE assembly, mirroring the M-coh-2 double dissociation (the checker carries the
  // crosscut obligations; the shaped skeleton carries the integration seam). This is the planted
  // calibration landscape — a winner exists by construction (DESIGN K8); it is NOT the real economics.
  //   crosscut: the checker lever. off => 1 accidental guard (c1); on => 1 + classes + (repair?1:0), cap 5.
  //   integration: the skeleton-shape lever. no shapes => 0 (seam broken); shapes => 3 (seam holds).
  // obligationDepth is a refinement gene (does not gate the optimum) so the optimum is a 2-gene assembly.
  let crosscut = ck.kind === 'off' ? 1 : Math.min(5, 1 + (ck.obligationClasses || []).length + (ck.repairDepth > 0 ? 1 : 0));
  let integration = sk.shapesIncluded ? 3 : 0;
  return { wire: 5, happy: 3, crosscut, integration };
}

function synthRun(passCounts) {
  const mk = (names, pass) => ({ pass, total: names.length, fails: names.slice(pass).map((n) => ({ name: n, why: 'synthetic-miss' })) });
  const wired = Object.fromEntries(SYNTH_CELLS.wire.map((n, i) => [n, i < passCounts.wire]));
  return {
    wire: { pass: passCounts.wire, total: SYNTH_CELLS.wire.length, wired },
    happy: mk(SYNTH_CELLS.happy, passCounts.happy),
    crosscut: mk(SYNTH_CELLS.crosscut, passCounts.crosscut),
    integration: mk(SYNTH_CELLS.integration, passCounts.integration),
  };
}

// charge the model-priced ledger for a genome's frontier nodes (cheap nodes => $0 on the free pool).
function chargeSynthLedger(g) {
  const L = makeLedger();
  const sk = g.skeletonAuthor || {};
  const skOut = 3000 + (sk.shapesIncluded ? 1500 : 0) + (sk.obligationDepth || 0) * 250;
  L.charge('skeletonAuthor', { model: sk.model, inputTokens: 2000, outputTokens: skOut });
  const dc = g.decomposer || {};
  const nLens = dc.lensEnsemble ? (dc.nLenses || 1) : 1;
  for (let i = 0; i < nLens; i++) L.charge('decomposer', { model: dc.model, inputTokens: 1000, outputTokens: 1500 });
  // builder/retry/integrator/checker run on the cheap pool (the thesis) → $0.
  for (let i = 0; i < (g.builder?.K || 1); i++) L.charge('builder', { model: 'fusion', outputTokens: 1200 });
  if (g.checker?.kind === 'cheap-judge') L.charge('checker', { model: 'fusion', outputTokens: 400 });
  return L;
}

/**
 * @param {{epicK?:number, epicName?:string}} [opts]
 * @returns {(genome:object)=>{epics:object[], ledger:object, routeDist:object}}
 */
export function makeSyntheticEvaluator({ epicK = 2, epicName = 'synthA' } = {}) {
  return function evaluate(genome) {
    const pc = synthPassCounts(genome);
    const runs = Array.from({ length: epicK }, () => synthRun(pc));
    const ledger = chargeSynthLedger(genome);
    return { epics: [{ name: epicName, cellNames: SYNTH_CELLS, runs }], ledger, routeDist: { 'synthetic-route': epicK } };
  };
}

// The co-measured baseline for the synthetic landscape: a DELIBERATELY WEAK opus reference (crosscut 1/5,
// integration 0/3, cost ~$0.27). Weak-on-lethal so handicapped seed genomes are non-inferior (admissible)
// and the search has a climbable, veto-respecting gradient (DESIGN K8 intent).
export function makeSyntheticBaseline() {
  const ledger = makeLedger();
  ledger.charge('baseline-opus-whole', { model: 'opus', inputTokens: 1000, outputTokens: 3400 }); // ~$0.27
  const runs = [synthRun({ wire: 5, happy: 3, crosscut: 1, integration: 0 }), synthRun({ wire: 5, happy: 3, crosscut: 1, integration: 0 })];
  return buildScorecard({ genome: null, genomeHash: 'synthetic-baseline', epics: [{ name: 'synthA', cellNames: SYNTH_CELLS, runs }], ledger });
}

// The hand-built KNOWN-DOMINATING genome for K8: cheap author + shapes/depth (seam) + full checker
// (crosscut) → reliability 1 at cost 0 → Pareto-dominates the baseline. The loop must rediscover this.
export function plantedOptimumGenome() {
  return {
    skeletonAuthor: { model: 'fusion', shapesIncluded: true, obligationDepth: 2 },
    decomposer: { model: 'fusion', lensEnsemble: false, nLenses: 1 },
    builder: { model: 'fusion', K: 1 },
    retry: { model: 'fusion', count: 1, gateStrictness: 'structural' },
    checker: { kind: 'deterministic', obligationClasses: ['tenancy', 'authz', 'mass-assign'], repairDepth: 1 },
    integrator: { model: 'fusion', recurrenceThreshold: 1 },
    escalation: { enabled: false, target: 'sonnet', triggerBucket: 'crosscut', budgetCap: 0 },
    amortizationM: 1,
  };
}

export { SYNTH_CELLS, synthPassCounts };

// ============================== LIVE EPIC EVALUATOR =================================================

function loadFixture(epicName) {
  const dir = path.join(BUILD_GAP, 'epics', epicName);
  const testsPath = path.join(dir, 'tests.mjs');
  const preamble = fs.readFileSync(path.join(dir, 'preamble.md'), 'utf8');
  return { dir, testsPath, preamble };
}

async function cellNamesFor(testsPath) {
  const tests = await import(url.pathToFileURL(testsPath).href);
  const nm = (arr) => (Array.isArray(arr) ? arr.map((t) => t.name) : []);
  return {
    wire: Array.isArray(tests.EXPECTS) ? tests.EXPECTS.slice() : [],
    happy: nm(tests.happy), crosscut: nm(tests.crosscut), integration: nm(tests.integration),
  };
}

const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';
function chunkPrompt(fx, surfaceText) {
  return ['## Shared context (every surface uses this)', fx.preamble, fx.skeleton ? `\n${fx.skeleton}` : '', '\n## Your task', surfaceText].join('\n');
}

// structural validity gate (mirrors epic-run.mjs isValidSurface; spawns the apparatus validate-surface).
function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'msval-'));
  const f = path.join(dir, `${surface}.mjs`);
  fs.writeFileSync(f, code);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    let done = false;
    const finish = (ok) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(ok); };
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} finish(false); }, timeoutMs);
    child.on('close', (c) => finish(c === 0));
    child.on('error', () => finish(false));
  });
}

/**
 * Live evaluator: builds each surface on the cheap gateway with the genome's skeleton + per-surface checker
 * lever, then grades with the frozen apparatus. This is the P1 cheaper-author × checker arm.
 *
 * The build path per surface:
 *   1. cheap builder draws the surface (with the tier-sourced skeleton injected when shapesIncluded);
 *      structural retry up to retry.count past an invalid draw (oracle-blind, mirrors epic-run.mjs).
 *   2. the CHECKER lever (genome.checker) runs on the accepted draw — deterministic / cheap-judge obligation
 *      checks against the PUBLIC contract (never the oracle), repairing up to repairDepth (checker.mjs).
 *   3. the (possibly repaired) module is assembled and graded by evaluateEpic.
 * Skeleton-authoring cost (the cheaper-author cost axis) is charged once per epic via the model-priced
 * ledger; cheap builds/repairs/cheap-judge run on the free pool ($0). A K3 oracle-leak in any checker prompt
 * voids the candidate (leak=true → the driver discards it).
 *
 * @param {object} p
 * @param {string[]} p.core   epic names (the frozen CORE; pilot uses 1, full P1 uses the anchor pair)
 * @param {Function} p.invoke gateway invoker (args: {prompt, system, model}) -> {text, route, outputTokens}
 * @param {number} [p.epicK]  whole-epic runs for worst-of-K
 */
export function makeEpicEvaluator({ core, invoke, epicK = 1, surfaceConcurrency = 3 } = {}) {
  const evaluateEpicP = import('../../build-gap/lib/epic-sandbox.mjs').then((m) => m.evaluateEpic);

  async function pool(items, limit, fn) {
    const out = new Array(items.length); let next = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { for (;;) { const i = next++; if (i >= items.length) return; out[i] = await fn(items[i], i); } }));
    return out;
  }

  return async function evaluate(genome) {
    const evaluateEpic = await evaluateEpicP;
    const ledger = makeLedger();
    const routeDist = {};
    const epics = [];
    const maxAttempts = Math.max(1, genome.retry?.count || 1);
    const builderModel = genome.builder.model === 'fusion' ? null : genome.builder.model;
    const checkerMeta = { ranChecker: genome.checker?.kind !== 'off', kind: genome.checker?.kind || 'off', repairs: 0, violations: 0, surfacesChecked: 0, leak: false };

    // one cheap builder draw of a surface from an arbitrary prompt (used for the initial build AND repairs)
    const drawSurface = async (prompt, surface, validate) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let g;
        try { g = await invoke({ prompt, system: SYS_ONE, model: builderModel }); } catch { continue; }
        ledger.charge('builder', { model: genome.builder.model, outputTokens: g.outputTokens || 0, usd: g.usd });
        if (g.route) routeDist[g.route] = (routeDist[g.route] || 0) + 1;
        const ok = !validate ? !!(g.text && g.text.trim()) : await isValidSurface(g.text, surface);
        if (ok) return g.text;
      }
      return '';
    };

    for (const epicName of core) {
      const fx = loadFixture(epicName);
      const cellNames = await cellNamesFor(fx.testsPath);
      const order = cellNames.wire;
      const skel = resolveSkeleton(genome, epicName);  // tier-sourced skeleton (cached) + its cost anchor
      chargeSkeletonAuthor(ledger, skel);              // charge the cheaper-author cost ONCE per epic
      const fxs = { ...fx, skeleton: skel.text };
      const runs = [];
      for (let k = 0; k < epicK; k++) {
        const files = {};
        await pool(order, surfaceConcurrency, async (surface) => {
          const surfaceText = fs.readFileSync(path.join(fx.dir, 'surfaces', `${surface}.md`), 'utf8');
          const buildPrompt = chunkPrompt(fxs, surfaceText);
          let code = await drawSurface(buildPrompt, surface, maxAttempts > 1);
          if (!code) return;                              // no valid draw → surface missing → graded as fail
          // the CHECKER lever: obligation/seam check + repair (oracle-blind; K3-scanned)
          const chk = await runChecker({
            surface, code, originalPrompt: buildPrompt, skeleton: skel.text, checker: genome.checker,
            rebuild: (rp) => invoke({ prompt: rp, system: SYS_ONE, model: builderModel }).then((g) => { if (g && g.route) routeDist[g.route] = (routeDist[g.route] || 0) + 1; ledger.charge('checker-repair', { model: genome.builder.model, outputTokens: g?.outputTokens || 0, usd: g?.usd }); return g; }),
            judgeInvoke: (a) => invoke(a),                // cheap-judge runs on the free pool ($0)
          });
          if (chk.ranChecker) { checkerMeta.surfacesChecked++; checkerMeta.repairs += chk.repairs; checkerMeta.violations += chk.violations; if (chk.leak) checkerMeta.leak = true; }
          files[surface] = chk.code;
        });
        runs.push(await evaluateEpic({ mode: 'isolated', files, testsPath: fx.testsPath }));
      }
      epics.push({ name: epicName, cellNames, runs });
    }
    return { epics, ledger, routeDist, checkerMeta };
  };
}
