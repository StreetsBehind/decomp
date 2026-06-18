// The CELLED MAP-Elites archive (DESIGN §4.1) — the P2 replacement for the P1 flat Pareto list.
//
// WHY this exists (finding B3 / kill K4): over a near-uniform cost axis (cheap genomes ~free) a flat Pareto
// front degenerates to a single point, so it cannot also be the breeding pool without starving exploration.
// MAP-Elites cells the search space by a BEHAVIORAL DESCRIPTOR and keeps one elite per cell, so "no
// collapse to a single niche" becomes MEASURABLE (the K4 coverage signal) rather than aspirational, and
// parent selection (loop.mjs) can draw a DIVERSE pool that preserves the genes a multi-gene optimum needs.
//
// This module is a DROP-IN for the flat archive (same insert/snapshot/restore/front/diversity/size/has/
// members surface) so loop.mjs is unchanged except for the optional celled-selection hook. It is a P2
// mechanism (FREEZE.md §5 — NOT frozen), introduced at the P2 clean-restart; the frozen P0/K8 trajectory is
// unperturbed because those drivers construct the FLAT archive (makeArchive) explicitly and never this one.
//
// TWO load-bearing invariants carried over verbatim from the flat archive (archive.mjs):
//   1. the PER-CELL lethal non-inferiority veto (§6/§4.4) applies at insertion, BEFORE celling — a candidate
//      that drops ANY crosscut/integration cell below the co-measured baseline is rejected outright.
//   2. an occupied cell is only displaced by a candidate that PARETO-DOMINATES its incumbent (cost↓,
//      reliability↑) — DESIGN §4.1. Neither-dominates ⇒ the incumbent (the elite) is kept.
// The descriptor consumes the MECHANICAL channel (the per-cell pass-vector / cost), exactly like the veto;
// this module never touches the mutator digest and is never shown to a model.

import { ALL_BUCKETS } from './config.mjs';
import { perCellVetoOk, paretoDominates } from './archive.mjs';
import { defaultGenome } from './genome.mjs';

// ---- the behavioral descriptor (DESIGN §4.1): (genotype-Hamming bucket, per-bucket recall signature,
//      cost bucket). Bins are FIXED + computed on the frozen CORE so cell assignment is STATIONARY across
//      generations (round-2 L2-niching) — a drifting score must never silently re-bin an incumbent. These
//      are P2 tunables (NOT frozen); they live here as named constants so the binning is inspectable. ----

// recall bins per bucket: 0 (broken) · 1 (partial) · 2 (perfect). 3 bins × 4 buckets.
const EPS = 1e-9;
function recallBin(frac) { return frac <= EPS ? 0 : (frac >= 1 - EPS ? 2 : 1); }

// cost bins: $0 (free) · cheap · mid · frontier. Thresholds straddle the program's known cost points
// (fusion $0, sonnet-author ~$0.09, opus-author ~$0.27–0.40).
const COST_THRESHOLDS = [EPS, 0.15, 0.35];
function costBin(total) { let b = 0; for (const t of COST_THRESHOLDS) { if (total > t) b++; else break; } return b; }

// genotype-Hamming: # genes differing from the canonical default genome, bucketed into 4 bands {0-1,2-3,4-5,6+}.
const DEFAULT_GENE_VECTOR = geneVector(defaultGenome());
function geneVector(g) {
  const ig = g.integrationGate || {};
  return [
    g.skeletonAuthor?.model, g.skeletonAuthor?.shapesIncluded, g.skeletonAuthor?.obligationDepth,
    g.decomposer?.model, g.decomposer?.lensEnsemble, g.decomposer?.nLenses,
    g.builder?.K,
    g.retry?.count, g.retry?.gateStrictness,
    g.checker?.kind, g.checker?.repairDepth, (g.checker?.obligationClasses || []).slice().sort().join(','),
    ig.kind || 'off', ig.repairDepth || 0,
    g.integrator?.recurrenceThreshold,
    g.amortizationM,
  ];
}
function hammingBucket(g) {
  const v = geneVector(g);
  let h = 0; for (let i = 0; i < v.length; i++) if (v[i] !== DEFAULT_GENE_VECTOR[i]) h++;
  return Math.min(Math.floor(h / 2), 3);
}

// pooled per-bucket pass-fractions, recomputed from the scorecard's per-epic bucket counts (mechanical
// channel; identical pooling to the §6 reliability scalar). Empty bucket (no cells) ⇒ fraction 1.
export function pooledFractions(scorecard) {
  const acc = {}; for (const b of ALL_BUCKETS) acc[b] = { p: 0, t: 0 };
  for (const ep of Object.values(scorecard.perEpic || {})) {
    for (const b of ALL_BUCKETS) { acc[b].p += ep.buckets[b].pass; acc[b].t += ep.buckets[b].total; }
  }
  const frac = {}; for (const b of ALL_BUCKETS) frac[b] = acc[b].t ? acc[b].p / acc[b].t : 1;
  return frac;
}

// the cell key: stationary, order-fixed (wire,happy,crosscut,integration) so two scorecards in the same
// behavioral cell share a key byte-for-byte.
export function cellKey(scorecard, genome) {
  const f = pooledFractions(scorecard);
  const r = `${recallBin(f.wire)}${recallBin(f.happy)}${recallBin(f.crosscut)}${recallBin(f.integration)}`;
  return `h${hammingBucket(genome)}|r${r}|c${costBin(scorecard.cost.total)}`;
}

