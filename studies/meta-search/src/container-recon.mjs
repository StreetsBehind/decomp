// LEVER A (A1 + A2) — DETERMINISTIC, SURFACES-ONLY container-representation reconciliation.
//
// WHY this exists (LEVER-A-SCOPE.md "STEP 1 RESULT"). The generalized seam-gate's Mode-B *model* route-back and
// the shape-gate's model route-back BOTH fail to close cross-surface container drift (live replay: 0pp on
// lifecycle-d2/d3; shape-gate ran in the ladder and the drift survived). The dump shows a class NEITHER gate
// repairs and the seam-gate does not even DETECT: a store one surface writes with OBJECT-PROPERTY syntax
// (`ctx.db.wallets[id] = w`) while other surfaces read it as a Map (`ctx.db.wallets.get(id)`), so `.get`
// returns undefined → "Wallet not found" (quota-d1). The shape-gate misses it because it inspects only METHOD
// calls (`.get(`/`.push(`), never `X[k]=`; the seam-gate misses it because it resolves ONE declared store and
// mis-pairs by index. This lever fills exactly that gap, deterministically.
//
// SCOPE — the SAFE, mechanical subset only (honors the program's hard rule "a false repair is worse than a
// miss"; src/shape-gate.mjs:103-112 rejected a naive map↔array method-flip as net-negative-risky):
//   (1) object-property ↔ Map reconciliation: on a store that is canonically a Map (declared "Map" in the
//       public skeleton/preamble, OR read with .get/.set/.has by ≥1 surface and never used with array methods),
//       rewrite a surface's `X[k] = v` → `X.set(k, v)` and rvalue `X[k]` → `X.get(k)`. Mechanical; no key-field
//       guess; preserves syntax by construction.
//   (2) init-type matching: a surface that initializes the store with the wrong container (`X = []` / `??= []`
//       / `= {}` when canonical=Map; the array inverse) is coerced to the canonical empty container.
// EXPLICITLY OUT OF SCOPE: the structural map-of-arrays ↔ flat-array divergence (lifecycle-d2/d3, approval-d3),
// which needs a key-field/grouping guess = the very net-negative the program forbids. Those are left to the
// model-routed shape/seam gates (and, per the decision tree, stand as the structural-divergence residual).
//
// ADMISSIBILITY (AMENDMENTS.md 2026-06-23 committed guard, + kill K3). Inputs are confined to the generated
// surfaces themselves (each surface's own `ctx.db.X` access syntax) and the PUBLIC declared shape. There is NO
// literal of intended behavior — no per-topology wiring, no conservation/ordering identity, no oracle access.
// The canonical type is a representation fact derived from the public contract + the surfaces' own usage, the
// same surfaces-only basis the membership integration-gate's Map/Array detection already uses. No model is
// invoked, so there is no repair prompt to leak (and thus no route-luck / non-stationarity).

import { parseDeclaredShapes } from './shape-gate.mjs';

const MAP_METHODS = 'get|set|has|delete';
const ARR_METHODS = 'push|pop|shift|unshift|filter|find|findIndex|findLast|some|every|includes|indexOf|reduce|reduceRight|map|forEach|flatMap|sort|splice|slice|concat';

// reference forms for a store: `ctx.db.X`, `db.X` (destructured ctx), and the bare destructured `X`. The bare
// form is risky for the object-index transform (could collide with a local), so the index/init transforms use
// only the qualified `ctx.db.X` / `db.X` forms; method-style DETECTION (for canonical voting) uses all three.
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function qualRef(store) { return `(?:ctx\\.db\\.${esc(store)}|(?<![.\\w])db\\.${esc(store)})`; }
function anyRef(store) { return `(?:ctx\\.db\\.${esc(store)}|(?<![.\\w])db\\.${esc(store)}|(?<![.\\w])${esc(store)})`; }

