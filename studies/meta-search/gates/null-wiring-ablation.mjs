// THE CLAUSE-7 DISCRIMINATOR — null-wiring ablation + perturbation adjunct (AMENDMENTS.md 2026-06-28).
// MEASUREMENT-ONLY: this never enters a scored run, is never shipped, and the frozen oracle stays the sole
// success measure. It reads WIN-on-class vs SCOPE-SHRINK on a parity-passing --inject-code result.
//
// WHY THE PERTURBATION ADJUNCT IS THE OPERATIVE PROBE HERE (the constructibility finding, GO/NO-GO task).
// Clause 7's PRIMARY probe is a mechanical NULL-WIRING: auto-wire the primitive using ONLY surfaces-only
// inputs (exported signatures / call-graph / smoke-traces), NO semantic adaptation. For the approve→execute
// class that is NON-CONSTRUCTIBLE leak-clean: binding `matchApproval` (which approval record targets THIS
// entity), `requesterIdOf`, and `isAdmin` requires reading record FIELD NAMES / role semantics — i.e.
// semantic-identifier matching, which Clause 7 explicitly forbids (a var named `requester` ≠ "the requester").
// A binder that did it anyway would be a LEAKY probe → its "pass" must be read as VOID, not SCOPE-SHRINK.
// `mechanicalNullWiring` therefore HONESTLY reports non-constructible (it discovers stores by trace but refuses
// the field-level semantic guess). Per Clause 7 that triggers the PERTURBATION ADJUNCT, which IS buildable
// leak-clean: the primitive deliberately holds only the ordering/SoD logic and forces the cheap coder to supply
// every ctx binding, so neutralizing ONE binding and re-grading tests directly whether the cheap WIRING carried
// load-bearing semantic content (flip pass→fail ⇒ load-bearing ⇒ WIN-eligible; no flip ⇒ scaffold absorbed it
// ⇒ SCOPE-SHRINK). The perturbation mutates the KNOWN, generator-emitted primitive source (robust), never the
// arbitrary cheap surface code.
//
// Oracle-blind: operates on the candidate surfaces + the public skeleton + the frozen oracle's PASS/FAIL only;
// imports no oracle scenarios; disk-deletion-invariant (reads a dump dir, writes nothing persistent).

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { evaluateEpic } from '../../build-gap/lib/epic-sandbox.mjs';
import { semanticRules } from '../src/semantic-obligation.mjs';
import { obligationScaffold, scaffoldApplies, SCAFFOLD_KEY, SCAFFOLD_IMPORT } from '../src/obligation-scaffold.mjs';
import { scanOracleLeak } from '../src/checker.mjs';

