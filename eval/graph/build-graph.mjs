// Typed graph IR over a snapshot. The single set of canonical helpers every scorer
// imports — so two scorers can never disagree about "what depends on what" (no drift).
//
// Snapshot shape: schemas/snapshot.schema.json
//   edges[].from depends on / is blocked by edges[].to.

/** Build the canonical index: lookups + a dependency adjacency map. */
export function buildIndex(snapshot) {
  const beads = snapshot.beads || [];
  const byId = new Map();
  const byPlanKey = new Map(); // planKey -> [beadId, ...]

  for (const b of beads) {
    byId.set(b.id, b);
    const pk = b?.metadata?.provenance?.planKey;
    if (pk) {
      if (!byPlanKey.has(pk)) byPlanKey.set(pk, []);
      byPlanKey.get(pk).push(b.id);
    }
  }

  // dependency adjacency: depsOf.get(X) = set of beads X (directly) depends on.
  const depsOf = new Map();
  for (const b of beads) depsOf.set(b.id, new Set());
  for (const e of snapshot.edges || []) {
    if (depsOf.has(e.from)) depsOf.get(e.from).add(e.to);
  }

  return { byId, byPlanKey, depsOf, beads };
}

/** Transitive set of beads that `beadId` depends on (follows from->to to fixpoint). */
export function transitiveDeps(index, beadId) {
  const seen = new Set();
  const stack = [...(index.depsOf.get(beadId) || [])];
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of index.depsOf.get(cur) || []) if (!seen.has(next)) stack.push(next);
  }
  return seen;
}

/** Does ANY bead with planKey `fromPK` transitively depend on ANY bead with planKey `toPK`? */
export function planKeyDependsOn(index, fromPK, toPK) {
  const froms = index.byPlanKey.get(fromPK) || [];
  const tos = new Set(index.byPlanKey.get(toPK) || []);
  if (!froms.length || !tos.size) return false;
  for (const f of froms) {
    const deps = transitiveDeps(index, f);
    for (const t of tos) if (deps.has(t)) return true;
  }
  return false;
}

export const isEpic = (b) => b?.type === 'epic';
export const nonEpicBeads = (index) => index.beads.filter((b) => !isEpic(b));
