#!/usr/bin/env node
// GATE — gleaning #5: the AGGREGATE-CONSISTENCY LINT (validates the frozen worst-of-K, DESIGN §5).
//
// Disposition runs/deliberations/20260619T220547Z: #5 = ADOPT WITH CHANGES — "first task = FULL-TREE
// ENUMERATION of every K-reducer (not just the three named files); canonicalize on scorecard.worstOfK; each
// site consumes it or carries an equivalent assertion." This gate is that lint. It has three layers, each of
// which can be SHOWN to fire (the generalized rate() lesson — a check that can't be shown to fire is ABSENT):
//
//   A. STATIC ENUMERATION (src/aggregate-consistency.mjs): every reduction-shaped site across the whole tree
//      is classified; an UNCLASSIFIED reduction in ANY file — listed or not — fails (the "silent re-aggregation
//      in an unlisted file" guard). Plus: zero best-replicate DECISIONS, and zero fail-OPEN rate() in a
//      decision-metric path (the VOID-92/92 footgun family).
//   B. BEHAVIOURAL: the canonical worst-of-K fold is AND-over-runs (a cell that fails in ANY run is FALSE, so
//      worst ≠ best), and the load-bearing DECISION paths consume it — the archive lethal veto REJECTS a
//      candidate whose best-replicate would have passed but whose worst-of-K dropped a cell; credit picks the
//      worst-lethal candidate off the worst-of-K digest.
//   C. SELF-VALIDATION (planted violations): an unregistered reducer in a new file → flagged unclassified; a
//      verdict reading `.best` → flagged a best-replicate decision; a fail-open rate() in a decision-metric
//      file → a hard error. No-false-positive is the real tree itself passing layer A.
//
// Run: node studies/meta-search/gates/aggregate-consistency.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  lintTree, enumerateAggregationSites, classifySite, findBestReplicateDecisions, auditRate,
} from '../src/aggregate-consistency.mjs';
import { buildScorecard } from '../src/scorecard.mjs';
import { makeArchive } from '../src/archive.mjs';
import { worstLethalCandidate } from '../src/credit.mjs';

let pass = 0, fail = 0;
const fails = [];
function check(name, actual, expected, extra = '') {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; fails.push(name); }
  console.log(`  ${ok ? '✅' : '❌'} ${name}: got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}${extra ? '  ' + extra : ''}`);
}

// ====================================================================================================
// LAYER A — static full-tree enumeration + classification
// ====================================================================================================
console.log('LAYER A — full-tree enumeration / classification / footgun scan:');
const lint = lintTree();
console.log(`  enumerated ${lint.total} reduction-shaped sites across the tree → ${lint.classified.length} classified, ${lint.unclassified.length} unclassified`);
for (const h of lint.unclassified) console.log(`     UNCLASSIFIED ${h.rel}:${h.line} [${h.tok}] ${h.text.slice(0, 90)}`);
check('every reduction-shaped site in the tree is CLASSIFIED (no silent re-aggregation in an unlisted file)', lint.unclassified.length, 0);
check('at least one CANONICAL worst-of-K fold site enumerated (scorecard.worstOfK found)', (lint.byClass.canonical || 0) >= 1, true);
check('side-track worst-of-K folds enumerated (coevo/census/phase-neg1)', (lint.byClass['worst-fold'] || 0) >= 1, true);

for (const b of lint.bestReplicateDecisions) console.log(`     BEST-REPLICATE DECISION ${b.rel}:${b.line}  ${b.text.slice(0, 90)}`);
check('no decision path promotes by a per-replicate .median / .best / mean()', lint.bestReplicateDecisions.length, 0);

console.log(`  rate() audit: ${lint.rateAudit.defs.length} definitions; ${lint.rateAudit.errors.length} decision-metric fail-open errors; ${lint.rateAudit.advisories.length} advisories`);
for (const e of lint.rateAudit.errors) console.log(`     FAIL-OPEN DECISION-METRIC rate() ${e.rel}:${e.line} (default ${e.default})`);
check('no fail-OPEN rate() in any decision-metric path (the VOID-92/92 footgun family)', lint.rateAudit.errors.length, 0);

// ====================================================================================================
// LAYER B — behavioural: the canonical fold is AND, and the decision paths consume it
// ====================================================================================================
console.log('\nLAYER B — behavioural worst-of-K consumption:');
// one lethal crosscut cell c1; run1 PASSES it, run2 FAILS it → worst-of-K must be FALSE (best-of-K would be true).
const cellNames = { wire: ['w1'], happy: [], crosscut: ['c1'], integration: [] };
const passRun = { wire: { wired: { w1: true } }, happy: { fails: [] }, crosscut: { fails: [] }, integration: { fails: [] } };
const failRun = { wire: { wired: { w1: true } }, happy: { fails: [] }, crosscut: { fails: [{ name: 'c1' }] }, integration: { fails: [] } };
const mixed = buildScorecard({ genome: null, genomeHash: 'mix', epics: [{ name: 'e', cellNames, runs: [passRun, failRun] }], ledger: null });
const clean = buildScorecard({ genome: null, genomeHash: 'cln', epics: [{ name: 'e', cellNames, runs: [passRun, passRun] }], ledger: null });

