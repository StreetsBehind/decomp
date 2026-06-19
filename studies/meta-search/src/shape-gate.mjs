// The SHARED-STORE SHAPE-CONFORMANCE gate (co-evolution rung-1, first (B) output-QA lever).
//
// WHY this exists. The honest re-grade (COEVO-RUNG1-PROGRESS.md, coevo-REGRADE-full.json) shows the SINGLE
// DOMINANT failure across quota / lifecycle / membership is a cross-surface SHAPE mismatch on a shared store:
//   `db.ledger.get is not a function`            (quota: ledger is declared an ARRAY, a route calls .get())
//   `ctx.db.orderTransitions.get is not a function` (lifecycle: transitions declared an ARRAY, used as a Map)
//   `vaults.filter is not a function`            (membership: a Map-declared store used with array .filter)
// The skeleton ALREADY pins each store's shape ("`ctx.db.ledger` — an array of {…}", "`ctx.db.users` — a Map
// from …"), so richer skeleton text is NOT the lever (the contract is explicit and the route violates it
// anyway). The lever is (B) output-QA: enforce each surface against the DECLARED shape after the fact.
//
// WHY the existing integration-gate / seam-gate miss it. Both detect store access only via literal `ctx.db.X`
// and compare WRITER-vs-READER pairwise. The failing code destructures (`const { db } = ctx; db.ledger.get`),
// so the `ctx\.db\.` regexes never match, AND a single surface that contradicts the contract is not a
// writer/reader DISAGREEMENT — it disagrees with the CONTRACT. This gate keys off the skeleton's declared
// shape and detects access via `ctx.db.X`, `db.X`, and the bare destructured name `X`.
//
// MECHANISM (deterministic detection, model route-back repair):
//   1. parse the declared shape (array | map) of every shared store from the PUBLIC skeleton + preamble.
//   2. for each surface, detect its actual access STYLE on each store (map ops .get/.set/.has vs array ops
//      .find/.filter/.push/…), robust to destructuring.
//   3. flag a CONTRADICTION (map-ops on an array store, or array-ops on a map store) — both are guaranteed
//      runtime "<method> is not a function" throws, so this is high-precision (no ambiguous `[i]` indexing).
//   4. repair via a route-back that anchors on the surface's own code + an explicit "use shape X" instruction
//      and a preserve-every-guard clause (the model half of the P2a/P2b "don't drop a guard on repair" fix).
//
// ORACLE-BLINDNESS (kill K3 — identical contract to checker.mjs / integration-gate.mjs). The gate reads ONLY
// public inputs: the base-model preamble, the skeleton, the build prompts, and the candidate's own code. The
// declared shape itself is derived from the public contract. Every repair prompt is run through scanOracleLeak;
// a hit returns leak=true so the caller voids the candidate.

import { scanOracleLeak } from './checker.mjs';

const MAP_METHODS = 'get|set|has|delete';
const ARR_METHODS = 'push|pop|shift|unshift|filter|find|findIndex|some|every|includes|indexOf|reduce|reduceRight|map|forEach|flatMap|sort|splice';

// ---- declared-shape parser (PUBLIC: skeleton + preamble) ------------------------------------------
// For each `ctx.db.<store>` mention, the shape keyword nearest after it within its window (up to the next
// store mention, capped) is the vote. "a Map from …" → map; "an array of …" / "append-only array" → array.
// Votes are aggregated per store; ties / no-vote → omitted (the gate does not enforce an undeclared shape).
export function parseDeclaredShapes(text) {
  const t = text || '';
  const re = /ctx\.db\.([A-Za-z_]\w*)/g;
  const occ = [];
  let m;
  while ((m = re.exec(t)) !== null) occ.push({ store: m[1], start: m.index, after: m.index + m[0].length });
  const votes = {};
  for (let i = 0; i < occ.length; i++) {
    const winEnd = i + 1 < occ.length ? occ[i + 1].start : t.length;
    const win = t.slice(occ[i].after, Math.min(occ[i].after + 200, winEnd));
    const a = win.search(/\barray\b/i);
    const mp = win.search(/\bmap\b/i);
    votes[occ[i].store] ??= { array: 0, map: 0 };
    if (a !== -1 && (mp === -1 || a < mp)) votes[occ[i].store].array++;
    else if (mp !== -1 && (a === -1 || mp < a)) votes[occ[i].store].map++;
  }
  const shapes = {};
  for (const [store, v] of Object.entries(votes)) {
    if (v.array > v.map) shapes[store] = 'array';
    else if (v.map > v.array) shapes[store] = 'map';
  }
  return shapes;
}

