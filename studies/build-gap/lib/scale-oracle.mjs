// M-coh-3 (SIZE × HARNESS): a data-driven, SCALABLE version of the `workspace` cohesion oracle. The epic
// is composed of D independent multi-tenant DOMAINS, each a lexically-distinct clone of the workspace
// pattern (a container entity + a membership seam + a leaf that requires membership), all sharing the
// SAME hidden cross-cutting obligations (tenancy / authz / mass-assignment) plus one shared `updateProfile`.
//
// WHY a generator and not N hand-authored fixtures: the size axis must be apples-to-apples across sizes,
// and every oracle must be mutation-tested. One template, validated once (tools/scale-oracle-selftest.mjs),
// is more rigorous than four hand oracles. domainsFor(1) reproduces the workspace fixture EXACTLY
// (createProject/listProjects/addMember/postComment/updateProfile, ctx.db.members), so scale-d1 is an
// anchor that must match the already-trusted workspace numbers.
//
// REPRESENTATION-AGNOSTIC, exactly like workspace: the oracle NEVER reads a domain's membership store
// directly. Membership is only ever established by calling add*Member and only ever observed via post*/
// list*. So a surface that chose a different internal membership shape is not penalised — only DRIFT
// between the two surfaces of a seam is. Every metric (wire 4D+1, happy 3D+1, crosscut 5D+2, integ 3D)
// scales with D, so task SIZE actually modulates the measured outcome.
import assert from 'node:assert/strict';

// The domain catalog. Entry 0 is the workspace domain VERBATIM (unprefixed addMember, ctx.db.members) so
// domainsFor(1) === the workspace surface set. Entries 1+ are distinct nouns with prefixed names and their
// own membership store — each an independent interface-drift opportunity as the epic grows.
export const DOMAIN_CATALOG = [
  { key: 'project', createFn: 'createProject', listFn: 'listProjects', addMemberFn: 'addMember', postFn: 'postComment',
    containersDb: 'projects', leavesDb: 'comments', membersDb: 'members', idArg: 'projectId', containerWord: 'project', leafWord: 'comment' },
  { key: 'vault', createFn: 'createVault', listFn: 'listVaults', addMemberFn: 'addVaultMember', postFn: 'postFile',
    containersDb: 'vaults', leavesDb: 'files', membersDb: 'vaultMembers', idArg: 'vaultId', containerWord: 'vault', leafWord: 'file' },
  { key: 'tracker', createFn: 'createTracker', listFn: 'listTrackers', addMemberFn: 'addTrackerMember', postFn: 'postTicket',
    containersDb: 'trackers', leavesDb: 'tickets', membersDb: 'trackerMembers', idArg: 'trackerId', containerWord: 'tracker', leafWord: 'ticket' },
  { key: 'channel', createFn: 'createChannel', listFn: 'listChannels', addMemberFn: 'addChannelMember', postFn: 'postMessage',
    containersDb: 'channels', leavesDb: 'messages', membersDb: 'channelMembers', idArg: 'channelId', containerWord: 'channel', leafWord: 'message' },
  { key: 'board', createFn: 'createBoard', listFn: 'listBoards', addMemberFn: 'addBoardMember', postFn: 'postCard',
    containersDb: 'boards', leavesDb: 'cards', membersDb: 'boardMembers', idArg: 'boardId', containerWord: 'board', leafWord: 'card' },
];

export const MAX_DOMAINS = DOMAIN_CATALOG.length;

/** First D domains of the catalog (the size knob). */
export function domainsFor(d) {
  const n = Math.max(1, Math.min(Number(d) || 1, DOMAIN_CATALOG.length));
  return DOMAIN_CATALOG.slice(0, n);
}

// ---- the shared multi-tenant actor model (identical to workspace) --------------------------------
const admin1 = { id: 'u-admin1', orgId: 'org-1', name: 'Admin1', bio: '', role: 'admin' };
const m1 = { id: 'u-m1', orgId: 'org-1', name: 'M1', bio: '', role: 'member' };
const m2 = { id: 'u-m2', orgId: 'org-1', name: 'M2', bio: '', role: 'member' };
const x2 = { id: 'u-x2', orgId: 'org-2', name: 'X2', bio: '', role: 'member' };
const ALL_USERS = [admin1, m1, m2, x2];