// a surface WIRES the primitive iff it imports it AND calls enforceExecute (surfaces-only / structural).
export function wiresPrimitive(code) {
  const c = String(code || '');
  return (c.includes(SCAFFOLD_IMPORT) || /from\s+['"]\.\/_obligation\.mjs['"]/.test(c)) && /\benforceExecute\s*\(/.test(c);
}

// ---- the PERTURBATION ADJUNCT: neutralize ONE binding in the KNOWN primitive source (robust; not the cheap code).
// 'isAdmin'   → force isAdmin to () => true   : every approver counts as admin (breaks the admin requirement).
// 'requester' → force requesterIdOf to a unique sentinel : `who !== requester` always true (self-approval slips
//               through → breaks separation of duties).
// 'idempotency' → force the executed-status short-circuit off (re-execute always proceeds → breaks audit-once).
// Returns the perturbed module source. Throws if the expected anchor line is absent (→ caller flags VOID, so a
// changed primitive can never silently produce a mis-perturbed verdict).
const PERTURBATIONS = {
  isAdmin: {
    find: '  const isAdmin = opts.isAdmin || (() => false);',
    repl: '  const isAdmin = () => true; // [ABLATION] binding neutralized',
  },
  requester: {
    find: '  const requesterIdOf = opts.requesterIdOf || ((e) => (e == null ? undefined : e.requesterId));',
    repl: '  const requesterIdOf = () => Symbol(\'ablation-requester\'); // [ABLATION] binding neutralized',
  },
  idempotency: {
    find: '  if (statusOf(entity) === \'executed\') return { executed: false, reason: \'already-executed\' };',
    repl: '  /* [ABLATION] idempotency short-circuit neutralized */',
  },
};
export const PERTURBATION_KEYS = Object.keys(PERTURBATIONS);

export function perturbedScaffold(scaffoldSrc, which) {
  const p = PERTURBATIONS[which];
  if (!p) throw new Error('unknown perturbation: ' + which);
  if (!scaffoldSrc.includes(p.find)) throw new Error('perturbation anchor not found for ' + which + ' — primitive source changed; verdict would be unsound (VOID)');
  return scaffoldSrc.replace(p.find, p.repl);
}

// ---- the MECHANICAL NULL-WIRING probe — honest constructibility report (no semantic-identifier matching).
// Discovers, by trace/structure only, the ctx.db stores the create/approve/execute surfaces touch. It does NOT
// attempt the field-level predicates (matchApproval / requesterIdOf / isAdmin) because those cannot be bound
// without semantic-identifier matching, which Clause 7 forbids. Returns { constructible:false, ... } for the
// approve→execute class — the pre-registered trigger for the perturbation adjunct.
export function mechanicalNullWiring({ files = {} } = {}) {
  const storeRe = /(?:ctx\.db|(?<![.\w])db)\.([A-Za-z_]\w*)/g;
  const stores = new Set();
  for (const code of Object.values(files)) { let m; while ((m = storeRe.exec(String(code || ''))) !== null) stores.add(m[1]); }
  // The bindings the primitive REQUIRES the surface to supply, and why each is non-mechanical:
  const unbindable = [
    { binding: 'matchApproval', reason: 'requires matching an approval record to THIS entity by field name (semantic-identifier matching — Clause-7-forbidden)' },
    { binding: 'requesterIdOf', reason: 'requires identifying the requester field on the entity (semantic-identifier matching)' },
    { binding: 'isAdmin', reason: 'requires the role/admin predicate over ctx — not derivable from signatures/traces without semantic guessing' },
  ];
  return {
    constructible: false,
    discoveredStores: [...stores],   // what IS mechanically discoverable (call-graph/trace) — leak-clean
    unbindable,                      // what is NOT, without semantic adaptation
    reason: 'approve→execute null-wiring is non-constructible leak-clean; the field-level predicates require semantic-identifier matching (Clause 7). Use the perturbation adjunct.',
  };
}

// ---- Clause-8 verdict classifier (per cell). `parityPass` is the FROZEN worst-of-K=8 result (Clause 6).
export function ablationVerdict({ parityPass, nullWiring, perturbationFlips }) {
  // Null-wiring passes clean ⇒ SCOPE-SHRINK regardless of parity (scaffold absorbed the seam). Not reachable
  // here while constructible:false, but kept for the general contract.
  if (nullWiring && nullWiring.constructiblePass === 'clean') return { verdict: 'SCOPE-SHRINK', why: 'null-wiring passed clean — scaffold/harness absorbed the seam' };
  if (nullWiring && nullWiring.constructiblePass === 'leak') return { verdict: 'VOID', why: 'null-wiring passed only via a leaky probe — rebuild the ablation' };
  if (!parityPass) return { verdict: 'no-win', why: 'cell did not reach Clause-6 worst-of-K parity' };
  // Non-constructible null-wiring → the perturbation adjunct decides whether the cheap wiring is load-bearing.
  if (perturbationFlips && perturbationFlips.anyFlip) return { verdict: 'WIN-on-class', why: 'parity reached AND perturbing a binding flips the obligation oracle pass→fail → cheap wiring is load-bearing' };
  return { verdict: 'SCOPE-SHRINK', why: 'parity reached but no perturbation flips the obligation oracle → the cheap wiring is a no-op; the scaffold absorbed the seam' };
}

// ---- OFFLINE runner: apply the probes to one parity-passing route's RAW surfaces dir (post-ladder diagnostic).
// rawDir = a dump's <tag>/raw dir (coevo --dump). Re-grades with the REAL primitive, then with each perturbed
// primitive, and reports which obligation (crosscut) oracle tests flip pass→fail. Never mutates the dump.
export async function runAblationOnDir({ rawDir, testsPath, skeleton }) {
  const names = fs.readdirSync(rawDir).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, ''));
  const files = {};
  for (const n of names) files[n] = fs.readFileSync(path.join(rawDir, `${n}.mjs`), 'utf8');
  const rules = semanticRules(skeleton);
  if (!scaffoldApplies(rules)) return { applicable: false, reason: 'topology declares no approve→execute obligation' };
  const scaffold = obligationScaffold(rules);
  if (scanOracleLeak(scaffold)) return { applicable: true, error: 'scaffold leaked — VOID' };

  const wired = names.filter((n) => wiresPrimitive(files[n]));
  const grade = async (scaf) => evaluateEpic({ mode: 'isolated', files: { ...files, [SCAFFOLD_KEY]: scaf }, testsPath });
  const crosscutFails = (g) => new Set(((g && g.crosscut && g.crosscut.fails) || []).map((f) => f.name));

  const base = await grade(scaffold);
  const baseFails = crosscutFails(base);

  const perturbations = {};
  let anyFlip = false;
  for (const which of PERTURBATION_KEYS) {
    let pscaf; try { pscaf = perturbedScaffold(scaffold, which); } catch (e) { perturbations[which] = { error: String(e.message) }; continue; }
    const pg = await grade(pscaf);
    const pFails = crosscutFails(pg);
    const flipped = [...pFails].filter((n) => !baseFails.has(n));   // passed at base, fails under perturbation
    perturbations[which] = { flipped, flipCount: flipped.length };
    if (flipped.length) anyFlip = true;
  }

  const nullWiring = mechanicalNullWiring({ files });
  return {
    applicable: true,
    wiredSurfaces: wired,
    baseCrosscut: { pass: base?.crosscut?.pass ?? null, total: base?.crosscut?.total ?? null, fails: [...baseFails] },
    nullWiring,
    perturbations,
    anyFlip,
  };
}

// CLI: node gates/null-wiring-ablation.mjs <rawDir> <testsPath> <skeletonPath>
if (process.argv[1] && url.fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [, , rawDir, testsPath, skeletonPath] = process.argv;
  if (!rawDir || !testsPath || !skeletonPath) { console.error('usage: null-wiring-ablation.mjs <rawDir> <testsPath> <skeletonPath>'); process.exit(2); }
  const skeleton = fs.readFileSync(skeletonPath, 'utf8');
  runAblationOnDir({ rawDir, testsPath, skeleton }).then((r) => { console.log(JSON.stringify(r, null, 2)); });
}
