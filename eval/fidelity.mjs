// Expansion-fidelity score (0..100) over a snapshot — does the DAG look correct,
// complete, atomic, buildable-in-order, independent of the plan's OUTCOMES?
//
// Mechanical, deterministic, PURE. No clock/randomness. Shares graph/build-graph.mjs
// helpers (buildIndex / planKeyDependsOn / nonEpicBeads) so it can't drift from the
// build-completeness oracle about "what depends on what". (See CHARTER §5.4.)
//
// Weighted composite — explicit WEIGHTS sum to exactly 100:
//   pourCoverage  16  every manifest.requirements[].planKey has >=1 covering bead
//   atomicity     14  fraction of non-epic beads whose acceptanceCriteria length ∈ [1,6]
//   mustHave      14  every manifest.mustHaves[].planKey covered by >=1 bead
//   crossDep      18  fraction of manifest.requiredEdges realized (transitive planKeyDependsOn)
//   acyclicity    12  the dependency graph is a DAG (full marks if acyclic, 0 if any cycle)
//   reverseTrace  12  fraction of non-epic beads carrying metadata.provenance.planKey
//   concernTrace  10  every required concern covered (planKey OR metadata.concerns[])
//   readyNonEmpty  4  snapshot.ready is non-empty
//                ----
//                 100
//
// Each sub-check yields a fraction in [0,1]; the composite is Σ(weight * fraction),
// rounded to an integer 0..100. The sub-fractions and WEIGHTS are exported so the
// selftest can pin them and weights can't silently drift.

import { buildIndex, planKeyDependsOn, nonEpicBeads } from './graph/build-graph.mjs';

export const WEIGHTS = Object.freeze({
  pourCoverage: 16,
  atomicity: 14,
  mustHave: 14,
  crossDep: 18,
  acyclicity: 12,
  reverseTrace: 12,
  concernTrace: 10,
  readyNonEmpty: 4,
});

// --- shared coverage helpers (same semantics as the oracle) ----------------
function planKeyCovered(index, pk) {
  return (index.byPlanKey.get(pk) || []).length > 0;
}

function concernCovered(index, concernId) {
  if (planKeyCovered(index, concernId)) return true;
  return index.beads.some(
    (b) => Array.isArray(b?.metadata?.concerns) && b.metadata.concerns.includes(concernId),
  );
}

// --- pour-coverage: every requirement planKey has a covering bead -----------
function fracPourCoverage(index, manifest) {
  const reqs = manifest.requirements || [];
  if (!reqs.length) return 1;
  let covered = 0;
  for (const r of reqs) if (planKeyCovered(index, r.planKey)) covered++;
  return covered / reqs.length;
}

// --- atomicity: non-epic beads with AC length in [1,6] ----------------------
function fracAtomicity(index) {
  const beads = nonEpicBeads(index);
  if (!beads.length) return 1;
  let ok = 0;
  for (const b of beads) {
    const acs = b?.metadata?.acceptanceCriteria || [];
    if (acs.length >= 1 && acs.length <= 6) ok++;
  }
  return ok / beads.length;
}

// --- must-have coverage -----------------------------------------------------
function fracMustHave(index, manifest) {
  const mh = manifest.mustHaves || [];
  if (!mh.length) return 1;
  let covered = 0;
  for (const m of mh) if (planKeyCovered(index, m.planKey)) covered++;
  return covered / mh.length;
}

// --- cross-dep wiring: required edges realized (transitive) -----------------
function fracCrossDep(index, manifest) {
  const edges = manifest.requiredEdges || [];
  if (!edges.length) return 1;
  let realized = 0;
  for (const e of edges) if (planKeyDependsOn(index, e.fromPlanKey, e.toPlanKey)) realized++;
  return realized / edges.length;
}