check('worst-of-K AND-fold: a cell that fails in ANY run is FALSE', mixed.cells['e::crosscut::c1'], false);
check('  best-replicate would have passed — the clean (both-pass) build IS true', clean.cells['e::crosscut::c1'], true);
check('  reliability reflects worst not best (crosscut 0/1 pass)', mixed.perEpic.e.buckets.crosscut.pass, 0);
check('  worst-of-K digest counts the lethal miss (lethalFailCount 1)', mixed.digest.lethalFailCount, 1);

// archive lethal veto must REJECT a candidate that drops a lethal cell below a clean baseline — i.e. it reads
// the worst-of-K `cells`, not a per-run/best aggregate (else mixed's c1 would look passing).
const archive = makeArchive({ cap: 6 });
const vetoed = archive.insert(mixed, { id: 'g' }, clean);
check('archive lethal veto REJECTS a worst-of-K cell drop (a best-replicate would have slipped through)', vetoed.inserted, false);
check('  veto reason names the lethal drop', /lethal-veto/.test(vetoed.reason), true);
const admitted = makeArchive({ cap: 6 }).insert(clean, { id: 'g' }, clean);
check('  archive ADMITS a candidate that does not drop a lethal cell (no false veto)', admitted.inserted, true);

// credit must select the worst-LETHAL candidate off the worst-of-K digest, and return null when none is lethal.
const worst = worstLethalCandidate([{ genome: {}, sc: clean }, { genome: {}, sc: mixed }]);
check('credit picks the worst-lethal candidate by worst-of-K digest.lethalFailCount', worst && worst.sc.genomeHash, 'mix');
check('  credit returns null when no candidate has a worst-of-K lethal failure', worstLethalCandidate([{ genome: {}, sc: clean }]), null);

// ====================================================================================================
// LAYER C — self-validation: plant violations and assert the lint FIRES (no-false-negative)
// ====================================================================================================
console.log('\nLAYER C — self-validation (planted violations must fire):');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agglint-'));
try {
  // (1) an unregistered reducer in a NEW file → the enumeration net must flag it unclassified.
  fs.writeFileSync(path.join(tmp, 'evil-newfile.mjs'), 'export const x = draws.reduce((a, b) => Math.max(a, b), -Infinity);\n');
  const planted = enumerateAggregationSites(tmp).filter((h) => !classifySite(h));
  check('planted: an unregistered reducer in a NEW file is UNCLASSIFIED (enumeration net fires)', planted.length >= 1, true);

  // (2) a verdict that reads .best → flagged a best-replicate decision.
  fs.writeFileSync(path.join(tmp, 'evil-decision.mjs'), "const verdict = agg.final.crosscut.best >= b.c ? 'WIN' : 'FAIL';\n");
  check('planted: a verdict reading .best is flagged as a best-replicate decision', findBestReplicateDecisions(tmp).length >= 1, true);

  // (3) a fail-OPEN rate() in a decision-metric file (same basename) → a hard error.
  fs.writeFileSync(path.join(tmp, 'coevo-rung1.mjs'), 'const rate = (b) => (b && b.total ? b.pass / b.total : 1);\n');
  check('planted: a fail-OPEN rate() in a decision-metric file is a hard error', auditRate(tmp).errors.length >= 1, true);

  // (4) no-false-positive sanity: a fail-CLOSED rate() in a decision-metric file is NOT an error.
  fs.writeFileSync(path.join(tmp, 'head-to-head.mjs'), 'const rate = (b) => (b && b.total ? b.pass / b.total : 0);\n');
  const a2 = auditRate(tmp);
  check('no-false-positive: a fail-CLOSED rate() is accepted', a2.errors.some((e) => path.basename(e.rel) === 'head-to-head.mjs'), false);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ====================================================================================================
// Advisory findings (non-failing) — surfaced, not buried.
// ====================================================================================================
if (lint.rateAudit.advisories.length) {
  console.log('\nADVISORY (non-failing) — fail-open rate() in oracle self-test gates (unreachable on complete hand-authored references; harden if a reference can ever carry an absent bucket):');
  for (const a of lint.rateAudit.advisories) console.log(`  • ${a.rel}:${a.line} (default ${a.default})`);
}

console.log(`\nAGGREGATE-CONSISTENCY LINT: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('GATE FAILURE — worst-of-K aggregate consistency is NOT proven: ' + fails.join('; ')); process.exit(1); }
console.log('✅ worst-of-K is the single decision aggregate: every site enumerated+classified, the canonical fold is AND, the decision paths consume it, no best-replicate / fail-open footgun, and the lint provably fires.');
