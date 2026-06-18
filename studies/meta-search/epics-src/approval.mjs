// ============================================================================
// DIVERSE EPIC TEMPLATE #2 — the APPROVAL / separation-of-duties seam (P3 prerequisite).
// ============================================================================
//
// WHY THIS EXISTS. The frozen battery (scale-oracle.mjs + gen-epic.mjs) emits only
// D-count size-variants of ONE seam topology — the membership seam (post ⟹ is-member).
// Round-2 finding R2-7: "zero seam-topology degrees of freedom" → under a single template
// the effective sample size collapses (n_eff), so a ≥80-epic TEST set of clones is not an
// independent hold-out. P3 needs epics spanning an `n_eff` distinct-seam-topology floor
// (FREEZE §4; DESIGN §5). FREEZE §5 lists "diverse epic-template authoring" as NOT-frozen
// P2+ machinery, authored additively.
//
// THE NEW SEAM (genuinely distinct from membership). A two-party authorization protocol:
//   create → approve → execute, where the cross-surface invariant is
//     execute(req) succeeds  ⟺  ∃ approval by a DISTINCT admin (approver ≠ requester),
//   and the terminal action (execute) is IDEMPOTENT (executing twice appends one audit
//   record). This exercises obligation classes the membership template does NOT:
//     · separation-of-duties (no self-approval, even by an admin),
//     · idempotency (double-execute is a state no-op),
//     · audit (every execution recorded),
//   plus the shared lethal-quadrant concerns (tenancy, authz, input-validation).
//
// PROVENANCE / INDEPENDENCE. Like oracle #2, the grader here is PROPERTY-BASED +
// METAMORPHIC + DIFFERENTIAL and is REPRESENTATION-AGNOSTIC about the seam's hidden store:
// it NEVER reads ctx.db.approvals — approval is established via approveRequest and observed
// ONLY through executeRequest success/failure (exactly as membership is observed via post).
// It MAY read the canonical request + audit stores (named in the skeleton).
//
// ADDITIVITY. Lives under studies/meta-search/ (not the content-pinned build-gap/ tree).

import assert from 'node:assert/strict';
import { makeRng } from '../src/rng.mjs';

// ---- the request-domain catalog (the size knob; one domain for the d1 anchor) ----------------------
// Entry 0 is unprefixed so approval-d1 is the canonical single-domain anchor; later entries prefix their
// nouns + own their own approval/audit stores (each an independent seam-drift opportunity), mirroring how
// DOMAIN_CATALOG scales the membership seam.
export const REQUEST_CATALOG = [
  { key: 'request', createFn: 'createRequest', listFn: 'listRequests', approveFn: 'approveRequest', executeFn: 'executeRequest',
    requestsDb: 'requests', approvalsDb: 'approvals', auditDb: 'auditLog', idArg: 'requestId', word: 'request' },
  { key: 'release', createFn: 'createRelease', listFn: 'listReleases', approveFn: 'approveRelease', executeFn: 'shipRelease',
    requestsDb: 'releases', approvalsDb: 'releaseApprovals', auditDb: 'shipLog', idArg: 'releaseId', word: 'release' },
  { key: 'payout', createFn: 'createPayout', listFn: 'listPayouts', approveFn: 'approvePayout', executeFn: 'settlePayout',
    requestsDb: 'payouts', approvalsDb: 'payoutApprovals', auditDb: 'settleLog', idArg: 'payoutId', word: 'payout' },
  { key: 'expense', createFn: 'createExpense', listFn: 'listExpenses', approveFn: 'approveExpense', executeFn: 'payExpense',
    requestsDb: 'expenses', approvalsDb: 'expenseApprovals', auditDb: 'expenseLog', idArg: 'expenseId', word: 'expense' },
  { key: 'deployment', createFn: 'createDeployment', listFn: 'listDeployments', approveFn: 'approveDeployment', executeFn: 'runDeployment',
    requestsDb: 'deployments', approvalsDb: 'deploymentApprovals', auditDb: 'deploymentLog', idArg: 'deploymentId', word: 'deployment' },
  { key: 'grant', createFn: 'createGrant', listFn: 'listGrants', approveFn: 'approveGrant', executeFn: 'disburseGrant',
    requestsDb: 'grants', approvalsDb: 'grantApprovals', auditDb: 'grantLog', idArg: 'grantId', word: 'grant' },
  { key: 'merge', createFn: 'createMerge', listFn: 'listMerges', approveFn: 'approveMerge', executeFn: 'landMerge',
    requestsDb: 'merges', approvalsDb: 'mergeApprovals', auditDb: 'mergeLog', idArg: 'mergeId', word: 'merge' },
  { key: 'refund', createFn: 'createRefund', listFn: 'listRefunds', approveFn: 'approveRefund', executeFn: 'issueRefund',
    requestsDb: 'refunds', approvalsDb: 'refundApprovals', auditDb: 'refundLog', idArg: 'refundId', word: 'refund' },
];
export const MAX_REQUEST_DOMAINS = REQUEST_CATALOG.length;
export function requestDomainsFor(d) {
  const n = Math.max(1, Math.min(Number(d) || 1, REQUEST_CATALOG.length));
  return REQUEST_CATALOG.slice(0, n);
}
// A wrap-around window of `size` domains starting at `start` — lets the TEST set draw many lexically-distinct
// epics (different noun subsets) at a fixed size from one topology.
export function requestDomainsWindow(start, size) {
  const c = REQUEST_CATALOG, n = c.length, s = (((Number(start) || 0) % n) + n) % n, k = Math.max(1, Math.min(Number(size) || 1, n));
  const out = []; for (let i = 0; i < k; i++) out.push(c[(s + i) % n]); return out;
}

