#!/usr/bin/env node
// The cost-optimized ROUTED all-frontier baseline (P3 prerequisite #3; STATE.md #3 / DESIGN §2/§7).
//
// The interim baseline is the OPUS-WHOLE proxy (baseline.mjs): one opus call per epic, ~$0.27, X-CUT/INTEG
// 100% at N=5 — but its bare-opus INTEG at scale is UNMEASURED (the iProxy gap). This harness measures the
// real comparator the win condition names: frontier-orchestration (opus skeleton) + **frontier-routed**
// per-surface coding (haiku→trivial CRUD, sonnet→writers, opus→the hard seam), graded by the SAME
// independent oracles the hybrid is graded by. It yields, per epic: measured reliability (incl. the
// per-bucket INTEG the proxy lacked) and measured cost. The ONLY difference vs the hybrid is the coding tier
// (frontier-routed here vs cheap-fusion in the hybrid), so the comparison is apples-to-apples.
//
// Beating THIS (cost-optimized) baseline — not naive all-opus — is the win condition (no strawman).
//
// Run:  node studies/meta-search/routed-baseline.mjs --mock          # zero-spend wiring dry-run + token sizing
//       node studies/meta-search/routed-baseline.mjs --epics approval-d1,lifecycle-d1   # real (spends $)
//       node studies/meta-search/routed-baseline.mjs --estimate      # mock + project full-battery $ (no real spend)
//       node studies/meta-search/routed-baseline.mjs --settled --k 8  # P3 prereq: worst-of-K over the full DEV ladder → runs/routed-baseline-settled.json (LIVE $; add --mock to dry-run)
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { claudeInvoke, makeMockInvoke } from '../../runner/model-client.mjs';
import { evaluateEpic } from '../build-gap/lib/epic-sandbox.mjs';
import { PRICE_TABLE } from './src/config.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const MOCK = has('mock') || has('estimate');
const K = Math.max(1, parseInt(arg('k', '1'), 10) || 1);   // worst-of-K draws/epic (settled path only); routing is deterministic, so K measures the frontier models' own nondeterminism
const SETTLED = has('settled');
// the complete DEV epic ladder — NOT the sequestered TEST ids (TEST stays sealed until P3). membership
// scale-d1..d5 + the diverse topologies approval/lifecycle/quota d1..d4: mirrors the TEST battery's depth
// shape on DEV epics so the settle reaches the D≥4 region where the opus-whole proxy eroded.
const DEV_LADDER = [
  'membership-d1', 'membership-d2', 'membership-d3', 'membership-d4', 'membership-d5',
  'approval-d1', 'approval-d2', 'approval-d3', 'approval-d4',
  'lifecycle-d1', 'lifecycle-d2', 'lifecycle-d3', 'lifecycle-d4',
  'quota-d1', 'quota-d2', 'quota-d3', 'quota-d4',
];

// frontier model ids per tier (the routed all-frontier roster).
const TIER = { haiku: 'claude-haiku-4-5', sonnet: 'claude-sonnet-4-6', opus: 'claude-opus-4-8' };
const TIER_PRICE_KEY = { 'claude-haiku-4-5': 'haiku', 'claude-sonnet-4-6': 'sonnet', 'claude-opus-4-8': 'opus' };
const SKELETON_OPUS_ANCHOR_USD = 0.395; // orchestration cost = the metered MCOH25 opus skeleton-author anchor (same for hybrid + baseline)

// ---- the cost-optimized routing policy: reserve opus for the hard cross-surface seam, haiku for CRUD -----
const SEAM_VERBS = ['post', 'execute', 'ship', 'settle', 'pay', 'run', 'disburse', 'land', 'issue', 'get', 'withdraw', 'redeem', 'spend', 'debit', 'draw', 'drain', 'consume'];
const CRUD_VERBS = ['create', 'list'];
function routeFor(surface) {
  const s = surface.toLowerCase();
  if (CRUD_VERBS.some((v) => s.startsWith(v))) return TIER.haiku;     // trivial CRUD
  if (SEAM_VERBS.some((v) => s.startsWith(v))) return TIER.opus;       // the hard cross-surface gate/seam
  return TIER.sonnet;                                                  // writers (addMember/approve/advance/deposit/updateProfile…)
}

