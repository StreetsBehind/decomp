// LEVER B — the SEMANTIC-obligation inject+verify lever (GROUND-RULES Rule-3 lever menu, AMENDMENTS.md
// 2026-06-23 "Lever B (second)"; the (C)-boundary crux). It enforces the three cross-cutting obligations the
// settled output-QA stack DECLARES but never semantically verifies:
//   - CONSERVATION       (quota)    — "a withdraw must refuse if it would drive the balance negative".
//   - APPROVE→EXECUTE    (approval) — "execute… requires a valid approval — one recorded by an admin who is
//                                      not the requester" (the SoD ordering half of the authz rule; the
//                                      existing obligation-contract authz check only verifies an admin gate is
//                                      PRESENT, not that execution is GATED on a recorded approval).
//   - EXECUTE-IDEMPOTENCY(approval) — "execute… is idempotent — re-executing must not append a second audit
//                                      record" (and the quota keyed deposit/withdraw replay-once form).
//
// WHY THESE AND NOT THE FORM LEVER. obligation-contract.mjs deliberately SKIPS the SEMANTIC_CATEGORIES
// (conservation / legal-transition / gated-read) with the note "an oracle-blind gate cannot decide them". That
// was a feasibility claim, not an admissibility one; the LADDER-RESULTS-A deliberation
// (runs/deliberations/20260624T202607Z/) re-opened it as the (C)-boundary test: BUILD the verify, then MEASURE
// — separately — whether DETECTION is clean (deterministic) and whether REPAIR fixes it across the route zoo
// (model-routed). If repair succeeds on some above-floor route → (B), keep the lever. If repair fails on ALL
// above-floor smoke-clean routes on the conditioned subset → the variance-robust (C) signal (Rule 2(d)).
//
// ADMISSIBILITY (the committed surfaces-only test, applied to a SEMANTIC lever). Lever A's discriminator was
// "no literal of intended behavior" — correct for a pure structural seam-recovery gate. Lever B is the
// OBLIGATION-CONTRACT class, whose admissibility basis is DIFFERENT and explicit: the intended behavior is
// DECLARED IN THE PUBLIC SKELETON that the cheap builder also receives (skeleton.md "### Cross-cutting rules").
// The lever reads that declared rule (parseCrosscutRules — the SAME parser obligation-contract uses) and checks
// the candidate's OWN code against it; it NEVER reads the held-out oracle (epics/*/tests.mjs) and encodes none
// of the oracle's scenarios. This is exactly M-coh-2's mechanism: the frontier skeleton carries the typed
// obligation contract, the output-QA layer enforces it. The inadmissible move would be reading the oracle — by
// construction we feed only contract text + candidate code, and every repair prompt is scanOracleLeak-scanned.
//
// DETECTION is conservative (flag only a CLEAR absence of the mechanism the declared rule requires — never
// repair good code), mirroring checker.mjs / contract-gate.mjs / obligation-contract.mjs. Its precision/recall
// against the frozen oracle is REPORTED, not assumed (diag-lever-b.mjs).

import { scanOracleLeak } from './checker.mjs';
import { parseCrosscutRules, surfaceVerb } from './obligation-contract.mjs';
import { selectBestRepair, structurallyPlausible } from './best-of-n-repair.mjs';

// ---- verb families (PUBLIC; mirror the seam-gate PROFILES reader regexes, kept oracle-blind) -------------
// A "spend" surface draws down a conserved balance (the conservation obligation lands here).
const SPEND_VERB = /^(withdraw|spend|debit|redeem|consume|drain|charge|pay)/i;
// An "execute" surface acts on a previously-approved request/release (approve→execute + idempotency land here).
const EXECUTE_VERB = /^(execute|ship|settle|disburse|run|issue|land|fulfil)/i;
// A "keyed mutation" surface (deposit/withdraw) carries a client idempotency key (replay-once form).
const KEYED_VERB = /^(deposit|withdraw|grant|credit|fund|topup|top_up|spend|debit|charge|consume|redeem)/i;

