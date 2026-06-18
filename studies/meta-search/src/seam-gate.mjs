// The GENERALIZED cross-surface seam-gate (COEVOLUTION-SPEC §4 "generalized integration-gate"). The P2
// integration-gate (integration-gate.mjs) is MEMBERSHIP-ONLY: its writer/reader detection keys off
// surfaceRole()'s addMember/post verbs, so seamPairs() is empty for the other three diverse topologies and
// the gate no-ops (HEAD-TO-HEAD.md: "gate is membership-specific and no-ops elsewhere; raw==final there").
//
// This module generalizes the SEAM DETECTION to all four topologies WITHOUT touching the membership path:
// for the membership profile it DELEGATES verbatim to runIntegrationGate (so every membership result —
// P2a/P2b/P2c/head-to-head — is reproduced bit-for-bit); for approval / quota / lifecycle it runs the SAME
// two structural failure modes the membership gate proved have teeth, now keyed off the PUBLIC skeleton's
// declared shared store rather than the hard-coded NON_MEMBER classifier:
//   MODE A — uninitialized shared store (the dominant N=5 failure class). A seam store declared in the
//     skeleton but NOT in the base preamble (ctx.db.approvals / ctx.db.ledger / ctx.db.transitions) is
//     undefined at runtime and throws on first touch unless every surface defensively inits it. Deterministic,
//     guard-preserving surgical repair (integration-gate.surgicalInitRepair). Topology-agnostic.
//   MODE B — representation drift. Writer and reader disagree on the seam store NAME or shape (Map vs Array),
//     so a recorded record is never found. Model route-back repair injecting the writer's actual write
//     statement. Topology-agnostic.
//
// MODE C (topology semantic invariants — conservation no-overspend, SoD approver≠requester, idempotency,
// legal-transition) is a SEPARATE, harder layer: P2a found a cheap-judge over a semantic clause NULL
// (fail-open), and the (A) contract-precision gene may be the real lever. It is staged as an explicit
// extension hook (modeCIssues) that is OFF until the base-rate probe shows which routes fail it and why —
// we do not add a semantic check before the data says it is load-bearing (COEVOLUTION-SPEC §3.3).
//
// ORACLE-BLINDNESS (kill K3 — identical contract to checker.mjs / integration-gate.mjs). The gate reads ONLY
// public inputs: the base-model preamble, the skeleton contract, the build prompts, and the candidate's own
// emitted code. Every repair/judge prompt is scanned by scanOracleLeak; a hit voids the candidate.

import { scanOracleLeak } from './checker.mjs';
import {
  runIntegrationGate, baseStores, storeStyle, hasInit, writeStatements, surgicalInitRepair,
} from './integration-gate.mjs';

// ---- seam profiles: writer/reader roles + the declared store, per topology (PUBLIC signals only) --------
// Each profile is detected from the skeleton's declared shared store and the surface verbs. Verbs mirror the
// diverse-template families (epics-src/<topology>.mjs) and the routed-baseline SEAM_VERBS, kept oracle-blind.
const PROFILES = [
  {
    topology: 'membership',
    storeRe: /member/i,
    writer: (s) => /member$/i.test(s) || /^add.*member/i.test(s),
    reader: (s) => /^post/i.test(s),
    delegate: true, // membership → the existing, proven gate verbatim
  },
  {
    topology: 'approval',
    storeRe: /approv/i,
    writer: (s) => /^approve/i.test(s),
    reader: (s) => /^(execute|ship|settle|pay|disburse|run|issue|land)/i.test(s),
  },
  {
    topology: 'quota',
    storeRe: /ledger|balance|quota|credit/i,
    // a quota seam is read-modify-write: deposit appends +delta (writer), withdraw reads the summed balance
    // and appends −delta (reader AND writer). Both must agree on the SAME ledger store/shape.
    writer: (s) => /^(deposit|grant|credit|fund|topup|top_up)/i.test(s),
    reader: (s) => /^(withdraw|spend|debit|redeem|consume|drain|pay|charge)/i.test(s),
  },
  {
    topology: 'lifecycle',
    storeRe: /transition|state|status|lifecycle/i,
    writer: (s) => /^(advance|transition|promote|move)/i.test(s),
    reader: (s) => /^get/i.test(s),
  },
];

