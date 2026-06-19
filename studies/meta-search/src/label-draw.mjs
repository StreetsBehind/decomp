// REPLAY-ANCHORED RESIDUAL LABELER (RUN-FOR-DAYS-PLAN.md "BUILD, in order" #1 — BUILD FIRST, gate-critical).
//
// WHY this exists. The pre-committed Phase −1 GO rule turns on GO-condition-2: "residual worst draws are
// repairable-form in BOTH blocks." The whole anti-gaming defense of that condition is that the form/semantics
// label is anchored to whether a replay ACTUALLY MOVES THE GRADE — never the brittle test-name regex or
// code-inspection (both proven unreliable on this line: the persistence episode OVER-COUNTED form by reading
// code; the regex classifier in coevo-rung1/census-classify guesses from a fails string). So this module
// labels a draw by the OUTCOME of replaying the output-QA stack over its dumped RAW files, not by inspecting
// them. The census `classifyFail` regex is DEMOTED here to `advisory` telemetry: it rides along to help a
// human adjudicate an `unresolved` draw, but it never decides a bucket.
//
// THE FIVE BUCKETS (pinned in RUN-FOR-DAYS-PLAN.md; do not re-derive or soften):
//   PASS                  — raw already grades crosscut=integration=100% (not a residual).
//   det-form-repairable   — the DETERMINISTIC stack (model route-back OFF) moves the grade: ≥1 lethal bucket
//                           improves with 0 regressions. Route-luck-free; strongest GO-side label.
//   model-route-back-only — deterministic does NOT move it, but the REPLICATED (r≈3) model route-back stack
//                           does in a MAJORITY of reps (0 regressions). A single lucky route-back can NOT mint
//                           this label (that is route-luck, not repair). GO-side, but it smuggles a gateway
//                           draw into a worst-of-K, so the per-rep spread is recorded for the repair-route axis.
//   route-incompetence    — the raw draw is BELOW the parse∧export∧smoke floor (a surface is missing/empty, or
//                           smoke surfaces a free-id ReferenceError) AND neither replay clears it. The only
//                           "fix" is a re-draw = INADMISSIBLE under model-agnosticism → HALT-side.
//   unresolved            — smoke-clean (passes the floor) and FAILING, but neither the deterministic nor the
//                           replicated model stack moves it. A NULL replay is NOT evidence of unrepairability:
//                           it routes to HUMAN ADJUDICATION, NEVER auto-(C). The human promotes it to
//                           `form-unhandled` (a definable admissible oracle-blind transform exists → GO-side /
//                           build-the-next-lever) or `semantics-oracle-needed` (no such transform is even
//                           definable → a genuine (C) boundary). The `advisory` mode classification is the
//                           ONLY thing the regex contributes, and only to inform that human call.
//
// CAUSALITY DISCIPLINE (memory: incompetence-is-the-target / the persistence misread). A positive replay
// CONFIRMS repairability; silence cannot negatively confirm semantics. So the labeler never emits a (C)
// verdict on its own — incompetence and semantics are the only HALT-side outcomes, and semantics arrives only
// via a human reading an `unresolved`.
//
// The model axis is INJECTED (`rebuildModel`) exactly like the gates' `rebuild`, so the gate-critical
// accuracy self-test can drive it deterministically ($0, gateway-independent) while live Phase −1 passes the
// real free-gateway route-back. Same labeler code in both — the self-test validates the code path, not luck.

import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';
import { evaluateEpic } from '../../build-gap/lib/epic-sandbox.mjs';
import { runRepairGate, smokeSurface } from './repair-gate.mjs';
import { runShapeGate } from './shape-gate.mjs';
import { runContractGate } from './contract-gate.mjs';
import { runPersistenceGate } from './persistence-gate.mjs';
import { runSeamGate } from './seam-gate.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', '..', 'build-gap');
const MS = path.resolve(HERE, '..'); // studies/meta-search

// epic spec / loader — VERBATIM shape from coevo-rung1.mjs (membership → scale-d + oracle2; others on disk).
function epicSpec(id) {
  if (id.startsWith('membership-d')) {
    const D = id.split('-d')[1];
    return { id, dir: path.join(BUILD_GAP, 'epics', `scale-d${D}`), testsPath: path.join(MS, 'gates', 'lib', `oracle2-tests-d${D}.mjs`) };
  }
  return { id, dir: path.join(MS, 'epics', id), testsPath: path.join(MS, 'epics', id, 'tests.mjs') };
}