function usesMethods(code, store, methods) {
  return new RegExp(`${anyRef(store)}\\s*\\.\\s*(?:${methods})\\s*\\(`).test(code || '');
}
// object-property access on the qualified store: `ctx.db.X[ ... ]` (read or write).
function usesObjectIndex(code, store) {
  return new RegExp(`${qualRef(store)}\\s*\\[`).test(code || '');
}

// every `ctx.db.<x>` / `db.<x>` store name referenced anywhere across the surfaces.
export function discoverStores(files) {
  const set = new Set();
  const re = /(?:ctx\.db|(?<![.\w])db)\.([A-Za-z_]\w*)/g;
  for (const code of Object.values(files)) { let m; while ((m = re.exec(code || '')) !== null) set.add(m[1]); }
  return [...set];
}

// canonical container type of a store, from PUBLIC declared shape first, else surface-method consensus.
// Returns 'map' | 'array' | null (null = ambiguous → do not touch, the SAFE default).
export function canonicalType(store, files, declaredShapes) {
  if (declaredShapes && declaredShapes[store]) return declaredShapes[store];
  let map = 0, arr = 0;
  for (const code of Object.values(files)) {
    if (usesMethods(code, store, MAP_METHODS)) map++;
    if (usesMethods(code, store, ARR_METHODS)) arr++;
  }
  if (map > 0 && arr === 0) return 'map';
  if (arr > 0 && map === 0) return 'array';
  return null; // both present (structural divergence — out of scope) or neither
}

// ---- the two SAFE transforms (string rewrites; syntax-preserving by construction) -----------------
// object-property → Map: `X[KEY] = RHS;` → `X.set(KEY, RHS);` then rvalue `X[KEY]` → `X.get(KEY)`.
function objectToMap(code, store) {
  let out = code;
  const q = qualRef(store);
  // writes first: `<ref>[ KEY ] = RHS ;`  (RHS up to the first `;`; reject ==,===,!=,<=,>= via [^;=] first char)
  const wRe = new RegExp(`(${q})\\s*\\[\\s*([^\\]]+?)\\s*\\]\\s*=\\s*([^;=][^;]*);`, 'g');
  out = out.replace(wRe, (_m, ref, key, rhs) => `${ref}.set(${key}, ${rhs.trim()});`);
  // remaining reads: `<ref>[ KEY ]` → `<ref>.get(KEY)` (writes are gone, so these are reads)
  const rRe = new RegExp(`(${q})\\s*\\[\\s*([^\\]]+?)\\s*\\]`, 'g');
  out = out.replace(rRe, (_m, ref, key) => `${ref}.get(${key.trim()})`);
  return out;
}
// init-type matching: coerce an empty-container init that disagrees with the canonical type.
function fixInit(code, store, canon) {
  const q = qualRef(store);
  const want = canon === 'map' ? 'new Map()' : '[]';
  const wrongLit = canon === 'map' ? '(?:\\[\\s*\\]|\\{\\s*\\})' : '(?:new\\s+Map\\s*\\(\\s*\\)|\\{\\s*\\})';
  // `<ref> = <wrong>` and `<ref> ??= <wrong>` / `||= <wrong>`
  return (code || '')
    .replace(new RegExp(`(${q})(\\s*(?:\\?\\?=|\\|\\|=|=))\\s*${wrongLit}`, 'g'), (_m, ref, op) => `${ref}${op} ${want}`);
}

// ---- GUARDED structural flatten: Map-of-arrays → flat-array on a DECLARED-ARRAY store --------------
// The dump shows the dominant non-membership drift is a surface using a store as a Map-of-arrays
// (`X.get(k).push(rec)`, `X.set(k, arr)`) when the PUBLIC contract declares it a flat array and the other
// surfaces use it flat (lifecycle-d2 createOrder vs advanceOrder/getFulfilled). The program (shape-gate.mjs:
// 103-112) deferred a deterministic fix "until there is >n=1 evidence"; STEP 1 produced it. This is the
// GUARDED transform: it fires ONLY when the store's declared shape is array (or a strong array consensus),
// rewrites the map idioms to flat-array idioms, and is protected by a STRUCTURAL POST-CONDITION — if ANY map
// method (.get/.set/.has/.delete/.put) on the store survives, the rewrite was incomplete (e.g. a read-modify-
// write writeback, or an invalid `.put`) and the WHOLE surface transform is reverted (a safe miss, honoring
// "a false repair is worse than a miss"). Surfaces-only: the key-field for read-rewrites is derived from the
// candidate's OWN record literals, never the oracle.

