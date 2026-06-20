#!/usr/bin/env node
// Zero-spend smoke for the obligation-contract lever (src/obligation-contract.mjs). Deterministic, no gateway.
// Asserts, against the REAL on-disk diverse-template skeletons:
//   1. parseCrosscutRules categorizes the skeleton's own taxonomy across quota/approval/lifecycle.
//   2. deriveSurfaceContract — the SAME admin rule yields an OBLIGATION on the scoped surface (deposit/approve)
//      and a RESTRICTION on the unscoped one (withdraw/create); universal rules (tenancy) apply everywhere;
//      semantic rules (conservation/legal-transition) ride along but are tagged for inject-only.
//   3. injectBlock renders obligations + restrictions + run conditions, and does NOT leak (K3).
//   4. verifySurface — flags MISSING form obligations + INVENTED restriction; passes clean code; NEVER flags a
//      semantic obligation (oracle-blind-unreachable).
//   5. runObligationContract — deterministic verify→repair loop clears violations; off=no-op.
//   6. oracle-blindness — the K3 guard FIRES on a planted oracle token in the repair prompt (positive control).
// Run: node studies/meta-search/gates/obligation-contract-smoke.mjs

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { scanOracleLeak } from '../src/checker.mjs';
import {
  parseCrosscutRules, deriveSurfaceContract, injectBlock, verifySurface, runObligationContract, SEMANTIC_CATEGORIES,
} from '../src/obligation-contract.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const EPICS = path.resolve(HERE, '..', 'epics');
const readSkel = (id) => fs.readFileSync(path.join(EPICS, id, 'skeleton.md'), 'utf8');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error(`  FAIL: ${msg}`); } };
const cats = (list) => new Set(list.map((x) => x.category));
const eqSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

const QUOTA = readSkel('quota-d1');
const APPROVAL = readSkel('approval-d1');
const LIFECYCLE = readSkel('lifecycle-d1');
const QSURF = ['createWallet', 'listWallets', 'deposit', 'withdraw'];
const ASURF = ['createRequest', 'listRequests', 'approveRequest', 'executeRequest'];
const LSURF = ['createDoc', 'listDocs', 'advanceDoc', 'getPublic'];
const GATE = { kind: 'deterministic', repairDepth: 2 };

// ============ 1. parseCrosscutRules — the skeleton's own taxonomy ============
(() => {
  const q = cats(parseCrosscutRules(QUOTA));
  ok(['tenancy', 'input-validation', 'authz', 'conservation', 'idempotency'].every((c) => q.has(c)), `quota rules parsed (got ${[...q]})`);
  const a = cats(parseCrosscutRules(APPROVAL));
  ok(['tenancy', 'input-validation', 'authz', 'idempotency', 'audit'].every((c) => a.has(c)), `approval rules parsed (got ${[...a]})`);
  const l = cats(parseCrosscutRules(LIFECYCLE));
  ok(['tenancy', 'input-validation', 'authz', 'legal-transition', 'gated-read'].every((c) => l.has(c)), `lifecycle rules parsed (got ${[...l]})`);
  ok(parseCrosscutRules('no rules here, just prose.').length === 0, 'no bullets → empty');
})();

// ============ 2. deriveSurfaceContract — obligation vs restriction from the SAME admin rule ============
(() => {
  const wd = deriveSurfaceContract(QUOTA, 'withdraw', QSURF);
  const wdObl = cats(wd.obligations);
  ok(wdObl.has('tenancy') && wdObl.has('input-validation') && wdObl.has('idempotency'), `withdraw obligations incl tenancy/validation/idempotency (got ${[...wdObl]})`);
  ok(!wdObl.has('authz'), 'withdraw has NO authz obligation (admin scoped to deposit, not withdraw)');
  ok(wd.restrictions.some((r) => r.category === 'authz'), 'withdraw carries the authz RESTRICTION (do not invent only-admin)');
  ok(wd.runConditions.includes('ledger'), `withdraw runConditions name ctx.db.ledger (got ${wd.runConditions})`);

  const dp = deriveSurfaceContract(QUOTA, 'deposit', QSURF);
  ok(cats(dp.obligations).has('authz'), 'deposit HAS the authz obligation (admin required)');
  ok(dp.restrictions.length === 0, 'deposit has NO authz restriction (it IS admin-scoped) — the dual of withdraw');

  // semantic rule rides along on obligations (for inject) but is tagged semantic.
  ok(wd.obligations.some((o) => o.category === 'conservation' && SEMANTIC_CATEGORIES.has(o.category)), 'withdraw conservation obligation present + tagged semantic');

  // approval: execute is the obligation-dense seam surface.
  const ex = deriveSurfaceContract(APPROVAL, 'executeRequest', ASURF);
  const exObl = cats(ex.obligations);
  ok(exObl.has('authz') && exObl.has('idempotency') && exObl.has('audit') && exObl.has('tenancy'), `execute obligations incl authz/idempotency/audit/tenancy (got ${[...exObl]})`);
  const cr = deriveSurfaceContract(APPROVAL, 'createRequest', ASURF);
  ok(cats(cr.obligations).has('input-validation'), 'createRequest has the input-validation obligation');
  ok(cr.restrictions.some((r) => r.category === 'authz'), 'createRequest carries the authz restriction (not admin-scoped)');

  // lifecycle: tenancy universal everywhere; advance carries authz.
  ok(cats(deriveSurfaceContract(LIFECYCLE, 'getPublic', LSURF).obligations).has('tenancy'), 'lifecycle getPublic has universal tenancy obligation');
})();