// ---- per-surface access-style detection (robust to `ctx.db.X`, `db.X`, bare destructured `X`) ------
// The three reference forms are mutually exclusive on any one occurrence (the lookbehinds keep `ctx.db.X`
// out of the `db.X` and bare-`X` alternatives), so there is no double counting. A method suffix `.<m>(` is
// required, which also prevents matching a longer identifier (`ledgerOld.get` ≠ store `ledger`).
function refAlt(store) {
  const e = store.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `(?:ctx\\.db\\.${e}|(?<![.\\w])db\\.${e}|(?<![.\\w])${e})`;
}
function usesAs(code, store, methods) {
  return new RegExp(`${refAlt(store)}\\s*\\.\\s*(?:${methods})\\s*\\(`).test(code || '');
}
export function accessStyle(code, store) {
  const mapU = usesAs(code, store, MAP_METHODS);
  const arrU = usesAs(code, store, ARR_METHODS);
  if (mapU && !arrU) return 'map';
  if (arrU && !mapU) return 'array';
  if (mapU && arrU) return 'mixed';
  return 'unknown';
}

// the shape contradictions in one surface vs the declared shapes. A method INCONSISTENT with the declared
// shape is a guaranteed runtime throw (`X.get is not a function` on an array; `X.filter is not a function` on a
// Map) — so we flag it EVEN WHEN the surface also uses consistent methods ('mixed'). That mixed case is the
// dominant real bug a pure map↔array flip misses: a route writes `db.ledger ??= []` / `.push(...)` (array) yet
// reads with a stray `db.ledger.get(...)` (map) — the .get still throws. (quota-d1 draw4: `db.ledger.get is
// not a function`, which the flip-only rule flagged 0 of.) Still high-precision: an inconsistent method on a
// declared store always throws.
export function surfaceViolations(code, shapes) {
  const out = [];
  for (const [store, declared] of Object.entries(shapes)) {
    const usesMap = usesAs(code, store, MAP_METHODS);
    const usesArr = usesAs(code, store, ARR_METHODS);
    if (declared === 'array' && usesMap) out.push({ store, declared, actual: usesArr ? 'mixed' : 'map' });
    else if (declared === 'map' && usesArr) out.push({ store, declared, actual: usesMap ? 'mixed' : 'array' });
  }
  return out;
}

