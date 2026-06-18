// ============================================================================
// DIVERSE EPIC TEMPLATE #3 — the LIFECYCLE / state-machine seam (P3 prerequisite).
// ============================================================================
//
// A THIRD distinct seam topology (after membership #1 and approval #2). The cross-surface invariant is a
// LEGAL-TRANSITION ORDERING: an entity moves through a state machine draft → submitted → published →
// archived, and a state-GATED read surface (getPublic) may only expose an entity in the right state. The
// distinctive obligation is TEMPORAL/ORDERING (you cannot skip or reverse states), which neither the
// set-membership seam nor the two-party-approval seam exercises.
//
// HIDDEN seam representation (representation-agnostic, like membership/approval): the current state lives in
// an append-only transition log `ctx.db[transitionsDb]` (current state = the latest entry's toState; none ⇒
// 'draft'). The grader NEVER reads that log — it drives state via advanceDoc and observes via getPublic /
// further advances. It MAY read the canonical doc store (named in the skeleton).
//
// Obligation classes: tenancy, input-validation, authz (publish is admin-only), and the ORDERING +
// state-gated-read seam. Additive under studies/meta-search/.

import assert from 'node:assert/strict';
import { makeRng } from '../src/rng.mjs';

export const DOC_CATALOG = [
  { key: 'doc', createFn: 'createDoc', listFn: 'listDocs', advanceFn: 'advanceDoc', gateFn: 'getPublic',
    docsDb: 'docs', transitionsDb: 'transitions', idArg: 'docId', word: 'doc' },
  { key: 'order', createFn: 'createOrder', listFn: 'listOrders', advanceFn: 'advanceOrder', gateFn: 'getFulfilled',
    docsDb: 'orders', transitionsDb: 'orderTransitions', idArg: 'orderId', word: 'order' },
  { key: 'article', createFn: 'createArticle', listFn: 'listArticles', advanceFn: 'advanceArticle', gateFn: 'getLive',
    docsDb: 'articles', transitionsDb: 'articleTransitions', idArg: 'articleId', word: 'article' },
  { key: 'ticket', createFn: 'createTicket', listFn: 'listTickets', advanceFn: 'advanceTicket', gateFn: 'getResolved',
    docsDb: 'tickets', transitionsDb: 'ticketTransitions', idArg: 'ticketId', word: 'ticket' },
  { key: 'listing', createFn: 'createListing', listFn: 'listListings', advanceFn: 'advanceListing', gateFn: 'getActive',
    docsDb: 'listings', transitionsDb: 'listingTransitions', idArg: 'listingId', word: 'listing' },
  { key: 'campaign', createFn: 'createCampaign', listFn: 'listCampaigns', advanceFn: 'advanceCampaign', gateFn: 'getRunning',
    docsDb: 'campaigns', transitionsDb: 'campaignTransitions', idArg: 'campaignId', word: 'campaign' },
  { key: 'post', createFn: 'createPost', listFn: 'listPosts', advanceFn: 'advancePost', gateFn: 'getVisiblePost',
    docsDb: 'posts', transitionsDb: 'postTransitions', idArg: 'postId', word: 'post' },
  { key: 'submission', createFn: 'createSubmission', listFn: 'listSubmissions', advanceFn: 'advanceSubmission', gateFn: 'getAccepted',
    docsDb: 'submissions', transitionsDb: 'submissionTransitions', idArg: 'submissionId', word: 'submission' },
];
export const MAX_DOC_DOMAINS = DOC_CATALOG.length;
export function docDomainsFor(d) {
  const n = Math.max(1, Math.min(Number(d) || 1, DOC_CATALOG.length));
  return DOC_CATALOG.slice(0, n);
}
export function docDomainsWindow(start, size) {
  const c = DOC_CATALOG, n = c.length, s = (((Number(start) || 0) % n) + n) % n, k = Math.max(1, Math.min(Number(size) || 1, n));
  const out = []; for (let i = 0; i < k; i++) out.push(c[(s + i) % n]); return out;
}

// the legal transition graph (shared by ref + mutants; the grader encodes it independently in its asserts)
const LEGAL_SRC = `const LEGAL={draft:['submitted'],submitted:['published'],published:['archived'],archived:[]};`;
const CUR_SRC = (idArg, transitionsDb) => `let cur='draft'; for(const t of ctx.db.${transitionsDb}) if(t.${idArg}===${idArg}) cur=t.toState;`;