// ---- which declared cross-cutting rules name which semantic obligation (skeleton-derived) ---------------
// Returns the declared rule TEXTs (the skeleton's own words) keyed by the obligation Lever B owns. A rule is
// matched by its NAME + TEXT content, so it generalizes across the diverse templates without hard-coding nouns.
export function semanticRules(skeleton) {
  const rules = parseCrosscutRules(skeleton);
  const out = { conservation: null, approveExecute: null, executeIdempotency: null, keyedIdempotency: null };
  for (const r of rules) {
    const name = String(r.name || '').toLowerCase();
    const text = String(r.text || '').toLowerCase();
    if (name.includes('conserv') || /balance.*negative|negative.*balance|insufficient|overspend|never be negative/.test(text)) {
      out.conservation = out.conservation || r.text;
    }
    // approve→execute ordering: the authz / SoD rule whose text gates execution on a recorded approval.
    if ((name.includes('author') || name.includes('separation of duties') || name.includes('authz') || name.includes('approv'))
        && /execut\w*\s+requires|requires?\s+a?\s*valid\s+approval|recorded by an admin|valid approval/.test(text)) {
      out.approveExecute = out.approveExecute || r.text;
    }
    if (name.includes('idempot') || /idempoten|replay|once|second\s+audit|already seen/.test(text)) {
      if (/execut/.test(text) || /audit/.test(text)) out.executeIdempotency = out.executeIdempotency || r.text;
      if (/\bkey\b|deposit|withdraw|replay/.test(text)) out.keyedIdempotency = out.keyedIdempotency || r.text;
    }
  }
  return out;
}

// ---- deterministic VERIFY (detection) — conservative presence-of-mechanism checks ----------------------
// Each returns true when the declared mechanism is PRESENT (so the surface is NOT flagged). Only a clear
// absence flags. All read the candidate's OWN code (public) + the declared rule (public). Oracle-blind.

