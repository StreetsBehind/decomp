// Pins the A8 budgeted-retry control flow (runner/battery.mjs attemptRun) — the delicate new logic
// that lets the gateway transport re-route past a flaky/truncating free model and, on exhaustion,
// score 0 instead of silently dropping the run. Deterministic fake strategies; zero spend.

import assert from 'node:assert/strict';
import { attemptRun, emptySnapshot } from '../../runner/battery.mjs';

const okSnapshot = { beads: [{ id: 'epic-0', type: 'epic', title: 'x' }, { id: 't1', type: 'task', title: 't1' }], edges: [], ready: [] };
const emptyish = { beads: [{ id: 'epic-0', type: 'epic', title: 'x' }], edges: [], ready: [] }; // 0 task beads
const okResult = { snapshot: okSnapshot, gaps: [], cost: { outputTokens: 1, agents: 1, wallClockSec: 0 } };
const emptyResult = { snapshot: emptyish, gaps: [], cost: { outputTokens: 1, agents: 1, wallClockSec: 0 } };

// A strategy whose nth run() outcome is scripted (a value to return, or 'throw'/'empty').
function scriptedStrategy(script) {
  let i = 0;
  return {
    name: 'scripted',
    run: async () => {
      const step = script[Math.min(i, script.length - 1)];
      i++;
      if (step === 'throw') throw new Error('transport boom');
      if (step === 'empty') return emptyResult;
      return okResult;
    },
  };
}

export async function run() {
  const ctx = { signal: undefined, invoke: async () => ({ text: '' }), model: null };

  // 1) first attempt valid → used on attempt 1, no retry.
  let r = await attemptRun({ strategy: scriptedStrategy(['ok']), fixtureArg: {}, ctx, attempts: 3 });
  assert.ok(r.result, 'valid first attempt returns a result');
  assert.equal(r.attemptsUsed, 1, 'no retry when the first attempt is valid');
  assert.equal(r.lastErr, null);

  // 2) throw, throw, ok → recovers on attempt 3; onRetry fires for the two failures.
  const retried = [];
  r = await attemptRun({ strategy: scriptedStrategy(['throw', 'throw', 'ok']), fixtureArg: {}, ctx, attempts: 3, onRetry: (a) => retried.push(a) });
  assert.ok(r.result, 'recovers after two throwing attempts');
  assert.equal(r.attemptsUsed, 3, 'used all three attempts to recover');
  assert.deepEqual(retried, [1, 2], 'onRetry fired after attempt 1 and attempt 2 (not after the last)');

  // 3) EMPTY (0 task-bead) snapshot is rejected like a throw → retry; empty, empty, ok recovers.
  r = await attemptRun({ strategy: scriptedStrategy(['empty', 'empty', 'ok']), fixtureArg: {}, ctx, attempts: 3 });
  assert.ok(r.result, 'an empty (0 task-bead) decomposition triggers a retry that then recovers');
  assert.equal(r.result.snapshot.beads.length, 2, 'the recovered result is the non-empty one');

  // 4) always empty → exhausted (result null, lastErr names the empty failure).
  r = await attemptRun({ strategy: scriptedStrategy(['empty']), fixtureArg: {}, ctx, attempts: 3 });
  assert.equal(r.result, null, 'persistently empty → exhausted (no result)');
  assert.equal(r.attemptsUsed, 3, 'exhausted all attempts');
  assert.match(r.lastErr.message, /empty decomposition/, 'lastErr identifies the empty-snapshot failure');

  // 5) attempts=1 (claude/mock path): a throw exhausts immediately, no retry.
  r = await attemptRun({ strategy: scriptedStrategy(['throw']), fixtureArg: {}, ctx, attempts: 1 });
  assert.equal(r.result, null, 'attempts=1 → a throw exhausts with no result');
  assert.equal(r.attemptsUsed, 1, 'no extra attempts when attempts=1');

  // 6) the score-0 snapshot is well-formed (epic-only, no edges).
  const e = emptySnapshot('hearth');
  assert.equal(e.beads.length, 1, 'score-0 snapshot is epic-only');
  assert.equal(e.beads[0].type, 'epic');
  assert.equal(e.edges.length, 0);
  assert.ok(Array.isArray(e.ready));

  return { name: 'battery-retry', assertions: 16 };
}

export default run;
