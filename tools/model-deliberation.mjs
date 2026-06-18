#!/usr/bin/env node
// Structured GPT/OpenAI x Claude Opus deliberation for decomp next-step decisions.
// Default is dry-run. Use --live only when spending provider tokens is intended.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnCapture, parseClaudeJson, stripCodeFences } from '../runner/model-client.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DEFAULT_CONTEXT = [
  'STATE.md',
  'studies/meta-search/COEVO-RUNG1-PROGRESS.md',
  'studies/meta-search/COEVOLUTION-SPEC.md',
  'studies/meta-search/P2c-RESULTS.md',
];
const DEFAULT_QUESTION = 'Given the current state of this repo, should the next research step be: (A) go deeper to find the erosion frontier, (B) move toward freeze, or (C) do a smaller preparatory action first? Return concrete next steps, risks, and the evidence that would change the decision.';
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';
const DEFAULT_CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8';
const DEFAULT_OPENAI_PROVIDER = process.env.OPENAI_PROVIDER || 'codex';
const DEFAULT_CODEX_BIN = process.env.CODEX_BIN || '/home/cstaulbee/.openclaw/npm/node_modules/@openai/codex/bin/codex.js';

function parseArgs(argv) {
  const opts = {
    live: false,
    rounds: 4,
    question: DEFAULT_QUESTION,
    context: DEFAULT_CONTEXT.slice(),
    outDir: 'runs/deliberations',
    openaiModel: DEFAULT_OPENAI_MODEL,
    openaiProvider: DEFAULT_OPENAI_PROVIDER,
    codexBin: DEFAULT_CODEX_BIN,
    claudeModel: DEFAULT_CLAUDE_MODEL,
    maxTokens: 1800,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--live') opts.live = true;
    else if (a === '--dry-run') opts.live = false;
    else if (a === '--rounds') opts.rounds = Number(argv[++i]);
    else if (a === '--question') opts.question = argv[++i] || '';
    else if (a === '--context') opts.context = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--out-dir') opts.outDir = argv[++i] || opts.outDir;
    else if (a === '--openai-model') opts.openaiModel = argv[++i] || opts.openaiModel;
    else if (a === '--openai-provider') opts.openaiProvider = argv[++i] || opts.openaiProvider;
    else if (a === '--codex-bin') opts.codexBin = argv[++i] || opts.codexBin;
    else if (a === '--claude-model') opts.claudeModel = argv[++i] || opts.claudeModel;
    else if (a === '--max-tokens') opts.maxTokens = Number(argv[++i]);
    else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
    else throw new Error('unknown argument: ' + a);
  }
  opts.rounds = Math.max(2, Math.min(8, Math.floor(Number.isFinite(opts.rounds) ? opts.rounds : 4)));
  opts.maxTokens = Math.max(256, Math.floor(Number.isFinite(opts.maxTokens) ? opts.maxTokens : 1800));
  return opts;
}

function usage() {
  console.log([
    'Usage:',
    '  node tools/model-deliberation.mjs --dry-run',
    '  node tools/model-deliberation.mjs --live [--rounds 4] [--question "..."]',
    '',
    'Options:',
    '  --live                 Call OpenAI + Claude. Default is dry-run.',
    '  --rounds N             Back-and-forth turns, 2-8. Default 4.',
    '  --question TEXT        Decision question to debate.',
    '  --context a,b,c        Comma-separated repo-relative context files.',
    '  --out-dir DIR          Output directory. Default runs/deliberations.',
    '  --openai-model MODEL   Default ' + DEFAULT_OPENAI_MODEL + '.',
    '  --openai-provider P    codex or api. Default ' + DEFAULT_OPENAI_PROVIDER + '.',
    '  --codex-bin FILE       Codex CLI JS path. Default ' + DEFAULT_CODEX_BIN + '.',
    '  --claude-model MODEL   Default ' + DEFAULT_CLAUDE_MODEL + '.',
    '  --max-tokens N         Per-turn response budget hint. Default 1800.',
  ].join('\n'));
}

function readContext(files) {
  const chunks = [];
  for (const rel of files) {
    const full = path.resolve(ROOT, rel);
    if (!full.startsWith(ROOT + path.sep) && full !== ROOT) throw new Error('context path escapes repo: ' + rel);
    if (!fs.existsSync(full)) {
      chunks.push('# ' + rel + '\n[MISSING]');
      continue;
    }
    const text = fs.readFileSync(full, 'utf8');
    chunks.push('# ' + rel + '\n' + text.slice(0, 28000) + (text.length > 28000 ? '\n[TRUNCATED]' : ''));
  }
  return chunks.join('\n\n---\n\n');
}