// CONSERVATION: a spend surface must compute the balance and refuse when the draw would go negative.
function hasConservationGuard(code) {
  const c = code || '';
  if (/insufficient|overspend|over-spend/i.test(c)) return true;                 // explicit refusal word
  // a numeric guard relating amount/balance to a floor (… < 0 / amount > balance / balance < amount / >= amount)
  const guard = /(newbalance|currentbalance|balance|remaining|total|sum)\s*[-+]?\s*[\w.]*\s*<\s*0/i.test(c)
    || /(newbalance|currentbalance|balance|remaining|total|available)\s*[<>]=?\s*amount/i.test(c)
    || /amount\s*[<>]=?\s*(newbalance|currentbalance|balance|remaining|total|available|wallet)/i.test(c)
    || /balance\s*-\s*amount\s*<\s*0/i.test(c)
    || /\.balance\s*<\s*amount/i.test(c);
  // only meaningful if the surface also reads a balance (a sum/reduce over deltas, or a .balance read).
  const readsBalance = /\breduce\s*\(/.test(c) || /\bbalance\b/i.test(c);
  return guard && readsBalance;
}
function mutatesLedger(code) {
  const c = code || '';
  return /delta\s*:\s*-/.test(c) || /-\s*amount/.test(c) || /\.push\s*\(/.test(c) || /\.set\s*\(/.test(c)
    || /balance\s*-=\s*amount/.test(c) || /=\s*[\w.]*balance\s*-\s*amount/i.test(c);
}

// APPROVE→EXECUTE: an execute surface must look up a recorded approval (or an approved status) and refuse if absent.
function hasApprovalGate(code) {
  const c = code || '';
  const readsApprovalStore = /ctx\.db\.\w*[Aa]pprovals?\b/.test(c) || /\bapprovals?\b/.test(c);
  const statusGate = /status\s*===?\s*['"]approved['"]/i.test(c) || /['"]approved['"]\s*===?\s*\w+\.status/i.test(c)
    || /\.approved\b/.test(c) || /\bisApproved\b/i.test(c);
  const refuses = /throw\b/.test(c) || /\breturn\b/.test(c);
  return (readsApprovalStore || statusGate) && refuses;
}
function mutatesAudit(code) {
  const c = code || '';
  return /audit\w*\s*\.\s*push\s*\(/i.test(c) || /\.push\s*\(\s*audit/i.test(c) || /status\s*=\s*['"]executed['"]/i.test(c)
    || /ctx\.db\.\w*[Aa]udit\w*/.test(c);
}

// EXECUTE-IDEMPOTENCY: an execute surface must dedup before appending the audit record.
function hasExecuteDedup(code) {
  const c = code || '';
  return /status\s*===?\s*['"]executed['"]/i.test(c)
    || /\bexecuted\b/.test(c) && /\b(if|return|throw)\b/.test(c)
    || /audit\w*\s*\.\s*(find|some|filter|findIndex)\s*\(/i.test(c)
    || /\balready\b/i.test(c) && /\b(return|throw)\b/.test(c)
    || /\bexisting\b/.test(c) && /audit/i.test(c);
}
// KEYED-IDEMPOTENCY: a keyed mutation must look the key up before applying the delta.
function hasKeyedDedup(code) {
  const c = code || '';
  if (!/\bkey\b/.test(c)) return false;
  return /\.\s*(find|some|has|includes|findIndex|filter)\s*\([^)]*key/i.test(c)
    || /key\s*===?/.test(c) && /\b(return|continue|break)\b/.test(c)
    || /seen\w*\.(has|includes|find)/i.test(c);
}

/**
 * Deterministic verify of ONE surface against the skeleton-declared semantic obligations. Returns the list of
 * CLEAR violations (empty = conformant or no applicable obligation). Oracle-blind: inputs are the candidate's
 * code + the declared rule texts (from semanticRules(skeleton)).
 * @returns {Array<{obligation:string, kind:'missing', text:string}>}
 */
export function verifySemantic(surface, code, rulesBySem) {
  const out = [];
  const verb = surfaceVerb(surface);
  const c = code || '';
  if (!c.trim()) return out;                              // absent surface is a floor problem, not Lever B's

  // CONSERVATION — applies to spend-verb surfaces that actually draw down a balance.
  if (rulesBySem.conservation && SPEND_VERB.test(surface) && mutatesLedger(c) && !hasConservationGuard(c)) {
    out.push({ obligation: 'conservation', kind: 'missing', text: rulesBySem.conservation });
  }
  // APPROVE→EXECUTE — applies to execute-verb surfaces that mutate (append audit / set executed).
  if (rulesBySem.approveExecute && EXECUTE_VERB.test(surface) && mutatesAudit(c) && !hasApprovalGate(c)) {
    out.push({ obligation: 'approve-execute', kind: 'missing', text: rulesBySem.approveExecute });
  }
  // EXECUTE-IDEMPOTENCY — applies to execute-verb surfaces that append audit.
  if (rulesBySem.executeIdempotency && EXECUTE_VERB.test(surface) && mutatesAudit(c) && !hasExecuteDedup(c)) {
    out.push({ obligation: 'execute-idempotency', kind: 'missing', text: rulesBySem.executeIdempotency });
  }
  // KEYED-IDEMPOTENCY — applies to keyed deposit/withdraw mutations.
  if (rulesBySem.keyedIdempotency && KEYED_VERB.test(surface) && mutatesLedger(c) && !hasKeyedDedup(c)) {
    out.push({ obligation: 'keyed-idempotency', kind: 'missing', text: rulesBySem.keyedIdempotency });
  }
  return out;
}

// ---- (A) the INJECT half: render the declared semantic obligations as a build-prompt addendum ----------
export function injectBlock(surface, rulesBySem, surfaces) {
  const vs = verifyApplicable(surface, rulesBySem);
  if (!vs.length) return '';
  const lines = ['', '## Semantic obligations for THIS surface (from the shared contract — they are LOAD-BEARING, enforce ALL):'];
  for (const v of vs) lines.push(`- **${v.obligation}:** ${v.text}`);
  return lines.join('\n');
}
// the obligations that APPLY to a surface (independent of whether the code satisfies them) — for the inject half.
function verifyApplicable(surface, rulesBySem) {
  const out = [];
  if (rulesBySem.conservation && SPEND_VERB.test(surface)) out.push({ obligation: 'conservation', text: rulesBySem.conservation });
  if (rulesBySem.approveExecute && EXECUTE_VERB.test(surface)) out.push({ obligation: 'approve-execute', text: rulesBySem.approveExecute });
  if (rulesBySem.executeIdempotency && EXECUTE_VERB.test(surface)) out.push({ obligation: 'execute-idempotency', text: rulesBySem.executeIdempotency });
  if (rulesBySem.keyedIdempotency && KEYED_VERB.test(surface)) out.push({ obligation: 'keyed-idempotency', text: rulesBySem.keyedIdempotency });
  return out;
}

// ---- (B) the VERIFY+REPAIR half (model-routed; best-of-N + no-regress) ---------------------------------
function repairPrompt(originalPrompt, surface, currentCode, violations) {
  const parts = [
    originalPrompt, '',
    currentCode ? `## Your current implementation of \`${surface}\` (keep it intact except for the fixes below):\n\`\`\`js\n${currentCode}\n\`\`\`` : '',
    '## Contract-conformance feedback — this surface violates a LOAD-BEARING semantic obligation from the shared contract:',
  ];
  for (const v of violations) parts.push(`- MISSING **${v.obligation}**: ${v.text}`);
  parts.push('', 'Implement the missing semantic obligation(s) above. Preserve every other existing guard (authorization, tenancy, ownership, input-validation) EXACTLY as written — do not drop or weaken any. Output ONLY the corrected JavaScript module.');
  return parts.join('\n');
}

// Oracle-blind quality score for best-of-N selection + the no-regress floor: structurally plausible, fewer
// remaining semantic violations is better. K3-safe (only verifySemantic + the public rules).
function repairScore(code, surface, rulesBySem) {
  if (!structurallyPlausible(code, surface)) return -Infinity;
  return -verifySemantic(surface, code, rulesBySem).length;
}

// ---- OPTION 3: behavioural verify (admissible-under-constraints; runs/deliberations/20260626T040021Z/) -------
// Catches "mechanism-present-but-semantically-wrong" gates the structural presence-detector misses. It composes
// the candidate's OWN create→approve→execute surfaces in a shared ctx and asserts a metamorphic property that is
// a verbatim paraphrase of ONE named skeleton clause (SoD: execute requires a non-requester admin's approval;
// idempotency: re-execute appends no second audit record). The EXECUTION is delegated to an injected
// `behaviouralRunner` (gates/lib/behaviour-run.mjs in a child process) so this module stays import-pure and the
// structural-only path is byte-identical when gate.behavioural is off. Oracle-blind by construction: the runner
// uses its OWN seeded inputs, imports no oracle/grader, and is disk-deletion-invariant.

// group create/approve/<exec> triads sharing a noun (request/release/payout/expense → execute/ship/settle/pay).
export function executeFamilies(surfaces) {
  const fams = [];
  for (const s of surfaces) {
    const v = surfaceVerb(s);
    if (/^(create|approve|list|get)/.test(v)) continue;       // not an execute-family verb
    const noun = s.slice(v.length);                           // e.g. executeRequest → 'Request'
    if (!noun) continue;
    const lc = (x) => x.toLowerCase();
    const create = surfaces.find((x) => lc(x) === lc('create' + noun));
    const approve = surfaces.find((x) => lc(x) === lc('approve' + noun));
    if (create && approve) fams.push({ exec: s, create, approve, noun });
  }
  return fams;
}

// run the behavioural property on the current file set; return the behavioural violations for each exec surface.
// `behaviouralRunner({files, create, approve, exec}) => {sod, idempotency, notes}` is injected by the caller.
export async function verifyBehavioural({ surfaces, files, rulesBySem, behaviouralRunner }) {
  const out = [];
  if (typeof behaviouralRunner !== 'function') return out;
  for (const fam of executeFamilies(surfaces)) {
    if (!(fam.exec in files) || !(fam.create in files) || !(fam.approve in files)) continue;
    let r; try { r = await behaviouralRunner({ files, create: fam.create, approve: fam.approve, exec: fam.exec }); } catch { r = null; }
    if (!r) continue;
    if (r.sod === 'violated' && rulesBySem.approveExecute) out.push({ surface: fam.exec, obligation: 'approve-execute', kind: 'behavioural', text: rulesBySem.approveExecute });
    if (r.idempotency === 'violated' && rulesBySem.executeIdempotency) out.push({ surface: fam.exec, obligation: 'execute-idempotency', kind: 'behavioural', text: rulesBySem.executeIdempotency });
  }
  return out;
}

/**
 * Run Lever B's verify+repair over a built epic's surfaces. Mirrors the other gates' signature so the harness
 * composes it (… → seam → semantic). Mutates `files` in place on an accepted repair.
 * @param {object} p
 * @param {string[]} p.surfaces
 * @param {Record<string,string>} p.files     surface -> code (mutated on repair)
 * @param {Record<string,string>} p.prompts   surface -> build prompt (for the repair re-prompt)
 * @param {string} p.skeleton                 the PUBLIC contract text
 * @param {{kind:'off'|'deterministic', repairDepth:number, bestOfN?:number}} p.gate
 * @param {(surface:string, prompt:string)=>Promise<string>} p.rebuild   one route-back over the cheap pool
 * @returns {Promise<{files, ranGate, surfacesFlagged, violations, repairs, reverts, leak, detail, byObligation}>}
 */
export async function runSemanticObligation({ surfaces, files, prompts, skeleton, gate, rebuild, behaviouralRunner }) {
  const off = (extra = {}) => ({ files, ranGate: false, surfacesFlagged: 0, violations: 0, repairs: 0, reverts: 0, behavioural: 0, leak: false, detail: [], byObligation: {}, ...extra });
  if (!gate || gate.kind === 'off') return off();
  const rulesBySem = semanticRules(skeleton);
  if (!rulesBySem.conservation && !rulesBySem.approveExecute && !rulesBySem.executeIdempotency && !rulesBySem.keyedIdempotency) {
    return off({ ranGate: true });                        // topology declares no semantic obligation → no-op
  }
  const maxRepairs = Math.max(0, gate.repairDepth || 0);
  const bestOfN = Math.max(1, gate.bestOfN || 1);
  // OPTION 3 (gated): behavioural detection on the execute-family exec surfaces. OFF → structural-only path is
  // byte-identical to before. The behavioural verdict gates+verifies repair; the FROZEN ORACLE (the diagnostic /
  // worst-of-K) remains the sole SUCCESS measure — the property passing never enters the (B) claim.
  const behaviouralOn = !!(gate.behavioural && typeof behaviouralRunner === 'function');
  const execSet = behaviouralOn ? new Set(executeFamilies(surfaces).map((f) => f.exec)) : new Set();
  let surfacesFlagged = 0, violations = 0, repairs = 0, reverts = 0, behavioural = 0;
  const detail = []; const byObligation = {};
  const bump = (o) => { byObligation[o] = (byObligation[o] || 0) + 1; };

  // behavioural violations for ONE exec surface given a candidate substituted into the current file set.
  const behViolsFor = async (surface, candidate) => {
    if (!behaviouralOn || !execSet.has(surface)) return [];
    const probe = candidate === undefined ? files : { ...files, [surface]: candidate };
    return verifyBehavioural({ surfaces, files: probe, rulesBySem, behaviouralRunner });
  };

  for (const surface of surfaces) {
    if (!(surface in files)) continue;
    let flaggedThis = false;
    for (let pass = 0; pass <= maxRepairs; pass++) {
      const structural = verifySemantic(surface, files[surface], rulesBySem);
      const behv = await behViolsFor(surface);            // [] unless behaviouralOn && exec surface
      const viols = [...structural, ...behv];
      if (!viols.length) break;
      if (!flaggedThis) { surfacesFlagged++; flaggedThis = true; for (const v of viols) bump(v.obligation); }
      violations += structural.length; behavioural += behv.length;
      detail.push({ surface, pass, violations: viols.map((v) => `${v.kind === 'behavioural' ? 'beh:' : ''}${v.obligation}`) });
      if (pass === maxRepairs) break;                     // out of budget → ship (the oracle still grades it)

      const rp = repairPrompt(prompts[surface] || '', surface, files[surface], viols);
      if (scanOracleLeak(rp)) return { files, ranGate: true, surfacesFlagged, violations, repairs, reverts, behavioural, leak: true, detail, byObligation };

      let chosen = null;
      if (behv.length) {
        // BEHAVIOUR-AWARE selection (async; the property verifies the candidate). Score = -(structural viols)
        // - 2*(behavioural-violated). Original is the no-regress floor. A behavioural-only fix can now win.
        const scoreOf = async (code) => (structurallyPlausible(code, surface) ? -verifySemantic(surface, code, rulesBySem).length - 2 * (await behViolsFor(surface, code)).length : -Infinity);
        let best = files[surface], bestScore = await scoreOf(files[surface]), accepted = false;
        for (let i = 0; i < bestOfN; i++) {
          let code; try { code = await rebuild(surface, rp); } catch { code = ''; }
          if (!code || !code.trim()) continue;
          const s = await scoreOf(code);
          if (s > bestScore) { best = code; bestScore = s; accepted = true; }
        }
        chosen = { accepted, code: best, src: accepted ? 'beh' : 'original' };
      } else {
        chosen = await selectBestRepair({ surface, originalCode: files[surface], n: bestOfN, repairPrompt: rp, rebuild, score: (code) => repairScore(code, surface, rulesBySem) });
      }
      if (!chosen.accepted) { reverts++; detail.push({ surface, pass, noRegress: true, src: chosen.src }); break; }
      files[surface] = chosen.code; repairs++;
    }
  }
  return { files, ranGate: true, surfacesFlagged, violations, repairs, reverts, behavioural, leak: false, detail, byObligation };
}

// ---- the injected behavioural runner factory: spawn gates/lib/behaviour-run.mjs in a child process ($0) ------
// Writes the current file set to a temp dir and runs the create→approve→exec scenario under a hard timeout.
// Oracle-blind: writes only candidate code; the child imports no oracle/grader and is disk-deletion-invariant.
export function makeBehaviouralRunner({ buildGapDir, timeoutMs = 10000 } = {}) {
  return async ({ files, create, approve, exec }) => {
    const fs = await import('node:fs'); const os = await import('node:os'); const pathM = await import('node:path');
    const url = await import('node:url'); const { spawn } = await import('node:child_process');
    const here = pathM.dirname(url.fileURLToPath(import.meta.url));
    const runner = pathM.join(here, '..', 'gates', 'lib', 'behaviour-run.mjs');
    const dir = fs.mkdtempSync(pathM.join(os.tmpdir(), 'beh-'));
    try {
      for (const s of [create, approve, exec]) fs.writeFileSync(pathM.join(dir, `${s}.mjs`), files[s] || '');
      // --inject-code: co-locate the injected obligation primitive so a wired surface's `import './_obligation.mjs'`
      // resolves in the behavioural sandbox too (no-op when files._obligation is absent → structural path unchanged).
      if (files['_obligation']) fs.writeFileSync(pathM.join(dir, '_obligation.mjs'), files['_obligation'] || '');
      return await new Promise((resolve) => {
        const child = spawn(process.execPath, [runner, dir, create, approve, exec], { stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, NODE_OPTIONS: '' } });
        let outBuf = ''; let done = false;
        const fin = (v) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} resolve(v); };
        const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} fin({ sod: 'inconclusive', idempotency: 'inconclusive', notes: ['timeout'] }); }, timeoutMs);
        child.stdout.on('data', (d) => { outBuf += d; });
        child.on('close', () => { try { fin(JSON.parse(outBuf)); } catch { fin({ sod: 'inconclusive', idempotency: 'inconclusive', notes: ['parse'] }); } });
        child.on('error', () => fin({ sod: 'inconclusive', idempotency: 'inconclusive', notes: ['spawn'] }));
      });
    } catch { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} return { sod: 'inconclusive', idempotency: 'inconclusive', notes: ['runner-error'] }; }
  };
}

export { SPEND_VERB, EXECUTE_VERB, KEYED_VERB, hasConservationGuard, hasApprovalGate, hasExecuteDedup, hasKeyedDedup, verifyApplicable };