// ---- correct reference surfaces (as ES-module text — the apparatus runs these in isolation) ---------
function refFor(d) {
  const { createFn, listFn, approveFn, executeFn, requestsDb, approvalsDb, auditDb, idArg } = d;
  return {
    [createFn]: `export function ${createFn}(ctx, input){ const id='${d.key}-'+Math.random().toString(36).slice(2); const req={ id, orgId:ctx.session.orgId, requesterId:ctx.session.userId, status:'pending', body:input&&input.body }; ctx.db.${requestsDb}.set(id, req); return req; }`,
    [listFn]: `export function ${listFn}(ctx){ return [...ctx.db.${requestsDb}.values()].filter(r=>r.orgId===ctx.session.orgId); }`,
    [approveFn]: `export function ${approveFn}(ctx, ${idArg}){ const req=ctx.db.${requestsDb}.get(${idArg}); if(!req) throw new Error('no request'); if(req.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(ctx.session.role!=='admin') throw new Error('forbidden'); if(req.requesterId===ctx.session.userId) throw new Error('self-approval'); if(!Array.isArray(ctx.db.${approvalsDb})) ctx.db.${approvalsDb}=[]; if(!ctx.db.${approvalsDb}.some(a=>a.${idArg}===${idArg}&&a.approverId===ctx.session.userId)) ctx.db.${approvalsDb}.push({${idArg}, approverId:ctx.session.userId}); req.status='approved'; return { ${idArg}, approverId:ctx.session.userId }; }`,
    [executeFn]: `export function ${executeFn}(ctx, ${idArg}){ const req=ctx.db.${requestsDb}.get(${idArg}); if(!req) throw new Error('no request'); if(req.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${approvalsDb})) ctx.db.${approvalsDb}=[]; const approved=ctx.db.${approvalsDb}.some(a=>a.${idArg}===${idArg} && a.approverId!==req.requesterId); if(!approved) throw new Error('not approved'); if(!Array.isArray(ctx.db.${auditDb})) ctx.db.${auditDb}=[]; if(req.status==='executed') return ctx.db.${auditDb}.find(e=>e.${idArg}===${idArg}); const entry={ id:'aud-'+Math.random().toString(36).slice(2), ${idArg}, executedBy:ctx.session.userId, orgId:ctx.session.orgId, at:0 }; ctx.db.${auditDb}.push(entry); req.status='executed'; return entry; }`,
  };
}

export function approvalRefImpls(domains = requestDomainsFor(1)) {
  const out = {};
  for (const d of domains) Object.assign(out, refFor(d));
  return out;
}

