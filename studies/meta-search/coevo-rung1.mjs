#!/usr/bin/env node
// CO-EVOLUTION rung-1 STARTING LINE (COEVOLUTION-SPEC §5 rung 1, §3.2 worst-of-K-across-routes).
//
// The head-to-head (HEAD-TO-HEAD.md) graded the hybrid with a SINGLE gateway draw per surface. Under the
// model-agnostic principle (memory: model-agnostic-and-failure-attribution) a lucky-route 100% is NOT a
// model-agnostic 100% — fitness must be WORST-OF-K ACROSS ROUTES. This harness re-measures the CURRENT
// system (cheap fusion coding + the membership-only integration-gate, UNCHANGED) at K draws per surface and
// reports worst-of-K on the lethal buckets, so we know the honest rung-1 starting line BEFORE expanding the
// genome / generalizing the gate. It answers two questions:
//   (1) Do the head-to-head WINS (membership, lifecycle) survive worst-of-K?  (route-robustness of the wins)
//   (2) How deep are the losses (quota, approval) at worst-of-K, and which LAYER (A/B/C) owns each failure?
//
// It is ADDITIVE — it does not touch the frozen tree (studies/build-gap/) or any committed apparatus; it
// re-uses the exported integration-gate + the frozen evaluateEpic, and replicates head-to-head.mjs's thin
// build/grade path (which is not exported) inside a K-loop. Hybrid-only ⇒ $0 (free gateway). The routed
// baseline is the already-measured reference (100/100 at d1; HEAD-TO-HEAD.md / routed-baseline-live.json) —
// NOT re-run here (it spends real $).
//
// Run:  node studies/meta-search/coevo-rung1.mjs --mock                 # zero-spend wiring dry-run
//       node studies/meta-search/coevo-rung1.mjs                        # LIVE, K=3, the 4 d1 topos, ~$0
//       node studies/meta-search/coevo-rung1.mjs --k 5 --epics quota-d1,approval-d1

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { makeMockInvoke, makeGatewayInvoke } from '../../runner/model-client.mjs';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { runIntegrationGate } from './src/integration-gate.mjs';
import { runSeamGate } from './src/seam-gate.mjs';
import { runShapeGate } from './src/shape-gate.mjs';
import { runContractGate } from './src/contract-gate.mjs';
import { runPersistenceGate } from './src/persistence-gate.mjs';
import { runRepairGate } from './src/repair-gate.mjs';
import { runObligationContract } from './src/obligation-contract.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const MOCK = has('mock');
const K = Math.max(1, parseInt(arg('k', '3'), 10) || 3);                  // worst-of-K draws per epic
const RETRY = Math.max(1, parseInt(arg('retry', '2'), 10) || 2);         // structural-retry attempts per cheap draw
const REPAIR = Math.max(0, parseInt(arg('repair', '2'), 10));            // integration-gate model repairDepth (current membership gate)
const BESTOFN = Math.max(1, parseInt(arg('bestofn', '1'), 10) || 1);    // obligation gate: best-of-N route-backs (1 = pure no-regress guard)
const CONC = Math.max(1, parseInt(arg('conc', '6'), 10) || 6);
const CALL_TIMEOUT_MS = Math.max(10000, parseInt(arg('callTimeout', '120000'), 10) || 120000);
// --seamgate swaps the membership-only integration-gate for the GENERALIZED seam-gate (src/seam-gate.mjs),
// so for non-membership topologies raw=gate-OFF and final=gate-ON are PAIRED on the same draws (the
// COEVOLUTION-SPEC §4 generalized-gate validation). Without it, the current membership gate runs (no-ops
// off-membership → raw==final), which measures the honest gate-OFF base rate.
const GATE_FN = has('seamgate') ? runSeamGate : runIntegrationGate;
// --shapegate runs the SHARED-STORE SHAPE-CONFORMANCE gate (src/shape-gate.mjs) as a PRE-PASS before the seam
// gate. It targets the dominant honest-baseline failure (db.X.get/filter is not a function = a route violating
// the skeleton's declared array/Map shape). With it on we grade THREE points — raw (no gate) → afterShape
// (shape-gate only) → final (shape + seam) — so the shape lever's worst-of-K delta is attributable on its own.
const SHAPEGATE = has('shapegate');
// --contractgate runs the CONTRACT-PRECISION gate (src/contract-gate.mjs) between shape and seam: it removes
// an over-applied admin-only authz gate from a surface the public contract does NOT scope admin to (the
// `only admins can withdraw` hallucination). With it on we grade a 4th point — afterContract — so the contract
// lever's worst-of-K delta is attributable separately from shape and seam.
const CONTRACTGATE = has('contractgate');
// --persistgate runs the STORE-PERSISTENCE gate (src/persistence-gate.mjs) between contract and seam: it
// surgically rewrites the `const ledger = ctx.db.ledger ?? []; … ledger.push(…)` local-copy-not-written-back
// pattern (the dominant residual quota-integration killer — a debit pushed to a throwaway array when the store
// starts undefined) to persist via alias (`ctx.db.ledger ??= []; const ledger = ctx.db.ledger`). Deterministic
// + $0 + guard-preserving (no model route-back → no single-draw route-luck). With it on we grade a 5th point —
// afterPersist — so the persistence lever's worst-of-K delta is attributable separately from shape/contract/seam.
const PERSISTGATE = has('persistgate');
// --repairgate runs the SELF-REPAIR gate (src/repair-gate.mjs) as the FIRST pre-pass (before shape): it smoke-
// executes each surface under a permissive harness to surface RUNTIME coding-incompetence bugs that import-time
// validation misses (free-variable / undefined-helper ReferenceErrors — `bio`/`generateUniqueId is not defined`,
// the dominant worst-of-K-gating mode per the 2026-06-19 census), then route-backs the SAME cheap pool with the
// exact error to fix-or-remove the bad symbol. Model-agnostic + oracle-blind. With it on we grade an extra point
// — afterRepair — so the repair lever's worst-of-K delta is attributable separately.
const REPAIRGATE = has('repairgate');
// --obligation runs the OBLIGATION-CONTRACT gate (src/obligation-contract.mjs) after the contract gate: it
// derives each surface's typed obligation contract FROM THE PUBLIC SKELETON (tenancy/input-validation/authz-
// applicability/idempotency/audit + a no-over-apply restriction), verifies the built code against it, and routes
// a repair on a miss — the lever for the crosscut/obligation gap the settled worst-of-K=8 head-to-head flagged
// as the killer (16/17 cells). Deterministic + oracle-blind. Verifies FORM obligations only (semantic ones —
// conservation/legal-transition — are left to the oracle, never flagged). With it on we grade an extra point —
// afterObligation — so this lever's worst-of-K crosscut delta is attributable separately from shape/contract/seam.
const OBLIGATION = has('obligation');
// --dump <dir>: write each draw's RAW built surface files to <dir>/<tag>/ for offline diagnosis (why a gate
// did/didn't fire on a worst route). Diagnostic only; no effect on grading. $0.
const DUMP = arg('dump', null);

