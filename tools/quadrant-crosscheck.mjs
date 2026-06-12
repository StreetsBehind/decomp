#!/usr/bin/env node
// Kill-test #1 robustness pass (RECONCILIATION change G: single-author ground truth is biased).
// Blind, independent re-classification of the 162 hearth edges on the 2x2 by FREE gateway models,
// then inter-rater agreement vs the authored tagging — focused on the load-bearing LETHAL bit.
// Free ($0); records the resolved upstream model + request id per rater (A8). Retries on invalid.
//
// CHUNKED: free models can't emit a clean 162-element array in one shot (prose blowup OR they hit the
// 16k output cap mid-array — both observed, corroborating the E0.5 smoke). So we ask in small batches
// for COMPACT single-letter codes (L/X/C/S), which keeps every call's output tiny and parseable.
//
// Run: node tools/quadrant-crosscheck.mjs [raters=3] [batchSize=27]
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { makeGatewayInvoke } from '../runner/model-client.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', 'hearth', 'outcome-manifest.json'), 'utf8'));
const edges = manifest.requiredEdges;
const N = edges.length;
const RATERS = Number(process.argv[2]) || 3;
const BATCH = Number(process.argv[3]) || 27;
const OUT = path.join(ROOT, 'runs', 'kill-test-1-crosscheck.json');

const CODE2Q = { L: 'lethal', X: 'loud-exp', C: 'cheap', S: 'silent-cheap' };

const RUBRIC = `You classify dependency edges in a multi-feature SaaS app onto a 2x2 "cost of omission" grid. For each edge: would OMITTING it make a normal happy-path test (one honest user, one org, no attacker) FAIL?  If YES the feature visibly breaks = self-revealing; if NO (the happy path still works but a security/auth/multi-tenancy/privacy/consistency/idempotency/compliance-audit guarantee is broken, seen only by an attacker, a 2nd tenant, or an auditor) = silent.  And: is a LATE fix cheap (local, no rework, no damage) or expensive (schema/ordering rework, or a breach already shipped)?

CODES (reply with one letter per edge):
  L = lethal       (silent + expensive)        -- ships clean, detonates later: authz gates, auth-required, tenant-scoping, audit/compliance emits, seat-limit enforcement, notification entitlement, token/state validation
  X = loud-exp     (self-revealing + expensive) -- architectural / data-model containment / ordering
  C = cheap        (self-revealing + cheap)      -- UI-drives-action, internal create/read/write, config reads, derive-from-events
  S = silent-cheap (silent + cheap)`;

function buildBatchPrompt(off, batch) {
  const list = batch.map((e, j) => `${off + j}. ${e.fromPlanKey} -> ${e.toPlanKey} | ${e.why}`).join('\n');
  return `${RUBRIC}\n\nEdges (index. from -> to | rationale):\n${list}\n\nReturn ONLY a JSON array of exactly ${batch.length} single-letter strings (one of "L","X","C","S"), the k-th being the code for the k-th edge listed above, in order. No prose, no markdown — just e.g. ["L","C","X",...].`;
}

function parseCodes(text, want) {
  let t = (text || '').trim();
  const a = t.indexOf('['), b = t.lastIndexOf(']');
  if (a === -1 || b === -1 || b < a) return null;
  let arr;
  try { arr = JSON.parse(t.slice(a, b + 1)); } catch { return null; }
  if (!Array.isArray(arr) || arr.length !== want) return null;
  const out = arr.map((s) => String(s).trim().toUpperCase()[0]);
  if (!out.every((c) => CODE2Q[c])) return null;
  return out.map((c) => CODE2Q[c]);
}

const invoke = makeGatewayInvoke({ timeoutMs: 180000 });
const authored = edges.map((e) => e.quadrant);

async function oneBatch(rater, off, batch) {
  const prompt = buildBatchPrompt(off, batch);
  for (let attempt = 1; attempt <= 3; attempt++) {
    let r;
    try { r = await invoke({ prompt }); }
    catch (err) { console.error(`  r${rater} b@${off} a${attempt}: transport ${err.message.slice(0, 60)}`); continue; }
    const codes = parseCodes(r.text, batch.length);
    console.error(`  r${rater} b@${off} a${attempt}: ${r.route || r.model} fin=${r.finishReason} tok=${r.outputTokens} ${codes ? 'OK' : 'INVALID'} (${r.wallClockSec.toFixed(0)}s)`);
    if (codes) return { codes, route: r.route, model: r.model, requestId: r.requestId, wallClockSec: r.wallClockSec };
  }
  return null;
}

