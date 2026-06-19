#!/usr/bin/env node
// Zero-spend smoke for the contract-precision gate (src/contract-gate.mjs). Deterministic, no gateway.
// Asserts: admin-scoped parsing across topologies (conservative over-inclusion) · admin-gate detection
// precision (inequality + message form; NOT the permissive `=== 'admin'`; no false-positive on a member
// check) · over-application flagged on the non-scoped surface only · model route-back repair removes it ·
// the real dumped `only admin may withdraw` pattern flagged · oracle-leak void · off=no-op.
// Run: node gates/contract-gate-smoke.mjs

import { adminScopedSurfaces, hasAdminGate, contractViolations, surgicalRemoveAdminGate, runContractGate } from '../src/contract-gate.mjs';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error(`  FAIL: ${msg}`); } };

// real public authz clauses (verbatim shape from the diverse-template skeletons)
const QUOTA = 'Authorization: only an admin may deposit (grant) credit. Conservation: a withdraw must refuse if it would drive the balance negative.';
const APPROVAL = 'Authorization & separation of duties: approve… requires the caller to be an admin and not the requester; execute… requires a valid approval — one recorded by an admin who is not the requester.';
const LIFECYCLE = 'Authorization: advancing to published or archived requires the caller to be an admin; advancing to submitted requires the caller to be the author or an admin.';
const MEMBERSHIP = 'Authorization: every add…Member requires the caller to be an admin. Every post… requires the caller to be a member of that container. updateProfile requires the caller to be the target user or an admin.';
const GATE = { kind: 'deterministic', repairDepth: 2 };
const mkRebuild = (corrected) => async () => corrected;

// ============ 1. admin-scoped parsing (conservative) ============
(() => {
  const q = adminScopedSurfaces(QUOTA, ['createWallet', 'listWallets', 'deposit', 'withdraw']);
  ok(q.has('deposit') && !q.has('withdraw') && !q.has('createWallet') && !q.has('listWallets'), `quota: only deposit admin-scoped (got ${[...q]})`);

  const a = adminScopedSurfaces(APPROVAL, ['createRequest', 'listRequests', 'approveRequest', 'executeRequest']);
  ok(a.has('approveRequest') && a.has('executeRequest') && !a.has('createRequest'), `approval: approve+execute scoped (execute over-included = safe under-flag) (got ${[...a]})`);

  const l = adminScopedSurfaces(LIFECYCLE, ['createDoc', 'listDocs', 'advanceDoc', 'getPublic']);
  ok(l.has('advanceDoc') && !l.has('getPublic') && !l.has('createDoc'), `lifecycle: advance scoped, get/create not (got ${[...l]})`);

  const m = adminScopedSurfaces(MEMBERSHIP, ['createProject', 'addProjectMember', 'postComment', 'updateProfile']);
  ok(m.has('addProjectMember') && m.has('updateProfile') && !m.has('postComment') && !m.has('createProject'), `membership: addMember+updateProfile scoped, post not (got ${[...m]})`);

  ok(adminScopedSurfaces('no authorization clause here', ['deposit', 'withdraw']).size === 0, 'no admin clause → empty scoped set');
})();

// ============ 2. admin-gate detection precision ============
(() => {
  ok(hasAdminGate("if (ctx.session.role !== 'admin') throw new Error('Unauthorized');"), 'role !== admin inequality detected');
  ok(hasAdminGate("if (role != 'admin') { throw new Error('x'); }"), 'role != admin (loose) detected');
  ok(hasAdminGate("if ('admin' !== ctx.session.role) throw new Error('no');"), 'reversed operand order detected');
  ok(hasAdminGate("if (!isAdmin(ctx)) throw new Error('only admins can withdraw');"), 'message-form (helper gate) detected');
  // precision: a PERMISSIVE positive check is NOT a refuse-gate (removing it would drop legit logic)
  ok(!hasAdminGate("const canEditOthers = ctx.session.role === 'admin'; if (target !== self && !canEditOthers) throw new Error('x');"), 'permissive `=== admin` branch NOT flagged');
  // precision: a MEMBER check is not an admin gate
  ok(!hasAdminGate("if (ctx.session.role !== 'member') throw new Error('not a member');"), 'member check is not an admin gate');
  ok(!hasAdminGate('export function deposit(ctx){ return {}; }'), 'no gate → false');
})();

// ============ 3. contractViolations — over-application flagged on the non-scoped surface only ============
(() => {
  const files = {
    deposit: "export function deposit(ctx,walletId,amount){ if (ctx.session.role !== 'admin') throw new Error('admin only'); /* CORRECT: deposit is admin-scoped */ }",
    withdraw: "export function withdraw(ctx,walletId,amount){ if (ctx.session.role !== 'admin') throw new Error('only admin may withdraw'); /* OVER-APPLIED */ }",
    listWallets: 'export function listWallets(ctx){ return []; }',
  };
  const v = contractViolations(QUOTA, Object.keys(files), files);
  ok(v.length === 1 && v[0].surface === 'withdraw', `only withdraw flagged as over-application (deposit correctly NOT flagged) (got ${v.map((x) => x.surface)})`);
  ok(v[0].scopedTo.includes('deposit'), 'violation records the contract-scoped surface (deposit)');
})();

