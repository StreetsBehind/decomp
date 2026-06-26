#!/usr/bin/env node
// MULTI-PASS COLLECTION (the pre-registered fallback, AMENDMENTS.md 2026-06-25; free-gateway, NEVER Phase-2).
// The $0 conditioned diagnostic (LEVER-B-DIAGNOSTIC.md) found the named cells' sole-semantic-residual subset is
// THIN (approval n=2–4 per 16 draws; quota n=0, drift-dominated). This collector draws MANY fresh raw builds
// from the same non-stationary free gateway to ENLARGE that subset for a variance-robust unanimous-failure (C)
// read — and to surface drift-free quota draws that isolate conservation from the container-drift confound.
//
// BUILD-ONLY by design: it dumps the RAW cheap-model builds (no gates, no model route-backs) so the expensive
// gateway collection is separated from the CHEAP, reproducible, $0 offline conditioning (diag-lever-b.mjs
// --dumps dump-multipass conditions these exactly like the ladder dumps). Re-sampling the SAME pool is NOT
// model-selection (Premise #1) — it is more draws of the adversarial mixture.
//
// $0 (free gateway). Dumps incrementally to runs/<out>/<cell>-d<k>/raw/<surface>.mjs (partial results survive a
// kill). Usage: node collect-multipass.mjs [--cells a,b] [--k 32] [--out dump-multipass] [--conc 8]

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { makeGatewayInvoke } from '../../runner/model-client.mjs';
import { loadEpicCtx } from './src/label-draw.mjs';
import { spawn } from 'node:child_process';
import os from 'node:os';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', 'build-gap');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const CELLS = arg('cells', 'approval-d2,approval-d3,approval-d4,quota-d3,quota-d4').split(',').map((s) => s.trim()).filter(Boolean);
const K = parseInt(arg('k', '32'), 10);
const OUT = arg('out', 'dump-multipass');
const CONC = parseInt(arg('conc', '8'), 10);
const RETRY = parseInt(arg('retry', '3'), 10);
const SYS_ONE = 'You are an expert software engineer. Output ONLY a single JavaScript ES module that implements the one requested function. No prose, no explanation, no markdown code fences.';

function isValidSurface(code, surface, timeoutMs = 8000) {
  const VALIDATE = path.join(BUILD_GAP, 'lib', 'validate-surface.mjs');
  if (!code || code.length < 10) return Promise.resolve(false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmp-'));
  const f = path.join(dir, `${surface}.mjs`); fs.writeFileSync(f, code);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VALIDATE, f, surface], { stdio: 'ignore', env: { ...process.env, NODE_OPTIONS: '' } });
    let done = false; const fin = (ok) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(ok); };
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} fin(false); }, timeoutMs);
    child.on('close', (c) => fin(c === 0)); child.on('error', () => fin(false));
  });
}

async function pool(items, conc, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

async function main() {
  const invoke = makeGatewayInvoke({ timeoutMs: 60000 });
  const drawSurface = async (prompt, surface) => {
    let text = '';
    for (let a = 1; a <= RETRY; a++) {
      let g; try { g = await invoke({ prompt, system: SYS_ONE, model: null }); } catch { continue; }
      text = g.text || text;
      if (await isValidSurface(g.text, surface)) return g.text;
    }
    return text;
  };

  console.log(`MULTI-PASS COLLECTION — $0 free gateway — cells ${CELLS.join(',')} × k=${K} → runs/${OUT}\n`);
  const ctxCache = {};
  for (const cell of CELLS) {
    if (!ctxCache[cell]) ctxCache[cell] = await loadEpicCtx(cell);
    const ctx = ctxCache[cell];
    let valid = 0;
    for (let k = 1; k <= K; k++) {
      const rawDir = path.join(HERE, 'runs', OUT, `${cell}-d${k}`, 'raw');
      if (fs.existsSync(rawDir) && fs.readdirSync(rawDir).length >= ctx.order.length) { continue; } // resume: skip done
      fs.mkdirSync(rawDir, { recursive: true });
      const results = await pool(ctx.order, CONC, async (surface) => {
        const code = await drawSurface(ctx.prompts[surface], surface);
        fs.writeFileSync(path.join(rawDir, `${surface}.mjs`), code || '');
        return !!(code && code.trim());
      });
      const nValid = results.filter(Boolean).length;
      if (nValid === ctx.order.length) valid++;
      process.stdout.write(`  ${cell} d${k}/${K}: ${nValid}/${ctx.order.length} surfaces present\n`);
    }
    console.log(`  => ${cell}: ${valid}/${K} draws all-surfaces-present\n`);
  }
  console.log(`DONE — dumped to runs/${OUT}. Condition with: node diag-lever-b.mjs --dumps ${OUT} --k ${K}`);
}
main().catch((e) => { console.error(e?.stack || e); process.exit(1); });
