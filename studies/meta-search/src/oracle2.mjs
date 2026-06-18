// ============================================================================
// ORACLE #2 — the independent hand-authored grader (DESIGN §6 G2 / §10 provenance).
// ============================================================================
//
// WHY THIS FILE EXISTS. The whole epic battery's ground truth is ONE scale-oracle
// template (build-gap/lib/scale-oracle.mjs = "oracle #1"). A re-coded *runner* over
// that same oracle would inherit its exact correlated blind spots, so a "confirmed"
// promotion (§10) or a P3 TEST score graded by it would be vacuous. The freeze
// therefore REQUIRES a second, *independently authored* oracle that grades the SAME
// lethal-quadrant obligations by a DIFFERENT detection mechanism, before the first
// "confirmed" promotion AND before P3 TEST (DESIGN §6 G2, lines 329–331; §10 anti-rot,
// lines 469–475).
//
// WHAT IS SHARED vs INDEPENDENT (the provenance-class boundary).
//   SHARED — only the SPEC, never the detection logic:
//     * the surface schema (function names + canonical store names) imported as the
//       domain catalog `domainsFor` from the frozen oracle. This is the apples-to-apples
//       surface set the candidate must implement; it is the obligation spec, not oracle
//       #1's test bodies. We do NOT import `buildOracle` (the detection logic).
//     * representation-agnosticism: like oracle #1 we NEVER read a domain's membership
//       store (`db[membersDb]`) — membership is only ever established via add*Member and
//       only ever observed via post*/list*. (We MAY read the canonical container/leaf
//       stores; oracle #1 does too — those are named in the spec.)
//     * the bucket contract: we export { EXPECTS, happy, crosscut, integration } with
//       each test { name, run(api) }, so this is a drop-in `tests.mjs` for evaluateEpic.
//   INDEPENDENT — the detection MECHANISM is wholly different:
//     * oracle #1 is EXAMPLE-BASED: 4 fixed actors (admin1/m1/m2/x2, orgs org-1/org-2),
//       a single hand-picked scenario per obligation, concrete-value assertions.
//     * oracle #2 is PROPERTY-BASED + METAMORPHIC + DIFFERENTIAL: seeded-random actors
//       drawn from 3 orgs with mixed roles, each obligation checked over MANY randomized
//       trials via an invariant / set-equality / state-no-op-delta relation, and the
//       membership seam checked differentially against a spec-derived model. Randomized
//       inputs defeat any surface that overfits oracle #1's fixed ids/orgs; set-equality
//       and no-op-delta relations defeat assertion-specificity gaming.
//
// DETERMINISM. The grader must score reproducibly (the per-cell veto + a once-scored P3
// TEST). All randomness comes from the frozen mulberry32 RNG (src/rng.mjs) seeded
// per-cell by a fixed tag, so the battery is bit-deterministic and order-independent.
//
// ADDITIVITY. This file lives under studies/meta-search/ — NOT under the content-pinned
// studies/build-gap/ tree (FREEZE §1 apparatus hash 1580944…). It imports the frozen
// oracle read-only (importing does not change the tree). Nothing frozen is edited.

import assert from 'node:assert/strict';
import { makeRng } from './rng.mjs';
import { domainsFor } from '../../build-gap/lib/scale-oracle.mjs';

// One deterministic root stream; each cell forks an independent sub-stream by tag. ROOT
// is only ever forked (never advanced directly), so cell streams are order-independent.
const ROOT = makeRng(0x02ac1e2);

// Trials per property. Enough randomized draws to defeat fixed-id/fixed-org overfit while
// keeping a D=5 epic well under the 15s child timeout (~5 domains × ~10 cells × ~14 trials
// × a few calls each ≈ a few thousand cheap calls).
const CX_TRIALS = 16; // crosscut (single-surface obligations)
const IN_TRIALS = 12; // integration (multi-surface flows — pricier)

const ORG_KEYS = ['oa', 'ob', 'oc']; // three orgs — note: DIFFERENT id-space from oracle #1's org-1/org-2

const mkUser = (tag, orgId, role) => ({ id: `u-${tag}`, orgId, name: `N-${tag}`, bio: '', role });

