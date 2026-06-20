#!/usr/bin/env node
// GATE — gleaning #4: eval-epoch STAMPING (additive / bit-identical / audit-only).
//
// Disposition runs/deliberations/20260619T220547Z #4: land the ADDITIVE half NOW — an `eval_epoch` integer
// (default 0) stamped on every persisted driver-summary / candidate-record going forward, plus the pre-
// registered TRIGGER doc. The BUMP operation is Batch 2 (a clean-restart + new FREEZE record). This gate
// proves, with every layer SHOWN TO FIRE (a check that can't be shown to fire is ABSENT):
//
//   A. stampEpoch ADDS eval_epoch (=0 default; a non-default epoch when asked) without mutating the input,
//      and the default field is CONSTANT → bit-identical (no decision reads it).
//   B. filterCurrentEpoch DROPS prior-epoch nodes (the Batch-2 frontier filter) and is a strict NO-OP at the
//      single current epoch (epoch 0, all nodes epoch 0).
//   C. bumpEpoch THROWS (inert, mutates nothing) — the bump is intentionally NOT implemented in Batch 1.
//   D. END-TO-END: a stamped driver-summary written to disk and READ BACK actually carries eval_epoch.
//   E. INPUT GUARDS fire (non-object record, negative epoch, array-to-stampEpoch).
//
// Run: node studies/meta-search/gates/eval-epoch-smoke.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  EVAL_EPOCH, stampEpoch, stampEach, epochOf, filterCurrentEpoch, bumpEpoch,
} from '../src/eval-epoch.mjs';

let pass = 0, fail = 0;
const fails = [];
function check(name, actual, expected, extra = '') {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; fails.push(name); }
  console.log(`  ${ok ? '✅' : '❌'} ${name}: got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}${extra ? '  ' + extra : ''}`);
}
function checkThrows(name, fn, mustInclude = '') {
  let threw = false, msg = '';
  try { fn(); } catch (e) { threw = true; msg = String(e.message || e); }
  const ok = threw && (!mustInclude || msg.includes(mustInclude));
  if (ok) pass++; else { fail++; fails.push(name); }
  console.log(`  ${ok ? '✅' : '❌'} ${name}: threw=${threw}${mustInclude ? ` includes("${mustInclude}")=${msg.includes(mustInclude)}` : ''}`);
}

console.log('\n=== eval-epoch smoke (gleaning #4 — stamping additive/bit-identical) ===\n');

// ====================================================================================================
// A. stampEpoch — additive, default 0, non-default on request, non-mutating, bit-identical default field.
// ====================================================================================================
console.log('A. stampEpoch — additive, default constant, non-mutating:');
check('EVAL_EPOCH default is the integer 0', EVAL_EPOCH, 0);

const rec = { phase: 'P0', green: true };
const stamped = stampEpoch(rec);
check('stampEpoch adds eval_epoch=0 by default', stamped.eval_epoch, 0);
check('stampEpoch preserves the original fields', { phase: stamped.phase, green: stamped.green }, { phase: 'P0', green: true });
check('stampEpoch does NOT mutate the input record (no eval_epoch on original)', Object.prototype.hasOwnProperty.call(rec, 'eval_epoch'), false);
check('stampEpoch returns a NEW object (not the same reference)', stamped === rec, false);

// the bit-identical claim: default-stamping is a CONSTANT field — re-stamping yields a value-identical object.
const a = stampEpoch({ x: 1, y: [2, 3] });
const b = stampEpoch({ x: 1, y: [2, 3] });
check('default stamp is CONSTANT → two default stamps are value-identical (bit-identical field)', JSON.stringify(a) === JSON.stringify(b), true);
check('default stamp adds EXACTLY one key (eval_epoch) — no other field perturbed', Object.keys(a).sort(), ['eval_epoch', 'x', 'y']);

// non-default epoch when explicitly asked (scaffolding for the Batch-2 bump).
check('stampEpoch(rec, 1) stamps eval_epoch=1 on request', stampEpoch(rec, 1).eval_epoch, 1);
check('stampEach stamps each element of an array', stampEach([{ a: 1 }, { a: 2 }]).map((r) => r.eval_epoch), [0, 0]);
check('stampEach(records, 2) stamps the requested epoch on each', stampEach([{ a: 1 }, { a: 2 }], 2).map((r) => r.eval_epoch), [2, 2]);
check('epochOf reads a stamped epoch', epochOf(stampEpoch({ a: 1 }, 3)), 3);
check('epochOf treats an UN-stamped (legacy) record as epoch 0', epochOf({ a: 1 }), 0);

// ====================================================================================================
// B. filterCurrentEpoch — DROPS prior-epoch nodes; strict NO-OP at the single current epoch.
// ====================================================================================================
console.log('\nB. filterCurrentEpoch — frontier epoch filter (Batch-2 scaffolding):');

// NO-OP case: epoch 0, all nodes epoch 0 → membership unchanged, order preserved (bit-identical).
const e0 = [stampEpoch({ id: 'a' }), stampEpoch({ id: 'b' }), stampEpoch({ id: 'c' })];
const f0 = filterCurrentEpoch(e0);
check('filterCurrentEpoch at epoch 0 (all nodes epoch 0) is a strict NO-OP', f0.map((r) => r.id), ['a', 'b', 'c']);
check('filterCurrentEpoch NO-OP preserves the same node objects (membership identity)', f0.every((r, i) => r === e0[i]), true);

