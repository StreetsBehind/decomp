// Gleaning #5 — the AGGREGATE-CONSISTENCY LINT (validates the frozen worst-of-K, DESIGN §5).
//
// evo's rule: "every decision path must see the SAME aggregate the decision uses; never promote by
// best-replicate; noisy benches commit lucky winners." This file is the STATIC engine behind the gate
// (gates/aggregate-consistency.mjs); the behavioural runtime assertions live in the gate.
//
// DISPOSITION (runs/deliberations/20260619T220547Z): the plan's #5 claim that scorecard.mjs is "THE single
// aggregation source" is exactly what the historical `rate()` footgun disproves ([[coevo-grader-bug-and-baseline]]
// — it lived in coevo-rung1.mjs / head-to-head.mjs, which RE-AGGREGATE independently). So this lint does NOT
// trust a single named site. Its first job is FULL-TREE ENUMERATION: find every reduction-shaped site that
// could collapse a K-indexed (replicate / per-run / per-cell-over-runs) array into a scalar or a decision, and
// require each to be CLASSIFIED. An UNCLASSIFIED reduction in any file — listed or not — fails the gate; that
// is the "a silent re-aggregation in an unlisted file is the failure mode" guard. The registry IS the audited
// census; the generalized `rate()` lesson applies — a check that can't be SHOWN to fire is treated as ABSENT,
// so the gate also plants a violation and asserts the classifier flags it.
//
// Classes (every enumerated site lands in exactly one):
//   canonical            — IS the worst-of-K fold (scorecard.worstOfK / its digest count).
//   worst-fold           — an independent track that folds the K axis by WORST (min / every / .worst); the
//                          decision must read .worst, never .median / .best (enforced separately).
//   consumes-worst-of-k  — reduces over CANDIDATES/MEMBERS (each already worst-of-K folded), not over K runs.
//   report-*             — a mean / best / median computed for REPORTING only; the no-best-replicate scan
//                          proves it never feeds a decision comparison.
//   not-k-axis:<kind>    — reduces over a non-K axis: concurrency pool, CLI config, numeric clamp, cost sum,
//                          display/eviction sort, writer-index, surrogate neighbour stat, …
// Anything matching none of the above → UNCLASSIFIED → the gate prints it and fails.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const MS_ROOT = path.resolve(HERE, '..');

// This lint engine + its gate are the CHECKER, not a search-decision path; their own reducers are excluded
// from the tree scan (the planted-violation self-test, not self-scanning, proves the classifier fires).
const SELF_FILES = new Set(['aggregate-consistency.mjs']);

