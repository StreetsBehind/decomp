#!/usr/bin/env node
// Zero-spend smoke for the store-persistence gate (src/persistence-gate.mjs). Deterministic, no gateway.
// Asserts: candidate-store derivation (skeleton-declared minus base) · persistsStore precision (direct write
// vs alias-only) · persistenceViolations flags the REAL dumped d1/d4 withdraw local-copy bug and does NOT
// false-positive on the d8 withdraw (filtered copy + direct write-back) or d1 deposit (writes the store) or a
// read-only alias or an aliased-then-written-back surface or a base-store alias · surgical repair persists via
// alias + preserves guards byte-for-byte · `||`, Map-init, object-init, and `db.X` ref-form variants ·
// runPersistenceGate end-to-end (mixed files; off=no-op; no-candidate no-op).
// Run: node gates/persistence-gate-smoke.mjs

import {
  candidateStores, persistsStore, persistenceViolations, surgicalPersistRepair, runPersistenceGate,
} from '../src/persistence-gate.mjs';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error(`  FAIL: ${msg}`); } };

// public contract fragments (verbatim shape from the quota diverse-template skeleton + preamble)
const PREAMBLE = 'ctx.db.users — a Map from userId to {...}. ctx.db.wallets — a Map from walletId to {...}.';
const SKELETON = 'The balance of a wallet lives in `ctx.db.ledger` — an array of { walletId, delta, key }. If undefined, treat as an empty array.';
const GATE = { kind: 'deterministic', repairDepth: 2 };

// ---- real dumped surfaces (runs/dump/q1-cgA) — the ground truth ----
const D1_WITHDRAW = `export function withdraw(ctx, walletId, amount, key) {
  if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
    throw new Error('Amount must be a positive number');
  }
  const wallet = ctx.db.wallets.get(walletId);
  if (!wallet) { throw new Error('Wallet not found'); }
  if (wallet.orgId !== ctx.session.orgId) { throw new Error('Unauthorized: wallet belongs to another organization'); }
  const ledger = ctx.db.ledger ?? [];
  const existing = ledger.find(entry => entry.walletId === walletId && entry.key === key);
  if (existing) { return ledger.reduce((sum, e) => (e.walletId === walletId ? sum + e.delta : sum), 0); }
  const currentBalance = ledger.reduce((sum, e) => (e.walletId === walletId ? sum + e.delta : sum), 0);
  if (currentBalance - amount < 0) { throw new Error('Insufficient funds'); }
  ledger.push({ walletId, delta: -amount, key });
  return currentBalance - amount;
}`;
const D4_WITHDRAW = `export function withdraw(ctx, walletId, amount, key) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) { throw new Error('Amount must be a positive number'); }
  const wallet = ctx.db.wallets.get(walletId);
  if (!wallet) { throw new Error('Wallet not found'); }
  if (wallet.orgId !== ctx.session.orgId) { throw new Error('Wallet does not belong to caller org'); }
  const ledger = ctx.db.ledger ?? [];
  const entries = ledger.filter(e => e.walletId === walletId);
  const currentBalance = entries.reduce((s, e) => s + e.delta, 0);
  if (amount > currentBalance) { throw new Error('Insufficient funds'); }
  if (entries.some(e => e.key === key)) { return currentBalance; }
  ledger.push({ walletId, delta: -amount, key });
  return currentBalance - amount;
}`;
// d8 withdraw: a FILTERED copy (not the store) + a DIRECT write-back ctx.db.ledger.push → NOT a bug.
const D8_WITHDRAW = `export function withdraw(ctx, walletId, amount, key) {
  if (typeof amount !== 'number' || amount <= 0) throw new Error('Invalid amount');
  const wallet = ctx.db.wallets.get(walletId);
  if (!wallet) throw new Error('Wallet not found');
  const ledger = ctx.db.ledger.filter(entry => entry.walletId === walletId);
  const currentBalance = ledger.reduce((sum, entry) => sum + entry.delta, 0);
  if (currentBalance - amount < 0) throw new Error('Insufficient funds');
  if (ledger.find(entry => entry.key === key)) return { success: true, balance: currentBalance };
  ctx.db.ledger.push({ walletId, delta: -amount, key });
  return { success: true, balance: currentBalance - amount };
}`;
// d1 deposit: defensive `if (!ctx.db.ledger) ctx.db.ledger = []` + direct ctx.db.ledger.push → NOT a bug.
const D1_DEPOSIT = `export function deposit(ctx, walletId, amount, key) {
  const wallet = ctx.db.wallets.get(walletId);
  if (!wallet) { throw new Error('Wallet does not exist'); }
  if (wallet.orgId !== ctx.session.orgId) { throw new Error('Cross-org operation'); }
  if (ctx.session.role !== 'admin') { throw new Error('Unauthorized'); }
  if (typeof amount !== 'number' || amount <= 0) { throw new Error('Invalid amount'); }
  if (!ctx.db.ledger) { ctx.db.ledger = []; }
  if (ctx.db.ledger.find(e => e.walletId === walletId && e.key === key)) { return { balance: 0 }; }
  ctx.db.ledger.push({ walletId, delta: amount, key });
  return { balance: 0 };
}`;