function refFor(d) {
  const { createFn, listFn, advanceFn, gateFn, docsDb, transitionsDb, idArg, key } = d;
  return {
    [createFn]: `export function ${createFn}(ctx, input){ const id='${key}-'+Math.random().toString(36).slice(2); const doc={ id, orgId:ctx.session.orgId, authorId:ctx.session.userId, title:input&&input.title }; ctx.db.${docsDb}.set(id, doc); return doc; }`,
    [listFn]: `export function ${listFn}(ctx){ return [...ctx.db.${docsDb}.values()].filter(x=>x.orgId===ctx.session.orgId); }`,
    [advanceFn]: `export function ${advanceFn}(ctx, ${idArg}, toState){ const doc=ctx.db.${docsDb}.get(${idArg}); if(!doc) throw new Error('no doc'); if(doc.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${transitionsDb})) ctx.db.${transitionsDb}=[]; ${CUR_SRC(idArg, transitionsDb)} ${LEGAL_SRC} if(!LEGAL[cur]||!LEGAL[cur].includes(toState)) throw new Error('illegal transition'); if((toState==='published'||toState==='archived') && ctx.session.role!=='admin') throw new Error('forbidden'); if(toState==='submitted' && ctx.session.userId!==doc.authorId && ctx.session.role!=='admin') throw new Error('forbidden'); ctx.db.${transitionsDb}.push({ ${idArg}, toState }); return { ${idArg}, toState }; }`,
    [gateFn]: `export function ${gateFn}(ctx, ${idArg}){ const doc=ctx.db.${docsDb}.get(${idArg}); if(!doc) throw new Error('no doc'); if(doc.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${transitionsDb})) ctx.db.${transitionsDb}=[]; ${CUR_SRC(idArg, transitionsDb)} if(cur!=='published') throw new Error('not public'); return doc; }`,
  };
}

export function lifecycleRefImpls(domains = docDomainsFor(1)) {
  const out = {}; for (const d of domains) Object.assign(out, refFor(d)); return out;
}