const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';
const chunkPrompt = (preamble, skeleton, surfaceText) => ['## Shared context (every surface uses this)', preamble, skeleton ? `\n${skeleton}` : '', '\n## Your task', surfaceText].join('\n');

// epic spec: dir holds preamble/skeleton/surfaces; testsPath is the independent grader.
function epicSpec(id) {
  if (id.startsWith('membership-d')) {
    const D = id.split('-d')[1];
    return { id, dir: path.join(ROOT, 'studies', 'build-gap', 'epics', `scale-d${D}`), testsPath: path.join(HERE, 'gates', 'lib', `oracle2-tests-d${D}.mjs`) }; // graded by the independent 2nd oracle (depth-matched: d${D})
  }
  return { id, dir: path.join(HERE, 'epics', id), testsPath: path.join(HERE, 'epics', id, 'tests.mjs') };
}

async function loadEpic(spec) {
  const tests = await import(url.pathToFileURL(spec.testsPath).href);
  const order = Array.isArray(tests.EXPECTS) ? tests.EXPECTS.slice() : [];
  const preamble = fs.readFileSync(path.join(spec.dir, 'preamble.md'), 'utf8');
  const skeleton = fs.existsSync(path.join(spec.dir, 'skeleton.md')) ? fs.readFileSync(path.join(spec.dir, 'skeleton.md'), 'utf8') : '';
  const surfaces = Object.fromEntries(order.map((s) => [s, fs.readFileSync(path.join(spec.dir, 'surfaces', `${s}.md`), 'utf8')]));
  return { order, preamble, skeleton, surfaces };
}

// HARDENED (2026-06-19, gleaning #5 aggregate-consistency lint): fail-CLOSED. An absent bucket — including a
// whole harnessError/timeout/empty grade that carries no buckets — must score 0, never a fake 1.0. Same
// VOID-92/92 footgun fixed in coevo-rung1.mjs / head-to-head.mjs on 2026-06-18; the lint surfaced that the P3
// baseline reliability metric still used the fail-OPEN `: 1` default. A crashed surface must not read 100%.
const rate = (b) => (b && b.total ? b.pass / b.total : 0);

// worst-of-K aggregation (verbatim convention from coevo-rung1.mjs §worst-of-K): per-bucket worst=min,
// best=max, median over the K logged draws. Frozen rule (DESIGN §5/A5): K-run aggregation = worst-of-K for
// both cost AND reliability; a harnessError/empty draw scores 0 via the fail-CLOSED rate() above and so counts
// as the worst — NEVER excluded (no lucky-draw cherry-pick).
const min = (xs) => xs.reduce((a, b) => Math.min(a, b), Infinity);
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const max = (xs) => xs.reduce((a, b) => Math.max(a, b), -Infinity);
const stat = (xs) => ({ worst: +min(xs).toFixed(4), median: +med(xs).toFixed(4), best: +max(xs).toFixed(4) });
// cost axis: higher $ = worse, so worst-of-K cost = MAX draw, best = MIN (reliability uses stat() where worst=min).
const costStat = (xs) => ({ worst: +max(xs).toFixed(4), median: +med(xs).toFixed(4), best: +min(xs).toFixed(4) });

// concurrency-limited map (frontier calls are slow; build an epic's surfaces in parallel).
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