// ============ 1. candidateStores (skeleton-declared minus base) ============
(() => {
  const c = candidateStores(SKELETON, PREAMBLE);
  ok(c.includes('ledger') && !c.includes('users') && !c.includes('wallets'), `ledger is a candidate, base stores are not (got ${JSON.stringify(c)})`);
  ok(candidateStores('no ctx.db mentions here', PREAMBLE).length === 0, 'skeleton with no declared store → no candidates');
})();

// ============ 2. persistsStore precision ============
(() => {
  ok(persistsStore('ctx.db.ledger ??= []; ctx.db.ledger.push(x);', 'ledger'), '??= persists');
  ok(persistsStore('if (!ctx.db.ledger) ctx.db.ledger = []; ctx.db.ledger.push(x);', 'ledger'), 'direct assign persists');
  ok(persistsStore('ctx.db.ledger.push({a:1});', 'ledger'), 'direct .push persists');
  ok(persistsStore('ctx.db.balances.set(k, v);', 'balances'), 'direct .set persists');
  ok(!persistsStore('const ledger = ctx.db.ledger ?? []; ledger.push(x);', 'ledger'), 'alias-only does NOT count as persisting');
  ok(!persistsStore('if (ctx.db.ledger === undefined) {}', 'ledger'), 'comparison (===) is not an assignment');
  ok(!persistsStore('return ctx.db.ledger.reduce((s,e)=>s+e,0);', 'ledger'), 'read-only .reduce is not a write-back');
})();

// ============ 3. persistenceViolations — flag the real bug, no false positives ============
(() => {
  const stores = ['ledger'];
  ok(persistenceViolations(D1_WITHDRAW, stores).length === 1, 'd1 withdraw local-copy bug flagged');
  ok(persistenceViolations(D4_WITHDRAW, stores).length === 1, 'd4 withdraw local-copy bug flagged');
  ok(persistenceViolations(D8_WITHDRAW, stores).length === 0, 'd8 withdraw (filtered copy + direct write-back) NOT flagged');
  ok(persistenceViolations(D1_DEPOSIT, stores).length === 0, 'd1 deposit (writes ctx.db.ledger directly) NOT flagged');
  // read-only alias → no mutation → not a bug
  ok(persistenceViolations('export function f(ctx){ const ledger = ctx.db.ledger ?? []; return ledger.filter(e => e.walletId === id); }', stores).length === 0, 'read-only alias NOT flagged');
  // aliased, mutated, but WRITTEN BACK → persists → not a bug
  ok(persistenceViolations('export function f(ctx){ const ledger = ctx.db.ledger ?? []; ledger.push(x); ctx.db.ledger = ledger; }', stores).length === 0, 'alias + write-back NOT flagged');
  // base-store alias → fallback never fires → not a bug
  ok(persistenceViolations('export function f(ctx){ const users = ctx.db.users ?? new Map(); users.set(k, v); }', ['users'], new Set(['users'])).length === 0, 'base-store alias skipped');
  // detail records the store + local + ref + init
  const v = persistenceViolations(D1_WITHDRAW, stores)[0];
  ok(v.store === 'ledger' && v.localName === 'ledger' && v.ref === 'ctx.db.ledger' && v.init === '[]', `violation detail (store/local/ref/init) (got ${JSON.stringify({ s: v.store, l: v.localName, r: v.ref, i: v.init })})`);
})();

