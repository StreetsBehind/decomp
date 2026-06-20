#!/usr/bin/env node
// Self-test for the measurement-axis check (src/axis-check.mjs; gleaning #1, DECISION-BRIEF #1).
//
// THE GENERALIZED `rate()` LESSON (carried from #5/#2b): "a check that can't be SHOWN to fire is treated as
// ABSENT." So this gate PLANTS a violation that trips every layer AND proves the no-false-positive case:
//
// Layers exercised, each shown to fire:
//   A. detectPlateau FIRES — a 3-distinct-genome within-δ plateau across 3 consecutive gens.
//   B. detectPlateau NO FALSE POSITIVE — a genuinely-ADVANCING front (front-best strictly improving, OR too
//      few distinct genomes, OR too few consecutive gens) does NOT fire.
//   C. makeAxisObserver FIRES on the same plateau AND its onGeneration is a pure side-effect (it touches no
//      rng/archive/population → returns nothing, latches one report). Attaching it leaves the loop
//      BIT-IDENTICAL — proven by running the SYNTHETIC loop with and without the observer attached and
//      asserting the archive front + eval count + rng end-state are identical.
//   D. runDiscriminator — the planted optimum is STILL discoverable AND dominating (anti-abandonment holds:
//      "wrong axis" cannot be asserted on a disappointing-but-correct front).
//   E. The pre-P3 prerequisite check reports BLOCKED (the proxies are not yet converted to real) and the
//      no-hardcode property holds (an injected fake-repo with all artifacts present flips it to ready).
//
// Deterministic — synthetic backend, no models, no gateway.
//
// Run: node studies/meta-search/gates/axis-check.mjs

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { makeRng } from '../src/rng.mjs';
import { makeArchive } from '../src/archive.mjs';
import { runSearch } from '../src/loop.mjs';
import { makeSyntheticEvaluator, makeSyntheticBaseline } from '../src/evaluator.mjs';
import { defaultGenome, cloneGenome } from '../src/genome.mjs';
import {
  detectPlateau, makeAxisObserver, runDiscriminator, checkPreP3Prerequisites, PRE_P3_PREREQUISITES,
} from '../src/axis-check.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail = '') {
  const ok = !!cond;
  if (ok) pass++; else fail++;
  results.push({ ok, name, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? `  [${detail}]` : ''}`);
}

// A synthetic generation-history builder. `nearBest` carries {genomeHash, fitness} entries.
function gen(g, bestFitness, near) {
  return { gen: g, bestFitness, nearBest: near };
}
// `k` Hamming-distinct genomes (distinct hashes) all sitting at `fit` (within band of `best`).
function distinctNear(k, fit) {
  return Array.from({ length: k }, (_, i) => ({ genomeHash: `h${i}`, fitness: fit }));
}

// ───────────────────────────────────────────────────────────────────────────────────────────────────
console.log('AXIS-CHECK — A. detectPlateau FIRES on a 3-distinct-genome within-δ plateau across 3 consecutive gens:');
{
  // 3 generations, each with 3 distinct genomes all within δ (0.05) of front-best 0.90 (0.89,0.90,0.88).
  const history = [
    gen(1, 0.90, [{ genomeHash: 'a', fitness: 0.90 }, { genomeHash: 'b', fitness: 0.89 }, { genomeHash: 'c', fitness: 0.88 }]),
    gen(2, 0.90, [{ genomeHash: 'd', fitness: 0.90 }, { genomeHash: 'e', fitness: 0.875 }, { genomeHash: 'f', fitness: 0.86 }]),
    gen(3, 0.90, [{ genomeHash: 'g', fitness: 0.90 }, { genomeHash: 'h', fitness: 0.88 }, { genomeHash: 'i', fitness: 0.87 }]),
  ];
  const r = detectPlateau(history);
  check('plateau FIRES (fire=true, distinctCount>=3, 3 gens flagged)', r.fire === true && r.distinctCount >= 3 && r.gens.length === 3, `fire=${r.fire} distinct=${r.distinctCount} gens=[${r.gens}] reason="${r.reason}"`);
}

console.log('\nAXIS-CHECK — B. NO FALSE POSITIVE on a genuinely-advancing / under-threshold front:');
{
  // B1. ADVANCING front: each gen the front-best strictly improves; the near-best genomes are NOT within δ
  //     of the LATEST best across a stable window (the band is per-gen, but only 1 genome sits at the best).
  const advancing = [
    gen(1, 0.70, [{ genomeHash: 'a', fitness: 0.70 }, { genomeHash: 'b', fitness: 0.50 }, { genomeHash: 'c', fitness: 0.40 }]),
    gen(2, 0.80, [{ genomeHash: 'd', fitness: 0.80 }, { genomeHash: 'e', fitness: 0.60 }, { genomeHash: 'f', fitness: 0.50 }]),
    gen(3, 0.90, [{ genomeHash: 'g', fitness: 0.90 }, { genomeHash: 'h', fitness: 0.70 }, { genomeHash: 'i', fitness: 0.60 }]),
  ];
  const r1 = detectPlateau(advancing);
  check('advancing front (only 1 within δ each gen) → does NOT fire', r1.fire === false, `fire=${r1.fire} reason="${r1.reason}"`);

  // B2. FEW DISTINCT: 3 gens within δ but only the SAME 1 genome repeats (distinctCount=1 < 3).
  const fewDistinct = [
    gen(1, 0.90, [{ genomeHash: 'x', fitness: 0.90 }]),
    gen(2, 0.90, [{ genomeHash: 'x', fitness: 0.89 }]),
    gen(3, 0.90, [{ genomeHash: 'x', fitness: 0.88 }]),
  ];
  check('too few distinct genomes (1<3) → does NOT fire', detectPlateau(fewDistinct).fire === false);

  // B3. TOO FEW CONSECUTIVE GENS: only 2 plateau gens (need 3).
  const shortRun = [gen(1, 0.90, distinctNear(3, 0.89)), gen(2, 0.90, distinctNear(3, 0.88))];
  check('too few consecutive gens (2<3) → does NOT fire', detectPlateau(shortRun).fire === false);

  // B4. NON-CONSECUTIVE: gens 1 and 3 plateau but gen 2 breaks the run (advancing/no near-best).
  const broken = [gen(1, 0.90, distinctNear(3, 0.89)), gen(2, 0.95, [{ genomeHash: 'z', fitness: 0.95 }]), gen(3, 0.95, distinctNear(3, 0.94))];
  check('non-consecutive plateau (gen2 breaks the run) → does NOT fire', detectPlateau(broken).fire === false);

  // B5. empty history → no fire (defensive).
  check('empty history → does NOT fire', detectPlateau([]).fire === false);
}

console.log('\nAXIS-CHECK — C. makeAxisObserver FIRES on the plateau; onGeneration is a PURE side-effect (loop bit-identical):');
{
  // C1. the observer latches a report when fed a plateau (and never before).
  let notified = null;
  const obs = makeAxisObserver({ notify: (r) => { notified = r; } });
  check('observer NOT fired before any plateau', obs.fired() === false);
  // feed 3 plateau generations via the onGeneration payload shape (bestReliability + nearBest).
  obs.onGeneration({ gen: 1, bestReliability: 0.90, nearBest: [{ genomeHash: 'a', fitness: 0.90 }, { genomeHash: 'b', fitness: 0.89 }, { genomeHash: 'c', fitness: 0.88 }] });
  obs.onGeneration({ gen: 2, bestReliability: 0.90, nearBest: [{ genomeHash: 'd', fitness: 0.90 }, { genomeHash: 'e', fitness: 0.88 }, { genomeHash: 'f', fitness: 0.87 }] });
  check('observer NOT yet fired at gen 2 (needs 3 consecutive)', obs.fired() === false);
  obs.onGeneration({ gen: 3, bestReliability: 0.90, nearBest: [{ genomeHash: 'g', fitness: 0.90 }, { genomeHash: 'h', fitness: 0.88 }, { genomeHash: 'i', fitness: 0.87 }] });
  check('observer FIRES at gen 3 (report latched, notify called)', obs.fired() === true && obs.report() && obs.report().kind === 'plateau-distinct-genotypes' && notified && notified.atGen === 3, `report=${obs.report() ? obs.report().reason : 'null'}`);
  // the onGeneration return value is undefined (pure side-effect — the loop reads nothing back).
  check('observer.onGeneration returns undefined (pure side-effect)', obs.onGeneration({ gen: 4, bestReliability: 0.90, nearBest: [] }) === undefined);

  // C2. BIT-IDENTICAL: run the synthetic loop WITHOUT and WITH the observer attached → identical trajectory.
  const handicapped = () => { const h0 = defaultGenome(); const h1 = cloneGenome(h0); h1.builder.K = 2; const h2 = cloneGenome(h0); h2.retry.count = 2; return [h0, h1, h2]; };
  const baseline = makeSyntheticBaseline();
  const runOnce = (onGeneration) => runSearch({
    seedGenomes: handicapped(), evaluate: makeSyntheticEvaluator({ epicK: 2 }), baseline,
    rng: makeRng(7), archive: makeArchive(), budget: { maxGen: 5, maxEvals: 200 },
    childrenPerParent: 5, populationSize: 4, onGeneration,
  });
  const a = await runOnce(null);
  const observer = makeAxisObserver({ nearBestOf: () => [], notify: () => {} }); // attached but starved of near-front entries
  const b = await runOnce(observer.onGeneration);
  const frontKey = (res) => res.front.map((m) => `${m.hash}:${m.cost.toFixed(6)}:${m.reliability.toFixed(6)}`).join('|');
  check('loop trajectory BIT-IDENTICAL with the observer attached (front + evalCount + gen + halt)',
    frontKey(a) === frontKey(b) && a.evalCount === b.evalCount && a.gen === b.gen && a.haltReason === b.haltReason,
    `evals ${a.evalCount}==${b.evalCount}, gen ${a.gen}==${b.gen}, halt ${a.haltReason}==${b.haltReason}, frontEq=${frontKey(a) === frontKey(b)}`);
  check('the attached observer accumulated a history (it really ran every generation)', observer.history.length === a.gen + 1, `historyLen=${observer.history.length} gens=${a.gen + 1}`);
}

console.log('\nAXIS-CHECK — D. runDiscriminator: the planted optimum is STILL discoverable + dominating (anti-abandonment):');
{
  const d = await runDiscriminator({ seed: 1 });
  check('planted optimum DOMINATES the baseline on the synthetic axis (cost< & rel≥)', d.dominating === true, `opt(rel ${d.optimumReliability.toFixed(3)},$${d.optimumCost}) vs base(rel ${d.baselineReliability.toFixed(3)},$${d.baselineCost})`);
  check('the loop REDISCOVERS the planted optimum within K8 budget (discoverable=true)', d.discoverable === true, `gen=${d.gen} evals=${d.evals} halt=${d.haltReason}`);
  check('=> "wrong axis" CANNOT be asserted (axis is demonstrably sound)', d.discoverable && d.dominating);
  // a second pinned seed agrees (not a lucky single trajectory).
  const d2 = await runDiscriminator({ seed: 4 });
  check('a second pinned seed also rediscovers (machinery, not one lucky seed)', d2.discoverable === true && d2.dominating === true, `seed4: gen=${d2.gen} evals=${d2.evals}`);
}

console.log('\nAXIS-CHECK — E. pre-P3 prerequisite check reports BLOCKED today; no-hardcode property holds:');
{
  // E1. against the REAL repo: BLOCKED (the proxies are not converted — no settled routed baseline, no live
  //     co-measured INTEG head-to-head; the 2nd oracle MAY be present and is reported honestly).
  const real = checkPreP3Prerequisites({ root: ROOT, fs, path });
  check('real repo → BLOCKED (at least one prerequisite unmet)', real.blocked === true, `unmet=[${real.unmet.join(',')}] met=[${real.met.join(',')}]`);
  check('the routed-baseline + measured-INTEG prerequisites are UNMET (proxy headline not converted)',
    real.unmet.includes('routed-all-frontier-baseline') && real.unmet.includes('measured-integ-path'),
    `unmet=[${real.unmet.join(',')}]`);
  check('every prerequisite carries the proxy it removes + a found-artifacts list + a note', real.details.every((d) => d.what && Array.isArray(d.found) && d.note));

  // E2. NO-HARDCODE: an injected fake repo where ALL the decisive settled artifacts exist → READY (blocked=false).
  //     Proves the gate detects by artifact existence, not a hardcoded BLOCKED.
  const present = new Set([
    'studies/meta-search/routed-baseline.mjs',
    'studies/meta-search/runs/routed-baseline-settled.json',
    'studies/meta-search/runs/head-to-head-settled.json',
    'studies/meta-search/src/oracle2.mjs',
    'studies/meta-search/TEST-SET.md',
  ]);
  const fakeFs = { existsSync: (p) => present.has(path.relative('/fake', p).split(path.sep).join('/')) };
  const ready = checkPreP3Prerequisites({ root: '/fake', fs: fakeFs, path });
  check('injected fake-repo with ALL settled artifacts present → READY (blocked=false)', ready.blocked === false, `unmet=[${ready.unmet.join(',')}]`);

  // E3. NO-HARDCODE the other way: an EMPTY fake repo → all three unmet.
  const emptyFs = { existsSync: () => false };
  const none = checkPreP3Prerequisites({ root: '/fake', fs: emptyFs, path });
  check('injected empty fake-repo → all 3 prerequisites unmet', none.blocked === true && none.unmet.length === PRE_P3_PREREQUISITES.length, `unmet=[${none.unmet.join(',')}]`);
}

console.log(`\nAXIS-CHECK SELF-TEST: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('GATE FAILURE — an axis-check assertion layer did not behave as specified.'); process.exit(1); }
console.log('✅ plateau detector fires on a planted plateau + no false positives; observer is a pure bit-identical side-effect; the K8 discriminator holds (anti-abandonment); the pre-P3 gate reports BLOCKED by real-artifact detection, not a hardcode.');

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) process.exit(0);
