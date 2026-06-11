// Pins the C1 "no edge at intake" lint (eval/c1-lint.mjs). A clean archetype passes; every form of
// edge-smuggling is caught and localized; assertC1 aborts on a bad set. Also opportunistically checks
// that our authored, REPAIRED archetypes are actually C1-clean (the gate working end to end).

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { lintArchetype, assertC1 } from '../c1-lint.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// A clean entry. NOTE: legal obligations may use "->" in their query PROSE to describe resolution
// logic ("producer found -> edge-to-compute; none -> open-question") — that is NOT smuggling and must
// NOT trip the structural lint (the spec's own examples do this). C1 is a FIELD-level check.
const clean = {
  archetypeKey: 'demo-clean',
  intrinsicSurfaces: [{ type: 'Store', name: 'session' }, { type: 'Token', name: 'state' }],
  obligations: [
    { query: 'who consumes Identity? producer found -> edge-to-compute; none -> open-question', resolvesTo: 'open-question', wellPosedFromIntrinsic: 'Identity' },
    { query: 'is there a durable account store in this plan?', resolvesTo: 'edge-to-compute', wellPosedFromIntrinsic: 'Identity' },
  ],
  stateProbes: [{ cell: 'first-login' }],
  provenance: { source: 'expert-author', trust: 'untrusted' },
};

export function run() {
  // ---- clean entry passes (including the legal "->" resolution idiom in prose) ----
  const ok = lintArchetype(clean);
  assert.equal(ok.ok, true, 'a clean archetype passes C1 (resolution-logic "->" in prose is allowed)');
  assert.equal(ok.violations.length, 0);

  // ---- (1) an edge-shaped FIELD on an obligation is caught + localized ----
  const edgeField = lintArchetype({ archetypeKey: 'demo-edge-field', obligations: [{ query: 'link the identity', to: 'user-store', resolvesTo: 'open-question' }] });
  assert.equal(edgeField.ok, false, 'an obligation with a `to` field fails C1');
  assert.ok(edgeField.violations.some((v) => /\.to\b/.test(v.path)), 'the edge field is localized');

  // ---- (2) a `from`/`fromPlanKey` field on a surface is caught ----
  const fromField = lintArchetype({ archetypeKey: 'demo-from', intrinsicSurfaces: [{ type: 'Route', name: 'callback', fromPlanKey: 'login' }] });
  assert.equal(fromField.ok, false, 'a stored fromPlanKey fails C1');
  assert.ok(fromField.violations.some((v) => /fromPlanKey/i.test(v.path)), 'the from field is localized');

  // ---- (3) an obligation that ASSERTS an edge (illegal resolvesTo) is caught ----
  const asserts = lintArchetype({ archetypeKey: 'demo-asserts', obligations: [{ query: 'who consumes Identity?', resolvesTo: 'edge-exists' }] });
  assert.equal(asserts.ok, false, 'resolvesTo other than edge-to-compute|open-question fails C1');
  assert.ok(asserts.violations.some((v) => /resolvesTo/.test(v.path)), 'the bad resolvesTo is localized');

  // ---- (4) a top-level edges array is caught (both the key and its from/to) ----
  const edges = lintArchetype({ archetypeKey: 'demo-edges', intrinsicSurfaces: [], obligations: [], edges: [{ from: 'a', to: 'b' }] });
  assert.equal(edges.ok, false, 'a stored edges[] fails C1');
  assert.ok(edges.violations.length >= 2, 'the edges key AND its from/to are all flagged');

  // ---- assertC1: passes on a clean set, throws on a smuggling set ----
  assert.doesNotThrow(() => assertC1([clean]), 'assertC1 passes a clean set');
  assert.throws(() => assertC1([clean, { archetypeKey: 'bad', obligations: [{ query: 'x', to: 'y' }] }]), /C1 lint FAILED/, 'assertC1 aborts on any smuggling entry');

  // ---- opportunistic: our authored, REPAIRED archetypes must be C1-clean (the gate working) ----
  const dbPath = resolve(ROOT, 'experiments/archetype-premise/archetypes.json');
  let realClean = true;
  let realDetail = '(archetypes.json absent — skipped)';
  if (existsSync(dbPath)) {
    const db = JSON.parse(readFileSync(dbPath, 'utf8'));
    const bad = (db.entries || []).map((e) => lintArchetype(e.entry)).filter((r) => !r.ok);
    realClean = bad.length === 0;
    realDetail = realClean ? `${(db.entries || []).length} authored archetypes are C1-clean` : `C1 violations in: ${bad.map((b) => b.archetypeKey).join(', ')}`;
  }
  assert.equal(realClean, true, `authored archetypes pass C1 — ${realDetail}`);

  return { name: 'c1-lint', assertions: 13 };
}

export default run;