// The routed all-frontier baseline reference at d1 (already measured live — HEAD-TO-HEAD.md table; NOT re-run).
const BASELINE_D1 = {
  'membership-d1': { c: 1, i: 1, usd: 0.785 },
  'lifecycle-d1': { c: 1, i: 1, usd: 0.701 },
  'quota-d1': { c: 1, i: 1, usd: 0.742 },
  'approval-d1': { c: 1, i: 1, usd: 0.811 },
};
const HYBRID_SKELETON_USD = 0.395; // the shared opus skeleton anchor (both arms pay it)

// seam topology of an epic id (from the diverse-template family); membership = the d1 anchor (scale-d1).
function topologyOf(id) {
  if (id.startsWith('membership')) return 'membership';
  if (id.startsWith('approval')) return 'approval';
  if (id.startsWith('lifecycle')) return 'lifecycle';
  if (id.startsWith('quota')) return 'quota';
  return 'unknown';
}

const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';
const chunkPrompt = (preamble, skeleton, surfaceText) => ['## Shared context (every surface uses this)', preamble, skeleton ? `\n${skeleton}` : '', '\n## Your task', surfaceText].join('\n');

// epic spec / loader — verbatim shape from head-to-head.mjs (membership → scale-d + oracle2; others on-disk).
function epicSpec(id) {
  if (id.startsWith('membership-d')) {
    const D = id.split('-d')[1];
    // depth-matched ORACLE #2: domainsFor(D) schema (d1=5, d2=9, d3=13 surfaces). d1 path is bit-identical to before.
    return { id, dir: path.join(BUILD_GAP, 'epics', `scale-d${D}`), testsPath: path.join(HERE, 'gates', 'lib', `oracle2-tests-d${D}.mjs`) };
  }
  return { id, dir: path.join(HERE, 'epics', id), testsPath: path.join(HERE, 'epics', id, 'tests.mjs') };
}
async function loadEpic(spec) {
  const tests = await import(url.pathToFileURL(spec.testsPath).href);
  const order = Array.isArray(tests.EXPECTS) ? tests.EXPECTS.slice() : [];
  const preamble = fs.readFileSync(path.join(spec.dir, 'preamble.md'), 'utf8');
  const skeleton = fs.existsSync(path.join(spec.dir, 'skeleton.md')) ? fs.readFileSync(path.join(spec.dir, 'skeleton.md'), 'utf8') : '';
  const surfaces = Object.fromEntries(order.map((s) => [s, fs.readFileSync(path.join(spec.dir, 'surfaces', `${s}.md`), 'utf8')]));
  return { order, preamble, skeleton, surfaces, testsPath: spec.testsPath };
}

