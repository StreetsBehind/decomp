#!/usr/bin/env node
// Mutation-test the SCALABLE cohesion oracle (lib/scale-oracle.mjs, the M-coh-3 size×harness instrument).
// Because the oracle is BUILT by one template at every size, validating it at a representative multi-domain
// size (D=2) — plus an anchor at D=1 (which is the already-trusted workspace fixture) and a spot at D=3 —
// validates it at all sizes. Proves the oracle (1) scores a correct epic full marks at each size, and (2)
// DETECTS the two failure modes the study measures: per-domain interface DRIFT (add*Member writes one
// membership shape, post* reads another) and FRAGMENTED cross-cutting guards (every surface builds + passes
// its own happy test, but authz/tenancy/mass-assignment are gone). Also checks an UNWIRED surface earns no
// spurious assert.throws credit. Any mismatch ⇒ the oracle is untrustworthy ⇒ the M-coh-3 numbers are void.
//
// Run: node tools/scale-oracle-selftest.mjs
import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { evaluateEpic } from '../studies/build-gap/lib/epic-sandbox.mjs';
import { buildOracle, domainsFor } from '../studies/build-gap/lib/scale-oracle.mjs';

// ---- impl templates, generated from a domain so they match the oracle's field names exactly ----------
function refImpls(domains) {
  const m = {};
  for (const d of domains) {
    m[d.createFn] = `export function ${d.createFn}(ctx, input){ const id='${d.key}-'+Math.random().toString(36).slice(2); const p={id, orgId:ctx.session.orgId, name:input&&input.name}; ctx.db.${d.containersDb}.set(id,p); return p; }`;
    m[d.listFn] = `export function ${d.listFn}(ctx){ return [...ctx.db.${d.containersDb}.values()].filter(p=>p.orgId===ctx.session.orgId); }`;
    m[d.addMemberFn] = `export function ${d.addMemberFn}(ctx, ${d.idArg}, userId, role){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); const u=ctx.db.users.get(userId); if(!u) throw new Error('no user'); if(ctx.session.role!=='admin') throw new Error('forbidden'); if(p.orgId!==ctx.session.orgId||u.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const ex=ctx.db.${d.membersDb}.find(x=>x.${d.idArg}===${d.idArg}&&x.userId===userId); if(ex){ex.role=role; return ex;} const rec={${d.idArg},userId,role}; ctx.db.${d.membersDb}.push(rec); return rec; }`;
    m[d.postFn] = `export function ${d.postFn}(ctx, ${d.idArg}, body){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); if(p.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const isM=ctx.db.${d.membersDb}.some(x=>x.${d.idArg}===${d.idArg}&&x.userId===ctx.session.userId); if(!isM) throw new Error('not a member'); const c={id:'c-'+Math.random().toString(36).slice(2), ${d.idArg}, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.${d.leavesDb}.push(c); return c; }`;
  }
  m.updateProfile = `export function updateProfile(ctx, targetUserId, patch){ const u=ctx.db.users.get(targetUserId); if(!u) throw new Error('no user'); if(ctx.session.userId!==targetUserId && ctx.session.role!=='admin') throw new Error('forbidden'); if(patch&&typeof patch==='object'){ if('name' in patch) u.name=patch.name; if('bio' in patch) u.bio=patch.bio; } return u; }`;
  return m;
}
// DRIFT: post* reads membership from the container record's `.members` (which add*Member never writes — it
// uses ctx.db.<membersDb>). Each surface is individually plausible; together the seam is broken.
function driftPost(d) {
  return `export function ${d.postFn}(ctx, ${d.idArg}, body){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); if(p.orgId!==ctx.session.orgId) throw new Error('cross-org'); const isM=Array.isArray(p.members)&&p.members.some(x=>(x.userId||x)===ctx.session.userId); if(!isM) throw new Error('not a member'); const c={id:'c-'+Math.random().toString(36).slice(2), ${d.idArg}, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.${d.leavesDb}.push(c); return c; }`;
}
// NO-GUARDS: happy behaviour only, every cross-cutting guard dropped; the membership seam itself stays intact.
function noGuardImpls(domains) {
  const m = {};
  for (const d of domains) {
    m[d.createFn] = `export function ${d.createFn}(ctx, input){ const id='${d.key}-'+Math.random().toString(36).slice(2); const p={id, orgId:(input&&input.orgId)||ctx.session.orgId, name:input&&input.name}; ctx.db.${d.containersDb}.set(id,p); return p; }`;
    m[d.listFn] = `export function ${d.listFn}(ctx){ return [...ctx.db.${d.containersDb}.values()]; }`;
    m[d.addMemberFn] = `export function ${d.addMemberFn}(ctx, ${d.idArg}, userId, role){ if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const rec={${d.idArg},userId,role}; ctx.db.${d.membersDb}.push(rec); return rec; }`;
    m[d.postFn] = `export function ${d.postFn}(ctx, ${d.idArg}, body){ if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const c={id:'c-'+Math.random().toString(36).slice(2), ${d.idArg}, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.${d.leavesDb}.push(c); return c; }`;
  }
  m.updateProfile = `export function updateProfile(ctx, targetUserId, patch){ const u=ctx.db.users.get(targetUserId); if(!u) throw new Error('no user'); Object.assign(u, patch||{}); return u; }`;
  return m;
}

