// ============================================================================
// DIVERSE EPIC TEMPLATE #4 — the QUOTA / conservation seam (P3 prerequisite).
// ============================================================================
//
// A FOURTH distinct seam topology. The cross-surface invariant is ARITHMETIC CONSERVATION of a counter: a
// wallet's balance is the sum of a deposit/withdraw ledger; the gate surface (withdraw) must refuse to
// overspend (balance never goes negative) and must be IDEMPOTENT on a client key (a replayed charge applies
// once). This is a numeric conservation + exactly-once invariant — distinct from set-membership (#1),
// two-party authorization (#2), and state-ordering (#3).
//
// HIDDEN seam representation (representation-agnostic): the balance lives in a deposit/withdraw ledger
// `ctx.db[ledgerDb]` whose internal shape is the surfaces' own choice. The grader NEVER reads the ledger or
// any balance field — it observes the balance purely BEHAVIORALLY (what a subsequent withdraw accepts or
// refuses), so a surface that drifts its accounting between deposit and withdraw is caught. It MAY read the
// canonical wallet store (named in the skeleton).
//
// Obligation classes: tenancy, input-validation (positive amounts), authz (only admin deposits/grants), and
// the CONSERVATION + idempotency seam. Additive under studies/meta-search/.

import assert from 'node:assert/strict';
import { makeRng } from '../src/rng.mjs';

export const WALLET_CATALOG = [
  { key: 'wallet', createFn: 'createWallet', listFn: 'listWallets', depositFn: 'deposit', withdrawFn: 'withdraw',
    walletsDb: 'wallets', ledgerDb: 'ledger', idArg: 'walletId', word: 'wallet' },
  { key: 'budget', createFn: 'createBudget', listFn: 'listBudgets', depositFn: 'fund', withdrawFn: 'charge',
    walletsDb: 'budgets', ledgerDb: 'budgetLedger', idArg: 'budgetId', word: 'budget' },
  { key: 'meter', createFn: 'createMeter', listFn: 'listMeters', depositFn: 'topUp', withdrawFn: 'consume',
    walletsDb: 'meters', ledgerDb: 'meterLedger', idArg: 'meterId', word: 'meter' },
  { key: 'voucher', createFn: 'createVoucher', listFn: 'listVouchers', depositFn: 'loadVoucher', withdrawFn: 'redeemVoucher',
    walletsDb: 'vouchers', ledgerDb: 'voucherLedger', idArg: 'voucherId', word: 'voucher' },
  { key: 'allowance', createFn: 'createAllowance', listFn: 'listAllowances', depositFn: 'fundAllowance', withdrawFn: 'spendAllowance',
    walletsDb: 'allowances', ledgerDb: 'allowanceLedger', idArg: 'allowanceId', word: 'allowance' },
  { key: 'plan', createFn: 'createPlan', listFn: 'listPlans', depositFn: 'creditPlan', withdrawFn: 'debitPlan',
    walletsDb: 'plans', ledgerDb: 'planLedger', idArg: 'planId', word: 'plan' },
  { key: 'pool', createFn: 'createPool', listFn: 'listPools', depositFn: 'fillPool', withdrawFn: 'drawPool',
    walletsDb: 'pools', ledgerDb: 'poolLedger', idArg: 'poolId', word: 'pool' },
  { key: 'tank', createFn: 'createTank', listFn: 'listTanks', depositFn: 'fillTank', withdrawFn: 'drainTank',
    walletsDb: 'tanks', ledgerDb: 'tankLedger', idArg: 'tankId', word: 'tank' },
];
export const MAX_WALLET_DOMAINS = WALLET_CATALOG.length;
export function walletDomainsFor(d) {
  const n = Math.max(1, Math.min(Number(d) || 1, WALLET_CATALOG.length));
  return WALLET_CATALOG.slice(0, n);
}
export function walletDomainsWindow(start, size) {
  const c = WALLET_CATALOG, n = c.length, s = (((Number(start) || 0) % n) + n) % n, k = Math.max(1, Math.min(Number(size) || 1, n));
  const out = []; for (let i = 0; i < k; i++) out.push(c[(s + i) % n]); return out;
}

