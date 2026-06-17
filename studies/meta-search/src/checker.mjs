// The per-surface CHECKER lever (DESIGN §2 "per-surface checker (live lever)" + build-gap DESIGN §4a/§4b
// "per-task checker + re-prompt" / "integration gate + repair"). THIS is the gene P1 searches: the FREEZE
// pre-registers the checker as the attributed lever at fixed N=5, and P1's primary question is the
// mechanism — does turning the checker on move `crosscut`/`integration`?
//
// What the checker does, per surface, AFTER the cheap builder emits code:
//   1. Determine which obligation clauses apply to the surface (by surface role) ∩ the genome's enabled
//      obligationClasses.
//   2. Check the code against each clause:
//        - kind 'deterministic' — static, oracle-blind heuristics on the code string (cheap, $0).
//        - kind 'cheap-judge'   — a FREE-gateway model judges code-vs-clause (cheap, $0 on the free pool).
//   3. On a violation, re-prompt the cheap builder with the violation text (repair) and re-check, up to
//      `repairDepth` passes. Returns the (possibly repaired) code.
//
// ORACLE-BLINDNESS (constraint §2.3 / kill K3 — load-bearing). The checker NEVER reads the oracle
// (tests.mjs / scale-oracle.mjs). Its only inputs are the SKELETON contract (public — the builder sees it
// too), the public surface spec, the obligation-class NAME, and the generated code. Every checker/judge/
// repair prompt is run through `scanOracleLeak`; a hit returns leak=true so the caller can void the
// candidate (K3). By construction there is no leak (we feed contract text, never oracle text) — the scan
// is the mechanical guarantee, not an assumption.

// ---- oracle-token denylist (the distinctive strings only the oracle uses) -------------------------
// Bare policy words (tenancy/authz/mass-assignment) appear in the PUBLIC skeleton and are NOT leaks; the
// oracle's distinctive forms are its test-name structure ("…@<surface>", "SEAM±", "ISO@") and its private
// fixture literals. A checker prompt that contained any of these could only have read the oracle.
const ORACLE_TOKENS = [
  'SEAM+', 'SEAM-', 'ISO@', '@createProject', '@listProjects', '@addMember', '@postComment',
  '@updateProfile', 'representations agree', 'Apollo', 'u-admin1', 'u-m1', 'u-m2', 'u-x2',
  'org-2', 'HACK', 'Secret', 'M1b', 'buildOracle', 'scale-oracle',
];

/** True if `text` contains any oracle-internal token (a K3 leak). */
export function scanOracleLeak(text) {
  if (!text) return false;
  return ORACLE_TOKENS.some((t) => text.includes(t));
}

// ---- surface role → applicable obligation classes -------------------------------------------------
// Generic by name pattern so it also covers the 5-domain catalog (vault/tracker/… ) at P2, not just the
// workspace nouns. Each surface gets the cross-cutting concerns it actually touches.
function surfaceRole(surface) {
  if (/^create/i.test(surface)) return 'create';
  if (/^list/i.test(surface)) return 'list';
  if (/member$/i.test(surface) || /^add.*member/i.test(surface)) return 'addMember';
  if (/^post/i.test(surface)) return 'post';
  if (/^updateProfile$/i.test(surface)) return 'updateProfile';
  return 'other';
}

// (role, obligationClass) -> a short, oracle-blind requirement clause (derived from the public contract).
// `seam` is folded into addMember/post (the membership store both sides must agree on).
const CLAUSES = {
  create:   { tenancy: 'stamp the new record with the caller\'s ctx.session.orgId (never a client-supplied orgId), and only operate within the caller\'s org.' },
  list:     { tenancy: 'return ONLY records belonging to the caller\'s ctx.session.orgId; never leak another org\'s records.' },
  addMember:{ tenancy: 'only add memberships to a container in the caller\'s own org; adding to another org\'s container must throw.',
              authz:   'require the caller to be an admin (ctx.session.role === "admin"); a non-admin caller must be refused.',
              seam:    'record the membership in the SAME membership store/shape the contract declares, so the post surface can read it back.' },
  post:     { tenancy: 'only operate within the caller\'s own org; cross-org posting must throw.',
              authz:   'require the caller to be a member of the container (per the declared membership store) before allowing the post; non-members must be refused.',
              seam:    'check membership by reading the SAME membership store/shape the contract declares (the one addMember writes).' },
  updateProfile:{ authz:'allow editing only the caller\'s own profile or (if admin) any profile; editing another user as a non-admin must throw.',
                  'mass-assign':'apply ONLY name and bio from the patch; never let the patch set id, orgId, or role.' },
};

