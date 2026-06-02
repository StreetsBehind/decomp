// Strategy: single-session LLM decompose (the "just ask the model" baseline) — and the BLIND arm
// (A0) of the archetype premise experiment: one model pass, no archetype priming.
//
// One agent, no subagents: hand the model the THIN plan + the snapshot JSON contract and ask for the
// FULL atomic decomposition in one pass (the prompt-contract opt-in openQuestions channel is on, so
// the model also surfaces gaps). Parse the reply defensively. Stochastic -> the runner repeats it K
// times. The injection mechanism lives in ./core.mjs; the primed/placebo arms reuse it with a block.

import { runSingleSession, MODEL, EFFORT } from './core.mjs';

/** @type {import('../adapter.mjs').Strategy} */
export default {
  name: 'single-session',
  deterministic: false,
  model: MODEL,
  effort: EFFORT,
  run(fixture, ctx) {
    return runSingleSession(fixture, ctx, { arm: 'blind', armBlock: '' });
  },
};
