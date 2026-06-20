// The per-surface OBLIGATION-CONTRACT lever (COEVOLUTION-SPEC §4 "(A↔B) per-surface obligation-contract
// gene"; resolves §8-Q2). THIS is the lever for the crosscut/obligation gap the settled worst-of-K=8
// head-to-head exposed as the killer (HEAD-TO-HEAD.md: hybrid loses 0/17, the crosscut/obligation gap dominates
// 16/17 cells, median −36pp / max −86pp; the membership-only integration-gate has no lever for it).
//
// WHY THE GAP EXISTS (mechanism, all from public inputs). The frontier orchestrator's skeleton DECLARES the
// lethal-quadrant cross-cutting obligations once, generically ("apply on EVERY surface they touch") — tenancy,
// input-validation, authorization/SoD, idempotency, audit. But each cheap builder sees only its own THIN
// surface prompt (e.g. quota/surfaces/withdraw.md: "Deduct `amount` and return a result. Throw if the wallet
// does not exist." — it names NONE of the cross-cutting rules). So a cheap route omits tenancy/validation/
// idempotency on that surface → the oracle's crosscut tests fail. The dual hazard is the over-application of a
// SCOPED rule ("only an admin may deposit" hallucinated onto withdraw → conservation tests run as a non-admin
// member get refused). Both are APPLICABILITY (FORM) defects an oracle-blind lever can reach.
//
// THE LEVER (the ZYAL/gascity advisory↔enforced split — memory: zyal-gascity-agent-contracts). FROM THE PUBLIC
// SKELETON ONLY, derive a small typed contract per surface:
//   - obligations  — the cross-cutting rules that DO apply to this surface (what it must enforce).
//   - restrictions — what it must NOT invent (a SCOPED rule the contract places on OTHER surfaces, e.g. the
//                    admin-only deposit gate, must not be applied here — the structured form of the
//                    contract-precision gene; directly attacks the only-admin-may-withdraw hallucination).
//   - runConditions— the declared shared store(s) this surface should touch (from the skeleton's shapes block).
// Two coupled halves:
//   (A) INJECT — `injectBlock()` renders the contract as a build-prompt addendum (the amortizable skeleton-
//       author hand-off; the model is told upfront exactly what to enforce and what not to invent).
//   (B) VERIFY+REPAIR — `runObligationContract()` grades the BUILT code against the contract with deterministic
//       oracle-blind heuristics (the enforced verifier) and routes a repair on a miss. This is the half that
//       composes with the existing output-QA stack (shape/contract/seam/repair) and that a paired worst-of-K
//       run can attribute cleanly (raw vs final on the SAME build).
//
// SCOPE OF VERIFY = the FORM-reachable obligations only (tenancy, input-validation, authz applicability,
// idempotency, audit — exactly the crosscut bucket). The SEMANTICS obligations (conservation arithmetic, legal-
// transition predicate, gated-read state) are INJECTED as guidance but NEVER verified/repaired — an oracle-blind
// gate cannot decide them (coevo-rung1 classifyFail: those are `semantics` → (C) candidates, not this lever's job).
//
// ORACLE-BLINDNESS (kill K3 — load-bearing, same contract as checker.mjs/integration-gate.mjs). Every input is
// PUBLIC: the skeleton (the builder sees it too), the surface names, the build prompts, and the candidate's own
// code. The `source` is structurally `skeleton` — there is no `oracle` path to evolve (the type-system guardrail
// that the falsy-return lever lacked; coevo-grader-bug-and-baseline). Every repair/judge prompt is run through
// `scanOracleLeak`; a hit returns leak=true so the caller voids the candidate. The scan is the mechanical
// guarantee, not an assumption — by construction we feed contract text, never oracle text.

import { scanOracleLeak } from './checker.mjs';
import { adminScopedSurfaces, hasAdminGate } from './contract-gate.mjs';

// ---- skeleton parsing (PUBLIC) --------------------------------------------------------------------
// the leading lowercase verb of a surface name: deposit, withdraw, createWallet→create, executeRequest→execute.
function surfaceVerb(s) {
  const m = String(s || '').match(/^[a-z]+/);
  return m ? m[0] : String(s || '').toLowerCase();
}
function verbStem(v) { return v.replace(/(e|ing|s)$/, ''); }

