// Shared single-session core. The three experiment arms (A0 blind / A1 placebo / A2 archetype-primed)
// are the SAME single model pass; the ONLY thing that varies is `armBlock`, injected between the plan
// and the output contract. So A0/A1/A2 prompts are BYTE-IDENTICAL except for that one inserted block —
// which is what lets a measured delta be attributed to the block, not to incidental prompt differences.

import { parseReply } from '../parse-snapshot.mjs';
import {
  JSON_ONLY_SYSTEM,
  snapshotContract,
  renderThinPlan,
  statedOutcomeIds,
} from '../prompt-contract.mjs';

export const MODEL = 'claude-sonnet-4-6';
export const EFFORT = 'medium';

/**
 * @param {object} fixture  { name, lock, planMd, dir }
 * @param {object} ctx      { signal, invoke, model }
 * @param {{ arm?: string, armBlock?: string }} [armOpts]
 *        arm      — label for the run ('blind' | 'placebo' | 'primed')
 *        armBlock — the text injected between the plan and the contract ('' for blind)
 * @returns {Promise<{snapshot, gaps, cost}>}
 */
export async function runSingleSession(fixture, ctx, { arm = 'blind', armBlock = '' } = {}) {
  if (!ctx || typeof ctx.invoke !== 'function') {
    throw new Error(`single-session(${arm}): ctx.invoke is required`);
  }
  const start = process.hrtime.bigint();
  const model = ctx.model ?? MODEL;
  const outcomeIds = statedOutcomeIds(fixture);

  const block = typeof armBlock === 'string' ? armBlock.trim() : '';
  const prompt = [
    'Decompose the following THIN plan into the FULL set of atomic build packets in ONE pass.',
    '',
    renderThinPlan(fixture),
    block ? `\n${block}\n` : '', // the ONLY thing that differs across arms
    '',
    snapshotContract(outcomeIds, { openQuestions: true }),
  ].join('\n');

  const res = await ctx.invoke({
    prompt,
    system: JSON_ONLY_SYSTEM,
    model,
    maxTurns: 1,
    role: 'single-session', // mock routing: all arms reuse the single-session canned response
    fixtureName: fixture.name,
    signal: ctx.signal,
  });

  const { snapshot, gaps } = parseReply(res.text);
  const wallClockSec = Number(process.hrtime.bigint() - start) / 1e9;
  return {
    snapshot,
    gaps,
    cost: {
      outputTokens: Number.isFinite(res.outputTokens) ? res.outputTokens : 0,
      agents: 1,
      wallClockSec,
      usd: res.usd ?? null,
      model,
      effort: EFFORT,
    },
  };
}

export default runSingleSession;
