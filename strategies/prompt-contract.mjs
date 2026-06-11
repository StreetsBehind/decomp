// Shared prompt building blocks for the GENERATIVE strategies. PURE string helpers — no
// model, no clock. Centralized so single-session / swarm / expand-audit describe the SAME
// snapshot JSON contract to the model (no drift between methods).

import { granularityClause } from './granularity.mjs';

/** The system prompt: force JSON-only output. */
export const JSON_ONLY_SYSTEM =
  'You are a senior tech lead decomposing a plan into atomic build packets. ' +
  'Output ONLY a single JSON object matching the contract. No prose, no markdown fences, no commentary.';

/**
 * The snapshot JSON contract, described for the model. Kept identical across methods.
 * @param {string[]} statedOutcomeIds  the STATED outcome ids the method may tag beads with
 * @param {{granularity?: string|null}} [opts]  granularity level (L0–L4) — appends the level's
 *   clause so every method describes the SAME dose the same way (RESEARCH-PROGRAM §4.2)
 * @returns {string}
 */
export function snapshotContract(statedOutcomeIds, opts = {}) {
  const ids = statedOutcomeIds.map((s) => `"${s}"`).join(', ');
  return [
    'Return a JSON object with this exact shape:',
    '{',
    '  "beads": [',
    '    {',
    '      "id": "<stable-kebab-id>",',
    '      "type": "task",',
    '      "title": "<short imperative title>",',
    '      "metadata": {',
    '        "provenance": { "outcomeIds": ["<one or more of the STATED outcome ids>"] },',
    '        "acceptanceCriteria": ["<1 to 6 concrete, checkable criteria>"],',
    '        "filesTouched": ["<at least one concrete repo-relative path>"],',
    '        "testPlanCases": ["<at least one test case>"]',
    '      }',
    '    }',
    '  ],',
    '  "edges": [ { "from": "<bead id>", "to": "<bead id this one depends on>" } ],',
    '  "ready": ["<bead ids with no unmet dependency>"]',
    '}',
    '',
    `The STATED outcome ids you MUST tag beads against (use only these): [${ids}].`,
    'Each non-epic bead MUST carry metadata.provenance.outcomeIds (>=1 stated id),',
    '1..6 acceptanceCriteria, >=1 filesTouched, and >=1 testPlanCases.',
    'edges[].from DEPENDS ON edges[].to (ordering / blocked-by).',
    'Decompose the FULL latent work — every requirement a real build of this plan needs,',
    'not only what the plan spells out.',
    ...(opts.granularity ? ['', granularityClause(opts.granularity)] : []),
  ].join('\n');
}

/** A compact textual rendering of the thin plan a method is handed. */
export function renderThinPlan(fixture) {
  const lock = fixture.lock || {};
  const outcomes = (lock.outcomes || []).map((o) => `  - ${o.id}: ${o.statement}`).join('\n');
  const notes = (lock.notes || []).map((n) => `  - ${n}`).join('\n');
  return [
    `APP: ${lock.app || fixture.name}`,
    `SUMMARY: ${lock.summary || ''}`,
    `STACK: ${JSON.stringify(lock.stack || {})}`,
    'STATED OUTCOMES:',
    outcomes || '  (none)',
    notes ? 'NOTES:' : '',
    notes,
    '',
    'PROSE PLAN:',
    fixture.planMd || '(none)',
  ].filter(Boolean).join('\n');
}

/** The stated outcome ids from a fixture lock. */
export function statedOutcomeIds(fixture) {
  return ((fixture.lock || {}).outcomes || []).map((o) => o.id).filter(Boolean);
}
