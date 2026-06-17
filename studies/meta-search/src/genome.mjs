// The genome — what a candidate builder-system IS (DESIGN §2).
//
// A candidate is a TYPED AGENT GRAPH: a fixed set of nodes, each carrying genes drawn from a closed
// domain. The type system is what guarantees every genome is runnable — validateGenome() rejects any
// off-domain value, so mutation operators (operators.mjs) can never produce an un-runnable child.
//
// Hard constraints baked in (anti-gaming, §2):
//   - the judge is PINNED and is not a genome node at all (the search cannot game its own grader).
//   - the per-surface builder model is FIXED to the cheap pool ('fusion') — the thesis is cheap *coding*.
//   - the escalation node exists in the type system but is DISABLED at P1 (built at P2; §2/§9).
//   - the checker (the live lever) may never read the oracle — enforced structurally in the evaluator,
//     not encodable here, but its on/off + classes live here.
//
// Genes are deliberately small & enumerable so the search is interpretable and the K8 landscape is
// reachable by single mutations.

import crypto from 'node:crypto';

// ---- closed gene domains (operators draw ONLY from these) -----------------------------------------
export const GENE_DOMAINS = Object.freeze({
  skeletonAuthor: {
    model: ['fusion', 'sonnet', 'opus'],
    shapesIncluded: [false, true],
    obligationDepth: [0, 1, 2, 3],
  },
  decomposer: {
    model: ['fusion', 'sonnet', 'opus'],
    lensEnsemble: [false, true],
    nLenses: [1, 2, 3, 4],
  },
  builder: {
    model: ['fusion'],          // FIXED cheap — thesis constraint
    K: [1, 2, 3],
  },
  retry: {
    model: ['fusion'],
    count: [1, 2, 3, 4, 5],
    gateStrictness: ['structural', 'structural+obligation'],
  },
  checker: {                    // THE LIVE LEVER (P1) — per-surface obligation/seam check + repair
    kind: ['off', 'deterministic', 'cheap-judge'],
    obligationClasses: ['tenancy', 'authz', 'mass-assign'], // subset, order-insensitive
    repairDepth: [0, 1, 2],
  },
  integrationGate: {            // THE P2 LEVER — CROSS-surface seam consistency check + route-back repair.
    // Admitted at the P2 phase boundary via the clean-restart rule (R2-10): a new node in the §11 supply,
    // NOT a mid-P1 gene. Hash-safe by construction — canonical() strips it whenever it is off/absent, so
    // every P1/K8 genome (gate off) hashes byte-identically and the frozen P0 trajectory is unperturbed.
    // No mutation operator is wired for it at P2a (the probe constructs genomes directly); the operator is
    // added at P2b when the search turns on and K8 re-validates under the widened operator set.
    kind: ['off', 'deterministic', 'cheap-judge'],
    repairDepth: [0, 1, 2],
  },
  integrator: {
    model: ['fusion'],
    recurrenceThreshold: [1, 2],
  },
  escalation: {                 // present in the type system, DISABLED at P1 (§2/§9)
    enabled: [false],           // P1: only false is in-domain; P2 widens to true with target/trigger/cap
    target: ['sonnet', 'opus'],
    triggerBucket: ['crosscut', 'integration'],
    budgetCap: [0, 1, 2],
  },
  amortizationM: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // regime gene (P2 quantity; uncredited at P1)
});

// The judge node is pinned and non-searchable — recorded, never mutated.
export const PINNED_JUDGE = Object.freeze({ node: 'judge', model: 'sonnet|opus', searchable: false });

// ---- the canonical default genome (cheap-everything, checker off) ----------------------------------
// This is the "naive /build-batch" baseline candidate (cheap isolated, no skeleton lever, no checker).
export function defaultGenome() {
  return {
    skeletonAuthor: { model: 'fusion', shapesIncluded: false, obligationDepth: 0 },
    decomposer: { model: 'fusion', lensEnsemble: false, nLenses: 1 },
    builder: { model: 'fusion', K: 1 },
    retry: { model: 'fusion', count: 1, gateStrictness: 'structural' },
    checker: { kind: 'off', obligationClasses: [], repairDepth: 0 },
    integrator: { model: 'fusion', recurrenceThreshold: 1 },
    escalation: { enabled: false, target: 'sonnet', triggerBucket: 'crosscut', budgetCap: 0 },
    amortizationM: 1,
  };
}

export function cloneGenome(g) {
  return JSON.parse(JSON.stringify(g));
}

// ---- validation: every genome must be in-domain & runnable -----------------------------------------
const OBLIGATION_SET = new Set(GENE_DOMAINS.checker.obligationClasses);