// ============ 3. injectBlock — content + oracle-blindness ============
(() => {
  const wd = deriveSurfaceContract(QUOTA, 'withdraw', QSURF);
  const block = injectBlock(wd);
  ok(/cross-cutting obligations/i.test(block) && /tenancy/.test(block) && /idempotency/.test(block), 'inject block renders obligations');
  ok(/Do NOT invent/i.test(block) && /admin/i.test(block), 'inject block renders the no-admin restriction');
  ok(/ctx\.db\.ledger/.test(block), 'inject block names the run-condition store');
  ok(scanOracleLeak(block) === false, 'inject block (from PUBLIC skeleton) does NOT leak any oracle token');
  ok(scanOracleLeak(JSON.stringify(wd)) === false, 'derived contract carries no oracle token');
})();

// ============ 4. verifySurface — missing / invented / clean / semantic-skip ============
(() => {
  const wd = deriveSurfaceContract(QUOTA, 'withdraw', QSURF);

  const barebones = `export function withdraw(ctx, walletId, amount, key) {
    const ledger = ctx.db.ledger || [];
    ledger.push({ walletId, delta: -amount, key });
    return { ok: true };
  }`;
  const vb = verifySurface('withdraw', barebones, wd);
  ok(eqSet(cats(vb), new Set(['tenancy', 'input-validation', 'idempotency'])), `barebones withdraw flags tenancy+validation+idempotency (got ${vb.map((v) => `${v.kind}:${v.category}`)})`);
  ok(!cats(vb).has('conservation'), 'conservation (semantic) is NOT flagged even though clearly absent — oracle-blind discipline');
  ok(vb.every((v) => v.kind === 'missing'), 'all barebones violations are MISSING');

  const clean = `export function withdraw(ctx, walletId, amount, key) {
    if (typeof amount !== 'number' || amount <= 0) throw new Error('invalid amount');
    const wallet = ctx.db.wallets.get(walletId);
    if (!wallet) throw new Error('no wallet');
    if (wallet.orgId !== ctx.session.orgId) throw new Error('cross-org');
    ctx.db.ledger ??= [];
    if (ctx.db.ledger.some((e) => e.key === key)) return { ok: true };
    ctx.db.ledger.push({ walletId, delta: -amount, key });
    return { ok: true };
  }`;
  ok(verifySurface('withdraw', clean, wd).length === 0, 'clean withdraw passes (no false positives)');

  const invented = clean.replace("if (typeof amount", "if (ctx.session.role !== 'admin') throw new Error('only admin may withdraw');\n    if (typeof amount");
  const vi = verifySurface('withdraw', invented, wd);
  ok(vi.length === 1 && vi[0].kind === 'invented' && vi[0].category === 'authz', `over-applied admin gate flagged as INVENTED authz only (got ${vi.map((v) => `${v.kind}:${v.category}`)})`);

  // deposit: the SAME admin rule is now a MISSING obligation when absent.
  const dp = deriveSurfaceContract(QUOTA, 'deposit', QSURF);
  const depNoAuthz = `export function deposit(ctx, walletId, amount, key) {
    if (typeof amount !== 'number' || amount <= 0) throw new Error('x');
    const w = ctx.db.wallets.get(walletId);
    if (w.orgId !== ctx.session.orgId) throw new Error('cross-org');
    ctx.db.ledger ??= [];
    if (ctx.db.ledger.some((e) => e.key === key)) return;
    ctx.db.ledger.push({ walletId, delta: amount, key });
  }`;
  ok(cats(verifySurface('deposit', depNoAuthz, dp)).has('authz'), 'deposit missing admin gate → MISSING authz (the obligation half of the same rule)');

  // tenancy FIELD-DRIFT (the causality-probe finding): a surface that reads the WRONG session field
  // (ctx.session.organizationId) while still naming orgId as a record property must be FLAGGED — a bare
  // /orgId/ token-presence check passed it (the P1 leniency); the session-sourced check catches it.
  const cw = deriveSurfaceContract(QUOTA, 'createWallet', QSURF);
  const drifted = `export function createWallet(ctx, name) {
    const orgId = ctx.session.organizationId;
    const wallet = { id: genId(), name, orgId, ownerId: orgId };
    ctx.db.wallets ??= new Map();
    ctx.db.wallets.set(wallet.id, wallet);
    return wallet;
  }`;
  ok(cats(verifySurface('createWallet', drifted, cw)).has('tenancy'), 'tenancy field-drift (ctx.session.organizationId) is FLAGGED despite naming orgId');
  const correctDirect = `export function createWallet(ctx, name) {
    const wallet = { id: genId(), name, orgId: ctx.session.orgId };
    ctx.db.wallets ??= new Map(); ctx.db.wallets.set(wallet.id, wallet); return wallet;
  }`;
  const correctDestructure = `export function createWallet(ctx, name) {
    const { orgId } = ctx.session;
    const wallet = { id: genId(), name, orgId };
    ctx.db.wallets ??= new Map(); ctx.db.wallets.set(wallet.id, wallet); return wallet;
  }`;
  ok(!cats(verifySurface('createWallet', correctDirect, cw)).has('tenancy'), 'ctx.session.orgId (direct) passes tenancy — no false positive');
  ok(!cats(verifySurface('createWallet', correctDestructure, cw)).has('tenancy'), '{ orgId } = ctx.session (destructure) passes tenancy — no false positive');

  // approval execute: dense obligations.
  const ex = deriveSurfaceContract(APPROVAL, 'executeRequest', ASURF);
  const exBare = `export function executeRequest(ctx, requestId) {
    const req = ctx.db.requests.get(requestId);
    ctx.db.requests.set(requestId, { ...req, done: true });
    return req;
  }`;
  ok(eqSet(cats(verifySurface('executeRequest', exBare, ex)), new Set(['tenancy', 'authz', 'idempotency', 'audit'])), `barebones execute flags tenancy/authz/idempotency/audit (got ${verifySurface('executeRequest', exBare, ex).map((v) => v.category)})`);
})();

