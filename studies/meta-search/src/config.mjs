// Frozen constants for the meta-search instrument.
//
// Every value here is PINNED by the pre-registration freeze (studies/meta-search/FREEZE.md, taken
// 2026-06-17). After P1 start, changing the weights vector, the per-cell veto definition, or the parity
// δ/α VOIDS the run (FREEZE §2). They live in one module so a single import is the single source of truth
// and a drift test (gates) can assert code === freeze record.
//
// NOTHING in this file may be edited once P1 has started. Pre-P1 amendments are logged in AMENDMENTS.md.

// ---- §6 fitness: the bucket weights vector (FROZEN) ------------------------------------------------
// crosscut + integration are the lethal quadrant (silent + expensive-recovery); happy is mostly
// test-caught (cheap); wire is self-revealing at build time (free to recover) → weight 0.
export const WEIGHTS = Object.freeze({ crosscut: 1.0, integration: 1.0, happy: 0.1, wire: 0.0 });

// The lethal buckets that the per-cell non-inferiority veto (§6/§4.4) ranges over.
export const LETHAL_BUCKETS = Object.freeze(['crosscut', 'integration']);
export const ALL_BUCKETS = Object.freeze(['wire', 'happy', 'crosscut', 'integration']);

// ---- §7 decision rule: parity non-inferiority test (FROZEN) ---------------------------------------
export const DELTA = 0.05; // parity non-inferiority margin (one-sided)
export const ALPHA = 0.05; // test level (one-sided)

// ---- kill conditions / gate thresholds (FROZEN) ---------------------------------------------------
export const K5_EVAL_CAP = 250;     // P1 eval-count cap (includes P2 reversion evals)
export const K6_KILL_FLOOR = 0.90;  // oracle self-test kill-rate floor on lethal buckets (the G2 gate)
export const K7_RHO_FLOOR = 0.80;   // surrogate–true Spearman ρ floor on lethal buckets (P2+)
export const K8_MAX_GEN = 8;        // instrument self-validation: generation budget (standalone)
export const K8_MAX_EVALS = 300;    // instrument self-validation: eval budget (standalone)

export const MAX_M = 12;            // amortization max-M (P2 quantity; M_distinct=1 at P1 → uncredited)
export const RESTORE_MARGIN_SE = 2; // credit-attribution restore-margin = 2× worst-of-K SE on the bucket

// ---- P1 frozen CORE: the anchor pair (FREEZE §1) --------------------------------------------------
// Both N=5, identical EXPECTS surface set; ONE seam-topology in two skeleton-provenance variants —
// NOT epic diversity. Never cited as external validity.
export const P1_ANCHOR_EPICS = Object.freeze(['workspace', 'scale-d1']);

// Content pins from FREEZE.md §1 (git tree object hashes). Recorded for the drift check.
export const CONTENT_PINS = Object.freeze({
  apparatus: '1580944116743dce55e42c2ffb77341c258d9e65',  // studies/build-gap/
  workspace: 'e568b06fc2dc7a84e36e87f3f8ca241ab2694b96',  // epics/workspace/
  'scale-d1': '4793d89d2992cb52d10bb61538903a9c6c842e20',  // epics/scale-d1/
});

// ---- §2.5 model-priced escalation ledger: pinned price table --------------------------------------
// Published per-token rates (USD per 1M tokens), recorded in the freeze so an opus escalation is never
// free and the all-opus-domination CI guard (§6) tests a GROUNDED table, not its own constants.
// fusion = the free jnoccio gateway pool → $0 marginal (Phase-1 upper-bound proxy, STATE.md substrate).
export const PRICE_TABLE = Object.freeze({
  // model        input $/Mtok   output $/Mtok
  'opus':    Object.freeze({ in: 15.0, out: 75.0 }),
  'sonnet':  Object.freeze({ in: 3.0, out: 15.0 }),
  'haiku':   Object.freeze({ in: 0.80, out: 4.0 }),
  'fusion':  Object.freeze({ in: 0.0, out: 0.0 }),   // free gateway pool
});

// Map a node's model gene to a canonical price-table key (the genome uses opus|sonnet|fusion).
export function priceKeyFor(model) {
  if (!model) return 'fusion';
  const m = String(model).toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku')) return 'haiku';
  return 'fusion';
}

// Frozen-value digest — gates assert FREEZE.md and this module agree.
export const FREEZE_DIGEST = Object.freeze({
  weights: WEIGHTS, delta: DELTA, alpha: ALPHA,
  K5_EVAL_CAP, K6_KILL_FLOOR, K7_RHO_FLOOR, K8_MAX_GEN, K8_MAX_EVALS, MAX_M, RESTORE_MARGIN_SE,
  vetoForm: 'per-cell-non-inferiority',
});