// HARDENED (2026-06-18): a missing/empty bucket is a FAIL (0), never a pass. The old `: 1` default silently
// turned an absent bucket — INCLUDING a whole harnessError/timeout/empty grade (which carries no buckets at
// all) — into a fake 100%. That is the exact footgun that produced the VOID "92/92" (testsPath:undefined →
// child threw → {harnessError} → rate(undefined)=1.0 on every bucket). Now: no tests actually ran ⇒ 0.
const rate = (b) => (b && b.total ? b.pass / b.total : 0);
const frac = (b) => (b ? `${b.pass}/${b.total}` : '0/0');
const isGrade = (g) => !!(g && (g.crosscut || g.integration || g.happy)); // a real grade carries ≥1 bucket
const relOf = (g) => (isGrade(g)
  ? { crosscut: rate(g.crosscut), integration: rate(g.integration), happy: rate(g.happy) }
  : { crosscut: 0, integration: 0, happy: 0, harnessError: g?.harnessError || (g?.timeout && 'timeout') || (g?.empty && 'empty') || 'no-grade' });
const failsOf = (g) => ({ crosscut: (g.crosscut?.fails || []).map((f) => ({ name: f.name, why: f.why })), integration: (g.integration?.fails || []).map((f) => ({ name: f.name, why: f.why })) });

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); } }));
  return out;
}

function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coevo-'));
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