const BAL_SRC = (idArg, ledgerDb) => `let bal=0; for(const e of ctx.db.${ledgerDb}) if(e.${idArg}===${idArg}) bal+=e.delta;`;

function refFor(d) {
  const { createFn, listFn, depositFn, withdrawFn, walletsDb, ledgerDb, idArg, key } = d;
  return {
    [createFn]: `export function ${createFn}(ctx, input){ const id='${key}-'+Math.random().toString(36).slice(2); const w={ id, orgId:ctx.session.orgId, ownerId:ctx.session.userId, name:input&&input.name }; ctx.db.${walletsDb}.set(id, w); return w; }`,
    [listFn]: `export function ${listFn}(ctx){ return [...ctx.db.${walletsDb}.values()].filter(x=>x.orgId===ctx.session.orgId); }`,
    [depositFn]: `export function ${depositFn}(ctx, ${idArg}, amount, key){ const w=ctx.db.${walletsDb}.get(${idArg}); if(!w) throw new Error('no wallet'); if(w.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(ctx.session.role!=='admin') throw new Error('forbidden'); if(!(amount>0)) throw new Error('bad amount'); if(!Array.isArray(ctx.db.${ledgerDb})) ctx.db.${ledgerDb}=[]; if(key && ctx.db.${ledgerDb}.some(e=>e.key===key)) return { ${idArg}, applied:false }; ctx.db.${ledgerDb}.push({ ${idArg}, delta:amount, key }); return { ${idArg}, applied:true }; }`,
    [withdrawFn]: `export function ${withdrawFn}(ctx, ${idArg}, amount, key){ const w=ctx.db.${walletsDb}.get(${idArg}); if(!w) throw new Error('no wallet'); if(w.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!(amount>0)) throw new Error('bad amount'); if(!Array.isArray(ctx.db.${ledgerDb})) ctx.db.${ledgerDb}=[]; if(key && ctx.db.${ledgerDb}.some(e=>e.key===key)) return { ${idArg}, applied:false }; ${BAL_SRC(idArg, ledgerDb)} if(bal<amount) throw new Error('insufficient'); ctx.db.${ledgerDb}.push({ ${idArg}, delta:-amount, key }); return { ${idArg}, applied:true }; }`,
  };
}

export function quotaRefImpls(domains = walletDomainsFor(1)) {
  const out = {}; for (const d of domains) Object.assign(out, refFor(d)); return out;
}

