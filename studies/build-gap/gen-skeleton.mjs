#!/usr/bin/env node
// M-coh-2.5 (PROVENANCE): generate a frozen "skeleton" (shared contract) for an epic from the SAME
// inputs a /vision-style step would have — the data model (preamble), the product brief (policy-level
// intent), and the function specs — under a chosen tier. The output is written to --out and fed back into
// the existing harness via `epic-run.mjs --skeleton-file <out>`, so we can ask: does a CHEAP-generated
// skeleton build a cohesive epic, or is the one frontier call still needed (frontier merely AMORTIZED,
// not eliminated)?
//
// It deliberately does NOT see the hidden oracle. It sees what an architect sees. The brief states the
// POLICIES (tenant isolation, authz, profile safety) but not the mechanical contract (the membership
// record shape, the field whitelist) — so synthesizing the skeleton stays a real architecture task, not
// transcription. (Surface specs are under-specified by design; the brief supplies the cross-cutting intent.)
//
// Run:
//   node studies/build-gap/gen-skeleton.mjs --transport gateway        --out runs/skel-cheap-1.md  --label cheap-1
//   node studies/build-gap/gen-skeleton.mjs --transport claude-sonnet-4-6 --out runs/skel-sonnet.md --label sonnet
//   node studies/build-gap/gen-skeleton.mjs --transport claude-opus-4-8   --out runs/skel-opus.md   --label opus
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { makeGatewayInvoke, claudeInvoke } from '../../runner/model-client.mjs';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : def;
};

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const EPIC = arg('epic', 'workspace');
const EPIC_DIR = path.join(HERE, 'epics', EPIC);
const TRANSPORT = arg('transport', 'gateway'); // 'gateway' or a claude model id
const OUT = arg('out', null);
const LABEL = arg('label', TRANSPORT);
if (!OUT) { console.error('gen-skeleton: --out <path> is required'); process.exit(1); }

const SYS = 'You are a lead software architect. Output ONLY the requested contract document as markdown — no preamble, no commentary, no code fences around the whole thing.';

async function loadInputs() {
  const testsPath = path.join(EPIC_DIR, 'tests.mjs');
  const tests = await import(url.pathToFileURL(testsPath).href);
  const order = Array.isArray(tests.EXPECTS) ? tests.EXPECTS : [];
  if (!order.length) throw new Error(`epic '${EPIC}': tests.mjs must export EXPECTS`);
  const preamble = fs.readFileSync(path.join(EPIC_DIR, 'preamble.md'), 'utf8');
  const brief = fs.readFileSync(path.join(EPIC_DIR, 'brief.md'), 'utf8');
  const surfaces = order.map((s) => `### ${s}\n${fs.readFileSync(path.join(EPIC_DIR, 'surfaces', `${s}.md`), 'utf8')}`);
  return { order, preamble, brief, surfaces };
}

function genPrompt(inp) {
  return [
    'You are the lead architect for the system described below. It will be built by a team of engineers',
    'who each implement exactly ONE of the functions, in ISOLATION — they never see each other\'s code and',
    'cannot coordinate while building. Each engineer receives YOUR frozen contract verbatim, alongside',
    'their one task.',
    '',
    'Produce that frozen contract: the shared decisions every engineer must follow so their independently-',
    'built functions compose into ONE consistent, secure system. Pin down, concretely:',
    '  (a) the exact shape of any data that more than one function must write and then read, so two',
    '      engineers cannot represent the same thing differently; and',
    '  (b) the cross-cutting policies (tenant isolation, authorization, data-integrity) that each relevant',
    '      function must enforce — and state WHICH functions each policy applies to, so none is forgotten.',
    'Be concrete and prescriptive. Do NOT implement the functions. Output ONLY the contract, as markdown.',
    '',
    '--- DATA MODEL (the shared `ctx` every function receives) ---',
    inp.preamble,
    '',
    '--- PRODUCT BRIEF (the rules the system must uphold) ---',
    inp.brief,
    '',
    '--- THE FUNCTIONS (each built by a different engineer, in isolation) ---',
    inp.surfaces.join('\n\n'),
  ].join('\n');
}

const gateway = makeGatewayInvoke({ timeoutMs: 240000 });
function invokerFor(transport) {
  if (transport === 'gateway') return { invoke: gateway, model: null };
  return { invoke: claudeInvoke, model: transport };
}

(async () => {
  const inp = await loadInputs();
  const t = invokerFor(TRANSPORT);
  const prompt = genPrompt(inp);
  let g;
  try {
    g = await t.invoke({ prompt, system: SYS, model: t.model });
  } catch (e) {
    console.error(`gen-skeleton [${LABEL}] FAILED: ${String(e.message).slice(0, 200)}`);
    process.exit(2);
  }
  const text = (g.text || '').trim();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text + '\n');
  const meta = {
    label: LABEL, transport: TRANSPORT, epic: EPIC, out: path.relative(path.join(HERE, '..', '..'), OUT),
    model: g.model ?? t.model ?? null, route: g.route ?? null, usd: g.usd ?? 0,
    outputTokens: g.outputTokens ?? 0, wallClockSec: g.wallClockSec ?? 0, chars: text.length,
  };
  fs.writeFileSync(OUT.replace(/\.md$/, '') + '.meta.json', JSON.stringify(meta, null, 2) + '\n');
  console.error(`gen-skeleton [${LABEL}] -> ${meta.out}  (${meta.chars} chars, model=${meta.model || 'n/a'}, route=${meta.route || 'n/a'}, $${(meta.usd || 0).toFixed(3)})`);
})();