// ---------------------------------------------------------------------------------------------------------
// Enumeration: reduction-shaped tokens that could collapse a K-indexed array into a scalar / decision.
// ---------------------------------------------------------------------------------------------------------
export const REDUCER_PATTERNS = [
  { tok: 'mean', re: /\bmean\w*\s*[(=]/ },
  { tok: 'avg', re: /\bavg\w*\s*[(=]/ },
  { tok: 'reduce', re: /\.reduce\s*\(/ },
  { tok: 'min', re: /\bMath\.min\s*\(/ },
  { tok: 'max', re: /\bMath\.max\s*\(/ },
  { tok: 'every', re: /\.every\s*\(/ },
  { tok: 'some', re: /\.some\s*\(/ },
  { tok: 'sort', re: /\.sort\s*\(/ },
  { tok: 'rate', re: /\brate\w*\s*[(=]/ },
  { tok: 'worst', re: /\bworst\b/i },
  { tok: 'best', re: /\bbest\b/i },
  { tok: 'median', re: /\bmedian\b/ },
  { tok: 'divlen', re: /\/\s*[\w.]*\.length\b/ },
];

// list every .mjs under root (src/, gates/, top-level), excluding data dumps + node_modules + the lint itself.
export function listTreeFiles(root = MS_ROOT) {
  const out = [];
  const skipDir = new Set(['runs', 'node_modules', '.git']);
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) { if (!skipDir.has(ent.name)) walk(path.join(dir, ent.name)); continue; }
      if (!ent.name.endsWith('.mjs')) continue;
      if (SELF_FILES.has(ent.name)) continue;
      out.push(path.join(dir, ent.name));
    }
  }
  walk(root);
  return out.sort();
}

// true for a source line that is purely a comment (so we don't flag prose). Best-effort, line-granular.
function isCommentLine(line) {
  const t = line.trim();
  return t === '' || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

// Enumerate all reduction-shaped sites. Returns [{file, rel, line, tok, text}].
export function enumerateAggregationSites(root = MS_ROOT) {
  const hits = [];
  for (const file of listTreeFiles(root)) {
    const rel = path.relative(root, file);
    const src = fs.readFileSync(file, 'utf8').split('\n');
    let inBlockComment = false;
    for (let i = 0; i < src.length; i++) {
      const raw = src[i];
      const t = raw.trim();
      if (inBlockComment) { if (t.includes('*/')) inBlockComment = false; continue; }
      if (t.startsWith('/*') && !t.includes('*/')) { inBlockComment = true; continue; }
      if (isCommentLine(raw)) continue;
      const seen = new Set();
      for (const { tok, re } of REDUCER_PATTERNS) {
        if (re.test(raw) && !seen.has(tok)) { seen.add(tok); hits.push({ file, rel, line: i + 1, tok, text: raw.trim() }); }
      }
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------------------------------------
// Classification registry. Ordered; first matching rule wins. `when(hit)` sees {rel, tok, text, line}.
// `base` (optional) restricts a rule to one file's basename. Rules are matched on STABLE line content
// (a substring / regex), never line numbers, so code may move without breaking the census.
// ---------------------------------------------------------------------------------------------------------
const base = (rel) => path.basename(rel);
const has = (hit, ...subs) => subs.every((s) => hit.text.includes(s));
const reHit = (hit, re) => re.test(hit.text);

export const REGISTRY = [
  // ---- CANONICAL: the one worst-of-K fold + its derived digest count (scorecard.mjs) -------------------
  { class: 'canonical', reason: 'worst-of-K AND-fold: a cell passes iff it passed in EVERY run',
    when: (h) => base(h.rel) === 'scorecard.mjs' && (has(h, 'worstOfK') || reHit(h, /\.every\(\(m\)/) || has(h, "m[bucket][n] === true")) },
  { class: 'canonical', reason: 'digest lethal-fail count over the worst-of-K pooled buckets',
    when: (h) => base(h.rel) === 'scorecard.mjs' && has(h, 'LETHAL_BUCKETS.reduce') },
  { class: 'not-k-axis:bucket-fold', reason: 'cost-weighted reliability scalar over already-worst-of-K pooled buckets',
    when: (h) => base(h.rel) === 'scorecard.mjs' },

  // ---- RATE reducers: every bucket→fraction reducer (the rate() footgun family). Correctness (fail-closed
  //      vs fail-open) is judged by auditRate(); here we only ENUMERATE them. ----------------------------
  { class: 'not-k-axis:price', reason: 'ledger price-table lookup named `rate` — not a bucket reducer (token false-positive)',
    when: (h) => base(h.rel) === 'ledger.mjs' && has(h, 'PRICE_TABLE') },
  { class: 'rate-reducer', reason: 'bucket pass-fraction rate() definition or use (fail-closed/open judged by auditRate)',
    when: (h) => h.tok === 'rate' },

  // ---- TEST-FIXTURE / CODEGEN / ORACLE-ASSERTION: epic builders, mutant generators, assert.ok bodies ---
  { class: 'not-k-axis:test-fixture', reason: 'epic/test code generator or oracle assertion body — not a K aggregation',
    when: (h) => h.rel.startsWith('epics-src/') || h.rel.startsWith('gates/lib/') || base(h.rel) === 'oracle2.mjs' },
  { class: 'not-k-axis:test-fixture', reason: 'gate smoke fixture: reductions inside test code / template strings',
    when: (h) => /-smoke\.mjs$/.test(base(h.rel)) },
  { class: 'not-k-axis:test-fixture', reason: 'gen-test-set epic codegen (.some inside an export-function template)',
    when: (h) => base(h.rel) === 'gen-test-set.mjs' && h.tok === 'some' },

  // ---- WORST-FOLD: independent tracks that fold the K axis by WORST (min / every / .worst) -------------
  { class: 'worst-fold', reason: 'coevo worst-of-K min fold + worst/median/best stat (only .worst feeds the verdict)',
    when: (h) => base(h.rel) === 'coevo-rung1.mjs' && (has(h, 'Math.min(a, b), Infinity') || reHit(h, /const (min|med|max|stat) =/) || reHit(h, /stat\(draws\.map/) || h.tok === 'worst') },
  { class: 'worst-fold', reason: 'census worst-of-K via Math.min over the K rows; worst-draw sort',
    when: (h) => base(h.rel) === 'census-classify.mjs' && (has(h, 'Math.min(...rows.map') || h.tok === 'worst' || reHit(h, /rows\]\.sort/) || reHit(h, /drawDirs/)) },
  { class: 'worst-fold', reason: 'phase-neg1 selects/reads the worst-of-K (.worst / worst-draw sort) per epic',
    when: (h) => base(h.rel) === 'phase-neg1.mjs' && h.tok === 'worst' },
  { class: 'worst-fold', reason: 'label-draw repair-route reps: leak/full-pass any-of over reps (telemetry on the worst draw)',
    when: (h) => base(h.rel) === 'label-draw.mjs' && h.tok === 'some' },

  // ---- CONSUMES-WORST-OF-K: reductions over CANDIDATES/MEMBERS (each entry already worst-of-K) ---------
  { class: 'consumes-worst-of-k', reason: 'archive: Pareto/eviction/veto over member scorecards (worst-of-K reliability/cells)',
    when: (h) => base(h.rel) === 'archive.mjs' },
  { class: 'consumes-worst-of-k', reason: 'map-elites: Pareto/front/select/diversity over elite scorecards (worst-of-K)',
    when: (h) => base(h.rel) === 'map-elites.mjs' && (h.tok === 'sort' || h.tok === 'some' || h.tok === 'divlen' || reHit(h, /paretoDominates|allMembers|members|elites|front|coverage/)) },
  { class: 'consumes-worst-of-k', reason: 'credit: worst-lethal candidate/bucket by worst-of-K digest.lethalFailCount / frac',
    when: (h) => base(h.rel) === 'credit.mjs' && (h.tok === 'worst' || reHit(h, /\bbest(Key)?\b/) || has(h, 'lethalFailCount') || has(h, 'attributeBlame')) },
  { class: 'consumes-worst-of-k', reason: 'loop: best reliability over ARCHIVE CANDIDATES (each already worst-of-K), not over K runs',
    when: (h) => base(h.rel) === 'loop.mjs' && has(h, 'archive.members.map') },
  { class: 'consumes-worst-of-k', reason: 'head-to-head single-grade predicates over fail-closed rate() (no K fold in this track)',
    when: (h) => base(h.rel) === 'head-to-head.mjs' && (has(h, 'epicOK') || has(h, 'relOf') || has(h, 'isGrade')) },
  { class: 'consumes-worst-of-k', reason: 'instrument gate: planted-optimum rediscovery over archive MEMBERS (worst-of-K reliability/cost)',
    when: (h) => h.tok === 'some' && has(h, 'archive.members') && has(h, 'reliability') },
  // Batch-2 #3 strategy-ablation: stop-condition over ARCHIVE members (each already worst-of-K), and `best` only
  // appears in a prose log line ("ROBUST to … or a μ-best artifact") — neither folds the K axis.
  { class: 'consumes-worst-of-k', reason: 'strategy-ablation: stopWhen over archive members (arc.members.some — each already worst-of-K), not over K runs',
    when: (h) => base(h.rel) === 'strategy-ablation.mjs' && h.tok === 'some' && reHit(h, /(arc|res\.archive)\.members\.some/) },
  { class: 'report-mean', reason: 'strategy-ablation: `best`/`worst`/min/max appear only in prose log strings or report stats (μ-best artifact?, scale-gate sort), never a K fold',
    when: (h) => base(h.rel) === 'strategy-ablation.mjs' && (h.tok === 'best' || h.tok === 'worst' || h.tok === 'min' || h.tok === 'max' || h.tok === 'mean') },

  // ---- SCORE-REPRO (Batch-2 #2b-POST): the kill CONSUMES already-worst-of-K scorecards (imported lethalCounts
  //      from credit), never folds the K axis itself. Its reductions are a numeric clamp + prose `worst` tokens.
  { class: 'consumes-worst-of-k', reason: 'score-repro kill: per-lethal-bucket downward-breach over already-worst-of-K scorecards (imported credit lethalCounts/bucketSE); no K fold here',
    when: (h) => base(h.rel) === 'score-repro.mjs' },
  { class: 'not-k-axis:structural', reason: 'score-repro-kill driver: `worst` appears only in prose/log strings + the worstDownBreach field name; not a K aggregation',
    when: (h) => base(h.rel) === 'score-repro-kill.mjs' && (h.tok === 'worst' || h.tok === 'best' || h.tok === 'min' || h.tok === 'max') },

  // ---- REPORT-ONLY means / bests / gate-stats (the no-best-replicate scan proves none feed a decision) -
  { class: 'report-mean', reason: 'P-sweep/P1/P2 analysis mean/sum over scale points for the REPORTED OFF/ON delta (not a promotion)',
    when: (h) => ['p1.mjs', 'p2.mjs', 'p2b-sweep.mjs', 'routed-baseline.mjs'].includes(base(h.rel)) && (h.tok === 'mean' || h.tok === 'reduce' || h.tok === 'divlen' || h.tok === 'max' || h.tok === 'min') },
  { class: 'report-best', reason: 'P1 reports the best-lethal candidate for display only (console.log)',
    when: (h) => base(h.rel) === 'p1.mjs' && h.tok === 'best' },
  { class: 'report-mean', reason: 'phase-neg1 mean/sd/range are reported instability-band stats, not a decision aggregate',
    when: (h) => base(h.rel) === 'phase-neg1.mjs' && (h.tok === 'mean' || h.tok === 'reduce' || h.tok === 'max' || h.tok === 'min' || h.tok === 'divlen') },
  { class: 'report-mean', reason: 'label-draw repair-route spread min/max — reported range, not a promotion aggregate',
    when: (h) => base(h.rel) === 'label-draw.mjs' && (h.tok === 'min' || h.tok === 'max') },
  { class: 'not-k-axis:gate-stat', reason: 'instrument-gate rediscovery/coverage stat (pass-fraction, max coverage, median over seeds) — a gate report',
    when: (h) => /^(k8-|p2c-)/.test(base(h.rel)) && (h.tok === 'divlen' || h.tok === 'max' || h.tok === 'min' || h.tok === 'median' || h.tok === 'worst') },

  // ---- AGREEMENT / GATE-CHECK aggregations (over a check-list or over runs for CONSISTENCY, not promotion)
  { class: 'not-k-axis:gate-checks', reason: 'gate pass = checks.every(c => c.pass) over its own check list, not over K runs',
    when: (h) => (h.rel.startsWith('gates/') || base(h.rel) === 'p0.mjs') && (reHit(h, /\.every\(\([^)]*\)\s*=>\s*[\w.]*\.pass\)/) || has(h, 'blocking.every') || has(h, 'checks.every')) },
  { class: 'not-k-axis:agreement', reason: 'P1/P2 reproducibility/any-fired check across runs (agreement, not best-replicate promotion)',
    when: (h) => ['p1.mjs', 'p2.mjs'].includes(base(h.rel)) && (h.tok === 'some' || h.tok === 'every') },
  { class: 'not-k-axis:gate-checks', reason: 'gate/oracle self-test assertion (LETHAL_BUCKETS.every(rate===1), killedAnyLethal, audit checks)',
    when: (h) => h.rel.startsWith('gates/') && (h.tok === 'every' || h.tok === 'some' || h.tok === 'worst') },

  // ---- SCAN reductions (token/store/verb detection — not a K aggregation) ------------------------------
  { class: 'not-k-axis:scan', reason: 'token/store/verb scan (oracle-token leak scan, store-write detection, route verbs)',
    when: (h) => ['checker.mjs', 'integration-gate.mjs', 'seam-gate.mjs', 'routed-baseline.mjs'].includes(base(h.rel)) && h.tok === 'some' },

  // ---- NOT-K-AXIS benign reductions (tree-wide patterns, matched on stable line shape) -----------------
  { class: 'not-k-axis:concurrency', reason: 'bounded-concurrency pool size = min(limit, items.length)',
    when: (h) => reHit(h, /Math\.min\(\s*\w+\s*,\s*\w+\.length/) },
  { class: 'not-k-axis:config', reason: 'CLI/config bound on a parsed argument or a topology cap',
    when: (h) => reHit(h, /Math\.(min|max)\([^)]*parseInt/) || has(h, 'parseInt(arg(') || base(h.rel) === 'gen-diverse-epics.mjs' || base(h.rel) === 'config.mjs' },
  { class: 'not-k-axis:clamp', reason: 'numeric clamp on a single scalar (repairDepth / fraction / score bound)',
    when: (h) => reHit(h, /Math\.(min|max)\(\s*-?\d+(\.\d+)?\s*,/) || reHit(h, /Math\.max\(\s*\(?\d/) || has(h, 'repairDepth') || has(h, 'obligationDepth') || has(h, 'nLenses') },
  { class: 'not-k-axis:index', reason: 'array-index / window / hamming-bucket bound, not an aggregate',
    when: (h) => reHit(h, /Math\.min\(\s*i\s*,/) || has(h, 'writers.length - 1') || has(h, 'Math.floor(h / 2)') || has(h, 'winEnd') || reHit(h, /\.after \+ \d+/) },
  { class: 'not-k-axis:cost-sum', reason: 'additive cost / count sum over calls / surfaces (no min/max/mean decision)',
    when: (h) => reHit(h, /reduce\(.*(usd|cost|surfaces?|Surfaces|EXPECTS|freeIds|Repairs|Violations|Fixed|totalUsd|delta)/i) },
  { class: 'not-k-axis:display-sort', reason: 'ordering rows/keys/dirs for display, tally, eviction or front (over members/keys, not K)',
    when: (h) => h.tok === 'sort' },
  { class: 'not-k-axis:surrogate-stat', reason: 'surrogate Spearman/k-NN stats over training points & neighbours, not over K runs',
    when: (h) => base(h.rel) === 'surrogate.mjs' },
  { class: 'not-k-axis:genome-canon', reason: 'genome canonicalisation: sort object keys for a stable hash',
    when: (h) => base(h.rel) === 'genome.mjs' },

  // ---- side-track structural/tally reductions (some(missing) / every(no-op) / repair tallies) ----------
  { class: 'not-k-axis:structural', reason: 'structural any/all over draws (missing-draw / gate-no-op flags) or repair tallies — telemetry, not the worst-of-K metric',
    when: (h) => ['coevo-rung1.mjs', 'head-to-head.mjs'].includes(base(h.rel)) && (h.tok === 'some' || h.tok === 'every' || h.tok === 'reduce' || reHit(h, /missingDraws|gate\.fired|surfacesFlagged|leak/)) },

  // ---- p2c search-orchestration ratio (evalCount), not a replicate aggregate --------------------------
  { class: 'not-k-axis:ratio', reason: 'p2c projected-screenable ratio (evalCount), not a replicate aggregate',
    when: (h) => base(h.rel) === 'p2c-search.mjs' },
];

// Classify one hit. Returns {class, reason} or null (unclassified).
export function classifySite(hit) {
  for (const rule of REGISTRY) {
    try { if (rule.when(hit)) return { class: rule.class, reason: rule.reason }; }
    catch { /* a rule that throws simply doesn't match */ }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------
// The no-best-replicate scan: a DECISION line (a comparison / verdict / promotion) must never read a
// per-replicate `.median` / `.best` / `mean(...)` aggregate. This is the static half of "never promote by
// best-replicate". (coevo's stat() exposes median/best, but only .worst is allowed in a decision.)
// ---------------------------------------------------------------------------------------------------------
const DECISION_MARKERS = /(verdict|epicOK|=== 1|>= b\.|>= baseline|\? 'WIN|\?\s*'pass|inserted:\s*true|attributed\s*=|promote)/;
const BEST_REPLICATE_REF = /\.median\b|\.best\b|\bmean\s*\(|\bbestOf\b/;

export function findBestReplicateDecisions(root = MS_ROOT) {
  const bad = [];
  for (const file of listTreeFiles(root)) {
    const rel = path.relative(root, file);
    const src = fs.readFileSync(file, 'utf8').split('\n');
    let inBlock = false;
    for (let i = 0; i < src.length; i++) {
      const raw = src[i]; const t = raw.trim();
      if (inBlock) { if (t.includes('*/')) inBlock = false; continue; }
      if (t.startsWith('/*') && !t.includes('*/')) { inBlock = true; continue; }
      if (isCommentLine(raw)) continue;
      if (DECISION_MARKERS.test(raw) && BEST_REPLICATE_REF.test(raw)) bad.push({ rel, line: i + 1, text: t });
    }
  }
  return bad;
}

// ---------------------------------------------------------------------------------------------------------
// rate() fail-closed AUDIT (the rate() footgun family). The historical VOID-92/92 bug was a `rate` reducer
// defaulting an absent bucket to 1 (a crashed/empty grade → fake 100%). Enumerate EVERY bucket→fraction rate()
// DEFINITION across the tree, record its default, and split by context:
//   DECISION_METRIC — rate() feeds a reliability score / admission / verdict → MUST be fail-closed (`: 0`).
//   ORACLE_GATE     — rate() inside a self-test gate on hand-authored COMPLETE references, where the absent-
//                     bucket branch is unreachable in practice → fail-open `: 1` tolerated but flagged advisory.
// A fail-open DECISION_METRIC rate() is a hard error; a fail-open ORACLE_GATE rate() is an advisory finding.
// ---------------------------------------------------------------------------------------------------------
export const DECISION_METRIC_RATE = Object.freeze([
  'coevo-rung1.mjs', 'head-to-head.mjs', 'census-classify.mjs', 'label-draw.mjs',
  'replay-persist.mjs', 'replay-repair.mjs', 'routed-baseline.mjs', 'gen-test-set.mjs',
]);
export const ORACLE_GATE_RATE = Object.freeze([
  'g2-oracle-gate.mjs', 'g-oracle2.mjs', 'g-diverse-templates.mjs', 'g-template-approval.mjs',
]);

// match `const rate = (b) => (b && b.total ? b.pass / b.total : N)` capturing N (the absent-bucket default).
const RATE_DEF = /const\s+rate\s*=\s*\([^)]*\)\s*=>\s*\([^?]*\.total\s*\?[^:]*:\s*([01])(?:\.0)?\s*\)/;

export function auditRate(root = MS_ROOT) {
  const defs = [];
  for (const file of listTreeFiles(root)) {
    const rel = path.relative(root, file);
    const bn = base(rel);
    const src = fs.readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < src.length; i++) {
      const m = RATE_DEF.exec(src[i]);
      if (!m) continue;
      const dflt = Number(m[1]);
      const failClosed = dflt === 0;
      const context = DECISION_METRIC_RATE.includes(bn) ? 'decision-metric'
        : ORACLE_GATE_RATE.includes(bn) ? 'oracle-gate' : 'other';
      defs.push({ rel, line: i + 1, default: dflt, failClosed, context });
    }
  }
  const errors = defs.filter((d) => d.context === 'decision-metric' && !d.failClosed);
  const advisories = defs.filter((d) => !d.failClosed && d.context !== 'decision-metric');
  return { defs, errors, advisories };
}

// Top-level lint: enumerate → classify → partition. Pure (no process.exit); the gate decides pass/fail.
export function lintTree(root = MS_ROOT) {
  const sites = enumerateAggregationSites(root);
  const classified = []; const unclassified = [];
  const byClass = {};
  for (const h of sites) {
    const c = classifySite(h);
    if (c) { classified.push({ ...h, ...c }); byClass[c.class] = (byClass[c.class] || 0) + 1; }
    else unclassified.push(h);
  }
  return {
    total: sites.length,
    classified, unclassified, byClass,
    bestReplicateDecisions: findBestReplicateDecisions(root),
    rateAudit: auditRate(root),
  };
}