// The cross-cutting-rule bullets of the skeleton: `### Cross-cutting rules …` → `- **<Name>:** <text>` lines.
// Returns [{ name, category, text }]. category is keyed off the rule NAME (the skeleton's own taxonomy), so it
// generalizes across topologies without hard-coding nouns.
const SEMANTIC_CATEGORIES = new Set(['conservation', 'legal-transition', 'gated-read']);
function categoryOf(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('tenan')) return 'tenancy';
  if (n.includes('valid')) return 'input-validation';
  if (n.includes('author') || n.includes('separation of duties') || n.includes('authz')) return 'authz';
  if (n.includes('idempot')) return 'idempotency';
  if (n.includes('audit')) return 'audit';
  if (n.includes('conserv')) return 'conservation';
  if (n.includes('transition')) return 'legal-transition';
  if (n.includes('gated read') || n.includes('gated-read')) return 'gated-read';
  return 'other';
}

export function parseCrosscutRules(skeleton) {
  const text = String(skeleton || '');
  const lines = text.split('\n');
  // find the cross-cutting section (heading containing "cross-cutting"); collect bullets until the next heading.
  let i = lines.findIndex((l) => /^#{1,6}\s/.test(l) && /cross-?cutting/i.test(l));
  const rules = [];
  if (i === -1) {
    // no explicit section — scan ALL bold-prefixed bullets (robust to template drift).
    for (const l of lines) pushRule(l, rules);
    return rules;
  }
  for (i += 1; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) break;       // next heading ends the section
    pushRule(lines[i], rules);
  }
  return rules;
}
function pushRule(line, rules) {
  const m = String(line).match(/^\s*[-*]\s*\*\*([^:*]+):\*\*\s*(.*)$/);
  if (!m) return;
  const name = m[1].trim();
  rules.push({ name, category: categoryOf(name), text: m[2].trim() });
}

