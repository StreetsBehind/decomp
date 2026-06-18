// Mutation operators + the mutation engine (DESIGN §3).
//
// Every operator preserves genome validity (it only ever writes in-domain values), so the type system's
// guarantee — every genome is runnable — is never broken by mutation. Operators are deliberately
// SINGLE-CHANGE and neighbor-preferring so the search landscape is connected: any genome is reachable
// from any other by a chain of single mutations (load-bearing for K8 reachability).
//
// The ENGINE is GEPA-first: a reflective proposer (a frontier model) reads the candidate's quadrant-only
// digest (§2.3 — NEVER the per-cell vector) and names ONE operator to apply; a small typed-random budget
// runs alongside from P1 (the plateau detector is unreliable until the battery is frozen, finding B5).
// At P0/P1 the default proposer is typed-random (deterministic, no model) so the gates are reproducible;
// the reflective proposer is an injected interface, kept structurally blind to `cells`.

import { GENE_DOMAINS, cloneGenome, validateGenome } from './genome.mjs';

// pick a different in-domain value (cycles; never returns the same value if the domain has >1 entry)
function other(value, domain, rng) {
  const opts = domain.filter((v) => v !== value);
  return opts.length ? rng.pick(opts) : value;
}
// move ±1 within an ordered numeric domain (clamp at edges by reflecting)
function nudge(value, domain, rng) {
  const i = domain.indexOf(value);
  if (i === -1) return rng.pick(domain);
  let j = i + (rng.next() < 0.5 ? -1 : 1);
  if (j < 0) j = 1; if (j > domain.length - 1) j = domain.length - 2;
  if (j < 0) j = 0;
  return domain[j];
}

// ---- the operator set (each: (genome, rng) -> new genome) ------------------------------------------
export const OPERATORS = {
  skeletonModel(g, rng) { const c = cloneGenome(g); c.skeletonAuthor.model = other(c.skeletonAuthor.model, GENE_DOMAINS.skeletonAuthor.model, rng); return c; },
  skeletonShapes(g, rng) { const c = cloneGenome(g); c.skeletonAuthor.shapesIncluded = !c.skeletonAuthor.shapesIncluded; return c; },
  skeletonDepth(g, rng) { const c = cloneGenome(g); c.skeletonAuthor.obligationDepth = nudge(c.skeletonAuthor.obligationDepth, GENE_DOMAINS.skeletonAuthor.obligationDepth, rng); return c; },

  toggleChecker(g, rng) {
    // Enabling the per-surface checker enables the full DETERMINISTIC obligation suite (all classes +
    // one repair pass) — that is what "turn the checker on" means operationally; the finer checkerClasses
    // / checkerRepair operators then tune it. Disabling clears it to the canonical off form.
    const c = cloneGenome(g);
    if (c.checker.kind === 'off') { c.checker.kind = 'deterministic'; c.checker.obligationClasses = ['tenancy', 'authz', 'mass-assign']; c.checker.repairDepth = 1; }
    else { c.checker.kind = 'off'; c.checker.obligationClasses = []; c.checker.repairDepth = 0; }
    return c;
  },
  checkerKind(g, rng) { // deterministic <-> cheap-judge (only when on)
    const c = cloneGenome(g);
    if (c.checker.kind === 'off') { c.checker.kind = 'deterministic'; c.checker.obligationClasses = ['tenancy']; }
    else c.checker.kind = c.checker.kind === 'deterministic' ? 'cheap-judge' : 'deterministic';
    return c;
  },
  checkerClasses(g, rng) { // add/remove one obligation class (only meaningful when on)
    const c = cloneGenome(g);
    if (c.checker.kind === 'off') { c.checker.kind = 'deterministic'; c.checker.obligationClasses = []; }
    const all = GENE_DOMAINS.checker.obligationClasses;
    const have = new Set(c.checker.obligationClasses);
    const target = rng.pick(all);
    if (have.has(target)) have.delete(target); else have.add(target);
    c.checker.obligationClasses = all.filter((x) => have.has(x)); // canonical order
    return c;
  },
  checkerRepair(g, rng) { const c = cloneGenome(g); if (c.checker.kind === 'off') { c.checker.kind = 'deterministic'; c.checker.obligationClasses = ['tenancy']; } c.checker.repairDepth = nudge(c.checker.repairDepth, GENE_DOMAINS.checker.repairDepth, rng); return c; },

  // The P2 CROSS-surface integration-gate lever (wired at the P2b phase boundary; the node was admitted at
  // P2a but left unwired so the frozen P0/K8 trajectory stayed bit-identical). Enabling defaults to the
  // DETERMINISTIC variant + one repair pass — the variant P2a confirmed has teeth (cheap-judge was null).
  toggleIntegrationGate(g, rng) {
    const c = cloneGenome(g);
    const cur = (c.integrationGate && c.integrationGate.kind) || 'off';
    if (cur === 'off') c.integrationGate = { kind: 'deterministic', repairDepth: 1 };
    else c.integrationGate = { kind: 'off', repairDepth: 0 };
    return c;
  },
  integrationGateKind(g, rng) { // deterministic <-> cheap-judge (only when on)
    const c = cloneGenome(g);
    const cur = (c.integrationGate && c.integrationGate.kind) || 'off';
    if (cur === 'off') c.integrationGate = { kind: 'deterministic', repairDepth: 1 };
    else c.integrationGate = { kind: cur === 'deterministic' ? 'cheap-judge' : 'deterministic', repairDepth: c.integrationGate.repairDepth };
    return c;
  },
  integrationGateRepair(g, rng) {
    const c = cloneGenome(g);
    const cur = (c.integrationGate && c.integrationGate.kind) || 'off';
    if (cur === 'off') { c.integrationGate = { kind: 'deterministic', repairDepth: 1 }; return c; }
    c.integrationGate = { kind: cur, repairDepth: nudge(c.integrationGate.repairDepth, GENE_DOMAINS.integrationGate.repairDepth, rng) };
    if (c.integrationGate.repairDepth === 0) c.integrationGate.repairDepth = 1; // on-gate keeps ≥1 repair (off-form is repairDepth 0)
    return c;
  },

  builderK(g, rng) { const c = cloneGenome(g); c.builder.K = nudge(c.builder.K, GENE_DOMAINS.builder.K, rng); return c; },
  retryCount(g, rng) { const c = cloneGenome(g); c.retry.count = nudge(c.retry.count, GENE_DOMAINS.retry.count, rng); return c; },
  retryStrictness(g, rng) { const c = cloneGenome(g); c.retry.gateStrictness = other(c.retry.gateStrictness, GENE_DOMAINS.retry.gateStrictness, rng); return c; },

  decomposerModel(g, rng) { const c = cloneGenome(g); c.decomposer.model = other(c.decomposer.model, GENE_DOMAINS.decomposer.model, rng); return c; },
  decomposerLens(g, rng) {
    const c = cloneGenome(g);
    c.decomposer.lensEnsemble = !c.decomposer.lensEnsemble;
    c.decomposer.nLenses = c.decomposer.lensEnsemble ? Math.max(2, c.decomposer.nLenses) : 1;
    return c;
  },
  decomposerNLenses(g, rng) { const c = cloneGenome(g); c.decomposer.nLenses = nudge(c.decomposer.nLenses, GENE_DOMAINS.decomposer.nLenses, rng); c.decomposer.lensEnsemble = c.decomposer.nLenses > 1; return c; },

  integratorThreshold(g, rng) { const c = cloneGenome(g); c.integrator.recurrenceThreshold = other(c.integrator.recurrenceThreshold, GENE_DOMAINS.integrator.recurrenceThreshold, rng); return c; },
  amortization(g, rng) { const c = cloneGenome(g); c.amortizationM = nudge(c.amortizationM, GENE_DOMAINS.amortizationM, rng); return c; },
  // escalation is DISABLED at P1: the trigger operator is present but a no-op until P2 widens the domain.
  escalationTrigger(g, rng) { return cloneGenome(g); },
};

