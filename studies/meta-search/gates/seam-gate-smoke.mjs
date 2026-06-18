#!/usr/bin/env node
// Zero-spend smoke for the GENERALIZED seam-gate (src/seam-gate.mjs). Deterministic, no gateway, no clock.
// Asserts: profile detection per topology · Mode-A surgical init on the declared store · Mode-B drift
// detection + model route-back · membership delegation (bit-identical to the proven gate) · no-op on an
// unknown topology · oracle-blindness (a leak in a repair prompt voids). Run: node gates/seam-gate-smoke.mjs

import { runSeamGate, resolveSeamProfile, modeCIssues } from '../src/seam-gate.mjs';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error(`  FAIL: ${msg}`); } };

// ---- fixtures (PUBLIC contract text + emitted code; oracle-blind) ---------------------------------
const SKEL = {
  approval: 'Request approvals live in `ctx.db.approvals` — an array of `{ requestId, approverId }`.',
  quota: 'The balance of a wallet lives in `ctx.db.ledger` — an array of `{ walletId, delta, key }`.',
  lifecycle: 'The state of a doc lives in `ctx.db.transitions` — an append-only array of `{ docId, toState }`.',
  membership: 'Memberships live in `ctx.db.memberships` — keyed by projectId.',
};
const PREAMBLE_APPROVAL = 'ctx.db.requests is an array of request records. ctx.db.audit is the audit store.';
// a mock rebuild that returns a fixed "corrected" module (deterministic, zero-spend) — used for Mode-B repair.
const mkRebuild = (corrected) => async (_surface, _prompt) => corrected;
const noJudge = async () => ({ text: '{"agree":true,"mismatch":""}' });
const GATE = { kind: 'deterministic', repairDepth: 2 };

// ============ 1. profile detection ============
(() => {
  const p = resolveSeamProfile(SKEL.approval, ['createRequest', 'listRequests', 'approveRequest', 'executeRequest']);
  ok(p && p.topology === 'approval' && p.store === 'approvals', 'approval profile detected (store=approvals)');
  ok(p && p.writers.includes('approveRequest') && p.readers.includes('executeRequest'), 'approval writer/reader roles');

  const q = resolveSeamProfile(SKEL.quota, ['createWallet', 'listWallets', 'deposit', 'withdraw']);
  ok(q && q.topology === 'quota' && q.store === 'ledger', 'quota profile detected (store=ledger)');
  ok(q && q.writers.includes('deposit') && q.readers.includes('withdraw'), 'quota writer/reader roles');

  const l = resolveSeamProfile(SKEL.lifecycle, ['createDoc', 'listDocs', 'advanceDoc', 'getPublic']);
  ok(l && l.topology === 'lifecycle' && l.store === 'transitions', 'lifecycle profile detected (store=transitions)');

  const m = resolveSeamProfile(SKEL.membership, ['createProject', 'listProjects', 'addMember', 'postComment']);
  ok(m && m.topology === 'membership' && m.delegate === true, 'membership profile detected + flagged for delegation');

  const none = resolveSeamProfile('no declared store here', ['foo', 'bar']);
  ok(none === null, 'unknown topology → null profile (gate no-ops)');
})();

