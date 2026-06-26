#!/usr/bin/env node
// BEHAVIOURAL SCENARIO RUNNER for ONE approval execute-family triad (child process; oracle-blind; option 3,
// admissible-under-constraints per runs/deliberations/20260626T040021Z/). Unlike smoke-run.mjs (single surface,
// permissive proxies, free-id detection), this composes the candidate's OWN create→approve→execute surfaces in a
// SHARED real ctx and asserts a METAMORPHIC PROPERTY that is a verbatim paraphrase of ONE named skeleton clause:
//
//   approve→execute / SoD  (clause: "execute… requires a valid approval — one recorded by an admin who is not
//                            the requester"): execute with NO recorded approval → must throw; execute when the
//                            only approval is the requester's own (self-approval) → must throw.
//   execute-idempotency    (clause: "execute… is idempotent — re-executing must not append a second audit
//                            record"): on the valid path, a second execute must not grow the audit store.
//
// ADMISSIBILITY (the committed conjunction): inputs are this runner's OWN seeds (orgLB/reqLB/admLB/bodyLB — zero
// fixture/scenario/value literals from the held-out oracle); it imports ONLY the candidate surface modules (no
// oracle/grader); its verdict is computable with epics/*/tests.mjs deleted from disk (disk-deletion invariant);
// the asserted axis is exactly the named clauses, no broader. A setup step that throws → INCONCLUSIVE (never a
// false violation) — conservative, like the structural detector.
//
// argv: <dir> <createSurface> <approveSurface> <execSurface>
// stdout: JSON { sod: 'ok'|'violated'|'inconclusive', idempotency: 'ok'|'violated'|'inconclusive', notes: [] }

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const [, , dir, createS, approveS, execS] = process.argv;
const out = { sod: 'inconclusive', idempotency: 'inconclusive', notes: [] };

async function load(surface) {
  const m = await import(pathToFileURL(path.join(dir, `${surface}.mjs`)).href);
  const fn = m[surface] || m.default;
  if (typeof fn !== 'function') throw new Error(`no-export:${surface}`);
  return fn;
}
// tolerant "size" of an audit store across shapes (array / Map / Set / plain object).
function storeSize(s) {
  if (s == null) return 0;
  if (Array.isArray(s)) return s.length;
  if (typeof s.size === 'number') return s.size;
  if (typeof s === 'object') return Object.keys(s).length;
  return 0;
}
function auditSize(ctx) {
  const db = ctx.db || {};
  // sum the sizes of any audit-like store (the skeleton declares ctx.db.auditLog; be tolerant of name drift).
  let n = 0; let found = false;
  for (const k of Object.keys(db)) if (/audit/i.test(k)) { n += storeSize(db[k]); found = true; }
  return found ? n : storeSize(db.auditLog);
}
function recId(rec) {
  if (rec == null) return undefined;
  if (typeof rec === 'string' || typeof rec === 'number') return rec;
  return rec.id ?? rec._id ?? rec.requestId ?? rec.releaseId ?? rec.payoutId ?? rec.expenseId
    ?? (typeof rec === 'object' ? Object.values(rec).find((v) => typeof v === 'string' && v.length > 0) : undefined);
}
const INPUT = { body: 'bodyLB', title: 'bodyLB', name: 'bodyLB', description: 'bodyLB' };
const REQUESTER = { orgId: 'orgLB', userId: 'reqLB', role: 'member' };
const ADMIN = { orgId: 'orgLB', userId: 'admLB', role: 'admin' };       // distinct admin (valid approver/executor)
const SOLO = { orgId: 'orgLB', userId: 'soloLB', role: 'admin' };       // requester == approver (self-approval)
const call = async (fn, ctx, ...args) => { const r = fn(ctx, ...args); return (r && typeof r.then === 'function') ? await r : r; };

async function main() {
  let create, approve, exec;
  try { create = await load(createS); approve = await load(approveS); exec = await load(execS); }
  catch (e) { out.notes.push(`load:${String(e.message || e).slice(0, 50)}`); return; }

  // ---- SoD scenario A: execute with NO approval must throw -------------------------------------------
  try {
    const ctx = { session: { ...REQUESTER }, db: {} };
    const rec = await call(create, ctx, INPUT);
    const id = recId(rec);
    if (id === undefined) { out.notes.push('sod:no-id-from-create'); }
    else {
      ctx.session = { ...ADMIN };
      let threw = false;
      try { await call(exec, ctx, id); } catch { threw = true; }
      // SoD A: no approval recorded → execute MUST refuse.
      if (!threw) { out.sod = 'violated'; out.notes.push('sod:executed-without-approval'); }
      else out.sod = 'ok';
    }
  } catch (e) { out.notes.push(`sodA-setup:${String(e.message || e).slice(0, 40)}`); }

  // ---- SoD scenario B: self-approval (approver == requester) must not license execute ----------------
  if (out.sod !== 'violated') {
    try {
      const ctx = { session: { ...SOLO }, db: {} };
      const rec = await call(create, ctx, INPUT);
      const id = recId(rec);
      if (id !== undefined) {
        let approveThrew = false;
        try { await call(approve, ctx, id); } catch { approveThrew = true; } // a correct approve may itself refuse self-approval
        ctx.session = { ...SOLO };
        let execThrew = false;
        try { await call(exec, ctx, id); } catch { execThrew = true; }
        // valid execute requires an approval by a NON-requester admin; here the only approval is the requester's
        // own → execute MUST refuse. (If approve already refused the self-approval, execute refusing is also ok.)
        if (!execThrew) { out.sod = 'violated'; out.notes.push('sod:executed-on-self-approval'); }
        else if (out.sod !== 'violated') out.sod = 'ok';
      }
    } catch (e) { out.notes.push(`sodB-setup:${String(e.message || e).slice(0, 40)}`); }
  }

  // ---- idempotency scenario: valid path, second execute must not append a second audit record --------
  try {
    const ctx = { session: { ...REQUESTER }, db: {} };
    const rec = await call(create, ctx, INPUT);
    const id = recId(rec);
    if (id === undefined) { out.notes.push('idem:no-id'); return; }
    ctx.session = { ...ADMIN };
    await call(approve, ctx, id);                 // valid approval by a distinct admin
    let r1ok = false;
    try { await call(exec, ctx, id); r1ok = true; } catch (e) { out.notes.push(`idem:exec1-threw:${String(e.message || e).slice(0, 30)}`); }
    if (!r1ok) return;                            // valid execute could not succeed → inconclusive for idempotency
    const afterFirst = auditSize(ctx);
    try { await call(exec, ctx, id); } catch { /* a refusal on replay is fine (idempotent) */ }
    const afterSecond = auditSize(ctx);
    if (afterSecond > afterFirst) { out.idempotency = 'violated'; out.notes.push(`idem:audit-grew ${afterFirst}->${afterSecond}`); }
    else out.idempotency = 'ok';
  } catch (e) { out.notes.push(`idem-setup:${String(e.message || e).slice(0, 40)}`); }
}

main().then(() => process.stdout.write(JSON.stringify(out))).catch((e) => { out.notes.push(`fatal:${String(e.message || e).slice(0, 40)}`); process.stdout.write(JSON.stringify(out)); });