// ============ 5. runObligationContract — verify→repair loop + off=no-op ============
await (async () => {
  const barebones = `export function withdraw(ctx, walletId, amount, key) {
    const ledger = ctx.db.ledger || [];
    ledger.push({ walletId, delta: -amount, key });
  }`;
  const fixed = `export function withdraw(ctx, walletId, amount, key) {
    if (typeof amount !== 'number' || amount <= 0) throw new Error('invalid');
    const w = ctx.db.wallets.get(walletId);
    if (w.orgId !== ctx.session.orgId) throw new Error('cross-org');
    ctx.db.ledger ??= [];
    if (ctx.db.ledger.some((e) => e.key === key)) return;
    ctx.db.ledger.push({ walletId, delta: -amount, key });
  }`;
  const files = { withdraw: barebones };
  let rebuildCalls = 0;
  const r = await runObligationContract({ surfaces: ['withdraw'], files, prompts: { withdraw: 'build withdraw' }, skeleton: QUOTA, gate: GATE, rebuild: async () => { rebuildCalls++; return fixed; } });
  ok(r.ranGate && r.surfacesFlagged === 1 && r.missing === 3 && r.repairs === 1, `verify→repair: 1 surface flagged, 3 missing, 1 repair (got flagged=${r.surfacesFlagged} missing=${r.missing} repairs=${r.repairs})`);
  ok(files.withdraw === fixed && verifySurface('withdraw', files.withdraw, deriveSurfaceContract(QUOTA, 'withdraw', QSURF)).length === 0, 'repaired code now conformant');
  ok(rebuildCalls === 1, 'exactly one route-back (clean after first repair)');

  const off = { withdraw: barebones };
  const ro = await runObligationContract({ surfaces: ['withdraw'], files: off, prompts: {}, skeleton: QUOTA, gate: { kind: 'off' }, rebuild: async () => fixed });
  ok(ro.ranGate === false && off.withdraw === barebones, 'gate.kind=off → no-op');
})();

// ============ 6. oracle-blindness — K3 guard FIRES on a planted token (positive control) ============
await (async () => {
  ok(scanOracleLeak('build withdraw @postComment') === true, 'positive control: scanOracleLeak catches the planted token');
  const files = { withdraw: `export function withdraw(ctx){ ctx.db.ledger.push({}); }` };
  const r = await runObligationContract({ surfaces: ['withdraw'], files, prompts: { withdraw: 'build withdraw @postComment leak' }, skeleton: QUOTA, gate: GATE, rebuild: async () => 'export function withdraw(){}' });
  ok(r.leak === true, 'oracle token in the repair prompt → leak=true (candidate voided)');
})();

console.log(`\nobligation-contract-smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
