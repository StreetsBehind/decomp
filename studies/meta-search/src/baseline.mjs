// The co-measured ALL-FRONTIER baseline (DESIGN §2 / §7). Interim that baseline is the admissible reliable
// proxy = OPUS-WHOLE (one opus call sees the whole epic and emits one module — MCOH25's $0.25 / 100%-X-CUT
// / 100%-INTEG reference at N=5). The final cost-WIN is gated on the cost-optimized ROUTED baseline (the
// external workstream, STATE.md #3); every interim cost claim measured against this proxy is PROVISIONAL.
//
// The baseline is built through the SAME scorecard path (scorecard.mjs) as candidates over the SAME core
// epics, so its per-cell pass-vector keys (`epic::bucket::name`) span the anchor pair and line up with a
// candidate's for the per-cell non-inferiority veto (§6/§4.4). It is co-measured (re-built per loop-run,
// not a stored constant — finding #5); a cached fallback (the MCOH25 anchor) is provided for offline/pilot.
//
// Note (the pre-registered N=5 situation): opus-whole is ~perfect on the lethal buckets at N=5 (X-CUT 100%,
// INTEG 100%, MCOH25). Per-cell NON-INFERIORITY to a perfect baseline is therefore effectively a 100%-on-
// lethal bar at N=5 — which is exactly why FREEZE/A1 pre-registers the cost arm as "expected to fail K1 at
// N=5" and makes P1's question the MECHANISM (does the checker MOVE crosscut/integration), not the win.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { makeLedger } from './ledger.mjs';
import { buildScorecard } from './scorecard.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', '..', 'build-gap');

const SYS_WHOLE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements and exports ALL of the requested functions. No prose, no explanation, no markdown code fences.';

async function loadWhole(epicName) {
  const dir = path.join(BUILD_GAP, 'epics', epicName);
  const testsPath = path.join(dir, 'tests.mjs');
  const tests = await import(url.pathToFileURL(testsPath).href);
  const order = Array.isArray(tests.EXPECTS) ? tests.EXPECTS.slice() : [];
  const preamble = fs.readFileSync(path.join(dir, 'preamble.md'), 'utf8');
  const surfaces = Object.fromEntries(order.map((s) => [s, fs.readFileSync(path.join(dir, 'surfaces', `${s}.md`), 'utf8')]));
  const cellNames = {
    wire: order.slice(),
    happy: (tests.happy || []).map((t) => t.name),
    crosscut: (tests.crosscut || []).map((t) => t.name),
    integration: (tests.integration || []).map((t) => t.name),
  };
  return { dir, testsPath, order, preamble, surfaces, cellNames };
}

function wholePrompt(fx) {
  const body = fx.order.map((s) => `### ${s}\n${fx.surfaces[s]}`).join('\n\n');
  return [
    '## Shared context (all surfaces use this)', fx.preamble,
    `\n## Your task — implement ALL of the following in ONE module that exports all ${fx.order.length} functions`,
    body,
    `\nExport exactly these functions: ${fx.order.join(', ')}. Return ONLY the one JavaScript module.`,
  ].join('\n');
}

// all-lethal-pass runs for the cached anchor (opus-whole is X-CUT/INTEG 100% at N=5, MCOH25).
function allPassRun(cellNames) {
  return {
    wire: { pass: cellNames.wire.length, total: cellNames.wire.length, wired: Object.fromEntries(cellNames.wire.map((n) => [n, true])) },
    happy: { pass: cellNames.happy.length, total: cellNames.happy.length, fails: [] },
    crosscut: { pass: cellNames.crosscut.length, total: cellNames.crosscut.length, fails: [] },
    integration: { pass: cellNames.integration.length, total: cellNames.integration.length, fails: [] },
  };
}

/**
 * Build the co-measured opus-whole baseline scorecard over the whole core (one combined scorecard whose
 * `cells` span every epic, for the per-cell veto). Returns a function so the driver can re-measure it per
 * loop-run (co-measured, not stored).
 * @param {object} p
 * @param {string[]} p.core            epic names
 * @param {'cached'|'live'} [p.mode]   'cached' = the MCOH25 anchor (no spend); 'live' = run opus-whole now
 * @param {Function} [p.invoke]        claudeInvoke (real frontier transport) — required for mode 'live'
 * @param {string} [p.model]
 * @param {number} [p.epicK]
 * @returns {()=>Promise<object>} a thunk returning the combined baseline scorecard
 */
export function makeBaseline({ core, mode = 'cached', invoke = null, model = 'claude-opus-4-8', epicK = 1 } = {}) {
  const evaluateEpicP = mode === 'live' ? import('../../build-gap/lib/epic-sandbox.mjs').then((m) => m.evaluateEpic) : null;
  return async function baseline() {
    const ledger = makeLedger();
    const epics = [];
    for (const epicName of core) {
      const fx = await loadWhole(epicName);
      if (mode === 'live') {
        const evaluateEpic = await evaluateEpicP;
        const runs = [];
        for (let k = 0; k < epicK; k++) {
          let moduleText = '';
          try {
            const g = await invoke({ prompt: wholePrompt(fx), system: SYS_WHOLE, model });
            moduleText = g.text || '';
            ledger.charge('baseline-opus-whole', { model, inputTokens: 1500, outputTokens: g.outputTokens || 3000, usd: g.usd });
          } catch { ledger.charge('baseline-opus-whole', { model, inputTokens: 1500, outputTokens: 3000 }); }
          runs.push(await evaluateEpic({ mode: 'whole', moduleText, testsPath: fx.testsPath }));
        }
        epics.push({ name: epicName, cellNames: fx.cellNames, runs });
      } else {
        ledger.charge('baseline-opus-whole', { model: 'opus', inputTokens: 1500, outputTokens: 3000 }); // ≈ $0.247/epic
        epics.push({ name: epicName, cellNames: fx.cellNames, runs: [allPassRun(fx.cellNames)] });
      }
    }
    return buildScorecard({ genome: null, genomeHash: `baseline-opus-whole-${mode}:${core.join('+')}`, epics, ledger });
  };
}

export { loadWhole, wholePrompt };