// A fresh randomized actor population: every org gets one admin, 2–3 members, one guest.
function makeActors(rng) {
  const byOrg = {};
  const all = [];
  for (const org of ORG_KEYS) {
    const admin = mkUser(`${org}-admin`, org, 'admin');
    const members = [];
    const nMembers = 2 + rng.int(2); // 2..3
    for (let i = 0; i < nMembers; i++) members.push(mkUser(`${org}-m${i}`, org, 'member'));
    const guest = mkUser(`${org}-guest`, org, 'guest');
    const list = [admin, ...members, guest];
    byOrg[org] = { org, admin, members, guest, nonAdmins: [...members, guest], all: list };
    all.push(...list);
  }
  return { byOrg, all, orgs: ORG_KEYS, pickOrg: () => rng.pick(ORG_KEYS) };
}

// A fresh world for `domains`. users is a Map (surfaces mutate user records); container
// stores are Maps; leaf + membership stores are arrays. The membership arrays are created
// but the oracle NEVER reads them (representation-agnostic).
function freshDb(domains, actors) {
  const users = new Map();
  for (const u of actors.all) users.set(u.id, { ...u });
  const db = { users };
  for (const d of domains) { db[d.containersDb] = new Map(); db[d.leavesDb] = []; db[d.membersDb] = []; }
  return db;
}

const as = (caller, db) => ({ session: { userId: caller.id, orgId: caller.orgId, role: caller.role }, db });
const leafCount = (db, d) => db[d.leavesDb].length; // canonical leaf store — readable (oracle #1 reads it too)

/**
 * Build the INDEPENDENT cohesion oracle for a domain set.
 * @param {Array} domains  (from domainsFor — the shared surface schema)
 * @returns {{ EXPECTS:string[], happy:object[], crosscut:object[], integration:object[] }}
 */
