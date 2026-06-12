#!/usr/bin/env node
// Mutation-test the COHESION ORACLE: prove it scores a correct epic full marks, and that it DETECTS the
// two failure modes the study exists to measure — (1) interface DRIFT between independently-built
// surfaces (addMember writes one membership shape, postComment reads another) and (2) FRAGMENTED
// cross-cutting guards (every surface builds + passes its own happy test, but the authz/tenancy/
// mass-assignment guards are missing). Also checks an UNWIRED surface can't spuriously "pass" an
// assert.throws test. If any expectation fails, the oracle is untrustworthy and the study is invalid.
//
// Run: node tools/epic-oracle-selftest.mjs
import path from 'node:path';
import url from 'node:url';
import { evaluateEpic } from '../studies/build-gap/lib/epic-sandbox.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const TESTS = path.join(HERE, '..', 'studies', 'build-gap', 'epics', 'workspace', 'tests.mjs');

// ---- surface implementations as strings (so we can compose whole/isolated/mutant epics) ----------
const REF = {
  createProject: `export function createProject(ctx, input){ const id='p-'+Math.random().toString(36).slice(2); const p={id, orgId:ctx.session.orgId, name:input&&input.name}; ctx.db.projects.set(id,p); return p; }`,
  listProjects: `export function listProjects(ctx){ return [...ctx.db.projects.values()].filter(p=>p.orgId===ctx.session.orgId); }`,
  addMember: `export function addMember(ctx, projectId, userId, role){ const p=ctx.db.projects.get(projectId); if(!p) throw new Error('no project'); const u=ctx.db.users.get(userId); if(!u) throw new Error('no user'); if(ctx.session.role!=='admin') throw new Error('forbidden'); if(p.orgId!==ctx.session.orgId||u.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.members)) ctx.db.members=[]; const ex=ctx.db.members.find(m=>m.projectId===projectId&&m.userId===userId); if(ex){ex.role=role; return ex;} const rec={projectId,userId,role}; ctx.db.members.push(rec); return rec; }`,
  postComment: `export function postComment(ctx, projectId, body){ const p=ctx.db.projects.get(projectId); if(!p) throw new Error('no project'); if(p.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.members)) ctx.db.members=[]; const isM=ctx.db.members.some(m=>m.projectId===projectId&&m.userId===ctx.session.userId); if(!isM) throw new Error('not a member'); const c={id:'c-'+Math.random().toString(36).slice(2), projectId, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.comments.push(c); return c; }`,
  updateProfile: `export function updateProfile(ctx, targetUserId, patch){ const u=ctx.db.users.get(targetUserId); if(!u) throw new Error('no user'); if(ctx.session.userId!==targetUserId && ctx.session.role!=='admin') throw new Error('forbidden'); if(patch&&typeof patch==='object'){ if('name' in patch) u.name=patch.name; if('bio' in patch) u.bio=patch.bio; } return u; }`,
};

// DRIFT: postComment reads membership from project.members (which addMember never writes — it uses
// ctx.db.members). Each surface is individually plausible; together the seam is broken.
const DRIFT_postComment = `export function postComment(ctx, projectId, body){ const p=ctx.db.projects.get(projectId); if(!p) throw new Error('no project'); if(p.orgId!==ctx.session.orgId) throw new Error('cross-org'); const isM=Array.isArray(p.members)&&p.members.some(m=>(m.userId||m)===ctx.session.userId); if(!isM) throw new Error('not a member'); const c={id:'c-'+Math.random().toString(36).slice(2), projectId, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.comments.push(c); return c; }`;

// NO-GUARDS: happy behaviour only, every cross-cutting guard dropped; membership seam itself is fine.
const NOGUARD = {
  createProject: `export function createProject(ctx, input){ const id='p-'+Math.random().toString(36).slice(2); const p={id, orgId:(input&&input.orgId)||ctx.session.orgId, name:input&&input.name}; ctx.db.projects.set(id,p); return p; }`,
  listProjects: `export function listProjects(ctx){ return [...ctx.db.projects.values()]; }`,
  addMember: `export function addMember(ctx, projectId, userId, role){ if(!Array.isArray(ctx.db.members)) ctx.db.members=[]; const rec={projectId,userId,role}; ctx.db.members.push(rec); return rec; }`,
  postComment: `export function postComment(ctx, projectId, body){ if(!Array.isArray(ctx.db.members)) ctx.db.members=[]; const c={id:'c-'+Math.random().toString(36).slice(2), projectId, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.comments.push(c); return c; }`,
  updateProfile: `export function updateProfile(ctx, targetUserId, patch){ const u=ctx.db.users.get(targetUserId); if(!u) throw new Error('no user'); Object.assign(u, patch||{}); return u; }`,
};

const whole = (surf) => Object.values(surf).join('\n');
const sig = (r) => `wire ${r.wire.pass}/${r.wire.total} | happy ${r.happy.pass}/${r.happy.total} | crosscut ${r.crosscut.pass}/${r.crosscut.total} | integration ${r.integration.pass}/${r.integration.total}`;

const noPost = (() => { const r = { ...REF }; delete r.postComment; return r; })();

// The discrimination cases: a correct epic full marks, and the two failure modes the study measures.
const CASES = [
  ['reference / whole', { mode: 'whole', moduleText: whole(REF) }, 'wire 5/5 | happy 4/4 | crosscut 7/7 | integration 3/3'],
  ['reference / isolated', { mode: 'isolated', files: REF }, 'wire 5/5 | happy 4/4 | crosscut 7/7 | integration 3/3'],
  ['membership DRIFT / isolated', { mode: 'isolated', files: { ...REF, postComment: DRIFT_postComment } }, 'wire 5/5 | happy 4/4 | crosscut 7/7 | integration 2/3'],
  ['no-guards / whole', { mode: 'whole', moduleText: whole(NOGUARD) }, 'wire 5/5 | happy 4/4 | crosscut 0/7 | integration 1/3'],
  ['unwired postComment / isolated', { mode: 'isolated', files: noPost }, 'wire 4/5 | happy 4/4 | crosscut 6/7 | integration 0/3'],
];

// Suite entry point (run-all.mjs contract): throws on any mismatch, returns { name, assertions }.
export default async function epicOracleSelftest({ log } = {}) {
  for (const [label, input, want] of CASES) {
    const r = await evaluateEpic({ ...input, testsPath: TESTS });
    const got = sig(r);
    const ok = got === want;
    if (log) {
      log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
      log(`        got:  ${got}`);
      if (!ok) { log(`        want: ${want}`); for (const f of [...r.happy.fails, ...r.crosscut.fails, ...r.integration.fails]) log(`          - ${f.name} :: ${f.why}`); }
    }
    if (!ok) throw new Error(`epic-oracle: "${label}" got [${got}] want [${want}]`);
  }
  return { name: 'epic-oracle', assertions: CASES.length };
}

// Standalone runner (node tools/epic-oracle-selftest.mjs): rich per-case output.
if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  epicOracleSelftest({ log: console.log })
    .then((r) => { console.log(`\nOK — oracle discriminates as designed (${r.assertions} cases)`); process.exit(0); })
    .catch((e) => { console.error(`\n${e.message}\nOracle is NOT trustworthy`); process.exit(1); });
}