// the declared seam store = the most-referenced ctx.db.<x> in the skeleton matching the profile's storeRe.
function declaredStore(skeleton, storeRe) {
  if (!skeleton) return null;
  const re = /ctx\.db\.([A-Za-z_]\w*)/g;
  const counts = {};
  let m;
  while ((m = re.exec(skeleton)) !== null) if (storeRe.test(m[1])) counts[m[1]] = (counts[m[1]] || 0) + 1;
  const keys = Object.keys(counts);
  if (!keys.length) return null;
  keys.sort((a, b) => counts[b] - counts[a]);
  return keys[0];
}

// resolve the seam profile for an epic from the PUBLIC skeleton + surface names. Returns null when no profile
// matches (the gate then no-ops, exactly as today on an unknown topology — never a false repair).
export function resolveSeamProfile(skeleton, surfaces) {
  for (const p of PROFILES) {
    const store = declaredStore(skeleton, p.storeRe);
    const writers = surfaces.filter(p.writer);
    const readers = surfaces.filter(p.reader);
    if (store && writers.length && readers.length) return { ...p, store, writers, readers };
  }
  return null;
}

function seamPairsFor(profile) {
  const { writers, readers } = profile;
  if (writers.length <= 1 || readers.length <= 1) return readers.flatMap((reader) => writers.map((writer) => ({ writer, reader })));
  return readers.map((reader, i) => ({ reader, writer: writers[Math.min(i, writers.length - 1)] }));
}

// store accesses on the DECLARED seam store only (we know its name from the contract, so no NON_MEMBER guess).
function touchesStore(code, store) {
  return new RegExp(`ctx\\.db\\.${store.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(code || '');
}
function writesStore(code, store) {
  const s = store.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`ctx\\.db\\.${s}\\s*\\.\\s*(?:set|push)\\s*\\(`).test(code || '')
    || new RegExp(`ctx\\.db\\.${s}\\s*\\[[^\\]]*\\]\\s*=`).test(code || '');
}
function readsStore(code, store) {
  const s = store.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`ctx\\.db\\.${s}\\s*\\.\\s*(?:has|get|some|find|filter|includes|findIndex|reduce|map|forEach|length)`).test(code || '')
    || new RegExp(`ctx\\.db\\.${s}\\b(?!\\s*(?:\\?\\?=|\\|\\|=|=[^=]))`).test(code || '');
}

// MODE A + MODE B issues on the DECLARED store, ordered by severity (a crash masks drift → init first).
function seamIssuesGeneral(writerCode, readerCode, store, baseSet) {
  const issues = [];
  const init = (code, tag) => {
    if (baseSet.has(store)) return;            // declared in the base preamble → pre-exists, no init needed
    if (touchesStore(code, store) && !hasInit(code, store)) {
      issues.push({ mode: 'init', surface: tag, store,
        msg: `ctx.db.${store} is NOT part of the base data model — this surface accesses it without creating it, so it is undefined at runtime and the call throws. Initialize it defensively before first use (e.g. \`ctx.db.${store} ??= []\` for an Array or \`ctx.db.${store} ??= new Map()\` for a Map) in EVERY function that touches it.` });
    }
  };
  init(writerCode, 'writer');
  init(readerCode, 'reader');
  if (issues.length) return issues;            // fix the crash first

  // MODE B — drift on the declared store. The reader must read the SAME store the writer writes.
  const wWrites = writesStore(writerCode, store);
  const rReads = readsStore(readerCode, store);
  if (wWrites && !rReads) {
    issues.push({ mode: 'drift', surface: 'reader', msg: `the writer records to ctx.db.${store} but the reader never reads ctx.db.${store}, so what the writer records can never be found` });
    return issues;
  }
  if (wWrites && rReads) {
    const ws = storeStyle(writerCode, store), rs = storeStyle(readerCode, store);
    if (ws !== 'unknown' && rs !== 'unknown' && ws !== rs && ws !== 'mixed' && rs !== 'mixed') {
      issues.push({ mode: 'drift', surface: 'reader', msg: `the writer uses ctx.db.${store} as a ${ws} but the reader uses it as a ${rs} — the lookup will never match what was written; read it with the same shape it is written.` });
    }
  }
  return issues;
}

// MODE C extension hook (topology semantic invariants) — DISABLED until the base-rate probe says it is needed
// (COEVOLUTION-SPEC §3.3 / §4). Returns [] today; this is the documented seam for the conservation / SoD /
// idempotency checks and is where the (A) contract-precision gene will plug in. Kept oracle-blind by contract.
export function modeCIssues(/* profile, writerCode, readerCode, skeleton */) { return []; }