// derive the entity key-field for a flat store from the surfaces' own record literals pushed onto it
// (e.g. `{ orderId: id, toState: 'draft' }` → 'orderId'); the first `*Id`/`id` field wins. null if none.
function deriveKeyField(files, store) {
  const refs = `(?:ctx\\.db\\.${esc(store)}|(?<![.\\w])db\\.${esc(store)}|(?<![.\\w])${esc(store)})`;
  // records added to the store: `<refs>[.get(..)] .push({ ... })` or `<refs>.set(.., { ... })`
  const re = new RegExp(`${refs}(?:\\s*\\.\\s*get\\s*\\([^)]*\\))?\\s*\\.\\s*push\\s*\\(\\s*\\{([^}]*)\\}|${refs}\\s*\\.\\s*set\\s*\\([^,]*,\\s*\\{([^}]*)\\}`, 'g');
  const votes = {};
  let m;
  while ((m = re.exec(Object.values(files).join('\n'))) !== null) {
    const body = m[1] || m[2] || '';
    for (const f of body.split(',')) {
      const name = (f.split(':')[0] || '').trim();
      if (/^(?:id|\w*Id)$/.test(name)) votes[name] = (votes[name] || 0) + 1;
    }
  }
  const keys = Object.keys(votes);
  if (!keys.length) return null;
  keys.sort((a, b) => votes[b] - votes[a]);
  return keys[0];
}

function mapMethodsPresent(code, store) {
  return new RegExp(`${qualRef(store)}\\s*\\.\\s*(?:get|set|has|delete|put)\\s*\\(`).test(code || '');
}

// flatten one surface's map-of-arrays use of `store` to flat-array ops. Returns the rewritten code, OR null if
// after rewriting any map method on the store survives (incomplete → caller reverts).
function flattenToArray(code, store, keyField) {
  const q = qualRef(store);
  let out = code || '';
  // 1. init idiom: `if (!<q>.has(K)) { <q>.set(K, []); }` (any whitespace/newlines) → `<q> ??= [];`
  out = out.replace(new RegExp(`if\\s*\\(\\s*!\\s*${q}\\s*\\.\\s*has\\s*\\([^)]*\\)\\s*\\)\\s*\\{\\s*${q}\\s*\\.\\s*set\\s*\\([^,]*,\\s*\\[\\s*\\]\\s*\\)\\s*;?\\s*\\}`, 'g'), `ctx.db.${store} ??= [];`);
  // 2. bare init: `<q>.set(K, [])` → `<q> ??= []`
  out = out.replace(new RegExp(`(${q})\\s*\\.\\s*set\\s*\\([^,]*,\\s*\\[\\s*\\]\\s*\\)`, 'g'), (_m, r) => `${r} ??= []`);
  // 3. sub-array push: `<q>.get(K).push(` → `<q>.push(`
  out = out.replace(new RegExp(`(${q})\\s*\\.\\s*get\\s*\\([^)]*\\)\\s*\\.\\s*push\\s*\\(`, 'g'), (_m, r) => `${r}.push(`);
  if (keyField) {
    const k = esc(keyField);
    // 4. read list: `<q>.get(K) || []` → `<q>.filter(__e => __e.field === K)`
    out = out.replace(new RegExp(`(${q})\\s*\\.\\s*get\\s*\\(\\s*([^)]*?)\\s*\\)\\s*\\|\\|\\s*\\[\\s*\\]`, 'g'), (_m, r, key) => `${r}.filter(__e => __e.${keyField} === ${key.trim()})`);
    // 5. existence: `<q>.has(K)` → `<q>.some(__e => __e.field === K)`
    out = out.replace(new RegExp(`(${q})\\s*\\.\\s*has\\s*\\(\\s*([^)]*?)\\s*\\)`, 'g'), (_m, r, key) => `${r}.some(__e => __e.${keyField} === ${key.trim()})`);
    // 6. single read: remaining `<q>.get(K)` → `<q>.find(__e => __e.field === K)`
    out = out.replace(new RegExp(`(${q})\\s*\\.\\s*get\\s*\\(\\s*([^)]*?)\\s*\\)`, 'g'), (_m, r, key) => `${r}.find(__e => __e.${keyField} === ${key.trim()})`);
  }
  // POST-CONDITION: any surviving map method on the store ⇒ incomplete (writeback `.set(k, arr)`, invalid
  // `.put`, or a `.get` with no derivable key) ⇒ revert (return null). A complete flatten leaves NO map op.
  if (mapMethodsPresent(out, store)) return null;
  return out === code ? null : out;
}

