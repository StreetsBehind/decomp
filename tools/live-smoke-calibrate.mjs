// LIVE smoke + judge calibration (spends a small amount of money — ~31 CLI calls).
// Goal 1 (wiring): does single-session produce a parseable snapshot from the REAL claude CLI?
// Goal 2 (calibrate): do the live judge's two-part (presence/sufficiency) verdicts match the
//                     hand-authored manifest ground truth on a THIN fixture?
//
// One pass: 1 method invoke (single-session) + one judge call per latent item, verdicts logged.
// Run:  node tools/live-smoke-calibrate.mjs [model=claude-haiku-4-5]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claudeInvoke } from '../runner/model-client.mjs';
import singleSession from '../strategies/single-session/index.mjs';
import { scoreGenerativeCoverage } from '../eval/generative-coverage.mjs';
import { scoreOutcomeCoverage } from '../eval/outcome-coverage.mjs';
import { makeClaudeJudge } from '../runner/judge.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FX = path.join(ROOT, 'fixtures', 'sso-greenfield');
const MODEL = process.argv[2] || 'claude-haiku-4-5'; // method + judge model for the cheap smoke

const lock = JSON.parse(fs.readFileSync(path.join(FX, 'plan.lock.json'), 'utf8'));
const planMd = fs.readFileSync(path.join(FX, 'plan.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(FX, 'outcome-manifest.json'), 'utf8'));
const ws = path.join(ROOT, 'runs', '_verify', 'smoke-ws');
fs.rmSync(ws, { recursive: true, force: true });
fs.mkdirSync(ws, { recursive: true });

console.log(`LIVE smoke — model=${MODEL}, fixture=sso-greenfield (thin)\n`);

// --- 1. method invoke (single-session) -------------------------------------
let result;
try {
  result = await singleSession.run({ name: 'sso-greenfield', lock, planMd, dir: ws }, { invoke: claudeInvoke, model: MODEL, signal: undefined });
} catch (e) {
  console.error('METHOD FAILED:', e.message);
  process.exit(1);
}
const snap = result.snapshot;
const nonEpic = (snap.beads || []).filter((b) => b.type !== 'epic');
console.log(`SNAPSHOT: ${snap.beads.length} beads (${nonEpic.length} non-epic), ${snap.edges.length} edges, ready=${snap.ready.length}`);
console.log(`COST: outputTokens=${result.cost.outputTokens} usd=${result.cost.usd} agents=${result.cost.agents} wallClock=${result.cost.wallClockSec}s`);
if (nonEpic.length === 0) { console.error('\nWIRING FAIL: no non-epic beads parsed from live output.'); process.exit(1); }
console.log('\nBEADS:');
for (const b of nonEpic) console.log(`  - ${b.id}: ${b.title}  [outcomeIds: ${(b.metadata?.provenance?.outcomeIds || []).join(',')}]`);

// --- 2. judge calibration (log every two-part verdict) ---------------------
const baseJudge = makeClaudeJudge(claudeInvoke, { model: MODEL });
let n = 0;
let gap = 0; // items present-but-NOT-sufficient (the calibration case the two-part judge should surface)
const loggingJudge = async (q) => {
  const v = await baseJudge(q);
  const label = q.kind === 'requirement' ? (q.target.planKey || q.target.id) : `${q.target.fromPlanKey}->${q.target.toPlanKey}`;
  const flag = (v.presence && !v.sufficiency) ? '  <-- present-but-thin' : '';
  if (v.presence && !v.sufficiency) gap++;
  console.log(`  [${q.kind}] ${label.padEnd(34)} present=${String(v.presence).padEnd(5)} suff=${String(v.sufficiency).padEnd(5)} ${v.evidence}${flag}`);
  n++;
  return v;
};
console.log(`\nJUDGE VERDICTS (${(manifest.requirements || []).length} reqs + ${(manifest.requiredEdges || []).length} edges):`);
const gen = await scoreGenerativeCoverage(snap, manifest, loggingJudge);
const oc = scoreOutcomeCoverage(snap, manifest);

console.log(`\n--- SCORES (sufficiency = the honest keystone bar; presence = scope-exists) ---`);
console.log(`outcomeCoverage (mechanical):      ${oc.score}`);
console.log(`requirement  presence=${gen.presence.requirementCoverage.score.toFixed(3)}  sufficiency=${gen.requirementCoverage.score.toFixed(3)}`);
console.log(`edge         presence=${gen.presence.edgeCoverage.score.toFixed(3)}  sufficiency=${gen.edgeCoverage.score.toFixed(3)}`);
console.log(`OVERALL      presence=${gen.presence.overall.toFixed(3)}  sufficiency=${gen.overall.toFixed(3)}`);
console.log(`\njudge calls: ${n} + 1 method invoke. present-but-thin items (presence>sufficiency gap): ${gap}.`);
console.log(`CALIBRATION: the gap = work the method SCOPED but did not SPECIFY enough to build. If that gap looks right, the two-part judge is trustworthy for the sweep.`);