function mutantsFor(d) {
  const { createFn, listFn, advanceFn, gateFn, docsDb, transitionsDb, idArg } = d;
  const ref = refFor(d);
  const swap = (fn, body) => ({ ...ref, [fn]: body });
  const crosscut = [
    { id: `cx_tenancy_create_orgid_${d.key}`, body: swap(createFn, `export function ${createFn}(ctx, input){ const id='x-'+Math.random().toString(36).slice(2); const doc={ id, orgId:(input&&input.orgId)||ctx.session.orgId, authorId:ctx.session.userId, title:input&&input.title }; ctx.db.${docsDb}.set(id, doc); return doc; }`) },
    { id: `cx_validation_create_author_${d.key}`, body: swap(createFn, `export function ${createFn}(ctx, input){ const id='x-'+Math.random().toString(36).slice(2); const doc={ id, orgId:ctx.session.orgId, authorId:(input&&input.authorId)||ctx.session.userId, title:input&&input.title }; ctx.db.${docsDb}.set(id, doc); return doc; }`) },
    { id: `cx_tenancy_list_all_${d.key}`, body: swap(listFn, `export function ${listFn}(ctx){ return [...ctx.db.${docsDb}.values()]; }`) },
    { id: `cx_authz_advance_norole_${d.key}`, body: swap(advanceFn, `export function ${advanceFn}(ctx, ${idArg}, toState){ const doc=ctx.db.${docsDb}.get(${idArg}); if(!doc) throw new Error('no doc'); if(doc.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${transitionsDb})) ctx.db.${transitionsDb}=[]; ${CUR_SRC(idArg, transitionsDb)} ${LEGAL_SRC} if(!LEGAL[cur]||!LEGAL[cur].includes(toState)) throw new Error('illegal transition'); ctx.db.${transitionsDb}.push({ ${idArg}, toState }); return { ${idArg}, toState }; }`) },
    { id: `cx_tenancy_advance_crossorg_${d.key}`, body: swap(advanceFn, `export function ${advanceFn}(ctx, ${idArg}, toState){ const doc=ctx.db.${docsDb}.get(${idArg}); if(!doc) throw new Error('no doc'); if(!Array.isArray(ctx.db.${transitionsDb})) ctx.db.${transitionsDb}=[]; ${CUR_SRC(idArg, transitionsDb)} ${LEGAL_SRC} if(!LEGAL[cur]||!LEGAL[cur].includes(toState)) throw new Error('illegal transition'); if((toState==='published'||toState==='archived') && ctx.session.role!=='admin') throw new Error('forbidden'); ctx.db.${transitionsDb}.push({ ${idArg}, toState }); return { ${idArg}, toState }; }`) },
  ];
  const integration = [
    // ordering: any transition legal from any state (skip/reverse allowed)
    { id: `in_advance_anytransition_${d.key}`, body: swap(advanceFn, `export function ${advanceFn}(ctx, ${idArg}, toState){ const doc=ctx.db.${docsDb}.get(${idArg}); if(!doc) throw new Error('no doc'); if(doc.orgId!==ctx.session.orgId) throw new Error('cross-org'); if((toState==='published'||toState==='archived') && ctx.session.role!=='admin') throw new Error('forbidden'); if(!Array.isArray(ctx.db.${transitionsDb})) ctx.db.${transitionsDb}=[]; ctx.db.${transitionsDb}.push({ ${idArg}, toState }); return { ${idArg}, toState }; }`) },
    // gated read leaks: getPublic returns the doc regardless of state
    { id: `in_getpublic_leak_${d.key}`, body: swap(gateFn, `export function ${gateFn}(ctx, ${idArg}){ const doc=ctx.db.${docsDb}.get(${idArg}); if(!doc) throw new Error('no doc'); if(doc.orgId!==ctx.session.orgId) throw new Error('cross-org'); return doc; }`) },
    // representation drift: getPublic reads a doc.status field the writer never maintains (writer uses the log)
    { id: `in_getpublic_drift_${d.key}`, body: swap(gateFn, `export function ${gateFn}(ctx, ${idArg}){ const doc=ctx.db.${docsDb}.get(${idArg}); if(!doc) throw new Error('no doc'); if(doc.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(doc.status!=='published') throw new Error('not public'); return doc; }`) },
    // advance validates but never records the transition (state never actually advances)
    { id: `in_advance_nopersist_${d.key}`, body: swap(advanceFn, `export function ${advanceFn}(ctx, ${idArg}, toState){ const doc=ctx.db.${docsDb}.get(${idArg}); if(!doc) throw new Error('no doc'); if(doc.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${transitionsDb})) ctx.db.${transitionsDb}=[]; ${CUR_SRC(idArg, transitionsDb)} ${LEGAL_SRC} if(!LEGAL[cur]||!LEGAL[cur].includes(toState)) throw new Error('illegal transition'); if((toState==='published'||toState==='archived') && ctx.session.role!=='admin') throw new Error('forbidden'); return { ${idArg}, toState }; }`) },
  ];
  return { crosscut, integration };
}

export function lifecycleMutants(domains = docDomainsFor(1)) {
  const out = [];
  for (const d of domains) { const m = mutantsFor(d); for (const x of m.crosscut) out.push({ ...x, target: 'crosscut' }); for (const x of m.integration) out.push({ ...x, target: 'integration' }); }
  return out;
}

// ---- the INDEPENDENT property-based grader ----------------------------------------------------------
const ROOT = makeRng(0x11fe0c1);
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
  for (const d of domains) { db[d.docsDb] = new Map(); db[d.transitionsDb] = []; }
  return db;
}
const as = (caller, db) => ({ session: { userId: caller.id, orgId: caller.orgId, role: caller.role }, db });

