// Pins the OPEN-QUESTION CHANNEL end-to-end: a model reply -> parseReply -> gaps -> scoreCatchRate.
//
// Before this channel existed, single-session returned only { snapshot, cost }; parse-snapshot
// dropped everything that wasn't beads/edges/ready, and the runner scored `result.gaps || []` —
// always empty. So omission catch-rate / open-question yield read 0 for every arm (the high-severity
// gap the premise-experiment review flagged). This proves a surfaced open question now reaches the
// scorer and is counted, and that the bead-graph path is unchanged (back-compat).

import assert from 'node:assert/strict';
import { parseReply, parseSnapshot, coerceGaps } from '../../strategies/parse-snapshot.mjs';
import { scoreCatchRate } from '../catch-rate.mjs';

// A realistic messy reply: prose wrapper + a ```json fence + an openQuestions channel with a
// class-less item (must default), a `question` alias (must map to note), and a duplicate (deduped).
const reply = [
  'Sure — here is the decomposition:',
  '```json',
  '{',
  '  "beads": [ { "id": "feat-add", "type": "task", "title": "add item", "metadata": {',
  '    "provenance": { "outcomeIds": ["O1"] }, "acceptanceCriteria": ["ac"],',
  '    "filesTouched": ["src/add.ts"], "testPlanCases": ["t"] } } ],',
  '  "edges": [],',
  '  "ready": ["feat-add"],',
  '  "openQuestions": [',
  '    { "class": "missing-concern", "location": "validation", "note": "no input validation is specified" },',
  '    { "class": "missing-requirement", "location": "feat-export", "question": "is data export in scope?" },',
  '    { "location": "rate-limit" },',
  '    { "class": "missing-concern", "location": "validation", "note": "no input validation is specified" }',
  '  ]',
  '}',
  '```',
  'Hope that helps!',
].join('\n');

export function run() {
  const { snapshot, gaps } = parseReply(reply);

  // ---- snapshot path is intact ----
  assert.equal(snapshot.beads.length, 1, 'bead graph parsed alongside the gaps');
  assert.equal(snapshot.ready[0], 'feat-add');

  // ---- the open-question channel ----
  assert.equal(gaps.length, 3, 'three distinct gaps (the exact duplicate is deduped away)');
  assert.equal(gaps[0].class, 'missing-concern');
  assert.equal(gaps[0].location, 'validation');
  assert.equal(gaps[0].note, 'no input validation is specified');
  assert.equal(gaps[1].note, 'is data export in scope?', '`question` is accepted as a note alias');
  assert.equal(gaps[2].class, 'open-question', 'a class-less item defaults to open-question');
  assert.equal(gaps[2].location, 'rate-limit');

  // ---- end-to-end: surfaced questions are COUNTED by the catch-rate scorer ----
  const variant = {
    fixture: 'v', control: false,
    gaps: [
      { id: 'G1', class: 'missing-concern', expectedSignal: 'x', location: 'validation' },     // matched
      { id: 'G2', class: 'missing-requirement', expectedSignal: 'x', location: 'feat-export' }, // matched
      { id: 'G3', class: 'dropped-edge', expectedSignal: 'x', location: 'a->b' },               // not surfaced
    ],
  };
  const cr = scoreCatchRate(gaps, variant);
  assert.equal(cr.recall, 2 / 3, 'two of three planted gaps caught via the channel');
  assert.equal(cr.falsePositives, 1, 'the open-question@rate-limit matches no planted gap -> 1 FP');

  // on a clean CONTROL, every surfaced question is a false positive (recall undefined)
  const onControl = scoreCatchRate(gaps, { fixture: 'c', control: true, gaps: [] });
  assert.equal(onControl.recall, null, 'control -> recall null');
  assert.equal(onControl.falsePositives, 3, 'all three surfaced questions are FPs on a clean control');

  // ---- back-compat + coercion edges ----
  const snapOnly = parseSnapshot(reply);
  assert.ok(Array.isArray(snapOnly.beads) && !('gaps' in snapOnly), 'parseSnapshot is unchanged (no gaps field on the snapshot)');

  // a reply with NO openQuestions -> empty channel (not undefined)
  const noOQ = parseReply('{ "beads": [], "edges": [], "ready": [] }');
  assert.deepEqual(noOQ.gaps, [], 'absent openQuestions -> []');

  // coerceGaps guards: null/empty -> []; `gaps` alias accepted; junk entries dropped
  assert.deepEqual(coerceGaps(null), [], 'coerceGaps(null) -> []');
  assert.deepEqual(coerceGaps({}), [], 'coerceGaps with no channel -> []');
  assert.deepEqual(coerceGaps({ gaps: [{ class: 'embedded-decision' }] }), [{ class: 'embedded-decision' }], '`gaps` is an accepted alias for openQuestions');
  assert.deepEqual(coerceGaps({ openQuestions: ['not-an-object', 42, null] }), [], 'non-object entries are dropped');

  return { name: 'open-question-channel', assertions: 17 };
}

export default run;
