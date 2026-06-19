#!/usr/bin/env node
// Zero-spend smoke for the shape-conformance gate (src/shape-gate.mjs). Deterministic, no gateway, no clock.
// Asserts: declared-shape parsing (array vs map) across the 4 topologies · access-style detection for
// ctx.db.X, db.X, and bare destructured X · map-on-array + array-on-map violations · NO false positive on
// correct/mixed/unknown access · model route-back repair clears the violation · oracle-blindness (a leak
// token in a build prompt voids). Run: node gates/shape-gate-smoke.mjs

import { parseDeclaredShapes, accessStyle, surfaceViolations, runShapeGate } from '../src/shape-gate.mjs';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error(`  FAIL: ${msg}`); } };

// ---- real public contract text (verbatim shape from the diverse-template skeletons) --------------
const QUOTA_SKEL = 'The balance of a wallet lives in `ctx.db.ledger` — an array of `{ walletId, delta, key }`. If undefined, treat as an empty array.';
const QUOTA_PRE = '- `ctx.db.users` — a Map from userId to a record.\n- `ctx.db.wallets` — a Map from walletId to a wallet record.';
const LIFE_SKEL = 'The state of a doc lives in `ctx.db.transitions` — an append-only array of `{ docId, toState }`. If undefined, treat as an empty array.';
const APPR_SKEL = 'Request approvals live in `ctx.db.approvals` — an array of `{ requestId, approverId }`. If undefined, treat as an empty array.';
const MEM_SKEL = 'Project membership lives in `ctx.db.members` — an array of records `{ projectId, userId, role }`. comment records are in `ctx.db.comments`.';
const MEM_PRE = '- `ctx.db.users` — a Map from userId to a user record.\n- `ctx.db.projects` — a Map from projectId to a project record.\n- `ctx.db.comments` — an array of comment records.';

const mkRebuild = (corrected) => async (_surface, _prompt) => corrected;
const GATE = { kind: 'deterministic', repairDepth: 2 };

// ============ 1. declared-shape parsing ============
(() => {
  const q = parseDeclaredShapes(`${QUOTA_PRE}\n${QUOTA_SKEL}`);
  ok(q.ledger === 'array', `quota: ledger parsed as array (got ${q.ledger})`);
  ok(q.users === 'map' && q.wallets === 'map', `quota: users/wallets parsed as map (got ${q.users}/${q.wallets})`);

  const l = parseDeclaredShapes(LIFE_SKEL);
  ok(l.transitions === 'array', `lifecycle: transitions parsed as array (got ${l.transitions})`);

  const a = parseDeclaredShapes(APPR_SKEL);
  ok(a.approvals === 'array', `approval: approvals parsed as array (got ${a.approvals})`);

  const m = parseDeclaredShapes(`${MEM_PRE}\n${MEM_SKEL}`);
  ok(m.members === 'array' && m.comments === 'array', `membership: members/comments parsed as array (got ${m.members}/${m.comments})`);
  ok(m.users === 'map' && m.projects === 'map', `membership: users/projects parsed as map (got ${m.users}/${m.projects})`);

  ok(Object.keys(parseDeclaredShapes('no stores here')).length === 0, 'no ctx.db mention → empty shape map');
})();

// ============ 2. access-style detection across reference forms ============
(() => {
  // ctx.db.X form
  ok(accessStyle('const x = ctx.db.ledger.get(id);', 'ledger') === 'map', 'ctx.db.X map access detected');
  ok(accessStyle('ctx.db.ledger.push({});', 'ledger') === 'array', 'ctx.db.X array access detected');
  // db.X destructured (`const { db } = ctx`) — the DOMINANT real-world form (errors show `db.ledger.get`)
  ok(accessStyle('const { db } = ctx; const b = db.ledger.get(id);', 'ledger') === 'map', 'db.X (destructured ctx) map access detected');
  ok(accessStyle('const { db } = ctx; db.ledger.filter(e => e.walletId === w);', 'ledger') === 'array', 'db.X array access detected');
  // bare X destructured (`const { ledger } = ctx.db`)
  ok(accessStyle('const { ledger } = ctx.db; const r = ledger.find(e => e.id === id);', 'ledger') === 'array', 'bare X array access detected');
  ok(accessStyle('const { ledger } = ctx.db; ledger.set(k, v);', 'ledger') === 'map', 'bare X map access detected');
  // mixed / unknown / no-cross-contamination
  ok(accessStyle('ctx.db.ledger.get(id); ctx.db.ledger.push(x);', 'ledger') === 'mixed', 'mixed access → mixed');
  ok(accessStyle('return ctx.db.ledger;', 'ledger') === 'unknown', 'bare reference w/o method → unknown');
  ok(accessStyle('ctx.db.budgetLedger.get(id);', 'ledger') === 'unknown', 'budgetLedger does not match store=ledger (no partial-name contamination)');
  ok(accessStyle('myLedger.get(id);', 'ledger') === 'unknown', 'myLedger (longer ident) does not match bare store=ledger');
  ok(accessStyle('Array.from(ctx.db.users.values()).filter(u => u.orgId === o);', 'users') === 'unknown', '.values() then .filter() on result is NOT array-on-map (correct map iteration)');
})();

