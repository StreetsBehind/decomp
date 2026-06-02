// LIVE Step-2 extraction A/B — DECISIVE version (SPENDS MONEY) — sso-greenfield.
//
// Fixes the two flaws of the v1 A/B (docs/STAIRCASE-RESULTS.md Step 2): K too low, and no precision
// guard (over-wiring could masquerade as recall). Here:
//   1. K=5 (kills the variance the v1 result rode on).
//   2. ALIGNMENT-based, precision-aware, DETERMINISTIC scoring. Once per run we align the manifest's
//      planKeys to the model's invented bead ids using the requirement-coverage judge's beadRef
//      (13 judge calls). Then BOTH arms are scored deterministically over the SAME alignment:
//        recall    = required edges realized as a transitive path between the aligned beads
//        over-wire = total edges produced + the fraction of an arm's ALIGNED-pair edges that are
//                    actually required (a precision proxy the v1 judge-recall could not see)
//      Both arms share one alignment, so the comparison is fair even where alignment is imperfect.
//
// Arm 1 = the model's depends_on edges. Arm 2 = annotate the SAME beads -> the deterministic join.
// method/annotator = haiku (reliable, cheap; extraction is a LOCAL task), judge = sonnet (alignment).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import singleSession from '../strategies/single-session/index.mjs';
import { claudeInvoke } from '../runner/model-client.mjs';
import { makeClaudeJudge } from '../runner/judge.mjs';
import { makeClaudeAnnotator } from '../runner/annotator.mjs';
import { extractInterfaces } from '../eval/extract-interfaces.mjs';
import { joinEdges } from '../eval/join.mjs';
import { buildSnapshotDigest } from '../eval/generative-coverage.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rj = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));
const FIX = 'sso-greenfield';
const METHOD = 'claude-haiku-4-5'; const ANNOT = 'claude-haiku-4-5'; const JUDGE = 'claude-sonnet-4-6';
const K = 5;

const lock = rj(`fixtures/${FIX}/plan.lock.json`);
const manifest = rj(`fixtures/${FIX}/outcome-manifest.json`);
const planMd = readFileSync(resolve(ROOT, `fixtures/${FIX}/plan.md`), 'utf8');
const REQUIRED = manifest.requiredEdges;
const reqSet = new Set(REQUIRED.map((e) => `${e.fromPlanKey}->${e.toPlanKey}`));