export function buildLifecycleOracle(domains = docDomainsFor(1)) {
  const EXPECTS = domains.flatMap((d) => [d.createFn, d.listFn, d.advanceFn, d.gateFn]);
  const happy = [], crosscut = [], integration = [];

  for (const d of domains) {
    const { createFn, listFn, advanceFn, gateFn, docsDb, word, key } = d;
    const admin = (org, a) => a.byOrg[org].admins[0];

    happy.push(
      { name: `happy@${createFn} — creates a ${word} [property]`, run: (api) => {
        const rng = ROOT.fork(`h-create-${key}`);
        for (let t = 0; t < 6; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const caller = rng.pick(a.byOrg[a.pickOrg()].all); const doc = api[createFn](as(caller, db), { title: `T${t}` }); assert.ok(doc && doc.id, 'returns a record with an id'); }
      } },
      { name: `happy@${listFn} — returns own-org ${word}s [property]`, run: (api) => {
        const rng = ROOT.fork(`h-list-${key}`);
        for (let t = 0; t < 6; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const want = new Set(); const k = 2 + rng.int(3); for (let i = 0; i < k; i++) { const id = `h-${t}-${i}`; db[docsDb].set(id, { id, orgId: org, authorId: 'u-x', title: 'T' }); want.add(id); } const got = new Set((api[listFn](as(a.byOrg[org].admins[0], db)) || []).map((x) => x && x.id)); for (const id of want) assert.ok(got.has(id), `own-org ${word} present`); }
      } },
      { name: `happy@${advanceFn} — author submits a draft [property]`, run: (api) => {
        const rng = ROOT.fork(`h-advance-${key}`);
        for (let t = 0; t < 6; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const author = rng.pick(a.byOrg[org].members); const doc = api[createFn](as(author, db), { title: 'T' }); assert.ok(api[advanceFn](as(author, db), doc.id, 'submitted'), 'draft→submitted by author'); }
      } },
      { name: `happy@${gateFn} — a fully-published ${word} is gettable [property]`, run: (api) => {
        const rng = ROOT.fork(`h-gate-${key}`);
        for (let t = 0; t < 6; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const author = rng.pick(a.byOrg[org].members); const doc = api[createFn](as(author, db), { title: 'T' }); api[advanceFn](as(author, db), doc.id, 'submitted'); api[advanceFn](as(admin(org, a), db), doc.id, 'published'); assert.equal(api[gateFn](as(author, db), doc.id).id, doc.id, 'published doc is gettable'); }
      } },
    );

    crosscut.push(
      { name: `tenancy@${createFn} — caller org stamped, client orgId ignored [property/randomized-injection]`, run: (api) => {
        const rng = ROOT.fork(`cx-create-tenancy-${key}`);
        for (let t = 0; t < CX_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const caller = rng.pick(a.byOrg[a.pickOrg()].all); const inj = rng.pick([rng.pick(a.orgs.filter((o) => o !== caller.orgId)), 'org-x', caller.orgId, undefined]); const input = { title: 'T' }; if (inj !== undefined) input.orgId = inj; const doc = api[createFn](as(caller, db), input); assert.equal(db[docsDb].get(doc.id).orgId, caller.orgId, `stored org must be caller, not ${String(inj)}`); }
      } },
      { name: `validation@${createFn} — author is server-set; a new ${word} is not pre-published [property]`, run: (api) => {
        const rng = ROOT.fork(`cx-create-validation-${key}`);
        for (let t = 0; t < CX_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const caller = rng.pick(a.byOrg[a.pickOrg()].all); const input = { title: 'T', authorId: 'u-spoof' }; if (rng.next() < 0.5) input.status = 'published'; const doc = api[createFn](as(caller, db), input); assert.equal(db[docsDb].get(doc.id).authorId, caller.id, 'author is the caller — not client-supplied'); assert.throws(() => api[gateFn](as(caller, db), doc.id), 'a freshly-created doc is not public'); }
      } },
      { name: `tenancy@${listFn} — list == exactly caller-org ${word}s [metamorphic/set-equality]`, run: (api) => {
        const rng = ROOT.fork(`cx-list-tenancy-${key}`);
        for (let t = 0; t < CX_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const want = Object.fromEntries(a.orgs.map((o) => [o, new Set()])); const n = 3 + rng.int(5); for (let i = 0; i < n; i++) { const org = a.pickOrg(); const id = `s-${t}-${i}`; db[docsDb].set(id, { id, orgId: org, authorId: 'u-x', title: 'T' }); want[org].add(id); } const caller = rng.pick(a.byOrg[a.pickOrg()].all); const got = new Set((api[listFn](as(caller, db)) || []).map((x) => x && x.id)); for (const id of got) assert.ok(want[caller.orgId].has(id), `listed ${id} not in caller org (leak)`); for (const id of want[caller.orgId]) assert.ok(got.has(id), `caller-org ${id} missing (leak-of-omission)`); }
      } },
      { name: `authz@${advanceFn} — only an admin may publish [property]`, run: (api) => {
        const rng = ROOT.fork(`cx-advance-authz-${key}`);
        for (let t = 0; t < CX_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const author = rng.pick(a.byOrg[org].members); const doc = api[createFn](as(author, db), { title: 'T' }); api[advanceFn](as(author, db), doc.id, 'submitted'); const nonAdmin = rng.pick(a.byOrg[org].members); assert.throws(() => api[advanceFn](as(nonAdmin, db), doc.id, 'published'), 'non-admin cannot publish'); }
      } },
      { name: `tenancy@${advanceFn} — a foreign-org caller cannot transition [property/randomized-pairs]`, run: (api) => {
        const rng = ROOT.fork(`cx-advance-tenancy-${key}`);
        for (let t = 0; t < CX_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const A = a.pickOrg(); const B = rng.pick(a.orgs.filter((o) => o !== A)); const author = rng.pick(a.byOrg[A].members); const doc = api[createFn](as(author, db), { title: 'T' }); assert.throws(() => api[advanceFn](as(a.byOrg[B].admins[0], db), doc.id, 'submitted'), 'cross-org transition must throw'); }
      } },
    );

    integration.push(
      { name: `ORDER+@${key} — the legal path draft→submitted→published reaches a gettable ${word} [differential]`, run: (api) => {
        const rng = ROOT.fork(`in-orderplus-${key}`);
        for (let t = 0; t < IN_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const author = rng.pick(a.byOrg[org].members); const doc = api[createFn](as(author, db), { title: 'T' }); api[advanceFn](as(author, db), doc.id, 'submitted'); api[advanceFn](as(admin(org, a), db), doc.id, 'published'); assert.equal(api[gateFn](as(author, db), doc.id).id, doc.id, 'published doc is gettable'); }
      } },
      { name: `ORDER-@${key} — an illegal jump (publish skipping submitted) is refused & is a no-op [differential]`, run: (api) => {
        const rng = ROOT.fork(`in-orderminus-${key}`);
        for (let t = 0; t < IN_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const author = rng.pick(a.byOrg[org].members); const doc = api[createFn](as(author, db), { title: 'T' }); assert.throws(() => api[advanceFn](as(admin(org, a), db), doc.id, 'published'), 'cannot jump draft→published'); assert.throws(() => api[gateFn](as(author, db), doc.id), 'state unchanged ⇒ still not public'); }
      } },
      { name: `GATE@${key} — getPublic exposes a published ${word} and hides a submitted one [metamorphic]`, run: (api) => {
        const rng = ROOT.fork(`in-gate-${key}`);
        for (let t = 0; t < IN_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const author = rng.pick(a.byOrg[org].members); const doc = api[createFn](as(author, db), { title: 'T' }); api[advanceFn](as(author, db), doc.id, 'submitted'); assert.throws(() => api[gateFn](as(author, db), doc.id), 'submitted (not published) is hidden'); api[advanceFn](as(admin(org, a), db), doc.id, 'published'); assert.equal(api[gateFn](as(author, db), doc.id).id, doc.id, 'published is exposed'); }
      } },
      { name: `ISO@${key} — a foreign-org user can neither see, get, nor transition [metamorphic]`, run: (api) => {
        const rng = ROOT.fork(`in-iso-${key}`);
        for (let t = 0; t < IN_TRIALS; t++) { const a = makeActors(rng); const db = freshDb(domains, a); const org = a.pickOrg(); const author = rng.pick(a.byOrg[org].members); const doc = api[createFn](as(author, db), { title: 'secret' }); api[advanceFn](as(author, db), doc.id, 'submitted'); api[advanceFn](as(admin(org, a), db), doc.id, 'published'); const foreign = rng.pick(a.byOrg[rng.pick(a.orgs.filter((o) => o !== org))].all); assert.ok(!((api[listFn](as(foreign, db)) || []).some((x) => x && x.id === doc.id)), 'foreign must not see it'); assert.throws(() => api[gateFn](as(foreign, db), doc.id), 'foreign cannot get it'); assert.throws(() => api[advanceFn](as(foreign, db), doc.id, 'archived'), 'foreign cannot transition it'); }
      } },
    );
  }

  return { EXPECTS, happy, crosscut, integration };
}
