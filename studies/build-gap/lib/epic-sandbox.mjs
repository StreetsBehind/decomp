// Parent-side multi-module sandbox for the epic cohesion study. Takes either ONE whole-epic module
// (frontier-whole) or a SET of per-surface modules (cheap-isolated), writes them into one temp "repo",
// and runs the cohesion oracle in an isolated child process with a hard timeout. Returns the bucket
// counts (wire / happy / crosscut / integration) or a structured failure. Generated code never runs in
// this process.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { extractModule } from './sandbox.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const RUN_ONE = path.join(HERE, 'epic-run-one.mjs');

/**
 * @param {{ mode:'whole'|'isolated', moduleText?:string, files?:Record<string,string>, testsPath:string }} input
 *   - mode 'whole':    moduleText is ONE ES module exporting all surfaces.
 *   - mode 'isolated': files maps surfaceName -> that surface's module text (missing surface = unwired).
 * @param {number} timeoutMs
 * @returns {Promise<{wire,happy,crosscut,integration,importErr}|{harnessError|timeout|empty}>}
 */
export function evaluateEpic(input, timeoutMs = 15000) {
  const { mode, moduleText, files, testsPath } = input;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'epicgap-'));
  const descFiles = {};
  if (mode === 'whole') {
    const code = extractModule(moduleText);
    if (!code || code.length < 10) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} return Promise.resolve({ empty: true }); }
    const f = path.join(dir, 'index.mjs');
    fs.writeFileSync(f, code);
    descFiles.__whole__ = f;
  } else {
    for (const [surface, text] of Object.entries(files || {})) {
      const code = extractModule(text);
      if (!code || code.length < 10) continue; // leave it unwired
      const f = path.join(dir, `${surface}.mjs`);
      fs.writeFileSync(f, code);
      descFiles[surface] = f;
    }
  }
  const descPath = path.join(dir, '__desc.json');
  fs.writeFileSync(descPath, JSON.stringify({ mode, files: descFiles, testsPath }));

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [RUN_ONE, descPath], {
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, NODE_OPTIONS: '' },
    });
    let out = '';
    let done = false;
    const finish = (r) => { if (done) return; done = true; clearTimeout(timer); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(r); };
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} finish({ timeout: true }); }, timeoutMs);
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', () => {
      let parsed = null;
      try { parsed = JSON.parse(out.trim()); } catch {}
      finish(parsed || { harnessError: 'no/invalid child output', raw: out.slice(0, 200) });
    });
    child.on('error', (e) => finish({ harnessError: String((e && e.message) || e) }));
  });
}