let usd = 0; let calls = 0;
const metered = async (a) => { const r = await claudeInvoke(a); calls++; if (Number.isFinite(r.usd)) usd += r.usd; return r; };
const judge = makeClaudeJudge(metered, { model: JUDGE });
const annotate = makeClaudeAnnotator(metered, { model: ANNOT });

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs) => { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); };
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const signed = (x) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}`;

async function mapPool(items, limit, fn) {
  const out = new Array(items.length); let i = 0;
  const lanes = Math.max(1, Math.min(limit, items.length || 1));
  const worker = async () => { for (;;) { const k = i++; if (k >= items.length) return; out[k] = await fn(items[k]); } };
  await Promise.all(Array.from({ length: lanes }, worker));
  return out;
}

// align manifest planKeys -> a model bead id, via the requirement judge's beadRef.
async function alignPlanKeys(snapshot) {
  const digest = buildSnapshotDigest(snapshot);
  const beadIds = new Set(snapshot.beads.map((b) => b.id));
  const res = await mapPool(manifest.requirements, 3, async (req) => {
    const v = await judge({ kind: 'requirement', target: req, snapshotDigest: digest });
    return v.presence && typeof v.beadRef === 'string' && beadIds.has(v.beadRef) ? [req.planKey, v.beadRef] : null;
  });
  const align = new Map(); const beadPk = new Map();
  for (const r of res) if (r) { align.set(r[0], r[1]); if (!beadPk.has(r[1])) beadPk.set(r[1], new Set()); beadPk.get(r[1]).add(r[0]); }
  return { align, beadPk };
}

// deterministic recall + over-wiring for one arm's edge set, over a shared alignment.
function scoreArm(edges, align, beadPk, beads) {
  const depsOf = new Map(); for (const b of beads) depsOf.set(b.id, new Set());
  for (const e of edges) if (depsOf.has(e.from)) depsOf.get(e.from).add(e.to);
  const trans = (s) => { const seen = new Set(); const st = [...(depsOf.get(s) || [])]; while (st.length) { const c = st.pop(); if (seen.has(c)) continue; seen.add(c); for (const n of depsOf.get(c) || []) if (!seen.has(n)) st.push(n); } return seen; };
  let covered = 0;
  for (const re of REQUIRED) {
    const fb = align.get(re.fromPlanKey); const tb = align.get(re.toPlanKey);
    if (fb && tb && fb !== tb && trans(fb).has(tb)) covered++;
  }
  let aligned = 0; let hits = 0;
  for (const e of edges) {
    const fp = beadPk.get(e.from); const tp = beadPk.get(e.to);
    if (fp && tp) { aligned++; let hit = false; for (const a of fp) for (const b of tp) if (reqSet.has(`${a}->${b}`)) hit = true; if (hit) hits++; }
  }
  return { recall: REQUIRED.length ? covered / REQUIRED.length : 1, covered, total: edges.length, aligned, hitRate: aligned ? hits / aligned : 0 };
}

console.log(`Step-2 extraction A/B v2 (DECISIVE, LIVE) — ${FIX}, K=${K}, method/annot ${METHOD} / judge ${JUDGE}`);
console.log(`alignment-based deterministic recall + over-wiring guard; Arm1 = depends_on, Arm2 = extraction->join, SAME nodes.\n`);
const A = { r1: [], r2: [], e1: [], e2: [], h1: [], h2: [], aligned: [] };
for (let k = 0; k < K; k++) {
  const { snapshot } = await singleSession.run({ name: FIX, lock, planMd, dir: ROOT }, { invoke: metered, model: METHOD });
  const { align, beadPk } = await alignPlanKeys(snapshot);
  const nodes = await extractInterfaces(snapshot, annotate, { concurrency: 3 });
  const joinE = joinEdges(nodes).map((e) => ({ from: e.fromPlanKey, to: e.toPlanKey }));
  const arm1 = scoreArm(snapshot.edges, align, beadPk, snapshot.beads);
  const arm2 = scoreArm(joinE, align, beadPk, snapshot.beads);
  A.r1.push(arm1.recall); A.r2.push(arm2.recall); A.e1.push(arm1.total); A.e2.push(arm2.total);
  A.h1.push(arm1.hitRate); A.h2.push(arm2.hitRate); A.aligned.push(align.size);
  console.log(`[run ${k + 1}/${K}] ${snapshot.beads.length} beads, ${align.size}/${manifest.requirements.length} planKeys aligned | Arm1 recall ${pct(arm1.recall)} (${arm1.total} edges, hit ${pct(arm1.hitRate)}) | Arm2 recall ${pct(arm2.recall)} (${arm2.total} edges, hit ${pct(arm2.hitRate)})  [${calls} calls ~$${usd.toFixed(2)}]`);
}

const pooledSd = Math.sqrt((sd(A.r1) ** 2 + sd(A.r2) ** 2) / 2);
const d = mean(A.r2) - mean(A.r1);
console.log(`\n=== STEP-2 v2 RESULT — ${FIX}, K=${K} (node set constant per run, alignment-based) ===`);
console.log(`planKeys aligned/run: [${A.aligned.join(', ')}] of ${manifest.requirements.length}`);
console.log(`Arm1 (depends_on)     recall ${pct(mean(A.r1))} ± ${pct(sd(A.r1))} | edges ${mean(A.e1).toFixed(1)} | required-hit ${pct(mean(A.h1))}   [${A.r1.map(pct).join(', ')}]`);
console.log(`Arm2 (extraction→join) recall ${pct(mean(A.r2))} ± ${pct(sd(A.r2))} | edges ${mean(A.e2).toFixed(1)} | required-hit ${pct(mean(A.h2))}   [${A.r2.map(pct).join(', ')}]`);
console.log(`DELTA recall: ${signed(d)} pts  (pooled stddev ${pct(pooledSd)})  | edge-count ratio Arm2/Arm1: ${(mean(A.e2) / Math.max(1, mean(A.e1))).toFixed(2)}x`);
console.log(`SPEND: ${calls} live calls ~$${usd.toFixed(2)}`);

const decisive = Math.abs(d) > pooledSd; // delta exceeds ~1 pooled stddev
const overwire = mean(A.e2) > 1.5 * mean(A.e1) && mean(A.h2) < mean(A.h1);
let v;
if (!decisive) v = `INCONCLUSIVE — recall delta ${signed(d)} pts is within 1 pooled stddev (${pct(pooledSd)}); not separable at K=${K}.`;
else if (d > 0 && !overwire) v = `EXTRACTION WINS, clean — Arm2 recall beats Arm1 by ${signed(d)} pts (> 1 stddev) WITHOUT worse over-wiring (edge ratio ${(mean(A.e2) / Math.max(1, mean(A.e1))).toFixed(2)}x, required-hit ${pct(mean(A.h2))} vs ${pct(mean(A.h1))}). The reframe pays off in practice.`;
else if (d > 0 && overwire) v = `EXTRACTION WINS BUT OVER-WIRES — recall +${(d * 100).toFixed(1)} pts, but Arm2 makes ${(mean(A.e2) / Math.max(1, mean(A.e1))).toFixed(2)}x the edges at a LOWER required-hit rate (${pct(mean(A.h2))} vs ${pct(mean(A.h1))}). The lift is partly spray; tighten the lattice/canonicalizer before claiming the reframe.`;
else v = `EXTRACTION LOSES — Arm2 recall ${signed(d)} pts below Arm1 (> 1 stddev); local extraction underperforms the model's depends_on here.`;
console.log(`\nVERDICT: ${v}`);