// ============ 4. variants — ||, Map init, object init, db.X ref form ============
(() => {
  ok(persistenceViolations('export function f(ctx){ const ledger = ctx.db.ledger || []; ledger.push(x); }', ['ledger']).length === 1, '|| fallback flagged');
  ok(persistenceViolations('export function f(ctx){ const m = ctx.db.balances ?? new Map(); m.set(k, v); }', ['balances']).length === 1, 'Map-init fallback + .set flagged');
  ok(persistenceViolations('export function f(ctx){ const b = ctx.db.balances || {}; b[k] = v; }', ['balances']).length === 1, 'object-init fallback + keyed write flagged');
  ok(persistenceViolations('export function f(ctx){ const { db } = ctx; const ledger = db.ledger ?? []; ledger.push(x); }', ['ledger']).length === 1, 'db.X destructured ref-form flagged');
  // bare-store destructure-with-default is OUT OF SCOPE → not flagged (zero false positives)
  ok(persistenceViolations('export function f(ctx){ const { ledger = [] } = ctx.db; ledger.push(x); }', ['ledger']).length === 0, 'bare destructure default NOT flagged (out of scope)');
})();

// ============ 5. surgicalPersistRepair — persists via alias, preserves guards ============
(() => {
  const v = persistenceViolations(D1_WITHDRAW, ['ledger'])[0];
  const fixed = surgicalPersistRepair(D1_WITHDRAW, v);
  ok(fixed.includes('ctx.db.ledger ??= []; const ledger = ctx.db.ledger'), 'repair rewrites the declaration to persist via alias');
  ok(persistsStore(fixed, 'ledger') && persistenceViolations(fixed, ['ledger']).length === 0, 'repaired code persists + no residual violation');
  ok(fixed.includes("throw new Error('Insufficient funds')") && fixed.includes("ledger.push({ walletId, delta: -amount, key })"), 'conservation guard + push preserved byte-for-byte');
  // || → ??= ; db.X ref form
  const v2 = persistenceViolations('const x = ctx.db.ledger || []; x.push(1);', ['ledger'])[0];
  ok(surgicalPersistRepair('const x = ctx.db.ledger || []; x.push(1);', v2) === 'ctx.db.ledger ??= []; const x = ctx.db.ledger; x.push(1);', 'repair normalizes || to ??= and binds local');
  const v3 = persistenceViolations('const ledger = db.ledger ?? []; ledger.push(1);', ['ledger'])[0];
  ok(surgicalPersistRepair('const ledger = db.ledger ?? []; ledger.push(1);', v3) === 'db.ledger ??= []; const ledger = db.ledger; ledger.push(1);', 'repair keeps the db.X ref form');
})();

// ============ 6. runPersistenceGate end-to-end ============
await (async () => {
  const files = { deposit: D1_DEPOSIT, withdraw: D1_WITHDRAW, createWallet: 'export function createWallet(ctx){ return {}; }' };
  const before = { ...files };
  const r = await runPersistenceGate({ surfaces: Object.keys(files), files, skeleton: SKELETON, baseModel: PREAMBLE, gate: GATE });
  ok(r.ranGate && r.stores.includes('ledger'), 'gate ran; ledger is the candidate store');
  ok(r.surfacesFlagged === 1 && r.violations === 1 && r.repairs === 1, `only withdraw flagged + repaired (flagged=${r.surfacesFlagged}, viol=${r.violations}, repairs=${r.repairs})`);
  ok(files.deposit === before.deposit && files.createWallet === before.createWallet, 'correct surfaces left byte-for-byte unchanged');
  ok(persistsStore(files.withdraw, 'ledger') && persistenceViolations(files.withdraw, ['ledger']).length === 0, 'withdraw now persists; no residual');
})();

// ============ 7. off → no-op ; no-candidate → no-op ============
await (async () => {
  const files = { withdraw: D1_WITHDRAW };
  const before = { ...files };
  const rOff = await runPersistenceGate({ surfaces: ['withdraw'], files, skeleton: SKELETON, baseModel: PREAMBLE, gate: { kind: 'off' } });
  ok(rOff.ranGate === false && files.withdraw === before.withdraw, 'gate.kind=off → no-op');

  const files2 = { withdraw: D1_WITHDRAW };
  const b2 = { ...files2 };
  const rNoCand = await runPersistenceGate({ surfaces: ['withdraw'], files: files2, skeleton: 'no declared store', baseModel: PREAMBLE, gate: GATE });
  ok(rNoCand.ranGate === false && files2.withdraw === b2.withdraw, 'no candidate store → no-op');
})();

console.log(`\npersistence-gate-smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
