// §14 autonomy harness round-trip (DESIGN §14.1–14.2 / P0 validation). Proves, deterministically:
//   (1) checkpoint → kill → resume is DETERMINISTIC — an uninterrupted run and a run killed mid-way then
//       resumed from the last checkpoint produce the BIT-IDENTICAL final archive (same hashes, costs,
//       reliabilities). This is the crash-safe contract: a crash costs at most one generation.
//   (2) the watchdog HALTS-TO-CHECKPOINT on a planted hang — a candidate eval that never returns trips
//       the per-eval timeout, the loop halts cleanly to a resumable checkpoint, and a notification is
//       emitted. The run never silently spins and never pushes past the guardrail.
//
// All on the synthetic (deterministic) backend so replay is exact.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { makeRng } from '../src/rng.mjs';
import { makeArchive } from '../src/archive.mjs';
import { makeSyntheticEvaluator, makeSyntheticBaseline } from '../src/evaluator.mjs';
import { runSearch } from '../src/loop.mjs';
import { defaultGenome, cloneGenome } from '../src/genome.mjs';
import { makeCheckpointer } from '../src/checkpoint.mjs';
import { makeWatchdog } from '../src/watchdog.mjs';

const seeds = () => { const h0 = defaultGenome(); const h1 = cloneGenome(h0); h1.builder.K = 2; const h2 = cloneGenome(h0); h2.retry.count = 2; return [h0, h1, h2]; };
const frontSig = (arc) => arc.front().map((m) => `${m.hash}:${m.cost.toFixed(6)}:${m.reliability.toFixed(6)}`).join('|');
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

export async function run() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });
  const SEED = 424242;
  const params = { childrenPerParent: 4, populationSize: 8, budget: { maxGen: 6, maxEvals: 300 } };

  // (1) determinism: uninterrupted vs killed@gen3 + resumed → identical final archive + evalCount.
  const u = await runSearch({ seedGenomes: seeds(), evaluate: makeSyntheticEvaluator({ epicK: 2 }), baseline: makeSyntheticBaseline(), rng: makeRng(SEED), archive: makeArchive(), ...params });
  const sigU = frontSig(u.archive);

  const cp = makeCheckpointer(tmp('ms-roundtrip-'));
  await runSearch({ seedGenomes: seeds(), evaluate: makeSyntheticEvaluator({ epicK: 2 }), baseline: makeSyntheticBaseline(), rng: makeRng(SEED), archive: makeArchive(), checkpoint: cp, childrenPerParent: 4, populationSize: 8, budget: { maxGen: 3, maxEvals: 300 } });
  const ckpt = cp.load();
  ok('checkpoint written at the kill generation', ckpt && ckpt.gen === 3, ckpt ? `gen ${ckpt.gen}, ${ckpt.archive.length} members, evalCount ${ckpt.evalCount}` : 'no checkpoint');
  const r = await runSearch({ seedGenomes: seeds(), evaluate: makeSyntheticEvaluator({ epicK: 2 }), baseline: makeSyntheticBaseline(), rng: makeRng(0), archive: makeArchive(), checkpoint: cp, resumeState: ckpt, ...params });
  const sigR = frontSig(r.archive);
  ok('resume is DETERMINISTIC (final archive identical to uninterrupted)', sigU === sigR && u.evalCount === r.evalCount, `evalCount U=${u.evalCount} R=${r.evalCount}; front ${sigU === sigR ? 'match' : 'MISMATCH'}`);

  // (2) watchdog planted hang: an eval that never returns trips the per-eval timeout → halt-to-checkpoint.
  let n = 0; const synth = makeSyntheticEvaluator({ epicK: 2 });
  const hanging = (g) => { n++; return n > 5 ? new Promise(() => {}) : synth(g); };
  const notes = [];
  const wd = makeWatchdog({ evalTimeoutMs: 120, notify: (note) => notes.push(note) });
  const cp2 = makeCheckpointer(tmp('ms-hang-'));
  const h = await runSearch({ seedGenomes: seeds(), evaluate: hanging, baseline: makeSyntheticBaseline(), rng: makeRng(7), archive: makeArchive(), checkpoint: cp2, watchdog: wd, childrenPerParent: 4, populationSize: 8, budget: { maxGen: 8, maxEvals: 300 } });
  ok('watchdog trips on planted hang and halts (eval-timeout)', h.haltReason === 'watchdog:eval-timeout', String(h.haltReason));
  ok('halt emits a notification (run-until-a-guardrail-then-notify)', notes.length > 0 && notes[0].kind === 'eval-timeout', JSON.stringify(notes[0] || null));
  ok('halt left a resumable checkpoint', cp2.exists(), `gen ${(cp2.load() || {}).gen}`);
  ok('did not push past the guardrail (halted before budget)', h.gen < 8 && h.evalCount < 300, `gen ${h.gen}, evals ${h.evalCount}`);

  const pass = checks.every((c) => c.pass);
  return { name: '§14 autonomy round-trip', pass, checks };
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => { for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`); console.log(`\n${r.pass ? 'OK' : 'FAIL'} — ${r.name}`); process.exit(r.pass ? 0 : 1); });
}
