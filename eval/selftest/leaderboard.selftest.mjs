// Pins the Pareto-frontier math (and the fidelity composite's null-recall handling)
// against a hand-built point set. Must pass before the leaderboard is trusted (CHARTER §6.4).

import assert from 'node:assert/strict';
import { paretoFrontier, fidelityComposite, buildLeaderboard, renderLeaderboard, FIDELITY_WEIGHTS, THIN_FIDELITY_WEIGHTS } from '../../runner/leaderboard.mjs';

const AXES = [
  { key: 'fidelity', dir: 'max' },
  { key: 'reliability', dir: 'max' },
  { key: 'cost', dir: 'min' },
  { key: 'efficiency', dir: 'min' },
];

export function run() {
  let assertions = 0;
  const A = (cond, msg) => { assert.ok(cond, msg); assertions++; };
  const E = (a, b, msg) => { assert.equal(a, b, msg); assertions++; };

  // (1) A clearly dominated point is excluded; its dominator is included.
  // P0 dominates P1 on every axis (better fidelity/reliability, lower cost/efficiency).
  {
    const pts = [
      { id: 'P0', fidelity: 0.9, reliability: 1.0, cost: 100, efficiency: 1 },
      { id: 'P1', fidelity: 0.5, reliability: 0.8, cost: 500, efficiency: 5 },
    ];
    const front = paretoFrontier(pts, AXES);
    E(front[0], true, 'dominator P0 is on the frontier');
    E(front[1], false, 'dominated P1 is excluded');
  }

  // (2) A point that WINS on one axis while TYING the rest is on the frontier and
  // DOMINATES its twin (the twin ties everything but is worse on that one axis).
  {
    const pts = [
      { id: 'cheap', fidelity: 0.8, reliability: 0.9, cost: 10, efficiency: 2 },  // wins cost, ties rest
      { id: 'pricey', fidelity: 0.8, reliability: 0.9, cost: 50, efficiency: 2 }, // ties all but cost -> dominated
    ];
    const front = paretoFrontier(pts, AXES);
    E(front[0], true, 'wins-on-one-axis-ties-the-rest point is on the frontier');
    E(front[1], false, 'twin that is worse on one axis and ties the rest is dominated');
  }

  // (3) Two EQUAL points: neither strictly dominates the other -> both on frontier.
  {
    const pts = [
      { id: 'x', fidelity: 0.7, reliability: 0.7, cost: 200, efficiency: 3 },
      { id: 'y', fidelity: 0.7, reliability: 0.7, cost: 200, efficiency: 3 },
    ];
    const front = paretoFrontier(pts, AXES);
    E(front[0], true, 'equal point x on frontier (no strict domination)');
    E(front[1], true, 'equal point y on frontier (no strict domination)');
  }

  // (4) A non-trivial trade-off set: a high-fidelity-but-pricey point and a
  // cheap-but-lower-fidelity point are BOTH on the frontier; a strictly worse
  // middle point is off it.
  {
    const pts = [
      { id: 'expensive', fidelity: 1.0, reliability: 1.0, cost: 900, efficiency: 9 },
      { id: 'budget', fidelity: 0.6, reliability: 1.0, cost: 50, efficiency: 1 },
      { id: 'loser', fidelity: 0.6, reliability: 0.9, cost: 100, efficiency: 2 }, // dominated by budget
    ];
    const front = paretoFrontier(pts, AXES);
    E(front[0], true, 'expensive-but-best-fidelity is on the frontier');
    E(front[1], true, 'budget-but-cheapest is on the frontier');
    E(front[2], false, 'strictly-worse middle point is off the frontier');
  }

  // (5) fidelity composite: null recall is NOT scored 0 — it is dropped and the
  // remaining weights renormalize. A perfect-on-the-applicable-signals run -> 1.0.
  {
    const c = fidelityComposite({ fidelity: 100, buildComplete: true, recall: null });
    E(round(c), 1, 'null recall dropped: perfect fidelity+buildComplete -> composite 1.0');
    // and recall=0 must score strictly LOWER than recall=null for the same other signals
    const withZero = fidelityComposite({ fidelity: 100, buildComplete: true, recall: 0 });
    A(withZero < c, 'recall=0 penalizes; recall=null does not');
    // explicit renormalized value: only fidelity(0.5)+buildComplete(0.4) present -> /0.9
    const expected = (FIDELITY_WEIGHTS.fidelity * 1 + FIDELITY_WEIGHTS.buildComplete * 1) /
      (FIDELITY_WEIGHTS.fidelity + FIDELITY_WEIGHTS.buildComplete);
    E(round(expected), 1, 'renormalization denominator is the present-weight sum');
  }

  // (6) buildLeaderboard end-to-end on synthetic scorecards: the deterministic-style
  // expander outranks and is on the frontier vs a flat control with lower fidelity,
  // equal cost & efficiency.
  {
    const mk = (strategy, fidelity, bc, tokens, agents, sec) => ({
      strategy, fixture: 'syn', fixtureHash: 'h', repeat: 0,
      axes: {
        fidelity,
        buildCompleteness: { buildComplete: bc, edgeCoverage: bc ? 1 : 0, beadPresence: 1, buildReadiness: bc ? 1 : 0.3 },
        catchRate: { recall: null, falsePositives: 0 },
      },
      cost: { outputTokens: tokens, agents, wallClockSec: sec },
    });
    const cards = [
      mk('expander', 100, true, 0, 0, 0.001),
      mk('control', 82, false, 0, 0, 0.001),
    ];
    const board = buildLeaderboard(cards);
    const exp = board.strategies.find((s) => s.strategy === 'expander');
    const ctl = board.strategies.find((s) => s.strategy === 'control');
    A(exp.fidelity > ctl.fidelity, 'expander fidelity composite > control');
    A(exp.cost === ctl.cost, 'equal cost (both 0 tokens, 0 agents)');
    A(exp.efficiency === ctl.efficiency, 'equal efficiency (equal wall-clock)');
    E(exp.onFrontier, true, 'expander is on the Pareto frontier');
    A(exp.rank <= ctl.rank, 'expander outranks (or ties) the flat control');
    A(exp.rank === 1, 'expander is the top-ranked composite');
  }

  // (7) THIN-fixture fidelity composite leans on generativeCoverage (the GENERATIVE leap) and now
  // ALSO folds in buildComplete (re-admitted this phase: the keystone fold makes buildComplete
  // semantic/meaningful on thin). A generative method that reaches the latent set (high genCov)
  // must still score HIGHER than a deterministic pour that is structurally fine but covers none of
  // the latent set (genCov 0) — the OPPOSITE of the thick result. That is the whole point.
  {
    const gen = fidelityComposite({ fidelity: 90, buildComplete: true, recall: null, generativeCoverage: 1.0, thin: true });
    const det = fidelityComposite({ fidelity: 38, buildComplete: false, recall: null, generativeCoverage: 0.0, thin: true });
    A(gen > det, 'THIN: high-genCov build-complete generative method outscores zero-genCov deterministic pour');
    // explicit value: genCov(0.5)*1 + buildComplete(0.3)*1 + fidelity(0.1)*0.9, renormalized over
    // the present weight sum (recall n/a => dropped).
    const wsum = THIN_FIDELITY_WEIGHTS.generativeCoverage + THIN_FIDELITY_WEIGHTS.buildComplete + THIN_FIDELITY_WEIGHTS.fidelity;
    const expected = (THIN_FIDELITY_WEIGHTS.generativeCoverage * 1.0 +
      THIN_FIDELITY_WEIGHTS.buildComplete * 1 +
      THIN_FIDELITY_WEIGHTS.fidelity * 0.9) / wsum;
    E(round(gen), round(expected), 'THIN blend = genCov*0.5 + buildComplete*0.3 + fidelity*0.1, renormalized (recall n/a)');
    // buildComplete now MATTERS on thin (the fold made it real): flipping it MOVES the score down.
    const genNoBC = fidelityComposite({ fidelity: 90, buildComplete: false, recall: null, generativeCoverage: 1.0, thin: true });
    A(genNoBC < gen, 'THIN: buildComplete is re-admitted — flipping it false lowers the score');
    // and the THICK blend for the same numbers is DIFFERENT (buildComplete dominates there at 0.4).
    const thick = fidelityComposite({ fidelity: 90, buildComplete: false, recall: null, generativeCoverage: 1.0, thin: false });
    A(thick < gen, 'THICK blend (buildComplete=false) scores the same run lower than the THIN blend');
  }

  // (8) PRESENCE vs SUFFICIENCY: buildLeaderboard surfaces presence(thin) separately from
  // genCov(thin), and they CAN differ (the live-judge case: a present-but-thin packet lifts
  // presence above sufficiency). The fidelity blend stays on SUFFICIENCY (genCov), so flipping
  // presence ALONE must NOT move the fidelity composite — presence is report-only.
  {
    const mk = (overall, presenceOverall) => ({
      strategy: 'gen', variant: 'gen@m', fixture: 'thin', fixtureHash: 'h', repeat: 0, thin: true,
      axes: {
        fidelity: 80,
        generativeCoverage: {
          requirementCoverage: overall, edgeCoverage: overall, outcomeCoverage: 1, overall,
          presenceRequirement: presenceOverall, presenceEdge: presenceOverall, presenceOverall,
        },
        buildCompleteness: { buildComplete: false, edgeCoverage: overall, beadPresence: overall, buildReadiness: 1 },
        catchRate: { recall: null, falsePositives: 0 },
      },
      cost: { outputTokens: 100, agents: 1, wallClockSec: 1 },
    });
    // sufficiency 0.6, presence 0.9 — a real GAP (the present-but-thin set).
    const board = buildLeaderboard([mk(0.6, 0.9)]);
    const row = board.strategies.find((s) => s.variant === 'gen@m');
    E(round(row.genCovThin, 6), 0.6, 'genCov(thin) reflects SUFFICIENCY overall (0.6)');
    E(round(row.presenceThin, 6), 0.9, 'presence(thin) reflects PRESENCE overall (0.9) — distinct from sufficiency');
    A(row.presenceThin > row.genCovThin, 'presence can exceed sufficiency (the present-but-thin gap)');
    // fidelity composite must NOT depend on presence: same sufficiency, different presence -> equal fidelity.
    const boardSamePresence = buildLeaderboard([mk(0.6, 0.6)]);
    const rowSame = boardSamePresence.strategies.find((s) => s.variant === 'gen@m');
    E(round(row.fidelity, 9), round(rowSame.fidelity, 9), 'fidelity blend stays on SUFFICIENCY — presence does not move it');
    // rendering includes the presence column header.
    const text = renderLeaderboard(board);
    A(text.includes('presence(thin)'), 'leaderboard renders a presence(thin) column');
  }

  return { name: 'leaderboard', assertions };
}

function round(x, d = 6) { const f = 10 ** d; return Math.round(x * f) / f; }

export default run;