function mutantsFor(d) {
  const { createFn, listFn, depositFn, withdrawFn, walletsDb, ledgerDb, idArg } = d;
  const ref = refFor(d);
  const swap = (fn, body) => ({ ...ref, [fn]: body });
  const crosscut = [
    { id: `cx_tenancy_create_orgid_${d.key}`, body: swap(createFn, `export function ${createFn}(ctx, input){ const id='x-'+Math.random().toString(36).slice(2); const w={ id, orgId:(input&&input.orgId)||ctx.session.orgId, ownerId:ctx.session.userId, name:input&&input.name }; ctx.db.${walletsDb}.set(id, w); return w; }`) },
    { id: `cx_validation_withdraw_negative_${d.key}`, body: swap(withdrawFn, `export function ${withdrawFn}(ctx, ${idArg}, amount, key){ const w=ctx.db.${walletsDb}.get(${idArg}); if(!w) throw new Error('no wallet'); if(w.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${ledgerDb})) ctx.db.${ledgerDb}=[]; if(key && ctx.db.${ledgerDb}.some(e=>e.key===key)) return { ${idArg}, applied:false }; ${BAL_SRC(idArg, ledgerDb)} if(bal<amount) throw new Error('insufficient'); ctx.db.${ledgerDb}.push({ ${idArg}, delta:-amount, key }); return { ${idArg}, applied:true }; }`) },
    { id: `cx_tenancy_list_all_${d.key}`, body: swap(listFn, `export function ${listFn}(ctx){ return [...ctx.db.${walletsDb}.values()]; }`) },
    { id: `cx_authz_deposit_norole_${d.key}`, body: swap(depositFn, `export function ${depositFn}(ctx, ${idArg}, amount, key){ const w=ctx.db.${walletsDb}.get(${idArg}); if(!w) throw new Error('no wallet'); if(w.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!(amount>0)) throw new Error('bad amount'); if(!Array.isArray(ctx.db.${ledgerDb})) ctx.db.${ledgerDb}=[]; if(key && ctx.db.${ledgerDb}.some(e=>e.key===key)) return { ${idArg}, applied:false }; ctx.db.${ledgerDb}.push({ ${idArg}, delta:amount, key }); return { ${idArg}, applied:true }; }`) },
    { id: `cx_tenancy_withdraw_crossorg_${d.key}`, body: swap(withdrawFn, `export function ${withdrawFn}(ctx, ${idArg}, amount, key){ const w=ctx.db.${walletsDb}.get(${idArg}); if(!w) throw new Error('no wallet'); if(!(amount>0)) throw new Error('bad amount'); if(!Array.isArray(ctx.db.${ledgerDb})) ctx.db.${ledgerDb}=[]; if(key && ctx.db.${ledgerDb}.some(e=>e.key===key)) return { ${idArg}, applied:false }; ${BAL_SRC(idArg, ledgerDb)} if(bal<amount) throw new Error('insufficient'); ctx.db.${ledgerDb}.push({ ${idArg}, delta:-amount, key }); return { ${idArg}, applied:true }; }`) },
  ];
  const integration = [
    // overspend: no balance check → withdraw can drive the balance negative
    { id: `in_overspend_${d.key}`, body: swap(withdrawFn, `export function ${withdrawFn}(ctx, ${idArg}, amount, key){ const w=ctx.db.${walletsDb}.get(${idArg}); if(!w) throw new Error('no wallet'); if(w.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!(amount>0)) throw new Error('bad amount'); if(!Array.isArray(ctx.db.${ledgerDb})) ctx.db.${ledgerDb}=[]; if(key && ctx.db.${ledgerDb}.some(e=>e.key===key)) return { ${idArg}, applied:false }; ctx.db.${ledgerDb}.push({ ${idArg}, delta:-amount, key }); return { ${idArg}, applied:true }; }`) },
    // accounting drift: withdraw reads a w.balance field the deposit surface never maintains (deposit writes the ledger)
    { id: `in_balance_drift_${d.key}`, body: swap(withdrawFn, `export function ${withdrawFn}(ctx, ${idArg}, amount, key){ const w=ctx.db.${walletsDb}.get(${idArg}); if(!w) throw new Error('no wallet'); if(w.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!(amount>0)) throw new Error('bad amount'); if(!Array.isArray(ctx.db.${ledgerDb})) ctx.db.${ledgerDb}=[]; if(key && ctx.db.${ledgerDb}.some(e=>e.key===key)) return { ${idArg}, applied:false }; const bal=(w.balance||0); if(bal<amount) throw new Error('insufficient'); ctx.db.${ledgerDb}.push({ ${idArg}, delta:-amount, key }); return { ${idArg}, applied:true }; }`) },
    // non-idempotent: ignores the client key → a replayed charge applies twice
    { id: `in_nonidempotent_withdraw_${d.key}`, body: swap(withdrawFn, `export function ${withdrawFn}(ctx, ${idArg}, amount, key){ const w=ctx.db.${walletsDb}.get(${idArg}); if(!w) throw new Error('no wallet'); if(w.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!(amount>0)) throw new Error('bad amount'); if(!Array.isArray(ctx.db.${ledgerDb})) ctx.db.${ledgerDb}=[]; ${BAL_SRC(idArg, ledgerDb)} if(bal<amount) throw new Error('insufficient'); ctx.db.${ledgerDb}.push({ ${idArg}, delta:-amount, key }); return { ${idArg}, applied:true }; }`) },
    // deposit not persisted: returns success but records nothing → granted credit vanishes
    { id: `in_deposit_nopersist_${d.key}`, body: swap(depositFn, `export function ${depositFn}(ctx, ${idArg}, amount, key){ const w=ctx.db.${walletsDb}.get(${idArg}); if(!w) throw new Error('no wallet'); if(w.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(ctx.session.role!=='admin') throw new Error('forbidden'); if(!(amount>0)) throw new Error('bad amount'); return { ${idArg}, applied:true }; }`) },
  ];
  return { crosscut, integration };
}