async function runEpic(spec, invoke, conc = 5) {
  const fx = await loadEpic(spec);
  const files = {}; const routeDist = {}; let surfUsd = 0; const outTokens = {};
  await pool(fx.order, conc, async (s) => {
    const model = routeFor(s);
    const prompt = chunkPrompt(fx.preamble, fx.skeleton, fx.surfaces[s]);
    let g; try { g = await invoke({ prompt, system: SYS_ONE, model }); } catch (e) { g = { text: '', usd: 0, outputTokens: 0 }; }
    files[s] = g.text || '';
    routeDist[TIER_PRICE_KEY[model] || model] = (routeDist[TIER_PRICE_KEY[model] || model] || 0) + 1;
    outTokens[s] = g.outputTokens || 0;
    if (Number.isFinite(g.usd)) surfUsd += g.usd;
  });
  if (spec.env) for (const [k, v] of Object.entries(spec.env)) process.env[k] = v; // membership → oracle2 via _dyn-tests
  const grade = await evaluateEpic({ mode: 'isolated', files, testsPath: spec.testsPath });
  return {
    id: spec.id, routeDist, surfaces: fx.order.length,
    reliability: { happy: rate(grade.happy), crosscut: rate(grade.crosscut), integration: rate(grade.integration) },
    buckets: { crosscut: `${grade.crosscut?.pass}/${grade.crosscut?.total}`, integration: `${grade.integration?.pass}/${grade.integration?.total}` },
    surfaceUsd: +surfUsd.toFixed(4), skeletonUsd: SKELETON_OPUS_ANCHOR_USD, totalUsd: +(surfUsd + SKELETON_OPUS_ANCHOR_USD).toFixed(4),
    outTokens,
  };
}

// worst-of-K wrapper around runEpic: K independent whole-epic draws, aggregated per cell (worst/median/best).
// The routed policy is deterministic (routeDist stable across draws), so the variance is the frontier models'
// own nondeterminism — the route lottery lives on the hybrid side, not this fixed-policy comparator.
async function runEpicWorstOfK(spec, invoke, k) {
  const draws = [];
  for (let i = 0; i < k; i++) {
    let d; try { d = await runEpic(spec, invoke); } catch (e) { d = { reliability: { happy: 0, crosscut: 0, integration: 0 }, totalUsd: SKELETON_OPUS_ANCHOR_USD, surfaces: 0, routeDist: {}, harnessError: String((e && e.message) || e) }; } // §4.5: a harness throw is a hard worst-of-K FAIL (0), never excluded / never aborts the battery
    draws.push(d);
  }
  const bk = (sel) => stat(draws.map(sel));
  const worst = {
    happy: +min(draws.map((d) => d.reliability.happy)).toFixed(4),
    crosscut: +min(draws.map((d) => d.reliability.crosscut)).toFixed(4),
    integration: +min(draws.map((d) => d.reliability.integration)).toFixed(4),
  };
  const depth = spec.id.includes('-d') ? +spec.id.split('-d').pop() : null;
  return {
    id: spec.id, topo: spec.id.split('-d')[0], depth, surfaces: draws[0].surfaces, k, routeDist: draws[0].routeDist,
    reliability: { happy: bk((d) => d.reliability.happy), crosscut: bk((d) => d.reliability.crosscut), integration: bk((d) => d.reliability.integration) },
    worst, epicOK_worst: worst.crosscut === 1 && worst.integration === 1,
    cost: { ...costStat(draws.map((d) => d.totalUsd)), skeletonUsd: SKELETON_OPUS_ANCHOR_USD },
    draws: draws.map((d) => ({ reliability: d.reliability, totalUsd: d.totalUsd })),
  };
}

