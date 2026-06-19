#!/usr/bin/env node
// GATE-CRITICAL accuracy self-test for the replay-anchored residual labeler (src/label-draw.mjs).
//
// RUN-FOR-DAYS-PLAN.md: "Self-test: feed known draws of each class from runs/dump/ and assert correct routing
// — gate-critical; until it passes, Phase −1 GO/HALT is provisional." The generalized `rate()` lesson: a check
// that can't be SHOWN to fire is treated as ABSENT. So this test does not merely run the labeler — it forces a
// KNOWN routing outcome for every one of the five buckets and the route-luck guard, and FAILS LOUD (exit 1) if
// any draw lands in the wrong bucket.
//
// Determinism: the deterministic-axis buckets (PASS / det-form-repairable / route-incompetence / unresolved)
// use real 2026-06-19 census draws whose labels are reproducible at $0 (no gateway). The MODEL axis
// (model-route-back-only) and the "a single lucky route-back can't mint the label" guard are exercised by
// CORRUPTING a known-good draw (inject a free-id ReferenceError) and INJECTING a controlled `rebuildModel`
// mock — always-good (→ minted), always-fail (→ incompetence), good-once-of-three (→ guard holds). The labeler
// CODE PATH is identical to live Phase −1; only the route-back is mocked, so we validate logic, not luck.
//
// Run: node studies/meta-search/gates/label-draw-selftest.mjs

import path from 'node:path';
import url from 'node:url';
import { loadEpicCtx, readDrawFiles, labelDraw } from '../src/label-draw.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const MS = path.resolve(HERE, '..');
const dump = (p) => path.join(MS, 'runs', 'dump', p);

let pass = 0, fail = 0;
const results = [];
function check(name, actual, expected, extra = '') {
  const ok = actual === expected;
  if (ok) pass++; else fail++;
  results.push({ ok, name, got: actual, want: expected, extra });
  console.log(`  ${ok ? '✅' : '❌'} ${name}: got=${actual} want=${expected}${extra ? '  ' + extra : ''}`);
}

const ctx = await loadEpicCtx('quota-d1');

console.log('LABELER SELF-TEST — deterministic-axis buckets (real census draws, $0):');
{
  const r = await labelDraw({ ctx, files: readDrawFiles(dump('census-q1-A/quota-d1-d2'), ctx.order), reps: 3 });
  check('q1-A/d2 → det-form-repairable', r.bucket, 'det-form-repairable', `(raw i${(r.raw.i * 100) | 0}→det i${(r.det.i * 100) | 0})`);
}
{
  const r = await labelDraw({ ctx, files: readDrawFiles(dump('census-q1-A/quota-d1-d3'), ctx.order), reps: 3 });
  check('q1-A/d3 → PASS', r.bucket, 'PASS');
}
{
  const r = await labelDraw({ ctx, files: readDrawFiles(dump('census-q1-A/quota-d1-d4'), ctx.order), reps: 3 });
  check('q1-A/d4 → route-incompetence (bio free-id)', r.bucket, 'route-incompetence', `floor.freeIds=${JSON.stringify(r.floor.freeIdSurfaces.map((x) => x.surface + ':' + x.freeIds.join(',')))} advisory.lean=${r.advisory.lean}`);
}
{
  const r = await labelDraw({ ctx, files: readDrawFiles(dump('census-q1-A/quota-d1-d7'), ctx.order), reps: 3 });
  check('q1-A/d7 → unresolved (smoke-clean semantics)', r.bucket, 'unresolved', `floor.ok=${r.floor.floorOk} advisory.lean=${r.advisory.lean}`);
  check('q1-A/d7 advisory leans semantics (telemetry only)', r.advisory.lean, 'semantics');
}

console.log('\nLABELER SELF-TEST — model-route-back axis (corrupt a known-good draw + injected mock, $0):');
// Build a corrupted draw: take the all-PASS d3, inject a `bio is not defined` free-id into createWallet so the
// draw drops below the smoke floor exactly like a real incompetence draw. The "good" originals are the mock's
// successful route-back payload.
const good = readDrawFiles(dump('census-q1-A/quota-d1-d3'), ctx.order);
const corruptCreateWallet = good.createWallet.replace(
  /return wallet;/,
  'const _leak = bio;\n  return wallet;', // `bio` is undeclared → ReferenceError at runtime (mirrors q1-A/d4)
);
if (corruptCreateWallet === good.createWallet) { console.error('FATAL: corruption no-op (createWallet shape changed?)'); process.exit(2); }
const corrupted = { ...good, createWallet: corruptCreateWallet };