// the declared shared store(s) `ctx.db.<x>` named in the skeleton's shapes block (runConditions hint).
function declaredStores(skeleton) {
  const out = [];
  const re = /ctx\.db\.([A-Za-z_]\w*)/g;
  let m; while ((m = re.exec(String(skeleton || ''))) !== null) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

// which surface leading-verbs a rule text explicitly names (scoping). A rule that names ≥1 surface verb is
// SCOPED to those surfaces; a rule that names none is UNIVERSAL (applies to every surface it can touch).
function scopedVerbs(ruleText, allVerbs) {
  const t = String(ruleText || '').toLowerCase();
  const hit = new Set();
  for (const v of allVerbs) {
    const stem = verbStem(v);
    if (new RegExp(`\\b${v}`, 'i').test(t) || (stem.length >= 4 && new RegExp(`\\b${stem}`, 'i').test(t))) hit.add(v);
  }
  return hit;
}

// ---- the per-surface contract derivation ----------------------------------------------------------
/**
 * Derive the typed obligation contract for ONE surface, from the PUBLIC skeleton only.
 * @returns {{ surface, obligations: Array<{category,text}>, restrictions: Array<{category,text}>, runConditions: string[] }}
 */
export function deriveSurfaceContract(skeleton, surface, allSurfaces) {
  const rules = parseCrosscutRules(skeleton);
  const allVerbs = [...new Set((allSurfaces || []).map(surfaceVerb))];
  const verb = surfaceVerb(surface);
  // authz applicability goes through the SAME conservative parser the restriction uses (adminScopedSurfaces),
  // so the obligation half and the restriction half can never disagree about which surfaces admin is scoped to.
  const adminScoped = adminScopedSurfaces(skeleton, allSurfaces || []);
  const obligations = [];
  for (const r of rules) {
    let applies;
    if (r.category === 'tenancy') {
      // tenancy is the UNIVERSAL caller-org policy ("apply on EVERY surface they touch"). It is NOT verb-scoped:
      // its prose enumerates facets ("…listing returns only caller-org records…"), and matching "listing" as the
      // `list` surface would wrongly drop tenancy from every other surface (the gerund-collision trap).
      applies = true;
    } else if (r.category === 'authz') {
      applies = adminScoped.has(surface);
    } else {
      // validation / idempotency / audit / semantic — scoped by the surface verbs the rule text actually names
      // (these texts name surfaces explicitly — `create…`, `deposit/withdraw`, `execute…` — no gerund hazard).
      const scoped = scopedVerbs(r.text, allVerbs);
      applies = scoped.size === 0 ? true : scoped.has(verb);
    }
    if (applies) obligations.push({ category: r.category, text: r.text });
  }
  // RESTRICTIONS: a scoped authz rule that the public contract places on OTHER surfaces but NOT this one
  // (the over-application target). Reuse the contract-gate's conservative admin-scoping (over-includes →
  // under-restricts → never strips a legitimately-required admin guard).
  const restrictions = [];
  const anyAdminRule = rules.some((r) => r.category === 'authz' && /\badmin/i.test(r.text));
  if (anyAdminRule && !adminScoped.has(surface)) {
    restrictions.push({ category: 'authz', text: 'the shared contract scopes the admin-only requirement to OTHER surfaces, not this one — do NOT require the caller to be an admin here (no `role !== "admin"` / "only admin" gate); any authorized caller within their own org may call it.' });
  }
  return { surface, obligations, restrictions, runConditions: declaredStores(skeleton) };
}

// ---- (A) the INJECT half: render the contract as a build-prompt addendum --------------------------
export function injectBlock(contract) {
  if (!contract) return '';
  const lines = ['', '## Cross-cutting obligations for THIS surface (from the shared contract — enforce ALL of these):'];
  if (contract.obligations.length) {
    for (const o of contract.obligations) lines.push(`- **${o.category}:** ${o.text}`);
  } else {
    lines.push('- (none specific to this surface beyond the shared shapes)');
  }
  if (contract.restrictions.length) {
    lines.push('', '## Do NOT invent these (the contract does not place them on this surface):');
    for (const r of contract.restrictions) lines.push(`- **${r.category}:** ${r.text}`);
  }
  if (contract.runConditions.length) {
    lines.push('', `## Run conditions: operate on the declared shared store(s): ${contract.runConditions.map((s) => `ctx.db.${s}`).join(', ')}.`);
  }
  return lines.join('\n');
}

// ---- (B) the VERIFY half: deterministic oracle-blind checks ---------------------------------------
// Conservative — flag only a CLEAR absence/violation (so good code is not needlessly repaired), mirroring
// checker.mjs/contract-gate.mjs. Verifies the FORM-reachable obligations; SEMANTIC categories are skipped.
function checkObligation(category, surface, code, runConditions) {
  const c = code || '';
  const verb = surfaceVerb(surface);
  switch (category) {
    case 'tenancy':
      // The org MUST be sourced from the SESSION (the skeleton declares `ctx.session.orgId`). A bare /orgId/
      // token-presence check is too lenient — it passes a surface that reads the WRONG session field
      // (`ctx.session.organizationId`) while still naming `orgId` as a record property (the exact tenancy
      // field-drift the causality probe surfaced on quota createWallet). Require either a direct
      // `session.orgId` read or a `{ orgId } = …session` destructure; the drifted field matches neither.
      return /session\s*\.\s*orgId\b/.test(c)                   // ctx.session.orgId / session.orgId
        || /\{[^}]*\borgId\b[^}]*\}\s*=\s*[\w.]*session/.test(c); // const { orgId, … } = ctx.session
    case 'input-validation': {
      // amount-bearing surfaces (deposit/withdraw): require an explicit non-positive guard.
      if (/amount/.test(c) || verb === 'deposit' || verb === 'withdraw') {
        if (/amount/.test(c)) return /amount\s*<=?\s*0|0\s*>=?\s*amount|typeof\s+amount|Number\.isFinite|isNaN|amount\s*<\s*0/.test(c);
      }
      // create-style surfaces: must not let the client supply protected fields (unguarded spread / protected write).
      if (verb === 'create') {
        const spread = /\.\.\.\s*(patch|updates|body|input|args|req|data|payload)\b/.test(c);
        const protectedFromInput = /\b(status|role|orgId|id|authorId|requesterId)\s*:\s*\w+\.(status|role|orgId|id|authorId|requesterId)/.test(c);
        return !spread && !protectedFromInput;
      }
      return true;                                              // no checkable validation surface here
    }
    case 'authz':
      return /role/.test(c) && /admin/.test(c);                 // some admin/role gate present
    case 'idempotency':
      // a key-based or executed/status-based dedup lookup against a store before mutating.
      return (/\bkey\b/.test(c) && /\.(some|find|has|includes|findIndex)\s*\(/.test(c))
        || /executed|already|status\s*===\s*['"]executed['"]|audit/i.test(c);
    case 'audit':
      return /audit/i.test(c) && /\.(push|set)\s*\(/.test(c);
    default:
      return true;                                              // semantics/other → not oracle-blind-checkable
  }
}

// returns the list of FORM-reachable obligation violations for one surface.
export function verifySurface(surface, code, contract) {
  const out = [];
  for (const o of contract.obligations) {
    if (SEMANTIC_CATEGORIES.has(o.category)) continue;          // semantics → injected only, never flagged
    if (!checkObligation(o.category, surface, code, contract.runConditions)) {
      out.push({ kind: 'missing', category: o.category, text: o.text });
    }
  }
  // restrictions: an over-applied admin gate where the contract forbids one (reuse the high-precision detector).
  for (const r of contract.restrictions) {
    if (r.category === 'authz' && hasAdminGate(code || '')) {
      out.push({ kind: 'invented', category: 'authz', text: r.text });
    }
  }
  return out;
}

function repairPrompt(originalPrompt, surface, currentCode, violations) {
  const missing = violations.filter((v) => v.kind === 'missing');
  const invented = violations.filter((v) => v.kind === 'invented');
  const parts = [
    originalPrompt, '',
    currentCode ? `## Your current implementation of \`${surface}\` (keep it intact except for the fixes below):\n\`\`\`js\n${currentCode}\n\`\`\`` : '',
    '## Contract-conformance feedback — this surface does not satisfy its cross-cutting obligations:',
  ];
  for (const v of missing) parts.push(`- MISSING **${v.category}**: ${v.text}`);
  for (const v of invented) parts.push(`- OVER-APPLIED **${v.category}**: ${v.text}`);
  parts.push('', 'Add the MISSING obligations and remove the OVER-APPLIED one. Preserve every other existing guard EXACTLY as written — do not drop or weaken any. Output ONLY the corrected JavaScript module.');
  return parts.join('\n');
}

/**
 * Run the obligation-contract VERIFY+REPAIR pass over a built epic's surfaces. Mirrors the other gates'
 * signature so the harness composes it (… → contract → obligation → seam). Mutates `files` in place on repair.
 * The INJECT half (A) is applied separately at build time via injectBlock()/deriveSurfaceContract().
 * @param {object} p
 * @param {string[]} p.surfaces
 * @param {Record<string,string>} p.files     surface -> emitted code (mutated on repair)
 * @param {Record<string,string>} p.prompts   surface -> build prompt (for the repair re-prompt)
 * @param {string} p.skeleton                 the PUBLIC contract text
 * @param {{kind:'off'|'deterministic'|'cheap-judge', repairDepth:number}} p.gate
 * @param {(surface:string, prompt:string)=>Promise<string>} p.rebuild
 * @param {(args:object)=>Promise<{text:string}>} [p.judgeInvoke]   (cheap-judge only)
 * @returns {Promise<{files, ranGate, kind, surfacesFlagged, violations, missing, invented, repairs, leak, detail}>}
 */
export async function runObligationContract({ surfaces, files, prompts, skeleton, gate, rebuild, judgeInvoke }) {
  const off = (extra = {}) => ({ files, ranGate: false, kind: gate?.kind || 'off', surfacesFlagged: 0, violations: 0, missing: 0, invented: 0, repairs: 0, leak: false, detail: [], ...extra });
  if (!gate || gate.kind === 'off') return off();
  const maxRepairs = Math.max(0, gate.repairDepth || 0);
  let surfacesFlagged = 0, violations = 0, missing = 0, invented = 0, repairs = 0;
  const detail = [];

  for (const surface of surfaces) {
    if (!(surface in files)) continue;
    const contract = deriveSurfaceContract(skeleton, surface, surfaces);
    let flaggedThis = false;

    for (let pass = 0; pass <= maxRepairs; pass++) {
      let viols;
      if (gate.kind === 'cheap-judge') {
        const j = await judgeViolations(surface, files[surface], contract, judgeInvoke);
        if (j.leak) return { files, ranGate: true, kind: gate.kind, surfacesFlagged, violations, missing, invented, repairs, leak: true, detail };
        viols = j.violations;
      } else {
        viols = verifySurface(surface, files[surface], contract);
      }
      if (!viols.length) break;                              // clean → done with this surface
      if (!flaggedThis) { surfacesFlagged++; flaggedThis = true; }
      violations += viols.length;
      missing += viols.filter((v) => v.kind === 'missing').length;
      invented += viols.filter((v) => v.kind === 'invented').length;
      detail.push({ surface, pass, violations: viols.map((v) => `${v.kind}:${v.category}`) });
      if (pass === maxRepairs) break;                        // out of budget → ship (the oracle still grades it)

      const rp = repairPrompt(prompts[surface] || '', surface, files[surface], viols);
      if (scanOracleLeak(rp)) return { files, ranGate: true, kind: gate.kind, surfacesFlagged, violations, missing, invented, repairs, leak: true, detail };
      let code; try { code = await rebuild(surface, rp); } catch { code = ''; }
      if (!code || !code.trim()) break;                      // repair build failed → keep current code
      files[surface] = code;
      repairs++;
    }
  }
  return { files, ranGate: true, kind: gate.kind, surfacesFlagged, violations, missing, invented, repairs, leak: false, detail };
}

// ---- cheap-judge verify (a free-gateway model grades code-vs-contract; oracle-blind) ---------------
const JUDGE_SYS = 'You are a strict contract reviewer. You are given a function and the list of cross-cutting obligations it must satisfy (and restrictions it must not invent). Decide which obligations are NOT satisfied and which restrictions ARE violated. Reply ONLY compact JSON: {"violations":[{"kind":"missing|invented","category":"<one of the listed>","text":"<short>"}]}. Empty array if fully conformant. No prose.';
function judgePrompt(surface, code, contract) {
  const obl = contract.obligations.filter((o) => !SEMANTIC_CATEGORIES.has(o.category)).map((o) => `- ${o.category}: ${o.text}`).join('\n') || '- (none)';
  const res = contract.restrictions.map((r) => `- ${r.category}: ${r.text}`).join('\n') || '- (none)';
  return [
    `FUNCTION \`${surface}\`:`, '```js', code, '```', '',
    'OBLIGATIONS it MUST satisfy:', obl, '',
    'RESTRICTIONS it must NOT invent:', res, '',
    'Reply ONLY the JSON object.',
  ].join('\n');
}
async function judgeViolations(surface, code, contract, judgeInvoke) {
  const prompt = judgePrompt(surface, code, contract);
  if (scanOracleLeak(prompt)) return { leak: true, violations: [] };
  let g; try { g = await judgeInvoke({ prompt, system: JUDGE_SYS, model: null }); } catch { g = null; }
  const text = g && g.text;
  if (!text) return { leak: false, violations: [] };                 // judge unavailable → fail-open (logged)
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { leak: false, violations: [] };
  try {
    const j = JSON.parse(m[0]);
    const vs = Array.isArray(j.violations) ? j.violations : [];
    return { leak: false, violations: vs.filter((v) => v && (v.kind === 'missing' || v.kind === 'invented')).map((v) => ({ kind: v.kind, category: String(v.category || 'other'), text: String(v.text || '') })) };
  } catch { return { leak: false, violations: [] }; }
}

export { surfaceVerb, declaredStores, SEMANTIC_CATEGORIES, checkObligation };