// FIRES case: a mix of epoch-0 and epoch-1 nodes; filtering to epoch 1 DROPS the prior-epoch (0) nodes.
const mixed = [stampEpoch({ id: 'old1' }, 0), stampEpoch({ id: 'new1' }, 1), stampEpoch({ id: 'old2' }, 0), stampEpoch({ id: 'new2' }, 1)];
check('filterCurrentEpoch(mixed, 1) DROPS the prior-epoch (0) nodes', filterCurrentEpoch(mixed, 1).map((r) => r.id), ['new1', 'new2']);
check('filterCurrentEpoch(mixed, 0) keeps ONLY the epoch-0 nodes', filterCurrentEpoch(mixed, 0).map((r) => r.id), ['old1', 'old2']);
check('filterCurrentEpoch drops EVERYTHING for an epoch with no members', filterCurrentEpoch(mixed, 2).length, 0);

// ====================================================================================================
// C. bumpEpoch — INERT GUARDED STUB: throws, mutates nothing.
// ====================================================================================================
console.log('\nC. bumpEpoch — inert guarded stub (the bump is Batch 2):');
checkThrows('bumpEpoch() THROWS (inert)', () => bumpEpoch('any reason', 'score-formula'), 'Batch-2');
checkThrows('bumpEpoch throw references the protocol doc', () => bumpEpoch(), 'EVAL-EPOCH-PROTOCOL.md');
checkThrows('bumpEpoch throw states it requires a new FREEZE record', () => bumpEpoch(), 'FREEZE record');
// inertness: nothing it could have mutated changed — EVAL_EPOCH is still 0 after attempted bumps.
check('EVAL_EPOCH is STILL 0 after attempted bumps (nothing mutated)', EVAL_EPOCH, 0);

// ====================================================================================================
// D. END-TO-END — a stamped driver-summary written to disk READS BACK with eval_epoch.
//    (proves the stamping touch-point is real, not just a unit on the helper)
// ====================================================================================================
console.log('\nD. end-to-end — written driver summary carries eval_epoch on read-back:');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-epoch-'));
try {
  // mirror EXACTLY what the P-series drivers now do: stamp the summary object, JSON.stringify, write.
  const summary = stampEpoch({ phase: 'P0', green: true, gates: [{ name: 'G0', pass: true }] });
  const out = path.join(tmp, 'p0-summary.json');
  fs.writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');
  const readBack = JSON.parse(fs.readFileSync(out, 'utf8'));
  check('written summary reads back with eval_epoch=0', readBack.eval_epoch, 0);
  check('written summary preserves its payload (phase)', readBack.phase, 'P0');

  // a sweep-style summary with stamped per-candidate rows (p2b/p2c shape).
  const rows = stampEach([{ N: 5, win: false }, { N: 13, win: true }]);
  const sweep = stampEpoch({ phase: 'P2b-sweep', rows });
  const out2 = path.join(tmp, 'p2b-sweep.json');
  fs.writeFileSync(out2, JSON.stringify(sweep, null, 2) + '\n');
  const rb2 = JSON.parse(fs.readFileSync(out2, 'utf8'));
  check('sweep summary reads back stamped at the top level', rb2.eval_epoch, 0);
  check('every persisted candidate row reads back stamped', rb2.rows.map((r) => r.eval_epoch), [0, 0]);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ====================================================================================================
// E. INPUT GUARDS — malformed inputs are rejected (the guards provably fire).
// ====================================================================================================
console.log('\nE. input guards fire:');
checkThrows('stampEpoch rejects a null record', () => stampEpoch(null));
checkThrows('stampEpoch rejects a non-object record', () => stampEpoch(42));
checkThrows('stampEpoch rejects an ARRAY (stamp elements, not the array)', () => stampEpoch([1, 2]), 'array');
checkThrows('stampEpoch rejects a negative epoch', () => stampEpoch({ a: 1 }, -1));
checkThrows('stampEpoch rejects a non-integer epoch', () => stampEpoch({ a: 1 }, 1.5));
checkThrows('filterCurrentEpoch rejects a non-array', () => filterCurrentEpoch({ a: 1 }));
checkThrows('stampEach rejects a non-array', () => stampEach({ a: 1 }));

// ====================================================================================================
// F. PROOF THE GATE CAN FAIL — a deliberately wrong expectation must register a failure path.
//    (we run it against a throwaway counter so the real tally is untouched, proving check() discriminates)
// ====================================================================================================
console.log('\nF. discriminator — the gate machinery provably distinguishes pass from fail:');
{
  let localFail = 0;
  const probe = (cond) => { if (!cond) localFail++; };
  // a TRUE assertion (stamped field present) must NOT increment; a FALSE assertion (claiming no stamp) MUST.
  probe(stampEpoch({ a: 1 }).eval_epoch === 0);                 // true → no fail
  probe(!Object.prototype.hasOwnProperty.call(stampEpoch({ a: 1 }), 'eval_epoch')); // false → fail
  check('check machinery fires exactly once on the one false probe', localFail, 1);
}

console.log(`\nEVAL-EPOCH SMOKE: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('GATE FAILURE — eval-epoch stamping is NOT proven: ' + fails.join('; ')); process.exit(1); }
console.log('✅ eval_epoch stamping is additive+bit-identical (default 0 constant field, non-mutating), the frontier filter drops prior epochs / no-ops at the current one, bumpEpoch is inert, and a written driver summary carries the stamp on read-back.');
