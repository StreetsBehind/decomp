// The SELF-REPAIR gate (co-evolution rung-1, the broken-code (B) output-QA lever).
//
// WHY this exists. The 2026-06-19 worst-tail census (COEVO-RUNG1-PROGRESS.md, CENSUS RESULT) found the
// worst-of-K-GATING draw is `route-incompetence` in 4/4 arms — a cheap route emitting broken code that
// CRASHES AT RUNTIME when the oracle calls it:
//   `bio is not defined`               (quota draw4/B-draw5: createWallet references an undeclared variable)
//   `generateUniqueId is not defined`  (approval draw4: createRequest calls a helper it never defined)
// None of the four existing levers (shape / contract / persistence / seam) touches this: they all assume the
// code ALREADY RUNS and fix seams/obligations on functioning modules. And structural validation
// (validate-surface.mjs) only checks import + export — these bugs live INSIDE the function body and surface
// only on invocation, so the broken module sails through to grading and floors every test.
//
// This is the FIRST lever in the "turn a shit model into a golden goose" class (memory:
// incompetence-is-the-target): cheap-model incompetence is the TARGET, not a (C) boundary. The fix is
// model-AGNOSTIC and oracle-blind — it iterates the SAME cheap pool on its OWN output; it never selects or
// excludes a model.
//
// MECHANISM (deterministic detection, model route-back repair — mirrors shape-gate):
//   1. SMOKE each surface in a child (gates/lib/smoke-run.mjs): invoke it under self-vivifying Proxy ctx+args
//      so it runs deep without the harness throwing TypeErrors; capture only genuine `X is not defined` /
//      `X is not a function` ReferenceErrors. High-precision by construction (if it reports a free id, the
//      code genuinely references an undefined symbol); false negatives are fine (a guard may return early).
//   2. for each surface with a free id, REPAIR via a route-back that anchors on the surface's own code + the
//      exact runtime error + a "define-or-remove, preserve every guard" instruction; re-smoke; iterate up to
//      repairDepth; accept the first clean+structurally-valid result.
//
// ORACLE-BLINDNESS (kill K3 — identical contract to checker/shape/contract gates): the repair prompt reads
// ONLY public inputs (the build prompt, the candidate's own code, the runtime error). Every prompt is run
// through scanOracleLeak; a hit voids the candidate (leak=true).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { scanOracleLeak } from './checker.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const SMOKE = path.join(HERE, '..', 'gates', 'lib', 'smoke-run.mjs');

// run the permissive-harness smoke for one surface's CODE in an isolated child with a hard timeout.
// returns { freeIds: string[], errors: string[] }. A timeout / spawn error is treated as "no signal" ({}).
export function smokeSurface(code, surface, timeoutMs = 8000) {
  if (!code || code.length < 10) return Promise.resolve({ freeIds: [], errors: ['empty'] });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repair-'));
  const f = path.join(dir, `${surface}.mjs`);
  fs.writeFileSync(f, code);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SMOKE, f, surface], { stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, NODE_OPTIONS: '' } });
    const chunks = [];
    let done = false;
    const finish = (val) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(val); };
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} finish({ freeIds: [], errors: ['timeout'] }); }, timeoutMs);
    child.stdout.on('data', (d) => chunks.push(d));
    child.on('close', () => { try { finish(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { finish({ freeIds: [], errors: ['parse'] }); } });
    child.on('error', () => finish({ freeIds: [], errors: ['spawn'] }));
  });
}

function repairPrompt(originalPrompt, freeIds, currentCode) {
  const ids = freeIds.map((x) => `\`${x}\``).join(', ');
  return [
    originalPrompt, '',
    currentCode ? `## Your current implementation of this surface (fix ONLY the bug below, keep everything else intact):\n\`\`\`js\n${currentCode}\n\`\`\`` : '',
    '## Runtime error from executing your module:',
    `- ReferenceError: the identifier(s) ${ids} are USED but never declared, imported, or passed in, so the module throws as soon as that line runs (e.g. "${freeIds[0]} is not defined"). A common cause is calling a helper (an id generator, a formatter) that you assumed exists. DEFINE each one (add the local helper / constant) or REMOVE the reference, whichever keeps the intended behaviour.`,
    '\nReturn your current implementation with ONLY this bug fixed. Preserve every existing authorization, tenancy, ownership, conservation, idempotency, and input-validation check EXACTLY as written — do not drop or weaken any guard. Output ONLY the corrected JavaScript module.',
  ].join('\n');
}

/**
 * Run the self-repair gate over a fully-built epic's surfaces. Mirrors runShapeGate's signature so the
 * harness can compose it (it runs FIRST — broken code blocks every other lever). Mutates `files` on repair.
 * @returns {Promise<{files, ranGate, kind, surfacesFlagged, freeIds, repairs, fixed, leak, detail}>}
 */
export async function runRepairGate({ surfaces, files, prompts, gate, rebuild }) {
  const off = (extra = {}) => ({ files, ranGate: false, kind: gate?.kind || 'off', surfacesFlagged: 0, freeIds: 0, repairs: 0, fixed: 0, leak: false, detail: [], ...extra });
  if (!gate || gate.kind === 'off') return off();

  const maxRepairs = Math.max(0, gate.repairDepth || 0);
  let surfacesFlagged = 0, freeIdCount = 0, repairs = 0, fixed = 0;
  const detail = [];

  for (const surface of surfaces) {
    if (!(surface in files)) continue;
    let flagged = false, cleared = false;
    for (let pass = 0; pass <= maxRepairs; pass++) {
      const sm = await smokeSurface(files[surface], surface);
      if (!sm.freeIds || !sm.freeIds.length) { if (flagged) { cleared = true; } break; }
      if (!flagged) { flagged = true; surfacesFlagged++; freeIdCount += sm.freeIds.length; detail.push({ surface, freeIds: sm.freeIds.slice() }); }
      if (pass === maxRepairs) break;                  // out of budget → ship; the oracle still grades it
      const rp = repairPrompt(prompts[surface] || '', sm.freeIds, files[surface]);
      if (scanOracleLeak(rp)) return { files, ranGate: true, kind: gate.kind, surfacesFlagged, freeIds: freeIdCount, repairs, fixed, leak: true, detail };
      let code; try { code = await rebuild(surface, rp); } catch { code = ''; }
      if (!code || !code.trim()) break;                // repair build failed (or deterministic-replay noop) → keep current
      files[surface] = code; repairs++;
    }
    if (cleared) { fixed++; const d = detail.find((x) => x.surface === surface); if (d) d.fixed = true; }
  }
  return { files, ranGate: true, kind: gate.kind, surfacesFlagged, freeIds: freeIdCount, repairs, fixed, leak: false, detail };
}
