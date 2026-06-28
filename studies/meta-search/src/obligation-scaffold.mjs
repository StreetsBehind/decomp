// THE STRONG INJECTION (terminal lever) — DETERMINISTIC, skeleton-derived obligation SCAFFOLD generator.
//
// Pre-registered in AMENDMENTS.md 2026-06-28 (codex×opus deliberation runs/deliberations/20260628T145619Z/).
// Where Lever B's prompt-inject (`--inject`) hands the cheap coder the obligation TEXT and lets it AUTHOR the
// approve→execute gate (run C falsified that: the cheap pool writes a semantically-wrong gate even when told),
// the strong injection has the FRONTIER/SKELETON author the enforcement PRIMITIVE and asks the cheap coder only
// to WIRE it. It tests the strictly weaker WIRING hypothesis (AMENDMENTS Clause 5).
//
// ADMISSIBILITY (AMENDMENTS Clauses 1-3, 9). The primitive is generated DETERMINISTICALLY from the PUBLIC
// skeleton's DECLARED semantic rules (semanticRules(skeleton) — the same oracle-blind parser Lever B uses),
// NEVER from the held-out oracle (epics/*/tests.mjs). It is SURFACE-AGNOSTIC: it encodes ONLY the ordering /
// separation-of-duties / idempotency / audit-once LOGIC the contract declares; the calling surface supplies
// EVERY binding (which approval store, the entity, the requester/admin lookups, the audit store). It contains
// no per-surface business literal, no per-cell wiring table, no oracle fixture value, no entity noun — so it is
// scanOracleLeak-clean and the surface files stay 100% cheap-authored (Clause 3). It is injected as an extra
// module in the build files map (`_obligation.mjs`, written beside the surfaces by the epic sandbox; invisible
// to the oracle's EXPECTS), NOT an edit to a candidate surface and NOT an edit to the frozen skeleton (Clause 1).
//
// DETERMINISTIC COMPILATION CHOICES (the Clause-9 escalation watch). Compiling the declared rule into code makes
// a few fixed choices the prose leaves implicit: (a) idempotency keyed on status==='executed' (the declared
// status vocabulary); (b) a valid approval = some approval record this entity matches whose approver is an admin
// and !== the entity's requester; (c) audit-once = exactly one append on the executing transition. If a future
// topology's declared rule cannot be compiled under these choices without guessing, that is the pre-registered
// trigger to escalate to a LIVE frontier-authored primitive (Clause 9) — not to widen this generator ad hoc.

import { EXECUTE_VERB } from './semantic-obligation.mjs';
import { scanOracleLeak } from './checker.mjs';

export const SCAFFOLD_KEY = '_obligation';            // the build files-map key → `_obligation.mjs` on disk
export const SCAFFOLD_IMPORT = './_obligation.mjs';   // the import specifier surfaces wire against