function applicableClauses(surface, enabledClasses) {
  const role = surfaceRole(surface);
  const byRole = CLAUSES[role] || {};
  const out = [];
  for (const [cls, text] of Object.entries(byRole)) {
    // 'seam' rides with whichever obligation classes are enabled (it is the shared-shape clause, not a
    // separate gene); include it whenever the checker is on at all.
    if (cls === 'seam' || enabledClasses.includes(cls)) out.push({ cls, text });
  }
  return out;
}

// ---- the declared membership store name (for the deterministic seam check) ------------------------
// Extract `ctx.db.<x>` where <x> mentions "member" from the skeleton (the contract both surfaces share).
export function declaredMemberStore(skeleton) {
  if (!skeleton) return null;
  const re = /ctx\.db\.([A-Za-z_]*[Mm]ember[A-Za-z_]*)/g;
  const counts = {};
  let m;
  while ((m = re.exec(skeleton)) !== null) counts[m[1]] = (counts[m[1]] || 0) + 1;
  const keys = Object.keys(counts);
  if (!keys.length) return null;
  keys.sort((a, b) => counts[b] - counts[a]);
  return keys[0];
}

// ---- deterministic static checks (oracle-blind heuristics on the code string) ---------------------
// Conservative: flag only a clear ABSENCE of the required guard, so good code is not needlessly repaired.
function deterministicViolations(surface, code, clauses, memberStore) {
  const c = code || '';
  const has = (re) => re.test(c);
  const out = [];
  for (const { cls, text } of clauses) {
    let ok = true;
    if (cls === 'tenancy') ok = has(/orgId/);
    else if (cls === 'authz') {
      const role = surfaceRole(surface);
      if (role === 'addMember') ok = /role/.test(c) && /admin/.test(c);
      else if (role === 'post') ok = new RegExp(memberStore || 'member', 'i').test(c) || /member/i.test(c);
      else if (role === 'updateProfile') ok = /role\s*===\s*['"]admin['"]/.test(c) || /userId/.test(c) || /session\.userId/.test(c);
    } else if (cls === 'mass-assign') {
      // a violation is an UNGUARDED spread of the patch, or a direct write of a protected field from patch.
      const spreads = /\.\.\.\s*(patch|updates|body|input)\b/.test(c);
      const writesProtected = /\b(role|orgId|id)\s*:\s*(patch|updates|body|input)\.(role|orgId|id)/.test(c);
      ok = !spreads && !writesProtected;
    } else if (cls === 'seam') {
      ok = memberStore ? new RegExp(`ctx\\.db\\.${memberStore}\\b`).test(c) || new RegExp(memberStore, 'i').test(c) : /member/i.test(c);
    }
    if (!ok) out.push(`${cls}: ${text}`);
  }
  return out;
}

// ---- cheap-judge checks (a free-gateway model judges code vs clause) ------------------------------
const JUDGE_SYS = 'You are a strict code reviewer. You are given ONE requirement and ONE function. Decide only whether the function satisfies that one requirement. Reply with ONLY compact JSON: {"ok": true|false, "violation": "<short reason if not ok, else empty>"}. No prose.';

function judgePrompt(clauseText, code) {
  return [
    'REQUIREMENT (the function must satisfy this):',
    clauseText,
    '',
    'FUNCTION CODE:',
    '```js',
    code,
    '```',
    '',
    'Does the function satisfy the requirement? Reply ONLY the JSON object.',
  ].join('\n');
}

function parseJudge(text) {
  if (!text) return { ok: true, violation: '' }; // judge unavailable → do not block (fail-open, logged)
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { ok: true, violation: '' };
  try {
    const j = JSON.parse(m[0]);
    return { ok: j.ok !== false, violation: typeof j.violation === 'string' ? j.violation : '' };
  } catch { return { ok: true, violation: '' }; }
}

async function judgeViolations(code, clauses, judgeInvoke) {
  const out = [];
  for (const { cls, text } of clauses) {
    const prompt = judgePrompt(text, code);
    if (scanOracleLeak(prompt)) return { leak: true, violations: [] };
    let g;
    try { g = await judgeInvoke({ prompt, system: JUDGE_SYS, model: null }); } catch { g = null; }
    const v = parseJudge(g && g.text);
    if (!v.ok) out.push(`${cls}: ${v.violation || text}`);
  }
  return { leak: false, violations: out };
}

// ---- the lever -----------------------------------------------------------------------------------
function repairPrompt(originalPrompt, violations) {
  return [
    originalPrompt,
    '',
    '## Reviewer feedback on your previous attempt — you MUST fix these and resubmit the full module:',
    ...violations.map((v) => `- ${v}`),
    '',
    'Output ONLY the corrected JavaScript module.',
  ].join('\n');
}

/**
 * Run the checker lever on one built surface, repairing up to repairDepth passes.
 * @param {object} p
 * @param {string} p.surface        surface name (role detection)
 * @param {string} p.code           the cheap builder's emitted module text
 * @param {string} p.originalPrompt the surface build prompt (for the repair re-prompt; public, no oracle)
 * @param {string} p.skeleton       the injected contract text (public)
 * @param {object} p.checker        genome.checker = {kind, obligationClasses, repairDepth}
 * @param {(prompt:string)=>Promise<{text:string}>} p.rebuild  re-build the surface from a repair prompt
 * @param {(args:object)=>Promise<{text:string}>}  p.judgeInvoke  free-gateway invoker (cheap-judge only)
 * @returns {Promise<{code:string, ranChecker:boolean, repairs:number, violations:number, leak:boolean}>}
 */
export async function runChecker({ surface, code, originalPrompt, skeleton, checker, rebuild, judgeInvoke }) {
  if (!checker || checker.kind === 'off') return { code, ranChecker: false, repairs: 0, violations: 0, leak: false };
  const enabled = Array.isArray(checker.obligationClasses) ? checker.obligationClasses : [];
  const clauses = applicableClauses(surface, enabled);
  if (!clauses.length) return { code, ranChecker: true, repairs: 0, violations: 0, leak: false };

  const memberStore = declaredMemberStore(skeleton);
  const maxRepairs = Math.max(0, checker.repairDepth || 0);
  let cur = code;
  let totalViolations = 0;
  let repairs = 0;

  for (let pass = 0; pass <= maxRepairs; pass++) {
    let result;
    if (checker.kind === 'cheap-judge') result = await judgeViolations(cur, clauses, judgeInvoke);
    else result = { leak: false, violations: deterministicViolations(surface, cur, clauses, memberStore) };
    if (result.leak) return { code: cur, ranChecker: true, repairs, violations: totalViolations, leak: true };

    const violations = result.violations;
    if (!violations.length) break;          // clean → done
    totalViolations += violations.length;
    if (pass === maxRepairs) break;          // out of repair budget → ship as-is (still scored by the oracle)

    const rp = repairPrompt(originalPrompt, violations);
    if (scanOracleLeak(rp)) return { code: cur, ranChecker: true, repairs, violations: totalViolations, leak: true };
    let g;
    try { g = await rebuild(rp); } catch { g = null; }
    if (!g || !g.text || !g.text.trim()) break; // repair build failed → keep current code
    cur = g.text;
    repairs++;
  }
  return { code: cur, ranChecker: true, repairs, violations: totalViolations, leak: false };
}

export { surfaceRole, applicableClauses, deterministicViolations, CLAUSES };