// REPAIR is intentionally MODEL route-back, NOT deterministic (contrast contract-gate.surgicalRemoveAdminGate
// and persistence-gate.surgicalPersistRepair, which ARE deterministic). A deterministic shape fix was assessed
// against the real dump (runs/dump/q1-cgA/quota-d1-d3) and rejected: the dominant violation is a FULL
// writer/reader drift (deposit treats `ctx.db.ledger` as a flat array `.find/.push/filter`; withdraw treats it
// as a Map `.get(walletId)` / `.set(walletId, [...])`). Converting map→array is irreducibly SEMANTIC — it
// requires restructuring the balance accounting (per-key grouping) and knowing the entity key-field
// (`walletId`/`budgetId`/…), which an oracle-blind regex cannot synthesize reliably. A mechanical rewrite that
// guessed the key-field or the grouping would risk a net-negative (a false repair is worse than a miss — the
// program's hard rule), so shape stays model-routed until there is >n=1 evidence justifying a guarded
// field-parsing transform. (Detection remains fully deterministic; only the repair routes to the model.)
function shapeRepairPrompt(originalPrompt, issue, currentCode) {
  const { store, declared } = issue;
  const want = declared === 'array'
    ? `The shared contract declares \`ctx.db.${store}\` as an ARRAY (if undefined, treat it as \`[]\`), NOT a Map. Your implementation uses Map operations on it (e.g. \`.get(...)\`, \`.set(...)\`, \`.has(...)\`), which throw at runtime ("ctx.db.${store}.get is not a function"). Rewrite EVERY access to \`ctx.db.${store}\` to use ARRAY operations: initialise it as \`ctx.db.${store} ??= []\` before first use, look records up with \`.find(...)\`/\`.filter(...)\`, and add records with \`.push(...)\`.`
    : `The shared contract declares \`ctx.db.${store}\` as a Map, NOT an array. Your implementation uses Array operations on it (e.g. \`.find(...)\`, \`.filter(...)\`, \`.push(...)\`), which throw at runtime ("ctx.db.${store}.filter is not a function"). Rewrite EVERY access to \`ctx.db.${store}\` to use Map operations: read with \`.get(key)\`, test with \`.has(key)\`, write with \`.set(key, value)\`, and iterate with \`.values()\`.`;
  return [
    originalPrompt, '',
    currentCode ? `## Your current implementation of this surface (keep it intact except for the one fix below):\n\`\`\`js\n${currentCode}\n\`\`\`` : '',
    '## Integration reviewer feedback — this surface accesses a shared store with the wrong data shape:',
    `- ${want}`,
    '\nReturn your current implementation with ONLY this data-shape issue fixed. Preserve every existing authorization, tenancy, ownership, conservation, idempotency, and input-validation check EXACTLY as written — do not drop or weaken any guard. Output ONLY the corrected JavaScript module.',
  ].join('\n');
}

/**
 * Run the shape-conformance gate over a fully-built epic's surfaces. Mirrors runIntegrationGate's signature
 * (surfaces/files/prompts/skeleton/baseModel/gate/rebuild) so the harness can compose it before the seam-gate.
 * Mutates `files` in place on repair. Returns counters for paired-probe attribution.
 * @returns {Promise<{files, ranGate, kind, shapes, surfacesFlagged, violations, repairs, leak, detail}>}
 */
export async function runShapeGate({ surfaces, files, prompts, skeleton, baseModel = '', gate, rebuild }) {
  const off = (extra = {}) => ({ files, ranGate: false, kind: gate?.kind || 'off', shapes: {}, surfacesFlagged: 0, violations: 0, repairs: 0, leak: false, detail: [], ...extra });
  if (!gate || gate.kind === 'off') return off();
  const shapes = parseDeclaredShapes(`${baseModel}\n${skeleton}`);
  if (!Object.keys(shapes).length) return off({ shapes });

  const maxRepairs = Math.max(0, gate.repairDepth || 0);
  let violations = 0, repairs = 0, surfacesFlagged = 0;
  const detail = [];

  for (const surface of surfaces) {
    if (!(surface in files)) continue;
    let flagged = false;
    for (let pass = 0; pass <= maxRepairs; pass++) {
      const v = surfaceViolations(files[surface], shapes);
      if (!v.length) break;
      if (!flagged) { flagged = true; surfacesFlagged++; violations += v.length; detail.push({ surface, viols: v.map((x) => `${x.store}:want-${x.declared}/got-${x.actual}`) }); }
      if (pass === maxRepairs) break;                 // out of budget → ship; the oracle still grades it
      const rp = shapeRepairPrompt(prompts[surface] || '', v[0], files[surface]);
      if (scanOracleLeak(rp)) return { files, ranGate: true, kind: gate.kind, shapes, surfacesFlagged, violations, repairs, leak: true, detail };
      let code; try { code = await rebuild(surface, rp); } catch { code = ''; }
      if (!code || !code.trim()) break;               // repair build failed → keep current code
      files[surface] = code; repairs++;
    }
  }
  return { files, ranGate: true, kind: gate.kind, shapes, surfacesFlagged, violations, repairs, leak: false, detail };
}
