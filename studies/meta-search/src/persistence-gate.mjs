// The STORE-PERSISTENCE gate (co-evolution rung-1, third lever — store-persistence / defensive-init per
// COEVO-RUNG1-PROGRESS §"Contract-precision … next lever"). Targets the LOCAL-COPY-NEVER-WRITTEN-BACK defect:
// a surface reads a shared store into a LOCAL with a fresh-collection fallback and then mutates that local,
// so the mutation is silently lost whenever the store starts undefined (the dominant residual quota
// integration killer).
//
// WHY (honest baseline + the session-3 dump inspection, runs/dump/q1-cg{A,B}). The conservation GUARD is
// present and correct (`if (amount > currentBalance) throw 'Insufficient funds'`), but the withdraw surface
// does:
//     const ledger = ctx.db.ledger ?? [];      // ← fresh local array when ctx.db.ledger is undefined
//     ...
//     ledger.push({ walletId, delta: -amount, key });   // ← mutates the LOCAL, never written back
// When `ctx.db.ledger` is undefined at the time the surface runs, `?? []` makes a throwaway array, so the
// debit never reaches the store and the next reader sees the wrong balance. This anti-pattern is pervasive
// (10/dumped draws) and 0 draws use the persisting form `ctx.db.ledger ??= []`. It is a FORM defect (the
// arithmetic is right; only the write target is wrong), so an oracle-blind lever CAN fix it.
//
// WHY the existing gates miss it.
//   - shape-gate keys off map↔array contradictions; the local copy uses ONE shape consistently → no flag.
//   - contract-gate is about over-applied admin authz → unrelated.
//   - seam-gate Mode-A keys off `hasInit(ctx.db.X)`. For `const ledger = ctx.db.ledger ?? []` hasInit is
//     false (no `ctx.db.ledger ??=`), so Mode-A DOES fire — but its surgicalInitRepair reads the store STYLE
//     from `ctx.db.ledger.<method>` usage, which is absent (the `.push` is on the LOCAL), so style='unknown'
//     → it injects `ctx.db.ledger ??= new Map()` (the default) → `ledger.push` then throws. That is a
//     NET-NEGATIVE repair (the regrade's "gate sometimes net-negative"). This lever fixes the pattern
//     correctly: it reads the intended init from the route's OWN `?? <init>` literal (no shape guess) and
//     rewrites the declaration to bind the local to the persisted store.
//
// MECHANISM (deterministic, $0, guard-preserving by construction — NO model route-back, so no single-draw
// route-luck is smuggled into a worst-of-K fitness; cf. the codex×opus deliberation):
//   1. candidate stores = stores DECLARED in the public skeleton (`ctx.db.<store>`) that are NOT in the base
//      preamble — exactly the stores a surface must create + persist (a pre-existing base store can never have
//      this bug: its `?? <init>` fallback never fires, so the local is the real object).
//   2. for each surface that does NOT already persist the store directly (no `ctx.db.<store> =`/`??=`/`.push`/
//      `.set` write-back), find `(const|let|var) X = (ctx.db.<store>|db.<store>) (?? | ||) <fresh-collection>`
//      where the local X is then MUTATED (`X.push/.set/.add/.unshift/.splice/.pop/.shift/.delete(` or
//      `X[..] = `). All three ⇒ a guaranteed silent-loss-on-undefined-store defect.
//   3. REPAIR (surgical): replace the declaration with `<storeRef> ??= <init>; <kw> X = <storeRef>` — keeps
//      the route's own init literal (shape-agnostic), persists defensively, and binds the local to the store
//      by reference so every subsequent `X.push(...)` lands on the persisted store. Only the one declaration
//      statement is rewritten; every guard is left byte-for-byte intact.
//
// SCOPE (v1, high-precision, conservative — under-flag rather than false-repair). Detected + repaired: the
// assignable member-reference forms `const X = ctx.db.<store> ?? <init>` and `const X = db.<store> ?? <init>`
// (the destructured `const { db } = ctx` case). OUT OF SCOPE (not detected): the bare-store-destructure-with-
// default `const { ledger = [] } = ctx.db; ledger.push(...)`, a different syntactic shape `??=` cannot persist
// (it would reassign a local). Leaving it unflagged keeps the lever's false-positive rate at zero.
//
// ORACLE-BLINDNESS (kill K3). Reads ONLY public inputs: the skeleton, the base-model preamble, and the
// candidate's own code. There is no model prompt (deterministic repair), so there is no oracle-leak surface;
// leak is false by construction.

import { baseStores } from './integration-gate.mjs';

const RE_SPECIAL = /[.*+?^${}()|[\]\\]/g;
const esc = (s) => String(s).replace(RE_SPECIAL, '\\$&');

// a fresh, empty collection literal — the throwaway the `?? <init>` fallback creates.
const INIT = '(?:\\[\\s*\\]|\\{\\s*\\}|new\\s+Map\\s*\\(\\s*\\)|new\\s+Set\\s*\\(\\s*\\))';
// in-place mutations of a local that REQUIRE the local to alias the persisted store to take effect.
const MUT_METHODS = 'push|unshift|splice|pop|shift|set|add|delete';

// stores the public skeleton declares that are NOT pre-existing base-model stores → must be created+persisted.
export function candidateStores(skeleton, baseModel) {
  const base = baseStores(baseModel);
  return [...baseStores(skeleton)].filter((s) => !base.has(s));
}

