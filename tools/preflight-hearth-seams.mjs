// LIVE headroom pre-flight (SPENDS MONEY) — hearth, blind A0, SEAM EDGES ONLY, K=2.
//
// The binding pre-flight question (ARCHETYPE-PREMISE-EXPERIMENT.md §8): does blind single-session
// find ANY of hearth's inter-feature SEAMS? If seam recall floors at ~0, anchoring is UNMEASURABLE
// (the prime can't lower what's already at the floor) and the fixture can't decide the premise.
// We judge ONLY the seam edges (not the 83 intra + 65 requirements) to keep the spend in budget.
//
// Run: node tools/preflight-hearth-seams.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import singleSession from '../strategies/single-session/index.mjs';
import { claudeInvoke } from '../runner/model-client.mjs';
import { makeClaudeJudge } from '../runner/judge.mjs';
import { scoreGenerativeCoverage } from '../eval/generative-coverage.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rj = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));
// METHOD = haiku: it completes the large hearth decompose reliably (~170s) where sonnet runs past the
// CLI timeout. For the "are seams findable at all?" floor check this is CONSERVATIVE — if the weaker
// model finds seams, the sonnet primary finds at least as many, so haiku>0 confirms headroom upward.
const METHOD_MODEL = 'claude-haiku-4-5';
const JUDGE_MODEL = 'claude-sonnet-4-6'; // judge held at the stronger model (fast, small per-call)
const K = 2;

const lock = rj('fixtures/hearth/plan.lock.json');
const manifest = rj('fixtures/hearth/outcome-manifest.json');
const planMd = readFileSync(resolve(ROOT, 'fixtures/hearth/plan.md'), 'utf8');
const seamEdges = manifest.requiredEdges.filter((e) => e.partition === 'seam');
const seamManifest = { ...manifest, requirements: [], requiredEdges: seamEdges };

let totalUsd = 0; let calls = 0;
const metered = async (args) => { const r = await claudeInvoke(args); calls++; if (Number.isFinite(r.usd)) totalUsd += r.usd; return r; };
const judge = makeClaudeJudge(metered, { model: JUDGE_MODEL });

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); };
const pct = (x) => `${(x * 100).toFixed(1)}%`;

console.log(`Hearth A0 (blind) SEAM-recall pre-flight — ${seamEdges.length} seam edges x K=${K}, method ${METHOD_MODEL} / judge ${JUDGE_MODEL} (LIVE — spends)`);
const suff = []; const pres = []; const beadN = []; const edgeN = []; const gapN = [];
for (let k = 0; k < K; k++) {
  console.log(`\n[run ${k + 1}/${K}] decomposing hearth (blind single-session, ${METHOD_MODEL})...`);
  const { snapshot, gaps } = await singleSession.run({ name: 'hearth', lock, planMd, dir: ROOT }, { invoke: metered, model: METHOD_MODEL });
  gapN.push((gaps || []).length);
  console.log(`  snapshot: ${snapshot.beads.length} beads, ${snapshot.edges.length} wired edges. judging ${seamEdges.length} seam edges (concurrency 4)...`);
  const cov = await scoreGenerativeCoverage(snapshot, seamManifest, judge, { concurrency: 4 });
  suff.push(cov.edgeCoverage.score); pres.push(cov.presence.edgeCoverage.score);
  beadN.push(snapshot.beads.length); edgeN.push(snapshot.edges.length);
  console.log(`  seam recall: sufficiency ${pct(cov.edgeCoverage.score)} | presence ${pct(cov.presence.edgeCoverage.score)}   [spend so far: ${calls} calls ~$${totalUsd.toFixed(2)}]`);
}

console.log(`\n=== PRE-FLIGHT RESULT — hearth, blind A0, SEAM edges only (n=${seamEdges.length}, K=${K}) ===`);
console.log(`seam recall (sufficiency): mean ${pct(mean(suff))} ± ${pct(sd(suff))}   per-run [${suff.map(pct).join(', ')}]`);
console.log(`seam recall (presence):    mean ${pct(mean(pres))} ± ${pct(sd(pres))}   per-run [${pres.map(pct).join(', ')}]`);
console.log(`beads/run [${beadN.join(', ')}] | edges wired/run [${edgeN.join(', ')}] | open-questions/run [${gapN.join(', ')}]`);
console.log(`SPEND: ${calls} live claude calls, ~$${totalUsd.toFixed(2)}  (method=${METHOD_MODEL}, judge=${JUDGE_MODEL})`);
console.log(`NOTE: method is HAIKU (conservative floor) — the sonnet primary would find >= these seams.`);

const findable = mean(pres); const deliverable = mean(suff);
let verdict;
if (findable <= 0.02) verdict = 'FLOORED — blind finds ~0 seams. Anchoring is UNMEASURABLE on hearth (the prime cannot lower a floor). Re-examine the fixture/metric before the full sweep.';
else if (findable >= 0.1 && findable < 0.95) verdict = `HEADROOM OK — blind finds some seams (presence ${pct(findable)}) but not all, so seam recall can move in BOTH directions; anchoring is measurable. ${deliverable < 0.05 ? 'Note: sufficiency is near 0 (present-but-thin seams) — the experiment may want to read seam PRESENCE, not sufficiency, as the anchoring metric on this fixture.' : ''}`;
else if (findable >= 0.95) verdict = 'NO HEADROOM — blind already finds ~all seams; priming has nothing to add on seams (unexpected given prior under-wiring). Recheck.';
else verdict = `MARGINAL — seam findability ${pct(findable)} is low; consider K↑ before committing to the full sweep.`;
console.log(`\nVERDICT: ${verdict}`);
