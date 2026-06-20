// The frontier parent-SELECTION strategy registry (gleaning #3; DECISION-BRIEF #3, EVO-GLEANINGS-PLAN §"#3").
//
// WHY this exists. evo (the external instrument) exposes the parent-selection policy as a swappable, logged
// knob (argmax / top_k / epsilon_greedy / softmax / pareto_per_task). Our loop hardcodes μ-best at
// loop.mjs:45 behind a `selectParents` hook. This module turns that hook into a NAMED registry so the policy
// is (a) inspectable, (b) ablatable in a clean-restart epoch (Batch 2), and (c) — crucially — DEFAULT-OFF so
// installing it changes NOTHING about the frozen P0/K8 trajectory.
//
// SCAFFOLDING ONLY (Class C, additive-now). No driver is wired to a non-default strategy here. Swapping the
// ACTIVE strategy alters the search trajectory → that is a clean-restart event (§11 R2-10), deferred to Batch
// 2 with its own pre-registration. This file only DEFINES the registry; nothing here is invoked by a live run.
//
// FREEZE-SAFETY (the load-bearing distinction). `pareto_per_cell` is the per-cell-specialist analog of evo's
// `pareto_per_task`: it is PARENT *SELECTION* (which genomes BREED next generation), NOT the frozen per-cell
// insertion *VETO* (`archive.perCellVetoOk`, which decides which candidates SURVIVE into the archive).
// Selection ≠ survival: a strategy may PREFER a lethal-cell specialist as a parent, but it can never admit a
// candidate the veto rejects, never re-decide an archive member, and never read/alter perCellVetoOk. So even
// the non-default strategy is freeze-safe by construction; only its TRAJECTORY effect (different parents →
// different children) is gated to a restart.
//
// THE FROZEN ABLATION SET is EXACTLY { mu_best, pareto_per_cell } (DECISION-BRIEF #3). Stochastic strategies
// (top_k / epsilon_greedy / softmax) are DELIBERATELY EXCLUDED: each samples non-deterministically over the
// candidate ranking, which would CONFOUND the policy effect with the RNG seed (an apparent strategy win could
// be a lucky draw). Both members of the frozen set are deterministic given the injected rng, so the Batch-2
// agreement rule (identical load-bearing-mutation identity AND identical scale-gate N-bucket across both
// strategies × both seeds) is a clean policy comparison, not RNG-shopping. Adding a stochastic strategy to the
// ablation is INADMISSIBLE; they are kept out of STRATEGIES entirely so they cannot be ablated by accident.

import { LETHAL_BUCKETS } from './config.mjs';

// The frozen ablation set. EXACTLY these two — see the module header for why stochastic strategies are
// excluded (RNG confound). `getStrategy` admits ONLY these names.
export const FROZEN_ABLATION_SET = Object.freeze(['mu_best', 'pareto_per_cell']);

// ----------------------------------------------------------------------------------------------------------
// mu_best — the frozen default. MUST be BYTE-FOR-BYTE behaviorally identical to loop.mjs's internal default
// (`(_archive, pool, _rng, mu) => topMu(pool, mu)`), so installing the registry as the explicit hook leaves
// the rng sequence and the archive trajectory bit-identical. It does NOT consume the rng (the `_rng`
// parameter is ignored exactly as in loop.mjs). `topMu` is mirrored VERBATIM from loop.mjs:27-32; if loop.mjs
// changes its default, the bit-identical gate (gates/strategy-registry-smoke.mjs, layer BIT) WILL break,
// which is the intended tripwire.
// ----------------------------------------------------------------------------------------------------------

// μ-best distinct genomes by (reliability desc, cost asc) — the breeding pool. Mirrors loop.mjs:topMu exactly.
function topMu(entries, mu) {
  const seen = new Set(); const out = [];
  const sorted = entries.slice().sort((a, b) => (b.sc.reliability - a.sc.reliability) || (a.sc.cost.total - b.sc.cost.total));
  for (const e of sorted) { if (seen.has(e.sc.genomeHash)) continue; seen.add(e.sc.genomeHash); out.push(e); if (out.length >= mu) break; }
  return out;
}

// loop-shaped selectParents signature: (archive, pool, rng, mu) -> entries[{ genome, sc }].
function mu_best(_archive, pool, _rng, mu) {
  return topMu(pool, mu);
}

// ----------------------------------------------------------------------------------------------------------
// pareto_per_cell — the per-cell-specialist parent SELECTION (the analog of evo's pareto_per_task). Keeps as
// parents the archive elites that are BEST on some lethal cell (crosscut/integration), so per-cell
// specialists survive into the breeding pool even when a single global μ-best front would crowd them out.
// This COMPLEMENTS the per-cell veto (the veto keeps a specialist from being EVICTED on survival; this keeps
// it from being IGNORED on selection) without ever calling or altering perCellVetoOk.
//
// Mechanism (all deterministic given the injected rng → serialised into the checkpoint, like map-elites):
//   1. census the archive's lethal cells (scorecard.cells, keyed epic::bucket::name) — the SAME mechanical
//      channel the veto reads; never the mutator digest, never shown to a model.
//   2. for each lethal cell that ANY elite passes, the SPECIALIST = the elite that passes it and is Pareto-
//      strongest (reliability desc, cost asc, hash asc for a total deterministic order). Collect the distinct
//      specialist set (one genome can specialise many cells).
//   3. draw μ distinct parents: shuffle the specialist set with the injected rng (so the order among equally-
//      eligible specialists is reproducible but not positionally biased), then — if still short of μ — pad
//      from the rest of the archive (μ-best order), then pad from the candidate pool (μ-best order), exactly
//      like map-elites.makeCelledSelect handles a thin archive.
// Returns loop-shaped entries { genome, sc }.
// ----------------------------------------------------------------------------------------------------------

