// Reference + mutant surface implementations for the workspace/scale-d1 anchor epic, generated from the
// scale-oracle template (domainsFor(1) === the workspace surface set). Used by:
//   - G1 (per-cell metric wiring): a correct build + a single-lethal-cell-drop build, scored by the REAL
//     apparatus (evaluateEpic), to prove the §6 per-cell metric + veto are wired against real bucket data.
//   - G2 (oracle kill-rate gate): a battery of mutants per lethal bucket; the gate measures the fraction
//     the oracle detects (kill-rate) and gates it at ≥ K6 (0.90) on the lethal buckets.
//
// The ref impls mirror tools/scale-oracle-selftest.mjs (the proven, mutation-tested template) so the
// numbers are anchored to an already-trusted reference; each mutant surgically breaks ONE obligation.

import { domainsFor, buildOracle } from '../../../build-gap/lib/scale-oracle.mjs';

const D1 = domainsFor(1);
const d = D1[0]; // the single 'project' domain (createProject/listProjects/addMember/postComment)

export const EXPECTS = buildOracle(D1).EXPECTS;

// ---- correct reference implementations (full marks) -----------------------------------------------
const REF = {
  [d.createFn]: `export function ${d.createFn}(ctx, input){ const id='${d.key}-'+Math.random().toString(36).slice(2); const p={id, orgId:ctx.session.orgId, name:input&&input.name}; ctx.db.${d.containersDb}.set(id,p); return p; }`,
  [d.listFn]: `export function ${d.listFn}(ctx){ return [...ctx.db.${d.containersDb}.values()].filter(p=>p.orgId===ctx.session.orgId); }`,
  [d.addMemberFn]: `export function ${d.addMemberFn}(ctx, ${d.idArg}, userId, role){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); const u=ctx.db.users.get(userId); if(!u) throw new Error('no user'); if(ctx.session.role!=='admin') throw new Error('forbidden'); if(p.orgId!==ctx.session.orgId||u.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const ex=ctx.db.${d.membersDb}.find(x=>x.${d.idArg}===${d.idArg}&&x.userId===userId); if(ex){ex.role=role; return ex;} const rec={${d.idArg},userId,role}; ctx.db.${d.membersDb}.push(rec); return rec; }`,
  [d.postFn]: `export function ${d.postFn}(ctx, ${d.idArg}, body){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); if(p.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const isM=ctx.db.${d.membersDb}.some(x=>x.${d.idArg}===${d.idArg}&&x.userId===ctx.session.userId); if(!isM) throw new Error('not a member'); const c={id:'c-'+Math.random().toString(36).slice(2), ${d.idArg}, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.${d.leavesDb}.push(c); return c; }`,
  updateProfile: `export function updateProfile(ctx, targetUserId, patch){ const u=ctx.db.users.get(targetUserId); if(!u) throw new Error('no user'); if(ctx.session.userId!==targetUserId && ctx.session.role!=='admin') throw new Error('forbidden'); if(patch&&typeof patch==='object'){ if('name' in patch) u.name=patch.name; if('bio' in patch) u.bio=patch.bio; } return u; }`,
};

export function refImpls() { return { ...REF }; }

// helper: clone REF, replace one function with a broken variant
const withFn = (fn, body) => ({ ...REF, [fn]: body });