export function buildOracle2(domains) {
  // EXPECTS is the surface SPEC (identical by necessity — both oracles grade the same surfaces).
  const EXPECTS = domains.flatMap((d) => [d.createFn, d.listFn, d.addMemberFn, d.postFn]).concat(['updateProfile']);

  const happy = [];
  const crosscut = [];
  const integration = [];

  for (const d of domains) {
    const { createFn, listFn, addMemberFn, postFn, containersDb } = d;
    const cw = d.containerWord;

    // ---- happy (low weight): stated behaviour over randomized actors -------------------------------
    happy.push(
      { name: `happy@${createFn} — creates & persists a ${cw} [property]`, run: (api) => {
        const rng = ROOT.fork(`h-create-${d.key}`);
        for (let t = 0; t < 8; t++) {
          const actors = makeActors(rng);
          const db = freshDb(domains, actors);
          const caller = rng.pick(actors.byOrg[actors.pickOrg()].all);
          const name = `Apollo-${t}`;
          const rec = api[createFn](as(caller, db), { name });
          assert.equal(rec.name, name, 'returned record carries the given name');
          assert.ok([...db[containersDb].values()].some((x) => x.id === rec.id && x.name === name), `persisted in ctx.db.${containersDb}`);
        }
      } },
      { name: `happy@${listFn} — returns own-org ${cw}s [property]`, run: (api) => {
        const rng = ROOT.fork(`h-list-${d.key}`);
        for (let t = 0; t < 8; t++) {
          const actors = makeActors(rng);
          const db = freshDb(domains, actors);
          const org = actors.pickOrg();
          const want = new Set();
          const k = 2 + rng.int(3);
          for (let i = 0; i < k; i++) { const id = `h-${t}-${i}`; db[containersDb].set(id, { id, orgId: org, name: `A${i}` }); want.add(id); }
          const caller = actors.byOrg[org].admin;
          const got = new Set((api[listFn](as(caller, db)) || []).map((x) => x && x.id));
          for (const id of want) assert.ok(got.has(id), `own-org ${cw} ${id} present`);
        }
      } },
      { name: `happy@${addMemberFn} — admin adds a same-org member [property]`, run: (api) => {
        const rng = ROOT.fork(`h-add-${d.key}`);
        for (let t = 0; t < 8; t++) {
          const actors = makeActors(rng);
          const db = freshDb(domains, actors);
          const org = actors.pickOrg();
          const admin = actors.byOrg[org].admin;
          const p = api[createFn](as(admin, db), { name: 'P' });
          const m = rng.pick(actors.byOrg[org].members);
          assert.ok(api[addMemberFn](as(admin, db), p.id, m.id, 'member'), 'addMember returns a truthy membership');
        }
      } },
    );

    // ---- crosscut (lethal): one cell per (surface × cross-cutting obligation) -----------------------

    // tenancy@create — orgId stamped from the CALLER, never client-supplied. Property over randomized
    // adversarial input.orgId (often a different org / garbage / absent) and randomized callers; checks
    // the STORED record (isolated from list).
    crosscut.push({ name: `tenancy@${createFn} — caller org is stamped, client orgId ignored [property/randomized-injection]`, run: (api) => {
      const rng = ROOT.fork(`cx-tenancy-create-${d.key}`);
      for (let t = 0; t < CX_TRIALS; t++) {
        const actors = makeActors(rng);
        const db = freshDb(domains, actors);
        const caller = rng.pick(actors.byOrg[actors.pickOrg()].all); // any role may create
        const others = actors.orgs.filter((o) => o !== caller.orgId);
        const inj = rng.pick([rng.pick(others), 'org-injected', caller.orgId, undefined]);
        const input = { name: `C${t}` };
        if (inj !== undefined) input.orgId = inj;
        const rec = api[createFn](as(caller, db), input);
        assert.ok(rec && rec.id, 'create returns a record with an id');
        const stored = db[containersDb].get(rec.id);
        assert.ok(stored, `persisted in ctx.db.${containersDb}`);
        assert.equal(stored.orgId, caller.orgId, `stored orgId must be caller org, not client-supplied (${String(inj)})`);
        assert.equal(rec.orgId, caller.orgId, 'returned orgId must be caller org');
      }
    } });

    // tenancy@list — list returns EXACTLY the caller-org set (soundness AND completeness) over a
    // randomized multi-org seed. Stronger than a single present/absent pair: catches partial leaks
    // AND leaks-of-omission.
    crosscut.push({ name: `tenancy@${listFn} — list == exactly caller-org ${cw}s [metamorphic/set-equality]`, run: (api) => {
      const rng = ROOT.fork(`cx-tenancy-list-${d.key}`);
      for (let t = 0; t < CX_TRIALS; t++) {
        const actors = makeActors(rng);
        const db = freshDb(domains, actors);
        const want = Object.fromEntries(actors.orgs.map((o) => [o, new Set()]));
        const n = 3 + rng.int(5);
        for (let i = 0; i < n; i++) { const org = actors.pickOrg(); const id = `s-${t}-${i}`; db[containersDb].set(id, { id, orgId: org, name: `S${i}` }); want[org].add(id); }
        const caller = rng.pick(actors.byOrg[actors.pickOrg()].all);
        const got = new Set((api[listFn](as(caller, db)) || []).map((x) => x && x.id));
        for (const id of got) assert.ok(want[caller.orgId].has(id), `listed ${id} not in caller org (leak)`);
        for (const id of want[caller.orgId]) assert.ok(got.has(id), `caller-org ${id} missing (leak-of-omission)`);
      }
    } });

    // tenancy@addMember — cannot add a member to ANOTHER org's container. Randomized org pairs + roles.
    crosscut.push({ name: `tenancy@${addMemberFn} — refuses add to a foreign-org ${cw} [property/randomized-pairs]`, run: (api) => {
      const rng = ROOT.fork(`cx-tenancy-add-${d.key}`);
      for (let t = 0; t < CX_TRIALS; t++) {
        const actors = makeActors(rng);
        const db = freshDb(domains, actors);
        const A = actors.pickOrg();
        const B = rng.pick(actors.orgs.filter((o) => o !== A));
        const ctr = api[createFn](as(actors.byOrg[A].admin, db), { name: 'P' }); // owned by A
        const attacker = actors.byOrg[B].admin; // admin of B
        const target = rng.pick(actors.byOrg[B].members);
        assert.throws(() => api[addMemberFn](as(attacker, db), ctr.id, target.id, 'member'), 'cross-org addMember must throw');
      }
    } });

    // authz@addMember — a non-admin cannot add. Randomized non-admin roles + a metamorphic no-op check:
    // the would-be member must still be unable to post (the rejected add established nothing).
    crosscut.push({ name: `authz@${addMemberFn} — non-admin add refused & is a no-op [property + state-no-op]`, run: (api) => {
      const rng = ROOT.fork(`cx-authz-add-${d.key}`);
      for (let t = 0; t < CX_TRIALS; t++) {
        const actors = makeActors(rng);
        const db = freshDb(domains, actors);
        const org = actors.pickOrg();
        const ctr = api[createFn](as(actors.byOrg[org].admin, db), { name: 'P' });
        const nonAdmin = rng.pick(actors.byOrg[org].nonAdmins);
        const target = rng.pick(actors.byOrg[org].members);
        assert.throws(() => api[addMemberFn](as(nonAdmin, db), ctr.id, target.id, 'member'), `${nonAdmin.role} caller must be refused`);
        const before = leafCount(db, d);
        assert.throws(() => api[postFn](as(target, db), ctr.id, 'x'), 'target was never validly added — still cannot post');
        assert.equal(leafCount(db, d), before, 'no record appended by the un-added target');
      }
    } });

    // authz@post — a same-org NON-member cannot post; randomized non-members; observable state no-op.
    crosscut.push({ name: `authz@${postFn} — same-org non-member refused, no record appended [property + state-no-op]`, run: (api) => {
      const rng = ROOT.fork(`cx-authz-post-${d.key}`);
      for (let t = 0; t < CX_TRIALS; t++) {
        const actors = makeActors(rng);
        const db = freshDb(domains, actors);
        const org = actors.pickOrg();
        const admin = actors.byOrg[org].admin;
        const ctr = api[createFn](as(admin, db), { name: 'P' });
        const member = rng.pick(actors.byOrg[org].members);
        api[addMemberFn](as(admin, db), ctr.id, member.id, 'member'); // a real member exists
        const nonMember = rng.pick(actors.byOrg[org].nonAdmins.filter((u) => u.id !== member.id));
        const before = leafCount(db, d);
        assert.throws(() => api[postFn](as(nonMember, db), ctr.id, 'nope'), 'non-member must be refused');
        assert.equal(leafCount(db, d), before, 'no record may be appended');
      }
    } });
  }

  // ---- the one shared surface: updateProfile (crosscut authz + mass-assign) -----------------------
  crosscut.push({ name: 'authz@updateProfile — a non-admin cannot edit another user [property/randomized-pairs]', run: (api) => {
    const rng = ROOT.fork('cx-authz-profile');
    for (let t = 0; t < CX_TRIALS; t++) {
      const actors = makeActors(rng);
      const db = freshDb(domains, actors);
      const caller = rng.pick(actors.all.filter((u) => u.role !== 'admin')); // a non-admin
      const target = rng.pick(actors.all.filter((u) => u.id !== caller.id));
      const before = db.users.get(target.id).name;
      assert.throws(() => api.updateProfile(as(caller, db), target.id, { name: `HACK${t}` }), 'editing another user must throw');
      assert.equal(db.users.get(target.id).name, before, "target's name unchanged");
    }
  } });
  crosscut.push({ name: 'mass-assign@updateProfile — patch cannot set role/orgId/id [property/randomized-protected-subset]', run: (api) => {
    const rng = ROOT.fork('cx-massassign-profile');
    const PROT = ['role', 'orgId', 'id'];
    for (let t = 0; t < CX_TRIALS; t++) {
      const actors = makeActors(rng);
      const db = freshDb(domains, actors);
      const user = rng.pick(actors.all.filter((u) => u.role !== 'admin')); // edits self (allowed)
      const before = { ...db.users.get(user.id) };
      const patch = {};
      if (rng.next() < 0.7) patch.name = `NN${t}`;
      const keys = rng.shuffle(PROT).slice(0, 1 + rng.int(PROT.length));
      for (const k of keys) patch[k] = k === 'role' ? 'admin' : k === 'orgId' ? rng.pick(actors.orgs.filter((o) => o !== user.orgId)) : 'u-hijacked';
      try { api.updateProfile(as(user, db), user.id, patch); } catch { /* refusing the whole patch is also fine */ }
      const after = db.users.get(user.id);
      assert.equal(after.role, before.role, 'role not writable via patch');
      assert.equal(after.orgId, before.orgId, 'orgId not writable via patch');
      assert.equal(after.id, before.id, 'id not writable via patch');
    }
  } });

  // ---- integration (lethal): multi-surface seam flows, differential vs a spec-derived model -------
  for (const d of domains) {
    const { createFn, listFn, addMemberFn, postFn } = d;

    // SEAM+ : a member added via add*Member can post* (the two surfaces' membership representations
    // agree). We never read the membership store — membership is established via addMember and observed
    // ONLY through post success. Catches representation drift between the seam's two sides.
    integration.push({ name: `SEAM+@${d.key} — added member can ${postFn}; representations agree [differential/randomized]`, run: (api) => {
      const rng = ROOT.fork(`in-seamplus-${d.key}`);
      for (let t = 0; t < IN_TRIALS; t++) {
        const actors = makeActors(rng);
        const db = freshDb(domains, actors);
        const org = actors.pickOrg();
        const admin = actors.byOrg[org].admin;
        const p = api[createFn](as(admin, db), { name: 'P' });
        const member = rng.pick(actors.byOrg[org].members);
        api[addMemberFn](as(admin, db), p.id, member.id, 'member');
        const before = leafCount(db, d);
        const c = api[postFn](as(member, db), p.id, `hi-${t}`);
        assert.ok(c, 'post returns a record');
        assert.equal(c.body, `hi-${t}`, 'record carries the body');
        assert.equal(c.authorId, member.id, 'authored by the caller');
        assert.equal(leafCount(db, d), before + 1, 'exactly one record persisted');
      }
    } });

    // SEAM- : a same-org NON-member still cannot post even though a real member exists. Randomized.
    integration.push({ name: `SEAM-@${d.key} — same-org non-member still cannot ${postFn} [differential/randomized]`, run: (api) => {
      const rng = ROOT.fork(`in-seamminus-${d.key}`);
      for (let t = 0; t < IN_TRIALS; t++) {
        const actors = makeActors(rng);
        const db = freshDb(domains, actors);
        const org = actors.pickOrg();
        const admin = actors.byOrg[org].admin;
        const p = api[createFn](as(admin, db), { name: 'P' });
        const member = rng.pick(actors.byOrg[org].members);
        api[addMemberFn](as(admin, db), p.id, member.id, 'member');
        const nonMember = rng.pick(actors.byOrg[org].nonAdmins.filter((u) => u.id !== member.id));
        const before = leafCount(db, d);
        assert.throws(() => api[postFn](as(nonMember, db), p.id, 'nope'), 'non-member must be refused');
        assert.equal(leafCount(db, d), before, 'no record appended');
      }
    } });

    // ISO : a different-org user can neither SEE (list) nor post the container. Randomized foreign org.
    integration.push({ name: `ISO@${d.key} — foreign-org user can neither see nor ${postFn} [metamorphic/randomized]`, run: (api) => {
      const rng = ROOT.fork(`in-iso-${d.key}`);
      for (let t = 0; t < IN_TRIALS; t++) {
        const actors = makeActors(rng);
        const db = freshDb(domains, actors);
        const org = actors.pickOrg();
        const admin = actors.byOrg[org].admin;
        const p = api[createFn](as(admin, db), { name: 'Secret' });
        const member = rng.pick(actors.byOrg[org].members);
        api[addMemberFn](as(admin, db), p.id, member.id, 'member');
        const foreign = rng.pick(actors.byOrg[rng.pick(actors.orgs.filter((o) => o !== org))].all);
        const seen = (api[listFn](as(foreign, db)) || []).some((x) => x && x.id === p.id);
        assert.ok(!seen, 'cross-org user must not see the container');
        const before = leafCount(db, d);
        assert.throws(() => api[postFn](as(foreign, db), p.id, 'leak'), 'cross-org post must throw');
        assert.equal(leafCount(db, d), before, 'no cross-org record appended');
      }
    } });
  }

  // shared updateProfile happy
  happy.push({ name: 'happy@updateProfile — updates own name [property]', run: (api) => {
    const rng = ROOT.fork('h-profile');
    for (let t = 0; t < 8; t++) {
      const actors = makeActors(rng);
      const db = freshDb(domains, actors);
      const u = rng.pick(actors.all);
      api.updateProfile(as(u, db), u.id, { name: `R${t}` });
      assert.equal(db.users.get(u.id).name, `R${t}`, 'name persisted');
    }
  } });

  return { EXPECTS, happy, crosscut, integration };
}