const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';
const chunkPrompt = (preamble, skeleton, surfaceText) => ['## Shared context (every surface uses this)', preamble, skeleton ? `\n${skeleton}` : '', '\n## Your task', surfaceText].join('\n');

/** Load the immutable context for an epic once (preamble/skeleton/order/prompts/testsPath). */
export async function loadEpicCtx(epicId) {
  const spec = epicSpec(epicId);
  const tests = await import(url.pathToFileURL(spec.testsPath).href);
  const order = Array.isArray(tests.EXPECTS) ? tests.EXPECTS.slice() : [];
  const preamble = fs.readFileSync(path.join(spec.dir, 'preamble.md'), 'utf8');
  const skeleton = fs.existsSync(path.join(spec.dir, 'skeleton.md')) ? fs.readFileSync(path.join(spec.dir, 'skeleton.md'), 'utf8') : '';
  const prompts = Object.fromEntries(order.map((s) => [s, chunkPrompt(preamble, skeleton, fs.readFileSync(path.join(spec.dir, 'surfaces', `${s}.md`), 'utf8'))]));
  return { id: epicId, order, preamble, skeleton, prompts, testsPath: spec.testsPath, dir: spec.dir };
}

/** Read a draw's dumped RAW surface files from <drawDir>/raw/<surface>.mjs (missing surfaces are absent keys). */
export function readDrawFiles(drawDir, order) {
  const rawDir = path.join(drawDir, 'raw');
  const files = {};
  for (const s of order) { const f = path.join(rawDir, `${s}.mjs`); if (fs.existsSync(f)) files[s] = fs.readFileSync(f, 'utf8'); }
  return files;
}

// ---- grading + movement (the SAME hardened semantics as coevo-rung1: a missing bucket / harnessError / empty
//      grade is 0, never a fake pass). Lethal buckets = crosscut + integration (the cell-verdict buckets). ----
const rate = (b) => (b && b.total ? b.pass / b.total : 0);
export async function gradeRates(files, testsPath) {
  const g = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath });
  const real = !!(g && (g.crosscut || g.integration || g.happy));
  const fails = real ? [...((g.integration && g.integration.fails) || []), ...((g.crosscut && g.crosscut.fails) || [])].map((f) => ({ name: f.name, why: f.why })) : [];
  return { c: real ? rate(g.crosscut) : 0, i: real ? rate(g.integration) : 0, real, note: real ? null : (g && (g.harnessError || (g.timeout && 'timeout') || (g.empty && 'empty') || 'no-grade')), fails };
}
const fullPass = (gr) => gr.c >= 1 && gr.i >= 1;
// "moves the grade with 0 regressions": ≥1 lethal bucket strictly improved AND no lethal bucket regressed.
function movement(before, after) {
  const improved = after.c > before.c + 1e-9 || after.i > before.i + 1e-9;
  const regressed = after.c < before.c - 1e-9 || after.i < before.i - 1e-9;
  return { moved: improved && !regressed, improved, regressed };
}

// validate-surface = the parse∧export check (the SAME gate coevo/replay-repair use to flag a "missing draw").
// A present-but-unparseable / non-exporting blob (a prose reasoning dump, `export functionfoo` glued tokens) is
// below the floor even though the file exists and smokes clean — so the floor MUST check it, not just smoke.
function validateSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lbl-'));
  const f = path.join(dir, `${surface}.mjs`); fs.writeFileSync(f, code);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    let done = false; const fin = (ok) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(ok); };
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} fin(false); }, timeoutMs);
    child.on('close', (c) => fin(c === 0)); child.on('error', () => fin(false));
  });
}