// SETTLED driver (P3 prereq): worst-of-K across the full DEV ladder → runs/routed-baseline-settled.json + an
// erosion verdict (does the cost-optimized routed baseline drop below 100% worst-of-K at depth, the way the
// opus-whole proxy did?). This is the COMPARATOR arm only; the dominance comparison is co-measured in
// head-to-head-settled.json / scored at P3. Mock writes a *-settled-mock.json so it can NEVER flip the gate.
async function runSettled(invoke) {
  const ids = (arg('epics', null) || DEV_LADDER.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  console.log(`routed all-frontier baseline — SETTLED — ${MOCK ? 'MOCK (zero spend)' : 'LIVE ($)'} — worst-of-K=${K} — ${ids.length} epics\n`);
  const outDir = path.join(HERE, 'runs'); fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, MOCK ? 'routed-baseline-settled-mock.json' : 'routed-baseline-settled.json');
  const flush = (payload) => fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n'); // incremental — a long live battery survives a kill
  const results = [];
  for (const id of ids) {
    const r = await runEpicWorstOfK(epicSpec(id), invoke, K);
    results.push(r);
    flush({ settled: true, mock: MOCK, generatedAt: new Date().toISOString(), k: K, ladder: ids, results, verdict: null });
    console.log(`${r.id}: worst{c ${(r.worst.crosscut * 100).toFixed(0)}% i ${(r.worst.integration * 100).toFixed(0)}%} epic✓ ${r.epicOK_worst ? 'Y' : 'N'}  cost worst$${r.cost.worst} med$${r.cost.median}  routes ${JSON.stringify(r.routeDist)}`);
  }
  const cellsBelow = results.filter((r) => r.worst.crosscut < 1 || r.worst.integration < 1)
    .map((r) => ({ id: r.id, depth: r.depth, crosscut: r.worst.crosscut, integration: r.worst.integration }));
  const byDepth = {};
  for (const r of results) {
    const key = `d${r.depth}`;
    byDepth[key] = byDepth[key] || { crosscut: 1, integration: 1, epics: 0 };
    byDepth[key].crosscut = Math.min(byDepth[key].crosscut, r.worst.crosscut);
    byDepth[key].integration = Math.min(byDepth[key].integration, r.worst.integration);
    byDepth[key].epics++;
  }
  const totalCostWorst = +results.reduce((a, r) => a + r.cost.worst, 0).toFixed(4);
  const totalCostMedian = +results.reduce((a, r) => a + r.cost.median, 0).toFixed(4);
  const verdict = {
    epics: ids.length, k: K, totalCostWorst, totalCostMedian,
    erosion: { anyBelow100: cellsBelow.length > 0, cellsBelow, byDepth },
    note: 'Comparator only (single cost-optimized routed all-frontier arm). Worst-of-K (min over K) reliability + cost across the DEV ladder; TEST ids stay sealed until P3. The win-condition DOMINANCE comparison (hybrid ≥ baseline per cell at ≤ cost) is co-measured in runs/head-to-head-settled.json / scored at P3 — NOT decided here.',
  };
  flush({ settled: true, mock: MOCK, generatedAt: new Date().toISOString(), k: K, ladder: ids, results, verdict });
  console.log(`\nTOTAL worst-of-K cost: $${totalCostWorst} (median $${totalCostMedian}) over ${ids.length} epics × K=${K}`);
  console.log(`erosion: ${verdict.erosion.anyBelow100 ? `${cellsBelow.length} cell(s) below 100% worst-of-K — see verdict.erosion` : 'none — baseline holds 100% across the ladder'}`);
  console.log(`wrote ${path.relative(ROOT, outFile)}`);
}

// estimate the full 86-epic battery from mock-measured per-surface output sizes × tier prices.
function estimateFull(results) {
  // assume mock token sizes approximate real; price each surface at its routed tier using PRICE_TABLE (per Mtok)
  const perSurfaceUsd = (tierKey, outTok) => (PRICE_TABLE[tierKey].in * 1500 / 1e6) + (PRICE_TABLE[tierKey].out * Math.max(outTok, 400) / 1e6);
  // full battery surface counts (from the manifest enumeration): membership 5×(4D+1)|D=1..5; 3 topos × (windows)
  // simpler: scale the measured d1 epics' avg surface $ by the known total surface count.
  return perSurfaceUsd; // returned for the caller to apply; real estimate printed in main()
}

