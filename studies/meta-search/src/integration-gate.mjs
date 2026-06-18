// The cross-surface INTEGRATION-GATE + repair lever (build-gap DESIGN §4b "integration gate + repair";
// the P2 successor to the per-surface checker). P1 proved the per-surface checker is NULL on `integration`
// at N=5 because a checker that inspects ONE surface at a time structurally cannot reason about a TWO-surface
// seam (`addMember` writes the membership; `postComment` reads it). This lever runs AFTER assembly, sees ALL
// the built surfaces at once, and routes a repair back to the offending surface.
//
// TWO INTEGRATION FAILURE MODES at the membership seam (both measured live, P2a-RESULTS.md):
//   MODE A — UNINITIALIZED SHARED STORE (the DOMINANT N=5 failure). The membership collection is NOT in the
//     base data model (the preamble declares only users/projects/comments; the oracle pre-creates a store under
//     a DIFFERENT name and never reads it — scale-oracle.mjs:12-16). A surface that accesses its chosen store
//     (`ctx.db.memberships.has(...)`) WITHOUT a defensive init (`ctx.db.memberships ??= ...`) throws
//     "Cannot read properties of undefined" on first touch, so `addMember` dies before recording anything and
//     every integration test fails. This is inherently CROSS-surface: you only know the store is "new" (needs
//     init) by reading the BASE MODEL, and the seam composes only if every surface that touches the shared
//     store initializes it. A per-surface obligation checker cannot see this; the integration-gate can.
//   MODE B — REPRESENTATION DRIFT. The writer and reader disagree on the store NAME or access STYLE (Map vs
//     Array), so a recorded member is never found. The repair injects the writer's actual write-statement into
//     the reader's rebuild — the cross-surface signal the per-surface checker never had.
//
// WHY a cross-surface lever is the right shape (representation-agnostic oracle, scale-oracle.mjs:12-16): the
// oracle NEVER reads a membership store directly — it penalises only DRIFT/breakage between the two surfaces.
// So `integration` passes iff the writer and reader AGREE on a representation that actually exists at runtime.
//
// ORACLE-BLINDNESS (constraint §2.3 / kill K3 — load-bearing, identical contract to checker.mjs). The gate
// reads ONLY public inputs: the base-model PREAMBLE, the SKELETON contract, the surface build prompts, and the
// candidate's OWN emitted code. Every judge/repair prompt is run through `scanOracleLeak`; a hit returns
// leak=true so the caller voids the candidate. By construction there is no leak — the scan is the mechanical
// guarantee, not an assumption.

import { surfaceRole, scanOracleLeak, declaredMemberStore } from './checker.mjs';

function isWriter(surface) { return surfaceRole(surface) === 'addMember'; }
function isReader(surface) { return surfaceRole(surface) === 'post'; }

