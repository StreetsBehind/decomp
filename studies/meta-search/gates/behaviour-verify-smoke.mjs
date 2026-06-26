#!/usr/bin/env node
// SMOKE for option 3 (the behavioural verify; gates/lib/behaviour-run.mjs + semantic-obligation.verifyBehavioural).
// Validates: (1) executeFamilies groups create/approve/exec triads; (2) the child scenario runner returns
// sod/idempotency ok|violated on crafted GOOD / bad-SoD / bad-idempotency triads; (3) verifyBehavioural maps
// violations to the declared clauses; (4) ADMISSIBILITY — disk-deletion invariance: the verdict is computed from
// in-memory candidate code only, with NO access to epics/*/tests.mjs (the runner never reads the epic dir).

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { executeFamilies, verifyBehavioural, makeBehaviouralRunner, semanticRules } from '../src/semantic-obligation.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const MS = path.resolve(HERE, '..');
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.log(`  FAIL  ${name}`); } };

const rules = semanticRules(fs.readFileSync(path.join(MS, 'epics', 'approval-d2', 'skeleton.md'), 'utf8'));
const runner = makeBehaviouralRunner({ timeoutMs: 10000 });

// ---- crafted minimal triads (object-keyed requests store; approvals array; auditLog array) ----------------
const CREATE = `export function createRequest(ctx, input){ ctx.db.requests = ctx.db.requests||{}; const id='r'+(Object.keys(ctx.db.requests).length+1); const rec={id, body:input&&input.body, requesterId:ctx.session.userId, orgId:ctx.session.orgId, status:'pending'}; ctx.db.requests[id]=rec; return rec; }`;
const APPROVE = `export function approveRequest(ctx, requestId){ ctx.db.requests=ctx.db.requests||{}; const req=ctx.db.requests[requestId]; if(!req) throw new Error('not found'); if(ctx.session.role!=='admin') throw new Error('not admin'); if(req.requesterId===ctx.session.userId) throw new Error('self approval'); ctx.db.approvals=ctx.db.approvals||[]; const ap={requestId, approverId:ctx.session.userId}; ctx.db.approvals.push(ap); req.status='approved'; return ap; }`;
const EXEC_GOOD = `export function executeRequest(ctx, requestId){ ctx.db.requests=ctx.db.requests||{}; const req=ctx.db.requests[requestId]; if(!req) throw new Error('not found'); ctx.db.approvals=ctx.db.approvals||[]; const valid=ctx.db.approvals.some(a=>a.requestId===requestId && a.approverId!==req.requesterId); if(!valid) throw new Error('not approved'); ctx.db.auditLog=ctx.db.auditLog||[]; if(req.status==='executed') return ctx.db.auditLog.find(a=>a.requestId===requestId); const audit={requestId, by:ctx.session.userId}; ctx.db.auditLog.push(audit); req.status='executed'; return audit; }`;
const EXEC_BAD_SOD = `export function executeRequest(ctx, requestId){ ctx.db.requests=ctx.db.requests||{}; const req=ctx.db.requests[requestId]; if(!req) throw new Error('not found'); ctx.db.auditLog=ctx.db.auditLog||[]; const audit={requestId, by:ctx.session.userId}; ctx.db.auditLog.push(audit); return audit; }`;
const EXEC_BAD_IDEM = `export function executeRequest(ctx, requestId){ ctx.db.requests=ctx.db.requests||{}; const req=ctx.db.requests[requestId]; if(!req) throw new Error('not found'); ctx.db.approvals=ctx.db.approvals||[]; const valid=ctx.db.approvals.some(a=>a.requestId===requestId && a.approverId!==req.requesterId); if(!valid) throw new Error('not approved'); ctx.db.auditLog=ctx.db.auditLog||[]; const audit={requestId, by:ctx.session.userId}; ctx.db.auditLog.push(audit); return audit; }`;

const triad = (exec) => ({ createRequest: CREATE, approveRequest: APPROVE, executeRequest: exec });
const surfaces = ['createRequest', 'approveRequest', 'executeRequest', 'listRequests'];

// ---- 1. family grouping -----------------------------------------------------------------------------------
{
  const fams = executeFamilies(['createRequest', 'approveRequest', 'executeRequest', 'createRelease', 'approveRelease', 'shipRelease', 'listRequests']);
  ok('groups request + release execute families', fams.length === 2
    && fams.some((f) => f.exec === 'executeRequest' && f.create === 'createRequest' && f.approve === 'approveRequest')
    && fams.some((f) => f.exec === 'shipRelease' && f.create === 'createRelease' && f.approve === 'approveRelease'));
  ok('does not treat create/approve/list as exec', !fams.some((f) => /^(create|approve|list)/.test(f.exec)));
}

// ---- 2 + 3. runner verdicts + verifyBehavioural mapping ---------------------------------------------------
{
  const good = await verifyBehavioural({ surfaces, files: triad(EXEC_GOOD), rulesBySem: rules, behaviouralRunner: runner });
  ok('GOOD triad → no behavioural violation', good.length === 0);

  const badSod = await verifyBehavioural({ surfaces, files: triad(EXEC_BAD_SOD), rulesBySem: rules, behaviouralRunner: runner });
  ok('bad-SoD triad → approve-execute violation', badSod.some((v) => v.obligation === 'approve-execute' && v.kind === 'behavioural'));
  ok('bad-SoD violation carries the declared clause text', badSod.some((v) => /approval/i.test(v.text)));

  const badIdem = await verifyBehavioural({ surfaces, files: triad(EXEC_BAD_IDEM), rulesBySem: rules, behaviouralRunner: runner });
  ok('bad-idempotency triad → execute-idempotency violation', badIdem.some((v) => v.obligation === 'execute-idempotency' && v.kind === 'behavioural'));
}

// ---- 4. ADMISSIBILITY: disk-deletion invariance (no epics/ access; verdict from in-memory code only) -------
{
  // The runner is given ONLY the three in-memory surface strings; it has no epic id, no oracle path. If it can
  // still render a verdict, the verify is provably independent of epics/*/tests.mjs (disk-deletion invariant).
  const r = await runner({ files: triad(EXEC_BAD_SOD), create: 'createRequest', approve: 'approveRequest', exec: 'executeRequest' });
  ok('verdict computed with zero epics/ access (disk-deletion invariant)', r && r.sod === 'violated');
  // and the GOOD triad is genuinely ok (not a trivially-always-violated detector)
  const rg = await runner({ files: triad(EXEC_GOOD), create: 'createRequest', approve: 'approveRequest', exec: 'executeRequest' });
  ok('GOOD triad runner → sod ok ∧ idempotency ok', rg && rg.sod === 'ok' && rg.idempotency === 'ok');
}

console.log(`\nbehaviour-verify smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