// ---- mutants, each tagged with the lethal bucket it should drive below full ------------------------
// crosscut-targeting (one cross-cutting obligation each)
const CROSSCUT = [
  { id: 'cx_tenancy_create_input', body: withFn(d.createFn, `export function ${d.createFn}(ctx, input){ const id='x-'+Math.random().toString(36).slice(2); const p={id, orgId:(input&&input.orgId)||ctx.session.orgId, name:input&&input.name}; ctx.db.${d.containersDb}.set(id,p); return p; }`) },
  { id: 'cx_tenancy_create_noorg', body: withFn(d.createFn, `export function ${d.createFn}(ctx, input){ const id='x-'+Math.random().toString(36).slice(2); const p={id, name:input&&input.name}; ctx.db.${d.containersDb}.set(id,p); return p; }`) },
  { id: 'cx_tenancy_list_all', body: withFn(d.listFn, `export function ${d.listFn}(ctx){ return [...ctx.db.${d.containersDb}.values()]; }`) },
  { id: 'cx_tenancy_add_crossorg', body: withFn(d.addMemberFn, `export function ${d.addMemberFn}(ctx, ${d.idArg}, userId, role){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); const u=ctx.db.users.get(userId); if(!u) throw new Error('no user'); if(ctx.session.role!=='admin') throw new Error('forbidden'); if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const rec={${d.idArg},userId,role}; ctx.db.${d.membersDb}.push(rec); return rec; }`) },
  { id: 'cx_authz_add_norole', body: withFn(d.addMemberFn, `export function ${d.addMemberFn}(ctx, ${d.idArg}, userId, role){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); const u=ctx.db.users.get(userId); if(!u) throw new Error('no user'); if(p.orgId!==ctx.session.orgId||u.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const rec={${d.idArg},userId,role}; ctx.db.${d.membersDb}.push(rec); return rec; }`) },
  { id: 'cx_authz_add_wrongrole', body: withFn(d.addMemberFn, `export function ${d.addMemberFn}(ctx, ${d.idArg}, userId, role){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); const u=ctx.db.users.get(userId); if(!u) throw new Error('no user'); if(ctx.session.role==='guest') throw new Error('forbidden'); if(p.orgId!==ctx.session.orgId||u.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const rec={${d.idArg},userId,role}; ctx.db.${d.membersDb}.push(rec); return rec; }`) },
  { id: 'cx_authz_post_nomember', body: withFn(d.postFn, `export function ${d.postFn}(ctx, ${d.idArg}, body){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); if(p.orgId!==ctx.session.orgId) throw new Error('cross-org'); const c={id:'c-'+Math.random().toString(36).slice(2), ${d.idArg}, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.${d.leavesDb}.push(c); return c; }`) },
  { id: 'cx_authz_profile_noowner', body: withFn('updateProfile', `export function updateProfile(ctx, targetUserId, patch){ const u=ctx.db.users.get(targetUserId); if(!u) throw new Error('no user'); if(patch&&typeof patch==='object'){ if('name' in patch) u.name=patch.name; if('bio' in patch) u.bio=patch.bio; } return u; }`) },
  { id: 'cx_massassign_profile', body: withFn('updateProfile', `export function updateProfile(ctx, targetUserId, patch){ const u=ctx.db.users.get(targetUserId); if(!u) throw new Error('no user'); if(ctx.session.userId!==targetUserId && ctx.session.role!=='admin') throw new Error('forbidden'); Object.assign(u, patch||{}); return u; }`) },
  { id: 'cx_massassign_profile_role', body: withFn('updateProfile', `export function updateProfile(ctx, targetUserId, patch){ const u=ctx.db.users.get(targetUserId); if(!u) throw new Error('no user'); if(ctx.session.userId!==targetUserId && ctx.session.role!=='admin') throw new Error('forbidden'); if(patch&&typeof patch==='object'){ if('name' in patch) u.name=patch.name; if('role' in patch) u.role=patch.role; if('orgId' in patch) u.orgId=patch.orgId; } return u; }`) },
];

// integration-targeting (the membership seam / cross-org isolation)
const INTEGRATION = [
  { id: 'in_drift_post_members', body: withFn(d.postFn, `export function ${d.postFn}(ctx, ${d.idArg}, body){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); if(p.orgId!==ctx.session.orgId) throw new Error('cross-org'); const isM=Array.isArray(p.members)&&p.members.some(x=>(x.userId||x)===ctx.session.userId); if(!isM) throw new Error('not a member'); const c={id:'c-'+Math.random().toString(36).slice(2), ${d.idArg}, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.${d.leavesDb}.push(c); return c; }`) },
  { id: 'in_seam_nopersist', body: withFn(d.addMemberFn, `export function ${d.addMemberFn}(ctx, ${d.idArg}, userId, role){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); const u=ctx.db.users.get(userId); if(!u) throw new Error('no user'); if(ctx.session.role!=='admin') throw new Error('forbidden'); if(p.orgId!==ctx.session.orgId||u.orgId!==ctx.session.orgId) throw new Error('cross-org'); return {${d.idArg},userId,role}; }`) },
  { id: 'in_post_nopersist', body: withFn(d.postFn, `export function ${d.postFn}(ctx, ${d.idArg}, body){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); if(p.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const isM=ctx.db.${d.membersDb}.some(x=>x.${d.idArg}===${d.idArg}&&x.userId===ctx.session.userId); if(!isM) throw new Error('not a member'); return {id:'c-'+Math.random().toString(36).slice(2), ${d.idArg}, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; }`) },
  { id: 'in_crossorg_list', body: withFn(d.listFn, `export function ${d.listFn}(ctx){ const own=[...ctx.db.${d.containersDb}.values()].filter(p=>p.orgId===ctx.session.orgId); const other=[...ctx.db.${d.containersDb}.values()].filter(p=>p.orgId!==ctx.session.orgId); return own.concat(other); }`) },
  { id: 'in_post_wrongauthor', body: withFn(d.postFn, `export function ${d.postFn}(ctx, ${d.idArg}, body){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); if(p.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const isM=ctx.db.${d.membersDb}.some(x=>x.${d.idArg}===${d.idArg}&&x.userId===ctx.session.userId); if(!isM) throw new Error('not a member'); const c={id:'c-'+Math.random().toString(36).slice(2), ${d.idArg}, authorId:'someone-else', orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.${d.leavesDb}.push(c); return c; }`) },
  { id: 'in_seam_minus_anyuser', body: withFn(d.postFn, `export function ${d.postFn}(ctx, ${d.idArg}, body){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); if(p.orgId!==ctx.session.orgId) throw new Error('cross-org'); const c={id:'c-'+Math.random().toString(36).slice(2), ${d.idArg}, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.${d.leavesDb}.push(c); return c; }`) },
];

export const MUTANTS = [
  ...CROSSCUT.map((m) => ({ ...m, target: 'crosscut' })),
  ...INTEGRATION.map((m) => ({ ...m, target: 'integration' })),
];

// A single, clean lethal-cell-drop build for G1 (drops authz@addMember — a silent, expensive obligation).
export function dropAuthzAddMember() { return CROSSCUT.find((m) => m.id === 'cx_authz_add_norole').body; }