async function oneRater(n) {
  const quadrants = [];
  const routes = [];
  for (let off = 0; off < N; off += BATCH) {
    const batch = edges.slice(off, off + BATCH);
    const res = await oneBatch(n, off, batch);
    if (!res) { console.error(`  rater ${n} FAILED on batch @${off}`); return null; }
    quadrants.push(...res.codes);
    routes.push({ off, route: res.route, model: res.model, requestId: res.requestId, wallClockSec: round(res.wallClockSec) });
  }
  return { rater: n, routes, quadrants };
}

function agreement(q) {
  let exact = 0, lethalAgree = 0, authoredLethal = 0, raterLethal = 0, bothLethal = 0;
  for (let i = 0; i < N; i++) {
    if (q[i] === authored[i]) exact++;
    const aL = authored[i] === 'lethal', rL = q[i] === 'lethal';
    if (aL) authoredLethal++;
    if (rL) raterLethal++;
    if (aL && rL) bothLethal++;
    if (aL === rL) lethalAgree++;
  }
  return {
    exactQuadrant: round(exact / N), lethalBitAgree: round(lethalAgree / N),
    authoredLethal, raterLethal, bothLethal,
    lethalRecall: round(authoredLethal ? bothLethal / authoredLethal : 1),
    lethalPrecision: round(raterLethal ? bothLethal / raterLethal : 1),
  };
}

(async () => {
  console.error(`Cross-check: ${RATERS} blind raters x ${N} edges, batches of ${BATCH}, via the free gateway...`);
  const raters = [];
  for (let n = 1; n <= RATERS; n++) {
    const r = await oneRater(n);
    if (r) raters.push(r);
  }
  if (!raters.length) {
    fs.writeFileSync(OUT, JSON.stringify({ fixture: 'hearth', edges: N, authoredLethal: authored.filter((q) => q === 'lethal').length, raters: [], note: 'no valid raters — free models could not produce parseable classifications (output-cap/disobedience hazard)' }, null, 2) + '\n');
    console.error('NO VALID RATERS — cross-check inconclusive (free-model output limits). Verdict stands on KT#1+KT#2.');
    process.exit(0);
  }

  const lethalVotes = edges.map((_, i) => (authored[i] === 'lethal' ? 1 : 0) + raters.reduce((s, r) => s + (r.quadrants[i] === 'lethal' ? 1 : 0), 0));
  const totalVoters = raters.length + 1;
  const consensusLethal = lethalVotes.filter((v) => v > totalVoters / 2).length;
  const unanimousLethal = lethalVotes.filter((v) => v === totalVoters).length;
  const anyLethal = lethalVotes.filter((v) => v > 0).length;

  const disputed = [];
  for (let i = 0; i < N; i++) {
    const raterLethalCount = raters.reduce((s, r) => s + (r.quadrants[i] === 'lethal' ? 1 : 0), 0);
    const meLethal = authored[i] === 'lethal';
    const raterMajLethal = raterLethalCount > raters.length / 2;
    if (meLethal !== raterMajLethal) {
      disputed.push({ i, edge: `${edges[i].fromPlanKey}->${edges[i].toPlanKey}`, authored: authored[i], conf: edges[i].quadrantConf, raterLethalVotes: `${raterLethalCount}/${raters.length}`, raters: raters.map((r) => r.quadrants[i]) });
    }
  }

  const report = {
    fixture: 'hearth', edges: N, authoredLethal: authored.filter((q) => q === 'lethal').length,
    raters: raters.map((r) => ({ rater: r.rater, routes: r.routes, agreement: agreement(r.quadrants) })),
    consensus: { totalVoters, majorityLethal: consensusLethal, unanimousLethal, anyVoterLethal: anyLethal },
    disputedCount: disputed.length, disputed,
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');

  console.error('\n=== CROSS-CHECK RESULT ===');
  console.error(`authored lethal: ${report.authoredLethal}/${N}`);
  for (const r of report.raters) {
    const a = r.agreement;
    const models = [...new Set(r.routes.map((x) => x.route || x.model))].join(',');
    console.error(`rater ${r.rater}: exact-quad ${(a.exactQuadrant * 100).toFixed(0)}% | lethal-bit agree ${(a.lethalBitAgree * 100).toFixed(0)}% | rater-lethal ${a.raterLethal} | lethal recall ${(a.lethalRecall * 100).toFixed(0)}% prec ${(a.lethalPrecision * 100).toFixed(0)}% | routes: ${models}`);
  }
  console.error(`consensus lethal (majority of ${totalVoters}): ${consensusLethal}/${N} | unanimous ${unanimousLethal} | any-voter ${anyLethal}`);
  console.error(`disputed (author vs rater-majority): ${disputed.length}`);
  console.error(`wrote ${path.relative(ROOT, OUT)}`);
})();

function round(x) { return Math.round(x * 1000) / 1000; }