function transcriptText(turns) {
  return turns.map((t, i) => {
    const cost = t.usd === null || t.usd === undefined ? '' : ' cost=$' + Number(t.usd).toFixed(4);
    return '## Turn ' + (i + 1) + ': ' + t.speaker + ' (' + t.model + ')' + cost + '\n\n' + t.text.trim() + '\n';
  }).join('\n');
}

function buildPrompt({ role, question, context, turns }) {
  return [
    'You are ' + role + ' in a two-model deliberation about the decomp repo.',
    '',
    'Objective: help choose the next concrete research step. Be specific, adversarial where useful, and grounded in the provided repo context.',
    '',
    'Rules:',
    '- Do not invent experiments or results not supported by context.',
    '- Separate known evidence from assumptions.',
    '- Prefer a small next action that would change a decision over a broad research wishlist.',
    '- Call out failure modes and what evidence would reverse your recommendation.',
    '- End with a concise recommendation.',
    '',
    'Decision question: ' + question,
    '',
    'Repo context:',
    context,
    '',
    'Prior turns:',
    turns.length ? transcriptText(turns) : '[none yet]',
  ].join('\n');
}

async function openaiInvoke({ prompt, model, maxTokens }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is required for --live');
  const endpoint = process.env.OPENAI_ENDPOINT || 'responses';
  const start = process.hrtime.bigint();
  if (endpoint === 'chat') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a rigorous technical strategy reviewer. Return concise markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
      }),
    });
    const body = await res.text();
    if (!res.ok) throw new Error('OpenAI HTTP ' + res.status + ': ' + body.slice(0, 1000));
    const raw = JSON.parse(body);
    return {
      text: stripCodeFences(raw.choices?.[0]?.message?.content || ''),
      outputTokens: raw.usage?.completion_tokens || 0,
      usd: null,
      wallClockSec: Number(process.hrtime.bigint() - start) / 1e9,
      rawModel: raw.model || model,
    };
  }
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: 'You are a rigorous technical strategy reviewer. Return concise markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_output_tokens: maxTokens,
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error('OpenAI HTTP ' + res.status + ': ' + body.slice(0, 1000));
  const raw = JSON.parse(body);
  const text = raw.output_text || (raw.output || []).flatMap((item) => item.content || []).map((part) => part.text || '').join('\n');
  return {
    text: stripCodeFences(text),
    outputTokens: raw.usage?.output_tokens || 0,
    usd: null,
    wallClockSec: Number(process.hrtime.bigint() - start) / 1e9,
    rawModel: raw.model || model,
  };
}

