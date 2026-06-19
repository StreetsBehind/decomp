// The CONTRACT-PRECISION gate (co-evolution rung-1, second lever — A/B contract-precision per
// COEVOLUTION-SPEC §4 / §8.2). Targets the OVER-APPLIED OBLIGATION hallucination: a cheap route enforces an
// admin-only authorization gate on a surface the public contract scopes admin to a DIFFERENT surface.
//
// WHY (honest baseline, coevo-REGRADE-full.json + the session-3 quota probe): quota's most frequent
// worst-of-K failure is `Only admins can withdraw` — the skeleton says "only an admin may DEPOSIT (grant)
// credit" and is SILENT on withdraw, so cheap routes over-generalize the admin rule to withdraw, and the
// conservation tests (run as a non-admin member) get refused. The dumped code shows the exact pattern:
// `if (ctx.session.role !== 'admin') throw new Error('Unauthorized: only admin may withdraw')`. This is an
// applicability (FORM) defect — the guard exists but is mis-scoped — so an oracle-blind lever CAN fix it
// (unlike a pure-semantics gap such as wrong conservation arithmetic, which no oracle-blind gate can reach).
//
// CONSERVATISM (avoid the net-negative trap — a false guard-REMOVAL is worse than a miss). The admin-scoped
// set is built by OVER-INCLUSION: a surface counts as admin-scoped if its leading verb appears in ANY
// admin-requirement clause of the skeleton. Over-inclusion → UNDER-flagging (we skip a surface we are unsure
// about), never a false positive that strips a legitimately-required admin guard. (E.g. approval's
// `execute… recorded by an admin` co-occurs admin+execute → execute is treated as admin-scoped and left
// alone, even though the executor need not be admin — the safe direction.)
//
// ORACLE-BLINDNESS (kill K3). Reads ONLY public inputs: the skeleton authz clause, the build prompt, and the
// candidate's own code. The repair prompt is scanned by scanOracleLeak; a hit returns leak=true.

import { scanOracleLeak } from './checker.mjs';

// admin-requirement clauses = skeleton fragments mentioning "admin" together with a requirement word.
function adminClauses(skeleton) {
  return (skeleton || '')
    .split(/[.\n;]/)
    .filter((c) => /\badmin/i.test(c) && /\b(require|requires|required|only|must|may|need)\b/i.test(c));
}

// the leading lowercase verb of a surface name: deposit, withdraw, advance(Order), get(Public), add(Member).
function surfaceVerb(s) {
  const m = String(s || '').match(/^[a-z]+/);
  return m ? m[0] : String(s || '').toLowerCase();
}

/**
 * Surfaces the PUBLIC contract scopes admin to. Conservative (over-includes → under-flags). A surface is
 * admin-scoped iff its leading verb (or a ≥4-char stem of it) appears in an admin-requirement clause.
 */
export function adminScopedSurfaces(skeleton, surfaces) {
  const clauses = adminClauses(skeleton).map((c) => c.toLowerCase());
  const scoped = new Set();
  for (const s of surfaces) {
    const verb = surfaceVerb(s);
    const stem = verb.replace(/(e|ing|s)$/, '');
    for (const c of clauses) {
      if (c.includes(verb) || (stem.length >= 4 && c.includes(stem))) { scoped.add(s); break; }
    }
  }
  return scoped;
}

