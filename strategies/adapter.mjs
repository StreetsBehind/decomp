// Adapter contract + runtime validation for decomposition strategies.
// The contract itself is documented in ./README.md; this module enforces it.

/**
 * @typedef {Object} Strategy
 * @property {string} name
 * @property {boolean} deterministic
 * @property {string|null} [model]
 * @property {string|null} [effort]
 * @property {(fixture: object, ctx: object) => Promise<{snapshot: object, cost: object}>} run
 */

const COST_KEYS = ['outputTokens', 'agents', 'wallClockSec'];

/** Throw unless `s` is a well-formed strategy module export. */
export function assertStrategy(s) {
  if (!s || typeof s !== 'object') throw new Error('strategy: not an object');
  if (typeof s.name !== 'string' || !s.name) throw new Error('strategy: missing name');
  if (typeof s.deterministic !== 'boolean') throw new Error(`strategy ${s.name}: deterministic must be boolean`);
  if (typeof s.run !== 'function') throw new Error(`strategy ${s.name}: run() must be a function`);
  return s;
}

/** Shallow shape-check a strategy's return value (full JSON-Schema validation lives in the runner). */
export function assertRunResult(name, result) {
  if (!result || typeof result !== 'object') throw new Error(`strategy ${name}: run() returned non-object`);
  const { snapshot, cost } = result;
  if (!snapshot || !Array.isArray(snapshot.beads) || !Array.isArray(snapshot.edges)) {
    throw new Error(`strategy ${name}: snapshot must have beads[] and edges[]`);
  }
  for (const k of COST_KEYS) {
    if (typeof cost?.[k] !== 'number') throw new Error(`strategy ${name}: cost.${k} must be a number`);
  }
  // gaps is OPTIONAL (the open-question channel). When present it must be an array; the runner
  // routes it to scoreCatchRate. A strategy that does not surface open questions simply omits it.
  if (result.gaps !== undefined && !Array.isArray(result.gaps)) {
    throw new Error(`strategy ${name}: result.gaps, when present, must be an array`);
  }
  return result;
}

/** Repeats the runner should perform for a strategy. Deterministic -> 1; stochastic -> minRepeats. */
export function repeatsFor(strategy, minRepeats) {
  return strategy.deterministic ? 1 : Math.max(2, minRepeats | 0);
}
