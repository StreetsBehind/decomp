// Model-invocation client for decomposition strategies.
//
// Two invokers with the SAME signature/return shape:
//   - claudeInvoke   : spawns the real `claude` CLI headless (single-shot, tools off).
//   - makeMockInvoke : returns canned responses deterministically (ZERO spend, no clock/network).
//
// Both are injected into a strategy via ctx = { signal, invoke }. A strategy never
// reaches for the CLI itself; it calls ctx.invoke(...) so the same code runs live or mocked.
//
// CHARTER §6: no new runtime deps — node builtins + the claude CLI only.
//
// ---------------------------------------------------------------------------
// RECORDED SAMPLE — claude CLI JSON shape (captured live 2026-06-01 against
// `claude -p "reply with the single word ok" --output-format json --model claude-haiku-4-5 --max-turns 1`).
//
// IMPORTANT: with `--output-format json` the CLI emits a JSON *array* of event
// objects. The last element is the terminal result we care about:
//
//   {
//     "type": "result",
//     "subtype": "success",
//     "is_error": false,
//     "duration_ms": 1957,
//     "num_turns": 1,
//     "result": "ok",                         // <- assistant text
//     "total_cost_usd": 0.05548875,           // <- usd
//     "usage": {
//       "input_tokens": 10,
//       "output_tokens": 41,                  // <- output tokens (total over iterations)
//       "cache_creation_input_tokens": 44219,
//       "cache_read_input_tokens": 0
//     },
//     "modelUsage": { "claude-haiku-4-5": { "outputTokens": 41, "costUSD": 0.055..., ... } }
//   }
//
// Some CLI versions / `--output-format` modes emit a SINGLE result object instead
// of an array. The parser below handles BOTH (array-of-events -> find type==="result";
// or a lone object). Every field is guarded — a missing optional never throws.
// ---------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import process from 'node:process';

/**
 * @typedef {Object} InvokeResult
 * @property {string} text          assistant text (markdown fences stripped)
 * @property {number} outputTokens  output tokens reported by the model (0 if unknown)
 * @property {number|null} usd       measured dollar cost (null if unknown)
 * @property {number} wallClockSec  wall-clock seconds for the call
 */

/**
 * @typedef {Object} InvokeArgs
 * @property {string}  prompt        the user prompt
 * @property {string}  [system]      appended system prompt (steers output to JSON-only)
 * @property {string}  [model]       pinned model id
 * @property {number}  [maxTurns]    max agent turns (default 1 = single-shot)
 * @property {string}  [role]        mock-only routing hint (see makeMockInvoke)
 * @property {string}  [fixtureName] mock-only routing hint (see makeMockInvoke)
 * @property {AbortSignal} [signal]  abort signal
 */

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TURNS = 1;
// A few seconds of model latency is normal, but a single-shot decompose of a large multi-feature
// plan emits a very large JSON and can run several minutes — a 5-min ceiling SIGTERMs it mid-stream.
// 10-min ceiling; callers can override per-call via args.timeoutMs (e.g. a short cap for tiny judge calls).
const DEFAULT_TIMEOUT_MS = 600_000;

/**
 * Strip a single wrapping markdown code fence (```json ... ``` or ``` ... ```) from text.
 * Defensive: returns the trimmed input unchanged when there is no fence.
 * @param {string} text
 * @returns {string}
 */
export function stripCodeFences(text) {
  if (typeof text !== 'string') return '';
  let t = text.trim();
  // Opening fence: ``` optionally followed by a language tag, then EOL.
  const open = /^```[^\n]*\n/;
  const close = /\n```$/;
  if (open.test(t) && close.test(t)) {
    t = t.replace(open, '').replace(close, '');
  }
  return t.trim();
}

/**
 * Parse the claude CLI `--output-format json` payload into our normalized fields.
 * Handles BOTH an array-of-events (find the terminal `type === "result"`) and a
 * lone result object. Every field is guarded; never throws on a missing optional.
 * On unparseable input, falls back to treating the whole string as the text.
 *
 * @param {string} stdout  raw CLI stdout
 * @returns {{ text: string, outputTokens: number, usd: number|null, durationMs: number|null }}
 */
