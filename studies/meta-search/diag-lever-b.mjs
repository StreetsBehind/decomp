#!/usr/bin/env node
// LEVER-B $0 CONDITIONED DIAGNOSTIC (the ratified next step — AMENDMENTS.md 2026-06-25; deliberation
// runs/deliberations/20260624T202607Z/). Tests whether the output-QA stack can repair cheap-model SEMANTIC
// failures across the adversarial route zoo — the (C)-boundary — WITHOUT leaving the non-stationary free pool,
// using the variance-robust unanimous-failure read the noisy instrument can support.
//
// WHY conditioned, not a naive same-draws replay (the deliberation's load-bearing refinement). Raw worst-of-K
// is "dominated by whichever bug is worst on the worst route" (LADDER-RESULTS-A.md) → a naive Lever-B replay
// reproduces the Lever-A null (the approve→execute / conservation residual is buried under crashes / tenancy /
// drift on most draws). So we CONDITION: over the existing dump-ladder + dump-ladder-A draws of the named cells
// (approval-d2/d3/d4, quota-d3/d4 — LEVER-A-SCOPE.md), keep only draws that are
//   (Rule 1)  above the route-pool floor (parse∧exports, validated), AND
//   (Rule 2b) smoke-clean (no free-id ReferenceError), AND
//   (sole)    whose ONLY residual after the FULL existing deterministic stack (repair→shape→contract→
//             obligation→seam, route-back OFF, reproducible $0) is the cell's SEMANTIC class — every surviving
//             oracle fail classifies `semantics` (classifyFail), no form/incompetence residual mixed in.
// Conditioning on the DETERMINISTIC stack is CONSERVATIVE (a form residual the model stack could fix excludes
// the draw → we UNDER-count the subset, never over-claim).
//
// Then report, SEPARATELY (the deliberation's split):
//   DETECTION (deterministic, clean) — does Lever B's verifySemantic FIRE on the conditioned (semantic-residual)
//     draws? This is the deterministic verify half; its agreement with the oracle's residual is the readout.
//   REPAIR-across-zoo (model-routed, $0 free gateway) — does Lever B's verify+repair (route-back over the cheap
//     pool, R reps) CLEAR the semantic residual (oracle re-grade)? Endpoints (Rule 2d):
//       • clears on SOME above-floor route → (B): keep the lever.
//       • clears on NO above-floor smoke-clean route across the conditioned subset → variance-robust (C) signal.
//   FALLBACK: a cell whose conditioned subset is empty / n≤1 → free-gateway MULTI-PASS (never Phase-2).
//
// $0 (free gateway). The oracle is the MEASURING instrument (does repair work?), never an input to the lever
// (the lever reads only the public skeleton + candidate code; every repair prompt is scanOracleLeak-scanned).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { makeGatewayInvoke } from '../../runner/model-client.mjs';
import { loadEpicCtx, readDrawFiles, floorStatus, gradeRates } from './src/label-draw.mjs';
import { runRepairGate } from './src/repair-gate.mjs';
import { runShapeGate } from './src/shape-gate.mjs';
import { runContractGate } from './src/contract-gate.mjs';
import { runObligationContract } from './src/obligation-contract.mjs';
import { runSeamGate } from './src/seam-gate.mjs';
import { runSemanticObligation, verifySemantic, semanticRules, makeBehaviouralRunner } from './src/semantic-obligation.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const argv = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const flag = (n) => process.argv.includes(`--${n}`);
const DO_REPAIR = flag('repair');                       // OFF = conditioning + detection only ($0, deterministic, fast)
const DO_BEHAVIOURAL = flag('behavioural');             // option 3: behavioural verify in the repair loop (approval)
const REPS = parseInt(argv('reps', '3'), 10);           // model-repair reps per draw (route variance)
const BESTOFN = parseInt(argv('bestofn', '3'), 10);
const REPAIR_DEPTH = parseInt(argv('repairdepth', '2'), 10);
const K = parseInt(argv('k', '8'), 10);
const DUMPS = argv('dumps', 'dump-ladder,dump-ladder-A').split(',').map((s) => s.trim()).filter(Boolean);
const CELLS = argv('cells', 'approval-d2,approval-d3,approval-d4,quota-d3,quota-d4').split(',').map((s) => s.trim()).filter(Boolean);
const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';

