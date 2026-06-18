#!/usr/bin/env node
// Assemble + validate + content-hash the sequestered ≥80-epic TEST set (P3 prerequisite #2).
//
// The set spans FOUR distinct seam topologies (the n_eff floor, FREEZE §4 / DESIGN §5): membership (frozen,
// graded by the independent 2nd oracle), approval, lifecycle, quota. Within each new topology, epics are
// lexically-distinct WINDOWS over an 8-domain catalog × sizes — clustered draws whose analysis is
// design-effect-adjusted by topology (R2C-1). Each epic is graded by its INDEPENDENT property-based oracle.
//
// This does NOT emit hundreds of static files: it enumerates the set deterministically, VALIDATES every
// epic's reference (no false positive) through the real evaluateEpic path, and writes a manifest + a single
// content HASH over {grader sources, frozen apparatus pin, the per-epic grader structure}. The hash is the
// pre-registration commitment (FREEZE §4): void-on-change. Regeneration from this pinned generator is
// deterministic, so the manifest + hash define the set.
//
// Run:  node studies/meta-search/gen-test-set.mjs            # validate + write manifest + hash
//       node studies/meta-search/gen-test-set.mjs --no-validate   # manifest + hash only (fast)
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import crypto from 'node:crypto';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { domainsFor } from '../build-gap/lib/scale-oracle.mjs';
import * as cfg from './src/config.mjs';
import { buildApprovalOracle, approvalRefImpls, requestDomainsWindow } from './epics-src/approval.mjs';
import { buildLifecycleOracle, lifecycleRefImpls, docDomainsWindow } from './epics-src/lifecycle.mjs';
import { buildQuotaOracle, quotaRefImpls, walletDomainsWindow } from './epics-src/quota.mjs';
import { buildOracle2 } from './src/oracle2.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DYN = path.join(HERE, 'epics', '_dyn-tests.mjs');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const fileSha = (p) => sha(fs.readFileSync(p, 'utf8'));
const validate = !process.argv.includes('--no-validate');

// ---- a correct multi-domain MEMBERSHIP reference (the scale-oracle template, generalized per domain) -----
function membershipRef(domains) {
  const out = {};
  for (const d of domains) {
    out[d.createFn] = `export function ${d.createFn}(ctx, input){ const id='${d.key}-'+Math.random().toString(36).slice(2); const p={id, orgId:ctx.session.orgId, name:input&&input.name}; ctx.db.${d.containersDb}.set(id,p); return p; }`;
    out[d.listFn] = `export function ${d.listFn}(ctx){ return [...ctx.db.${d.containersDb}.values()].filter(p=>p.orgId===ctx.session.orgId); }`;
    out[d.addMemberFn] = `export function ${d.addMemberFn}(ctx, ${d.idArg}, userId, role){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); const u=ctx.db.users.get(userId); if(!u) throw new Error('no user'); if(ctx.session.role!=='admin') throw new Error('forbidden'); if(p.orgId!==ctx.session.orgId||u.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const ex=ctx.db.${d.membersDb}.find(x=>x.${d.idArg}===${d.idArg}&&x.userId===userId); if(ex){ex.role=role; return ex;} const rec={${d.idArg},userId,role}; ctx.db.${d.membersDb}.push(rec); return rec; }`;
    out[d.postFn] = `export function ${d.postFn}(ctx, ${d.idArg}, body){ const p=ctx.db.${d.containersDb}.get(${d.idArg}); if(!p) throw new Error('no container'); if(p.orgId!==ctx.session.orgId) throw new Error('cross-org'); if(!Array.isArray(ctx.db.${d.membersDb})) ctx.db.${d.membersDb}=[]; const isM=ctx.db.${d.membersDb}.some(x=>x.${d.idArg}===${d.idArg}&&x.userId===ctx.session.userId); if(!isM) throw new Error('not a member'); const c={id:'c-'+Math.random().toString(36).slice(2), ${d.idArg}, authorId:ctx.session.userId, orgId:ctx.session.orgId, body, createdAt:0}; ctx.db.${d.leavesDb}.push(c); return c; }`;
  }
  out.updateProfile = `export function updateProfile(ctx, targetUserId, patch){ const u=ctx.db.users.get(targetUserId); if(!u) throw new Error('no user'); if(ctx.session.userId!==targetUserId && ctx.session.role!=='admin') throw new Error('forbidden'); if(patch&&typeof patch==='object'){ if('name' in patch) u.name=patch.name; if('bio' in patch) u.bio=patch.bio; } return u; }`;
  return out;
}