// ---- genuine single-obligation mutants (each breaks ONE obligation; tagged with its lethal bucket) --
function mutantsFor(d) {
  const { createFn, listFn, approveFn, executeFn, requestsDb, approvalsDb, auditDb, idArg } = d;
  const ref = refFor(d);
  const swap = (fn, body) => ({ ...ref, [fn]: body });
  const crosscut = [
    { id: `cx_tenancy_create_orgid_${d.key}`, body: swap(createFn, `export function ${createFn}(ctx, input){ const id='x-'+Math.random().toString(36).slice(2); const req={ id, orgId:(input&&input.orgId)||ctx.session.orgId, requesterId:ctx.session.userId, status:'pending', body:input&&input.body }; ctx.db.${requestsDb}.set(id, req); return req; }`) },
    { id: `cx_validation_create_status_${d.key}`, body: swap(createFn, `export function ${createFn}(ctx, input){ const id='x-'+Math.random().toString(36).slice(2); const req={ id, orgId:ctx.session.orgId, requesterId:ctx.session.userId, status:(input&&input.status)||'pending', body:input&&input.body }; ctx.db.${requestsDb}.set(id, req); return req; }`) },
    { id: `cx_tenancy_list_all_${d.key}`, body: swap(listFn, `export function ${listFn}(ctx){ return [...ctx.db.${requestsDb}.values()]; }`) },
    { id: `cx_tenancy_approve_crossorg_${d.key}`, body: swap(approveFn, `export function ${approveFn}(ctx, ${idArg}){ const req=ctx.db.${requestsDb}.get(${idArg}); if(!req) throw new Error('no request'); if(ctx.session.role!=='admin') throw new Error('forbidden'); if(req.requesterId===ctx.session.userId) throw new Error('self-approval'); if(!Array.isArray(ctx.db.${approvalsDb})) ctx.db.${approvalsDb}=[]; ctx.db.${approvalsDb}.push({${idArg}, approverId:ctx.session.userId}); req.status='approved'; return { ${idArg}, approverId:ctx.session.userId }; }`) },
    { id: `cx_authz_approve_norole_${d.key}`, body: swap(approveFn, `export function ${approveFn}(ctx, ${idArg}){ const req=ctx.db.${requestsDb}.get(${idArg}); if(!req) throw new Error('no request'); if(req.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(req.requesterId===ctx.session.userId) throw new Error('self-approval'); if(!Array.isArray(ctx.db.${approvalsDb})) ctx.db.${approvalsDb}=[]; ctx.db.${approvalsDb}.push({${idArg}, approverId:ctx.session.userId}); req.status='approved'; return { ${idArg}, approverId:ctx.session.userId }; }`) },
    { id: `cx_sod_approve_self_${d.key}`, body: swap(approveFn, `export function ${approveFn}(ctx, ${idArg}){ const req=ctx.db.${requestsDb}.get(${idArg}); if(!req) throw new Error('no request'); if(req.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(ctx.session.role!=='admin') throw new Error('forbidden'); if(!Array.isArray(ctx.db.${approvalsDb})) ctx.db.${approvalsDb}=[]; ctx.db.${approvalsDb}.push({${idArg}, approverId:ctx.session.userId}); req.status='approved'; return { ${idArg}, approverId:ctx.session.userId }; }`) },
    { id: `cx_tenancy_execute_crossorg_${d.key}`, body: swap(executeFn, `export function ${executeFn}(ctx, ${idArg}){ const req=ctx.db.${requestsDb}.get(${idArg}); if(!req) throw new Error('no request'); if(!Array.isArray(ctx.db.${approvalsDb})) ctx.db.${approvalsDb}=[]; const approved=ctx.db.${approvalsDb}.some(a=>a.${idArg}===${idArg} && a.approverId!==req.requesterId); if(!approved) throw new Error('not approved'); if(!Array.isArray(ctx.db.${auditDb})) ctx.db.${auditDb}=[]; if(req.status==='executed') return ctx.db.${auditDb}.find(e=>e.${idArg}===${idArg}); const entry={ id:'aud-'+Math.random().toString(36).slice(2), ${idArg}, executedBy:ctx.session.userId, orgId:ctx.session.orgId, at:0 }; ctx.db.${auditDb}.push(entry); req.status='executed'; return entry; }`) },
  ];
  const integration = [
    // seam: execute ignores approval entirely → an unapproved request executes (SEAM-)
    { id: `in_execute_noapproval_${d.key}`, body: swap(executeFn, `export function ${executeFn}(ctx, ${idArg}){ const req=ctx.db.${requestsDb}.get(${idArg}); if(!req) throw new Error('no request'); if(req.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${auditDb})) ctx.db.${auditDb}=[]; if(req.status==='executed') return ctx.db.${auditDb}.find(e=>e.${idArg}===${idArg}); const entry={ id:'aud-'+Math.random().toString(36).slice(2), ${idArg}, executedBy:ctx.session.userId, orgId:ctx.session.orgId, at:0 }; ctx.db.${auditDb}.push(entry); req.status='executed'; return entry; }`) },
    // seam drift: execute reads req.approvedBy (a field approve never writes) instead of the approval store → an approved request cannot execute (SEAM+)
    { id: `in_execute_drift_${d.key}`, body: swap(executeFn, `export function ${executeFn}(ctx, ${idArg}){ const req=ctx.db.${requestsDb}.get(${idArg}); if(!req) throw new Error('no request'); if(req.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!req.approvedBy) throw new Error('not approved'); if(!Array.isArray(ctx.db.${auditDb})) ctx.db.${auditDb}=[]; const entry={ id:'aud-'+Math.random().toString(36).slice(2), ${idArg}, executedBy:ctx.session.userId, orgId:ctx.session.orgId, at:0 }; ctx.db.${auditDb}.push(entry); req.status='executed'; return entry; }`) },
    // idempotency dropped: every execute appends (double-execute → two audit records)
    { id: `in_execute_nonidempotent_${d.key}`, body: swap(executeFn, `export function ${executeFn}(ctx, ${idArg}){ const req=ctx.db.${requestsDb}.get(${idArg}); if(!req) throw new Error('no request'); if(req.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${approvalsDb})) ctx.db.${approvalsDb}=[]; const approved=ctx.db.${approvalsDb}.some(a=>a.${idArg}===${idArg} && a.approverId!==req.requesterId); if(!approved) throw new Error('not approved'); if(!Array.isArray(ctx.db.${auditDb})) ctx.db.${auditDb}=[]; const entry={ id:'aud-'+Math.random().toString(36).slice(2), ${idArg}, executedBy:ctx.session.userId, orgId:ctx.session.orgId, at:0 }; ctx.db.${auditDb}.push(entry); req.status='executed'; return entry; }`) },
    // audit not persisted: execute returns an entry but never appends it (SEAM+ persistence)
    { id: `in_execute_nopersist_${d.key}`, body: swap(executeFn, `export function ${executeFn}(ctx, ${idArg}){ const req=ctx.db.${requestsDb}.get(${idArg}); if(!req) throw new Error('no request'); if(req.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${approvalsDb})) ctx.db.${approvalsDb}=[]; const approved=ctx.db.${approvalsDb}.some(a=>a.${idArg}===${idArg} && a.approverId!==req.requesterId); if(!approved) throw new Error('not approved'); return { id:'aud-x', ${idArg}, executedBy:ctx.session.userId, orgId:ctx.session.orgId, at:0 }; }`) },
  ];
  return { crosscut, integration };
}

