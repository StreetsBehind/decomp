// The archive — at P1 a FLAT PARETO LIST (P≤6), mirroring /build-batch's serialized merge (DESIGN §4).
// Celled MAP-Elites is a P2 mechanism and is deliberately NOT here.
//
// Insertion applies, in order:
//   1. the PER-CELL lethal non-inferiority veto (§6/§4.4) vs the co-measured baseline — a candidate that
//      drops ANY crosscut/integration cell below baseline is rejected (it bought a cheap win by breaking
//      a silent-expensive obligation). This is the rev.2→rev.3 fix: per-cell, not bucket-average.
//   2. Pareto insertion over (cost ↓, reliability ↑), never scalarized: reject if dominated; else evict
//      everything this candidate dominates and add it; cap at P.
//
// The veto consumes the scorecard's `cells` (mechanical channel) — this module never touches the digest,
// and is never shown a model.

import { LETHAL_BUCKETS } from './config.mjs';

// per-cell non-inferiority over the lethal buckets: candidate must pass >= baseline on EVERY lethal cell.
// Ranges over the union of both cell sets; a cell the baseline passes but the candidate lacks/fails => fail.
export function perCellVetoOk(candidateCells, baselineCells) {
  const keys = new Set();
  for (const k of Object.keys(candidateCells)) if (LETHAL_BUCKETS.includes(k.split('::')[1])) keys.add(k);
  for (const k of Object.keys(baselineCells)) if (LETHAL_BUCKETS.includes(k.split('::')[1])) keys.add(k);
  const dropped = [];
  for (const k of keys) {
    const c = candidateCells[k] === true ? 1 : 0;
    const b = baselineCells[k] === true ? 1 : 0;
    if (c < b) dropped.push(k);
  }
  return { ok: dropped.length === 0, droppedCount: dropped.length };
}

// (cost ↓, reliability ↑). a dominates b iff a is no worse on both and strictly better on at least one.
export function paretoDominates(a, b) {
  const noWorse = a.cost <= b.cost && a.reliability >= b.reliability;
  const strictly = a.cost < b.cost || a.reliability > b.reliability;
  return noWorse && strictly;
}

export function makeArchive({ cap = 6 } = {}) {
  /** @type {Array<{hash:string, genome:object, scorecard:object, cost:number, reliability:number}>} */
  let members = [];

  function entryFrom(scorecard, genome) {
    return { hash: scorecard.genomeHash, genome, scorecard, cost: scorecard.cost.total, reliability: scorecard.reliability };
  }

  return {
    get members() { return members; },
    size() { return members.length; },
    has(hash) { return members.some((m) => m.hash === hash); },
    snapshot() { return members.map((m) => ({ hash: m.hash, cost: m.cost, reliability: m.reliability, genome: m.genome, scorecard: m.scorecard })); },
    restore(snap) { members = (snap || []).map((m) => ({ hash: m.hash, genome: m.genome, scorecard: m.scorecard, cost: m.cost, reliability: m.reliability })); },

    /**
     * Try to insert a candidate scorecard. baseline = the co-measured baseline scorecard (or null to skip
     * the veto, e.g. inserting a reference itself).
     * @returns {{inserted:boolean, reason:string, evicted:string[]}}
     */
    insert(scorecard, genome, baseline = null) {
      const cand = entryFrom(scorecard, genome);

      // 1. per-cell lethal veto vs co-measured baseline
      if (baseline) {
        const v = perCellVetoOk(scorecard.cells, baseline.cells);
        if (!v.ok) return { inserted: false, reason: `lethal-veto(${v.droppedCount} cell${v.droppedCount === 1 ? '' : 's'} below baseline)`, evicted: [] };
      }

      // de-dupe by hash: keep the better (or just refuse a worse re-eval)
      const existing = members.find((m) => m.hash === cand.hash);
      if (existing) {
        if (paretoDominates(cand, existing)) { members = members.filter((m) => m.hash !== cand.hash); }
        else return { inserted: false, reason: 'duplicate', evicted: [] };
      }

      // 2. Pareto insertion
      if (members.some((m) => paretoDominates(m, cand))) return { inserted: false, reason: 'dominated', evicted: [] };
      const evicted = members.filter((m) => paretoDominates(cand, m)).map((m) => m.hash);
      members = members.filter((m) => !paretoDominates(cand, m));
      members.push(cand);

      // cap: if over, evict the entry with the worst reliability-per-cost (crowding-free simple rule)
      if (members.length > cap) {
        members.sort((x, y) => (y.reliability - x.reliability) || (x.cost - y.cost));
        const dropped = members.slice(cap);
        members = members.slice(0, cap);
        for (const d of dropped) if (d.hash === cand.hash) return { inserted: false, reason: 'over-cap', evicted };
        for (const d of dropped) evicted.push(d.hash);
      }
      return { inserted: true, reason: 'pareto', evicted };
    },

    // The non-dominated front (the whole list is already a front, but expose for clarity).
    front() { return members.slice().sort((a, b) => a.cost - b.cost); },

    // K4 collapse signal: distinct genotypes / size. 1.0 = all distinct; low = collapsed.
    diversity() {
      if (!members.length) return 1;
      return new Set(members.map((m) => m.hash)).size / members.length;
    },
  };
}