// does this surface persist the store DIRECTLY (so a local copy, if any, is not the only write path)?
// True when it assigns the store (`= `/`??=`/`||=`) or mutates it in place (`ctx.db.X.push(` / `.set(` / …).
// The alias declaration `const X = ctx.db.X ?? []` is NOT a write-back: the store ref there is followed by
// `??`/`||`, never by `=` or a mutation method, so it is correctly excluded.
export function persistsStore(code, store) {
  const s = esc(store);
  for (const ref of [`ctx\\.db\\.${s}`, `(?<![.\\w])db\\.${s}`]) {
    if (new RegExp(`${ref}\\s*(?:\\?\\?=|\\|\\|=)`).test(code || '')) return true;       // ctx.db.X ??= / ||=
    if (new RegExp(`${ref}\\s*=(?!=)`).test(code || '')) return true;                    // ctx.db.X = …  (assign, not ==/===)
    if (new RegExp(`${ref}\\s*\\.\\s*(?:${MUT_METHODS})\\s*\\(`).test(code || '')) return true; // ctx.db.X.push( / .set( …
  }
  return false;
}

// is the local variable `name` mutated in place (a write that is lost unless it aliases the store)?
function mutatesLocal(code, name) {
  const n = esc(name);
  return new RegExp(`\\b${n}\\s*(?:\\.\\s*(?:${MUT_METHODS})\\s*\\(|\\[[^\\]]*\\]\\s*=(?!=))`).test(code || '');
}

// the alias-fallback declarations of `store` in `code`: `(const|let|var) X = <ref> (??|||) <init>`.
function aliasDecls(code, store) {
  const s = esc(store);
  const re = new RegExp(`\\b(const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(ctx\\.db\\.${s}|(?<![.\\w])db\\.${s})\\s*(?:\\?\\?|\\|\\|)\\s*(${INIT})`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(code || '')) !== null) out.push({ kw: m[1], localName: m[2], ref: m[3], init: m[4], decl: m[0] });
  return out;
}

// the persistence violations in one surface vs the candidate (non-base, declared) stores. A violation = an
// alias-fallback read of a non-persisted store whose local is then mutated → the mutation is silently lost.
export function persistenceViolations(code, stores, baseSet = new Set()) {
  const out = [];
  for (const store of stores) {
    if (baseSet.has(store)) continue;            // pre-existing → fallback never fires → no bug
    if (persistsStore(code, store)) continue;    // writes the store directly → the local write is not lost
    for (const a of aliasDecls(code, store)) {
      if (mutatesLocal(code, a.localName)) out.push({ store, ...a });
    }
  }
  return out;
}

// SURGICAL repair: `<kw> X = <ref> ?? <init>`  →  `<ref> ??= <init>; <kw> X = <ref>`.
// Persists defensively (??=, only assigns when null/undefined — an existing collection is kept) and binds the
// local to the store by reference so every later `X.push(...)` lands on the persisted store. Keeps the route's
// own init literal (shape-agnostic). Only the declaration statement changes; all guards stay byte-for-byte.
export function surgicalPersistRepair(code, v) {
  if (!code || !v || !code.includes(v.decl)) return null;
  return code.replace(v.decl, `${v.ref} ??= ${v.init}; ${v.kw} ${v.localName} = ${v.ref}`);
}

/**
 * Run the store-persistence gate over a fully-built epic's surfaces. Mirrors the other gates' signature
 * (surfaces/files/prompts/skeleton/baseModel/gate/rebuild) so the harness can compose it before the seam-gate.
 * Deterministic + $0: `rebuild` is accepted for interface uniformity but never called. Mutates `files` on
 * repair. Returns counters for paired-probe attribution.
 * @returns {Promise<{files, ranGate, kind, stores, surfacesFlagged, violations, repairs, leak, detail}>}
 */
export async function runPersistenceGate({ surfaces, files, skeleton, baseModel = '', gate }) {
  const off = (extra = {}) => ({ files, ranGate: false, kind: gate?.kind || 'off', stores: [], surfacesFlagged: 0, violations: 0, repairs: 0, leak: false, detail: [], ...extra });
  if (!gate || gate.kind === 'off') return off();
  const baseSet = baseStores(baseModel);
  const stores = candidateStores(skeleton, baseModel);
  if (!stores.length) return off({ stores });

  let violations = 0, repairs = 0, surfacesFlagged = 0;
  const detail = [];
  for (const surface of surfaces) {
    if (!(surface in files)) continue;
    const initial = persistenceViolations(files[surface], stores, baseSet);
    if (!initial.length) continue;
    surfacesFlagged++;
    violations += initial.length;
    detail.push({ surface, viols: initial.map((v) => `${v.store}:${v.localName}=${v.ref}??${v.init.trim()}`) });

    // surgical sweep — recompute each pass (a repair removes one alias and may reveal another), guard-bounded.
    for (let guard = 0; guard < initial.length + 4; guard++) {
      const v = persistenceViolations(files[surface], stores, baseSet)[0];
      if (!v) break;
      const patched = surgicalPersistRepair(files[surface], v);
      if (!patched || patched === files[surface]) break;   // unrepairable (e.g. bare destructured) → leave for the readout
      files[surface] = patched;
      repairs++;
    }
  }
  return { files, ranGate: true, kind: gate.kind, stores, surfacesFlagged, violations, repairs, leak: false, detail };
}
