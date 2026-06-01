// KEYSTONE — the build-completeness / outcome-achievement oracle.
//
// Answers: if a build agent built EVERY bead in this snapshot, would the plan's
// outcomes be achieved? Three sub-scores over (snapshot + outcome manifest):
//
//   edgeCoverage  — every requiredEdge realized as a real (transitive) edge
//   beadPresence  — every outcome/requirement/must-have/concern covered; no scope-drift bead
//   buildReadiness— every non-epic bead carries the info a build agent needs    [graph-intrinsic]
//
// Output: schemas/build-completeness.schema.json. `buildComplete` uses the SAME thresholds
// (THRESHOLDS) regardless of which path computed the sub-scores.
//
// TWO PATHS — selected by whether the runner passes pre-computed `coverage` (3rd arg):
//
//   THICK / back-compat path (NO coverage given): edgeCoverage + beadPresence are computed
//     MECHANICALLY by planKey string-matching the manifest against bead provenance.planKey.
//     This is correct only when the lock is THICK — i.e. the method saw the manifest's planKeys
//     and could tag its beads with them (e.g. quicklist). Behaviour here is byte-for-byte what it
//     was before this module grew a 3rd arg, so the thick selftest + quicklist are unchanged.
//
//   THIN path (coverage given): a thin lock STATES only outcomes; the manifest's latent
//     requirements/edges live ONLY in the manifest, so a generative method invents its own
//     planKeys and the mechanical planKey match scores ~0 — NOT because the decomposition is
//     wrong, but because there is nothing to string-match. So on thin input the runner hands us
//     the ALREADY-COMPUTED semantic coverage (from the injected JUDGE, via
//     eval/generative-coverage.mjs) plus the mechanical STATED-outcome coverage
//     (eval/outcome-coverage.mjs), and we fold them in:
//       - edgeCoverage  <- coverage.edgeCoverage        (judge: required edge realized?)
//       - beadPresence  <- coverage.requirementCoverage + outcomeCoverage (semantic + stated)
//       - buildReadiness stays MECHANICAL (it is graph-intrinsic — a structural bar on any bead
//         set, independent of how beads trace back to the plan).
//     This makes 'buildComplete' MEAN THE SAME THING thin or thick: same thresholds, semantic
//     sub-scores instead of planKey sub-scores.
//
// This module stays PURE: it NEVER calls a judge. It only consumes coverage the runner passes in.
//
// This is distinct from omission catch-rate: catch-rate asks "did the METHOD detect a
// planted gap?"; this asks "would the RESULT build the outcomes?".

import { buildIndex, transitiveDeps, planKeyDependsOn, nonEpicBeads } from './graph/build-graph.mjs';

// Thresholds for the BUILD-COMPLETE verdict. Explicit so the selftest pins them.
export const THRESHOLDS = { edge: 1, presence: 1, readiness: 0.9 };

// ---- edgeCoverage ----------------------------------------------------------
function scoreEdgeCoverage(index, manifest) {
  const required = manifest.requiredEdges || [];
  const missing = [];
  let covered = 0;
  for (const e of required) {
    if (planKeyDependsOn(index, e.fromPlanKey, e.toPlanKey)) covered++;
    else missing.push({
      ref: `${e.fromPlanKey} -> ${e.toPlanKey}`,
      what: 'required dependency edge not realized (no transitive path)',
      evidence: e.why || 'declared in outcome-manifest.requiredEdges',
      tier: 0,
    });
  }
  return { score: required.length ? covered / required.length : 1, missing };
}

// ---- beadPresence ----------------------------------------------------------
function planKeyCovered(index, pk) {
  return (index.byPlanKey.get(pk) || []).length > 0;
}

function concernCovered(index, concernId) {
  if (planKeyCovered(index, concernId)) return true;
  return index.beads.some((b) => Array.isArray(b?.metadata?.concerns) && b.metadata.concerns.includes(concernId));
}