// ---- per-topology resolvers (grader, reference, domain window) -------------------------------------------
const RESOLVE = {
  membership: { build: (st, sz) => buildOracle2(domainsFor(sz)), ref: (st, sz) => membershipRef(domainsFor(sz)), keys: (st, sz) => domainsFor(sz).map((d) => d.key) },
  approval: { build: (st, sz) => buildApprovalOracle(requestDomainsWindow(st, sz)), ref: (st, sz) => approvalRefImpls(requestDomainsWindow(st, sz)), keys: (st, sz) => requestDomainsWindow(st, sz).map((d) => d.key) },
  lifecycle: { build: (st, sz) => buildLifecycleOracle(docDomainsWindow(st, sz)), ref: (st, sz) => lifecycleRefImpls(docDomainsWindow(st, sz)), keys: (st, sz) => docDomainsWindow(st, sz).map((d) => d.key) },
  quota: { build: (st, sz) => buildQuotaOracle(walletDomainsWindow(st, sz)), ref: (st, sz) => quotaRefImpls(walletDomainsWindow(st, sz)), keys: (st, sz) => walletDomainsWindow(st, sz).map((d) => d.key) },
};

// ---- enumerate the TEST set (deterministic) --------------------------------------------------------------
function enumerate() {
  const epics = [];
  for (let D = 1; D <= 5; D++) epics.push({ topo: 'membership', start: 0, size: D, id: `membership-d${D}` });
  for (const topo of ['approval', 'lifecycle', 'quota']) {
    for (let start = 0; start < 8; start++) for (const size of [1, 2, 3]) epics.push({ topo, start, size, id: `${topo}-s${start}-d${size}` });
    for (let start = 0; start < 3; start++) epics.push({ topo, start, size: 4, id: `${topo}-s${start}-d4` });
  }
  return epics;
}

async function main() {
  const epics = enumerate();
  const rate = (b) => (b && b.total ? b.pass / b.total : 1);
  const records = [];
  let fp = 0;

  for (const e of epics) {
    const r = RESOLVE[e.topo];
    const o = r.build(e.start, e.size);
    const cells = { crosscut: o.crosscut.map((t) => t.name), integration: o.integration.map((t) => t.name) };
    const rec = { id: e.id, topo: e.topo, start: e.start, size: e.size, keys: r.keys(e.start, e.size), EXPECTS: o.EXPECTS,
      lethalCells: cells.crosscut.length + cells.integration.length };
    rec.digest = sha(JSON.stringify({ topo: e.topo, keys: rec.keys, EXPECTS: o.EXPECTS, cells }));

    if (validate) {
      process.env.TS_TOPO = e.topo; process.env.TS_START = String(e.start); process.env.TS_SIZE = String(e.size);
      const g = await evaluateEpic({ mode: 'isolated', files: r.ref(e.start, e.size), testsPath: DYN });
      const ok = rate(g.crosscut) === 1 && rate(g.integration) === 1 && rate(g.happy) === 1;
      rec.refFullMarks = ok;
      if (!ok) { fp++; console.log(`  ✗ FALSE POSITIVE  ${e.id}  h${g.happy.pass}/${g.happy.total} c${g.crosscut.pass}/${g.crosscut.total} i${g.integration.pass}/${g.integration.total}`); }
    }
    records.push(rec);
  }

  // content hash: per-epic grader structure + grader source files + the frozen apparatus pin.
  const graderSources = {
    'epics-src/approval.mjs': fileSha(path.join(HERE, 'epics-src', 'approval.mjs')),
    'epics-src/lifecycle.mjs': fileSha(path.join(HERE, 'epics-src', 'lifecycle.mjs')),
    'epics-src/quota.mjs': fileSha(path.join(HERE, 'epics-src', 'quota.mjs')),
    'src/oracle2.mjs': fileSha(path.join(HERE, 'src', 'oracle2.mjs')),
    'gen-test-set.mjs': fileSha(path.join(HERE, 'gen-test-set.mjs')),
    'apparatus(build-gap) pin': cfg.CONTENT_PINS.apparatus,
  };
  const perEpicDigests = records.map((r) => `${r.id}:${r.digest}`).sort();
  const contentHash = sha(JSON.stringify({ epics: perEpicDigests, graderSources }));

  const byTopo = {};
  for (const r of records) byTopo[r.topo] = (byTopo[r.topo] || 0) + 1;

  const manifest = {
    name: 'meta-search P3 sequestered TEST set',
    builtBy: 'studies/meta-search/gen-test-set.mjs',
    nEpics: records.length,
    nTopologies: Object.keys(byTopo).length,
    byTopology: byTopo,
    seamTopologies: { membership: 'post ⟹ is-member (graded by the independent 2nd oracle)', approval: 'execute ⟹ approved-by-distinct-admin', lifecycle: 'legal state-transition ordering + gated read', quota: 'counter conservation + no-overspend + idempotent' },
    graderSources,
    validated: validate,
    falsePositives: validate ? fp : null,
    contentHash,
    epics: records.map(({ digest, ...rest }) => ({ ...rest, digest })),
  };
  const outDir = path.join(HERE, 'runs');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'test-set-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  console.log(`\nTEST set: ${records.length} epics across ${Object.keys(byTopo).length} seam topologies ${JSON.stringify(byTopo)}`);
  if (validate) console.log(`reference validation: ${records.filter((r) => r.refFullMarks).length}/${records.length} full marks, ${fp} false positives`);
  console.log(`content hash: ${contentHash}`);
  console.log(`wrote ${path.relative(ROOT, path.join(outDir, 'test-set-manifest.json'))}`);
  process.exit(validate && fp > 0 ? 1 : 0);
}

main();