// ONE hybrid draw of a whole epic (identical to head-to-head.runHybrid; the current membership-only gate).
// `tag` (when --dump is set) names a subdir under DUMP where the RAW built files are written for diagnostics.
async function runHybridOnce(fx, invoke, tag = null) {
  const files = {}; const prompts = {}; const perSurface = {}; const routes = [];
  const gateCfg = { kind: 'deterministic', repairDepth: REPAIR, bestOfN: BESTOFN };

  const drawSurface = async (prompt, surface) => {
    let attempts = 0, lastTokens = 0, route = null, valid = false, text = '';
    for (let a = 1; a <= RETRY; a++) {
      attempts = a;
      let g; try { g = await invoke({ prompt, system: SYS_ONE, model: null }); } catch { continue; }
      lastTokens = g.outputTokens || 0; if (g.route) route = g.route;
      const ok = await isValidSurface(g.text, surface);
      if (ok) { valid = true; text = g.text; break; }
      text = g.text || text;
    }
    return { text, attempts, valid, tokens: lastTokens, route };
  };

  await pool(fx.order, CONC, async (surface) => {
    const buildPrompt = chunkPrompt(fx.preamble, fx.skeleton, fx.surfaces[surface]);
    prompts[surface] = buildPrompt;
    const r = await drawSurface(buildPrompt, surface);
    files[surface] = r.valid ? r.text : (r.text || '');
    perSurface[surface] = { attempts: r.attempts, valid: r.valid, route: r.route, tokens: r.tokens };
    if (r.route) routes.push(r.route);
  });
  const rebuildFn = async (surface, rp) => (await drawSurface(rp, surface)).text;
  const gradeRec = (g) => ({ ...relOf(g), buckets: { crosscut: frac(g.crosscut), integration: frac(g.integration) }, fails: failsOf(g) });

  if (DUMP && tag) {
    const rawDir = path.join(DUMP, tag, 'raw');
    fs.mkdirSync(rawDir, { recursive: true });
    for (const [s, code] of Object.entries(files)) fs.writeFileSync(path.join(rawDir, `${s}.mjs`), code || '');
  }

  const rawGrade = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: fx.testsPath });

  // SELF-REPAIR gate (only with --repairgate): smoke-execute each surface, route-back to fix runtime free-id
  // ReferenceErrors, then grade afterRepair. Runs FIRST — broken code floors every test the other levers target.
  let repairRes = null, afterRepairGrade = null;
  if (REPAIRGATE) {
    repairRes = await runRepairGate({ surfaces: fx.order, files, prompts, gate: gateCfg, rebuild: rebuildFn });
    afterRepairGrade = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: fx.testsPath });
  }

  // SHAPE-GATE pre-pass (only with --shapegate): enforce the declared array/Map shape, then grade afterShape.
  let shapeRes = null, afterShapeGrade = null;
  if (SHAPEGATE) {
    shapeRes = await runShapeGate({ surfaces: fx.order, files, prompts, skeleton: fx.skeleton, baseModel: fx.preamble, gate: gateCfg, rebuild: rebuildFn });
    afterShapeGrade = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: fx.testsPath });
  }

  // CONTRACT-PRECISION gate (only with --contractgate): strip over-applied admin authz, then grade afterContract.
  let contractRes = null, afterContractGrade = null;
  if (CONTRACTGATE) {
    contractRes = await runContractGate({ surfaces: fx.order, files, prompts, skeleton: fx.skeleton, gate: gateCfg, rebuild: rebuildFn });
    afterContractGrade = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: fx.testsPath });
  }

  // OBLIGATION-CONTRACT gate (only with --obligation): verify each surface against its skeleton-derived typed
  // obligation contract and route repair on a miss (the crosscut/obligation lever). Runs after the contract gate
  // (which strips an over-applied admin guard) so the two compose: contract removes the hallucinated guard, the
  // obligation gate adds the MISSING obligations. Deterministic + oracle-blind ($0 detection; repair route-backs
  // the same cheap pool). Grades afterObligation for separate worst-of-K attribution.
  let obligationRes = null, afterObligationGrade = null;
  if (OBLIGATION) {
    obligationRes = await runObligationContract({ surfaces: fx.order, files, prompts, skeleton: fx.skeleton, gate: gateCfg, rebuild: rebuildFn });
    afterObligationGrade = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: fx.testsPath });
  }

  // STORE-PERSISTENCE gate (only with --persistgate): rewrite the local-copy-not-written-back pattern, then
  // grade afterPersist. Deterministic ($0); runs before the seam-gate so its surgical init pre-empts the
  // seam-gate Mode-A mis-firing the wrong-shape init on the `?? []` alias.
  let persistRes = null, afterPersistGrade = null;
  if (PERSISTGATE) {
    persistRes = await runPersistenceGate({ surfaces: fx.order, files, skeleton: fx.skeleton, baseModel: fx.preamble, gate: gateCfg });
    afterPersistGrade = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: fx.testsPath });
  }

  const gateRes = await GATE_FN({
    surfaces: fx.order, files, prompts, skeleton: fx.skeleton, baseModel: fx.preamble, gate: gateCfg,
    rebuild: rebuildFn,
    judgeInvoke: (a) => invoke(a),
  });
  const finalGrade = await evaluateEpic({ mode: 'isolated', files: { ...files }, testsPath: fx.testsPath });

  return {
    raw: gradeRec(rawGrade),
    ...(REPAIRGATE ? { afterRepair: gradeRec(afterRepairGrade) } : {}),
    ...(SHAPEGATE ? { afterShape: gradeRec(afterShapeGrade) } : {}),
    ...(CONTRACTGATE ? { afterContract: gradeRec(afterContractGrade) } : {}),
    ...(OBLIGATION ? { afterObligation: gradeRec(afterObligationGrade) } : {}),
    ...(PERSISTGATE ? { afterPersist: gradeRec(afterPersistGrade) } : {}),
    final: gradeRec(finalGrade),
    gate: { fired: gateRes.pairs > 0, pairs: gateRes.pairs, mismatches: gateRes.mismatches, repairs: gateRes.repairs, leak: gateRes.leak },
    ...(REPAIRGATE ? { repair: { ran: repairRes.ranGate, surfacesFlagged: repairRes.surfacesFlagged, freeIds: repairRes.freeIds, repairs: repairRes.repairs, fixed: repairRes.fixed, leak: repairRes.leak, detail: repairRes.detail } } : {}),
    ...(SHAPEGATE ? { shape: { ran: shapeRes.ranGate, surfacesFlagged: shapeRes.surfacesFlagged, violations: shapeRes.violations, repairs: shapeRes.repairs, leak: shapeRes.leak, shapes: shapeRes.shapes, detail: shapeRes.detail } } : {}),
    ...(CONTRACTGATE ? { contract: { ran: contractRes.ranGate, adminScoped: contractRes.adminScoped, surfacesFlagged: contractRes.surfacesFlagged, repairs: contractRes.repairs, leak: contractRes.leak, detail: contractRes.detail } } : {}),
    ...(OBLIGATION ? { obligation: { ran: obligationRes.ranGate, surfacesFlagged: obligationRes.surfacesFlagged, violations: obligationRes.violations, missing: obligationRes.missing, invented: obligationRes.invented, repairs: obligationRes.repairs, reverts: obligationRes.reverts, leak: obligationRes.leak, detail: obligationRes.detail } } : {}),
    ...(PERSISTGATE ? { persist: { ran: persistRes.ranGate, stores: persistRes.stores, surfacesFlagged: persistRes.surfacesFlagged, violations: persistRes.violations, repairs: persistRes.repairs, leak: persistRes.leak, detail: persistRes.detail } } : {}),
    routes,
    missingDraws: Object.entries(perSurface).filter(([, v]) => !v.valid).map(([s]) => s),
  };
}

