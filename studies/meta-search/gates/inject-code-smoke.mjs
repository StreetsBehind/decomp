// SMOKE — the STRONG INJECTION (--inject-code) mechanism wired into coevo-rung1.mjs's build path.
// Validates the contract the runner relies on (AMENDMENTS.md 2026-06-28 pre-registration):
//   (1) obligationScaffold(rules) is DETERMINISTIC, skeleton-derived, valid ESM exporting enforceExecute, and
//       scanOracleLeak-clean; '' for non-applicable topologies (byte-identical no-op).
//   (2) the generic primitive enforces the DECLARED obligations via the surface-supplied bindings only:
//       approve→execute + separation-of-duties, execute-idempotency (audit-once), self-approval refused.
//   (3) scaffoldAddendum fires on execute-verb surfaces (carries the import + wiring template, no oracle leak)
//       and is '' on non-applicable surfaces.
//   (4) THE LOAD-BEARING NEW INVARIANT: a surface that wires `import './_obligation.mjs'` validates+imports
//       ONLY when the scaffold is co-located (isValidSurface's co-write / the epic-sandbox co-location). Without
//       the co-write the import is unresolved → validation fails. This proves the injection point is real AND
//       that the co-write is load-bearing (not incidental).
// Oracle-blind: reads only PUBLIC skeleton.md + surface NAMES (never epics/*/tests.mjs).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { obligationScaffold, scaffoldAddendum, scaffoldApplies, SCAFFOLD_KEY, SCAFFOLD_IMPORT } from '../src/obligation-scaffold.mjs';
import { semanticRules, EXECUTE_VERB } from '../src/semantic-obligation.mjs';
import { scanOracleLeak } from '../src/checker.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const MS = path.resolve(HERE, '..');
const BUILD_GAP = path.resolve(MS, '..', 'build-gap');
const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
const readSkel = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
const surfNames = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')) : []);

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ✗', msg); } };

// run build-gap/lib/validate-surface.mjs (the SAME isolated validator isValidSurface uses) on a temp dir.
function validateSurface(dir, surface, exportName) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, path.join(dir, `${surface}.mjs`), exportName], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} resolve(false); }, 8000);
    child.on('close', (c) => { clearTimeout(t); resolve(c === 0); });
    child.on('error', () => { clearTimeout(t); resolve(false); });
  });
}

// a hand-written WIRED execute surface (the cheap coder's job) — imports the injected primitive and delegates.
const WIRED_EXECUTE = `
import { enforceExecute } from '${SCAFFOLD_IMPORT}';
export function executeRequest(ctx, { id }) {
  const e = (ctx.db.requests || []).find((r) => r.id === id);
  enforceExecute({
    entity: e,
    approvals: ctx.db.approvals || [],
    matchApproval: (a) => a.requestId === id,
    requesterIdOf: (x) => x.requesterId,
    isAdmin: (uid) => (ctx.db.admins || []).includes(uid),
    statusOf: (x) => x.status,
    markExecuted: () => { e.status = 'executed'; },
    appendAudit: () => { (ctx.db.audit ||= []).push({ id }); },
  });
  return { ok: true };
}
`;

// ---- 1) generator basics on a real APPROVAL skeleton ------------------------------------------------------
const approvalSkel = readSkel(path.join(MS, 'epics', 'approval-d4', 'skeleton.md'));
const rules = semanticRules(approvalSkel);
ok(scaffoldApplies(rules), 'approval declares the approve→execute/idempotency obligation → scaffold applies');
const scaffold = obligationScaffold(rules);
ok(scaffold.length > 100, 'scaffold source generated (non-empty)');
ok(!scanOracleLeak(scaffold), 'scaffold source has NO oracle leak');
ok(scaffold.includes('export function enforceExecute'), 'scaffold exports enforceExecute');
ok(scaffold.includes('export class ObligationError'), 'scaffold exports ObligationError');