// ---- failure classifier (coevo-rung1.classifyFail, BROADENED for the patterns the residual-why inspection
//      surfaced in the `unknown` bucket: conservation "remaining/insufficient", approve→execute "not in
//      approved state / requester cannot execute / advanced to executed", authz-under "member cannot grant /
//      unauthorized", input "missing required fields"). Telemetry only — NOT a lever input; it sharpens the
//      residual characterization + the relaxed-subset semantic measurement, never feeds the oracle-blind gate.
function classifyFail(why, hasMissing) {
  if (hasMissing) return { mode: 'MISSING', cls: 'form' };
  const w = String(why || '').toLowerCase();
  if (w.includes('is not a function') || w.includes('touched-unwired') || w.includes('is not iterable')) return { mode: 'shape/unwired', cls: 'form' };
  if (w.includes('not defined') || w.includes('cannot read properties of undefined') || w.includes('assignment to constant')) return { mode: 'coding-bug', cls: 'incompetence' };
  // SEMANTIC — conservation (quota no-overspend / balance arithmetic).
  if (w.includes('overspend') || w.includes('still there') || w.includes('was charged') || w.includes('remains')
      || w.includes('remaining') || w.includes('conserve') || w.includes('negative') || w.includes('exactly')
      || w.includes('lost or made') || w.includes('insufficient')) return { mode: 'conservation', cls: 'semantics' };
  // SEMANTIC — approve→execute ordering / idempotency / SoD-on-execute.
  if (w.includes('not approved') || w.includes('approved state') || w.includes('approved status') || w.includes('in approved')
      || w.includes("'approved'") || w.includes('advanced to executed') || w.includes("'executed'") || w.includes('cannot execute')
      || w.includes('execute own') || w.includes('execute their own') || w.includes('self-approv') || w.includes('idempotent')
      || w.includes('audit') || (w.includes('approval') && !w.includes('cross-org'))) return { mode: 'approval/idempotency', cls: 'semantics' };
  // FORM — authz (admin gate present/absent; under-authz "member/guest cannot grant", "unauthorized").
  if (w.includes('admin') || w.includes('cannot grant') || w.includes('authoriz')) return { mode: 'authz', cls: 'form' };
  if (w.includes('not found') || w.includes('not published') || w.includes('not a member') || w.includes('not publicly') || w.includes('no member')) return { mode: 'seam', cls: 'form' };
  if (w.includes('leak') || w.includes('foreign') || w.includes(' org') || w.includes('cross-org') || w.includes('tenan') || w.includes('not in caller')) return { mode: 'tenancy', cls: 'form' };
  if (w.includes('invalid input') || w.includes('not allowed') || w.includes('must not') || w.includes('unexpected field') || w.includes('unexpected input') || w.includes('missing required field') || w.includes('must be refused')) return { mode: 'input-validation', cls: 'form' };
  if (w.includes('assert.ok') || w.includes('expected truthy') || w.includes('to be truthy')) return { mode: 'truthy', cls: 'form-inadmissible' };
  return { mode: 'unknown', cls: 'unknown' };
}
const semFails = (fails) => (fails || []).filter((f) => classifyFail(f.why, false).cls === 'semantics').map((f) => f.name);

function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlb-'));
  const f = path.join(dir, `${surface}.mjs`); fs.writeFileSync(f, code);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    let done = false; const fin = (ok) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(ok); };
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} fin(false); }, timeoutMs);
    child.on('close', (c) => fin(c === 0)); child.on('error', () => fin(false));
  });
}

// ---- the FULL existing ladder stack (matches the LADDER command, MINUS Lever B). route-back via `rebuild`. ----
const NOOP = async () => '';
async function runExistingStack(rawFiles, ctx, rebuild) {
  const files = { ...rawFiles };
  const gate = { kind: 'deterministic', repairDepth: REPAIR_DEPTH, bestOfN: BESTOFN };
  await runRepairGate({ surfaces: ctx.order, files, prompts: ctx.prompts, gate, rebuild });
  await runShapeGate({ surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton, baseModel: ctx.preamble, gate, rebuild });
  await runContractGate({ surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton, gate, rebuild });
  await runObligationContract({ surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton, gate, rebuild });
  await runSeamGate({ surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton, baseModel: ctx.preamble, gate, rebuild, verify: (s, c) => isValidSurface(c, s) });
  return files;
}

