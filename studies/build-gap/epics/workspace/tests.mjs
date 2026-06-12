// Cohesion oracle for the `workspace` epic. Graded over the ASSEMBLED public API (an `api` object with
// the five surface functions), so it scores the SAME way whether the epic was built whole (one module)
// or as isolated chunks (one module per surface, assembled).
//
// Buckets:
//   happy        — each surface's stated behaviour, per-surface (the M0 floor).
//   crosscut     — one test per (surface × cross-cutting concern); the PASS-FRACTION is the cross-cutting
//                  UNIFORMITY metric. A single forgetful surface drops it below 1.0 even if every surface
//                  passes its own happy test.
//   integration  — multi-surface flows. The addMember→postComment "membership" seam (interface-drift
//                  detector) + cross-org isolation. These pass ONLY if independently-built pieces compose.
//
// REPRESENTATION-AGNOSTIC: the oracle never reads or seeds ctx.db.members directly. Membership is only
// ever established by calling api.addMember, and only ever observed via api.postComment / api.listProjects.
// So a solution that chose a different internal membership shape is NOT penalised — only DRIFT between two
// surfaces (addMember writes shape X, postComment reads shape Y) is. That is exactly the cohesion failure.
import assert from 'node:assert/strict';

// The five exports the assembled epic must expose (drives the wireability metric in the harness).
export const EXPECTS = ['createProject', 'listProjects', 'addMember', 'postComment', 'updateProfile'];

const admin1 = { id: 'u-admin1', orgId: 'org-1', name: 'Admin1', bio: '', role: 'admin' };
const m1 = { id: 'u-m1', orgId: 'org-1', name: 'M1', bio: '', role: 'member' };
const m2 = { id: 'u-m2', orgId: 'org-1', name: 'M2', bio: '', role: 'member' };
const x2 = { id: 'u-x2', orgId: 'org-2', name: 'X2', bio: '', role: 'member' };
const ALL_USERS = [admin1, m1, m2, x2];

// A fresh shared db. `projects` can be pre-seeded; members/comments start empty. Same db object is shared
// across sessions so writes by one surface are visible to another (the integration seam).
function world(extra = {}) {
  const users = new Map();
  for (const u of ALL_USERS) users.set(u.id, { ...u });
  const projects = new Map();
  for (const p of extra.projects || []) projects.set(p.id, { ...p });
  return { users, projects, comments: [], members: [] };
}
// A ctx for `caller` over a shared `db` (so multiple actors operate on the same world).
const as = (caller, db) => ({ session: { userId: caller.id, orgId: caller.orgId, role: caller.role }, db });

export const happy = [
  {
    name: 'createProject creates a project in the store',
    run: (api) => {
      const db = world();
      const p = api.createProject(as(admin1, db), { name: 'Apollo' });
      assert.equal(p.name, 'Apollo', 'returned project has the given name');
      assert.ok([...db.projects.values()].some((x) => x.name === 'Apollo'), 'project persisted in ctx.db.projects');
    },
  },
  {
    name: 'listProjects returns the projects',
    run: (api) => {
      const db = world({ projects: [{ id: 'p1', orgId: 'org-1', name: 'A' }, { id: 'p2', orgId: 'org-1', name: 'B' }] });
      const list = api.listProjects(as(admin1, db));
      const names = new Set((list || []).map((p) => p.name));
      assert.ok(names.has('A') && names.has('B'), 'both same-org projects returned');
    },
  },
  {
    name: 'addMember adds a membership without throwing (admin, same org)',
    run: (api) => {
      const db = world();
      const p = api.createProject(as(admin1, db), { name: 'P' });
      const r = api.addMember(as(admin1, db), p.id, m1.id, 'member');
      assert.ok(r, 'addMember returns the created membership');
    },
  },
  {
    name: 'updateProfile updates own name',
    run: (api) => {
      const db = world();
      api.updateProfile(as(m1, db), m1.id, { name: 'M1b' });
      assert.equal(db.users.get(m1.id).name, 'M1b', 'name persisted');
    },
  },
];