export const OPERATOR_NAMES = Object.keys(OPERATORS);

// typed-random: pick an operator that actually changes the genome (a few tries, then accept identity).
export function typedRandomMutate(g, rng) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const name = rng.pick(OPERATOR_NAMES);
    const child = OPERATORS[name](g, rng);
    const { ok } = validateGenome(child);
    if (ok && JSON.stringify(child) !== JSON.stringify(g)) return { child, op: name };
  }
  return { child: cloneGenome(g), op: 'identity' };
}

/**
 * Mutate one genome. The proposer (reflective engine) may name an operator from the quadrant-only digest;
 * if it declines / is absent, fall back to typed-random. The proposer is NEVER given `cells` (§2.3).
 * The proposer may be sync (heuristic stand-in) or async (live frontier model) — both are awaited, so the
 * sync gates (proposer=null → typed-random) remain bit-for-bit deterministic.
 * @param {object} g
 * @param {object} rng
 * @param {{proposer?: (digest:object, opNames:string[], rng:object)=>(string|null|Promise<string|null>), digest?:object, preferOp?:string|null}} [opts]
 */
export async function mutate(g, rng, { proposer = null, digest = null, preferOp = null } = {}) {
  // Credit-attribution bias (P2, OFF by default): the loop may pin the constructive operator for the gene the
  // previous generation's counterfactual reversion attributed the lethal failure to ("reflective mutation
  // restricted to the attributed gene", §3). Applied to a SUBSET of children so the typed-random exploration
  // budget still runs alongside. A no-op (already-good) bias falls through to the proposer/typed-random.
  if (preferOp && OPERATORS[preferOp]) {
    const child = OPERATORS[preferOp](g, rng);
    if (validateGenome(child).ok && JSON.stringify(child) !== JSON.stringify(g)) return { child, op: preferOp, source: 'credit' };
  }
  if (proposer) {
    const name = await proposer(digest, OPERATOR_NAMES, rng);
    if (name && OPERATORS[name]) {
      const child = OPERATORS[name](g, rng);
      if (validateGenome(child).ok) return { child, op: name, source: 'reflective' };
    }
  }
  const { child, op } = typedRandomMutate(g, rng);
  return { child, op, source: 'typed-random' };
}