// ---- store extraction (all PUBLIC: the candidate's own code + the base-model preamble) --------------
function writtenStores(code) {
  const c = code || '';
  const out = new Set();
  for (const re of [/ctx\.db\.([A-Za-z_]\w*)\s*\.\s*set\s*\(/g, /ctx\.db\.([A-Za-z_]\w*)\s*\.\s*push\s*\(/g, /ctx\.db\.([A-Za-z_]\w*)\s*\[[^\]]*\]\s*=/g]) {
    let m; while ((m = re.exec(c)) !== null) out.add(m[1]);
  }
  return out;
}
function readStores(code) {
  const c = code || '';
  const out = new Set();
  for (const re of [/ctx\.db\.([A-Za-z_]\w*)\s*\.\s*(?:has|get|some|find|filter|includes|findIndex)\s*\(/g]) {
    let m; while ((m = re.exec(c)) !== null) out.add(m[1]);
  }
  return out;
}
// the ctx.db.<store> names DECLARED by the public base model (preamble) / skeleton → these pre-exist, no init.
function baseStores(text) {
  const out = new Set();
  const re = /ctx\.db\.([A-Za-z_]\w*)/g;
  let m; while ((m = re.exec(text || '')) !== null) out.add(m[1]);
  return out;
}
const NON_MEMBER = /^(users?|projects?|comments?|vaults?|files?|trackers?|tickets?|channels?|messages?|boards?|cards?)$/i;
function memberStores(set) { return [...set].filter((s) => !NON_MEMBER.test(s)); }

function storeStyle(code, store) {
  const c = code || '';
  const map = new RegExp(`ctx\\.db\\.${store}\\s*\\.\\s*(?:set|has|get)\\s*\\(`).test(c);
  const arr = new RegExp(`ctx\\.db\\.${store}\\s*\\.\\s*(?:push|some|find|filter|includes|findIndex)\\s*\\(`).test(c);
  if (map && !arr) return 'map';
  if (arr && !map) return 'array';
  return map || arr ? 'mixed' : 'unknown';
}
// does the surface defensively initialize ctx.db.<store> before use? Only TRUE initializations count — a
// membership CHECK like `if (!ctx.db.X.has(k))` must NOT be mistaken for an init guard (that bug is exactly
// what made the gate miss the dominant uninitialized-store crash).
function hasInit(code, store) {
  const c = code || '';
  const s = store.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`ctx\\.db\\.${s}\\s*\\?\\?=`).test(c)                  // ctx.db.X ??= ...
    || new RegExp(`ctx\\.db\\.${s}\\s*\\|\\|=`).test(c)                    // ctx.db.X ||= ...
    || new RegExp(`ctx\\.db\\.${s}\\s*=[^=]`).test(c)                      // ctx.db.X = ...  (assign the container; not ==/===, not .X.foo=)
    || new RegExp(`if\\s*\\(\\s*!\\s*ctx\\.db\\.${s}\\s*\\)`).test(c)      // if (!ctx.db.X)  — the store itself, NOT if(!ctx.db.X.has(..))
    || new RegExp(`ctx\\.db\\.${s}\\s*\\|\\|\\s*\\(`).test(c);             // ctx.db.X || (ctx.db.X = ...)
}
// the membership-write statement(s) — injected into a drift repair (cross-surface signal).
function writeStatements(code, stores) {
  const c = code || '';
  return c.split('\n').filter((ln) => stores.some((s) => new RegExp(`ctx\\.db\\.${s}\\b`).test(ln)) && /\.(set|push)\s*\(|\[[^\]]*\]\s*=/.test(ln)).map((l) => l.trim()).slice(0, 6).join('\n');
}

function seamPairs(surfaces) {
  const writers = surfaces.filter(isWriter);
  const readers = surfaces.filter(isReader);
  if (writers.length <= 1 || readers.length <= 1) return readers.flatMap((reader) => writers.map((writer) => ({ writer, reader })));
  return readers.map((reader, i) => ({ reader, writer: writers[Math.min(i, writers.length - 1)] }));
}

// ---- the unified seam analysis: Mode A (init) + Mode B (drift), ordered by severity ----------------
// Returns a list of issues, each routable to a single surface with a repair. Mode A first (a crash masks
// any drift); only when both sides are init-safe do we test representation agreement.
function seamIssues(writerCode, readerCode, baseSet) {
  const issues = [];
  const wMember = memberStores(writtenStores(writerCode));
  const rMember = memberStores(readStores(readerCode));

  // MODE A — a membership store accessed by either surface that is NOT in the base model and is not
  // defensively initialized by that surface → it will be undefined at runtime and throw.
  const initCheck = (code, stores, surfaceTag) => {
    for (const s of stores) {
      if (baseSet.has(s)) continue;                 // pre-exists in the base model → no init needed
      if (!hasInit(code, s)) issues.push({ mode: 'init', surface: surfaceTag, store: s,
        msg: `ctx.db.${s} is NOT part of the base data model (the base model provides only ctx.db.{${[...baseSet].filter((x) => NON_MEMBER.test(x) || /user|project|comment/i.test(x)).join(',') || 'users,projects,comments'}}). This surface accesses ctx.db.${s} without creating it, so it is undefined at runtime and the call throws. Initialize it defensively before first use (e.g. \`ctx.db.${s} ??= new Map()\` if you use it as a Map, or \`ctx.db.${s} ??= []\` if an Array) — in EVERY function that touches it.` });
    }
  };
  initCheck(writerCode, wMember, 'writer');
  initCheck(readerCode, rMember, 'reader');
  if (issues.length) return issues;                 // a crash masks drift — fix init first

  // MODE B — representation drift (only meaningful once both sides are init-safe).
  if (!wMember.length || !rMember.length) {
    issues.push({ mode: 'drift', surface: !wMember.length ? 'writer' : 'reader',
      msg: !wMember.length ? 'the addMember surface never records membership in any store, so postComment has nothing to read' : 'the postComment surface never reads a membership store, so the membership check is missing' });
    return issues;
  }
  const shared = wMember.filter((s) => rMember.includes(s));
  if (!shared.length) {
    issues.push({ mode: 'drift', surface: 'reader', msg: `the writer records membership in ctx.db.${wMember.join('/')} but the reader checks ctx.db.${rMember.join('/')} — different stores, so a member added cannot be found` });
    return issues;
  }
  for (const s of shared) {
    const ws = storeStyle(writerCode, s), rs = storeStyle(readerCode, s);
    if (ws !== 'unknown' && rs !== 'unknown' && ws !== rs && ws !== 'mixed' && rs !== 'mixed') {
      issues.push({ mode: 'drift', surface: 'reader', msg: `the writer uses ctx.db.${s} as a ${ws} (writes with .${ws === 'map' ? 'set' : 'push'}) but the reader uses it as a ${rs} — the membership lookup will never match what was written` });
      return issues;
    }
  }
  return issues; // empty → the seam composes
}

// back-compat thin wrapper used by the smoke (drift-only view, no base model).
function deterministicSeamCheck(writerCode, readerCode, baseSet = new Set(['users', 'projects', 'comments'])) {
  const issues = seamIssues(writerCode, readerCode, baseSet);
  return { mismatch: issues.length ? issues[0].msg : null, mode: issues[0]?.mode || null, surface: issues[0]?.surface || null,
    wStores: memberStores(writtenStores(writerCode)), rStores: memberStores(readStores(readerCode)) };
}

// ---- judge (cheap-judge) --------------------------------------------------------------------------
const JUDGE_SYS = 'You are a strict integration reviewer. You are given the BASE data model plus TWO functions that must compose across a shared membership store: a WRITER that records membership and a READER that checks it. A member recorded by the WRITER must be found by the READER at runtime. Watch for (1) a store NOT in the base model that is used without being initialized (it will be undefined and throw), and (2) the two functions using a different store name or shape. Reply ONLY compact JSON: {"agree": true|false, "mismatch": "<short reason if not, else empty>"}. No prose.';
function judgePrompt(baseModel, skeletonClause, writerCode, readerCode) {
  return [
    baseModel ? `BASE DATA MODEL (what ctx.db already contains):\n${baseModel}\n` : '',
    skeletonClause ? `SHARED CONTRACT:\n${skeletonClause}\n` : '',
    'WRITER (records membership):', '```js', writerCode, '```', '',
    'READER (checks membership before allowing the action):', '```js', readerCode, '```', '',
    'Would a member recorded by the WRITER be found by the READER at runtime? Reply ONLY the JSON object.',
  ].join('\n');
}
function parseJudge(text) {
  if (!text) return { agree: true, mismatch: '' };
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { agree: true, mismatch: '' };
  try { const j = JSON.parse(m[0]); return { agree: j.agree !== false, mismatch: typeof j.mismatch === 'string' ? j.mismatch : '' }; }
  catch { return { agree: true, mismatch: '' }; }
}
function membershipClause(skeleton) {
  const store = declaredMemberStore(skeleton);
  if (!store) return '';
  return `The contract declares the membership store as ctx.db.${store}. addMember writes a membership there; postComment must read it back from the same store with the same shape (and every function that touches it must initialize it defensively, as it is not in the base model).`;
}

// ---- repair (cross-surface route-back) ------------------------------------------------------------
function repairPrompt(originalPrompt, issue, writerWriteStmts, clause, currentCode = '') {
  const inject = (issue.mode === 'drift' && issue.surface === 'reader' && writerWriteStmts)
    ? `\nThe membership is written like this (by the addMember surface):\n\`\`\`js\n${writerWriteStmts}\n\`\`\`\nRead membership from the SAME store and SAME shape it is written with above.` : '';
  return [
    originalPrompt, '',
    // Show the model its CURRENT implementation and tell it to keep the guards. A repair that regenerates
    // from the spec alone is what dropped an obligation guard at scale (the X-CUT −3pp, P2a/P2b); anchoring
    // on the existing code + an explicit preserve-guards instruction is the model-side half of that fix.
    currentCode ? `## Your current implementation of this surface (keep it intact except for the one fix below):\n\`\`\`js\n${currentCode}\n\`\`\`` : '',
    '## Integration reviewer feedback — this surface does not compose with the rest of the system:',
    `- ${issue.msg}`,
    inject,
    clause ? `\n${clause}` : '',
    '\nReturn your current implementation with ONLY this issue fixed. Preserve every existing authorization, tenancy, ownership, and input-validation check EXACTLY as written — do not drop or weaken any guard. Output ONLY the corrected JavaScript module.',
  ].join('\n');
}

// DETERMINISTIC surgical init-repair (Mode A — the dominant N=5 failure). Inject `ctx.db.<store> ??= <init>;`
// immediately before the FIRST line that accesses the store, leaving the rest of the surface byte-for-byte
// intact. Because it does NOT regenerate the surface, it (a) can never drop an obligation guard the way a full
// model rebuild can (the X-CUT −3pp side-effect, P2a/P2b §"Tighten the lever"), and (b) always succeeds — so
// it lifts the INTEG floor at scale without spending the model `repairDepth` budget. The store STYLE (Map vs
// Array) is read from how the surface already uses it, so the initializer matches the existing access.
function initializerFor(style) { return style === 'array' ? '[]' : 'new Map()'; }
function surgicalInitRepair(code, store, style) {
  const src = code || '';
  if (!new RegExp(`ctx\\.db\\.${store.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(src)) return null;
  // Inject the init at the TOP OF THE FUNCTION BODY = the first "{" after the parameter list's first ")".
  // (Robust for single-line and multi-line surfaces; param destructuring/defaults use braces, not parens, so
  // the first ")" is the param-list close.) Falls back to null → a model rebuild — if no body brace is found.
  const paren = src.indexOf(')');
  const brace = paren === -1 ? -1 : src.indexOf('{', paren);
  if (brace === -1) return null;
  return `${src.slice(0, brace + 1)} ctx.db.${store} ??= ${initializerFor(style)};${src.slice(brace + 1)}`;
}

/**
 * Run the integration-gate over a fully-built epic's surfaces, repairing seam issues up to repairDepth.
 * @param {object} p
 * @param {string[]} p.surfaces        the built surface names (public build order)
 * @param {Record<string,string>} p.files  surface -> emitted module code (mutated in place on repair)
 * @param {Record<string,string>} p.prompts  surface -> its build prompt (for the route-back re-prompt)
 * @param {string} p.skeleton          the injected contract text (public)
 * @param {string} [p.baseModel]       the base-model preamble text (public) — tells the gate which stores pre-exist
 * @param {{kind:string, repairDepth:number}} p.gate  genome.integrationGate
 * @param {(surface:string, prompt:string)=>Promise<string>} p.rebuild  re-build one surface from a prompt
 * @param {(args:object)=>Promise<{text:string}>} p.judgeInvoke  free-gateway invoker (cheap-judge only)
 * @returns {Promise<{files, ranGate, kind, pairs, mismatches, repairs, leak}>}
 */
export async function runIntegrationGate({ surfaces, files, prompts, skeleton, baseModel = '', gate, rebuild, judgeInvoke }) {
  if (!gate || gate.kind === 'off') return { files, ranGate: false, kind: 'off', pairs: 0, mismatches: 0, repairs: 0, leak: false };
  const pairs = seamPairs(surfaces);
  // What PRE-EXISTS at runtime = the base-model PREAMBLE only. A store merely DECLARED in the skeleton still
  // must be initialized (opus §1.3: "not guaranteed to pre-exist → ctx.db.X ??= []"), so the skeleton is
  // deliberately NOT folded in here — otherwise the gate would treat the membership store as base and miss
  // the dominant uninitialized-store crash.
  const baseSet = baseStores(baseModel);
  const clause = membershipClause(skeleton);
  const maxRepairs = Math.max(0, gate.repairDepth || 0);
  let mismatches = 0, repairs = 0;

  for (const { writer, reader } of pairs) {
    if (!(writer in files) || !(reader in files)) continue;
    let counted = false;
    const markMismatch = () => { if (!counted) { mismatches++; counted = true; } };

    // PASS 0 — deterministic surgical INIT sweep (Mode A). $0, guard-preserving, guaranteed; fixes EVERY init
    // issue on this pair (writer and reader, every store) and is NOT charged to the model `repairDepth` budget,
    // since it can't regress a guard. Only when the gate is allowed to repair (repairDepth ≥ 1). A store the
    // surgical patch can't place (no access line found) is left for the model fallback below.
    if (gate.kind === 'deterministic' && maxRepairs >= 1) {
      for (let guard = 0; guard < surfaces.length * 2 + 4; guard++) {
        const init = seamIssues(files[writer], files[reader], baseSet).find((i) => i.mode === 'init');
        if (!init) break;
        markMismatch();
        const tgt = init.surface === 'writer' ? writer : reader;
        const patched = surgicalInitRepair(files[tgt], init.store, storeStyle(files[tgt], init.store));
        if (!patched || patched === files[tgt]) break;   // couldn't place → leave to the model pass
        files[tgt] = patched; repairs++;
      }
    }

    // PASS 1..maxRepairs — model route-back for residual seam issues (Mode B drift / cheap-judge, and any init
    // the surgical sweep couldn't place). Recompute each pass (a repair may resolve one and reveal the next).
    for (let pass = 0; pass <= maxRepairs; pass++) {
      let issue = null;
      if (gate.kind === 'cheap-judge') {
        const prompt = judgePrompt(baseModel, clause, files[writer], files[reader]);
        if (scanOracleLeak(prompt)) return { files, ranGate: true, kind: gate.kind, pairs: pairs.length, mismatches, repairs, leak: true };
        let g; try { g = await judgeInvoke({ prompt, system: JUDGE_SYS, model: null }); } catch { g = null; }
        const v = parseJudge(g && g.text);
        // the judge gives a single verdict; route its repair to the reader (it cannot localise the surface).
        issue = v.agree ? null : { mode: 'judge', surface: 'reader', msg: v.mismatch || 'the reader does not read membership the way the writer writes it at runtime' };
      } else {
        issue = seamIssues(files[writer], files[reader], baseSet)[0] || null;
      }
      if (!issue) break;                       // seam composes → done
      markMismatch();
      if (pass === maxRepairs) break;          // out of budget → ship; the oracle still grades it

      const target = issue.surface === 'writer' ? writer : reader;
      const writeStmts = writeStatements(files[writer], memberStores(writtenStores(files[writer])));
      const rp = repairPrompt(prompts[target] || '', issue, writeStmts, clause, files[target]);
      if (scanOracleLeak(rp)) return { files, ranGate: true, kind: gate.kind, pairs: pairs.length, mismatches, repairs, leak: true };
      let code; try { code = await rebuild(target, rp); } catch { code = ''; }
      if (!code || !code.trim()) break;        // repair build failed → keep current code
      files[target] = code;
      repairs++;
    }
  }
  return { files, ranGate: true, kind: gate.kind, pairs: pairs.length, mismatches, repairs, leak: false };
}

export { seamPairs, seamIssues, deterministicSeamCheck, writtenStores, readStores, baseStores, memberStores, storeStyle, hasInit, writeStatements, membershipClause, surgicalInitRepair };