export function makeMapElitesArchive() {
  /** @type {Map<string,{hash:string, genome:object, scorecard:object, cost:number, reliability:number, cell:string}>} */
  let cells = new Map();

  function entryFrom(scorecard, genome, cell) {
    return { hash: scorecard.genomeHash, genome, scorecard, cost: scorecard.cost.total, reliability: scorecard.reliability, cell };
  }
  function allMembers() { return Array.from(cells.values()); }

  return {
    get members() { return allMembers(); },
    size() { return cells.size; },
    has(hash) { return allMembers().some((m) => m.hash === hash); },

    // serialise the whole cell map (one elite per cell) — round-trips through JSON for checkpoint/resume.
    snapshot() { return allMembers().map((m) => ({ cell: m.cell, hash: m.hash, cost: m.cost, reliability: m.reliability, genome: m.genome, scorecard: m.scorecard })); },
    restore(snap) {
      cells = new Map();
      for (const m of snap || []) cells.set(m.cell, { hash: m.hash, genome: m.genome, scorecard: m.scorecard, cost: m.cost, reliability: m.reliability, cell: m.cell });
    },

    /**
     * Insert a candidate. baseline = the co-measured baseline scorecard (null skips the veto, e.g. a
     * reference). Order: (1) per-cell lethal veto vs baseline; (2) cell lookup; (3) place if empty, else
     * displace the incumbent iff the candidate Pareto-dominates it.
     * @returns {{inserted:boolean, reason:string, evicted:string[], cell:string}}
     */
    insert(scorecard, genome, baseline = null) {
      if (baseline) {
        const v = perCellVetoOk(scorecard.cells, baseline.cells);
        if (!v.ok) return { inserted: false, reason: `lethal-veto(${v.droppedCount} cell${v.droppedCount === 1 ? '' : 's'} below baseline)`, evicted: [], cell: null };
      }
      const cell = cellKey(scorecard, genome);
      const cand = entryFrom(scorecard, genome, cell);
      const incumbent = cells.get(cell);
      if (!incumbent) { cells.set(cell, cand); return { inserted: true, reason: 'new-cell', evicted: [], cell }; }
      if (incumbent.hash === cand.hash) {
        // a re-eval of the same genome: keep the better (lets a noisy re-measure improve an elite), else refuse.
        if (paretoDominates(cand, incumbent)) { cells.set(cell, cand); return { inserted: true, reason: 'self-improve', evicted: [], cell }; }
        return { inserted: false, reason: 'duplicate', evicted: [], cell };
      }
      if (paretoDominates(cand, incumbent)) { cells.set(cell, cand); return { inserted: true, reason: 'displace', evicted: [incumbent.hash], cell }; }
      return { inserted: false, reason: 'occupied', evicted: [], cell };
    },

    // the global non-dominated front over all cell elites (the deliverable / WIN front), sorted by cost.
    front() {
      const ms = allMembers();
      const nd = ms.filter((m) => !ms.some((o) => o !== m && paretoDominates(o, m)));
      // de-dup identical (cost,reliability) Pareto points by hash for a stable frontKey
      const seen = new Set(); const out = [];
      for (const m of nd.sort((a, b) => a.cost - b.cost || b.reliability - a.reliability)) {
        const k = `${m.hash}:${m.cost}:${m.reliability}`; if (seen.has(k)) continue; seen.add(k); out.push(m);
      }
      return out;
    },

    // K4 collapse signal kept drop-in-compatible with the flat archive (distinct genotypes / elites); 1.0 =
    // all elites distinct. coverage() is the celled-specific signal the P2c gate asserts (>1 ⇒ not collapsed).
    diversity() {
      const ms = allMembers();
      if (!ms.length) return 1;
      return new Set(ms.map((m) => m.hash)).size / ms.length;
    },
    coverage() { return cells.size; },
    cellKeys() { return Array.from(cells.keys()); },
  };
}

// Celled parent selection (DESIGN §4.1 "select parents from the MAP-Elites archive"). Draws μ DISTINCT
// elites from filled cells, lightly front-biased so a near-uniform exploration still keeps convergence
// pressure (the global front is always eligible). Returns loop-shaped entries {genome, sc}. Falls back to
// padding from the candidate pool when the archive holds fewer than μ elites (early generations). The rng
// is the loop's single injected stream, so every draw is serialised into the checkpoint (deterministic resume).
export function makeCelledSelect({ frontBias = 0.5 } = {}) {
  return function selectParents(archive, pool, rng, mu) {
    const elites = (archive.members || []).slice();
    if (elites.length === 0) return padFromPool([], pool, mu);
    const front = archive.front ? archive.front() : [];
    const frontHashes = new Set(front.map((m) => m.hash));
    const chosen = []; const usedHashes = new Set();
    // a shuffled bag of all elites + an extra copy of the front members (the front-bias) — sampling without
    // genotype repeat preserves diversity while making the front more likely to be a parent.
    const bag = elites.concat(frontBias > 0 ? front : []);
    for (const e of rng.shuffle(bag)) {
      if (chosen.length >= mu) break;
      if (usedHashes.has(e.hash)) continue;
      usedHashes.add(e.hash); chosen.push({ genome: e.genome, sc: e.scorecard });
    }
    void frontHashes;
    return padFromPool(chosen, pool, mu, usedHashes);
  };
}

// pad a partial parent set up to μ from the candidate pool (μ-best by reliability, tie-break cost), skipping
// genotypes already chosen — keeps the breeding pool at full width in the first generations.
function padFromPool(chosen, pool, mu, usedHashes = new Set()) {
  for (const c of chosen) usedHashes.add(c.sc?.genomeHash);
  const sorted = (pool || []).slice().sort((a, b) => (b.sc.reliability - a.sc.reliability) || (a.sc.cost.total - b.sc.cost.total));
  for (const e of sorted) {
    if (chosen.length >= mu) break;
    if (usedHashes.has(e.sc.genomeHash)) continue;
    usedHashes.add(e.sc.genomeHash); chosen.push(e);
  }
  return chosen;
}
