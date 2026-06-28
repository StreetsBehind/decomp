// SMOKE — the OBLIGATION-INJECT (A) half wired into coevo-rung1.mjs's build path (--inject).
// Validates the contract the runner relies on at coevo-rung1.mjs:226 —
//   let buildPrompt = chunkPrompt(...); if (INJECT) { const add = injectSemanticBlock(surface, rules, order);
//     if (add) buildPrompt += '\n' + add; }
// i.e. (1) the addendum is the skeleton-DERIVED semantic obligation for APPLICABLE surfaces, (2) it is the EMPTY
// string for non-applicable surfaces and no-semantic topologies → buildPrompt is byte-identical (the default-OFF /
// no-op guarantee), (3) it carries no oracle leak. Oracle-blind: reads only PUBLIC skeleton.md + surface NAMES
// (never epics/*/tests.mjs).
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { semanticRules, injectBlock, verifyApplicable, EXECUTE_VERB, SPEND_VERB } from '../src/semantic-obligation.mjs';
import { scanOracleLeak } from '../src/checker.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const MS = path.resolve(HERE, '..');
const BUILD_GAP = path.resolve(MS, '..', 'build-gap');
const readSkel = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const surfNames = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')) : [];

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ✗', msg); } };

// ---- 1) APPROVAL: approve→execute + execute-idempotency fire on the execute-verb surfaces -----------------
{
  const dir = path.join(MS, 'epics', 'approval-d4');
  const skel = readSkel(path.join(dir, 'skeleton.md'));
  const order = surfNames(path.join(dir, 'surfaces'));
  const rules = semanticRules(skel);
  ok(!!rules.approveExecute, 'approval declares approve→execute');
  ok(!!rules.executeIdempotency, 'approval declares execute-idempotency');
  ok(!rules.conservation, 'approval declares NO conservation');

  for (const s of order.filter((x) => EXECUTE_VERB.test(x))) {
    const add = injectBlock(s, rules, order);
    ok(add.includes('## Semantic obligations'), `${s}: addendum header present`);
    ok(add.includes('**approve-execute:**'), `${s}: approve-execute injected`);
    ok(add.includes('**execute-idempotency:**'), `${s}: execute-idempotency injected`);
    ok(add.includes('valid approval'), `${s}: carries the verbatim declared rule text`);
    ok(!scanOracleLeak(add), `${s}: addendum has NO oracle leak`);
  }
  ok(order.some((x) => EXECUTE_VERB.test(x)), 'approval has ≥1 execute-verb surface');

  // non-applicable surfaces → EMPTY string (byte-identical buildPrompt)
  for (const s of ['createRequest', 'approveRequest', 'listRequests', 'listPayouts']) {
    if (!order.includes(s)) continue;
    ok(injectBlock(s, rules, order) === '', `${s}: non-applicable → '' (no-op)`);
  }
}

// ---- 2) QUOTA: conservation fires on the spend-verb surface -----------------------------------------------
{
  const dir = path.join(MS, 'epics', 'quota-d2');
  const skel = readSkel(path.join(dir, 'skeleton.md'));
  const order = surfNames(path.join(dir, 'surfaces'));
  const rules = semanticRules(skel);
  ok(!!rules.conservation, 'quota declares conservation');
  const spend = order.filter((x) => SPEND_VERB.test(x));
  ok(spend.length > 0, 'quota has ≥1 spend-verb surface');
  for (const s of spend) {
    const add = injectBlock(s, rules, order);
    ok(add.includes('**conservation:**'), `${s}: conservation injected`);
    ok(!scanOracleLeak(add), `${s}: addendum has NO oracle leak`);
  }
}

// ---- 3) MEMBERSHIP (scale-d1): NO semantic obligation → byte-identical for the WHOLE topology -------------
{
  const skel = readSkel(path.join(BUILD_GAP, 'epics', 'scale-d1', 'skeleton.md'));
  ok(skel.length > 0, 'membership/scale-d1 skeleton present');
  const rules = semanticRules(skel);
  const allNull = !rules.conservation && !rules.approveExecute && !rules.executeIdempotency && !rules.keyedIdempotency;
  ok(allNull, 'membership declares NO Lever-B semantic obligation → inject is a whole-topology no-op');
  // by construction of verifyApplicable, allNull ⇒ injectBlock === '' for ANY surface name
  for (const s of ['addMember', 'executeAnything', 'createDoc', 'withdrawX']) {
    ok(injectBlock(s, rules, []) === '', `membership/${s}: '' when no rules declared`);
  }
}

// ---- 4) EMPTY skeleton + the wiring invariant ------------------------------------------------------------
{
  const rules = semanticRules('');
  ok(injectBlock('executeRequest', rules, ['executeRequest']) === '', 'empty skeleton → no inject');
  // the exact runner line: add==='' ⇒ buildPrompt unchanged (the default-OFF / non-applicable byte-identical path)
  let bp = '## Your task\nfoo';
  const add = injectBlock('createRequest', semanticRules(readSkel(path.join(MS, 'epics', 'approval-d4', 'skeleton.md'))), ['createRequest']);
  if (add) bp += '\n' + add;
  ok(bp === '## Your task\nfoo', 'no-op surface leaves buildPrompt byte-identical');
  // and an APPLICABLE surface DOES change it (the lever is live)
  let bp2 = '## Your task\nfoo';
  const add2 = injectBlock('executeRequest', semanticRules(readSkel(path.join(MS, 'epics', 'approval-d4', 'skeleton.md'))), ['executeRequest']);
  if (add2) bp2 += '\n' + add2;
  ok(bp2.length > bp.length && bp2.startsWith('## Your task\nfoo\n'), 'applicable surface appends the addendum');
}

// ---- 5) verifyApplicable is independent of code (inject ≠ verify) -----------------------------------------
{
  const rules = semanticRules(readSkel(path.join(MS, 'epics', 'approval-d4', 'skeleton.md')));
  const va = verifyApplicable('executeRequest', rules);
  ok(va.some((v) => v.obligation === 'approve-execute'), 'verifyApplicable surfaces approve-execute regardless of code');
}

console.log(`\ninject-smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