// ---- parse∧export∧smoke FLOOR (B6 route-pool floor). Below floor ⇒ a redraw is the only fix ⇒ inadmissible. --
// THREE components, all checked: (1) present∧non-empty, (2) parses∧exports the surface (validate-surface),
// (3) smoke-runs without a free-id ReferenceError. A live block surfaced the gap: a prose-blob / syntax-error
// surface is present and smokes clean (no-export → no free-id) yet is below floor → must be route-incompetence,
// not unresolved. (Validated against coevo's own `missingDraws`, which uses the same validate-surface check.)
export async function floorStatus(files, order) {
  const missing = order.filter((s) => !files[s] || files[s].length < 10);
  const invalidExport = [];   // present but fails parse∧export (prose blob / syntax error / no export)
  const freeIdSurfaces = [];  // parses+exports but smoke surfaces a runtime free-id ReferenceError
  for (const s of order) {
    if (!files[s] || files[s].length < 10) continue;
    if (!(await validateSurface(files[s], s))) { invalidExport.push(s); continue; } // below floor on parse∧export
    const sm = await smokeSurface(files[s], s);
    if (sm.freeIds && sm.freeIds.length) freeIdSurfaces.push({ surface: s, freeIds: sm.freeIds.slice() });
  }
  return { missing, invalidExport, freeIdSurfaces, floorOk: missing.length === 0 && invalidExport.length === 0 && freeIdSurfaces.length === 0 };
}

// ---- the output-QA stack, parameterised by rebuild (NOOP = deterministic; gateway = model route-back) -------
const NOOP_REBUILD = async () => '';
async function runStack(rawFiles, ctx, rebuild, repairDepth) {
  const files = { ...rawFiles };
  const gate = { kind: 'deterministic', repairDepth };
  // ORDER mirrors coevo-rung1 / replay-repair --stack: repair → shape → contract → persist → seam.
  // (repair runs first: broken code floors every test the form levers target.)
  let leak = false;
  const note = (r) => { if (r && r.leak) leak = true; };
  note(await runRepairGate({ surfaces: ctx.order, files, prompts: ctx.prompts, gate, rebuild }));
  note(await runShapeGate({ surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton, baseModel: ctx.preamble, gate, rebuild }));
  note(await runContractGate({ surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton, gate, rebuild }));
  note(await runPersistenceGate({ surfaces: ctx.order, files, skeleton: ctx.skeleton, baseModel: ctx.preamble, gate }));
  note(await runSeamGate({ surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton, baseModel: ctx.preamble, gate, rebuild }));
  return { files, leak };
}
export { runStack, NOOP_REBUILD };

// ---- ADVISORY regex classifier — DEMOTED telemetry only; NEVER decides a bucket. Helps a human adjudicate an
//      `unresolved` draw (form-unhandled vs semantics-oracle-needed). Verbatim modes from census-classify. ----
export function advisoryClassify(fails, missing) {
  const tally = {};
  const bump = (cls) => { tally[cls] = (tally[cls] || 0) + 1; };
  for (const f of fails || []) {
    const w = String((f && f.why) || '').toLowerCase();
    if (w.includes('is not a function') || w.includes('touched-unwired')) bump('form');
    else if (w.includes('not defined') || w.includes('cannot read properties of undefined') || w.includes('assignment to constant')) bump('incompetence');
    else if (w.includes('admin')) bump('form');
    else if (w.includes('overspend') || w.includes('still there') || w.includes('was charged') || w.includes('remains') || w.includes('conserve') || w.includes('negative') || w.includes('exactly') || w.includes('lost or made')) bump('semantics');
    else if (w.includes('not approved') || w.includes('approval') || w.includes('self-approv') || w.includes('idempotent') || w.includes('audit')) bump('semantics');
    else if (w.includes('not found') || w.includes('not published') || w.includes('not a member') || w.includes('not publicly') || w.includes('no member')) bump('form');
    else if (w.includes('leak') || w.includes('foreign') || w.includes(' org') || w.includes('tenan') || w.includes('not in caller')) bump('form');
    else if (w.includes('invalid input') || w.includes('not allowed') || w.includes('must not') || w.includes('unexpected field')) bump('form');
    else if (w.includes('assert.ok') || w.includes('expected truthy') || w.includes('to be truthy')) bump('form-inadmissible');
    else bump('unknown');
  }
  if (missing && missing.length) bump('incompetence');
  // advisory "lean": the highest-priority class present (semantics > incompetence > inadmissible > form > unknown).
  const lean = tally.semantics ? 'semantics' : tally.incompetence ? 'incompetence' : tally['form-inadmissible'] ? 'form-inadmissible' : tally.form ? 'form' : tally.unknown ? 'unknown' : 'none';
  return { tally, lean };
}