// ---- failure-mode classifier (the deliberation's form/semantics/incompetence split) -----------------
// FORM = an oracle-blind gate CAN reach it (shape / missing surface / mis-scoped guard / seam composition /
// tenancy applicability). SEMANTICS = needs the held-out oracle (wrong conservation arithmetic, wrong approval
// predicate) → an oracle-blind lever CANNOT close it → a (C) thesis boundary if it is the stable residual.
// INCOMPETENCE = the route emitted broken code (ReferenceError) — neither form nor semantics. The headline
// readout is the WORST draw's residual mode + its class (form ⇒ keep stacking; semantics ⇒ stop, scope-shrink).
function classifyFail(why, hasMissing) {
  if (hasMissing) return { mode: 'MISSING', cls: 'form' };
  const w = String(why || '').toLowerCase();
  if (w.includes('is not a function') || w.includes('touched-unwired')) return { mode: 'shape/unwired', cls: 'form' };
  if (w.includes('not defined') || w.includes('cannot read properties of undefined')) return { mode: 'coding-bug', cls: 'incompetence' };
  if (w.includes('admin')) return { mode: 'authz-over', cls: 'form' };
  if (w.includes('overspend') || w.includes('still there') || w.includes('was charged') || w.includes('remains') || w.includes('conserve') || w.includes('negative') || w.includes('exactly') || w.includes('lost or made')) return { mode: 'conservation', cls: 'semantics' };
  if (w.includes('not approved') || w.includes('approval') || w.includes('self-approv') || w.includes('idempotent') || w.includes('audit')) return { mode: 'approval/idempotency', cls: 'semantics' };
  if (w.includes('not found') || w.includes('not published') || w.includes('not a member') || w.includes('not publicly') || w.includes('no member')) return { mode: 'seam', cls: 'form' };
  if (w.includes('leak') || w.includes('foreign') || w.includes(' org') || w.includes('tenan') || w.includes('not in caller')) return { mode: 'tenancy', cls: 'form' };
  if (w.includes('invalid input') || w.includes('not allowed') || w.includes('must not') || w.includes('unexpected field')) return { mode: 'input-validation', cls: 'form' };
  return { mode: `other:${String(why || '').slice(0, 40)}`, cls: 'unknown' };
}
// the dominant residual mode of one draw's FINAL grade (worst bucket first: integration, then crosscut).
function drawResidualMode(draw) {
  const hasMissing = (draw.missingDraws || []).length > 0;
  const fails = [...(draw.final.fails.integration || []), ...(draw.final.fails.crosscut || [])];
  if (!fails.length && !hasMissing) return { mode: 'PASS', cls: 'pass' };
  const tally = {};
  for (const f of fails) { const c = classifyFail(f.why, false); tally[c.mode] = tally[c.mode] || { n: 0, cls: c.cls }; tally[c.mode].n++; }
  if (hasMissing) { tally.MISSING = tally.MISSING || { n: 0, cls: 'form' }; tally.MISSING.n += 1; }
  const top = Object.entries(tally).sort((a, b) => b[1].n - a[1].n)[0];
  return { mode: top[0], cls: top[1].cls };
}

// ---- worst-of-K aggregation + A/B/C credit attribution -------------------------------------------
const min = (xs) => xs.reduce((a, b) => Math.min(a, b), Infinity);
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const max = (xs) => xs.reduce((a, b) => Math.max(a, b), -Infinity);
const stat = (xs) => ({ worst: +min(xs).toFixed(3), median: +med(xs).toFixed(3), best: +max(xs).toFixed(3) });

// Layer attribution (COEVOLUTION-SPEC §1 failure-attribution lens): A=orchestration, B=output-QA, C=boundary.
// Uses the head-to-head layer-2 decomposition rules, evaluated on the WORST-OF-K draw of each bucket.
function attribute(epic) {
  const tags = [];
  const draws = epic.draws;
  const anyMissing = draws.some((d) => d.missingDraws.length);
  const gateNoOp = draws.every((d) => !d.gate.fired);
  const worstFinalC = epic.final.crosscut.worst;
  const worstFinalI = epic.final.integration.worst;
  const worstRawI = epic.raw.integration.worst;
  const gateRecovers = draws.some((d) => rateNum(d.final.integration) > rateNum(d.raw.integration));

  if (anyMissing) tags.push({ layer: 'B', mechanism: 'MISSING_DRAW', note: 'some route emitted no structurally-valid module (verbose reasoning blob / format hazard) → extraction/format-forcing gene' });
  if (worstFinalC < 1) tags.push({ layer: 'B', mechanism: 'CROSSCUT_GAP', note: 'cheap-tier obligation coding-quality gap (the gate never touches crosscut) — may also be (A) over-applied/hallucinated obligation; inspect fails' });
  if (worstFinalI < 1) {
    if (gateNoOp) tags.push({ layer: 'A/B', mechanism: 'SEAM_GATE_NOOP', note: `gate is a no-op on ${epic.topology} (membership-only) → unhandled cross-surface invariant: needs gate-generalization (B) and/or per-surface decomposition (A)` });
    else if (gateRecovers && worstFinalI < 1) tags.push({ layer: 'A/B', mechanism: 'SEAM_GATE_RESIDUAL', note: 'gate fires + recovers some draws but worst-of-K integ still <1 → residual seam not fully handled' });
    else tags.push({ layer: 'A/B', mechanism: 'SEAM_UNRECOVERED', note: 'integ low and gate did not recover it' });
  }
  if (!tags.length) tags.push({ layer: '-', mechanism: 'SOLID', note: 'worst-of-K crosscut+integration both 100% — route-robust pass' });
  return tags;
}
function rateNum(fracStr) { const [a, b] = String(fracStr).split('/').map(Number); return b ? a / b : 1; }

