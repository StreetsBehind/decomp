#!/usr/bin/env node
// SMOKE for Lever B (semantic-obligation.mjs) — deterministic, $0, oracle-blind. Validates: (1) the detectors
// (conservation / approve→execute / execute-idempotency / keyed-idempotency) on synthetic idioms AND real
// dumped draws (present → no flag; absent → flag); (2) semanticRules parses each topology's skeleton; (3) the
// verify+repair loop with a MOCK rebuild ($0, no gateway): a flagged surface repairs, the no-regress floor
// rejects a strictly-worse repair; (4) the K3 leak scan voids on a leaking prompt; (5) no-op on a topology with
// no declared semantic obligation (membership).

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import {
  semanticRules, verifySemantic, runSemanticObligation, injectBlock,
  hasConservationGuard, hasApprovalGate, hasExecuteDedup, hasKeyedDedup,
} from '../src/semantic-obligation.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const MS = path.resolve(HERE, '..');
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.log(`  FAIL  ${name}`); } };

const readSkel = (cell) => fs.readFileSync(path.join(MS, 'epics', cell, 'skeleton.md'), 'utf8');
const readDraw = (dump, cell, k, surface) => {
  const f = path.join(MS, 'runs', dump, `${cell}-d${k}`, 'raw', `${surface}.mjs`);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
};

// ---- 1. semanticRules parses the declared obligations from each topology's PUBLIC skeleton ----------------
{
  const q = semanticRules(readSkel('quota-d3'));
  ok('quota declares conservation', !!q.conservation && /negative|insufficient/i.test(q.conservation));
  ok('quota declares keyed-idempotency', !!q.keyedIdempotency);
  const a = semanticRules(readSkel('approval-d2'));
  ok('approval declares approve→execute', !!a.approveExecute && /approval/i.test(a.approveExecute));
  ok('approval declares execute-idempotency', !!a.executeIdempotency && /audit|execut/i.test(a.executeIdempotency));
  ok('approval declares NO conservation', !a.conservation);
}

// ---- 2. CONSERVATION detector: present (real good draw) vs absent (synthetic) -----------------------------
{
  const q = semanticRules(readSkel('quota-d3'));
  const good = readDraw('dump-ladder', 'quota-d3', 1, 'withdraw');           // has `currentBalance - amount < 0` guard
  ok('real conserving withdraw → present', good && hasConservationGuard(good));
  ok('real conserving withdraw → NOT flagged', good && verifySemantic('withdraw', good, q).length === 0);
  const bad = `export function withdraw(ctx, walletId, amount, key){ const l = ctx.db.ledger || []; ctx.db.ledger = [...l, { walletId, delta: -amount, key }]; return amount; }`;
  ok('non-conserving withdraw → flagged conservation', verifySemantic('withdraw', bad, q).some((v) => v.obligation === 'conservation'));
  // a non-spend surface (deposit) is never flagged for conservation
  const dep = `export function deposit(ctx, walletId, amount, key){ ctx.db.ledger = [...(ctx.db.ledger||[]), { walletId, delta: amount, key }]; }`;
  ok('deposit → NOT flagged conservation', !verifySemantic('deposit', dep, q).some((v) => v.obligation === 'conservation'));
}

// ---- 3. APPROVE→EXECUTE + EXECUTE-IDEMPOTENCY detectors: present (real good draw) vs absent ---------------
{
  const a = semanticRules(readSkel('approval-d2'));
  const good = readDraw('dump-ladder', 'approval-d2', 1, 'executeRequest');  // reads approvals + audit dedup
  ok('real gated execute → approval present', good && hasApprovalGate(good));
  ok('real gated execute → idempotency present', good && hasExecuteDedup(good));
  ok('real gated execute → NOT flagged', good && verifySemantic('executeRequest', good, a).length === 0);
  const bad = `export function executeRequest(ctx, requestId){ const audit = { requestId, by: ctx.session.userId }; ctx.db.auditLog.push(audit); return audit; }`;
  const v = verifySemantic('executeRequest', bad, a);
  ok('ungated execute → flagged approve-execute', v.some((x) => x.obligation === 'approve-execute'));
  ok('ungated execute → flagged execute-idempotency', v.some((x) => x.obligation === 'execute-idempotency'));
}