export function parseClaudeJson(stdout) {
  const fallback = { text: typeof stdout === 'string' ? stdout.trim() : '', outputTokens: 0, usd: null, durationMs: null };
  if (typeof stdout !== 'string' || !stdout.trim()) return { ...fallback, text: '' };

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return fallback; // not JSON — hand back the raw text, don't throw
  }

  // Locate the result-bearing object.
  let result = null;
  if (Array.isArray(parsed)) {
    // Prefer an explicit terminal result event; else last array element.
    for (const ev of parsed) {
      if (ev && typeof ev === 'object' && ev.type === 'result') result = ev;
    }
    if (!result && parsed.length) {
      const last = parsed[parsed.length - 1];
      if (last && typeof last === 'object') result = last;
    }
  } else if (parsed && typeof parsed === 'object') {
    result = parsed;
  }

  if (!result || typeof result !== 'object') return fallback;

  // text: the CLI puts the assistant text in `result`; some shapes use `text`.
  let text = '';
  if (typeof result.result === 'string') text = result.result;
  else if (typeof result.text === 'string') text = result.text;

  // outputTokens: prefer the top-level usage.output_tokens.
  let outputTokens = 0;
  const usage = result.usage && typeof result.usage === 'object' ? result.usage : null;
  if (usage && Number.isFinite(usage.output_tokens)) outputTokens = usage.output_tokens;
  else if (usage && Number.isFinite(usage.outputTokens)) outputTokens = usage.outputTokens;

  // usd
  let usd = null;
  if (Number.isFinite(result.total_cost_usd)) usd = result.total_cost_usd;
  else if (Number.isFinite(result.cost_usd)) usd = result.cost_usd;

  // durationMs
  let durationMs = null;
  if (Number.isFinite(result.duration_ms)) durationMs = result.duration_ms;

  return { text: stripCodeFences(text), outputTokens, usd, durationMs };
}

/**
 * Run the claude CLI once, headless, single-shot, tools disabled.
 * @param {InvokeArgs} args
 * @returns {Promise<InvokeResult>}
 */
export async function claudeInvoke(args = {}) {
  const {
    prompt,
    system,
    model = DEFAULT_MODEL,
    maxTurns = DEFAULT_MAX_TURNS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  } = args;

  if (typeof prompt !== 'string' || !prompt) {
    throw new Error('claudeInvoke: prompt (non-empty string) is required');
  }

  // Build argv. Tools disabled for a clean single-shot: --allowedTools "" yields an
  // empty allow-set so the model cannot call any tool. The appended system prompt
  // reinforces "output only the requested JSON".
  const sys = system && typeof system === 'string'
    ? system
    : 'Output ONLY the requested JSON. No prose, no markdown code fences, no commentary.';

  // TRANSPORT: the prompt is piped via STDIN, not passed as an argv element. Big decompose
  // prompts (swarm's integrator, the no-audit re-expander, an archetype-primed single-session)
  // embed the whole current decomposition and blow past the OS argv limit (~32 KB on Windows;
  // FINDINGS §6.1 — 2/26 L1 runs failed exactly this way, with "no stdin data received"). `-p`
  // with NO positional reads the prompt from stdin, which the headless CLI wants anyway.
  const argv = [
    '-p',
    '--output-format', 'json',
    '--model', String(model),
    '--max-turns', String(Number.isFinite(maxTurns) ? maxTurns : DEFAULT_MAX_TURNS),
    '--allowedTools', '',
    '--append-system-prompt', sys,
  ];

  const start = process.hrtime.bigint();
  const { stdout } = await spawnCapture('claude', argv, { input: prompt, signal, timeoutMs });
  const end = process.hrtime.bigint();
  const measuredSec = Number(end - start) / 1e9;

  const { text, outputTokens, usd, durationMs } = parseClaudeJson(stdout);
  const wallClockSec = Number.isFinite(durationMs) && durationMs !== null ? durationMs / 1000 : measuredSec;

  return { text, outputTokens, usd, wallClockSec };
}

const MAX_STDOUT_BYTES = 64 * 1024 * 1024; // a full bead-graph JSON can be large