// does the surface enforce an admin-ONLY gate (refuse non-admins)? High-precision: the unambiguous
// `role !== 'admin'` inequality (either operand order), plus a throw whose message says "only admin" (covers
// helper-based gates). The positive `role === 'admin'` form is deliberately NOT matched — it is more often a
// permissive branch (e.g. "admins may also edit others") whose removal would drop legitimate logic.
export function hasAdminGate(code) {
  const c = code || '';
  if (/(?:session\s*\.\s*)?role\s*(?:!==|!=)\s*['"]admin['"]/.test(c)) return true;
  if (/['"]admin['"]\s*(?:!==|!=)\s*(?:[\w.]*\.\s*)?role/.test(c)) return true;
  if (/throw[\s\S]{0,100}?(only admins?|admins? can|admin required|must be (?:an )?admin|requires? admin|admin[- ]only)/i.test(c)) return true;
  return false;
}

// DETERMINISTIC surgical removal of an over-applied admin-only gate (the dominant real form: an `if
// (role !== 'admin') throw …` refusal). Like surgicalInitRepair/surgicalPersistRepair, this is $0,
// guard-preserving (it deletes ONLY the admin-refusal statement, leaving every other guard byte-for-byte),
// and route-luck-free — so it does not smuggle a single gateway draw into a worst-of-K fitness the way a model
// route-back repair does (the codex×opus deliberation's objection to model-repair under worst-of-K). It
// removes ONE statement per call (the caller loops). Returns the patched code, or null if no inequality-form
// admin gate is present (a message-form helper / compound condition is left for the model fallback — removing a
// compound `if (role !== 'admin' && X)` would drop X, so we under-repair rather than risk a net-negative).
const ADMIN_COND = `(?:(?:[\\w$]+\\s*\\.\\s*)*role\\s*(?:!==|!=)\\s*['"]admin['"]|['"]admin['"]\\s*(?:!==|!=)\\s*(?:[\\w$]+\\s*\\.\\s*)*role)`;
export function surgicalRemoveAdminGate(code) {
  const src = code || '';
  // block form: `if (<admin-cond>) { throw …; }` — single-throw body (no nested braces / template `${}`).
  const block = new RegExp(`[ \\t]*if\\s*\\(\\s*${ADMIN_COND}\\s*\\)\\s*\\{[^{}]*?throw[^{}]*?\\}[ \\t]*\\n?`);
  // single-statement form: `if (<admin-cond>) throw …;`
  const single = new RegExp(`[ \\t]*if\\s*\\(\\s*${ADMIN_COND}\\s*\\)\\s*throw[^;]*;[ \\t]*\\n?`);
  if (block.test(src)) return src.replace(block, '');
  if (single.test(src)) return src.replace(single, '');
  return null;
}

// over-applied admin gates in this epic: a surface enforcing admin that the contract does NOT scope to admin.
export function contractViolations(skeleton, surfaces, files) {
  const scoped = adminScopedSurfaces(skeleton, surfaces);
  const out = [];
  for (const s of surfaces) {
    if (scoped.has(s)) continue;                 // contract scopes admin here → not over-application
    if (files[s] && hasAdminGate(files[s])) out.push({ surface: s, scopedTo: [...scoped] });
  }
  return out;
}

function repairPrompt(originalPrompt, issue, currentCode) {
  const scopedList = issue.scopedTo.length ? issue.scopedTo.join(', ') : '(no surface at all)';
  return [
    originalPrompt, '',
    currentCode ? `## Your current implementation of this surface (keep it intact except for the one fix below):\n\`\`\`js\n${currentCode}\n\`\`\`` : '',
    '## Integration reviewer feedback — this surface over-applies an authorization rule:',
    `- The shared contract requires the caller to be an **admin** ONLY for: ${scopedList}. This surface (\`${issue.surface}\`) is NOT one of them — the contract places **no admin requirement** on it, so ANY authorized caller operating within their own org may call it. Your code refuses non-admin callers (an \`role !== 'admin'\` check / "only admin" guard), which wrongly rejects legitimate callers.`,
    '- Remove ONLY that admin-only restriction. Keep EVERY other guard — tenancy/org-ownership, input validation, conservation/no-overspend, idempotency, audit — EXACTLY as written.',
    '\nReturn your current implementation with ONLY the over-applied admin restriction removed. Output ONLY the corrected JavaScript module.',
  ].join('\n');
}

/**
 * Run the contract-precision gate over a built epic's surfaces. Mirrors the other gates' signature so the
 * harness can compose it (shape → contract → seam). Mutates `files` in place on repair.
 *
 * REPAIR ORDER (mirrors the seam-gate's surgical-first design): when gate.kind==='deterministic', a $0,
 * guard-preserving DETERMINISTIC surgical removal sweep runs FIRST (the dominant `if (role!=='admin') throw`
 * inequality form), so the common case is route-luck-free. Only a RESIDUAL admin gate the surgical pass can't
 * reach (message-form helper / compound condition) falls through to the model route-back (repairDepth-budgeted).
 * `detRepairs` counts the deterministic removals; `repairs` is the total (deterministic + model).
 * @returns {Promise<{files, ranGate, kind, adminScoped, surfacesFlagged, violations, repairs, detRepairs, leak, detail}>}
 */
export async function runContractGate({ surfaces, files, prompts, skeleton, gate, rebuild }) {
  const off = (extra = {}) => ({ files, ranGate: false, kind: gate?.kind || 'off', adminScoped: [], surfacesFlagged: 0, violations: 0, repairs: 0, detRepairs: 0, leak: false, detail: [], ...extra });
  if (!gate || gate.kind === 'off') return off();
  const scoped = adminScopedSurfaces(skeleton, surfaces);
  const maxRepairs = Math.max(0, gate.repairDepth || 0);
  let violations = 0, repairs = 0, detRepairs = 0, surfacesFlagged = 0;
  const detail = [];

  for (const surface of surfaces) {
    if (!(surface in files) || scoped.has(surface)) continue;
    if (!hasAdminGate(files[surface])) continue;
    surfacesFlagged++; violations++; detail.push({ surface, scopedTo: [...scoped] });

    // PASS 0 — DETERMINISTIC surgical removal sweep (inequality form). $0, guard-preserving, no route-luck.
    if (gate.kind === 'deterministic') {
      for (let guard = 0; guard < 4; guard++) {
        if (!hasAdminGate(files[surface])) break;
        const patched = surgicalRemoveAdminGate(files[surface]);
        if (!patched || patched === files[surface]) break;   // residual (message-form/compound) → model fallback
        files[surface] = patched; repairs++; detRepairs++;
      }
    }

    // PASS 1..maxRepairs — model route-back fallback for any residual admin gate the surgical pass can't reach.
    for (let pass = 0; pass <= maxRepairs; pass++) {
      if (!hasAdminGate(files[surface])) break;
      if (pass === maxRepairs) break;
      const rp = repairPrompt(prompts[surface] || '', { surface, scopedTo: [...scoped] }, files[surface]);
      if (scanOracleLeak(rp)) return { files, ranGate: true, kind: gate.kind, adminScoped: [...scoped], surfacesFlagged, violations, repairs, detRepairs, leak: true, detail };
      let code; try { code = await rebuild(surface, rp); } catch { code = ''; }
      if (!code || !code.trim()) break;
      files[surface] = code; repairs++;
    }
  }
  return { files, ranGate: true, kind: gate.kind, adminScoped: [...scoped], surfacesFlagged, violations, repairs, detRepairs, leak: false, detail };
}
