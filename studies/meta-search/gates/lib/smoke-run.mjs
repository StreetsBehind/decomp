#!/usr/bin/env node
// PERMISSIVE-HARNESS SMOKE for one surface module (child process; oracle-blind).
//
// Purpose: surface genuine RUNTIME coding-incompetence bugs that import-time structural validation
// (validate-surface.mjs) misses — free-variable ReferenceErrors (`bio is not defined`), undefined-helper
// calls (`generateUniqueId is not defined`), etc. These throw only when the function body executes, so we
// must CALL it. We don't know the real arg/ctx shapes (and must not read the oracle), so we invoke under a
// self-vivifying Proxy ctx + Proxy args: any property access / method call / iteration returns another
// permissive proxy and never throws a TypeError. The ONLY errors that escape are real ReferenceErrors
// (a name the code uses that exists in NO scope) and SyntaxErrors — exactly the incompetence class.
// High-precision by construction: if the harness reports a free identifier, the code genuinely references
// an undefined symbol. (False negatives are fine — a guard may return before the bad line is reached.)
//
// argv: <modulePath> <exportName>
// stdout: JSON { freeIds: string[], errors: string[] }   (freeIds = "X is not defined/ is not a function")
import { pathToFileURL } from 'node:url';

function permissive() {
  const target = function () { return permissive(); };
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === Symbol.iterator) return function* () {};
      if (prop === Symbol.asyncIterator) return async function* () {};
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === 'then') return undefined;            // not a thenable (avoid await hijack)
      if (prop === 'length') return 0;
      if (prop === 'name') return '';
      if (prop === 'toString' || prop === 'valueOf') return () => '';
      if (prop === 'constructor') return Object;
      return permissive();
    },
    apply() { return permissive(); },
    construct() { return permissive(); },
    has() { return true; },
    set() { return true; },
  });
}

const FREE_RE = /(\b[A-Za-z_$][\w$]*)\s+is not defined|(\b[A-Za-z_$][\w$]*)\s+is not a function/;

const [, , modulePath, exportName] = process.argv;
const out = { freeIds: [], errors: [] };

try {
  const m = await import(pathToFileURL(modulePath).href);
  const fn = m[exportName];
  if (typeof fn !== 'function') { out.errors.push('no-export'); }
  else {
    // a few arg patterns to maximise reaching the body for both (ctx,input{}) and (ctx,a,b,c) conventions.
    const ctx = permissive();
    const patterns = [
      [ctx, permissive()],
      [ctx, permissive(), permissive(), permissive()],
      [ctx, {}, '', 0, ''],
      [ctx],
    ];
    for (const args of patterns) {
      try { const r = fn(...args); if (r && typeof r.then === 'function') await Promise.race([r, Promise.resolve()]); }
      catch (e) {
        const msg = String((e && e.message) || e);
        const mm = FREE_RE.exec(msg);
        if (mm) { const id = mm[1] || mm[2]; if (!out.freeIds.includes(id)) out.freeIds.push(id); }
        else if (e instanceof SyntaxError) out.errors.push('syntax:' + msg.slice(0, 60));
        // any other throw (TypeError from our permissive args, domain guard like "Invalid amount") is IGNORED.
      }
    }
  }
} catch (e) {
  // import-time failure (should be caught earlier by validate-surface; record for completeness).
  const msg = String((e && e.message) || e);
  const mm = FREE_RE.exec(msg);
  if (mm) out.freeIds.push(mm[1] || mm[2]); else out.errors.push('import:' + msg.slice(0, 60));
}

process.stdout.write(JSON.stringify(out));