export function validateGenome(g) {
  const errors = [];
  const must = (cond, msg) => { if (!cond) errors.push(msg); };
  const inDom = (val, dom, path) => { if (!dom.includes(val)) errors.push(`${path}=${JSON.stringify(val)} not in [${dom.join(',')}]`); };

  if (!g || typeof g !== 'object') return { ok: false, errors: ['genome is not an object'] };

  // skeletonAuthor
  must(g.skeletonAuthor, 'missing skeletonAuthor');
  if (g.skeletonAuthor) {
    inDom(g.skeletonAuthor.model, GENE_DOMAINS.skeletonAuthor.model, 'skeletonAuthor.model');
    inDom(g.skeletonAuthor.shapesIncluded, GENE_DOMAINS.skeletonAuthor.shapesIncluded, 'skeletonAuthor.shapesIncluded');
    inDom(g.skeletonAuthor.obligationDepth, GENE_DOMAINS.skeletonAuthor.obligationDepth, 'skeletonAuthor.obligationDepth');
  }
  // decomposer
  if (g.decomposer) {
    inDom(g.decomposer.model, GENE_DOMAINS.decomposer.model, 'decomposer.model');
    inDom(g.decomposer.lensEnsemble, GENE_DOMAINS.decomposer.lensEnsemble, 'decomposer.lensEnsemble');
    inDom(g.decomposer.nLenses, GENE_DOMAINS.decomposer.nLenses, 'decomposer.nLenses');
  } else errors.push('missing decomposer');
  // builder — model FIXED cheap
  if (g.builder) {
    inDom(g.builder.model, GENE_DOMAINS.builder.model, 'builder.model');
    must(g.builder.model === 'fusion', 'builder.model must be the cheap pool (fusion) — thesis constraint');
    inDom(g.builder.K, GENE_DOMAINS.builder.K, 'builder.K');
  } else errors.push('missing builder');
  // retry
  if (g.retry) {
    inDom(g.retry.model, GENE_DOMAINS.retry.model, 'retry.model');
    inDom(g.retry.count, GENE_DOMAINS.retry.count, 'retry.count');
    inDom(g.retry.gateStrictness, GENE_DOMAINS.retry.gateStrictness, 'retry.gateStrictness');
  } else errors.push('missing retry');
  // checker — the live lever
  if (g.checker) {
    inDom(g.checker.kind, GENE_DOMAINS.checker.kind, 'checker.kind');
    inDom(g.checker.repairDepth, GENE_DOMAINS.checker.repairDepth, 'checker.repairDepth');
    must(Array.isArray(g.checker.obligationClasses), 'checker.obligationClasses must be an array');
    if (Array.isArray(g.checker.obligationClasses)) {
      for (const c of g.checker.obligationClasses) must(OBLIGATION_SET.has(c), `checker.obligationClasses has unknown class ${JSON.stringify(c)}`);
      const uniq = new Set(g.checker.obligationClasses);
      must(uniq.size === g.checker.obligationClasses.length, 'checker.obligationClasses has duplicates');
    }
    // a checker that is OFF must carry no classes / no repair (canonical form, keeps hashing injective)
    if (g.checker.kind === 'off') {
      must((g.checker.obligationClasses || []).length === 0, 'checker.kind=off must have empty obligationClasses');
      must(g.checker.repairDepth === 0, 'checker.kind=off must have repairDepth 0');
    }
  } else errors.push('missing checker');
  // integrationGate — the P2 cross-surface lever. ABSENT is valid (treated as off; keeps every P1/K8
  // genome valid unchanged); PRESENT must be in-domain with the canonical off-form (off ⇒ repairDepth 0).
  if (g.integrationGate !== undefined) {
    inDom(g.integrationGate.kind, GENE_DOMAINS.integrationGate.kind, 'integrationGate.kind');
    inDom(g.integrationGate.repairDepth, GENE_DOMAINS.integrationGate.repairDepth, 'integrationGate.repairDepth');
    if (g.integrationGate.kind === 'off') must(g.integrationGate.repairDepth === 0, 'integrationGate.kind=off must have repairDepth 0');
  }
  // integrator
  if (g.integrator) {
    inDom(g.integrator.model, GENE_DOMAINS.integrator.model, 'integrator.model');
    inDom(g.integrator.recurrenceThreshold, GENE_DOMAINS.integrator.recurrenceThreshold, 'integrator.recurrenceThreshold');
  } else errors.push('missing integrator');
  // escalation — DISABLED at P1
  if (g.escalation) {
    must(g.escalation.enabled === false, 'escalation.enabled must be false at P1 (node built at P2)');
  } else errors.push('missing escalation');
  // amortization regime
  inDom(g.amortizationM, GENE_DOMAINS.amortizationM, 'amortizationM');

  return { ok: errors.length === 0, errors };
}

export function assertValid(g) {
  const { ok, errors } = validateGenome(g);
  if (!ok) throw new Error(`invalid genome: ${errors.join('; ')}`);
  return g;
}

// ---- canonical serialization + content hash --------------------------------------------------------
// Order-insensitive fields (checker.obligationClasses) are sorted so two genomes that differ only by
// class order hash identically (injective up to semantic equality).
function canonical(g) {
  const c = cloneGenome(g);
  if (c.checker && Array.isArray(c.checker.obligationClasses)) c.checker.obligationClasses = c.checker.obligationClasses.slice().sort();
  // HASH-SAFETY (R2-10): the P2 integrationGate node is stripped from the canonical form whenever it is
  // off or absent, so every P1/K8 genome (gate off) hashes EXACTLY as it did before the node existed — the
  // frozen P0 bit-identical trajectory is provably unperturbed. Only a gate-ON genome (a genuinely distinct
  // candidate) gets a distinct hash, which is correct.
  if (!c.integrationGate || (c.integrationGate.kind === 'off' && (c.integrationGate.repairDepth || 0) === 0)) delete c.integrationGate;
  return sortKeys(c);
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  }
  return v;
}

export function canonicalJson(g) { return JSON.stringify(canonical(g)); }

export function genomeHash(g) {
  return crypto.createHash('sha256').update(canonicalJson(g)).digest('hex').slice(0, 16);
}

// A short human label for logs/scorecards (does not need to be injective).
export function genomeLabel(g) {
  const sk = g.skeletonAuthor || {};
  const ck = g.checker || {};
  return `sk:${sk.model}${sk.shapesIncluded ? '+shapes' : ''}/d${sk.obligationDepth} ck:${ck.kind}${ck.repairDepth ? `+r${ck.repairDepth}` : ''} K${g.builder?.K} rt${g.retry?.count}`;
}
