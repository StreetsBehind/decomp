#!/usr/bin/env node
// $0 inspection: print the distinct oracle `why` strings of the post-deterministic-stack residual on the named
// cells, bucketed by classifyFail class — to verify the `unknown` mode is not masking semantic-only draws.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { loadEpicCtx, readDrawFiles, floorStatus, gradeRates, runStack, NOOP_REBUILD } from './src/label-draw.mjs';
import { runRepairGate } from './src/repair-gate.mjs';
import { runShapeGate } from './src/shape-gate.mjs';
import { runContractGate } from './src/contract-gate.mjs';
import { runObligationContract } from './src/obligation-contract.mjs';
import { runSeamGate } from './src/seam-gate.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const CELLS = ['approval-d3', 'quota-d3', 'quota-d4'];
const DUMPS = ['dump-ladder', 'dump-ladder-A'];
const NOOP = async () => '';

function cls(why) {
  const w = String(why || '').toLowerCase();
  if (w.includes('is not a function') || w.includes('touched-unwired')) return 'form:shape';
  if (w.includes('not defined') || w.includes('cannot read properties of undefined') || w.includes('assignment to constant')) return 'incompetence';
  if (w.includes('admin')) return 'form:authz';
  if (w.includes('overspend') || w.includes('still there') || w.includes('was charged') || w.includes('remains') || w.includes('conserve') || w.includes('negative') || w.includes('exactly') || w.includes('lost or made')) return 'sem:conservation';
  if (w.includes('not approved') || w.includes('approval') || w.includes('self-approv') || w.includes('idempotent') || w.includes('audit')) return 'sem:approval';
  if (w.includes('not found') || w.includes('not published') || w.includes('not a member') || w.includes('not publicly') || w.includes('no member')) return 'form:seam';
  if (w.includes('leak') || w.includes('foreign') || w.includes(' org') || w.includes('tenan') || w.includes('not in caller')) return 'form:tenancy';
  if (w.includes('invalid input') || w.includes('not allowed') || w.includes('must not') || w.includes('unexpected field')) return 'form:input';
  if (w.includes('assert.ok') || w.includes('expected truthy') || w.includes('to be truthy')) return 'form-inadmissible';
  return 'UNKNOWN';
}

async function runExistingStack(rawFiles, ctx) {
  const files = { ...rawFiles };
  const gate = { kind: 'deterministic', repairDepth: 2, bestOfN: 3 };
  await runRepairGate({ surfaces: ctx.order, files, prompts: ctx.prompts, gate, rebuild: NOOP });
  await runShapeGate({ surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton, baseModel: ctx.preamble, gate, rebuild: NOOP });
  await runContractGate({ surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton, gate, rebuild: NOOP });
  await runObligationContract({ surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton, gate, rebuild: NOOP });
  await runSeamGate({ surfaces: ctx.order, files, prompts: ctx.prompts, skeleton: ctx.skeleton, baseModel: ctx.preamble, gate, rebuild: NOOP, verify: async () => true });
  return files;
}

for (const cell of CELLS) {
  const ctx = await loadEpicCtx(cell);
  const unknownWhys = new Map();      // why -> count
  let semOnlyIfUnknownWereSem = 0;    // # above-floor draws whose residual ⊆ {semantic, unknown}
  let aboveFloor = 0;
  for (const dump of DUMPS) {
    for (let k = 1; k <= 8; k++) {
      const drawDir = path.join(HERE, 'runs', dump, `${cell}-d${k}`);
      if (!fs.existsSync(path.join(drawDir, 'raw'))) continue;
      const raw = readDrawFiles(drawDir, ctx.order);
      if (!Object.keys(raw).length) continue;
      const floor = await floorStatus(raw, ctx.order);
      if (!floor.floorOk) continue;
      aboveFloor++;
      const post = await gradeRates(await runExistingStack(raw, ctx), ctx.testsPath);
      const classes = new Set((post.fails || []).map((f) => cls(f.why)));
      if (post.fails && post.fails.length && [...classes].every((c) => c.startsWith('sem:') || c === 'UNKNOWN')) semOnlyIfUnknownWereSem++;
      for (const f of post.fails || []) if (cls(f.why) === 'UNKNOWN') unknownWhys.set(f.why, (unknownWhys.get(f.why) || 0) + 1);
    }
  }
  console.log(`\n=== ${cell} (above-floor ${aboveFloor}) — draws that are {semantic|unknown}-only: ${semOnlyIfUnknownWereSem} ===`);
  const top = [...unknownWhys.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  for (const [why, n] of top) console.log(`  [${n}] ${why.slice(0, 130)}`);
}