export function quotaMutants(domains = walletDomainsFor(1)) {
  const out = [];
  for (const d of domains) { const m = mutantsFor(d); for (const x of m.crosscut) out.push({ ...x, target: 'crosscut' }); for (const x of m.integration) out.push({ ...x, target: 'integration' }); }
  return out;
}

// ---- the INDEPENDENT property-based grader (balance observed BEHAVIORALLY) ---------------------------
const ROOT = makeRng(0x9007a11);
const CX_TRIALS = 14;
const IN_TRIALS = 10;
const ORG_KEYS = ['oa', 'ob', 'oc'];
const mkUser = (tag, orgId, role) => ({ id: `u-${tag}`, orgId, name: `N-${tag}`, bio: '', role });

function makeActors(rng) {
  const byOrg = {}; const all = [];
  for (const org of ORG_KEYS) {
    const admins = [mkUser(`${org}-a0`, org, 'admin'), mkUser(`${org}-a1`, org, 'admin')];
    const members = [mkUser(`${org}-m0`, org, 'member'), mkUser(`${org}-m1`, org, 'member')];
    const guest = mkUser(`${org}-g`, org, 'guest');
    byOrg[org] = { org, admins, members, guest, all: [...admins, ...members, guest], nonAdmins: [...members, guest] };
    all.push(...byOrg[org].all);
  }
  return { byOrg, all, orgs: ORG_KEYS, pickOrg: () => rng.pick(ORG_KEYS) };
}
function freshDb(domains, actors) {
  const users = new Map(); for (const u of actors.all) users.set(u.id, { ...u });
  const db = { users };
  for (const d of domains) { db[d.walletsDb] = new Map(); db[d.ledgerDb] = []; }
  return db;
}
const as = (caller, db) => ({ session: { userId: caller.id, orgId: caller.orgId, role: caller.role }, db });
let kc = 0; const k = () => `k${kc++}`; // a fresh idempotency key per intended charge

