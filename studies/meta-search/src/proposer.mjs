// The REFLECTIVE proposer (DESIGN §3 "GEPA-first / reflective mutation"). A frontier model reads a
// candidate's QUADRANT-AND-COUNT digest (§2.3 — never per-cell/seam names) and names ONE operator to
// apply. This is the default engine from P1; a small typed-random budget runs alongside (operators.mjs
// mutate() falls back to typed-random when the proposer declines or names an invalid op).
//
// TWO HARD CONSTRAINTS, both enforced here:
//   - The proposer is shown ONLY the digest's fail COUNTS + quadrant (no cell names, no seam, no oracle).
//     A frontier model that saw "SEAM+@project failed" could reconstruct the broken seam (oracle leak); it
//     only ever sees {failCounts:{wire,happy,crosscut,integration}, lethalFailCount, quadrant}.
//   - Its frontier spend is amortized R&D (§6 "search-cost vs product-cost — strictly separate"): it is
//     RECORDED (makeReflectiveProposer tracks usd/tokens) but NEVER charged to a candidate's product cost.
//
// Two implementations:
//   - makeReflectiveProposer  — the live engine (an injected frontier invoker). ASYNC.
//   - makeHeuristicProposer   — a deterministic, model-free stand-in for the gates / dry-run (so the loop
//                                closes reproducibly without a model). It encodes the obvious gradient:
//                                lethal failures → strengthen the checker / inject the shape contract.

// One-line, ORACLE-BLIND semantics for each operator (describe the genome lever, never the oracle).
export const OP_SEMANTICS = {
  skeletonModel: 'change the model tier that authors the shared skeleton/contract',
  skeletonShapes: 'toggle whether the shared data-shape contract is injected into every isolated builder',
  skeletonDepth: 'deepen or shallow the obligation contract carried in the skeleton',
  toggleChecker: 'turn the per-surface obligation checker on or off',
  checkerKind: 'switch the checker between a static structural check and a cheap model judge',
  checkerClasses: 'add or remove one obligation class the checker enforces (tenancy / authz / mass-assign)',
  checkerRepair: 'increase or decrease how many repair passes the checker runs on a flagged surface',
  builderK: 'change how many candidate builds are sampled per surface',
  retryCount: 'change the structural-retry budget per surface',
  retryStrictness: 'change the retry gate strictness',
  decomposerModel: 'change the decomposition model tier',
  decomposerLens: 'toggle a multi-lens decomposition ensemble',
  decomposerNLenses: 'change the number of decomposition lenses',
  integratorThreshold: 'change the integrator union recurrence threshold',
  amortization: 'change the skeleton-reuse amortization regime (cost knob)',
  escalationTrigger: 'adjust the escalation trigger (disabled at P1)',
};

const PROPOSER_SYS = 'You are tuning the configuration of a multi-agent code-build pipeline. You see only aggregate failure COUNTS by category — never any test, file, or code detail. Pick the ONE configuration change most likely to reduce the high-cost (crosscut + integration) failures. Reply with ONLY the operator name, nothing else.';

function proposerPrompt(digest, opNames) {
  const fc = (digest && digest.failCounts) || {};
  const lines = [
    'Current candidate failure digest (counts only):',
    `  crosscut failures:    ${fc.crosscut ?? 0}   (high-cost: per-surface tenancy/authz/mass-assignment)`,
    `  integration failures: ${fc.integration ?? 0}   (high-cost: the cross-surface membership seam)`,
    `  happy failures:       ${fc.happy ?? 0}   (low-cost: stated per-surface behaviour)`,
    `  wire failures:        ${fc.wire ?? 0}   (free: module won't link)`,
    `  quadrant: ${digest && digest.quadrant}${digest && digest.harnessFail ? ' (harness failure present)' : ''}`,
    '',
    'Available single-change operators:',
    ...opNames.map((n) => `  - ${n}: ${OP_SEMANTICS[n] || ''}`),
    '',
    'Name the ONE operator most likely to reduce the crosscut + integration failures. Reply with only the operator name.',
  ];
  return lines.join('\n');
}

function pickOpFromText(text, opNames) {
  if (!text) return null;
  const t = text.trim();
  // exact line/word match first
  const exact = opNames.find((n) => new RegExp(`(^|[^A-Za-z])${n}([^A-Za-z]|$)`).test(t));
  if (exact) return exact;
  const lc = t.toLowerCase();
  return opNames.find((n) => lc.includes(n.toLowerCase())) || null;
}

/**
 * Live reflective proposer over a frontier invoker. Returns an ASYNC (digest, opNames, rng) => opName|null.
 * Tracks its own R&D spend on `.spend` (usd, tokens, calls) — NEVER added to a candidate's product cost.
 * @param {{invoke:Function, model?:string}} p
 */
export function makeReflectiveProposer({ invoke, model = 'claude-sonnet-4-6' } = {}) {
  const spend = { usd: 0, outputTokens: 0, calls: 0, declined: 0 };
  const propose = async (digest, opNames /*, rng */) => {
    spend.calls++;
    let g;
    try { g = await invoke({ prompt: proposerPrompt(digest, opNames), system: PROPOSER_SYS, model }); }
    catch { spend.declined++; return null; }
    spend.usd += g && Number.isFinite(g.usd) ? g.usd : 0;
    spend.outputTokens += g && Number.isFinite(g.outputTokens) ? g.outputTokens : 0;
    const op = pickOpFromText(g && g.text, opNames);
    if (!op) spend.declined++;
    return op;
  };
  propose.spend = spend;
  return propose;
}

/**
 * Deterministic, model-free heuristic proposer for the gates / dry-run. Encodes the obvious gradient so the
 * loop closes reproducibly: lethal failures → strengthen the checker / inject the shape contract; otherwise
 * explore. Returns a SYNC (digest, opNames, rng) => opName.
 */
export function makeHeuristicProposer() {
  const LETHAL_FIRST = ['toggleChecker', 'checkerClasses', 'checkerRepair', 'skeletonShapes', 'skeletonDepth'];
  const EXPLORE = ['builderK', 'retryCount', 'decomposerLens', 'checkerKind', 'retryStrictness'];
  return (digest, opNames, rng) => {
    const lethal = digest && digest.lethalFailCount > 0;
    const pool = (lethal ? LETHAL_FIRST : EXPLORE).filter((n) => opNames.includes(n));
    if (pool.length) return pool[Math.floor((rng ? rng.next() : 0) * pool.length)];
    return opNames[Math.floor((rng ? rng.next() : 0) * opNames.length)];
  };
}
