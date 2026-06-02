// Strategy: single-session-PLACEBO — the A1 control of the archetype premise experiment.
//
// Identical to the blind arm EXCEPT it injects a content-FREE, plan-agnostic block of generic
// decomposition advice. Its only job is to hold "more context / a longer prompt" constant, so a
// measured primed-vs-placebo delta is attributable to the archetypes' TYPED CONTENT, not to the mere
// presence of an extra block. Skipped on fixtures with no arm spec (same gating as the primed arm).

import { runSingleSession, MODEL, EFFORT } from '../single-session/core.mjs';
import { loadArmSpec, renderPlaceboBlock } from '../arm-block.mjs';

/** @type {import('../adapter.mjs').Strategy} */
export default {
  name: 'single-session-placebo',
  deterministic: false,
  model: MODEL,
  effort: EFFORT,
  run(fixture, ctx) {
    const spec = loadArmSpec(fixture.name); // throws NoArmSpecError -> runner skips (paired with primed)
    const armBlock = renderPlaceboBlock(spec);
    return runSingleSession(fixture, ctx, { arm: 'placebo', armBlock });
  },
};
