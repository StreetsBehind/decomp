// LIVE cheap-tier transport smoke (E0.5) — proves the jnoccio gateway produces VALID decomposition
// snapshots end-to-end, in ADAPTIVE mode, recording which upstream served each call. FREE (usd 0),
// but real network to http://127.0.0.1:4317. Run: node tools/jnoccio-smoke.mjs [--k N] [--fixtures a,b]
//
// E0.5 pass bar (RESEARCH-PROGRAM §4.3 / handoff): >=4 DISTINCT gateway upstreams each produce a
// valid snapshot across >=2 thin fixtures. The smoke also surfaces the A8 phenomenon directly
// (truncations / non-JSON disobedience / bead counts per upstream) so we see cheap-model fragility
// before any scored grid.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import singleSession from '../strategies/single-session/index.mjs';
import { makeGatewayInvoke } from '../runner/model-client.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rj = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
};

const K = Number(arg('k', '4'));
const FIXTURES = arg('fixtures', 'sso-greenfield,ingest-pipeline').split(',').map((s) => s.trim()).filter(Boolean);
const PER_CALL_TIMEOUT_MS = 120_000; // per-ATTEMPT cap — a hung route is abandoned and retried (re-routes)
const MAX_ATTEMPTS = 3; // retry-on-invalid (A8): empty / truncated / disobedient -> retry, which RE-ROUTES

// A valid snapshot = parses to >=1 structurally-complete bead (the prompt contract: id + title +
// >=1 acceptanceCriteria + >=1 filesTouched). A disobeying free model yields 0 beads -> invalid.
function validateSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.beads) || snapshot.beads.length === 0) {
    return { ok: false, reason: 'no beads (non-JSON or empty)' };
  }
  for (const b of snapshot.beads) {
    const m = b && b.metadata ? b.metadata : {};
    if (!b.id || !b.title) return { ok: false, reason: 'bead missing id/title' };
    if (!Array.isArray(m.acceptanceCriteria) || m.acceptanceCriteria.length === 0) return { ok: false, reason: 'bead missing acceptanceCriteria' };
    if (!Array.isArray(m.filesTouched) || m.filesTouched.length === 0) return { ok: false, reason: 'bead missing filesTouched' };
  }
  return { ok: true, reason: '' };
}

const gw = makeGatewayInvoke({ timeoutMs: PER_CALL_TIMEOUT_MS });
let lastMeta = null;
const capturing = async (args) => {
  const r = await gw(args);
  lastMeta = { model: r.model, route: r.route, requestId: r.requestId, finishReason: r.finishReason, outputTokens: r.outputTokens, wallClockSec: r.wallClockSec };
  return r;
};

console.log(`Jnoccio cheap-tier transport smoke (LIVE, FREE) — ${FIXTURES.length} fixtures x K=${K} via http://127.0.0.1:4317`);
console.log(`uniformity: temperature 0, max_tokens=16384 (clamp no-op); retry-on-invalid x${MAX_ATTEMPTS} (re-routes); recording resolved upstream per call.\n`);

const rows = [];
const distinctValidModels = new Set();
let validCount = 0, total = 0, truncations = 0;
const t0 = Date.now();

for (const fx of FIXTURES) {
  let lock, manifest, planMd;
  try {
    lock = rj(`fixtures/${fx}/plan.lock.json`);
    manifest = rj(`fixtures/${fx}/outcome-manifest.json`);
    planMd = readFileSync(resolve(ROOT, `fixtures/${fx}/plan.md`), 'utf8');
  } catch (e) {
    console.log(`  ! skip fixture '${fx}': ${e.message}`);
    continue;
  }
  for (let k = 0; k < K; k++) {
    total++;
    let valid = false, reason = '', beads = 0, gaps = 0, attempts = 0;
    let meta = {};
    const tCall = Date.now();
    // Retry-on-invalid (A8): a truncated / non-JSON / errored attempt is re-run; because jnoccio
    // routes adaptively, each retry RE-ROUTES (usually to a different upstream), so the method
    // recovers from a single weak draw. Exhausted attempts score as a hard miss.
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      attempts = attempt;
      lastMeta = null;
      try {
        const { snapshot, gaps: g } = await singleSession.run({ name: fx, lock, planMd, dir: ROOT }, { invoke: capturing });
        beads = (snapshot.beads || []).length;
        gaps = (g || []).length;
        const v = validateSnapshot(snapshot);
        valid = v.ok; reason = v.reason;
      } catch (e) {
        valid = false; reason = `run threw: ${e.message.slice(0, 120)}`;
      }
      meta = lastMeta || {};
      if (valid) break;
    }
    const secs = ((Date.now() - tCall) / 1000).toFixed(1);
    if (meta.finishReason === 'length') truncations++;
    if (valid) { validCount++; if (meta.model) distinctValidModels.add(meta.model); }
    const row = { fx, k, attempts, model: meta.model || '(none)', route: meta.route || '', beads, gaps, valid, reason, finish: meta.finishReason || '', outTok: meta.outputTokens || 0, secs };
    rows.push(row);
    console.log(`  [${fx} r${k}] ${valid ? 'VALID  ' : 'INVALID'} try=${attempts}/${MAX_ATTEMPTS} beads=${String(beads).padStart(3)} oq=${String(gaps).padStart(2)} finish=${(row.finish || '?').padEnd(6)} ${secs}s  <- ${row.model}${valid ? '' : `  (${reason})`}`);
  }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`\n=== E0.5 SMOKE RESULT ===`);
console.log(`valid snapshots: ${validCount}/${total} (${((validCount / total) * 100).toFixed(0)}%)   |   distinct upstreams that produced a VALID snapshot: ${distinctValidModels.size}`);
console.log(`distinct valid upstreams: ${[...distinctValidModels].join(', ') || '(none)'}`);
console.log(`truncations (finish_reason=length): ${truncations}/${total}   |   spend: $0 (free tier)   |   wall-clock: ${elapsed}s`);

const PASS = distinctValidModels.size >= 4 && validCount / total >= 0.6;
const NEAR = distinctValidModels.size >= 2 && validCount / total >= 0.5;
let verdict;
if (PASS) verdict = `PASS — the gateway transport produces valid snapshots across >=4 distinct cheap upstreams. E0.5 transport is GO; wire it as a battery mode for the grids.`;
else if (NEAR) verdict = `PARTIAL — transport works but the bar (>=4 distinct valid upstreams AND >=60% valid) was not met (${distinctValidModels.size} distinct, ${((validCount / total) * 100).toFixed(0)}% valid). Raise --k to exercise more routes, and tighten the JSON-discipline / retry path for the weaker upstreams (A8).`;
else verdict = `FAIL — too few valid snapshots (${validCount}/${total}). Inspect the INVALID rows above (non-JSON disobedience vs gateway errors) before relying on the cheap tier.`;
console.log(`\nVERDICT: ${verdict}`);
