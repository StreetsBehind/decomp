// SMOKE — the Clause-7 null-wiring ablation + perturbation adjunct (gates/null-wiring-ablation.mjs).
// Validates the MEASUREMENT mechanics without needing a post-ladder dump:
//   (1) perturbedScaffold neutralizes exactly ONE binding in the KNOWN primitive source, BEHAVIOURALLY:
//       isAdmin → a non-admin approval now executes; requester → self-approval now slips through; idempotency →
//       re-execute now appends a second audit record. Anchors are robust (throws if the primitive source drifts).
//   (2) perturbed scaffolds stay scanOracleLeak-clean.
//   (3) wiresPrimitive discriminates a wired surface from a self-authored one.
//   (4) mechanicalNullWiring HONESTLY reports non-constructible (no semantic-identifier matching) with the
//       discovered stores (leak-clean) and the unbindable field-level predicates.
//   (5) ablationVerdict classifies WIN-on-class / SCOPE-SHRINK / no-win / VOID per Clause 8.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { semanticRules } from '../src/semantic-obligation.mjs';
import { obligationScaffold } from '../src/obligation-scaffold.mjs';
import { scanOracleLeak } from '../src/checker.mjs';
import { perturbedScaffold, PERTURBATION_KEYS, wiresPrimitive, mechanicalNullWiring, ablationVerdict } from './null-wiring-ablation.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const MS = path.resolve(HERE, '..');
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ✗', msg); } };

const scaffold = obligationScaffold(semanticRules(fs.readFileSync(path.join(MS, 'epics', 'approval-d4', 'skeleton.md'), 'utf8')));
ok(scaffold.length > 100, 'base scaffold generated');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nwa-'));
const importScaffold = async (src, tag) => {
  const f = path.join(tmp, `_obligation.${tag}.mjs`);
  fs.writeFileSync(f, src);
  return import(url.pathToFileURL(f).href);
};

// helper: bindings for a non-admin approver of an entity requested by u1
const audit = () => { const a = []; return a; };
const wire = (entity, a, opts = {}) => ({
  entity, approvals: [{ requestId: 'r1', approverId: opts.approver || 'bob' }],
  matchApproval: (x) => x.requestId === 'r1', requesterIdOf: (e) => e.requesterId,
  isAdmin: (uid) => uid.startsWith('admin'), statusOf: (e) => e.status,
  markExecuted: () => { entity.status = 'executed'; }, appendAudit: () => a.push(1),
});

// ---- 1) BASE primitive refuses a non-admin approval + self-approval + is idempotent (control) -------------
{
  const m = await importScaffold(scaffold, 'base');
  let refusedNonAdmin = false;
  try { m.enforceExecute(wire({ status: 'approved', requesterId: 'u1' }, [], { approver: 'bob' })); } catch (e) { refusedNonAdmin = e instanceof m.ObligationError; }
  ok(refusedNonAdmin, 'BASE: non-admin approval refused');
  let refusedSelf = false;
  try { m.enforceExecute(wire({ status: 'approved', requesterId: 'adminA' }, [], { approver: 'adminA' })); } catch (e) { refusedSelf = e instanceof m.ObligationError; }
  ok(refusedSelf, 'BASE: self-approval (approver==requester) refused');
  const a = []; const e1 = { status: 'approved', requesterId: 'u1' };
  m.enforceExecute(wire(e1, a, { approver: 'adminA' })); const after1 = a.length;
  m.enforceExecute(wire(e1, a, { approver: 'adminA' })); const after2 = a.length;
  ok(after1 === 1 && after2 === 1, 'BASE: idempotent (one audit record across two executes)');
}

// ---- 2) PERTURBATION isAdmin → a non-admin approval now EXECUTES (binding neutralized) --------------------
{
  const src = perturbedScaffold(scaffold, 'isAdmin');
  ok(!scanOracleLeak(src), 'perturbed(isAdmin) scaffold has no oracle leak');
  const m = await importScaffold(src, 'isAdmin');
  let executed = false;
  try { const r = m.enforceExecute(wire({ status: 'approved', requesterId: 'u1' }, [], { approver: 'bob' })); executed = r.executed === true; } catch {}
  ok(executed, 'PERTURB isAdmin: non-admin approval now executes (admin binding was load-bearing)');
}