export function buildQuotaOracle(domains = walletDomainsFor(1)) {
  const EXPECTS = domains.flatMap((d) => [d.createFn, d.listFn, d.depositFn, d.withdrawFn]);
  const happy = [], crosscut = [], integration = [];

  for (const d of domains) {
    const { createFn, listFn, depositFn, withdrawFn, walletsDb, word, key: dk } = d;
    const admin = (org, a) => a.byOrg[org].admins[0];
    const member = (org, a, rng) => rng.pick(a.byOrg[org].members);
    // create a wallet (by a member) and grant it `amount` (by an admin)
    const funded = (api, a, org, amount, db) => { const owner = a.byOrg[org].members[0]; const w = api[createFn](as(owner, db), { name: 'W' }); api[depositFn](as(admin(org, a), db), w.id, amount, k()); return w; };

    happy.push(
      { name: `happy@${createFn} — creates a ${word} [property]`, run: (api) => {
        const rng = ROOT.fork(`h-create-${dk}`);
        for (let t = 0; t < 6; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const caller = rng.pick(a.byOrg[a.pickOrg()].all); const w = api[createFn](as(caller, db), { name: 'W' }); assert.ok(w && w.id, 'returns a record with an id'); }
      } },
      { name: `happy@${listFn} — returns own-org ${word}s [property]`, run: (api) => {
        const rng = ROOT.fork(`h-list-${dk}`);
        for (let t = 0; t < 6; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const want = new Set(); const kk = 2 + rng.int(3); for (let i = 0; i < kk; i++) { const id = `h-${t}-${i}`; db[walletsDb].set(id, { id, orgId: org, ownerId: 'u-x', name: 'W' }); want.add(id); } const got = new Set((api[listFn](as(a.byOrg[org].admins[0], db)) || []).map((x) => x && x.id)); for (const id of want) assert.ok(got.has(id), `own-org ${word} present`); }
      } },
      { name: `happy@${depositFn} — an admin grants credit [property]`, run: (api) => {
        const rng = ROOT.fork(`h-deposit-${dk}`);
        for (let t = 0; t < 6; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const w = api[createFn](as(member(org, a, rng), db), { name: 'W' }); assert.ok(api[depositFn](as(admin(org, a), db), w.id, 50, k()), 'deposit returns'); }
      } },
      { name: `happy@${withdrawFn} — a funded ${word} can be drawn down [property]`, run: (api) => {
        const rng = ROOT.fork(`h-withdraw-${dk}`);
        for (let t = 0; t < 6; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const w = funded(api, a, org, 100, db); assert.ok(api[withdrawFn](as(member(org, a, rng), db), w.id, 40, k()), 'withdraw within balance succeeds'); }
      } },
    );

    crosscut.push(
      { name: `tenancy@${createFn} — caller org stamped, client orgId ignored [property/randomized-injection]`, run: (api) => {
        const rng = ROOT.fork(`cx-create-tenancy-${dk}`);
        for (let t = 0; t < CX_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const caller = rng.pick(a.byOrg[a.pickOrg()].all); const inj = rng.pick([rng.pick(a.orgs.filter((o) => o !== caller.orgId)), 'org-x', caller.orgId, undefined]); const input = { name: 'W' }; if (inj !== undefined) input.orgId = inj; const w = api[createFn](as(caller, db), input); assert.equal(db[walletsDb].get(w.id).orgId, caller.orgId, `stored org must be caller, not ${String(inj)}`); }
      } },
      { name: `validation@${withdrawFn} — a non-positive amount is refused [property]`, run: (api) => {
        const rng = ROOT.fork(`cx-withdraw-validation-${dk}`);
        for (let t = 0; t < CX_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const w = funded(api, a, org, 100, db); const bad = rng.pick([-50, 0, -1]); assert.throws(() => api[withdrawFn](as(member(org, a, rng), db), w.id, bad, k()), `withdraw(${bad}) must be refused`); }
      } },
      { name: `tenancy@${listFn} — list == exactly caller-org ${word}s [metamorphic/set-equality]`, run: (api) => {
        const rng = ROOT.fork(`cx-list-tenancy-${dk}`);
        for (let t = 0; t < CX_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const want = Object.fromEntries(a.orgs.map((o) => [o, new Set()])); const n = 3 + rng.int(5); for (let i = 0; i < n; i++) { const org = a.pickOrg(); const id = `s-${t}-${i}`; db[walletsDb].set(id, { id, orgId: org, ownerId: 'u-x', name: 'W' }); want[org].add(id); } const caller = rng.pick(a.byOrg[a.pickOrg()].all); const got = new Set((api[listFn](as(caller, db)) || []).map((x) => x && x.id)); for (const id of got) assert.ok(want[caller.orgId].has(id), `listed ${id} not in caller org (leak)`); for (const id of want[caller.orgId]) assert.ok(got.has(id), `caller-org ${id} missing (leak-of-omission)`); }
      } },
      { name: `authz@${depositFn} — only an admin may grant credit; no-op [property + state-no-op]`, run: (api) => {
        const rng = ROOT.fork(`cx-deposit-authz-${dk}`);
        for (let t = 0; t < CX_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const owner = a.byOrg[org].members[0]; const w = api[createFn](as(owner, db), { name: 'W' }); const nonAdmin = rng.pick(a.byOrg[org].nonAdmins); assert.throws(() => api[depositFn](as(nonAdmin, db), w.id, 100, k()), `${nonAdmin.role} cannot grant`); assert.throws(() => api[withdrawFn](as(owner, db), w.id, 1, k()), 'no credit was granted ⇒ nothing to withdraw'); }
      } },
      { name: `tenancy@${withdrawFn} — a foreign-org caller cannot withdraw [property/randomized-pairs]`, run: (api) => {
        const rng = ROOT.fork(`cx-withdraw-tenancy-${dk}`);
        for (let t = 0; t < CX_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const A = a.pickOrg(); const B = rng.pick(a.orgs.filter((o) => o !== A)); const w = funded(api, a, A, 100, db); assert.throws(() => api[withdrawFn](as(rng.pick(a.byOrg[B].all), db), w.id, 10, k()), 'cross-org withdraw must throw'); }
      } },
    );

    integration.push(
      { name: `CONSERVE+@${dk} — deposits and withdrawals account exactly (no money lost or made) [behavioral]`, run: (api) => {
        const rng = ROOT.fork(`in-conserve-${dk}`);
        for (let t = 0; t < IN_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const w = funded(api, a, org, 100, db); const m = member(org, a, rng);
          assert.ok(api[withdrawFn](as(m, db), w.id, 70, k()), 'withdraw 70 of 100 succeeds');
          assert.throws(() => api[withdrawFn](as(m, db), w.id, 31, k()), 'only 30 remains — 31 must be refused');
          assert.ok(api[withdrawFn](as(m, db), w.id, 30, k()), 'withdraw the remaining 30 succeeds');
          assert.throws(() => api[withdrawFn](as(m, db), w.id, 1, k()), 'balance is exactly 0 now'); }
      } },
      { name: `OVERSPEND-@${dk} — a withdrawal beyond balance is refused & leaves funds intact [behavioral]`, run: (api) => {
        const rng = ROOT.fork(`in-overspend-${dk}`);
        for (let t = 0; t < IN_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const w = funded(api, a, org, 50, db); const m = member(org, a, rng);
          assert.throws(() => api[withdrawFn](as(m, db), w.id, 80, k()), 'cannot overspend 50');
          assert.ok(api[withdrawFn](as(m, db), w.id, 50, k()), 'the 50 is still there after the refused overspend');
          assert.throws(() => api[withdrawFn](as(m, db), w.id, 1, k()), 'now empty'); }
      } },
      { name: `IDEMPOTENT@${dk} — replaying a charge key applies it once [metamorphic]`, run: (api) => {
        const rng = ROOT.fork(`in-idem-${dk}`);
        for (let t = 0; t < IN_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const w = funded(api, a, org, 100, db); const m = member(org, a, rng); const key = k();
          api[withdrawFn](as(m, db), w.id, 40, key);
          api[withdrawFn](as(m, db), w.id, 40, key); // replay — must not double-charge
          assert.ok(api[withdrawFn](as(m, db), w.id, 60, k()), 'only 40 was charged ⇒ 60 remains');
          assert.throws(() => api[withdrawFn](as(m, db), w.id, 1, k()), 'balance is exactly 0'); }
      } },
      { name: `ISO@${dk} — a foreign-org user can neither see, fund, nor draw a ${word} [metamorphic]`, run: (api) => {
        const rng = ROOT.fork(`in-iso-${dk}`);
        for (let t = 0; t < IN_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const w = funded(api, a, org, 100, db); const foreign = rng.pick(a.byOrg[rng.pick(a.orgs.filter((o) => o !== org))].all);
          assert.ok(!((api[listFn](as(foreign, db)) || []).some((x) => x && x.id === w.id)), 'foreign must not see it');
          assert.throws(() => api[withdrawFn](as(foreign, db), w.id, 10, k()), 'foreign cannot withdraw');
          assert.throws(() => api[depositFn](as(foreign, db), w.id, 10, k()), 'foreign cannot fund'); }
      } },
    );
  }

  return { EXPECTS, happy, crosscut, integration };
}