// sanity: the corrupted draw must actually be below floor and failing raw, else the model-axis test is vacuous.
{
  const r = await labelDraw({ ctx, files: corrupted, reps: 3, rebuildModel: async () => '' });
  check('corrupted draw is below floor (raw fails, det cannot fix)', r.floor.floorOk, false, `freeIds=${JSON.stringify(r.floor.freeIdSurfaces.map((x) => x.surface))} raw{c${(r.raw.c * 100) | 0}/i${(r.raw.i * 100) | 0}}`);
}

// (a) model route-back ALWAYS succeeds (returns the good original) → minted model-route-back-only.
{
  const mockGood = async (surface) => good[surface] || '';
  const r = await labelDraw({ ctx, files: corrupted, reps: 3, rebuildModel: mockGood });
  check('corrupted + mock-always-good → model-route-back-only', r.bucket, 'model-route-back-only', `movedReps=${r.repairSpread.movedReps}/${r.repairSpread.reps} reachedPass=${r.reachedPass}`);
}
// (b) model route-back ALWAYS fails (returns '') → below floor, unrecovered → route-incompetence.
{
  const r = await labelDraw({ ctx, files: corrupted, reps: 3, rebuildModel: async () => '' });
  check('corrupted + mock-always-fail → route-incompetence', r.bucket, 'route-incompetence', `movedReps=${r.repairSpread.movedReps}/${r.repairSpread.reps}`);
}
// (c) route-luck guard: model succeeds in only 1 of 3 reps → must NOT mint model-route-back-only.
{
  let n = 0;
  const mockOnce = async (surface) => (n++ === 0 ? (good[surface] || '') : ''); // good on the FIRST route-back call only
  const r = await labelDraw({ ctx, files: corrupted, reps: 3, rebuildModel: mockOnce });
  check('route-luck guard: 1-of-3 success does NOT mint model-route-back-only', r.bucket === 'model-route-back-only', false, `bucket=${r.bucket} movedReps=${r.repairSpread.movedReps}/${r.repairSpread.reps}`);
}

console.log('\nLABELER SELF-TEST — parse∧export floor (present-but-invalid surface → route-incompetence, $0):');
// A live block surfaced this gap: a surface that is PRESENT and smokes clean (no free-id) but does NOT
// parse∧export (a prose reasoning blob, or `export functionfoo` glued tokens) is BELOW the floor and must be
// route-incompetence, not unresolved. These mirror the real block-A worst draws (quota prose blob / approval
// syntax error). The mock route-back fails (a re-draw is the only fix), so they stay below floor.
{
  const proseBlob = 'Looking at this task, I need to implement createWallet. I will stamp the org and return the wallet. This is straightforward and requires no special validation.';
  const draw = { ...good, createWallet: proseBlob };
  const r = await labelDraw({ ctx, files: draw, reps: 3, rebuildModel: async () => '' });
  check('prose-blob surface (no export) → route-incompetence', r.bucket, 'route-incompetence', `invalidExport=${JSON.stringify(r.floor.invalidExport)} floor.ok=${r.floor.floorOk}`);
}
{
  const syntaxErr = good.createWallet.replace(/export function createWallet/, 'export functioncreateWallet'); // glued tokens
  const draw = { ...good, createWallet: syntaxErr };
  const r = await labelDraw({ ctx, files: draw, reps: 3, rebuildModel: async () => '' });
  check('syntax-error surface → route-incompetence', r.bucket, 'route-incompetence', `invalidExport=${JSON.stringify(r.floor.invalidExport)}`);
}

console.log(`\nLABELER SELF-TEST: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('GATE-CRITICAL FAILURE — Phase −1 GO/HALT remains PROVISIONAL until this passes.'); process.exit(1); }
console.log('✅ labeler routes all five buckets + the route-luck guard correctly.');
