#!/usr/bin/env node
// Zero-spend smoke for the SELF-REPAIR gate (src/repair-gate.mjs). Deterministic: the "model route-back" is a
// mock that returns a pre-canned fix. Covers: smoke detection (broken vs clean), off=no-op, flag+repair+clear,
// deterministic-noop (rebuild returns '' → flagged-but-unfixed, files untouched), multi-pass iteration, and
// the oracle-leak void. No gateway, no oracle reads.

import assert from 'node:assert';
import { runRepairGate, smokeSurface } from '../src/repair-gate.mjs';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

const BROKEN_FREEID = `export function f(ctx, input){ const { name } = input; const id = generateUniqueId(); return { id, name }; }`;
const BROKEN_BARE = `export function g(ctx, input){ const o = { id: 1, bio }; ctx.db.things.set(1, o); return o; }`;
const CLEAN = `export function f(ctx, input){ const id = 'id-' + Math.random().toString(36).slice(2); return { id, name: (input && input.name) || '' }; }`;
const FIXED = `export function f(ctx, input){ const gen = () => 'id-' + Math.random().toString(36).slice(2); const id = gen(); return { id, name: (input && input.name) || '' }; }`;
const DET = { kind: 'deterministic', repairDepth: 2 };

// --- unit: the smoke detector ---
{
  const a = await smokeSurface(BROKEN_FREEID, 'f');
  ok(a.freeIds.includes('generateUniqueId'), 'smoke catches undefined helper call');
  const b = await smokeSurface(BROKEN_BARE, 'g');
  ok(b.freeIds.includes('bio'), 'smoke catches bare free variable');
  const c = await smokeSurface(CLEAN, 'f');
  ok(c.freeIds.length === 0, 'smoke clean on valid code (no false positive)');
  const d = await smokeSurface(FIXED, 'f');
  ok(d.freeIds.length === 0, 'smoke clean on the fixed version');
}

// --- gate OFF = no-op ---
{
  const files = { f: BROKEN_FREEID };
  const r = await runRepairGate({ surfaces: ['f'], files, prompts: { f: 'build f' }, gate: { kind: 'off' }, rebuild: async () => FIXED });
  ok(r.ranGate === false && r.repairs === 0, 'gate off → no-op');
  ok(files.f === BROKEN_FREEID, 'gate off → files untouched');
}

// --- clean surface → not flagged ---
{
  const files = { f: CLEAN };
  let called = 0;
  const r = await runRepairGate({ surfaces: ['f'], files, prompts: { f: 'build f' }, gate: DET, rebuild: async () => { called++; return FIXED; } });
  ok(r.surfacesFlagged === 0 && r.repairs === 0, 'clean surface → not flagged');
  ok(called === 0, 'clean surface → rebuild never called');
}

// --- broken surface → flagged + repaired + cleared ---
{
  const files = { f: BROKEN_FREEID };
  let called = 0;
  const r = await runRepairGate({ surfaces: ['f'], files, prompts: { f: 'build f' }, gate: DET, rebuild: async () => { called++; return FIXED; } });
  ok(r.surfacesFlagged === 1 && r.freeIds >= 1, 'broken surface → flagged with free id');
  ok(called >= 1 && r.repairs >= 1, 'broken surface → rebuild called + repair counted');
  ok(r.fixed === 1, 'broken surface → re-smoke confirms the fix cleared');
  ok(files.f === FIXED, 'broken surface → files updated to the fix');
  ok(r.detail[0] && r.detail[0].fixed === true, 'detail records the fix');
}

// --- deterministic-replay noop: rebuild returns '' → flagged but NOT fixed, files unchanged ---
{
  const files = { f: BROKEN_FREEID };
  const r = await runRepairGate({ surfaces: ['f'], files, prompts: { f: 'build f' }, gate: DET, rebuild: async () => '' });
  ok(r.surfacesFlagged === 1 && r.repairs === 0 && r.fixed === 0, 'rebuild "" → flagged, no repair, no fix');
  ok(files.f === BROKEN_FREEID, 'rebuild "" → files untouched (no net-negative)');
}

// --- multi-pass: rebuild returns still-broken once, then fixed ---
{
  const files = { f: BROKEN_FREEID };
  let pass = 0;
  const r = await runRepairGate({ surfaces: ['f'], files, prompts: { f: 'build f' }, gate: { kind: 'deterministic', repairDepth: 3 }, rebuild: async () => (++pass === 1 ? BROKEN_FREEID : FIXED) });
  ok(r.fixed === 1 && r.repairs === 2, 'multi-pass → fixes on the 2nd route-back');
  ok(files.f === FIXED, 'multi-pass → ends on the fixed code');
}

// --- oracle-leak void ---
{
  const files = { f: BROKEN_FREEID };
  const r = await runRepairGate({ surfaces: ['f'], files, prompts: { f: 'build f ISO@request' }, gate: DET, rebuild: async () => FIXED });
  ok(r.leak === true, 'oracle token in prompt → leak=true (candidate voided)');
}

console.log(`repair-gate smoke: ${n}/${n} green`);