/**
 * Spawn a process, write `input` to its stdin, and capture stdout/stderr with a byte-bounded
 * buffer + timeout. Resolves { stdout, stderr } on exit code 0; rejects with a descriptive error
 * otherwise. Exported so the transport can be exercised against a stand-in binary without the
 * real CLI (see tools/transport-smoke.mjs).
 * @param {string} file
 * @param {string[]} argv
 * @param {{ input?: string, signal?: AbortSignal, timeoutMs?: number }} opts
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
export function spawnCapture(file, argv, opts = {}) {
  const { input = '', signal, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(file, argv, {
        signal,
        timeout: timeoutMs,
        killSignal: 'SIGTERM',
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (e) {
      reject(new Error(`${file} failed to spawn: ${e.message}`));
      return;
    }

    const out = [];
    const err = [];
    let outBytes = 0;
    let sizeKilled = false;

    child.stdout.on('data', (d) => {
      outBytes += d.length;
      if (outBytes > MAX_STDOUT_BYTES) { sizeKilled = true; child.kill('SIGKILL'); return; }
      out.push(d);
    });
    child.stderr.on('data', (d) => err.push(d));

    child.once('error', (e) => {
      const tail = err.length ? `\n${Buffer.concat(err).toString('utf8').slice(0, 2000)}` : '';
      reject(new Error(`${file} CLI failed: ${e.message}${tail}`));
    });
    child.once('close', (code, sigName) => {
      if (sizeKilled) { reject(new Error(`${file} output exceeded ${MAX_STDOUT_BYTES} bytes (killed)`)); return; }
      const stderr = Buffer.concat(err).toString('utf8');
      const stdout = Buffer.concat(out).toString('utf8');
      if (code === 0) { resolve({ stdout, stderr }); return; }
      const tail = stderr ? `\n${stderr.slice(0, 2000)}` : '';
      reject(new Error(`${file} CLI exited ${code === null ? `via signal ${sigName}` : `with code ${code}`}${tail}`));
    });

    // Deliver the prompt on stdin, then EOF. Ignore EPIPE if the child exited early.
    child.stdin.once('error', () => {});
    child.stdin.end(input, 'utf8');
  });
}

/**
 * Build a deterministic mock invoker. ZERO spend, no clock, no network.
 *
 * The scriptTable maps a ROUTING KEY -> a canned response. The routing key is
 * resolved from the invoke args, in priority order:
 *   1. `args.role`        (explicit role token the caller passes alongside the prompt)
 *   2. `args.fixtureName` (the fixture being decomposed)
 *   3. `"<fixtureName>::<role>"` composite (if both are present, tried FIRST)
 *   4. a substring scan of `args.prompt` for any table key (so a caller can embed
 *      a hint in the prompt text itself)
 *   5. a `"*"` wildcard entry, if present
 *
 * A canned entry is either a string (-> text only, canned token/usd defaults) or
 * an object { text, outputTokens?, usd?, wallClockSec? }. outputTokens/usd default
 * to fixed canned numbers so the cost-axis math is deterministic in tests.
 *
 * @param {Record<string, string | {text:string,outputTokens?:number,usd?:number,wallClockSec?:number}>} scriptTable
 * @param {{ defaultOutputTokens?: number, defaultUsd?: number, defaultWallClockSec?: number }} [defaults]
 * @returns {(args: InvokeArgs) => Promise<InvokeResult>}
 */
export function makeMockInvoke(scriptTable = {}, defaults = {}) {
  const dOut = Number.isFinite(defaults.defaultOutputTokens) ? defaults.defaultOutputTokens : 100;
  const dUsd = Number.isFinite(defaults.defaultUsd) ? defaults.defaultUsd : 0.001;
  const dSec = Number.isFinite(defaults.defaultWallClockSec) ? defaults.defaultWallClockSec : 0;

  function resolveKey(args) {
    const role = typeof args.role === 'string' ? args.role : null;
    const fixtureName = typeof args.fixtureName === 'string' ? args.fixtureName : null;

    if (fixtureName && role) {
      const composite = `${fixtureName}::${role}`;
      if (composite in scriptTable) return composite;
    }
    if (role && role in scriptTable) return role;
    if (fixtureName && fixtureName in scriptTable) return fixtureName;

    // Substring scan of the prompt for any table key (longest key first, so a more
    // specific hint wins over a shorter accidental substring match).
    if (typeof args.prompt === 'string') {
      const keys = Object.keys(scriptTable).filter((k) => k !== '*').sort((a, b) => b.length - a.length);
      for (const k of keys) {
        if (k && args.prompt.includes(k)) return k;
      }
    }
    if ('*' in scriptTable) return '*';
    return null;
  }

  return async function mockInvoke(args = {}) {
    const key = resolveKey(args);
    if (key === null) {
      throw new Error(
        `makeMockInvoke: no canned response for role=${args.role ?? 'n/a'} fixtureName=${args.fixtureName ?? 'n/a'}; ` +
        `known keys: ${Object.keys(scriptTable).join(', ') || '(none)'}`,
      );
    }
    const entry = scriptTable[key];
    if (typeof entry === 'string') {
      return { text: stripCodeFences(entry), outputTokens: dOut, usd: dUsd, wallClockSec: dSec };
    }
    return {
      text: stripCodeFences(typeof entry.text === 'string' ? entry.text : ''),
      outputTokens: Number.isFinite(entry.outputTokens) ? entry.outputTokens : dOut,
      usd: entry.usd === null ? null : (Number.isFinite(entry.usd) ? entry.usd : dUsd),
      wallClockSec: Number.isFinite(entry.wallClockSec) ? entry.wallClockSec : dSec,
    };
  };
}