// ============ 4. runContractGate — DETERMINISTIC surgical removal (primary path, $0, no model rebuild) ======
await (async () => {
  const files = {
    deposit: "export function deposit(ctx,walletId,amount){ if (ctx.session.role !== 'admin') throw new Error('admin only'); ctx.db.ledger ??= []; ctx.db.ledger.push({walletId, delta: amount}); }",
    // block-form over-applied admin gate + a tenancy guard that MUST survive the removal
    withdraw: "export function withdraw(ctx,walletId,amount){\n  const w = ctx.db.wallets.get(walletId);\n  if (w.orgId !== ctx.session.orgId) throw new Error('cross-org');\n  if (ctx.session.role !== 'admin') {\n    throw new Error('only admin may withdraw');\n  }\n  ctx.db.ledger ??= []; ctx.db.ledger.push({walletId, delta: -amount});\n}",
    createWallet: 'export function createWallet(ctx){ return {}; }', listWallets: 'export function listWallets(ctx){ return []; }',
  };
  const before = { ...files };
  let rebuildCalled = false;
  const r = await runContractGate({ surfaces: Object.keys(files), files, prompts: { withdraw: 'build withdraw' }, skeleton: QUOTA, gate: GATE, rebuild: async () => { rebuildCalled = true; return 'BAD'; } });
  ok(r.ranGate && r.adminScoped.includes('deposit'), 'gate ran; deposit recognized admin-scoped');
  ok(r.surfacesFlagged === 1 && r.detRepairs === 1 && !rebuildCalled, `withdraw admin-over removed DETERMINISTICALLY, no model rebuild (det=${r.detRepairs}, rebuildCalled=${rebuildCalled})`);
  ok(!hasAdminGate(files.withdraw), 'admin-only gate removed from withdraw');
  ok(files.withdraw.includes("cross-org") && files.withdraw.includes("ledger.push"), 'every OTHER guard (tenancy) + body preserved');
  ok(files.deposit === before.deposit, 'deposit (correctly admin-scoped) left byte-for-byte unchanged');
})();

// ============ 4b. single-statement inequality form (the real d8 dump shape) removed deterministically ======
(() => {
  const code = "export function withdraw(ctx){ if (session.role !== 'admin') throw new Error('Unauthorized'); return 1; }";
  const out = surgicalRemoveAdminGate(code);
  ok(out && !hasAdminGate(out) && out.includes('return 1;'), 'single-statement `if (role!==admin) throw` removed, rest kept');
  ok(surgicalRemoveAdminGate("export function f(ctx){ if (!isAdmin(ctx)) throw new Error('only admins can'); }") === null, 'message-form helper NOT surgically removed (left for model fallback)');
  ok(surgicalRemoveAdminGate("export function f(ctx){ if (ctx.session.role === 'admin') doExtra(); }") === null, 'permissive `=== admin` branch NOT removed');
})();

// ============ 4c. message-form helper / compound → MODEL route-back fallback ============
await (async () => {
  const files = { withdraw: "export function withdraw(ctx){ if (!isAdmin(ctx)) { throw new Error('only admins can withdraw'); } return 1; }" };
  const fixed = "export function withdraw(ctx){ return 1; }";
  let rebuildCalled = false;
  const r = await runContractGate({ surfaces: ['withdraw'], files, prompts: { withdraw: 'b' }, skeleton: QUOTA, gate: GATE, rebuild: async () => { rebuildCalled = true; return fixed; } });
  ok(rebuildCalled && r.detRepairs === 0 && files.withdraw === fixed, `message-form helper falls back to model route-back (det=${r.detRepairs}, rebuildCalled=${rebuildCalled})`);
})();

// ============ 5. the REAL dumped pattern (runs/dump/q1 withdraw) is flagged ============
(() => {
  const realWithdraw = "export function withdraw(ctx, walletId, amount, key) {\n  // Authorization: only admin may withdraw\n  if (ctx.session.role !== 'admin') {\n    throw new Error('Unauthorized: only admin may withdraw');\n  }\n  const ledger = ctx.db.ledger || [];\n}";
  const v = contractViolations(QUOTA, ['withdraw'], { withdraw: realWithdraw });
  ok(v.length === 1 && v[0].surface === 'withdraw', 'the real dumped over-applied withdraw is flagged');
})();

// ============ 6. oracle-blindness — leak token in the MODEL-fallback repair prompt voids ============
// (a message-form gate forces the model route-back path, where the repair prompt — and thus the leak scan — lives)
await (async () => {
  const files = { withdraw: "export function withdraw(ctx){ if (!isAdmin(ctx)) throw new Error('only admins can withdraw'); }" };
  const r = await runContractGate({ surfaces: ['withdraw'], files, prompts: { withdraw: 'build — @addMember leak token' }, skeleton: QUOTA, gate: GATE, rebuild: mkRebuild('export function withdraw(){}') });
  ok(r.leak === true, 'oracle-leak token in repair prompt → leak=true (candidate voided)');
})();

// ============ 7. gate off → no-op ============
await (async () => {
  const files = { withdraw: "export function withdraw(ctx){ if (ctx.session.role !== 'admin') throw new Error('x'); }" };
  const before = { ...files };
  const r = await runContractGate({ surfaces: ['withdraw'], files, prompts: {}, skeleton: QUOTA, gate: { kind: 'off' }, rebuild: mkRebuild('y') });
  ok(r.ranGate === false && files.withdraw === before.withdraw, 'gate.kind=off → no-op');
})();

console.log(`\ncontract-gate-smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