const whole = (impls, order) => order.map((fn) => impls[fn]).join('\n');
const sig = (r) => `wire ${r.wire.pass}/${r.wire.total} | happy ${r.happy.pass}/${r.happy.total} | crosscut ${r.crosscut.pass}/${r.crosscut.total} | integration ${r.integration.pass}/${r.integration.total}`;

// Write a throwaway tests.mjs that re-exports buildOracle(domainsFor(D)) — the same shape the generator
// emits — so the sandbox's testsPath contract is exercised exactly as in a real run.
function writeTests(D) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `scale-oracle-d${D}-`));
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  const oraclePath = path.join(here, '..', 'studies', 'build-gap', 'lib', 'scale-oracle.mjs');
  const f = path.join(dir, 'tests.mjs');
  fs.writeFileSync(f, `import { buildOracle, domainsFor } from ${JSON.stringify(url.pathToFileURL(oraclePath).href)};
const o = buildOracle(domainsFor(${D}));
export const EXPECTS = o.EXPECTS; export const happy = o.happy; export const crosscut = o.crosscut; export const integration = o.integration;
`);
  return { dir, f };
}

function casesForD2(order) {
  const D2 = domainsFor(2);
  const ref = refImpls(D2);
  const d0 = D2[0]; const d1 = D2[1];
  // DRIFT in domain 0's post → that domain's SEAM+ fails; everything else full (5/6 integ).
  const drift = { ...ref, [d0.postFn]: driftPost(d0) };
  // NO-GUARDS everywhere → crosscut collapses to 0; happy stays full; each domain integ 1/3 → 2/6.
  const ng = noGuardImpls(D2);
  // UNWIRED domain 1's post → wire 8/9; its authz@post crosscut fails (no free credit); its 3 integ fail.
  const noPost = (() => { const r = { ...ref }; delete r[d1.postFn]; return r; })();
  return [
    ['D2 reference / whole', { mode: 'whole', moduleText: whole(ref, order) }, 'wire 9/9 | happy 7/7 | crosscut 12/12 | integration 6/6'],
    ['D2 reference / isolated', { mode: 'isolated', files: ref }, 'wire 9/9 | happy 7/7 | crosscut 12/12 | integration 6/6'],
    ['D2 membership DRIFT (domain 0) / isolated', { mode: 'isolated', files: drift }, 'wire 9/9 | happy 7/7 | crosscut 12/12 | integration 5/6'],
    ['D2 no-guards / whole', { mode: 'whole', moduleText: whole(ng, order) }, 'wire 9/9 | happy 7/7 | crosscut 0/12 | integration 2/6'],
    ['D2 unwired post (domain 1) / isolated', { mode: 'isolated', files: noPost }, 'wire 8/9 | happy 7/7 | crosscut 11/12 | integration 3/6'],
  ];
}

// Suite entry point (run-all.mjs contract): throws on any mismatch, returns { name, assertions }.
export default async function scaleOracleSelftest({ log } = {}) {
  let assertions = 0;
  const handles = [];
  try {
    // Anchors: a correct epic earns full marks at D=1 (== workspace), D=2, D=3.
    for (const D of [1, 2, 3]) {
      const order = buildOracle(domainsFor(D)).EXPECTS;
      const ref = refImpls(domainsFor(D));
      const { dir, f } = writeTests(D); handles.push(dir);
      const want = `wire ${4 * D + 1}/${4 * D + 1} | happy ${3 * D + 1}/${3 * D + 1} | crosscut ${5 * D + 2}/${5 * D + 2} | integration ${3 * D}/${3 * D}`;
      const got = sig(await evaluateEpic({ mode: 'isolated', files: ref, testsPath: f }));
      const ok = got === want;
      if (log) { log(`${ok ? 'PASS' : 'FAIL'}  D${D} reference / isolated full marks`); log(`        got:  ${got}`); if (!ok) log(`        want: ${want}`); }
      if (!ok) throw new Error(`scale-oracle: D${D} reference got [${got}] want [${want}]`);
      assertions++;
    }
    // Discrimination at D=2.
    const { dir, f } = writeTests(2); handles.push(dir);
    const order = buildOracle(domainsFor(2)).EXPECTS;
    for (const [label, input, want] of casesForD2(order)) {
      const r = await evaluateEpic({ ...input, testsPath: f });
      const got = sig(r);
      const ok = got === want;
      if (log) {
        log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
        log(`        got:  ${got}`);
        if (!ok) { log(`        want: ${want}`); for (const ff of [...r.happy.fails, ...r.crosscut.fails, ...r.integration.fails]) log(`          - ${ff.name} :: ${ff.why}`); }
      }
      if (!ok) throw new Error(`scale-oracle: "${label}" got [${got}] want [${want}]`);
      assertions++;
    }
  } finally {
    for (const dir of handles) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
  }
  return { name: 'scale-oracle', assertions };
}

// Standalone runner.
if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  scaleOracleSelftest({ log: console.log })
    .then((r) => { console.log(`\nOK — scale oracle discriminates as designed (${r.assertions} cases)`); process.exit(0); })
    .catch((e) => { console.error(`\n${e.message}\nScale oracle is NOT trustworthy`); process.exit(1); });
}