const fullPass = (g) => g.c >= 1 - 1e-9 && g.i >= 1 - 1e-9;
function residualClasses(fails) {
  const set = new Set();
  for (const f of fails || []) set.add(classifyFail(f.why, false).cls);
  return set;
}

async function main() {
  console.log(`LEVER-B CONDITIONED DIAGNOSTIC — ${DO_REPAIR ? `repair ON (reps=${REPS}, bestOfN=${BESTOFN}${DO_BEHAVIOURAL ? ", +behavioural" : ""}), $0 free gateway` : 'detection-only ($0, deterministic)'}`);
  console.log(`cells: ${CELLS.join(', ')} | dumps: ${DUMPS.join(', ')} | floor=parse∧export∧smoke | conditioning stack=repair→shape→contract→obligation→seam (route-back OFF)\n`);

  const invoke = DO_REPAIR ? makeGatewayInvoke({ timeoutMs: 45000 }) : null;
  const rebuildModel = DO_REPAIR ? (async (surface, rp) => {
    for (let a = 0; a < 2; a++) {
      let g; try { g = await invoke({ prompt: rp, system: SYS_ONE, model: null }); } catch { continue; }
      if (g && g.text && await isValidSurface(g.text, surface)) return g.text;
      if (a === 1 && g && g.text) return g.text;          // last attempt: return even if invalid (oracle grades it)
    }
    return '';
  }) : NOOP;
  const behaviouralRunner = DO_BEHAVIOURAL ? makeBehaviouralRunner({ timeoutMs: 10000 }) : undefined;

  const ctxCache = {};
  const perCell = {};

  for (const cell of CELLS) {
    if (!ctxCache[cell]) ctxCache[cell] = await loadEpicCtx(cell);
    const ctx = ctxCache[cell];
    const rules = semanticRules(ctx.skeleton);
    const conditioned = [];     // PRE-REGISTERED subset: sole post-stack residual is semantic (Rule-2d clean)
    const relaxed = [];         // SUPPLEMENTARY subset: above-floor ∧ smoke-clean ∧ Lever-B detection-fires
    const excluded = { belowFloor: 0, passedStack: 0, mixedResidual: 0, noDumps: 0 };
    const modeHist = {};        // residual-mode histogram over ALL above-floor draws (post deterministic stack)
    let aboveFloor = 0, semanticPresent = 0;   // # above-floor draws whose residual INCLUDES any semantic fail

    for (const dump of DUMPS) {
      for (let k = 1; k <= K; k++) {
        const drawDir = path.join(HERE, 'runs', dump, `${cell}-d${k}`);
        if (!fs.existsSync(path.join(drawDir, 'raw'))) { excluded.noDumps++; continue; }
        const raw = readDrawFiles(drawDir, ctx.order);
        if (!Object.keys(raw).length) { excluded.noDumps++; continue; }

        const floor = await floorStatus(raw, ctx.order);
        if (!floor.floorOk) { excluded.belowFloor++; continue; }            // Rule 1 + 2b
        aboveFloor++;

        const postFiles = await runExistingStack(raw, ctx, NOOP);           // deterministic, reproducible
        const post = await gradeRates(postFiles, ctx.testsPath);
        if (fullPass(post)) { excluded.passedStack++; continue; }           // existing stack already fixed it
        const classes = residualClasses(post.fails);
        for (const f of post.fails || []) { const m = classifyFail(f.why, false).mode; modeHist[m] = (modeHist[m] || 0) + 1; }
        if (classes.has('semantics')) semanticPresent++;

        // DETECTION (deterministic): does Lever B fire on the post-stack files?
        const detail = ctx.order.flatMap((s) => (postFiles[s] ? verifySemantic(s, postFiles[s], rules).map((v) => `${s}:${v.obligation}`) : []));
        const detected = detail.length > 0;
        const baseSem = semFails(post.fails);
        const rec = {
          dump, k, post: { c: post.c, i: post.i }, baseSem,
          residualModes: [...new Set((post.fails || []).map((f) => classifyFail(f.why, false).mode))],
          detected, detail, postFiles,
        };

        const semanticOnly = post.fails.length > 0 && [...classes].every((c) => c === 'semantics');
        if (semanticOnly) conditioned.push(rec);
        else excluded.mixedResidual++;                                       // not sole-residual (pre-registered subset)
        // relaxed subset: detection fires AND there is a semantic fail to clear (regardless of co-mixed form).
        if (detected && baseSem.length > 0) relaxed.push(rec);
      }
    }

    // REPAIR-across-zoo (model-routed). Pre-registered read = the sole-residual `conditioned` subset; the
    // SUPPLEMENTARY read = the `relaxed` subset (detection-fires), measuring whether Lever B's repair clears the
    // SEMANTIC-class fails specifically (decoupled from co-mixed form residual the existing stack leaves). Run on
    // the union so each draw is repaired once; both reads slice the same results.
    let union = [];
    if (DO_REPAIR) {
      union = [...new Set([...conditioned, ...relaxed])];
      for (const d of union) {
        d.repair = { reps: [], semCleared: false, semImproved: false, fullPass: false };
        for (let r = 0; r < REPS; r++) {
          const files = { ...d.postFiles };
          const res = await runSemanticObligation({
            surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton,
            gate: { kind: 'deterministic', repairDepth: REPAIR_DEPTH, bestOfN: BESTOFN, behavioural: DO_BEHAVIOURAL }, rebuild: rebuildModel,
            behaviouralRunner,
          });
          const g = await gradeRates(files, ctx.testsPath);
          const afterSem = semFails(g.fails);
          const regressed = g.c < d.post.c - 1e-9 || g.i < d.post.i - 1e-9;
          // semantic-cleared = ALL baseline semantic fails gone, no lethal-bucket regression.
          const semCleared = d.baseSem.length > 0 && afterSem.length === 0 && !regressed;
          // semantic-improved = strictly fewer semantic fails, no regression.
          const semImproved = afterSem.length < d.baseSem.length && !regressed;
          d.repair.reps.push({ rep: r, c: g.c, i: g.i, baseSem: d.baseSem.length, afterSem: afterSem.length, repairs: res.repairs, reverts: res.reverts, leak: res.leak, regressed, semCleared, semImproved, fullPass: fullPass(g) });
          if (semCleared) d.repair.semCleared = true;
          if (semImproved) d.repair.semImproved = true;
          if (fullPass(g)) d.repair.fullPass = true;
        }
      }
    }

    // the repair read iterates the UNION when behavioural is on (so behavioural-only detection-gap draws — sole-
    // residual but structural-detection-silent, e.g. d2 A#2/A#8 — are included), else the structural relaxed set.
    const repairSubset = DO_BEHAVIOURAL ? union : relaxed;
    perCell[cell] = { conditioned, relaxed, repairSubset, excluded, modeHist, aboveFloor, semanticPresent };
    for (const d of [...conditioned, ...relaxed]) delete d.postFiles;       // free kept files
  }

  // ---- REPORT ----
  const TOT = K * DUMPS.length;
  console.log('==== CONDITIONING — PRE-REGISTERED sole-semantic-residual subset (per cell) ====');
  for (const cell of CELLS) {
    const { conditioned, relaxed, excluded } = perCell[cell];
    console.log(`${cell.padEnd(11)} | sole-residual n=${conditioned.length}/${TOT} | relaxed(detection-fires) n=${relaxed.length}/${TOT} | excluded: belowFloor ${excluded.belowFloor}, passed-stack ${excluded.passedStack}, mixed-residual ${excluded.mixedResidual}`);
  }

  console.log('\n==== RESIDUAL CHARACTERIZATION (above-floor draws, post deterministic stack — what confounds the sole-residual subset?) ====');
  for (const cell of CELLS) {
    const { modeHist, aboveFloor, semanticPresent } = perCell[cell];
    const hist = Object.entries(modeHist).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m}:${n}`).join(', ') || '(none)';
    console.log(`${cell.padEnd(11)} | above-floor ${aboveFloor}/${TOT} | semantic present in ${semanticPresent} draws | residual-mode fail-counts: ${hist}`);
  }

  console.log('\n==== DETECTION (deterministic — does Lever B fire where the semantic obligation is missing?) ====');
  for (const cell of CELLS) {
    const { relaxed } = perCell[cell];
    if (!relaxed.length) { console.log(`${cell.padEnd(11)} | (no above-floor draw with a missing semantic obligation detected)`); continue; }
    const obls = [...new Set(relaxed.flatMap((d) => d.detail))];
    console.log(`${cell.padEnd(11)} | fires on ${relaxed.length} above-floor smoke-clean draws | flagged: ${obls.join(', ')}`);
  }

  if (DO_REPAIR) {
    console.log(`\n==== REPAIR-ACROSS-ZOO (model route-back, reps=${REPS}, $0) — does repair CLEAR the SEMANTIC-class fails? ====`);
    console.log('   (measured on the relaxed detection-fires subset; semantic-cleared = all baseline semantic fails gone, no lethal regression)');
    for (const cell of CELLS) {
      const relaxed = perCell[cell].repairSubset;
      if (!relaxed.length) { console.log(`${cell.padEnd(11)} | (empty)`); continue; }
      const clearedDraws = relaxed.filter((d) => d.repair && d.repair.semCleared).length;
      const improvedDraws = relaxed.filter((d) => d.repair && d.repair.semImproved).length;
      const fullDraws = relaxed.filter((d) => d.repair && d.repair.fullPass).length;
      const perDraw = relaxed.map((d) => {
        const c = (d.repair?.reps || []).filter((r) => r.semCleared).length;
        return `${d.dump.replace('dump-ladder-A', 'A').replace('dump-ladder', 'L')}d${d.k}:${c}/${REPS}`;
      }).join(' ');
      console.log(`${cell.padEnd(11)} | sem-cleared-on-some-route ${clearedDraws}/${relaxed.length} | sem-improved ${improvedDraws}/${relaxed.length} | full-pass ${fullDraws}/${relaxed.length}`);
      console.log(`${''.padEnd(11)} |   per-draw cleared-reps: ${perDraw}`);
    }
  }

  console.log('\n==== VERDICT ====');
  console.log('PRE-REGISTERED read (sole-semantic-residual subset, Rule-2d clean):');
  let preregEmpty = true;
  for (const cell of CELLS) {
    const n = perCell[cell].conditioned.length;
    if (n > 1) preregEmpty = false;
    console.log(`  ${cell.padEnd(11)} | n=${n} → ${n <= 1 ? 'FALLBACK: free-gateway MULTI-PASS (never Phase-2)' : 'testable'}`);
  }
  if (preregEmpty) console.log('  → ALL cells n≤1: the existing dumps cannot isolate a clean semantic-residual subset → FALLBACK (free-gateway multi-pass), per AMENDMENTS.md 2026-06-25.');

  if (DO_REPAIR) {
    console.log('\nSUPPLEMENTARY read (relaxed detection-fires subset — does Lever B repair the semantic class at all across the zoo?):');
    let anyB = false, anyC = false;
    for (const cell of CELLS) {
      const relaxed = perCell[cell].repairSubset;
      if (!relaxed.length) { console.log(`  ${cell.padEnd(11)} | (empty)`); continue; }
      const cleared = relaxed.filter((d) => d.repair && d.repair.semCleared).length;
      if (cleared > 0) { anyB = true; console.log(`  ${cell.padEnd(11)} | (B) traction: repair cleared the semantic class on ${cleared}/${relaxed.length} draws on some route`); }
      else { anyC = true; console.log(`  ${cell.padEnd(11)} | (C)-leaning: repair cleared 0/${relaxed.length} across all routes×reps (variance-robust unanimous-failure on the semantic class)`); }
    }
    console.log(`\nsummary: ${anyB ? 'Lever B shows (B) traction on the semantic class on some cells; ' : ''}${anyC ? 'unanimous semantic-failure (C)-leaning on some cells; ' : ''}sole-residual subset empty → pre-registered fallback is free-gateway multi-pass.`);
  }

  const out = path.join(HERE, 'runs', `diag-lever-b${DO_REPAIR ? '' : '-detect'}.json`);
  const ser = (arr) => arr.map((d) => ({ dump: d.dump, k: d.k, post: d.post, baseSem: d.baseSem, residualModes: d.residualModes, detected: d.detected, detail: d.detail, repair: d.repair || null }));
  const serialize = Object.fromEntries(Object.entries(perCell).map(([cell, v]) => [cell, { excluded: v.excluded, modeHist: v.modeHist, aboveFloor: v.aboveFloor, semanticPresent: v.semanticPresent, conditioned: ser(v.conditioned), relaxed: ser(v.relaxed) }]));
  fs.writeFileSync(out, JSON.stringify({ DO_REPAIR, REPS, BESTOFN, REPAIR_DEPTH, perCell: serialize }, null, 2));
  console.log(`\nwrote ${path.relative(HERE, out)}`);
}
main().catch((e) => { console.error(e?.stack || e); process.exit(1); });