// strip anything that could break embedding declared prose inside a template literal / a JS comment.
function safeComment(s) {
  return String(s || '').replace(/[`$]/g, '').replace(/\*\//g, '* /').replace(/[\r\n]+/g, ' ').trim().slice(0, 240);
}

// the scaffold applies iff the skeleton DECLARES the approve→execute / execute-idempotency obligation (the
// approval class). Quota conservation / keyed-idempotency are out of scope for this lever (the (C)-leaning is
// approve→execute; quota was re-attributed to (B) container-drift). Non-applicable topologies → '' (no-op).
export function scaffoldApplies(rulesBySem) {
  return !!(rulesBySem && (rulesBySem.approveExecute || rulesBySem.executeIdempotency));
}

// THE GENERIC PRIMITIVE — returns the importable module SOURCE, or '' when not applicable (byte-identical).
export function obligationScaffold(rulesBySem) {
  if (!scaffoldApplies(rulesBySem)) return '';
  const ruleAE = safeComment(rulesBySem.approveExecute || '(not declared)');
  const ruleII = safeComment(rulesBySem.executeIdempotency || '(not declared)');
  const __src = [
    '// _obligation.mjs — GENERIC approve→execute / idempotency / audit-once obligation primitive.',
    '// FRONTIER/SKELETON-DERIVED (compiled deterministically from the shared contract\'s DECLARED cross-cutting',
    '// rules; NOT from the held-out oracle). Surface-AGNOSTIC: it encodes only the ordering / separation-of-duties',
    '// / idempotency / audit-once logic; the calling surface supplies every binding. The cheap coder still authors',
    '// the surface and wires these — see the per-surface build note.',
    '//',
    '// Declared rules this primitive enforces (verbatim from the shared contract):',
    '//   - approve→execute: ' + ruleAE,
    '//   - idempotency:     ' + ruleII,
    '',
    'export class ObligationError extends Error {}',
    '',
    '// Run the declared execute-time obligations, then perform the execution via the supplied bindings.',
    '// Returns { executed: boolean }. Throws ObligationError when no valid approval exists. Bindings:',
    '//   entity        the record being executed (carries a status + a requester id)',
    '//   approvals     the approval records for this entity type (default [])',
    '//   matchApproval (approvalRecord) => boolean : does this approval target `entity`?',
    '//   approverIdOf  (approvalRecord) => approver id            (default a.approverId)',
    '//   requesterIdOf (entity) => requester id                  (default entity.requesterId)',
    '//   isAdmin       (userId) => boolean : is this user an admin? (default () => false)',
    '//   statusOf      (entity) => status                        (default entity.status)',
    '//   markExecuted  () => void : set the entity status to executed',
    '//   appendAudit   () => void : push exactly one audit record',
    'export function enforceExecute(opts) {',
    '  opts = opts || {};',
    '  const entity = opts.entity;',
    '  const approvals = opts.approvals || [];',
    '  const matchApproval = opts.matchApproval || (() => true);',
    '  const approverIdOf = opts.approverIdOf || ((a) => (a == null ? undefined : a.approverId));',
    '  const requesterIdOf = opts.requesterIdOf || ((e) => (e == null ? undefined : e.requesterId));',
    '  const isAdmin = opts.isAdmin || (() => false);',
    '  const statusOf = opts.statusOf || ((e) => (e == null ? undefined : e.status));',
    '  const markExecuted = opts.markExecuted || (() => {});',
    '  const appendAudit = opts.appendAudit || (() => {});',
    '',
    '  // idempotency — re-executing must not append a second audit record.',
    '  if (statusOf(entity) === \'executed\') return { executed: false, reason: \'already-executed\' };',
    '',
    '  // approve→execute + separation of duties — a valid approval is one recorded by an admin who is NOT the requester.',
    '  const requester = requesterIdOf(entity);',
    '  const approved = approvals.some((a) => {',
    '    if (!matchApproval(a)) return false;',
    '    const who = approverIdOf(a);',
    '    return isAdmin(who) && who !== requester;',
    '  });',
    '  if (!approved) throw new ObligationError(\'not approved: execute requires a valid approval recorded by a non-requester admin\');',
    '',
    '  markExecuted();   // status -> executed',
    '  appendAudit();    // exactly one audit record',
    '  return { executed: true };',
    '}',
    '',
  ].join('\n');
  // Clause-2 fail-closed: a deterministic skeleton-derived primitive is leak-clean by construction; assert it.
  if (scanOracleLeak(__src)) throw new Error('obligation scaffold tripped scanOracleLeak — inadmissible (Clause 2); refusing to inject');
  return __src;
}

// THE PER-SURFACE BUILD ADDENDUM — appended to an applicable surface's FIRST build prompt (authorship time).
// Tells the cheap coder the primitive exists and MUST be wired, with a generic wiring template (no entity nouns,
// no oracle content). '' for non-applicable surfaces → buildPrompt byte-identical.
export function scaffoldAddendum(surface, rulesBySem) {
  if (!scaffoldApplies(rulesBySem)) return '';
  if (!EXECUTE_VERB.test(surface)) return '';
  const __add = [
    '',
    '## Shared obligation primitive — USE IT, do not hand-roll the approve→execute gate',
    'A frontier-authored obligation primitive is provided to your epic at `' + SCAFFOLD_IMPORT + '`. It enforces the',
    'declared execute-time obligations for you: **approve→execute** (a valid approval is one recorded by an admin who',
    'is NOT the requester), **execute-idempotency** (re-executing appends no second audit record), and **audit-once**.',
    'Your `' + surface + '` MUST delegate these to it instead of re-implementing them — import it and wire YOUR bindings:',
    '',
    '```js',
    "import { enforceExecute } from '" + SCAFFOLD_IMPORT + "';",
    '// inside your handler, after tenancy/input checks and after loading the entity being executed:',
    'enforceExecute({',
    '  entity,                                   // the record being executed',
    '  approvals: /* this entity’s approval store (?? []) */,',
    '  matchApproval: (a) => /* a targets THIS entity (match its id) */,',
    '  requesterIdOf: (e) => /* the entity’s requester id */,',
    '  isAdmin: (userId) => /* true iff userId is an admin in this ctx */,',
    '  statusOf: (e) => e.status,',
    '  markExecuted: () => { /* set the entity status to executed */ },',
    '  appendAudit: () => { /* push exactly ONE record to your audit store */ },',
    '});',
    '```',
    '',
    'Keep every other guard you already implement (tenancy, ownership, input-validation) EXACTLY as written — only',
    'the approve→execute / idempotency / audit enforcement moves into the primitive.',
  ].join('\n');
  if (scanOracleLeak(__add)) throw new Error('scaffold addendum tripped scanOracleLeak — inadmissible (Clause 2)');
  return __add;
}
