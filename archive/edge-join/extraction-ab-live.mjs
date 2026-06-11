// LIVE Step-2 extraction A/B (SPENDS MONEY) — sso-greenfield.
//
// Does LOCAL produces/consumes extraction + the deterministic join recover MORE of the manifest's
// edges than the model's own directly-asked depends_on? Node set held CONSTANT per run (one blind
// decomposition); only the EDGE-derivation varies:
//   Arm 1 = the model's depends_on edges        (judged for edge recall vs manifest)
//   Arm 2 = annotate the SAME beads -> join      (judged for edge recall vs manifest)
//
// THIN-FIXTURE NOTE: a generative method invents its own planKeys, so edge recall can't be scored
// by mechanical planKey matching against the manifest — it needs the SEMANTIC judge (same as the
// battery). Both arms are judged identically (same beads, different edge set), so the comparison is
// clean. method/annotator = haiku (reliable, cheap; the extraction is a LOCAL task); judge = sonnet.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import singleSession from '../strategies/single-session/index.mjs';
import { claudeInvoke } from '../runner/model-client.mjs';
import { makeClaudeJudge } from '../runner/judge.mjs';
import { makeClaudeAnnotator } from '../runner/annotator.mjs';
import { extractInterfaces } from '../eval/extract-interfaces.mjs';
import { joinEdges } from '../eval/join.mjs';
import { scoreGenerativeCoverage } from '../eval/generative-coverage.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rj = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));
const FIX = 'sso-greenfield';
const METHOD = 'claude-haiku-4-5'; const ANNOT = 'claude-haiku-4-5'; const JUDGE = 'claude-sonnet-4-6';
const K = 2;

const lock = rj(`fixtures/${FIX}/plan.lock.json`);
const manifest = rj(`fixtures/${FIX}/outcome-manifest.json`);
const planMd = readFileSync(resolve(ROOT, `fixtures/${FIX}/plan.md`), 'utf8');
const edgesManifest = { ...manifest, requirements: [], requiredEdges: manifest.requiredEdges };

let usd = 0; let calls = 0;
const metered = async (a) => { const r = await claudeInvoke(a); calls++; if (Number.isFinite(r.usd)) usd += r.usd; return r; };
const judge = makeClaudeJudge(metered, { model: JUDGE });
const annotate = makeClaudeAnnotator(metered, { model: ANNOT });

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); };
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const signed = (x) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}`;

console.log(`Step-2 extraction A/B (LIVE) — ${FIX}, K=${K}, method/annot ${METHOD} / judge ${JUDGE}`);
console.log(`Arm1 = model depends_on (judged); Arm2 = local extraction -> join (judged); SAME nodes per run.\n`);
const a1 = []; const a2 = []; const a1p = []; const a2p = []; const depN = []; const joinN = [];
for (let k = 0; k < K; k++) {
  console.log(`[run ${k + 1}/${K}] decompose ${FIX} (blind, ${METHOD})...`);
  const { snapshot } = await singleSession.run({ name: FIX, lock, planMd, dir: ROOT }, { invoke: metered, model: METHOD });
  depN.push(snapshot.edges.length);
  console.log(`  ${snapshot.beads.length} beads, ${snapshot.edges.length} depends_on edges. judging Arm1, annotating + joining + judging Arm2...`);
  const c1 = await scoreGenerativeCoverage(snapshot, edgesManifest, judge, { concurrency: 3 });
  const nodes = await extractInterfaces(snapshot, annotate, { concurrency: 3 });
  const computed = joinEdges(nodes);
  joinN.push(computed.length);
  const snap2 = { beads: snapshot.beads, edges: computed.map((e) => ({ from: e.fromPlanKey, to: e.toPlanKey, kind: 'blocks' })), ready: snapshot.ready };
  const c2 = await scoreGenerativeCoverage(snap2, edgesManifest, judge, { concurrency: 3 });
  a1.push(c1.edgeCoverage.score); a2.push(c2.edgeCoverage.score);
  a1p.push(c1.presence.edgeCoverage.score); a2p.push(c2.presence.edgeCoverage.score);
  console.log(`  Arm1 suff ${pct(c1.edgeCoverage.score)}/pres ${pct(c1.presence.edgeCoverage.score)} | Arm2 suff ${pct(c2.edgeCoverage.score)}/pres ${pct(c2.presence.edgeCoverage.score)} | join made ${computed.length} edges  [${calls} calls ~$${usd.toFixed(2)}]`);
}

console.log(`\n=== STEP-2 RESULT — ${FIX}, K=${K} (node set held constant per run) ===`);
console.log(`Arm1 (model depends_on)  edge recall: suff ${pct(mean(a1))} ± ${pct(sd(a1))}  pres ${pct(mean(a1p))} ± ${pct(sd(a1p))}   [${a1.map(pct).join(', ')}]`);
console.log(`Arm2 (extraction->join)  edge recall: suff ${pct(mean(a2))} ± ${pct(sd(a2))}  pres ${pct(mean(a2p))} ± ${pct(sd(a2p))}   [${a2.map(pct).join(', ')}]`);
console.log(`DELTA (Arm2 - Arm1): suff ${signed(mean(a2) - mean(a1))} pts | pres ${signed(mean(a2p) - mean(a1p))} pts`);
console.log(`depends_on edges/run [${depN.join(', ')}] | join edges/run [${joinN.join(', ')}] | manifest requires ${manifest.requiredEdges.length}`);
console.log(`SPEND: ${calls} live calls ~$${usd.toFixed(2)}`);
const d = mean(a2) - mean(a1);
const noisy = sd(a2) > 0.15 || sd(a1) > 0.15;
const overwire = mean(joinN) > 1.5 * manifest.requiredEdges.length;
const dir = d > 0.03 ? `directional WIN for extraction (+${(d * 100).toFixed(1)} pts suff, ${signed(mean(a2p) - mean(a1p))} pts pres)`
  : d < -0.03 ? `directional LOSS for extraction (${(d * 100).toFixed(1)} pts suff)`
  : 'TIE on sufficiency';
const caveats = [];
if (noisy) caveats.push(`HIGH VARIANCE at K=${K} (Arm2 suff ±${pct(sd(a2))}) — NOT statistically decisive; raise K`);
if (overwire) caveats.push(`OVER-WIRING risk — the join made ~${Math.round(mean(joinN))} edges vs ${manifest.requiredEdges.length} required, and judge-RECALL does not penalize over-wiring (join precision is unmeasurable here: thin-fixture planKey mismatch). Some lift may be spray`);
console.log(`\nVERDICT: ${dir}.${caveats.length ? `\n  CAVEATS: ${caveats.join('; ')}.` : ''}`);
