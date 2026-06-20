// PRE verifier — per-candidate "broken-eval" guard (gleaning #2b PRE; DECISION-BRIEF #2).
//
// evo runs a `verifier` agent PRE/POST every experiment (leakage, subsetted-eval, cache short-circuit,
// score-reproducibility). Our equivalent here is the PRE half ONLY: a conservative, audit-grade assertion
// that a candidate's scorecard came from a REAL, COMPLETE eval of the frozen CORE-of-record — not a
// silently-subsetted battery (ran 1 of 2 declared epics), not a stale/cached/empty scorecard. These are
// already §4.5 hard-fail territory (a harness error / empty / partial battery is never "no failures
// observed"), so PRE only catches BROKEN evals → freeze-safe NOW (Class B audit; no survivor-changing
// re-decision). POST score-reproducibility (re-run within the K-run noise band) is Batch 2, charged to K5.
//
// EPOCH-RELATIVE CORE (the binding disposition delta): the caller passes `expectedCore` — at P1 it is
// config.P1_ANCHOR_EPICS (= ['workspace','scale-d1']); a pilot/smoke that legitimately runs 1 epic passes
// ITS declared core. A hard-coded 2-epic core would FALSE-FAIL the synthetic/pilot paths, so CORE is never
// hard-coded here — it is always the caller's epoch-relative declaration.
//
// The scorecard shape consumed (scorecard.mjs buildScorecard): { perEpic:{[name]:{buckets,epicCheck}},
// harnessFailRate:number, ... }. We read only structural footprint — never a bucket name's semantics, never
// the cells channel — so this is a pure broken-eval guard, not a fitness re-decision.

const PRE_FAIL = '__preVerifierFail';

// Build a typed Error carrying the structured violation (mirrors the watchdog `__watchdogTrip` convention so
// callers can distinguish a broken-eval hard-fail from an unexpected crash).
function preFailError(kind, detail, payload) {
  const e = new Error(`PRE-verifier ${kind}: ${detail}`);
  e.name = 'PreVerifierError';
  e[PRE_FAIL] = true;
  e.kind = kind;
  e.payload = payload || null;
  return e;
}

// Count the worst-of-K runs an epic carries. The scorecard does not retain the raw runs array, but it DOES
// retain a per-bucket {pass,total} footprint and the harness-fail accounting; the K footprint is carried by
// the caller-supplied runsByEpic (the eval backend knows K). When runsByEpic is absent we fall back to the
// scorecard's own structural footprint (every declared epic must carry at least one graded bucket-total),
// which still catches an epic with zero runs (empty perEpic entry → 0 total cells → underK).
function bucketCellTotal(perEpicEntry) {
  if (!perEpicEntry || !perEpicEntry.buckets) return 0;
  let total = 0;
  for (const b of Object.values(perEpicEntry.buckets)) total += (b && Number.isFinite(b.total)) ? b.total : 0;
  return total;
}

/**
 * Assert the scorecard covered EXACTLY the declared frozen CORE-of-record for the current epoch.
 *  - NO silent SUBSET: every expectedCore epic is present in perEpic.
 *  - NO extra: no perEpic key outside expectedCore (a different/unexpected epic was graded).
 *  - each epic carries >= minK worst-of-K runs (when a runsByEpic map is supplied; otherwise each epic must
 *    carry a non-empty graded footprint so a zero-run/empty epic still trips).
 *
 * @param {object} scorecard          buildScorecard() output
 * @param {string[]} expectedCore      the epoch-relative CORE epic names the caller declares (P1 = anchor pair)
 * @param {object} [opts]
 * @param {number} [opts.minK=1]       minimum worst-of-K runs required per epic
 * @param {object<string,number>} [opts.runsByEpic]  optional {epicName: runCount} the backend knows
 * @returns {{ok:boolean, missing:string[], extra:string[], underK:string[]}}
 */