function scoreBeadPresence(index, manifest) {
  const missing = [];
  let covered = 0;
  let total = 0;

  // requirements
  for (const r of manifest.requirements || []) {
    total++;
    if (planKeyCovered(index, r.planKey)) covered++;
    else missing.push({ ref: r.id, what: `requirement '${r.planKey}' has no covering bead`, evidence: r.description || '', tier: 0 });
  }
  // must-haves
  for (const m of manifest.mustHaves || []) {
    total++;
    if (planKeyCovered(index, m.planKey)) covered++;
    else missing.push({ ref: m.id, what: `must-have '${m.planKey}' delivered by no bead`, evidence: m.statement || '', tier: 0 });
  }
  // required concerns
  for (const c of manifest.concerns || []) {
    if (c.status !== 'required') continue;
    total++;
    if (concernCovered(index, c.id)) covered++;
    else missing.push({ ref: c.id, what: `required concern '${c.id}' addressed by no bead`, evidence: '', tier: 0 });
  }
  // outcomes — satisfied if any of its satisfiedByAnyOf planKeys is covered
  for (const o of manifest.outcomes || []) {
    total++;
    const anyOf = o.satisfiedByAnyOf || [];
    const ok = anyOf.length ? anyOf.some((pk) => planKeyCovered(index, pk)) : false;
    if (ok) covered++;
    else missing.push({ ref: o.id, what: `outcome not reachable to any bead`, evidence: o.statement || '', tier: 0 });
  }

  // scope-drift: a non-epic bead whose planKey is not anchored in the manifest
  const valid = new Set([
    ...(manifest.requirements || []).map((r) => r.planKey),
    ...(manifest.mustHaves || []).map((m) => m.planKey),
    ...(manifest.concerns || []).map((c) => c.id),
    ...(manifest.outcomes || []).flatMap((o) => o.satisfiedByAnyOf || []),
  ]);
  for (const b of nonEpicBeads(index)) {
    const pk = b?.metadata?.provenance?.planKey;
    if (!pk || !valid.has(pk)) {
      missing.push({ ref: b.id, what: pk ? `scope-drift: planKey '${pk}' not in plan` : 'bead has no provenance.planKey', evidence: b.title || '', tier: 0 });
    }
  }

  return { score: total ? covered / total : 1, missing };
}

// ---- buildReadiness (Tier 0, mechanical) -----------------------------------
function readinessOfBead(b) {
  const md = b.metadata || {};
  const acs = md.acceptanceCriteria || [];
  const files = md.filesTouched || [];
  const cases = md.testPlanCases || [];
  const checks = [];
  if (acs.length >= 1 && acs.length <= 6) checks.push(true); else checks.push(false);
  if (files.length >= 1) checks.push(true); else checks.push(false);
  if (cases.length >= 1 || md.testPlanFile) checks.push(true); else checks.push(false);
  const score = checks.filter(Boolean).length / checks.length;
  const gaps = [];
  if (!checks[0]) gaps.push(acs.length > 6 ? `${acs.length} ACs (>6, not atomic)` : 'no acceptance criteria');
  if (!checks[1]) gaps.push('no filesTouched');
  if (!checks[2]) gaps.push('no test plan / cases');
  return { score, gaps };
}

function scoreBuildReadiness(index) {
  const beads = nonEpicBeads(index);
  const missing = [];
  let sum = 0;
  for (const b of beads) {
    const { score, gaps } = readinessOfBead(b);
    sum += score;
    if (score < 1) missing.push({ ref: b.id, what: gaps.join('; '), evidence: b.title || '', tier: 0 });
  }
  return { score: beads.length ? sum / beads.length : 1, missing };
}

// ---- THIN-path sub-scores (folded from already-computed semantic coverage) -------
//
// edgeCoverage is taken verbatim from the judge's generative edge coverage. We re-localize its
// misses into this module's {ref,what,evidence,tier} shape (tier:1 — a judgment produced them).
function edgeCoverageFromCoverage(coverage) {
  const src = coverage.edgeCoverage || { score: 1, missing: [] };
  const missing = (src.missing || []).map((m) => ({
    ref: m.ref,
    what: m.what || 'required dependency edge not realized (judge)',
    evidence: m.evidence || '',
    tier: 1,
  }));
  return { score: src.score, missing };
}