// A fresh shared db for a given domain set. Container stores are Maps; leaf + membership stores are arrays.
// `seed` maps a containersDb name -> records to pre-seed (used by the tenancy/list tests). The membership
// arrays are pre-created but NEVER read by the oracle (representation-agnostic).
function worldFor(domains, seed = {}) {
  const users = new Map();
  for (const u of ALL_USERS) users.set(u.id, { ...u });
  const db = { users };
  for (const d of domains) { db[d.containersDb] = new Map(); db[d.leavesDb] = []; db[d.membersDb] = []; }
  for (const [k, recs] of Object.entries(seed)) {
    if (db[k] instanceof Map) for (const r of recs) db[k].set(r.id, { ...r });
  }
  return db;
}
const as = (caller, db) => ({ session: { userId: caller.id, orgId: caller.orgId, role: caller.role }, db });

/**
 * Build the cohesion oracle for a domain set.
 * @param {Array} domains  (from domainsFor)
 * @returns {{ EXPECTS:string[], happy:object[], crosscut:object[], integration:object[] }}
 */
export function buildOracle(domains) {
  const EXPECTS = domains.flatMap((d) => [d.createFn, d.listFn, d.addMemberFn, d.postFn]).concat(['updateProfile']);

  const happy = [];
  const crosscut = [];
  const integration = [];

  for (const d of domains) {
    const { createFn, listFn, addMemberFn, postFn, containersDb, leavesDb } = d;

    // ---- happy (3 per domain): stated behaviour, per surface ----
    happy.push(
      { name: `happy@${createFn} — creates a ${d.containerWord} in the store`, run: (api) => {
        const db = worldFor(domains);
        const p = api[createFn](as(admin1, db), { name: 'Apollo' });
        assert.equal(p.name, 'Apollo', 'returned record has the given name');
        assert.ok([...db[containersDb].values()].some((x) => x.name === 'Apollo'), `persisted in ctx.db.${containersDb}`);
      } },
      { name: `happy@${listFn} — returns the ${d.containerWord}s`, run: (api) => {
        const db = worldFor(domains, { [containersDb]: [{ id: 'a1', orgId: 'org-1', name: 'A' }, { id: 'a2', orgId: 'org-1', name: 'B' }] });
        const names = new Set((api[listFn](as(admin1, db)) || []).map((p) => p.name));
        assert.ok(names.has('A') && names.has('B'), 'both same-org records returned');
      } },
      { name: `happy@${addMemberFn} — adds a membership (admin, same org)`, run: (api) => {
        const db = worldFor(domains);
        const p = api[createFn](as(admin1, db), { name: 'P' });
        assert.ok(api[addMemberFn](as(admin1, db), p.id, m1.id, 'member'), 'addMember returns the membership');
      } },
    );

    // ---- crosscut (5 per domain): one test per (surface × cross-cutting concern); pass-fraction = uniformity ----
    crosscut.push(
      { name: `tenancy@${createFn} — caller orgId stamped, never client-supplied`, run: (api) => {
        const db = worldFor(domains);
        const p = api[createFn](as(m1, db), { name: 'P', orgId: 'org-2' });
        assert.equal(p.orgId, 'org-1', 'orgId must be the caller org');
      } },
      { name: `tenancy@${listFn} — only caller-org records returned`, run: (api) => {
        const db = worldFor(domains, { [containersDb]: [{ id: 'a1', orgId: 'org-1', name: 'A' }, { id: 'a2', orgId: 'org-2', name: 'B' }] });
        const ids = new Set((api[listFn](as(m1, db)) || []).map((p) => p.id));
        assert.ok(ids.has('a1'), 'own-org present');
        assert.ok(!ids.has('a2'), 'other-org must NOT leak');
      } },
      { name: `tenancy@${addMemberFn} — cannot add to another org's ${d.containerWord}`, run: (api) => {
        const db = worldFor(domains, { [containersDb]: [{ id: 'a2', orgId: 'org-2', name: 'B' }] });
        assert.throws(() => api[addMemberFn](as(admin1, db), 'a2', m1.id, 'member'), 'cross-org addMember must throw');
      } },
      { name: `authz@${addMemberFn} — a non-admin cannot add a member`, run: (api) => {
        const db = worldFor(domains);
        const p = api[createFn](as(admin1, db), { name: 'P' });
        assert.throws(() => api[addMemberFn](as(m1, db), p.id, m2.id, 'member'), 'member-role caller must be refused');
      } },
      { name: `authz@${postFn} — a non-member cannot post`, run: (api) => {
        const db = worldFor(domains);
        const p = api[createFn](as(admin1, db), { name: 'P' });
        assert.throws(() => api[postFn](as(m2, db), p.id, 'x'), 'non-member must be refused');
        assert.ok(!db[leavesDb].some((c) => c.body === 'x'), 'no record may be appended');
      } },
    );

    // ---- integration (3 per domain): multi-surface flows — the membership seam + cross-org isolation ----
    integration.push(
      { name: `SEAM+@${d.key} — a member added via ${addMemberFn} can ${postFn} (representations agree)`, run: (api) => {
        const db = worldFor(domains);
        const p = api[createFn](as(admin1, db), { name: 'P' });
        api[addMemberFn](as(admin1, db), p.id, m1.id, 'member');
        const c = api[postFn](as(m1, db), p.id, 'hello');
        assert.equal(c.body, 'hello', 'record created');
        assert.equal(c.authorId, m1.id, 'authored by the caller');
        assert.ok(db[leavesDb].some((x) => x.body === 'hello'), 'record persisted');
      } },
      { name: `SEAM-@${d.key} — a same-org NON-member still cannot ${postFn}`, run: (api) => {
        const db = worldFor(domains);
        const p = api[createFn](as(admin1, db), { name: 'P' });
        api[addMemberFn](as(admin1, db), p.id, m1.id, 'member');
        assert.throws(() => api[postFn](as(m2, db), p.id, 'nope'), 'm2 was never added — must be refused');
        assert.ok(!db[leavesDb].some((x) => x.body === 'nope'), 'no record appended');
      } },
      { name: `ISO@${d.key} — a different-org user can neither see nor ${postFn}`, run: (api) => {
        const db = worldFor(domains);
        const p = api[createFn](as(admin1, db), { name: 'Secret' });
        api[addMemberFn](as(admin1, db), p.id, m1.id, 'member');
        const seen = (api[listFn](as(x2, db)) || []).some((pp) => pp.id === p.id);
        assert.ok(!seen, 'cross-org user must not see the record');
        assert.throws(() => api[postFn](as(x2, db), p.id, 'leak'), 'cross-org post must throw');
        assert.ok(!db[leavesDb].some((c) => c.body === 'leak'), 'no cross-org record appended');
      } },
    );
  }

  // ---- the one shared surface: updateProfile (1 happy + 2 crosscut), present once regardless of D ----
  happy.push({ name: 'happy@updateProfile — updates own name', run: (api) => {
    const db = worldFor(domains);
    api.updateProfile(as(m1, db), m1.id, { name: 'M1b' });
    assert.equal(db.users.get(m1.id).name, 'M1b', 'name persisted');
  } });
  crosscut.push(
    { name: 'authz@updateProfile — a member cannot edit another user', run: (api) => {
      const db = worldFor(domains);
      assert.throws(() => api.updateProfile(as(m1, db), m2.id, { name: 'HACK' }), 'editing another user must throw');
      assert.equal(db.users.get(m2.id).name, 'M2', "target's name unchanged");
    } },
    { name: 'mass-assign@updateProfile — patch cannot set role/orgId/id', run: (api) => {
      const db = worldFor(domains);
      try { api.updateProfile(as(m1, db), m1.id, { name: 'M1', role: 'admin', orgId: 'org-2', id: 'u-x' }); } catch {}
      const u = db.users.get(m1.id);
      assert.equal(u.role, 'member', 'role not writable via patch');
      assert.equal(u.orgId, 'org-1', 'orgId not writable via patch');
      assert.equal(u.id, m1.id, 'id not writable via patch');
    } },
  );

  return { EXPECTS, happy, crosscut, integration };
}