export function assertFullCore(scorecard, expectedCore, { minK = 1, runsByEpic = null } = {}) {
  if (!Array.isArray(expectedCore) || expectedCore.length === 0) {
    // an empty declared core is itself a broken request — the caller must declare its epoch's CORE.
    throw preFailError('no-core-declared', 'expectedCore must be a non-empty epic-name array (epoch-relative CORE)', { expectedCore });
  }
  const perEpic = (scorecard && scorecard.perEpic && typeof scorecard.perEpic === 'object') ? scorecard.perEpic : {};
  const expected = new Set(expectedCore);
  const present = new Set(Object.keys(perEpic));

  const missing = expectedCore.filter((n) => !present.has(n));      // declared-but-absent → silent subset
  const extra = Object.keys(perEpic).filter((n) => !expected.has(n)); // graded-but-undeclared → wrong battery
  const underK = [];
  const minKFloor = minK >= 1 ? minK : 1;
  for (const name of expectedCore) {
    if (!present.has(name)) continue; // already a `missing` violation; don't double-count
    const declaredRuns = runsByEpic && Number.isFinite(runsByEpic[name]) ? runsByEpic[name] : null;
    // when the backend declares the K count, use it; otherwise infer K from the structural footprint (a
    // populated bucket map ⇒ at least minKFloor graded runs; an empty/cached entry ⇒ 0 → under-K).
    const k = declaredRuns != null ? declaredRuns : (bucketCellTotal(perEpic[name]) > 0 ? minKFloor : 0);
    if (k < minK) underK.push(name);
  }
  return { ok: missing.length === 0 && extra.length === 0 && underK.length === 0, missing, extra, underK };
}

// Thrower variant — for the §4.5 hard-fail surface in the worker. Throws a typed PreVerifierError on any
// violation; returns the same report object on pass.
export function assertFullCoreOrThrow(scorecard, expectedCore, opts = {}) {
  const r = assertFullCore(scorecard, expectedCore, opts);
  if (!r.ok) {
    const parts = [];
    if (r.missing.length) parts.push(`missing CORE epics [${r.missing.join(',')}] (silent subset)`);
    if (r.extra.length) parts.push(`unexpected epics [${r.extra.join(',')}] (wrong/extra battery)`);
    if (r.underK.length) parts.push(`epics below minK=${opts.minK ?? 1} runs [${r.underK.join(',')}]`);
    throw preFailError('subsetted-eval', parts.join('; '), r);
  }
  return r;
}

/**
 * Assert the eval ACTUALLY EXECUTED — not a stale/cached/empty scorecard.
 *  - perEpic is a non-empty object (something was graded);
 *  - every epic entry carries a real bucket footprint (a `buckets` map with finite totals) — a zero-footprint
 *    entry is an empty/cached placeholder;
 *  - harnessFailRate is a computed finite number in [0,1] (the worst-of-K harness accounting ran).
 *
 * @param {object} scorecard
 * @returns {{ok:boolean, reason:string}}
 */
export function assertFresh(scorecard) {
  if (!scorecard || typeof scorecard !== 'object') return { ok: false, reason: 'scorecard absent/not-an-object (stale or never built)' };
  const perEpic = scorecard.perEpic;
  if (!perEpic || typeof perEpic !== 'object' || Object.keys(perEpic).length === 0) {
    return { ok: false, reason: 'perEpic empty — no epic was graded (stale/cached/empty scorecard)' };
  }
  for (const [name, entry] of Object.entries(perEpic)) {
    if (!entry || !entry.buckets || typeof entry.buckets !== 'object') {
      return { ok: false, reason: `epic "${name}" carries no bucket footprint (empty/cached entry)` };
    }
    // does ANY bucket carry a finite {pass,total} pair? (a structural footprint check over ONE epic's
    // bucket map — NOT a fold over the K replicate axis). Written as an explicit scan loop.
    let hasFootprint = false;
    for (const b of Object.values(entry.buckets)) {
      if (b && Number.isFinite(b.total) && Number.isFinite(b.pass)) { hasFootprint = true; break; }
    }
    if (!hasFootprint) {
      return { ok: false, reason: `epic "${name}" has no finite {pass,total} bucket counts (eval did not actually run/grade)` };
    }
  }
  const h = scorecard.harnessFailRate;
  if (!Number.isFinite(h) || h < 0 || h > 1) {
    return { ok: false, reason: `harnessFailRate is not a computed number in [0,1] (got ${JSON.stringify(h)}) — the K-fold harness accounting did not run` };
  }
  return { ok: true, reason: 'fresh — perEpic populated, every epic has a finite bucket footprint, harnessFailRate computed' };
}

// Thrower variant of assertFresh.
export function assertFreshOrThrow(scorecard) {
  const r = assertFresh(scorecard);
  if (!r.ok) throw preFailError('stale-eval', r.reason, r);
  return r;
}

// Convenience: run both PRE checks (the worker calls this when ctx.expectedCore is provided). Throws a typed
// PreVerifierError on the first violation; returns the combined reports on pass.
export function runPreVerifier(scorecard, expectedCore, opts = {}) {
  const fresh = assertFreshOrThrow(scorecard);          // freshness first — a stale card has nothing to subset-check
  const core = assertFullCoreOrThrow(scorecard, expectedCore, opts);
  return { fresh, core };
}

export function isPreVerifierError(e) { return !!(e && e[PRE_FAIL]); }
export { PRE_FAIL };
