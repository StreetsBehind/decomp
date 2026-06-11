// STEP 2 — the extraction A/B (SURFACE-DISCOVERY-SPEC §7 Step 2): does LOCAL produces/consumes
// extraction + the join recover MORE of the manifest's edges than the model's directly-asked
// depends_on? Hold the NODE SET constant (one decomposition's beads) and vary ONLY edge-derivation:
//
//   Arm 1 (today): the snapshot's own depends_on edges, scored TRANSITIVELY vs the manifest
//                  (the existing recall ruler, planKeyDependsOn).
//   Arm 2 (new):   extractInterfaces -> joinEdges -> scoreJoin (direct, resource-mediated).
//
// Because the nodes are identical, any edge-recall delta is attributable to the derivation mechanism,
// NOT to enumerating different packets. Arm 2 also reports PRECISION (the over-wiring guard Arm 1 has
// no equivalent for). Kill criterion: Arm 2 fails to beat Arm 1 -> the reframe doesn't pay off in
// practice even if the Step-1 ceiling was high -> the bottleneck is extraction quality.

import { buildIndex, planKeyDependsOn } from './graph/build-graph.mjs';
import { joinEdges, scoreJoin } from './join.mjs';
import { extractInterfaces } from './extract-interfaces.mjs';

const round = (x, d = 4) => Math.round(x * 10 ** d) / 10 ** d;

/**
 * @param {object} snapshot   the FROZEN node set (a decomposition's beads + its depends_on edges)
 * @param {object} manifest   outcome-manifest with requiredEdges (optionally partition-tagged)
 * @param {(q)=>Promise<{produces,consumes}>} annotate  injected annotator (live or stub)
 * @param {{ concurrency?:number, normalize?:Function }} [opts]
 * @returns {Promise<{arm1, arm2, nodes, computed, delta}>}
 */
export async function extractionAB(snapshot, manifest, annotate, opts = {}) {
  const index = buildIndex(snapshot);
  const required = manifest.requiredEdges || [];

  // Arm 1 — the model's own depends_on, transitive (the existing recall ruler).
  const arm1Missing = [];
  let arm1Covered = 0;
  for (const e of required) {
    if (planKeyDependsOn(index, e.fromPlanKey, e.toPlanKey)) arm1Covered++;
    else arm1Missing.push({ ref: `${e.fromPlanKey} -> ${e.toPlanKey}`, partition: e.partition });
  }
  const arm1 = {
    recall: required.length ? arm1Covered / required.length : 1,
    covered: arm1Covered,
    required: required.length,
    missing: arm1Missing,
    derivation: 'model depends_on (transitive)',
  };

  // Arm 2 — local extraction -> join (direct, resource-mediated) + precision.
  const nodes = await extractInterfaces(snapshot, annotate, opts);
  const computed = joinEdges(nodes);
  const arm2 = { ...scoreJoin(computed, manifest), derivation: 'local produces/consumes -> join' };

  return { arm1, arm2, nodes, computed, delta: round(arm2.recall - arm1.recall) };
}

export default extractionAB;

// ---- thin live CLI (SPENDS MONEY) ------------------------------------------
// node eval/extraction-ab.mjs <fixture> <snapshot.json> [--model <id>]
// Loads fixtures/<fixture>/outcome-manifest.json + the frozen snapshot, runs the A/B with the LIVE
// claude annotator. Gated behind explicit invocation; never part of npm run selftest.
async function main() {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const { claudeInvoke } = await import('../runner/model-client.mjs');
  const { makeClaudeAnnotator } = await import('../runner/annotator.mjs');

  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const fixture = process.argv[2];
  const snapPath = process.argv[3];
  if (!fixture || !snapPath) { console.error('usage: node eval/extraction-ab.mjs <fixture> <snapshot.json> [--model <id>]'); process.exit(2); }
  const modelIdx = process.argv.indexOf('--model');
  const model = modelIdx !== -1 ? process.argv[modelIdx + 1] : undefined;

  const manifest = JSON.parse(readFileSync(resolve(ROOT, `fixtures/${fixture}/outcome-manifest.json`), 'utf8'));
  const snapshot = JSON.parse(readFileSync(resolve(snapPath), 'utf8'));
  const annotate = makeClaudeAnnotator(claudeInvoke, model ? { model } : {});

  console.error(`Step-2 A/B on ${fixture} (LIVE — spends money) ...`);
  const { arm1, arm2, delta } = await extractionAB(snapshot, manifest, annotate);
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  console.log(`\nArm 1 (model depends_on, transitive): recall ${pct(arm1.recall)}  [${arm1.covered}/${arm1.required}]`);
  console.log(`Arm 2 (local extraction -> join):      recall ${pct(arm2.recall)}  [${arm2.covered}/${arm2.required}]  precision ${pct(arm2.precision)}`);
  console.log(`\nDELTA (Arm2 - Arm1): ${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)} pts -> ${delta > 0 ? 'the reframe pays off on this fixture' : 'no extraction gain — investigate extraction quality'}`);
}

if (process.argv[1] && (await import('node:url')).fileURLToPath(import.meta.url) === (await import('node:path')).resolve(process.argv[1])) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
