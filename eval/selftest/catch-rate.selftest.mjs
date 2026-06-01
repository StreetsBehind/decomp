// Pins the omission catch-rate math against clean-control and planted-variant cases.
// Must pass before the scorer is trusted (CHARTER §6.4).

import assert from 'node:assert/strict';
import { scoreCatchRate } from '../catch-rate.mjs';

// The clean control oracle (mirrors fixtures/quicklist/planted-gaps.json).
const control = { fixture: 'quicklist', control: true, gaps: [] };

// A synthetic 3-gap variant oracle (stable fields only).
const variant = {
  fixture: 'quicklist-variant',
  control: false,
  gaps: [
    { id: 'G1', class: 'dropped-edge', expectedSignal: 'dropped-edge feat-add->feat-list', location: 'feat-add->feat-list' },
    { id: 'G2', class: 'missing-concern', expectedSignal: 'missing-concern validation', location: 'validation' },
    { id: 'G3', class: 'missing-requirement', expectedSignal: 'missing-requirement feat-export', location: 'feat-export' },
  ],
};

export function run() {
  // (a) clean control + no emissions -> recall null, FP 0
  const a = scoreCatchRate([], control);
  assert.equal(a.recall, null, 'clean control: recall is undefined -> null');
  assert.equal(a.falsePositives, 0, 'clean control + no emissions -> 0 FP');

  // (b) clean control + 2 spurious emissions -> FP 2 (any signal on a control is a FP)
  const b = scoreCatchRate(
    [
      { class: 'dropped-edge', location: 'x->y' },
      { class: 'oversized-session', location: 'feat-z' },
    ],
    control,
  );
  assert.equal(b.recall, null, 'control still reports null recall');
  assert.equal(b.falsePositives, 2, 'two spurious signals on a control -> FP 2');

  // (c) 3 planted; method emits 2 correct + 1 wrong-class -> recall 2/3, FP 1
  const c = scoreCatchRate(
    [
      { class: 'dropped-edge', location: 'feat-add->feat-list' },   // matches G1
      { class: 'missing-concern', location: 'validation' },          // matches G2
      { class: 'write-collision', location: 'feat-export' },         // wrong class -> matches nothing
    ],
    variant,
  );
  assert.equal(c.recall, 2 / 3, 'caught 2 of 3 planted gaps');
  assert.equal(c.falsePositives, 1, 'the wrong-class signal is a false positive');

  // (d) full recall: every planted gap caught, no false positives
  const d = scoreCatchRate(
    [
      { class: 'dropped-edge', location: 'feat-add->feat-list' },
      { class: 'missing-concern', location: 'validation' },
      { class: 'missing-requirement', location: 'feat-export' },
    ],
    variant,
  );
  assert.equal(d.recall, 1, 'full recall = 3/3');
  assert.equal(d.falsePositives, 0, 'no false positives on full, exact catch');

  // (e) location-agnostic match: planted location absent -> class match alone catches it
  const eVariant = {
    fixture: 'q-eloc', control: false,
    gaps: [{ id: 'G1', class: 'formula-gap', expectedSignal: 'formula-gap' }], // no location
  };
  const e = scoreCatchRate([{ class: 'formula-gap', location: 'anywhere' }], eVariant);
  assert.equal(e.recall, 1, 'planted location absent -> class match suffices');
  assert.equal(e.falsePositives, 0, 'matched gap is not a false positive');

  return { name: 'catch-rate', assertions: 12 };
}

export default run;