/**
 * Reconcile container representation across an epic's surfaces (Lever A). Mutates `files` in place.
 * @param {object} p
 * @param {string[]} p.surfaces            built surface names
 * @param {Record<string,string>} p.files  surface -> code (mutated on transform)
 * @param {string} [p.skeleton]            public skeleton (declared shapes)
 * @param {string} [p.baseModel]           public preamble (declared shapes for base stores)
 * @param {(surface:string, code:string)=>Promise<boolean>} [p.verify]  no-regress guard (parse∧export); a
 *        transformed surface is kept only if verify(...)===true (default: keep — the transform is mechanical).
 * @returns {Promise<{ranGate, transforms, surfacesChanged, reverts, stores, detail}>}
 */
export async function runContainerRecon({ surfaces, files, skeleton = '', baseModel = '', verify }) {
  const declared = parseDeclaredShapes(`${baseModel}\n${skeleton}`);
  const stores = discoverStores(files);
  let transforms = 0, reverts = 0;
  const surfacesChanged = new Set();
  const detail = [];

  // a store is a flatten target if the PUBLIC contract declares it an array, or (no declaration) there is a
  // strong flat-array consensus (≥2 array surfaces) with ≥1 map-using minority surface to flatten.
  const arrCount = (store) => Object.values(files).filter((c) => usesMethods(c, store, ARR_METHODS)).length;
  const mapCount = (store) => Object.values(files).filter((c) => usesMethods(c, store, MAP_METHODS)).length;

  for (const store of stores) {
    const canon = canonicalType(store, files, declared);
    const flattenTarget = declared[store] === 'array' || (arrCount(store) >= 2 && mapCount(store) >= 1);
    const keyField = flattenTarget ? deriveKeyField(files, store) : null;

    for (const surface of surfaces) {
      if (!(surface in files)) continue;
      const before = files[surface];
      let after = before;

      // (A1/A2 safe) object-index ↔ Map + init-type matching, when the store is canonically a Map.
      if (canon === 'map') {
        if (usesObjectIndex(after, store)) after = objectToMap(after, store);
        after = fixInit(after, store, 'map');
      }
      // (A1 guarded structural-flatten) a declared/consensus ARRAY store this surface uses as a Map-of-arrays.
      if (flattenTarget && mapMethodsPresent(after, store)) {
        const flat = flattenToArray(after, store, keyField);
        if (flat !== null) after = flat;            // null = incomplete (post-condition) → leave as-is (safe miss)
      } else if (canon === 'array') {
        after = fixInit(after, store, 'array');
      }

      if (after === before) continue;
      if (verify && !(await verify(surface, after))) { reverts++; detail.push({ surface, store, kind: 'verify-revert', kept: false }); continue; }
      files[surface] = after; transforms++; surfacesChanged.add(surface);
      detail.push({ surface, store, kind: flattenTarget ? 'flatten' : 'objmap', kept: true });
    }
  }
  return { ranGate: true, transforms, surfacesChanged: [...surfacesChanged], reverts, stores, detail };
}