async function codexInvoke({ prompt, model, codexBin }) {
  if (!fs.existsSync(codexBin)) throw new Error('Codex CLI not found: ' + codexBin);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'decomp-codex-'));
  const outFile = path.join(dir, 'last-message.md');
  const argv = [
    codexBin,
    'exec',
    '--ephemeral',
    '-C', ROOT,
    '-s', 'read-only',
    // NOTE: codex-cli >=0.130 dropped `-a/--ask-for-approval`; `exec` is non-interactive (no approval prompts) by design.
    '-m', model,
    '--output-last-message', outFile,
    '-',
  ];
  const start = process.hrtime.bigint();
  try {
    await spawnCapture('node', argv, { input: prompt, timeoutMs: 900000 });
    const text = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
    return {
      text: stripCodeFences(text),
      outputTokens: 0,
      usd: null,
      wallClockSec: Number(process.hrtime.bigint() - start) / 1e9,
      rawModel: model,
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function claudeOpusInvoke({ prompt, model, maxTokens }) {
  const argv = [
    '-p',
    '--output-format', 'json',
    '--model', model,
    '--max-turns', '1',
    '--allowedTools', '',
    '--append-system-prompt', 'You are a rigorous technical strategy reviewer. Return concise markdown. Keep the response under about ' + maxTokens + ' tokens.',
  ];
  const start = process.hrtime.bigint();
  const { stdout } = await spawnCapture('claude', argv, { input: prompt, timeoutMs: 900000 });
  const parsed = parseClaudeJson(stdout);
  return {
    text: parsed.text,
    outputTokens: parsed.outputTokens,
    usd: parsed.usd,
    wallClockSec: Number(process.hrtime.bigint() - start) / 1e9,
    rawModel: model,
  };
}

async function dryInvoke({ speaker, model, turns }) {
  const n = turns.length + 1;
  const angle = speaker === 'gpt-5.5'
    ? 'prioritize the decision frame, explicit tradeoffs, and a crisp experiment design'
    : 'attack weak assumptions, identify missing evidence, and tighten the next action';
  return {
    text: '[dry-run turn ' + n + '] ' + speaker + ' would ' + angle + '.\n\nRecommendation placeholder: run a bounded strategy review, preserve transcript, then promote only the final decision brief into tracked docs.',
    outputTokens: 0,
    usd: 0,
    wallClockSec: 0,
    rawModel: model,
  };
}

async function synthesize({ question, contextFiles, turns, opts }) {
  const mentions = [];
  for (const t of turns) {
    const lower = t.text.toLowerCase();
    if (lower.includes('freeze')) mentions.push(t.speaker + ' discussed freeze readiness.');
    if (lower.includes('erosion')) mentions.push(t.speaker + ' discussed the erosion frontier.');
    if (lower.includes('risk') || lower.includes('failure')) mentions.push(t.speaker + ' named risks or failure modes.');
  }
  return [
    '# Model deliberation brief',
    '',
    '- Question: ' + question,
    '- OpenAI model: ' + opts.openaiModel,
    '- Claude model: ' + opts.claudeModel,
    '- Mode: ' + (opts.live ? 'live' : 'dry-run'),
    '- Context: ' + contextFiles.join(', '),
    '',
    '## Provisional read',
    '',
    opts.live
      ? 'Review the transcript below before acting. This scaffold intentionally avoids auto-editing repo strategy docs from model output.'
      : 'Dry-run only. Use npm run deliberate:live -- --question "..." to spend tokens and get real model output.',
    '',
    '## Signals to inspect',
    '',
    ...(mentions.length ? Array.from(new Set(mentions)).slice(0, 8).map((x) => '- ' + x) : ['- No real model signals in dry-run mode.']),
    '',
    '## Transcript',
    '',
    transcriptText(turns),
  ].join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const context = readContext(opts.context);
  const turns = [];
  const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const outDir = path.resolve(ROOT, opts.outDir, runId);
  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < opts.rounds; i++) {
    const isOpenAI = i % 2 === 0;
    const speaker = isOpenAI ? 'gpt-5.5' : 'opus';
    const model = isOpenAI ? opts.openaiModel : opts.claudeModel;
    const role = isOpenAI
      ? 'GPT-5.5, acting as the strategy proposer and synthesis pressure-tester'
      : 'Claude Opus, acting as the adversarial critic and experiment-design reviewer';
    const prompt = buildPrompt({ role, question: opts.question, context, turns });
    const result = opts.live
      ? (isOpenAI
        ? (opts.openaiProvider === 'api'
          ? await openaiInvoke({ prompt, model, maxTokens: opts.maxTokens })
          : await codexInvoke({ prompt, model, codexBin: opts.codexBin }))
        : await claudeOpusInvoke({ prompt, model, maxTokens: opts.maxTokens }))
      : await dryInvoke({ speaker, model, turns });
    const turn = {
      speaker,
      model: result.rawModel || model,
      text: result.text,
      outputTokens: result.outputTokens,
      usd: result.usd,
      wallClockSec: result.wallClockSec,
    };
    turns.push(turn);
    fs.writeFileSync(path.join(outDir, 'turn-' + String(i + 1).padStart(2, '0') + '-' + speaker + '.md'), turn.text.trim() + '\n');
    console.error('turn ' + (i + 1) + '/' + opts.rounds + ': ' + speaker + ' (' + turn.model + ') ' + Math.round(turn.wallClockSec) + 's');
  }

  const manifest = {
    runId,
    mode: opts.live ? 'live' : 'dry-run',
    question: opts.question,
    context: opts.context,
    openaiModel: opts.openaiModel,
    openaiProvider: opts.openaiProvider,
    claudeModel: opts.claudeModel,
    turns: turns.map((t, i) => ({ index: i + 1, speaker: t.speaker, model: t.model, outputTokens: t.outputTokens, usd: t.usd, wallClockSec: t.wallClockSec })),
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'transcript.md'), transcriptText(turns));
  fs.writeFileSync(path.join(outDir, 'brief.md'), await synthesize({ question: opts.question, contextFiles: opts.context, turns, opts }));
  console.log(outDir);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});
