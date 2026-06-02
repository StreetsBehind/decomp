// Arm-block machinery for the archetype premise experiment (ARCHETYPE-PREMISE-EXPERIMENT.md §2/§7).
//
// The PRIMED arm injects a block built from the library archetypes that match a fixture's features
// (classify -> instantiate intrinsic surfaces -> render obligations as typed questions -> state-probe
// sweep). The block is PINNED: it is rendered deterministically from a per-fixture arm SPEC
// (experiments/arm-blocks/<fixture>.json — the classification) + the authored archetype entries
// (experiments/archetype-premise/archetypes.json). It contains ONLY surfaces + obligations + probes;
// the primed strategy C1-lints the source entries before rendering, so no edge can be injected.
//
// The PLACEBO arm injects an equal-purpose, content-FREE block (generic plan-agnostic advice) so a
// measured primed-vs-placebo delta is attributable to the archetypes' typed content, not to "more
// context". (Per-fixture token-matching of the placebo to the primed block is a refinement.)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARM_SPEC_DIR = resolve(ROOT, 'experiments/arm-blocks');
const ARCHETYPE_DB = resolve(ROOT, 'experiments/archetype-premise/archetypes.json');

/** A sentinel the runner can recognize: a fixture simply has no arm spec, so this arm is skipped. */
export class NoArmSpecError extends Error {}

/** Load the pinned per-fixture arm spec. Throws NoArmSpecError when absent (-> runner skips this arm). */
export function loadArmSpec(fixtureName) {
  const p = resolve(ARM_SPEC_DIR, `${fixtureName}.json`);
  if (!existsSync(p)) throw new NoArmSpecError(`no arm spec for fixture '${fixtureName}' (expected ${p}) — arm skipped`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

/** archetypeKey -> entry, from the authored library. */
export function loadArchetypeDb() {
  if (!existsSync(ARCHETYPE_DB)) throw new Error(`archetype db not found at ${ARCHETYPE_DB}`);
  const db = JSON.parse(readFileSync(ARCHETYPE_DB, 'utf8'));
  const map = new Map();
  for (const e of db.entries || []) map.set(e.archetypeKey, e.entry);
  return map;
}

/** Resolve a spec's archetype keys to entries; throws if a key is missing from the db. */
export function resolveArchetypes(spec, db) {
  return (spec.archetypes || []).map((k) => {
    const e = db.get(k);
    if (!e) throw new Error(`arm-block: archetype '${k}' (from spec ${spec.fixture}) not in the archetype db`);
    return e;
  });
}

const surfaceLine = (s) => {
  const params = Array.isArray(s.params) && s.params.length ? ` (${s.params.join(', ')})` : '';
  const fail = s.canFail ? ' [CAN-FAIL]' : '';
  return `  - ${s.type}:${s.name}${params}${fail}`;
};

// The shared block body: preamble + per-archetype surfaces/obligations(as questions)/probes. Surfaces
// + obligations + probes only — never an edge. Used by BOTH the primed arm and the (mismatched-
// archetype) placebo arm, so the two blocks are STRUCTURALLY IDENTICAL and differ ONLY in which
// archetype's content is listed — the cleanest possible control for "a concrete checklist focuses the
// model" (concreteness/length) vs the archetype's actual CONTENT-FIT.
function renderArchetypeChecklist(entries) {
  const lines = [
    'ARCHETYPE PRIORS (an untrusted seed). These are PROBES: they can only ADD candidate surfaces and',
    'OPEN QUESTIONS for you to consider. They NEVER assert a dependency, complete the work, or tell you',
    'to stop. Use them to WIDEN your search, then decompose the plan normally and exhaustively.',
  ];
  for (const e of entries) {
    lines.push('', `### archetype: ${e.archetypeKey}`);
    if (Array.isArray(e.intrinsicSurfaces) && e.intrinsicSurfaces.length) {
      lines.push('Typed surfaces this kind of feature ALWAYS introduces (instantiate to THIS plan; do not assume where they wire):');
      for (const s of e.intrinsicSurfaces) lines.push(surfaceLine(s));
    }
    if (Array.isArray(e.obligations) && e.obligations.length) {
      lines.push('Open questions to resolve AGAINST THIS PLAN (each is a typed hole — you either find the producer/consumer HERE, or you SURFACE it as an open question; never invent a dependency):');
      for (const o of e.obligations) if (o && o.query) lines.push(`  - ${o.query}`);
    }
    if (Array.isArray(e.stateProbes) && e.stateProbes.length) {
      lines.push('Lifecycle / state cells to check for coverage (an uncovered cell is a candidate surface or open question):');
      for (const p of e.stateProbes) if (p && p.cell) lines.push(`  - ${p.cell}`);
    }
  }
  return lines.join('\n');
}

/** Render the PRIMED block from the archetype entries that MATCH the fixture's features. */
export function renderPrimedBlock(entries) {
  return renderArchetypeChecklist(entries);
}

const DEFAULT_PLACEBO = [
  'DECOMPOSITION REMINDERS (general best practice — not specific to this plan):',
  '  - Enumerate the FULL latent work, not only what the plan spells out.',
  '  - Name the data stores, routes, config/secrets, background jobs, and middleware each feature needs.',
  '  - Think through the failure paths and error states, not just the happy path.',
  '  - Keep each packet atomic and independently buildable, with clear acceptance criteria.',
  '  - Consider lifecycle states (first-time, expired, revoked, concurrent) where work often hides.',
].join('\n');

/**
 * Render the PLACEBO (A1) block. Preference order:
 *   1. spec.placeboArchetypes — render a MISMATCHED archetype (a real archetype for a DIFFERENT
 *      feature than this plan has) in the IDENTICAL structure as the primed block. This is the
 *      strongest control: same format + comparable length, deliberately wrong-domain content, so a
 *      primed>placebo delta is attributable to the archetype's CONTENT-FIT, not concreteness/length.
 *   2. spec.placebo — an explicit content-free text block.
 *   3. DEFAULT_PLACEBO — generic plan-agnostic advice.
 * @param {object} spec  the arm spec
 * @param {Map<string,object>} [db]  archetypeKey -> entry (required for placeboArchetypes)
 */
export function renderPlaceboBlock(spec, db) {
  if (Array.isArray(spec.placeboArchetypes) && spec.placeboArchetypes.length) {
    if (!db) throw new Error(`arm-block: spec ${spec.fixture} uses placeboArchetypes but no archetype db was provided`);
    return renderArchetypeChecklist(resolveArchetypes({ ...spec, archetypes: spec.placeboArchetypes }, db));
  }
  return typeof spec.placebo === 'string' && spec.placebo.trim() ? spec.placebo.trim() : DEFAULT_PLACEBO;
}

export default { loadArmSpec, loadArchetypeDb, resolveArchetypes, renderPrimedBlock, renderPlaceboBlock, NoArmSpecError };