// ---- 3) PERTURBATION requester → self-approval now slips through ------------------------------------------
{
  const m = await importScaffold(perturbedScaffold(scaffold, 'requester'), 'requester');
  let executed = false;
  try { const r = m.enforceExecute(wire({ status: 'approved', requesterId: 'adminA' }, [], { approver: 'adminA' })); executed = r.executed === true; } catch {}
  ok(executed, 'PERTURB requester: self-approval now slips through (requester binding was load-bearing)');
}

// ---- 4) PERTURBATION idempotency → re-execute now appends a second audit record ---------------------------
{
  const m = await importScaffold(perturbedScaffold(scaffold, 'idempotency'), 'idempotency');
  const a = []; const e1 = { status: 'approved', requesterId: 'u1' };
  m.enforceExecute(wire(e1, a, { approver: 'adminA' }));
  m.enforceExecute(wire(e1, a, { approver: 'adminA' }));
  ok(a.length === 2, 'PERTURB idempotency: re-execute appends a second audit record (idempotency was load-bearing)');
}

// ---- 5) anchor robustness: a drifted primitive source → throws (verdict VOID, never silently mis-perturbed)
{
  let threw = false;
  try { perturbedScaffold('// some other module\nexport function enforceExecute(){}', 'isAdmin'); } catch { threw = true; }
  ok(threw, 'perturbedScaffold throws when the anchor line is absent (sound-or-VOID)');
}

// ---- 6) wiresPrimitive discriminates wired vs self-authored -----------------------------------------------
{
  const wiredCode = "import { enforceExecute } from './_obligation.mjs';\nexport function executeRequest(ctx,a){ return enforceExecute({entity:a}); }";
  const selfCode = "export function executeRequest(ctx,{id}){ const e=ctx.db.requests.find(r=>r.id===id); if(e.status!=='approved') throw new Error('not approved'); e.status='executed'; }";
  ok(wiresPrimitive(wiredCode), 'wiresPrimitive: detects a surface that imports + calls the primitive');
  ok(!wiresPrimitive(selfCode), 'wiresPrimitive: a self-authored gate is NOT counted as wired');
}

// ---- 7) mechanicalNullWiring is honestly non-constructible (leak-clean store discovery only) ---------------
{
  const files = { executeRequest: "export function executeRequest(ctx,{id}){ const e=ctx.db.requests.find(r=>r.id===id); ctx.db.audit.push({id}); }",
                  approveRequest: "export function approveRequest(ctx,{id}){ ctx.db.approvals.push({requestId:id, approverId:ctx.session.userId}); }" };
  const nw = mechanicalNullWiring({ files });
  ok(nw.constructible === false, 'mechanicalNullWiring: non-constructible (refuses semantic-identifier matching)');
  ok(nw.discoveredStores.includes('requests') && nw.discoveredStores.includes('approvals') && nw.discoveredStores.includes('audit'), 'mechanicalNullWiring: discovers stores by trace (leak-clean)');
  ok(nw.unbindable.some((u) => u.binding === 'matchApproval'), 'mechanicalNullWiring: names matchApproval as the non-mechanical (forbidden) binding');
}

// ---- 8) ablationVerdict classifier (Clause 8) -------------------------------------------------------------
{
  const nw = { constructible: false };
  ok(ablationVerdict({ parityPass: true, nullWiring: nw, perturbationFlips: { anyFlip: true } }).verdict === 'WIN-on-class', 'verdict: parity + perturbation flips → WIN-on-class');
  ok(ablationVerdict({ parityPass: true, nullWiring: nw, perturbationFlips: { anyFlip: false } }).verdict === 'SCOPE-SHRINK', 'verdict: parity + no flip → SCOPE-SHRINK');
  ok(ablationVerdict({ parityPass: false, nullWiring: nw, perturbationFlips: { anyFlip: true } }).verdict === 'no-win', 'verdict: no parity → no-win');
  ok(ablationVerdict({ parityPass: true, nullWiring: { constructiblePass: 'clean' } }).verdict === 'SCOPE-SHRINK', 'verdict: null-wiring passes clean → SCOPE-SHRINK');
  ok(ablationVerdict({ parityPass: true, nullWiring: { constructiblePass: 'leak' } }).verdict === 'VOID', 'verdict: null-wiring passes via leak → VOID');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nnull-wiring-ablation-smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