export const crosscut = [
  {
    name: 'tenancy@createProject — caller orgId is stamped, not client-supplied',
    run: (api) => {
      const db = world();
      const p = api.createProject(as(m1, db), { name: 'P', orgId: 'org-2' });
      assert.equal(p.orgId, 'org-1', 'project orgId must be the caller org, never from input');
    },
  },
  {
    name: 'tenancy@listProjects — only the caller-org projects are returned',
    run: (api) => {
      const db = world({ projects: [{ id: 'p1', orgId: 'org-1', name: 'A' }, { id: 'p2', orgId: 'org-2', name: 'B' }] });
      const ids = new Set((api.listProjects(as(m1, db)) || []).map((p) => p.id));
      assert.ok(ids.has('p1'), 'own-org project present');
      assert.ok(!ids.has('p2'), 'other-org project must NOT leak');
    },
  },
  {
    name: 'tenancy@addMember — cannot add a member to another org\'s project',
    run: (api) => {
      const db = world({ projects: [{ id: 'p2', orgId: 'org-2', name: 'B' }] });
      assert.throws(() => api.addMember(as(admin1, db), 'p2', m1.id, 'member'), 'cross-org addMember must throw');
    },
  },
  {
    name: 'authz@addMember — a non-admin cannot add a member',
    run: (api) => {
      const db = world();
      const p = api.createProject(as(admin1, db), { name: 'P' });
      assert.throws(() => api.addMember(as(m1, db), p.id, m2.id, 'member'), 'member-role caller must be refused');
    },
  },
  {
    name: 'authz@postComment — a non-member cannot post',
    run: (api) => {
      const db = world();
      const p = api.createProject(as(admin1, db), { name: 'P' });
      assert.throws(() => api.postComment(as(m2, db), p.id, 'x'), 'non-member must be refused');
      assert.ok(!db.comments.some((c) => c.body === 'x'), 'no comment may be appended');
    },
  },
  {
    name: 'authz@updateProfile — a member cannot edit another user',
    run: (api) => {
      const db = world();
      assert.throws(() => api.updateProfile(as(m1, db), m2.id, { name: 'HACK' }), 'editing another user must throw');
      assert.equal(db.users.get(m2.id).name, 'M2', "target's name unchanged");
    },
  },
  {
    name: 'mass-assign@updateProfile — patch cannot set role/orgId/id',
    run: (api) => {
      const db = world();
      try { api.updateProfile(as(m1, db), m1.id, { name: 'M1', role: 'admin', orgId: 'org-2', id: 'u-x' }); } catch {}
      const u = db.users.get(m1.id);
      assert.equal(u.role, 'member', 'role not writable via patch');
      assert.equal(u.orgId, 'org-1', 'orgId not writable via patch');
      assert.equal(u.id, m1.id, 'id not writable via patch');
    },
  },
];

export const integration = [
  {
    name: 'SEAM+: a member added via addMember can postComment (representations agree)',
    run: (api) => {
      const db = world();
      const p = api.createProject(as(admin1, db), { name: 'P' });
      api.addMember(as(admin1, db), p.id, m1.id, 'member');
      const c = api.postComment(as(m1, db), p.id, 'hello');
      assert.equal(c.body, 'hello', 'comment created');
      assert.equal(c.authorId, m1.id, 'authored by the caller');
      assert.ok(db.comments.some((x) => x.body === 'hello'), 'comment persisted');
    },
  },
  {
    name: 'SEAM-: a same-org NON-member still cannot post after someone else is added',
    run: (api) => {
      const db = world();
      const p = api.createProject(as(admin1, db), { name: 'P' });
      api.addMember(as(admin1, db), p.id, m1.id, 'member');
      assert.throws(() => api.postComment(as(m2, db), p.id, 'nope'), 'm2 was never added — must be refused');
      assert.ok(!db.comments.some((x) => x.body === 'nope'), 'no comment appended');
    },
  },
  {
    name: 'ISO: a different-org user can neither see nor comment on the project',
    run: (api) => {
      const db = world();
      const p = api.createProject(as(admin1, db), { name: 'Secret' });
      api.addMember(as(admin1, db), p.id, m1.id, 'member');
      const seen = (api.listProjects(as(x2, db)) || []).some((pp) => pp.id === p.id);
      assert.ok(!seen, 'cross-org user must not see the project');
      assert.throws(() => api.postComment(as(x2, db), p.id, 'leak'), 'cross-org comment must throw');
      assert.ok(!db.comments.some((c) => c.body === 'leak'), 'no cross-org comment appended');
    },
  },
];