// ============ 3. surfaceViolations — both contradiction directions ============
(() => {
  const qShapes = parseDeclaredShapes(`${QUOTA_PRE}\n${QUOTA_SKEL}`);
  // map-on-array: the dominant `db.ledger.get is not a function`
  const v1 = surfaceViolations('const { db } = ctx; return db.ledger.get(walletId);', qShapes);
  ok(v1.length === 1 && v1[0].store === 'ledger' && v1[0].declared === 'array' && v1[0].actual === 'map', 'map-on-array violation flagged on ledger');
  // array-on-map: `users.filter is not a function`
  const v2 = surfaceViolations('const { db } = ctx; return db.users.filter(u => u.orgId === o);', qShapes);
  ok(v2.length === 1 && v2[0].store === 'users' && v2[0].declared === 'map' && v2[0].actual === 'array', 'array-on-map violation flagged on users');
  // correct usage → no violation
  ok(surfaceViolations('ctx.db.ledger.push({}); ctx.db.users.get(id);', qShapes).length === 0, 'shape-correct surface → no violation');
  // MIXED on a declared-array store: a stray .get alongside array ops still throws → MUST flag (quota-d1 draw4)
  const vMix = surfaceViolations('const { db } = ctx; db.ledger ??= []; db.ledger.push(x); const b = db.ledger.get(walletId);', qShapes);
  ok(vMix.length === 1 && vMix[0].store === 'ledger' && vMix[0].actual === 'mixed', 'mixed map+array on an array store → flagged (the .get still throws)');
})();

// ============ 4. runShapeGate — detect + model route-back repair (quota map-on-array) ============
await (async () => {
  const files = {
    createWallet: 'export function createWallet(ctx){ return {}; }',
    listWallets: 'export function listWallets(ctx){ const { db } = ctx; return [...db.wallets.values()]; }',
    deposit: 'export function deposit(ctx,{walletId,delta}){ const { db } = ctx; db.ledger ??= new Map(); const b = db.ledger.get(walletId)||0; db.ledger.set(walletId, b+delta); }',
    withdraw: 'export function withdraw(ctx,{walletId,amount}){ const { db } = ctx; const b = db.ledger.get(walletId)||0; if(b<amount) throw new Error("insufficient"); db.ledger.set(walletId, b-amount); }',
  };
  const fixedDeposit = 'export function deposit(ctx,{walletId,delta}){ const { db } = ctx; db.ledger ??= []; db.ledger.push({walletId, delta}); }';
  const fixedWithdraw = 'export function withdraw(ctx,{walletId,amount}){ const { db } = ctx; db.ledger ??= []; const b = db.ledger.filter(e=>e.walletId===walletId).reduce((s,e)=>s+e.delta,0); if(b<amount) throw new Error("insufficient"); db.ledger.push({walletId, delta:-amount}); }';
  const rebuild = async (surface) => (surface === 'deposit' ? fixedDeposit : fixedWithdraw);
  const r = await runShapeGate({ surfaces: Object.keys(files), files, prompts: { deposit: 'build deposit', withdraw: 'build withdraw' }, skeleton: QUOTA_SKEL, baseModel: QUOTA_PRE, gate: GATE, rebuild });
  ok(r.ranGate && r.shapes.ledger === 'array', 'shape-gate ran with ledger=array');
  ok(r.surfacesFlagged === 2 && r.violations >= 2, `both deposit+withdraw flagged (surfaces=${r.surfacesFlagged}, violations=${r.violations})`);
  ok(r.repairs === 2 && files.deposit === fixedDeposit && files.withdraw === fixedWithdraw, 'model route-back repaired both surfaces to array shape');
  ok(surfaceViolations(files.deposit, r.shapes).length === 0 && surfaceViolations(files.withdraw, r.shapes).length === 0, 'post-repair: no residual shape violation');
})();