// beadPresence on thin input = "every latent requirement reached (judge) AND every stated outcome
// carried (mechanical)". We combine the two populations the SAME way generative-coverage combines
// requirements+edges: one pooled fraction so a population with more items weighs proportionally,
// matching "every needed thing must be reached". Misses are re-localized with their source tier
// (requirement = judge = tier 1; outcome = mechanical stated-coverage = tier 0).
function beadPresenceFromCoverage(coverage, outcomeCoverage) {
  const req = coverage.requirementCoverage || { score: 1, missing: [] };
  const out = outcomeCoverage || { score: 1, missing: [] };

  const reqMissing = (req.missing || []).map((m) => ({
    ref: m.ref,
    what: m.what || 'latent requirement not covered by the decomposition (judge)',
    evidence: m.evidence || '',
    tier: 1,
  }));
  const outMissing = (out.missing || []).map((m) => ({
    ref: m.ref,
    what: m.what || 'stated outcome carried by no bead',
    evidence: m.evidence || '',
    tier: 0,
  }));

  // Pooled fraction: reconstruct each population's item count from score + miss count, so a 0-item
  // population contributes nothing (matches generative-coverage's "1 if empty"). When a score is a
  // clean 0/n we can recover n exactly; otherwise we fall back to averaging the two fractions.
  const reqItems = countItems(req.score, reqMissing.length);
  const outItems = countItems(out.score, outMissing.length);
  const totalItems = reqItems + outItems;
  const totalMissing = reqMissing.length + outMissing.length;
  const score = totalItems ? (totalItems - totalMissing) / totalItems : 1;

  return { score, missing: [...reqMissing, ...outMissing] };
}

// Recover the population size n from (score = (n - miss)/n, miss). Returns 0 when undeterminable
// (score 1 with 0 misses ⇒ either empty or all-covered; treat as 0 items so it cannot dominate the
// pool, exactly like an empty population). miss>0 with score 1 is impossible, guarded to 0.
function countItems(score, miss) {
  if (miss === 0) return 0; // empty OR fully-covered population — contributes 0 to the pool
  if (score >= 1) return 0; // inconsistent (misses but perfect score) — ignore defensively
  // score = (n - miss)/n  =>  n = miss / (1 - score)
  return Math.round(miss / (1 - score));
}

// ---- the oracle ------------------------------------------------------------
/**
 * @param {object} snapshot  conforms to schemas/snapshot.schema.json
 * @param {object} manifest  conforms to schemas/outcome-manifest.schema.json
 * @param {object} [opts]    optional pre-computed coverage from the runner. PRESENCE of `coverage`
 *                           selects the THIN (semantic) path; its ABSENCE selects the THICK
 *                           (planKey-mechanical) back-compat path. The runner passes this ONLY for
 *                           THIN fixtures (and passes nothing for THICK fixtures).
 * @param {object} [opts.coverage]         scoreGenerativeCoverage(...) result
 *                                         { requirementCoverage:{score,missing[]},
 *                                           edgeCoverage:{score,missing[]}, overall }
 * @param {object} [opts.outcomeCoverage]  scoreOutcomeCoverage(...) result { score, missing[], ... }
 * @returns {object}         conforms to schemas/build-completeness.schema.json
 */
export function scoreBuildCompleteness(snapshot, manifest, opts = {}) {
  const index = buildIndex(snapshot);
  const { coverage, outcomeCoverage } = opts;
  const thinPath = !!coverage;

  // buildReadiness is graph-intrinsic and mechanical on BOTH paths.
  const buildReadiness = scoreBuildReadiness(index);

  let edgeCoverage;
  let beadPresence;
  if (thinPath) {
    // THIN: fold in the already-computed semantic coverage (judge) + stated-outcome coverage.
    edgeCoverage = edgeCoverageFromCoverage(coverage);
    beadPresence = beadPresenceFromCoverage(coverage, outcomeCoverage);
  } else {
    // THICK / back-compat: mechanical planKey string-matching (unchanged behaviour).
    edgeCoverage = scoreEdgeCoverage(index, manifest);
    beadPresence = scoreBeadPresence(index, manifest);
  }

  const buildComplete =
    edgeCoverage.score >= THRESHOLDS.edge &&
    beadPresence.score >= THRESHOLDS.presence &&
    beadPresence.missing.length === 0 &&
    buildReadiness.score >= THRESHOLDS.readiness;

  return {
    edgeCoverage,
    beadPresence,
    buildReadiness,
    buildComplete,
    verdict: buildComplete ? 'BUILD-COMPLETE' : 'INCOMPLETE',
    tier: thinPath ? 1 : 0, // thin folds in a judgment (tier 1); thick is pure tier-0 static.
  };
}

export default scoreBuildCompleteness;