// ============ 2. Mode A — surgical init on a non-base declared store (approval) ============
await (async () => {
  const files = {
    createRequest: 'export function createRequest(ctx,{}){ return {}; }',
    listRequests: 'export function listRequests(ctx){ return []; }',
    approveRequest: 'export function approveRequest(ctx,{requestId}){ ctx.db.approvals.push({requestId, approverId: ctx.session.userId}); }',
    executeRequest: 'export function executeRequest(ctx,{requestId}){ const a = ctx.db.approvals.find(x=>x.requestId===requestId); if(!a) throw new Error("no approval"); return true; }',
  };
  const r = await runSeamGate({
    surfaces: Object.keys(files), files, prompts: {}, skeleton: SKEL.approval, baseModel: PREAMBLE_APPROVAL,
    gate: GATE, rebuild: mkRebuild(''), judgeInvoke: noJudge,
  });
  ok(r.ranGate && r.topology === 'approval', 'approval gate ran');
  ok(r.repairs >= 2, `Mode-A init injected on both surfaces (repairs=${r.repairs})`);
  ok(/ctx\.db\.approvals\s*\?\?=\s*\[\]/.test(files.approveRequest), 'writer got defensive init `ctx.db.approvals ??= []`');
  ok(/ctx\.db\.approvals\s*\?\?=\s*\[\]/.test(files.executeRequest), 'reader got defensive init');
  ok(/\.push\(\{requestId/.test(files.approveRequest), 'writer original logic preserved (push intact)');
  ok(/throw new Error\("no approval"\)/.test(files.executeRequest), 'reader original guard preserved');
})();

// ============ 3. Mode A no false-positive when already initialized ============
await (async () => {
  const files = {
    deposit: 'export function deposit(ctx,{walletId,delta}){ ctx.db.ledger ??= []; ctx.db.ledger.push({walletId, delta, key: ctx.key}); }',
    withdraw: 'export function withdraw(ctx,{walletId,amount}){ ctx.db.ledger ??= []; const bal = ctx.db.ledger.filter(e=>e.walletId===walletId).reduce((s,e)=>s+e.delta,0); if(bal-amount<0) throw new Error("insufficient"); ctx.db.ledger.push({walletId, delta:-amount, key: ctx.key}); }',
    createWallet: 'export function createWallet(ctx){ return {}; }', listWallets: 'export function listWallets(ctx){ return []; }',
  };
  const before = { ...files };
  const r = await runSeamGate({ surfaces: Object.keys(files), files, prompts: {}, skeleton: SKEL.quota, baseModel: '', gate: GATE, rebuild: mkRebuild(''), judgeInvoke: noJudge });
  ok(r.ranGate && r.topology === 'quota', 'quota gate ran');
  ok(r.repairs === 0 && r.mismatches === 0, `clean init+agreeing-store quota pair → no repair (repairs=${r.repairs}, mismatches=${r.mismatches})`);
  ok(files.deposit === before.deposit && files.withdraw === before.withdraw, 'clean code left byte-for-byte unchanged');
})();

// ============ 4. Mode B — store-name drift detected + model route-back repair ============
await (async () => {
  const files = {
    deposit: 'export function deposit(ctx,{walletId,delta}){ ctx.db.ledger ??= []; ctx.db.ledger.push({walletId, delta}); }',
    withdraw: 'export function withdraw(ctx,{walletId,amount}){ ctx.db.balances ??= new Map(); const bal = ctx.db.balances.get(walletId)||0; if(bal<amount) throw new Error("insufficient"); ctx.db.balances.set(walletId, bal-amount); }',
    createWallet: 'export function createWallet(ctx){ return {}; }', listWallets: 'export function listWallets(ctx){ return []; }',
  };
  const corrected = 'export function withdraw(ctx,{walletId,amount}){ ctx.db.ledger ??= []; const bal = ctx.db.ledger.filter(e=>e.walletId===walletId).reduce((s,e)=>s+e.delta,0); if(bal<amount) throw new Error("insufficient"); ctx.db.ledger.push({walletId, delta:-amount}); }';
  const r = await runSeamGate({ surfaces: Object.keys(files), files, prompts: { withdraw: 'build withdraw' }, skeleton: SKEL.quota, baseModel: '', gate: GATE, rebuild: mkRebuild(corrected), judgeInvoke: noJudge });
  ok(r.mismatches >= 1, `Mode-B drift detected (reader read ctx.db.balances, writer wrote ctx.db.ledger) — mismatches=${r.mismatches}`);
  ok(r.repairs >= 1 && files.withdraw === corrected, 'model route-back applied the corrected reader (now reads ctx.db.ledger)');
})();

// ============ 5. membership delegation — runs the proven gate (init on uninit memberships store) ============
await (async () => {
  const files = {
    addMember: 'export function addMember(ctx,{projectId,userId}){ ctx.db.memberships.set(`${projectId}:${userId}`, true); }',
    postComment: 'export function postComment(ctx,{projectId}){ if(!ctx.db.memberships.has(`${projectId}:${ctx.session.userId}`)) throw new Error("not a member"); return true; }',
    createProject: 'export function createProject(ctx){ return {}; }', listProjects: 'export function listProjects(ctx){ return []; }',
  };
  const r = await runSeamGate({ surfaces: Object.keys(files), files, prompts: {}, skeleton: SKEL.membership, baseModel: 'ctx.db.projects, ctx.db.comments', gate: GATE, rebuild: mkRebuild(''), judgeInvoke: noJudge });
  ok(r.topology === 'membership' && r.ranGate, 'membership delegated to the proven integration-gate');
  ok(/ctx\.db\.memberships\s*\?\?=\s*new Map\(\)/.test(files.addMember), 'delegated gate surgical-init`d the uninit memberships store (Map)');
})();

// ============ 6. oracle-blindness — a leak token in the build prompt voids the candidate ============
await (async () => {
  const files = {
    // writer writes the declared store (init'd); reader reads a DIFFERENT store → Mode-B drift → model route-back.
    deposit: 'export function deposit(ctx,{walletId,delta}){ ctx.db.ledger ??= []; ctx.db.ledger.push({walletId, delta}); }',
    withdraw: 'export function withdraw(ctx,{walletId,amount}){ ctx.db.balances ??= new Map(); const bal = ctx.db.balances.get(walletId)||0; }',
    createWallet: 'export function createWallet(ctx){return{};}', listWallets: 'export function listWallets(ctx){return[];}',
  };
  // the reader's build prompt carries an oracle-internal token (SEAM+) → the route-back must refuse (leak=true).
  const r = await runSeamGate({ surfaces: Object.keys(files), files, prompts: { withdraw: 'SEAM+ leak token here' }, skeleton: SKEL.quota, baseModel: '', gate: GATE, rebuild: mkRebuild('export function withdraw(){}'), judgeInvoke: noJudge });
  ok(r.leak === true, 'oracle-leak token in a repair prompt → leak=true (candidate voided)');
})();

// ============ 7. Mode C hook is currently inert (documented, not yet wired) ============
ok(modeCIssues() .length === 0, 'modeCIssues hook returns [] (semantic invariants staged off until base-rate)');

console.log(`\nseam-gate-smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
