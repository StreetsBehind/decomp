// Strategy: single-session LLM decompose (the "just ask the model" baseline).
//
// One agent, no subagents: hand the model the THIN plan + the snapshot JSON contract and
// ask for the FULL atomic decomposition in one pass. Parse the reply defensively into a
// snapshot. Stochastic -> the runner repeats it K times for reliability/variance.
//
// Cost: agents = 1 (one ctx.invoke call); outputTokens / usd summed from invoke results;
// wallClockSec measured around the run with process.hrtime.

import { parseSnapshot } from '../parse-snapshot.mjs';
import {
  JSON_ONLY_SYSTEM,
  snapshotContract,
  renderThinPlan,
  statedOutcomeIds,
} from '../prompt-contract.mjs';

const MODEL = 'claude-sonnet-4-6';
const EFFORT = 'medium';

/** @type {import('../adapter.mjs').Strategy} */
export default {
  name: 'single-session',
  deterministic: false,
  model: MODEL,
  effort: EFFORT,

  async run(fixture, ctx) {
    if (!ctx || typeof ctx.invoke !== 'function') {
      throw new Error('single-session.run: ctx.invoke is required');
    }
    const start = process.hrtime.bigint();
    // MODEL KNOB: sweep value from ctx.model, else the pinned default. Passed to ctx.invoke
    // and recorded on the cost record. The judge's model is held fixed elsewhere (never ctx.model).
    const model = ctx.model ?? MODEL;
    const outcomeIds = statedOutcomeIds(fixture);

    const prompt = [
      'Decompose the following THIN plan into the FULL set of atomic build packets in ONE pass.',
      '',
      renderThinPlan(fixture),
      '',
      snapshotContract(outcomeIds),
    ].join('\n');

    const res = await ctx.invoke({
      prompt,
      system: JSON_ONLY_SYSTEM,
      model,
      maxTurns: 1,
      role: 'single-session',
      fixtureName: fixture.name,
      signal: ctx.signal,
    });

    const snapshot = parseSnapshot(res.text);

    const wallClockSec = Number(process.hrtime.bigint() - start) / 1e9;
    return {
      snapshot,
      cost: {
        outputTokens: Number.isFinite(res.outputTokens) ? res.outputTokens : 0,
        agents: 1,
        wallClockSec,
        usd: res.usd ?? null,
        model,
        effort: EFFORT,
      },
    };
  },
};