export function approvalMutants(domains = requestDomainsFor(1)) {
  const out = [];
  for (const d of domains) {
    const m = mutantsFor(d);
    for (const x of m.crosscut) out.push({ ...x, target: 'crosscut' });
    for (const x of m.integration) out.push({ ...x, target: 'integration' });
  }
  return out;
}

// ---- the INDEPENDENT property-based grader -----------------------------------------------------------
const ROOT = makeRng(0x0a9b0a1);
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
    const list = [...admins, ...members, guest];
    byOrg[org] = { org, admins, members, guest, all: list, nonAdmins: [...members, guest] };
    all.push(...list);
  }
  return { byOrg, all, orgs: ORG_KEYS, pickOrg: () => rng.pick(ORG_KEYS) };
}
function freshDb(domains, actors) {
  const users = new Map();
  for (const u of actors.all) users.set(u.id, { ...u });
  const db = { users };
  for (const d of domains) { db[d.requestsDb] = new Map(); db[d.approvalsDb] = []; db[d.auditDb] = []; }
  return db;
}
const as = (caller, db) => ({ session: { userId: caller.id, orgId: caller.orgId, role: caller.role }, db });
const auditCount = (db, d) => db[d.auditDb].length; // canonical audit store — readable

export function buildApprovalOracle(domains = requestDomainsFor(1)) {
  const EXPECTS = domains.flatMap((d) => [d.createFn, d.listFn, d.approveFn, d.executeFn]);
  const happy = [], crosscut = [], integration = [];

  for (const d of domains) {
    const { createFn, listFn, approveFn, executeFn, requestsDb, idArg, word } = d;
    const otherAdmin = (org, actors, notId) => actors.byOrg[org].admins.find((a) => a.id !== notId) || actors.byOrg[org].admins[0];

    // ---- happy -----------------------------------------------------------------------------------
    happy.push(
      { name: `happy@${createFn} — creates a pending ${word} [property]`, run: (api) => {
        const rng = ROOT.fork(`h-create-${d.key}`);
        for (let t = 0; t < 6; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const caller = rng.pick(actors.byOrg[actors.pickOrg()].all);
          const req = api[createFn](as(caller, db), { body: `b${t}` });
          assert.ok(req && req.id, 'returns a record with an id');
          assert.equal(db[requestsDb].get(req.id).status, 'pending', 'new request is pending');
        }
      } },
      { name: `happy@${listFn} — returns own-org ${word}s [property]`, run: (api) => {
        const rng = ROOT.fork(`h-list-${d.key}`);
        for (let t = 0; t < 6; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const org = actors.pickOrg(); const want = new Set();
          const k = 2 + rng.int(3);
          for (let i = 0; i < k; i++) { const id = `h-${t}-${i}`; db[requestsDb].set(id, { id, orgId: org, requesterId: 'u-x', status: 'pending', body: 'b' }); want.add(id); }
          const got = new Set((api[listFn](as(actors.byOrg[org].admins[0], db)) || []).map((r) => r && r.id));
          for (const id of want) assert.ok(got.has(id), `own-org ${word} ${id} present`);
        }
      } },
      { name: `happy@${approveFn} — a distinct admin approves [property]`, run: (api) => {
        const rng = ROOT.fork(`h-approve-${d.key}`);
        for (let t = 0; t < 6; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const org = actors.pickOrg(); const requester = rng.pick(actors.byOrg[org].members);
          const req = api[createFn](as(requester, db), { body: 'b' });
          assert.ok(api[approveFn](as(otherAdmin(org, actors, requester.id), db), req.id), 'approve returns truthy');
        }
      } },
      { name: `happy@${executeFn} — an approved ${word} executes [property]`, run: (api) => {
        const rng = ROOT.fork(`h-exec-${d.key}`);
        for (let t = 0; t < 6; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const org = actors.pickOrg(); const requester = rng.pick(actors.byOrg[org].members);
          const req = api[createFn](as(requester, db), { body: 'b' });
          api[approveFn](as(otherAdmin(org, actors, requester.id), db), req.id);
          assert.ok(api[executeFn](as(rng.pick(actors.byOrg[org].members), db), req.id), 'execute returns an entry');
        }
      } },
    );

    // ---- crosscut (lethal) -----------------------------------------------------------------------
    crosscut.push(
      { name: `tenancy@${createFn} — caller org stamped, client orgId ignored [property/randomized-injection]`, run: (api) => {
        const rng = ROOT.fork(`cx-create-tenancy-${d.key}`);
        for (let t = 0; t < CX_TRIALS; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const caller = rng.pick(actors.byOrg[actors.pickOrg()].all);
          const inj = rng.pick([rng.pick(actors.orgs.filter((o) => o !== caller.orgId)), 'org-x', caller.orgId, undefined]);
          const input = { body: 'b' }; if (inj !== undefined) input.orgId = inj;
          const req = api[createFn](as(caller, db), input);
          assert.equal(db[requestsDb].get(req.id).orgId, caller.orgId, `stored org must be caller org, not ${String(inj)}`);
        }
      } },
      { name: `validation@${createFn} — status & requester are server-set, not client-supplied [property]`, run: (api) => {
        const rng = ROOT.fork(`cx-create-validation-${d.key}`);
        for (let t = 0; t < CX_TRIALS; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const caller = rng.pick(actors.byOrg[actors.pickOrg()].all);
          const input = { body: 'b' };
          const badStatus = rng.pick(['approved', 'executed', 'pending', undefined]);
          if (badStatus !== undefined) input.status = badStatus;
          if (rng.next() < 0.5) input.requesterId = 'u-someone-else';
          const req = api[createFn](as(caller, db), input);
          const stored = db[requestsDb].get(req.id);
          assert.equal(stored.status, 'pending', 'new request must be pending — client cannot pre-approve');
          assert.equal(stored.requesterId, caller.id, 'requester is the caller — not client-supplied');
        }
      } },
      { name: `tenancy@${listFn} — list == exactly caller-org ${word}s [metamorphic/set-equality]`, run: (api) => {
        const rng = ROOT.fork(`cx-list-tenancy-${d.key}`);
        for (let t = 0; t < CX_TRIALS; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const want = Object.fromEntries(actors.orgs.map((o) => [o, new Set()]));
          const n = 3 + rng.int(5);
          for (let i = 0; i < n; i++) { const org = actors.pickOrg(); const id = `s-${t}-${i}`; db[requestsDb].set(id, { id, orgId: org, requesterId: 'u-x', status: 'pending', body: 'b' }); want[org].add(id); }
          const caller = rng.pick(actors.byOrg[actors.pickOrg()].all);
          const got = new Set((api[listFn](as(caller, db)) || []).map((r) => r && r.id));
          for (const id of got) assert.ok(want[caller.orgId].has(id), `listed ${id} not in caller org (leak)`);
          for (const id of want[caller.orgId]) assert.ok(got.has(id), `caller-org ${id} missing (leak-of-omission)`);
        }
      } },
      { name: `tenancy@${approveFn} — refuses approving a foreign-org ${word} [property/randomized-pairs]`, run: (api) => {
        const rng = ROOT.fork(`cx-approve-tenancy-${d.key}`);
        for (let t = 0; t < CX_TRIALS; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const A = actors.pickOrg(); const B = rng.pick(actors.orgs.filter((o) => o !== A));
          const requester = rng.pick(actors.byOrg[A].members);
          const req = api[createFn](as(requester, db), { body: 'b' });
          assert.throws(() => api[approveFn](as(actors.byOrg[B].admins[0], db), req.id), 'cross-org approve must throw');
        }
      } },
      { name: `authz@${approveFn} — a non-admin cannot approve; no-op [property + state-no-op]`, run: (api) => {
        const rng = ROOT.fork(`cx-approve-authz-${d.key}`);
        for (let t = 0; t < CX_TRIALS; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const org = actors.pickOrg(); const requester = rng.pick(actors.byOrg[org].members);
          const req = api[createFn](as(requester, db), { body: 'b' });
          const nonAdmin = rng.pick(actors.byOrg[org].nonAdmins.filter((u) => u.id !== requester.id));
          assert.throws(() => api[approveFn](as(nonAdmin, db), req.id), `${nonAdmin.role} cannot approve`);
          assert.throws(() => api[executeFn](as(rng.pick(actors.byOrg[org].members), db), req.id), 'no valid approval ⇒ cannot execute');
        }
      } },
      { name: `sod@${approveFn} — separation of duties: no self-approval even by an admin [property + state-no-op]`, run: (api) => {
        const rng = ROOT.fork(`cx-approve-sod-${d.key}`);
        for (let t = 0; t < CX_TRIALS; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const org = actors.pickOrg(); const requester = rng.pick(actors.byOrg[org].admins); // an ADMIN requester
          const req = api[createFn](as(requester, db), { body: 'b' });
          assert.throws(() => api[approveFn](as(requester, db), req.id), 'self-approval must be refused');
          assert.throws(() => api[executeFn](as(rng.pick(actors.byOrg[org].members), db), req.id), 'no distinct approval ⇒ cannot execute');
        }
      } },
      { name: `tenancy@${executeFn} — a foreign-org caller cannot execute [property/randomized-pairs]`, run: (api) => {
        const rng = ROOT.fork(`cx-exec-tenancy-${d.key}`);
        for (let t = 0; t < CX_TRIALS; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const A = actors.pickOrg(); const B = rng.pick(actors.orgs.filter((o) => o !== A));
          const requester = rng.pick(actors.byOrg[A].members);
          const req = api[createFn](as(requester, db), { body: 'b' });
          api[approveFn](as(otherAdmin(A, actors, requester.id), db), req.id); // validly approved in A
          const before = auditCount(db, d);
          assert.throws(() => api[executeFn](as(rng.pick(actors.byOrg[B].all), db), req.id), 'cross-org execute must throw');
          assert.equal(auditCount(db, d), before, 'no audit entry from a refused cross-org execute');
        }
      } },
    );

    // ---- integration (lethal): the approval seam, differential vs the spec model -----------------
    integration.push(
      { name: `SEAM+@${d.key} — a distinct-admin-approved ${word} executes & is audited once [differential]`, run: (api) => {
        const rng = ROOT.fork(`in-seamplus-${d.key}`);
        for (let t = 0; t < IN_TRIALS; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const org = actors.pickOrg(); const requester = rng.pick(actors.byOrg[org].all.filter((u) => u.role !== 'guest'));
          const req = api[createFn](as(requester, db), { body: 'b' });
          api[approveFn](as(otherAdmin(org, actors, requester.id), db), req.id);
          const before = auditCount(db, d);
          const e = api[executeFn](as(rng.pick(actors.byOrg[org].members), db), req.id);
          assert.ok(e, 'execute returns an entry');
          assert.equal(auditCount(db, d), before + 1, 'exactly one audit entry appended');
          assert.equal(db[requestsDb].get(req.id).status, 'executed', 'status advanced to executed');
        }
      } },
      { name: `SEAM-@${d.key} — an UN-approved ${word} cannot execute [differential]`, run: (api) => {
        const rng = ROOT.fork(`in-seamminus-${d.key}`);
        for (let t = 0; t < IN_TRIALS; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const org = actors.pickOrg(); const requester = rng.pick(actors.byOrg[org].members);
          const req = api[createFn](as(requester, db), { body: 'b' });
          const before = auditCount(db, d);
          assert.throws(() => api[executeFn](as(rng.pick(actors.byOrg[org].members), db), req.id), 'no approval ⇒ must throw');
          assert.equal(auditCount(db, d), before, 'no audit entry without an approval');
        }
      } },
      { name: `IDEMPOTENT@${d.key} — executing twice appends exactly one audit entry [metamorphic]`, run: (api) => {
        const rng = ROOT.fork(`in-idem-${d.key}`);
        for (let t = 0; t < IN_TRIALS; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const org = actors.pickOrg(); const requester = rng.pick(actors.byOrg[org].members);
          const req = api[createFn](as(requester, db), { body: 'b' });
          api[approveFn](as(otherAdmin(org, actors, requester.id), db), req.id);
          const execr = rng.pick(actors.byOrg[org].members);
          api[executeFn](as(execr, db), req.id);
          api[executeFn](as(execr, db), req.id); // replay
          assert.equal(auditCount(db, d), 1, 'double-execute must append exactly one audit entry (idempotent)');
        }
      } },
      { name: `ISO@${d.key} — a foreign-org user can neither see, approve, nor execute [metamorphic]`, run: (api) => {
        const rng = ROOT.fork(`in-iso-${d.key}`);
        for (let t = 0; t < IN_TRIALS; t++) {
          const actors = makeActors(rng); const db = freshDb(domains, actors);
          const org = actors.pickOrg(); const requester = rng.pick(actors.byOrg[org].members);
          const req = api[createFn](as(requester, db), { body: 'secret' });
          api[approveFn](as(otherAdmin(org, actors, requester.id), db), req.id);
          const foreign = rng.pick(actors.byOrg[rng.pick(actors.orgs.filter((o) => o !== org))].all);
          assert.ok(!((api[listFn](as(foreign, db)) || []).some((r) => r && r.id === req.id)), 'foreign must not see the request');
          const before = auditCount(db, d);
          assert.throws(() => api[executeFn](as(foreign, db), req.id), 'foreign execute must throw');
          assert.throws(() => api[approveFn](as(foreign, db), req.id), 'foreign approve must throw');
          assert.equal(auditCount(db, d), before, 'no audit entry from a foreign caller');
        }
      } },
    );
  }

  return { EXPECTS, happy, crosscut, integration };
}
