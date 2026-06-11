// The strategy registry. The battery runner imports this and runs every entry
// against every fixture. Add a strategy by importing it and pushing it here.

import deterministic from './deterministic/index.mjs';
import flat from './flat/index.mjs';
import singleSession from './single-session/index.mjs';
import singleSessionPrimed from './single-session-primed/index.mjs';
import singleSessionPlacebo from './single-session-placebo/index.mjs';
import swarm from './swarm/index.mjs';
import expandAudit, { expandAuditNoAudit, expandAuditGen } from './expand-audit/index.mjs';
import { assertStrategy } from './adapter.mjs';

// The comparison set. The expand-audit FEEDBACK-SIGNAL A/B/C (FINDINGS §6.2, de-confounded:
// equal expand budgets, only the feedback differs) is registered as THREE sweepable variants:
// expand-audit (structural), expand-audit-gen (generative), expand-audit-noaudit (the control).
// The archetype premise experiment's THREE arms are registered as three single-session variants:
// single-session (A0 blind), single-session-placebo (A1), single-session-primed (A2). The primed/
// placebo arms self-skip on fixtures with no arm spec (experiments/arm-blocks/<fixture>.json).
/** @type {import('./adapter.mjs').Strategy[]} */
export const STRATEGIES = [
  deterministic,
  flat,
  singleSession,
  singleSessionPlacebo,
  singleSessionPrimed,
  swarm,
  expandAudit,
  expandAuditGen,
  expandAuditNoAudit,
].map(assertStrategy);

export function strategyByName(name) {
  const s = STRATEGIES.find((x) => x.name === name);
  if (!s) throw new Error(`unknown strategy: ${name}`);
  return s;
}
