// The strategy registry. The battery runner imports this and runs every entry
// against every fixture. Add a strategy by importing it and pushing it here.

import deterministic from './deterministic/index.mjs';
import flat from './flat/index.mjs';
import singleSession from './single-session/index.mjs';
import swarm from './swarm/index.mjs';
import expandAudit, { expandAuditNoAudit } from './expand-audit/index.mjs';
import { assertStrategy } from './adapter.mjs';

// The comparison set. The expand-audit ±structural-audit A/B is registered as TWO sweepable
// variants: expand-audit (audit on, default) and expand-audit-noaudit (audit off, the control).
/** @type {import('./adapter.mjs').Strategy[]} */
export const STRATEGIES = [
  deterministic,
  flat,
  singleSession,
  swarm,
  expandAudit,
  expandAuditNoAudit,
].map(assertStrategy);

export function strategyByName(name) {
  const s = STRATEGIES.find((x) => x.name === name);
  if (!s) throw new Error(`unknown strategy: ${name}`);
  return s;
}
