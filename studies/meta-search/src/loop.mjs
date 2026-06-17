// The search loop — the dispatch (DESIGN §4), mirroring /build-batch one level up.
//
// Per generation: select parents (from the working population) → mutate (reflective proposer +
// typed-random; the proposer sees only the quadrant digest) → dispatch K children as evals → insert
// survivors into the ARCHIVE (per-cell veto vs the co-measured baseline + Pareto) → update the working
// population → checkpoint → check stop (found / eval-budget / converged / max-gen).
//
// Two structures, on purpose:
//   - the ARCHIVE is the veto-passing Pareto record (DESIGN §4 — the deliverable / the WIN front). Over a
//     uniform-cost axis (cheap genomes are ~free) the Pareto front degenerates to a single point, so it
//     must NOT also be the breeding pool, or exploration starves.
//   - the working POPULATION (μ-best by reliability, tie-break cost) is the breeding pool — it preserves
//     the gene diversity the search needs to assemble a multi-gene optimum. (Celled MAP-Elites is the P2
//     replacement for this; at P1 a μ-best population is the flat-archive analog.)
//
// Determinism (load-bearing for §14.1): ALL randomness flows through the single injected `rng`; its state
// is serialized into each checkpoint, so resume replays bit-for-bit when the evaluator is deterministic
// (synthetic backend). Live gateway runs are crash-safe-to-the-generation only — the §14.1 contract.

import { mutate } from './operators.mjs';
import { evalGenome } from './worker.mjs';
import { genomeHash, cloneGenome } from './genome.mjs';

const frontKey = (archive) => archive.front().map((m) => `${m.hash}:${m.cost.toFixed(6)}:${m.reliability.toFixed(6)}`).join('|');

// μ-best distinct genomes by (reliability desc, cost asc) — the breeding pool.
function topMu(entries, mu) {
  const seen = new Set(); const out = [];
  const sorted = entries.slice().sort((a, b) => (b.sc.reliability - a.sc.reliability) || (a.sc.cost.total - b.sc.cost.total));
  for (const e of sorted) { if (seen.has(e.sc.genomeHash)) continue; seen.add(e.sc.genomeHash); out.push(e); if (out.length >= mu) break; }
  return out;
}

export async function runSearch(p) {
  const {
    seedGenomes, evaluate, baseline, rng, archive, budget,
    childrenPerParent = 3, populationSize = 8, proposer = null, stopWhen = null, convergeGens = Infinity,
    checkpoint = null, watchdog = null, onGeneration = null, resumeState = null,
  } = p;
  const baselineHash = baseline ? baseline.genomeHash : null;
  const worker = (genome) => evalGenome(genome, { evaluate, baselineHash });
  const guard = watchdog ? (fn) => watchdog.guardEval(fn) : (fn) => fn();

  let gen, evalCount, population, staleGens, lastFront, haltReason = null, found = false;

  function snapshot() {
    return {
      gen, evalCount, rngState: rng.state(), staleGens, lastFront,
      archive: archive.snapshot(),
      population: population.map((e) => ({ genome: e.genome, sc: e.sc })),
      budget, baselineHash,
    };
  }
  function result() { return { archive, gen, evalCount, found, haltReason, front: archive.front() }; }

  if (resumeState) {
    rng.setState(resumeState.rngState);
    archive.restore(resumeState.archive);
    gen = resumeState.gen; evalCount = resumeState.evalCount;
    population = resumeState.population.map((e) => ({ genome: cloneGenome(e.genome), sc: e.sc }));
    staleGens = resumeState.staleGens; lastFront = resumeState.lastFront;
  } else {
    gen = 0; evalCount = 0; staleGens = 0; lastFront = '';
    // Generation 0: evaluate the seed population; seed the archive (veto applies); seed the breeding pool.
    population = [];
    let g0trip = null;
    try {
      for (const g of seedGenomes) {
        const sc = await guard(() => worker(g)); evalCount++;
        archive.insert(sc, g, baseline);
        population.push({ genome: cloneGenome(g), sc });
      }
    } catch (e) { if (e && e.__watchdogTrip) g0trip = e; else throw e; }
    population = topMu(population, populationSize);
    lastFront = frontKey(archive);
    if (checkpoint) checkpoint.save(snapshot());
    if (onGeneration) onGeneration({ gen, evalCount, archiveSize: archive.size(), front: lastFront, diversity: archive.diversity(), bestReliability: bestRel(), trip: !!g0trip });
    if (g0trip) { haltReason = `watchdog:${g0trip.kind}`; return result(); }
    if (stopWhen && stopWhen(archive, { gen, evalCount })) { found = true; return result(); }
  }

  function bestRel() { return archive.size() ? Math.max(...archive.members.map((m) => m.reliability)) : 0; }

  while (gen < budget.maxGen) {
    if (evalCount >= budget.maxEvals) { haltReason = 'eval-budget'; break; }
    gen++;
    if (watchdog) watchdog.startGeneration(gen);

    const children = [];
    let trip = null;
    try {
      for (const parent of population) {
        const pdigest = parent.sc.digest || null; // mutator channel ONLY (never parent.sc.cells)
        for (let c = 0; c < childrenPerParent; c++) {
          if (evalCount >= budget.maxEvals) { haltReason = 'eval-budget'; break; }
          const { child } = mutate(parent.genome, rng, { proposer, digest: pdigest });
          const sc = await guard(() => worker(child)); evalCount++;
          archive.insert(sc, child, baseline);
          children.push({ genome: cloneGenome(child), sc });
        }
        if (haltReason) break;
      }
    } catch (e) { if (e && e.__watchdogTrip) trip = e; else throw e; }

    // update the breeding pool: μ-best of (population ∪ children)
    population = topMu(population.concat(children), populationSize);

    if (watchdog && !trip) { try { watchdog.endGeneration(gen); } catch (e) { if (e && e.__watchdogTrip) trip = e; else throw e; } }
    if (checkpoint) checkpoint.save(snapshot());
    if (onGeneration) onGeneration({ gen, evalCount, archiveSize: archive.size(), front: frontKey(archive), diversity: archive.diversity(), bestReliability: bestRel(), trip: !!trip });

    if (trip) { haltReason = `watchdog:${trip.kind}`; break; }
    if (stopWhen && stopWhen(archive, { gen, evalCount })) { found = true; break; }

    const fk = frontKey(archive);
    if (fk === lastFront) { staleGens++; if (staleGens >= convergeGens) { haltReason = 'converged'; break; } }
    else { staleGens = 0; lastFront = fk; }
    if (haltReason) break;
  }
  if (!haltReason && !found && gen >= budget.maxGen) haltReason = 'max-gen';
  return result();
}