async function main() {
  if (SETTLED) return runSettled(MOCK ? makeMockInvoke({}, { text: 'export function __noop(){ return null; }', outputTokens: 700, usd: 0 }) : claudeInvoke);
  const epicsArg = arg('epics', MOCK ? 'approval-d1,lifecycle-d1,quota-d1,membership-d1' : null);
  if (!epicsArg) { console.error('routed-baseline: pass --epics <id,id,...> for a real run, or --mock / --estimate'); process.exit(1); }
  const ids = epicsArg.split(',').map((s) => s.trim()).filter(Boolean);
  const invoke = MOCK
    ? makeMockInvoke({}, { text: 'export function __noop(){ return null; }', outputTokens: 700, usd: 0 }) // zero-spend; wiring only
    : claudeInvoke;

  console.log(`routed all-frontier baseline — ${MOCK ? 'MOCK (zero spend)' : 'LIVE ($)'} — ${ids.length} epics\n`);
  const results = [];
  for (const id of ids) {
    const r = await runEpic(epicSpec(id), invoke);
    results.push(r);
    console.log(`${r.id}: routes ${JSON.stringify(r.routeDist)}  rel{c ${(r.reliability.crosscut * 100).toFixed(0)}% i ${(r.reliability.integration * 100).toFixed(0)}%}  surf$ ${r.surfaceUsd}  total$ ${r.totalUsd}`);
  }
  const totalUsd = +results.reduce((a, r) => a + r.totalUsd, 0).toFixed(4);
  console.log(`\nTOTAL measured: $${totalUsd} over ${ids.length} epics`);

  if (has('estimate')) {
    // project the full 86-epic battery: total surface count from the manifest × avg per-surface $ at routed tiers
    const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', 'test-set-manifest.json'), 'utf8'));
    const totalSurfaces = manifest.epics.reduce((a, e) => a + e.EXPECTS.length, 0);
    const measuredSurfaces = results.reduce((a, r) => a + r.surfaces, 0);
    const avgSurfUsdMock = measuredSurfaces ? results.reduce((a, r) => a + r.surfaceUsd, 0) / measuredSurfaces : 0;
    // mock surf$ is 0; instead price analytically from PRICE_TABLE using a representative 1500-out routed mix
    const est = estimateFull(results);
    const repMix = { haiku: 0.4, sonnet: 0.4, opus: 0.2 }; // create/list haiku, writers sonnet, seam opus
    const perSurf = repMix.haiku * est('haiku', 1500) + repMix.sonnet * est('sonnet', 1500) + repMix.opus * est('opus', 1500);
    const skeletonTotal = manifest.epics.length * SKELETON_OPUS_ANCHOR_USD;
    const surfTotal = totalSurfaces * perSurf;
    console.log(`\n=== full-battery estimate (${manifest.epics.length} epics, ${totalSurfaces} surface builds) ===`);
    console.log(`  surface coding (routed): ~$${surfTotal.toFixed(2)}  (≈$${perSurf.toFixed(4)}/surface, mix ${JSON.stringify(repMix)})`);
    console.log(`  skeleton (opus anchor):  ~$${skeletonTotal.toFixed(2)}  (${manifest.epics.length} × $${SKELETON_OPUS_ANCHOR_USD})`);
    console.log(`  PROJECTED FULL BATTERY:  ~$${(surfTotal + skeletonTotal).toFixed(2)}`);
  }

  const outDir = path.join(HERE, 'runs'); fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, MOCK ? 'routed-baseline-mock.json' : 'routed-baseline-live.json');
  fs.writeFileSync(outFile, JSON.stringify({ mock: MOCK, epics: ids, results, totalUsd }, null, 2) + '\n');
  console.log(`\nwrote ${path.relative(ROOT, outFile)}`);
}

main();
