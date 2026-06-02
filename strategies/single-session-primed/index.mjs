// Strategy: single-session-PRIMED — the A2 arm of the archetype premise experiment.
//
// Identical to the blind single-session arm EXCEPT it injects the archetype block built from the
// library archetypes this fixture's features classify to (ARCHETYPE-PREMISE-EXPERIMENT.md §2). The
// block is rendered from the pinned per-fixture arm spec + the authored archetype entries, and is
// C1-LINTED before injection — if any entry would smuggle an edge, the run ABORTS (the runner records
// it skipped) rather than priming with a forbidden canonical-edges block.
//
// A fixture with no arm spec is skipped (NoArmSpecError) — correct: priming only applies where we
// have a classification.

import { runSingleSession, MODEL, EFFORT } from '../single-session/core.mjs';
import { loadArmSpec, loadArchetypeDb, resolveArchetypes, renderPrimedBlock } from '../arm-block.mjs';
import { assertC1 } from '../../eval/c1-lint.mjs';

/** @type {import('../adapter.mjs').Strategy} */
export default {
  name: 'single-session-primed',
  deterministic: false,
  model: MODEL,
  effort: EFFORT,
  run(fixture, ctx) {
    const spec = loadArmSpec(fixture.name);          // throws NoArmSpecError -> runner skips this (variant, fixture)
    const entries = resolveArchetypes(spec, loadArchetypeDb());
    assertC1(entries);                                // ABORT before injecting a block that smuggles an edge
    const armBlock = renderPrimedBlock(entries);
    return runSingleSession(fixture, ctx, { arm: 'primed', armBlock });
  },
};