function repairPrompt(originalPrompt, issue, writerWriteStmts, currentCode) {
  const inject = (issue.mode === 'drift' && issue.surface === 'reader' && writerWriteStmts)
    ? `\nThe record is written like this (by the writer surface):\n\`\`\`js\n${writerWriteStmts}\n\`\`\`\nRead it from the SAME store and SAME shape it is written with above.` : '';
  return [
    originalPrompt, '',
    currentCode ? `## Your current implementation of this surface (keep it intact except for the one fix below):\n\`\`\`js\n${currentCode}\n\`\`\`` : '',
    '## Integration reviewer feedback — this surface does not compose with the rest of the system:',
    `- ${issue.msg}`,
    inject,
    '\nReturn your current implementation with ONLY this issue fixed. Preserve every existing authorization, tenancy, ownership, conservation, and input-validation check EXACTLY as written — do not drop or weaken any guard. Output ONLY the corrected JavaScript module.',
  ].join('\n');
}

/**
 * Run the GENERALIZED seam-gate over a built epic. Membership delegates to the proven integration-gate
 * (bit-identical); the other topologies run the generalized Mode-A/Mode-B detection on the declared store.
 * Signature mirrors runIntegrationGate so the evaluator/harness can swap it in directly.
 */
export async function runSeamGate({ surfaces, files, prompts, skeleton, baseModel = '', gate, rebuild, judgeInvoke }) {
  if (!gate || gate.kind === 'off') return { files, ranGate: false, kind: 'off', topology: null, pairs: 0, mismatches: 0, repairs: 0, leak: false };
  const profile = resolveSeamProfile(skeleton, surfaces);
  if (!profile) return { files, ranGate: false, kind: gate.kind, topology: null, pairs: 0, mismatches: 0, repairs: 0, leak: false };

  // membership → the existing, proven gate, verbatim (reproduces every prior membership result).
  if (profile.delegate) {
    const r = await runIntegrationGate({ surfaces, files, prompts, skeleton, baseModel, gate, rebuild, judgeInvoke });
    return { ...r, topology: 'membership' };
  }

  const pairs = seamPairsFor(profile);
  const baseSet = baseStores(baseModel);
  const maxRepairs = Math.max(0, gate.repairDepth || 0);
  let mismatches = 0, repairs = 0;

  for (const { writer, reader } of pairs) {
    if (!(writer in files) || !(reader in files)) continue;
    let counted = false;
    const mark = () => { if (!counted) { mismatches++; counted = true; } };

    // PASS 0 — deterministic surgical INIT sweep (Mode A), $0, guard-preserving, not charged to repairDepth.
    if (gate.kind === 'deterministic' && maxRepairs >= 1) {
      for (let guard = 0; guard < surfaces.length * 2 + 4; guard++) {
        const init = seamIssuesGeneral(files[writer], files[reader], profile.store, baseSet).find((i) => i.mode === 'init');
        if (!init) break;
        mark();
        const tgt = init.surface === 'writer' ? writer : reader;
        const patched = surgicalInitRepair(files[tgt], init.store, storeStyle(files[tgt], init.store));
        if (!patched || patched === files[tgt]) break;
        files[tgt] = patched; repairs++;
      }
    }

    // PASS 1..maxRepairs — model route-back for residual drift (and any init the surgical sweep couldn't place).
    for (let pass = 0; pass <= maxRepairs; pass++) {
      const issue = seamIssuesGeneral(files[writer], files[reader], profile.store, baseSet)[0]
        || modeCIssues(profile, files[writer], files[reader], skeleton)[0] || null;
      if (!issue) break;
      mark();
      if (pass === maxRepairs) break;
      const target = issue.surface === 'writer' ? writer : reader;
      const writeStmts = writeStatements(files[writer], [profile.store]);
      const rp = repairPrompt(prompts[target] || '', issue, writeStmts, files[target]);
      if (scanOracleLeak(rp)) return { files, ranGate: true, kind: gate.kind, topology: profile.topology, pairs: pairs.length, mismatches, repairs, leak: true };
      let code; try { code = await rebuild(target, rp); } catch { code = ''; }
      if (!code || !code.trim()) break;
      files[target] = code; repairs++;
    }
  }
  return { files, ranGate: true, kind: gate.kind, topology: profile.topology, pairs: pairs.length, mismatches, repairs, leak: false };
}
