// STATED-outcome coverage — the cheap, deterministic half of the thin-input split.
//
// CHARTER §5.3/§8: a thin abstract plan STATES a handful of outcomes. A method that
// decomposes it tags each bead it produces with metadata.provenance.outcomeIds — the
// STATED outcome ids that bead serves. Because the outcome ids are STATED (they live in
// the thin plan the method saw), a method CAN carry them forward, so coverage of the
// stated outcomes is mechanically checkable — no judgment, no model.
//
// This is deliberately NOT build-completeness's planKey matching: a generative method
// invents its own breakdown and cannot know the manifest's latent planKeys, so it cannot
// tag beads with them. It CAN tag beads with the stated outcome ids it was handed. That is
// exactly what this scorer keys on (metadata.provenance.outcomeIds), so it works for
// generative output where build-completeness.beadPresence (planKey-keyed) breaks.
//
// PURE + deterministic: no clock, no randomness, no model. Reuses buildIndex so it shares
// one notion of "the beads" with every other scorer (no drift).

import { buildIndex } from './graph/build-graph.mjs';

/**
 * Mechanical coverage of the plan's STATED outcomes.
 *
 * @param {object} snapshot  conforms to schemas/snapshot.schema.json. Each bead MAY carry
 *                           metadata.provenance.outcomeIds: string[] (the stated outcome ids it serves).
 * @param {object} manifest  conforms to schemas/outcome-manifest.schema.json.
 * @returns {{ score:number, covered:string[], missing:Array<{ref:string,what:string,evidence:string}> }}
 *          score = (# stated outcomes carried by >=1 bead) / (# stated outcomes); 1 if no outcomes.
 */
export function scoreOutcomeCoverage(snapshot, manifest) {
  const index = buildIndex(snapshot);

  // The set of outcome ids any bead claims to serve (provenance.outcomeIds).
  const carried = new Set();
  for (const b of index.beads) {
    const ids = b?.metadata?.provenance?.outcomeIds;
    if (Array.isArray(ids)) for (const id of ids) carried.add(id);
  }

  const outcomes = manifest.outcomes || [];
  const covered = [];
  const missing = [];
  for (const o of outcomes) {
    if (carried.has(o.id)) {
      covered.push(o.id);
    } else {
      missing.push({
        ref: o.id,
        what: `stated outcome '${o.id}' carried by no bead's provenance.outcomeIds`,
        evidence: o.statement || '',
      });
    }
  }

  const score = outcomes.length ? covered.length / outcomes.length : 1;
  return { score, covered, missing };
}

export default scoreOutcomeCoverage;
