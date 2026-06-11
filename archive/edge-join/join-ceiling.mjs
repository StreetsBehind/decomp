// STEP 1 — the join-ceiling triage (SURFACE-DISCOVERY-SPEC §7 Step 1). GO/NO-GO on the whole
// reframe, for $0, in pure code: can the typed produces/consumes representation EXPRESS the true
// edges at all? Annotate one fixture's manifest with produces/consumes, run the deterministic join,
// and read the RESOURCE-MEDIATED FRACTION of the required edges = the architectural ceiling.
//
//   high (>= ~0.7)            -> the join has a real domain; the reframe is alive, proceed to Step 2.
//   low AND misses intrinsic  -> some edges are not resource-mediated (pure ordering/policy) and
//                                aren't closable by adding a lattice type -> the reframe needs a
//                                supplement; we learned it FREE, before any extraction or spend.
//
// Read the NUMBER, not pass/fail — and read WHICH edges are unmediated (printed below) to judge
// whether they are lattice gaps (fixable) or intrinsic ordering/containment edges (not).
//
// Usage:  node eval/join-ceiling.mjs [fixture] [annotationPath]
//   defaults: fixture=sso-greenfield, annotation=experiments/join-ceiling/<fixture>.produces-consumes.json

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { joinEdges, scoreJoin } from './join.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

export function joinCeiling(manifest, annotation) {
  const nodes = annotation.nodes || [];

  // honesty guard: every annotated node must correspond to a manifest requirement planKey, and
  // every required-edge endpoint must be annotated — so the annotation can neither invent nodes
  // nor quietly omit a packet to dodge an edge.
  const reqKeys = new Set((manifest.requirements || []).map((r) => r.planKey));
  const annKeys = new Set(nodes.map((n) => n.planKey));
  const edgeKeys = new Set((manifest.requiredEdges || []).flatMap((e) => [e.fromPlanKey, e.toPlanKey]));
  const inventedNodes = [...annKeys].filter((k) => !reqKeys.has(k));
  const unannotatedEndpoints = [...edgeKeys].filter((k) => !annKeys.has(k));

  const computed = joinEdges(nodes);
  const score = scoreJoin(computed, manifest);
  return { computed, score, inventedNodes, unannotatedEndpoints, nodeCount: nodes.length };
}

function main() {
  const fixture = process.argv[2] || 'sso-greenfield';
  const annPath = process.argv[3] || resolve(ROOT, `experiments/join-ceiling/${fixture}.produces-consumes.json`);
  const manifest = readJson(resolve(ROOT, `fixtures/${fixture}/outcome-manifest.json`));
  const annotation = readJson(annPath);

  const { score, inventedNodes, unannotatedEndpoints, nodeCount } = joinCeiling(manifest, annotation);
  const pct = (x) => `${(x * 100).toFixed(1)}%`;

  console.log(`\n=== JOIN-CEILING — ${fixture} ===`);
  console.log(`nodes annotated:        ${nodeCount}  (one per requirement planKey)`);
  console.log(`required edges:         ${score.required}`);
  console.log(`computed edges:         ${score.computed}`);
  console.log(`\nCEILING (resource-mediated fraction of true edges, = join recall): ${pct(score.recall)}  [${score.covered}/${score.required}]`);
  console.log(`join precision (over-wire guard):                                  ${pct(score.precision)}  [${score.computed - score.spurious.length}/${score.computed}]`);

  if (score.byPartition) {
    console.log('\nper-partition recall:');
    for (const [p, v] of Object.entries(score.byPartition)) console.log(`  ${p.padEnd(16)} ${pct(v.recall)}  [${v.covered}/${v.required}]`);
  }

  if (score.missing.length) {
    console.log(`\nUN-MEDIATED required edges (${score.missing.length}) — inspect: lattice gap (fixable) or intrinsic ordering/containment (not)?`);
    for (const m of score.missing) console.log(`  ✗ ${m.ref.padEnd(34)} ${m.partition ? `[${m.partition}] ` : ''}${m.evidence}`);
  } else {
    console.log('\nUN-MEDIATED required edges: none — the representation expresses every true edge.');
  }

  if (score.spurious.length) {
    console.log(`\nSPURIOUS computed edges (${score.spurious.length}) — over-wire OR a real edge the manifest omits:`);
    for (const s of score.spurious) console.log(`  ? ${s.ref.padEnd(34)} via ${s.via.join(', ')}`);
  } else {
    console.log('SPURIOUS computed edges: none — zero over-wiring.');
  }

  if (inventedNodes.length) console.log(`\n⚠ annotation invents nodes not in the manifest: ${inventedNodes.join(', ')}`);
  if (unannotatedEndpoints.length) console.log(`⚠ required-edge endpoints with no annotated node: ${unannotatedEndpoints.join(', ')}`);

  const GO_BAR = 0.7;
  console.log(`\nREAD: ceiling ${pct(score.recall)} vs GO bar ${pct(GO_BAR)} -> ${score.recall >= GO_BAR ? 'GO (the reframe can express the edges; proceed to Step 2)' : 'INVESTIGATE (low ceiling — check whether misses are lattice gaps or intrinsic)'}`);
  console.log('');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();

export default joinCeiling;