const isLethalCellKey = (k) => LETHAL_BUCKETS.includes(k.split('::')[1]);

// strict, total, deterministic Pareto-ish strength order: reliability desc, cost asc, hash asc.
function strongerFirst(a, b) {
  const ra = a.scorecard.reliability, rb = b.scorecard.reliability;
  if (rb !== ra) return rb - ra;
  const ca = a.scorecard.cost.total, cb = b.scorecard.cost.total;
  if (ca !== cb) return ca - cb;
  return a.hash < b.hash ? -1 : (a.hash > b.hash ? 1 : 0);
}

// the distinct specialists: for each lethal cell some elite passes, the strongest passing elite.
function lethalSpecialists(elites) {
  const cellToBest = new Map(); // cellKey -> elite
  for (const e of elites) {
    const cells = (e.scorecard && e.scorecard.cells) || {};
    for (const k of Object.keys(cells)) {
      if (!isLethalCellKey(k)) continue;
      if (cells[k] !== true) continue;             // only a PASS makes an elite a specialist for that cell
      const cur = cellToBest.get(k);
      if (!cur || strongerFirst(e, cur) < 0) cellToBest.set(k, e);
    }
  }
  // distinct elites (a genome may specialise several cells), in a stable order by strength for determinism
  const seen = new Set(); const out = [];
  for (const e of Array.from(cellToBest.values()).sort(strongerFirst)) {
    if (seen.has(e.hash)) continue; seen.add(e.hash); out.push(e);
  }
  return out;
}

// μ-best order over loop-shaped {genome, sc} entries (reliability desc, cost asc) — the pad order, matching
// map-elites.padFromPool / loop.topMu.
function muBestSortedPool(pool) {
  return (pool || []).slice().sort((a, b) => (b.sc.reliability - a.sc.reliability) || (a.sc.cost.total - b.sc.cost.total));
}

function pareto_per_cell(archive, pool, rng, mu) {
  const elites = ((archive && archive.members) || []).slice();
  const chosen = []; const used = new Set();
  const take = (genome, sc) => {
    const h = sc && sc.genomeHash;
    if (h == null || used.has(h)) return;
    used.add(h); chosen.push({ genome, sc });
  };

  // 1+2. lethal-cell specialists, drawn first (shuffled deterministically so the order among them is unbiased
  //      but reproducible under the injected rng — the ONLY rng consumption in this strategy).
  const specialists = lethalSpecialists(elites);
  for (const e of rng.shuffle(specialists)) {
    if (chosen.length >= mu) break;
    take(e.genome, e.scorecard);
  }

  // 3a. pad from the rest of the archive elites (μ-best order over the elites themselves).
  if (chosen.length < mu) {
    const eliteAsPool = elites.map((e) => ({ genome: e.genome, sc: e.scorecard }));
    for (const e of muBestSortedPool(eliteAsPool)) {
      if (chosen.length >= mu) break;
      take(e.genome, e.sc);
    }
  }

  // 3b. pad from the candidate pool (μ-best order), like map-elites.makeCelledSelect when the archive is thin.
  if (chosen.length < mu) {
    for (const e of muBestSortedPool(pool)) {
      if (chosen.length >= mu) break;
      take(e.genome, e.sc);
    }
  }

  return chosen;
}

// ----------------------------------------------------------------------------------------------------------
// The registry. Keys are EXACTLY the frozen ablation set. Each value is a loop-shaped selectParents function.
// ----------------------------------------------------------------------------------------------------------
export const STRATEGIES = Object.freeze({
  mu_best,           // the frozen default — bit-identical to loop.mjs's internal hook-absent path
  pareto_per_cell,   // per-cell-specialist SELECTION (analog of evo pareto_per_task); NOT the insertion veto
});

// getStrategy(name) — resolve a registered strategy. Admits ONLY a name in the frozen ablation set; an
// unknown name (including a stochastic strategy that is deliberately absent) throws, so policy-shopping
// outside the frozen set is impossible by construction.
export function getStrategy(name) {
  if (!FROZEN_ABLATION_SET.includes(name)) {
    throw new Error(`strategy-registry: "${name}" is not in the frozen ablation set {${FROZEN_ABLATION_SET.join(', ')}} (stochastic strategies are deliberately excluded — RNG confound)`);
  }
  return STRATEGIES[name];
}

// Exported for the bit-identical proof gate (assert the registry's mu_best === the mirrored topMu logic).
export { topMu as _topMu, lethalSpecialists as _lethalSpecialists };