// ---- 4. KEYED-IDEMPOTENCY detector --------------------------------------------------------------------
{
  const q = semanticRules(readSkel('quota-d3'));
  const withKey = `export function withdraw(ctx,w,amount,key){ const l=ctx.db.ledger||[]; if(l.find(e=>e.key===key)) return 0; const bal=l.reduce((s,e)=>s+e.delta,0); if(bal-amount<0) throw new Error('Insufficient'); ctx.db.ledger=[...l,{walletId:w,delta:-amount,key}]; }`;
  ok('keyed dedup present → no keyed-idempotency flag', !verifySemantic('withdraw', withKey, q).some((v) => v.obligation === 'keyed-idempotency'));
  const noKey = `export function withdraw(ctx,w,amount,key){ const l=ctx.db.ledger||[]; const bal=l.reduce((s,e)=>s+e.delta,0); if(bal-amount<0) throw new Error('Insufficient'); ctx.db.ledger=[...l,{walletId:w,delta:-amount,key}]; }`;
  ok('no keyed dedup → flagged keyed-idempotency', verifySemantic('withdraw', noKey, q).some((v) => v.obligation === 'keyed-idempotency'));
}

// ---- 5. verify+REPAIR loop with a MOCK rebuild ($0): flagged surface repairs to a conformant module ------
{
  const skeleton = readSkel('quota-d3');
  const bad = `export function withdraw(ctx, walletId, amount, key){ ctx.db.ledger = [...(ctx.db.ledger||[]), { walletId, delta: -amount, key }]; return amount; }`;
  const fixed = `export function withdraw(ctx, walletId, amount, key){ const l = ctx.db.ledger||[]; if(l.find(e=>e.key===key)) return 0; const bal=l.reduce((s,e)=>s+e.delta,0); if(bal-amount<0) throw new Error('Insufficient funds'); ctx.db.ledger=[...l,{walletId,delta:-amount,key}]; return bal-amount; }`;
  const files = { withdraw: bad };
  const r = await runSemanticObligation({
    surfaces: ['withdraw'], files, prompts: { withdraw: 'build withdraw' }, skeleton,
    gate: { kind: 'deterministic', repairDepth: 1, bestOfN: 1 },
    rebuild: async () => fixed,
  });
  ok('repair fired + flagged the surface', r.surfacesFlagged === 1 && r.repairs === 1);
  ok('repaired code now conforms', verifySemantic('withdraw', files.withdraw, semanticRules(skeleton)).length === 0);
  ok('byObligation tallies conservation', (r.byObligation.conservation || 0) >= 1);
}

// ---- 6. NO-REGRESS floor: a strictly-worse repair is rejected (kept original) ---------------------------
{
  const skeleton = readSkel('quota-d3');
  const bad = `export function withdraw(ctx, walletId, amount, key){ ctx.db.ledger = [...(ctx.db.ledger||[]), { walletId, delta: -amount, key }]; return amount; }`;
  const files = { withdraw: bad };
  const r = await runSemanticObligation({
    surfaces: ['withdraw'], files, prompts: { withdraw: 'b' }, skeleton,
    gate: { kind: 'deterministic', repairDepth: 1, bestOfN: 1 },
    rebuild: async () => `export function withdraw(ctx){ /* still no conservation */ ctx.db.ledger.push({delta:-1}); }`,
  });
  ok('no-regress rejects strictly-worse repair', r.reverts === 1 && files.withdraw === bad);
}

// ---- 7. K3 leak scan voids on a leaking repair prompt --------------------------------------------------
{
  const skeleton = readSkel('approval-d2');
  // a rebuild whose presence is irrelevant; the leak is injected via the prompt the harness would build. We
  // simulate by feeding an oracle-shaped build prompt that scanOracleLeak must catch.
  const bad = `export function executeRequest(ctx, id){ ctx.db.auditLog.push({id}); return {id}; }`;
  const files = { executeRequest: bad };
  const r = await runSemanticObligation({
    surfaces: ['executeRequest'], files, prompts: { executeRequest: 'EXPECTS authz@executeRequest SEAM± ISO@executeRequest' }, skeleton,
    gate: { kind: 'deterministic', repairDepth: 1, bestOfN: 1 },
    rebuild: async () => bad,
  });
  ok('leak scan voids the candidate', r.leak === true);
}

// ---- 8. NO-OP on a topology with no declared semantic obligation (membership) ---------------------------
{
  const memberSkel = '### Cross-cutting rules\n- **Tenancy:** caller org only.\n- **Authorization:** only an admin may add members.';
  const r = await runSemanticObligation({
    surfaces: ['addMember', 'postComment'], files: { addMember: 'export function addMember(){}', postComment: 'export function postComment(){}' },
    prompts: {}, skeleton: memberSkel, gate: { kind: 'deterministic', repairDepth: 1 }, rebuild: async () => '',
  });
  ok('membership (no semantic obligation) → no-op, 0 flagged', r.surfacesFlagged === 0 && r.violations === 0);
}

// ---- 9. INJECT half renders the applicable obligations ------------------------------------------------
{
  const a = semanticRules(readSkel('approval-d2'));
  const blk = injectBlock('executeRequest', a);
  ok('inject block names approve-execute for execute surface', /approve-execute/.test(blk));
  ok('inject block empty for a non-applicable surface', injectBlock('createRequest', a) === '');
}

console.log(`\nsemantic-obligation smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
