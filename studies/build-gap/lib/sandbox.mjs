// Parent-side sandbox: take a generated solution (raw JS module text), write it to a temp dir, and run
// the task's tests against it in an ISOLATED child process with a hard timeout. Returns the two-bucket
// pass counts (or a structured failure). Generated code never runs in this process.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const RUN_ONE = path.join(HERE, 'run-one.mjs');

// Strip markdown fences / leading prose a model may wrap the module in (the invokes also strip fences,
// but free models sometimes add a stray ```js or a sentence — be defensive).
export function extractModule(text) {
  let t = String(text || '').trim();
  const fence = t.match(/```(?:js|javascript|mjs)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  return t;
}

/**
 * @param {string} solutionCode  the model's JS module text (exports the task's function)
 * @param {string} testsPath     absolute path to the task's tests.mjs
 * @param {number} timeoutMs     hard cap on the child (default 10s)
 * @returns {Promise<{happy?:{pass,total,fails}, obligation?:{...}, importError?, harnessError?, timeout?, empty?}>}
 */
export function evaluate(solutionCode, testsPath, timeoutMs = 10000) {
  const code = extractModule(solutionCode);
  if (!code || code.length < 10) return Promise.resolve({ empty: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'buildgap-'));
  const solutionPath = path.join(dir, 'solution.mjs');
  fs.writeFileSync(solutionPath, code);

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [RUN_ONE, solutionPath, testsPath], {
      stdio: ['ignore', 'pipe', 'ignore'],
      // No network is not enforced at the OS level here; tasks are pure in-memory by construction.
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
    child.on('error', (e) => finish({ harnessError: String(e && e.message || e) }));
  });
}