// ---- 2) the primitive enforces the declared obligations via bindings only ---------------------------------
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ics-prim-'));
  fs.writeFileSync(path.join(tmp, '_obligation.mjs'), scaffold);
  const m = await import(url.pathToFileURL(path.join(tmp, '_obligation.mjs')).href);
  ok(typeof m.enforceExecute === 'function', 'enforceExecute is importable');

  const audit = [];
  const wire = (entity) => ({
    entity, approvals: [{ requestId: 'r1', approverId: 'adminA' }],
    matchApproval: (a) => a.requestId === 'r1', requesterIdOf: (x) => x.requesterId,
    isAdmin: (uid) => uid.startsWith('admin'), statusOf: (x) => x.status,
    markExecuted: () => { entity.status = 'executed'; }, appendAudit: () => audit.push(1),
  });
  const e = { status: 'approved', requesterId: 'u1' };
  const r1 = m.enforceExecute(wire(e));
  ok(r1.executed === true && audit.length === 1 && e.status === 'executed', 'valid approval → executes once, one audit record');
  const r2 = m.enforceExecute(wire(e));
  ok(r2.executed === false && audit.length === 1, 'idempotency → re-execute appends no second audit record');

  let refused = false;
  const eSelf = { status: 'approved', requesterId: 'adminA' };  // approver == requester
  try { m.enforceExecute(wire(eSelf)); } catch (err) { refused = err instanceof m.ObligationError; }
  ok(refused, 'separation of duties → self-approval (approver == requester) is refused');

  let refusedNoAppr = false;
  const eNo = { status: 'approved', requesterId: 'u1' };
  try {
    m.enforceExecute({ ...wire(eNo), approvals: [{ requestId: 'OTHER', approverId: 'adminA' }] });
  } catch (err) { refusedNoAppr = err instanceof m.ObligationError; }
  ok(refusedNoAppr, 'no matching approval → execute refused');
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ---- 3) the addendum fires on execute-verb surfaces, '' on non-applicable ---------------------------------
{
  const order = surfNames(path.join(MS, 'epics', 'approval-d4', 'surfaces'));
  for (const s of order.filter((x) => EXECUTE_VERB.test(x))) {
    const add = scaffoldAddendum(s, rules);
    ok(add.includes(SCAFFOLD_IMPORT), `${s}: addendum carries the import specifier`);
    ok(add.includes('enforceExecute'), `${s}: addendum carries the wiring template`);
    ok(!scanOracleLeak(add), `${s}: addendum has NO oracle leak`);
  }
  ok(order.some((x) => EXECUTE_VERB.test(x)), 'approval has ≥1 execute-verb surface');
  for (const s of ['createRequest', 'approveRequest', 'listRequests']) {
    if (!order.includes(s)) continue;
    ok(scaffoldAddendum(s, rules) === '', `${s}: non-applicable surface → '' (no addendum)`);
  }
}

// ---- 4) LOAD-BEARING: a wired surface validates+imports ONLY when the scaffold is co-located ---------------
{
  // (a) with the co-write present → validates (import resolves, exports the function)
  const dirWith = fs.mkdtempSync(path.join(os.tmpdir(), 'ics-with-'));
  fs.writeFileSync(path.join(dirWith, 'executeRequest.mjs'), WIRED_EXECUTE);
  fs.writeFileSync(path.join(dirWith, `${SCAFFOLD_KEY}.mjs`), scaffold);
  ok(await validateSurface(dirWith, 'executeRequest', 'executeRequest'), 'wired surface validates WHEN _obligation.mjs is co-located');

  // and the co-located import actually resolves + runs (mirrors epic-run-one importing EXPECTS from the dir)
  const mod = await import(url.pathToFileURL(path.join(dirWith, 'executeRequest.mjs')).href);
  ok(typeof mod.executeRequest === 'function', 'wired surface imports the co-located primitive cleanly');
  const ctx = { db: { requests: [{ id: 'r1', status: 'approved', requesterId: 'u1' }], approvals: [{ requestId: 'r1', approverId: 'adminA' }], admins: ['adminA'], audit: [] } };
  const res = mod.executeRequest(ctx, { id: 'r1' });
  ok(res.ok === true && ctx.db.requests[0].status === 'executed' && ctx.db.audit.length === 1, 'wired surface runs end-to-end via the co-located primitive');
  fs.rmSync(dirWith, { recursive: true, force: true });

  // (b) WITHOUT the co-write → the import is unresolved → validation FAILS (proves the co-write is load-bearing)
  const dirWithout = fs.mkdtempSync(path.join(os.tmpdir(), 'ics-without-'));
  fs.writeFileSync(path.join(dirWithout, 'executeRequest.mjs'), WIRED_EXECUTE);
  ok(!(await validateSurface(dirWithout, 'executeRequest', 'executeRequest')), 'wired surface FAILS validation when _obligation.mjs is absent (co-write is load-bearing)');
  fs.rmSync(dirWithout, { recursive: true, force: true });
}

// ---- 5) non-applicable topology (lifecycle) → whole-topology no-op (default-OFF / control byte-identical) --
{
  const lif = semanticRules(readSkel(path.join(MS, 'epics', 'lifecycle-d1', 'skeleton.md')));
  ok(!scaffoldApplies(lif), 'lifecycle declares no approve→execute obligation → scaffold N/A');
  ok(obligationScaffold(lif) === '', 'lifecycle → obligationScaffold === "" (no module injected)');
  for (const s of ['advanceDoc', 'createDoc', 'executeAnything']) {
    ok(scaffoldAddendum(s, lif) === '', `lifecycle/${s}: addendum === "" (whole-topology no-op)`);
  }
}

console.log(`\ninject-code-smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