// --- acyclicity: DAG check over the canonical depsOf adjacency --------------
// All-or-nothing: 1 if the dependency graph is acyclic, 0 if ANY cycle exists.
// Uses index.depsOf (X -> set of beads X depends on) — same edge source as the oracle.
function fracAcyclicity(index) {
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map();
  for (const id of index.depsOf.keys()) color.set(id, WHITE);

  // iterative DFS with grey/black coloring; grey-on-grey re-encounter => cycle
  for (const start of index.depsOf.keys()) {
    if (color.get(start) !== WHITE) continue;
    const stack = [{ node: start, enter: true }];
    while (stack.length) {
      const frame = stack.pop();
      const { node } = frame;
      if (frame.enter) {
        if (color.get(node) === GREY) continue; // already being processed via another path frame
        if (color.get(node) === BLACK) continue;
        color.set(node, GREY);
        stack.push({ node, enter: false }); // post-visit marker to color BLACK
        for (const dep of index.depsOf.get(node) || []) {
          // dep may be an edge target with no bead row; treat unknown ids as leaves
          if (!color.has(dep)) { color.set(dep, BLACK); continue; }
          if (color.get(dep) === GREY) return 0; // back-edge => cycle
          if (color.get(dep) === WHITE) stack.push({ node: dep, enter: true });
        }
      } else {
        color.set(node, BLACK);
      }
    }
  }
  return 1;
}

// --- reverse-trace: non-epic beads carrying provenance.planKey --------------
function fracReverseTrace(index) {
  const beads = nonEpicBeads(index);
  if (!beads.length) return 1;
  let traced = 0;
  for (const b of beads) if (b?.metadata?.provenance?.planKey) traced++;
  return traced / beads.length;
}

// --- concern-trace: every required concern covered --------------------------
function fracConcernTrace(index, manifest) {
  const required = (manifest.concerns || []).filter((c) => c.status === 'required');
  if (!required.length) return 1;
  let covered = 0;
  for (const c of required) if (concernCovered(index, c.id)) covered++;
  return covered / required.length;
}

// --- ready-nonempty ---------------------------------------------------------
function fracReadyNonEmpty(snapshot) {
  return Array.isArray(snapshot.ready) && snapshot.ready.length > 0 ? 1 : 0;
}

/**
 * Parametric expansion-fidelity composite.
 * @param {object} snapshot  conforms to schemas/snapshot.schema.json
 * @param {object} manifest  conforms to schemas/outcome-manifest.schema.json
 * @returns {number}         integer 0..100
 */
export function scoreFidelity(snapshot, manifest) {
  const index = buildIndex(snapshot);
  const m = manifest || {};

  const fractions = {
    pourCoverage: fracPourCoverage(index, m),
    atomicity: fracAtomicity(index),
    mustHave: fracMustHave(index, m),
    crossDep: fracCrossDep(index, m),
    acyclicity: fracAcyclicity(index),
    reverseTrace: fracReverseTrace(index),
    concernTrace: fracConcernTrace(index, m),
    readyNonEmpty: fracReadyNonEmpty(snapshot),
  };

  let total = 0;
  for (const k of Object.keys(WEIGHTS)) total += WEIGHTS[k] * fractions[k];
  return Math.round(total);
}

// Detailed breakdown (sub-fractions + weighted points) — for the selftest to pin
// exact sub-scores so weights can't drift silently. PURE; does not affect scoreFidelity.
export function scoreFidelityDetail(snapshot, manifest) {
  const index = buildIndex(snapshot);
  const m = manifest || {};
  const fractions = {
    pourCoverage: fracPourCoverage(index, m),
    atomicity: fracAtomicity(index),
    mustHave: fracMustHave(index, m),
    crossDep: fracCrossDep(index, m),
    acyclicity: fracAcyclicity(index),
    reverseTrace: fracReverseTrace(index),
    concernTrace: fracConcernTrace(index, m),
    readyNonEmpty: fracReadyNonEmpty(snapshot),
  };
  const points = {};
  let total = 0;
  for (const k of Object.keys(WEIGHTS)) {
    points[k] = WEIGHTS[k] * fractions[k];
    total += points[k];
  }
  return { fractions, points, score: Math.round(total) };
}

export default scoreFidelity;