async function main() {
  const ids = (arg('epics', 'membership-d1,lifecycle-d1,quota-d1,approval-d1')).split(',').map((s) => s.trim()).filter(Boolean);
  const invoke = MOCK ? makeMockInvoke({}, { text: 'export function __noop(){ return null; }', outputTokens: 700, usd: 0 }) : makeGatewayInvoke({ timeoutMs: CALL_TIMEOUT_MS });

  const gateName = `${REPAIRGATE ? 'repair+' : ''}${SHAPEGATE ? 'shape+' : ''}${CONTRACTGATE ? 'contract+' : ''}${OBLIGATION ? 'obligation+' : ''}${PERSISTGATE ? 'persist+' : ''}${has('seamgate') ? 'seam' : 'membership'}`;
  console.log(`COEVO RUNG-1 — ${MOCK ? 'MOCK (zero spend)' : 'LIVE'} — worst-of-K=${K} retry=${RETRY} gate=${gateName} gate.repair=${REPAIR} conc=${CONC} — ${ids.length} epics\n`);
  const out = { mock: MOCK, k: K, retry: RETRY, repair: REPAIR, generatedAt: null, epics: [] };
  const outDir = path.join(HERE, 'runs'); fs.mkdirSync(outDir, { recursive: true });
  const outName = arg('out', MOCK ? 'coevo-rung1-mock.json' : 'coevo-rung1.json');
  const outFile = path.join(outDir, outName.endsWith('.json') ? outName : `${outName}.json`);
  const flush = () => fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n');

  for (const id of ids) {
    const spec = epicSpec(id);
    const fx = await loadEpic(spec);
    const topology = topologyOf(id);
    const t0 = Date.now();
    const draws = [];
    for (let k = 0; k < K; k++) {
      const d = await runHybridOnce(fx, invoke, `${id}-d${k + 1}`);
      draws.push(d);
      const repairSeg = REPAIRGATE ? `→ repair{c ${(d.afterRepair.crosscut * 100).toFixed(0)} i ${(d.afterRepair.integration * 100).toFixed(0)} ${d.repair.surfacesFlagged}f/${d.repair.repairs}r/${d.repair.fixed}fix${d.repair.leak ? ' LEAK' : ''}} ` : '';
      const shapeSeg = SHAPEGATE ? `→ shape{c ${(d.afterShape.crosscut * 100).toFixed(0)} i ${(d.afterShape.integration * 100).toFixed(0)} ${d.shape.surfacesFlagged}f/${d.shape.repairs}r${d.shape.leak ? ' LEAK' : ''}} ` : '';
      const contractSeg = CONTRACTGATE ? `→ contract{c ${(d.afterContract.crosscut * 100).toFixed(0)} i ${(d.afterContract.integration * 100).toFixed(0)} ${d.contract.surfacesFlagged}f/${d.contract.repairs}r${d.contract.leak ? ' LEAK' : ''}} ` : '';
      const obligationSeg = OBLIGATION ? `→ oblig{c ${(d.afterObligation.crosscut * 100).toFixed(0)} i ${(d.afterObligation.integration * 100).toFixed(0)} ${d.obligation.surfacesFlagged}f/${d.obligation.missing}m/${d.obligation.invented}o/${d.obligation.repairs}r${d.obligation.reverts ? `/${d.obligation.reverts}nr` : ''}${d.obligation.leak ? ' LEAK' : ''}} ` : '';
      const persistSeg = PERSISTGATE ? `→ persist{c ${(d.afterPersist.crosscut * 100).toFixed(0)} i ${(d.afterPersist.integration * 100).toFixed(0)} ${d.persist.surfacesFlagged}f/${d.persist.repairs}r${d.persist.leak ? ' LEAK' : ''}} ` : '';
      const rm = drawResidualMode(d);
      process.stdout.write(`  [${id}] draw ${k + 1}/${K}: raw{c ${(d.raw.crosscut * 100).toFixed(0)} i ${(d.raw.integration * 100).toFixed(0)}} ${repairSeg}${shapeSeg}${contractSeg}${obligationSeg}${persistSeg}→ final{c ${(d.final.crosscut * 100).toFixed(0)} i ${(d.final.integration * 100).toFixed(0)}} [${rm.mode}/${rm.cls}] ${d.gate.fired ? `gate[${d.gate.pairs}p ${d.gate.repairs}r]` : 'gate[no-op]'} ${d.missingDraws.length ? `MISSING:${d.missingDraws.join(',')}` : ''} routes:${d.routes.join('|') || '?'}\n`);
    }
    const agg = {
      id, topology, surfaces: fx.order.length, K,
      raw: { crosscut: stat(draws.map((d) => d.raw.crosscut)), integration: stat(draws.map((d) => d.raw.integration)) },
      ...(REPAIRGATE ? { afterRepair: { crosscut: stat(draws.map((d) => d.afterRepair.crosscut)), integration: stat(draws.map((d) => d.afterRepair.integration)) } } : {}),
      ...(SHAPEGATE ? { afterShape: { crosscut: stat(draws.map((d) => d.afterShape.crosscut)), integration: stat(draws.map((d) => d.afterShape.integration)) } } : {}),
      ...(CONTRACTGATE ? { afterContract: { crosscut: stat(draws.map((d) => d.afterContract.crosscut)), integration: stat(draws.map((d) => d.afterContract.integration)) } } : {}),
      ...(OBLIGATION ? { afterObligation: { crosscut: stat(draws.map((d) => d.afterObligation.crosscut)), integration: stat(draws.map((d) => d.afterObligation.integration)) } } : {}),
      ...(PERSISTGATE ? { afterPersist: { crosscut: stat(draws.map((d) => d.afterPersist.crosscut)), integration: stat(draws.map((d) => d.afterPersist.integration)) } } : {}),
      final: { crosscut: stat(draws.map((d) => d.final.crosscut)), integration: stat(draws.map((d) => d.final.integration)) },
      routeDiversity: { distinct: new Set(draws.flatMap((d) => d.routes)).size, routes: [...new Set(draws.flatMap((d) => d.routes))] },
      gate: { firedAnyDraw: draws.some((d) => d.gate.fired), noOp: draws.every((d) => !d.gate.fired) },
      ...(REPAIRGATE ? { repair: { totalFreeIds: draws.reduce((s, d) => s + (d.repair.freeIds || 0), 0), totalRepairs: draws.reduce((s, d) => s + (d.repair.repairs || 0), 0), totalFixed: draws.reduce((s, d) => s + (d.repair.fixed || 0), 0), drawsFlagged: draws.filter((d) => d.repair.surfacesFlagged > 0).length, leakAny: draws.some((d) => d.repair.leak) } } : {}),
      ...(SHAPEGATE ? { shape: { shapes: draws[0]?.shape?.shapes || {}, totalViolations: draws.reduce((s, d) => s + (d.shape.violations || 0), 0), totalRepairs: draws.reduce((s, d) => s + (d.shape.repairs || 0), 0), drawsFlagged: draws.filter((d) => d.shape.surfacesFlagged > 0).length, leakAny: draws.some((d) => d.shape.leak) } } : {}),
      ...(CONTRACTGATE ? { contract: { adminScoped: draws[0]?.contract?.adminScoped || [], totalRepairs: draws.reduce((s, d) => s + (d.contract.repairs || 0), 0), drawsFlagged: draws.filter((d) => d.contract.surfacesFlagged > 0).length, leakAny: draws.some((d) => d.contract.leak) } } : {}),
      ...(OBLIGATION ? { obligation: { totalMissing: draws.reduce((s, d) => s + (d.obligation.missing || 0), 0), totalInvented: draws.reduce((s, d) => s + (d.obligation.invented || 0), 0), totalRepairs: draws.reduce((s, d) => s + (d.obligation.repairs || 0), 0), totalReverts: draws.reduce((s, d) => s + (d.obligation.reverts || 0), 0), drawsFlagged: draws.filter((d) => d.obligation.surfacesFlagged > 0).length, leakAny: draws.some((d) => d.obligation.leak) } } : {}),
      ...(PERSISTGATE ? { persist: { stores: draws[0]?.persist?.stores || [], totalViolations: draws.reduce((s, d) => s + (d.persist.violations || 0), 0), totalRepairs: draws.reduce((s, d) => s + (d.persist.repairs || 0), 0), drawsFlagged: draws.filter((d) => d.persist.surfacesFlagged > 0).length, leakAny: draws.some((d) => d.persist.leak) } } : {}),
      // residualWorst = the FINAL-grade failure mode of the WORST draw (min integration, then min crosscut) + its
      // form/semantics class + a per-mode tally over all draws (the deliberation's headline readout).
      residualWorst: (() => {
        const worst = [...draws].sort((a, b) => (a.final.integration - b.final.integration) || (a.final.crosscut - b.final.crosscut))[0];
        const rm = drawResidualMode(worst);
        const tally = {}; for (const d of draws) { const m = drawResidualMode(d); tally[m.mode] = tally[m.mode] || { n: 0, cls: m.cls }; tally[m.mode].n++; }
        return { mode: rm.mode, cls: rm.cls, worstFinal: { c: worst.final.crosscut, i: worst.final.integration }, modeTally: tally };
      })(),
      baseline: BASELINE_D1[id] || null,
      hybridUsd: HYBRID_SKELETON_USD,
      draws,
    };
    agg.attribution = attribute(agg);
    // verdict: route-robust WIN iff worst-of-K crosscut & integration both reach the baseline (100% at d1).
    const b = agg.baseline || { c: 1, i: 1 };
    agg.verdict = (agg.final.crosscut.worst >= b.c && agg.final.integration.worst >= b.i) ? 'WIN(worst-of-K)' : 'FAIL(worst-of-K)';
    out.epics.push(agg);
    flush();
    const repairSummary = REPAIRGATE ? `  | repair→ c ${(agg.afterRepair.crosscut.worst * 100).toFixed(0)}% i ${(agg.afterRepair.integration.worst * 100).toFixed(0)}% (${agg.repair.totalFreeIds}freeIds/${agg.repair.totalRepairs}r/${agg.repair.totalFixed}fix on ${agg.repair.drawsFlagged}d)` : '';
    const shapeSummary = SHAPEGATE ? `  | shape→ c ${(agg.afterShape.crosscut.worst * 100).toFixed(0)}% i ${(agg.afterShape.integration.worst * 100).toFixed(0)}% (${agg.shape.totalRepairs}r/${agg.shape.drawsFlagged}d)` : '';
    const contractSummary = CONTRACTGATE ? `  | contract→ c ${(agg.afterContract.crosscut.worst * 100).toFixed(0)}% i ${(agg.afterContract.integration.worst * 100).toFixed(0)}% (${agg.contract.totalRepairs}r/${agg.contract.drawsFlagged}d; admin-scoped ${JSON.stringify(agg.contract.adminScoped)})` : '';
    const obligationSummary = OBLIGATION ? `  | oblig→ c ${(agg.afterObligation.crosscut.worst * 100).toFixed(0)}% i ${(agg.afterObligation.integration.worst * 100).toFixed(0)}% (${agg.obligation.totalMissing}m/${agg.obligation.totalInvented}o/${agg.obligation.totalRepairs}r/${agg.obligation.totalReverts}nr on ${agg.obligation.drawsFlagged}d; bestofn=${BESTOFN})` : '';
    const persistSummary = PERSISTGATE ? `  | persist→ c ${(agg.afterPersist.crosscut.worst * 100).toFixed(0)}% i ${(agg.afterPersist.integration.worst * 100).toFixed(0)}% (${agg.persist.totalRepairs}r/${agg.persist.drawsFlagged}d; stores ${JSON.stringify(agg.persist.stores)})` : '';
    console.log(`  => ${id} [${topology}] worst-of-K  raw c ${(agg.raw.crosscut.worst * 100).toFixed(0)}% i ${(agg.raw.integration.worst * 100).toFixed(0)}%${repairSummary}${shapeSummary}${contractSummary}${obligationSummary}${persistSummary}  final c ${(agg.final.crosscut.worst * 100).toFixed(0)}% i ${(agg.final.integration.worst * 100).toFixed(0)}%  vs baseline ${b.c * 100}/${b.i * 100}  routes:${agg.routeDiversity.distinct}  ${agg.verdict}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    console.log(`     RESIDUAL WORST draw: ${agg.residualWorst.mode} [${agg.residualWorst.cls.toUpperCase()}]  (worst final c${(agg.residualWorst.worstFinal.c * 100).toFixed(0)}/i${(agg.residualWorst.worstFinal.i * 100).toFixed(0)}) — ${agg.residualWorst.cls === 'semantics' ? 'oracle-blind-UNREACHABLE → (C) boundary candidate' : agg.residualWorst.cls === 'form' ? 'form defect → a lever can reach it' : agg.residualWorst.cls}`);
    console.log(`     mode tally: ${Object.entries(agg.residualWorst.modeTally).map(([m, v]) => `${m}:${v.n}(${v.cls})`).join(', ')}`);
    console.log(`     attribution: ${agg.attribution.map((a) => `${a.layer}:${a.mechanism}`).join(', ')}\n`);
  }
  flush();
  console.log(`wrote ${path.relative(ROOT, outFile)}`);
}

main().catch((e) => { console.error('coevo-rung1 FAILED:', e); process.exit(1); });