// ============ 5. no false-positive — a shape-correct epic is left untouched ============
await (async () => {
  const files = {
    deposit: 'export function deposit(ctx,{walletId,delta}){ ctx.db.ledger ??= []; ctx.db.ledger.push({walletId, delta}); }',
    withdraw: 'export function withdraw(ctx,{walletId,amount}){ ctx.db.ledger ??= []; const b = ctx.db.ledger.filter(e=>e.walletId===walletId).reduce((s,e)=>s+e.delta,0); if(b<amount) throw new Error("x"); ctx.db.ledger.push({walletId, delta:-amount}); }',
    listWallets: 'export function listWallets(ctx){ return [...ctx.db.wallets.values()]; }',
  };
  const before = { ...files };
  const r = await runShapeGate({ surfaces: Object.keys(files), files, prompts: {}, skeleton: QUOTA_SKEL, baseModel: QUOTA_PRE, gate: GATE, rebuild: mkRebuild('SHOULD-NOT-BE-CALLED') });
  ok(r.violations === 0 && r.repairs === 0, `shape-correct epic → no violations/repairs (v=${r.violations}, r=${r.repairs})`);
  ok(files.deposit === before.deposit && files.withdraw === before.withdraw && files.listWallets === before.listWallets, 'clean code left byte-for-byte unchanged');
})();

// ============ 6. membership array-on-map (vaults.filter) ============
await (async () => {
  // a membership scale skeleton that declares vaults as a Map; a surface uses .filter on it (the real d2 bug).
  const skel = 'Project membership lives in `ctx.db.members` — an array of records.';
  const pre = '- `ctx.db.vaults` — a Map from vaultId to a vault record.';
  const files = {
    listVaults: 'export function listVaults(ctx){ const { db } = ctx; return db.vaults.filter(v => v.orgId === ctx.session.orgId); }',
  };
  const fixed = 'export function listVaults(ctx){ const { db } = ctx; return [...db.vaults.values()].filter(v => v.orgId === ctx.session.orgId); }';
  const r = await runShapeGate({ surfaces: ['listVaults'], files, prompts: { listVaults: 'build listVaults' }, skeleton: skel, baseModel: pre, gate: GATE, rebuild: mkRebuild(fixed) });
  ok(r.shapes.vaults === 'map', 'membership: vaults parsed as map');
  ok(r.surfacesFlagged === 1 && r.repairs === 1 && files.listVaults === fixed, 'array-on-map (vaults.filter) flagged + repaired');
})();

// ============ 7. oracle-blindness — a leak token in a build prompt voids ============
await (async () => {
  const files = { withdraw: 'export function withdraw(ctx,{walletId}){ const { db } = ctx; return db.ledger.get(walletId); }' };
  const r = await runShapeGate({ surfaces: ['withdraw'], files, prompts: { withdraw: 'build withdraw — SEAM+ leak token' }, skeleton: QUOTA_SKEL, baseModel: QUOTA_PRE, gate: GATE, rebuild: mkRebuild('export function withdraw(){}') });
  ok(r.leak === true, 'oracle-leak token in a repair prompt → leak=true (candidate voided)');
})();

// ============ 8. gate off → no-op ============
await (async () => {
  const files = { withdraw: 'export function withdraw(ctx,{walletId}){ return ctx.db.ledger.get(walletId); }' };
  const before = { ...files };
  const r = await runShapeGate({ surfaces: ['withdraw'], files, prompts: {}, skeleton: QUOTA_SKEL, baseModel: QUOTA_PRE, gate: { kind: 'off' }, rebuild: mkRebuild('x') });
  ok(r.ranGate === false && files.withdraw === before.withdraw, 'gate.kind=off → no-op, code unchanged');
})();

console.log(`\nshape-gate-smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
