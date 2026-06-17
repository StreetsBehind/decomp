#!/usr/bin/env node
// P2a — the CROSS-surface integration-gate mechanism probe (DESIGN §9 P2; build-gap §4b). P1 proved the
// per-surface checker is NULL on `integration` at N=5 (a one-surface lever structurally cannot fix a
// two-surface seam). P2a asks the focused successor question with a cheap, controlled probe BEFORE the full
// scale sweep + search machinery:
//
//   does the CROSS-surface integration-gate + route-back repair lift INTEG off 0% where the per-surface
//   checker could not?
//
// THE PAIRED A/B (fixes P1's K=1 ±29pp noise). Each round builds every surface ONCE on the cheap pool, then:
//   - grades the raw assembly                         → INTEG/X-CUT OFF
//   - copies the files, runs the gate+repair on them  → INTEG/X-CUT ON
// OFF and ON therefore share the EXACT same base builds; the only difference is the gate. The Δ is a clean
// within-round paired measurement of the gate's effect, not a lottery between two independent draws.
//
// Oracle-blind throughout (the gate reads only the public skeleton + the candidate's own code; K3-scanned).
// The skeleton is the cheaper-author (fusion-tier, shapes-on) cached MCOH25 skeleton — the regime MCOH25
// found at INTEG 0%. Run: node studies/meta-search/p2.mjs --probe --epic scale-d1 [--rounds 5]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { makeGatewayInvoke } from '../../runner/model-client.mjs';
import { resolveSkeleton } from './src/skeleton-author.mjs';
import { runIntegrationGate } from './src/integration-gate.mjs';
import { buildScorecard } from './src/scorecard.mjs';
import { makeLedger } from './src/ledger.mjs';
import { defaultGenome, cloneGenome } from './src/genome.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1]; const eq = process.argv.find((a) => a.startsWith(`--${name}=`)); return eq ? eq.slice(name.length + 3) : def; };
const flag = (name) => process.argv.includes(`--${name}`);

const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';

function loadFixture(epicName) {
  const dir = path.join(BUILD_GAP, 'epics', epicName);
  return { dir, testsPath: path.join(dir, 'tests.mjs'), preamble: fs.readFileSync(path.join(dir, 'preamble.md'), 'utf8') };
}
async function cellNamesFor(testsPath) {
  const tests = await import(url.pathToFileURL(testsPath).href);
  const nm = (arr) => (Array.isArray(arr) ? arr.map((t) => t.name) : []);
  return { wire: Array.isArray(tests.EXPECTS) ? tests.EXPECTS.slice() : [], happy: nm(tests.happy), crosscut: nm(tests.crosscut), integration: nm(tests.integration) };
}
function chunkPrompt(preamble, skeleton, surfaceText) {
  return ['## Shared context (every surface uses this)', preamble, skeleton ? `\n${skeleton}` : '', '\n## Your task', surfaceText].join('\n');
}

// structural validity gate (mirrors evaluator.mjs / epic-run.mjs isValidSurface).
function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p2val-'));
  const f = path.join(dir, `${surface}.mjs`);
  fs.writeFileSync(f, code);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    let done = false;
    const finish = (ok) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(ok); };
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} finish(false); }, timeoutMs);
    child.on('close', (c) => finish(c === 0));
    child.on('error', () => finish(false));
  });
}
async function pool(items, limit, fn) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { for (;;) { const i = next++; if (i >= items.length) return; out[i] = await fn(items[i], i); } }));
  return out;
}

// build one surface on the cheap pool with structural retry (mirrors the evaluator's drawSurface).
async function drawSurface(invoke, prompt, surface, maxAttempts) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let g; try { g = await invoke({ prompt, system: SYS_ONE, model: null }); } catch { continue; }
    const ok = await isValidSurface(g.text, surface);
    if (ok) return g.text;
  }
  return '';
}

