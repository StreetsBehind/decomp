// Strategy: single-session-PLACEBO — the A1 control of the archetype premise experiment.
//
// Identical to the blind arm EXCEPT it injects a control block that holds CONCRETENESS + LENGTH
// constant so a measured primed-vs-placebo delta is attributable to the archetype's CONTENT-FIT, not
// to "a concrete checklist focuses the model" or to a longer prompt. When the arm spec sets
// `placeboArchetypes`, the block is a MISMATCHED archetype (a real archetype for a DIFFERENT feature)
// rendered in the IDENTICAL structure as the primed block — the strongest control (review §8).
// Skipped on fixtures with no arm spec (same gating as the primed arm).

import { runSingleSession, MODEL, EFFORT } from '../single-session/core.mjs';
import { loadArmSpec, loadArchetypeDb, resolveArchetypes, renderPlaceboBlock } from '../arm-block.mjs';
import { assertC1 } from '../../eval/c1-lint.mjs';

/** @type {import('../adapter.mjs').Strategy} */
export default {
  name: 'single-session-placebo',
  deterministic: false,
  model: MODEL,
  effort: EFFORT,
  run(fixture, ctx) {
    const spec = loadArmSpec(fixture.name); // throws NoArmSpecError -> runner skips (paired with primed)
    let db;
    if (Array.isArray(spec.placeboArchetypes) && spec.placeboArchetypes.length) {
      db = loadArchetypeDb();
      assertC1(resolveArchetypes({ ...spec, archetypes: spec.placeboArchetypes }, db)); // same C1 bar as primed
    }
    const armBlock = renderPlaceboBlock(spec, db);
    return runSingleSession(fixture, ctx, { arm: 'placebo', armBlock });
  },
};
