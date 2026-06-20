#!/usr/bin/env node
// Zero-spend smoke for the best-of-N repair selector + no-regress guard (src/best-of-n-repair.mjs).
// Deterministic, no gateway. Asserts:
//   1. structurallyPlausible — disqualifies empty / truncated / non-module / wrong-surface candidates.
//   2. selectBestRepair — picks the highest-scoring draw; the ORIGINAL is the no-regress floor (kept when no
//      draw strictly out-scores it); empty/failed draws are skipped; accepted/src/validDraws reported.
// Run: node studies/meta-search/gates/best-of-n-repair-smoke.mjs

import { structurallyPlausible, selectBestRepair } from '../src/best-of-n-repair.mjs';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error(`  FAIL: ${msg}`); } };

// ============ 1. structurallyPlausible ============
(() => {
  ok(!structurallyPlausible('', 'withdraw'), 'empty → not plausible');
  ok(!structurallyPlausible('   ', 'withdraw'), 'whitespace → not plausible');
  ok(!structurallyPlausible('I cannot help with that.', 'withdraw'), 'prose blob → not plausible (no export)');
  ok(!structurallyPlausible('export function deposit(ctx){ return 1; }', 'withdraw'), 'wrong surface name → not plausible');
  ok(structurallyPlausible('export function withdraw(ctx, id, amount){ return 1; }', 'withdraw'), 'real module for the surface → plausible');
  ok(structurallyPlausible('export const withdraw = (ctx) => { return 1; };', 'withdraw'), 'arrow export naming the surface → plausible');
})();

// ============ 2. selectBestRepair — best-of-N + no-regress floor ============
await (async () => {
  const ORIG = 'export function withdraw(ctx){ /*original*/ return 0; }';
  // injected oracle-blind score (caller-owned): higher = better.
  const score = (c) => (c.includes('BEST') ? 10 : c.includes('mid') ? 5 : c.includes('original') ? 3 : -1);

  // (a) picks the strictly-best draw
  let q = ['export function withdraw(){ /*mid*/ }', 'export function withdraw(){ /*BEST*/ }', 'export function withdraw(){ /*bad*/ }'];
  let i = 0;
  let sel = await selectBestRepair({ surface: 'withdraw', originalCode: ORIG, n: 3, repairPrompt: 'rp', rebuild: async () => q[i++], score });
  ok(sel.accepted && sel.src === 'draw2' && sel.code.includes('BEST') && sel.score === 10, `picks the BEST draw (got src=${sel.src} score=${sel.score})`);
  ok(sel.validDraws === 3, 'counts all 3 valid draws');

  // (b) NO-REGRESS: every draw scores below the original → keep original
  q = ['export function withdraw(){ /*bad*/ }', 'export function withdraw(){ /*bad*/ }']; i = 0;
  sel = await selectBestRepair({ surface: 'withdraw', originalCode: ORIG, n: 2, repairPrompt: 'rp', rebuild: async () => q[i++], score });
  ok(!sel.accepted && sel.src === 'original' && sel.code === ORIG && sel.score === 3, `all-worse → keep original (no-regress) (got src=${sel.src} accepted=${sel.accepted})`);

  // (c) a tie does NOT displace the original (strict >)
  q = ['export function withdraw(){ /*original*/ }']; i = 0;  // score 3, equal to original
  sel = await selectBestRepair({ surface: 'withdraw', originalCode: ORIG, n: 1, repairPrompt: 'rp', rebuild: async () => q[i++], score });
  ok(!sel.accepted && sel.src === 'original', 'tie with original → original kept (strict improvement required)');

  // (d) empty / failed draws are skipped, not selected
  q = ['', '   ', 'export function withdraw(){ /*BEST*/ }']; i = 0;
  sel = await selectBestRepair({ surface: 'withdraw', originalCode: ORIG, n: 3, repairPrompt: 'rp', rebuild: async () => q[i++], score });
  ok(sel.accepted && sel.code.includes('BEST') && sel.validDraws === 1, `empty draws skipped, only the valid one races (validDraws=${sel.validDraws})`);

  // (e) a throwing rebuild is caught (treated as an empty draw)
  sel = await selectBestRepair({ surface: 'withdraw', originalCode: ORIG, n: 1, repairPrompt: 'rp', rebuild: async () => { throw new Error('gateway down'); }, score });
  ok(!sel.accepted && sel.code === ORIG, 'a throwing rebuild → no candidate → original kept');
})();

console.log(`\nbest-of-n-repair-smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