// grade a fileset with the trusted scorecard path → { xcut, integ } pass-fractions.
async function grade(evaluateEpic, epic, cellNames, files) {
  const run = await evaluateEpic({ mode: 'isolated', files, testsPath: path.join(BUILD_GAP, 'epics', epic, 'tests.mjs') });
  const sc = buildScorecard({ genome: null, genomeHash: 'probe', epics: [{ name: epic, cellNames, runs: [run] }], ledger: makeLedger() });
  const b = sc.perEpic[epic].buckets;
  const frac = (x) => (x.total ? x.pass / x.total : 1);
  return { xcut: frac(b.crosscut), integ: frac(b.integration), buckets: b };
}

const pct = (x) => (x == null ? 'n/a' : `${(x * 100).toFixed(0)}%`);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

async function main() {
  if (!flag('probe')) { console.error('usage: node p2.mjs --probe --epic scale-d1 [--rounds 5] [--repair 2]'); process.exit(2); }
  const epic = arg('epic', 'scale-d1');
  const rounds = Number(arg('rounds', 5));
  const repairDepth = Number(arg('repair', 2));
  const maxAttempts = Number(arg('retry', 2));
  const kinds = ['deterministic', 'cheap-judge'];

  const started = new Date().toISOString();
  const lines = []; const log = (s) => { console.log(s); lines.push(s); };
  log(`\n=== Meta-search P2a INTEGRATION-GATE PROBE — ${epic} (paired A/B, ${rounds} rounds) ===\n(${started})`);
  log(`question: does the CROSS-surface gate lift INTEG off 0% where the per-surface checker (P1) could not?\n`);

  const fx = loadFixture(epic);
  const cellNames = await cellNamesFor(fx.testsPath);
  const order = cellNames.wire;
  const evaluateEpic = (await import('../build-gap/lib/epic-sandbox.mjs')).evaluateEpic;
  const invoke = makeGatewayInvoke({ timeoutMs: 180000 });

  // cheaper-author skeleton (fusion-tier, shapes-on) — the MCOH25 INTEG-0% regime.
  const g = cloneGenome(defaultGenome());
  g.skeletonAuthor = { model: 'fusion', shapesIncluded: true, obligationDepth: 1 };
  const skel = resolveSkeleton(g, epic);
  log(`skeleton: ${skel.source} (tier ${skel.tier}); surfaces N=${order.length} [${order.join(', ')}]\n`);

  const rows = []; // per round: { off, on: {det, judge} with fired/repairs }
  for (let r = 0; r < rounds; r++) {
    // (1) build every surface ONCE
    const base = {};
    const prompts = {};
    await pool(order, 3, async (surface) => {
      const surfaceText = fs.readFileSync(path.join(fx.dir, 'surfaces', `${surface}.md`), 'utf8');
      const prompt = chunkPrompt(fx.preamble, skel.text, surfaceText);
      prompts[surface] = prompt;
      const code = await drawSurface(invoke, prompt, surface, maxAttempts);
      if (code) base[surface] = code;
    });
    // (2) grade OFF (the raw assembly)
    const off = await grade(evaluateEpic, epic, cellNames, { ...base });
    // (3) for each gate kind: copy, gate+repair, grade ON
    const on = {};
    for (const kind of kinds) {
      const files = { ...base };
      const gateRes = await runIntegrationGate({
        surfaces: order, files, prompts, skeleton: skel.text, baseModel: fx.preamble,
        gate: { kind, repairDepth },
        rebuild: (surface, rp) => drawSurface(invoke, rp, surface, maxAttempts),
        judgeInvoke: (a) => invoke(a),
      });
      const sc = await grade(evaluateEpic, epic, cellNames, files);
      on[kind] = { ...sc, mismatches: gateRes.mismatches, repairs: gateRes.repairs, leak: gateRes.leak };
    }
    rows.push({ off, on });
    log(`  round ${r + 1}: OFF X-CUT ${pct(off.xcut)} INTEG ${pct(off.integ)}` +
        kinds.map((k) => ` | ${k}: X-CUT ${pct(on[k].xcut)} INTEG ${pct(on[k].integ)} (mm ${on[k].mismatches}, rep ${on[k].repairs}${on[k].leak ? ', LEAK' : ''})`).join(''));
  }

  // aggregate (means over rounds; paired Δ). INTEG at N=5 is BIMODAL (the seam either agrees→100% or
  // drifts→0%), so the unconditional mean hides the mechanism. The decisive read is CONDITIONAL: in rounds
  // where the base build DRIFTS (OFF INTEG < 100%), does the gate DETECT it and does the repair RECOVER INTEG?
  log(`\n--- aggregate over ${rounds} rounds (paired) ---`);
  const offInteg = mean(rows.map((x) => x.off.integ)), offXcut = mean(rows.map((x) => x.off.xcut));
  const drifted = rows.filter((x) => x.off.integ < 0.999);          // base build drifted on the seam
  const driftRate = drifted.length / rows.length;
  log(`  OFF: X-CUT ${pct(offXcut)}  INTEG ${pct(offInteg)}  | seam-drift rate ${pct(driftRate)} (${drifted.length}/${rows.length} rounds with INTEG<100%)`);
  const verdicts = {};
  for (const k of kinds) {
    const onInteg = mean(rows.map((x) => x.on[k].integ)), onXcut = mean(rows.map((x) => x.on[k].xcut));
    const dInteg = onInteg - offInteg, dXcut = onXcut - offXcut;
    const firedRounds = rows.filter((x) => x.on[k].mismatches > 0).length;
    const repaired = rows.reduce((s, x) => s + x.on[k].repairs, 0);
    const anyLeak = rows.some((x) => x.on[k].leak);
    // CONDITIONAL on drift: of the drifted rounds, how many did the gate DETECT (fire)? and RECOVER (ON>OFF)?
    const detected = drifted.filter((x) => x.on[k].mismatches > 0).length;
    const recovered = drifted.filter((x) => x.on[k].integ > x.off.integ + 1e-9).length;
    const fullyRecovered = drifted.filter((x) => x.on[k].integ >= 0.999).length;
    // a movement claim REQUIRES gate activity (P1 lesson): Δ without a fired gate is gateway noise.
    const moved = recovered > 0;
    verdicts[k] = { onInteg, onXcut, dInteg, dXcut, firedRounds, repaired, anyLeak, detected, recovered, fullyRecovered, driftN: drifted.length, moved };
    log(`  ${k}: INTEG ${pct(onInteg)} (Δ ${(dInteg * 100).toFixed(0)}pp), X-CUT ${pct(onXcut)} (Δ ${(dXcut * 100).toFixed(0)}pp); fired ${firedRounds}/${rounds} (${repaired} repairs)${anyLeak ? ' LEAK!' : ''}`);
    log(`      conditional on drift (${drifted.length} rounds): DETECTED ${detected}/${drifted.length}, RECOVERED ${recovered}/${drifted.length} (fully ${fullyRecovered}/${drifted.length}) → ${moved ? 'gate MOVES INTEG when the seam drifts' : 'gate does NOT recover the seam'}`);
  }

  const anyMoved = Object.values(verdicts).some((v) => v.moved);
  log(`\nPROBE VERDICT (${epic}, N=${order.length}): cross-surface integration-gate ${anyMoved ? 'RECOVERS the seam when it drifts (lifts INTEG off the per-surface-checker floor)' : 'did NOT recover INTEG at this N'}.`);
  log(`(P1's per-surface checker was NULL on INTEG here. ${anyMoved ? 'P2a mechanism confirmed → proceed to P2b scale sweep + search.' : 'Gate as built insufficient — see the honest reading in the record.'})`);

  const outDir = path.join(HERE, 'runs'); fs.mkdirSync(outDir, { recursive: true });
  const summary = { phase: 'P2a-probe', started, finishedAt: new Date().toISOString(), epic, N: order.length, rounds, repairDepth, skeleton: skel.source, off: { xcut: offXcut, integ: offInteg }, verdicts, rows, anyMoved };
  fs.writeFileSync(path.join(outDir, `p2a-probe-${epic}.json`), JSON.stringify(summary, null, 2) + '\n');
  log(`\nwrote studies/meta-search/runs/p2a-probe-${epic}.json`);
}

main().catch((e) => { console.error('P2 driver error:', e); process.exit(1); });
