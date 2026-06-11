// Smoke-test the spawnCapture transport WITHOUT the real claude CLI (zero spend), by spawning
// `node` as a stand-in binary. Proves the stdin->stdout plumbing the argv->stdin fix depends on
// (FINDINGS §6.1): a large prompt is delivered via STDIN (never argv), stdout is captured, and a
// non-zero exit rejects. Not part of `npm run selftest` (that suite is pure / no process spawn);
// run manually:  node tools/transport-smoke.mjs
import assert from 'node:assert/strict';
import { spawnCapture } from '../runner/model-client.mjs';

let failed = 0;
const ok = (name) => console.log(`PASS  ${name}`);
const bad = (name, e) => { failed++; console.error(`FAIL  ${name}: ${e?.message || e}`); };

// 1) STDIN is delivered + stdout captured. A ~200 KB input — far past any argv limit — round-trips.
try {
  const big = 'x'.repeat(200_000);
  const r = await spawnCapture('node', ['-e', 'process.stdin.pipe(process.stdout)'], { input: big });
  assert.equal(r.stdout.length, big.length, 'stdin echoed to stdout intact');
  assert.equal(r.stdout, big, 'bytes match');
  ok('200 KB prompt delivered via stdin (would overflow argv)');
} catch (e) { bad('stdin delivery', e); }

// 2) A non-zero exit REJECTS with a descriptive error.
try {
  await spawnCapture('node', ['-e', 'process.exit(3)'], { input: 'unused' });
  bad('non-zero exit', new Error('expected a rejection, got resolve'));
} catch (e) {
  assert.match(e.message, /exited with code 3/, 'rejection names the exit code');
  ok('non-zero exit rejects with the code');
}

// 3) stderr is surfaced on failure.
try {
  await spawnCapture('node', ['-e', 'process.stderr.write("boom"); process.exit(1)'], { input: '' });
  bad('stderr surfaced', new Error('expected a rejection'));
} catch (e) {
  assert.match(e.message, /boom/, 'stderr tail is included in the error');
  ok('stderr surfaced on failure');
}

// 4) A failure-to-spawn (missing binary) rejects, does not throw synchronously.
try {
  await spawnCapture('definitely-not-a-real-binary-xyz', [], { input: '' });
  bad('missing binary', new Error('expected a rejection'));
} catch (e) {
  assert.match(e.message, /failed/i, 'missing binary rejects');
  ok('missing binary rejects (no sync throw)');
}

console.log(failed ? `\n${failed} smoke check(s) failed` : '\nall transport smoke checks passed');
process.exit(failed ? 1 : 0);