/**
 * Label one draw by replay OUTCOME. The decision tree is pinned (RUN-FOR-DAYS-PLAN.md); do not soften.
 * @param {object} a
 * @param {object} a.ctx      — from loadEpicCtx (order/prompts/skeleton/preamble/testsPath).
 * @param {Record<string,string>} a.files — the draw's RAW surface files (from readDrawFiles).
 * @param {(surface:string, repairPrompt:string)=>Promise<string>} [a.rebuildModel] — model route-back; default
 *        is the live-style absent rebuild (returns '' → no model fix). The self-test injects a deterministic mock.
 * @param {number} [a.reps=3]        — replication for the model axis ("a single lucky route-back can't mint it").
 * @param {number} [a.repairDepth=2] — per-surface route-back depth inside each gate.
 * @returns {Promise<{bucket, reachedPass, raw, det, model, floor, advisory, repairSpread, leak}>}
 */
export async function labelDraw({ ctx, files, rebuildModel = NOOP_REBUILD, reps = 3, repairDepth = 2 }) {
  const raw = await gradeRates(files, ctx.testsPath);
  if (fullPass(raw)) {
    return { bucket: 'PASS', reachedPass: true, raw, det: null, model: null, floor: null, advisory: null, repairSpread: null, leak: false };
  }
  const floor = await floorStatus(files, ctx.order);

  // --- DETERMINISTIC axis (route-back OFF): shape/contract/persist/seam Mode-A only; repair noops. ---
  const detRun = await runStack(files, ctx, NOOP_REBUILD, repairDepth);
  const det = await gradeRates(detRun.files, ctx.testsPath);
  const detMove = movement(raw, det);
  if (detMove.moved) {
    return { bucket: 'det-form-repairable', reachedPass: fullPass(det), raw, det: { ...det, ...detMove }, model: null, floor, advisory: null, repairSpread: null, leak: detRun.leak };
  }

  // --- MODEL axis (route-back ON), REPLICATED: a single lucky draw must not mint the label. ---
  const modelReps = [];
  for (let r = 0; r < reps; r++) {
    const run = await runStack(files, ctx, rebuildModel, repairDepth);
    const g = await gradeRates(run.files, ctx.testsPath);
    const mv = movement(raw, g);
    modelReps.push({ rep: r, c: g.c, i: g.i, moved: mv.moved, regressed: mv.regressed, fullPass: fullPass(g), leak: run.leak });
  }
  const movedReps = modelReps.filter((m) => m.moved).length;
  const majority = Math.ceil(reps / 2);
  const repairSpread = { reps, movedReps, majority, cSpread: spread(modelReps.map((m) => m.c)), iSpread: spread(modelReps.map((m) => m.i)), perRep: modelReps };
  const modelLeak = modelReps.some((m) => m.leak);
  if (movedReps >= majority) {
    return { bucket: 'model-route-back-only', reachedPass: modelReps.some((m) => m.fullPass), raw, det: { ...det, ...detMove }, model: { movedReps }, floor, advisory: null, repairSpread, leak: detRun.leak || modelLeak };
  }

  // --- neither replay reliably moved it ---
  // best residual fails to attach as advisory (prefer the deterministic-stack residual; it is reproducible).
  const advisory = advisoryClassify(det.fails, [...floor.missing, ...floor.invalidExport]);
  if (!floor.floorOk) {
    return { bucket: 'route-incompetence', reachedPass: false, raw, det: { ...det, ...detMove }, model: { movedReps }, floor, advisory, repairSpread, leak: detRun.leak || modelLeak };
  }
  // smoke-clean + nothing moved it → NULL replay → human adjudication. NEVER auto-(C).
  return { bucket: 'unresolved', reachedPass: false, raw, det: { ...det, ...detMove }, model: { movedReps }, floor, advisory, repairSpread, leak: detRun.leak || modelLeak };
}

function spread(xs) {
  if (!xs.length) return { min: 0, max: 0, range: 0 };
  const min = Math.min(...xs), max = Math.max(...xs);
  return { min: +min.toFixed(3), max: +max.toFixed(3), range: +(max - min).toFixed(3) };
}

// the set of buckets that count as GO-side "repairable-form" for GO-condition-2 (form-unhandled is added by a
// human promoting an `unresolved`; this labeler never auto-emits it).
export const GO_SIDE_BUCKETS = new Set(['det-form-repairable', 'model-route-back-only']);
export const HALT_SIDE_BUCKETS = new Set(['route-incompetence']); // semantics-oracle-needed arrives via human-adjudicated `unresolved`
