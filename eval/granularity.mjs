// Granularity measurement — "how decomposed IS this snapshot?" (RESEARCH-PROGRAM §2.1).
//
// The granularity experiments regress endpoints on the MEASURED dose, never on the requested
// level alone (assumption A5: knobs are leaky — models don't obey "make 12 beads"). This module
// computes that dose, deterministically, from any snapshot + its manifest. PURE — no model, no
// clock; imports the canonical graph helpers (CHARTER §6: reuse primitives, no drift).

import { buildIndex, nonEpicBeads } from './graph/build-graph.mjs';

/** Median of a numeric array (0 for empty). Deterministic. */
function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function round(x, digits = 4) {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

/**
 * Measure the granularity of a snapshot against its fixture manifest.
 *
 * @param {{beads:object[], edges:object[]}} snapshot
 * @param {{requirements?:object[]}} manifest  the fixture's outcome manifest (latent truth)
 * @returns {{
 *   beadCount: number,            non-epic beads
 *   atomsPerRequirement: number,  beadCount / |manifest.requirements| — the PRIMARY dose (G.atoms)
 *   acMedian: number,             median acceptance-criteria count per bead (size proxy)
 *   acMean: number,
 *   edgeDensity: number,          |edges| / beadCount (0 when no beads)
 *   depth: number                 max parent-chain depth (1 = flat, 0 = empty)
 * }}
 */
export function scoreGranularity(snapshot, manifest) {
  const index = buildIndex(snapshot);
  const beads = nonEpicBeads(index);
  const beadCount = beads.length;

  const reqCount = Array.isArray(manifest?.requirements) ? manifest.requirements.length : 0;
  const atomsPerRequirement = reqCount > 0 ? beadCount / reqCount : 0;

  const acCounts = beads.map((b) => (b.metadata?.acceptanceCriteria || []).length);
  const acMedian = median(acCounts);
  const acMean = beadCount ? acCounts.reduce((a, b) => a + b, 0) / beadCount : 0;

  const edgeCount = (snapshot.edges || []).length;
  const edgeDensity = beadCount ? edgeCount / beadCount : 0;

  // depth: longest parent chain over ALL beads (epics are the usual interior nodes).
  let depth = 0;
  for (const b of index.beads) {
    let d = 1;
    let cur = b;
    const seen = new Set([b.id]);
    while (cur && typeof cur.parent === 'string' && index.byId.has(cur.parent) && !seen.has(cur.parent)) {
      cur = index.byId.get(cur.parent);
      seen.add(cur.id);
      d++;
    }
    if (d > depth) depth = d;
  }
  if (!index.beads.length) depth = 0;

  return {
    beadCount,
    atomsPerRequirement: round(atomsPerRequirement),
    acMedian: round(acMedian),
    acMean: round(acMean),
    edgeDensity: round(edgeDensity),
    depth,
  };
}

export default { scoreGranularity };
