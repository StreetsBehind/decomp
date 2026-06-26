#!/usr/bin/env node
// SMOKE for Lever A (container-recon.mjs) — deterministic, $0, oracle-blind. Unit transforms + the membership
// bit-identical guard + a real quota-d1 dump check (the object-property→Map class all existing gates miss).
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { runContainerRecon, canonicalType, discoverStores } from '../src/container-recon.mjs';
import { runSeamGate } from '../src/seam-gate.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.log(`  FAIL  ${name}`); } };

// 1. object-property write on a canonically-Map store → .set (surface-consensus canon, no declared shape)
{
  const files = { w: 'export function w(ctx){ ctx.db.wallets[id] = wallet; }', r: 'export function r(ctx){ return ctx.db.wallets.get(id); }' };
  ok('canon=map by surface consensus', canonicalType('wallets', files, {}) === 'map');
  const res = await runContainerRecon({ surfaces: ['w', 'r'], files });
  ok('object-write → .set', /ctx\.db\.wallets\.set\(id, wallet\);/.test(files.w) && res.transforms === 1);
}
// 2. object-property read → .get
{
  const files = { w: 'export function w(ctx){ ctx.db.things.set(k, v); }', r: 'export function r(ctx){ const x = ctx.db.things[k]; return x; }' };
  await runContainerRecon({ surfaces: ['w', 'r'], files });
  ok('object-read → .get', /ctx\.db\.things\.get\(k\)/.test(files.r));
}
// 3. declared shape wins over consensus (preamble declares Map; surface only object-indexes)
{
  const files = { a: 'export function a(ctx){ ctx.db.users[id] = u; }' };
  const preamble = '- `ctx.db.users` — a Map from id to user.';
  const res = await runContainerRecon({ surfaces: ['a'], files, baseModel: preamble });
  ok('declared map drives transform with no reader consensus', /ctx\.db\.users\.set\(id, u\)/.test(files.a) && res.transforms === 1);
}
// 4. init-type matching (canonical map, surface inits with [])
{
  const files = { w: 'export function w(ctx){ ctx.db.t = []; ctx.db.t.set(k, v); }', r: 'export function r(ctx){ return ctx.db.t.get(k); }' };
  await runContainerRecon({ surfaces: ['w', 'r'], files });
  ok('init [] → new Map() on canonical map', /ctx\.db\.t = new Map\(\)/.test(files.w));
}
// 5. SAFE no-op on ambiguous store (both map AND array methods present → structural divergence, out of scope)
{
  const files = { a: 'export function a(ctx){ return ctx.db.s.get(k); }', b: 'export function b(ctx){ ctx.db.s.push(x); ctx.db.s[k] = 1; }' };
  ok('canon=null when both map+array present', canonicalType('s', files, {}) === null);
  const res = await runContainerRecon({ surfaces: ['a', 'b'], files });
  ok('ambiguous store untouched (no false repair)', res.transforms === 0 && /ctx\.db\.s\[k\] = 1/.test(files.b));
}
// 6. SAFE no-op on a canonically-ARRAY store (real numeric indexing must NOT be mapified)
{
  const files = { x: 'export function x(ctx){ ctx.db.list.push(a); const z = ctx.db.list[0]; return z; }' };
  ok('canon=array', canonicalType('list', files, {}) === 'array');
  const res = await runContainerRecon({ surfaces: ['x'], files });
  ok('array store with [0] indexing untouched', res.transforms === 0 && /ctx\.db\.list\[0\]/.test(files.x));
}
// 7. reject == / === / += masquerading as object-write assignment
{
  const files = { a: 'export function a(ctx){ if (ctx.db.m[k] === 1) {} const c = ctx.db.m.get(z); }' };
  // canon=map (has .get); the [k] === comparison must NOT become .set
  const res = await runContainerRecon({ surfaces: ['a'], files });
  ok('comparison [k] === not turned into .set', !/\.set\(/.test(files.a) && /ctx\.db\.m\.get\(k\) === 1/.test(files.a));
}
// 8. no-regress verify gate reverts a transform that fails verification
{
  const files = { w: 'export function w(ctx){ ctx.db.wallets[id] = wallet; }', r: 'export function r(ctx){ return ctx.db.wallets.get(id); }' };
  const res = await runContainerRecon({ surfaces: ['w', 'r'], files, verify: async () => false });
  ok('verify=false reverts the transform', res.transforms === 0 && res.reverts >= 1 && /ctx\.db\.wallets\[id\] = wallet/.test(files.w));
}
// 9. membership path stays bit-identical (recon must NOT run on the delegated membership topology)
{
  const skeleton = 'The membership store is `ctx.db.memberships` — a Map.';
  const surfaces = ['addMember', 'postComment'];
  const files = { addMember: 'export function addMember(ctx){ ctx.db.memberships[k] = 1; }', postComment: 'export function postComment(ctx){ return ctx.db.memberships.get(k); }' };
  const before = JSON.stringify(files);
  // membership delegates to runIntegrationGate which does NOT call container-recon → object-index left intact.
  const r = await runSeamGate({ surfaces, files, prompts: {}, skeleton, baseModel: '', gate: { kind: 'deterministic', repairDepth: 0 }, rebuild: async () => '' });
  ok('membership delegates (topology=membership)', r.topology === 'membership');
  ok('membership recon=null (recon did not run on delegated path)', r.recon === null);
  ok('membership object-index NOT rewritten (bit-identical delegation)', JSON.stringify(files) === before);
}
// 10. real quota-d1/d1 dump: createWallet object-write is reconciled to .set (the live gating-draw bug)
{
  const dump = path.join(ROOT, 'runs', 'dump-ladder', 'quota-d1-d1', 'raw');
  if (fs.existsSync(dump)) {
    const preamble = fs.readFileSync(path.join(ROOT, 'epics', 'quota-d1', 'preamble.md'), 'utf8');
    const order = ['createWallet', 'listWallets', 'deposit', 'withdraw'];
    const files = {};
    for (const s of order) { const f = path.join(dump, `${s}.mjs`); if (fs.existsSync(f)) files[s] = fs.readFileSync(f, 'utf8'); }
    const hadObjWrite = /ctx\.db\.wallets\s*\[[^\]]+\]\s*=/.test(files.createWallet || '');
    const res = await runContainerRecon({ surfaces: order, files, baseModel: preamble });
    ok('quota-d1 createWallet had object-write', hadObjWrite);
    ok('quota-d1 createWallet reconciled to .set', /ctx\.db\.wallets\.set\(/.test(files.createWallet || '') && res.transforms >= 1);
  } else {
    console.log('  (skip 10: quota-d1 dump not present)');
  }
}

console.log(`\ncontainer-recon-smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
