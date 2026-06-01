// Strategy: EXPAND/AUDIT graph loop (CHARTER §5.1 hypothesis — determinism + bounded judgment).
//
// A DETERMINISTIC loop around a bounded judgment step:
//
//   for iter in 0..MAX:
//     invoke -> expand/add packets (given the plan + the current graph + the structural gaps)
//     run PURE Tier-0 structural invariants over the current graph (acyclicity, orphans,
//       readiness) using the canonical graph helpers
//     if no structural gaps  -> FIXPOINT, stop
//     else feed the gaps into the next invoke's prompt
//
// The loop / control-flow / invariant checks are DETERMINISTIC CODE. Only the expand step is
// a model invoke. agents = number of invokes performed. outputTokens / usd summed across them.
//
// NB: the structural invariants can only flag problems with what EXISTS (a cycle, an orphan, a
// thin bead) — they CANNOT invent a missing latent requirement (CHARTER §8). The expand invoke
// is where generative judgment adds the latent packets; the audit only keeps the graph honest
// and tells the next expand pass what to fix.

import { buildIndex, nonEpicBeads, transitiveDeps } from '../../eval/graph/build-graph.mjs';
import { parseSnapshot } from '../parse-snapshot.mjs';
import {
  JSON_ONLY_SYSTEM,
  snapshotContract,
  renderThinPlan,
  statedOutcomeIds,
} from '../prompt-contract.mjs';

// Pinned default model. The strategy reads ctx.model when the runner threads one
// (the sweep knob) and falls back to this. The judge's model is held fixed SEPARATELY
// (it is never read from ctx.model here). The next phase threads the SAME `ctx.model ?? <pin>`
// pattern through single-session and swarm.
const MODEL = 'claude-sonnet-4-6';
const EFFORT = 'medium';
const MAX_ITERS = 3;

// ---- PURE Tier-0 structural invariants over the current graph --------------

/** Detect a dependency cycle (depsOf adjacency, DFS with colour marks). Returns [] or the cycle ids. */
function findCycle(index) {
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map();
  for (const b of index.beads) color.set(b.id, WHITE);
  const stack = [];
  let cycle = null;

  const visit = (id) => {
    color.set(id, GREY);
    stack.push(id);
    for (const dep of index.depsOf.get(id) || []) {
      if (!color.has(dep)) continue;
      if (color.get(dep) === GREY) {
        const at = stack.indexOf(dep);
        cycle = stack.slice(at >= 0 ? at : 0).concat(dep);
        return true;
      }
      if (color.get(dep) === WHITE && visit(dep)) return true;
    }
    stack.pop();
    color.set(id, BLACK);
    return false;
  };

  for (const b of index.beads) {
    if (color.get(b.id) === WHITE && visit(b.id)) break;
  }
  return cycle || [];
}

/** A bead is mechanically build-ready iff 1..6 ACs, >=1 file, >=1 test case. */
function readinessGaps(b) {
  const md = b.metadata || {};
  const acs = md.acceptanceCriteria || [];
  const files = md.filesTouched || [];
  const cases = md.testPlanCases || [];
  const gaps = [];
  if (!(acs.length >= 1 && acs.length <= 6)) gaps.push(acs.length > 6 ? `${acs.length} ACs (>6, not atomic)` : 'no acceptanceCriteria');
  if (files.length < 1) gaps.push('no filesTouched');
  if (cases.length < 1 && !md.testPlanFile) gaps.push('no testPlanCases');
  return gaps;
}

/**
 * Run the structural invariants over a snapshot. PURE.
 * @returns {{ gaps: string[], hasGaps: boolean }}
 */
export function auditStructure(snapshot) {
  const index = buildIndex(snapshot);
  const beads = nonEpicBeads(index);
  const gaps = [];

  if (!beads.length) {
    gaps.push('no build packets exist yet — emit the atomic decomposition');
    return { gaps, hasGaps: true };
  }

  // acyclicity
  const cycle = findCycle(index);
  if (cycle.length) gaps.push(`dependency cycle: ${cycle.join(' -> ')} — break it`);

  // orphans: a non-epic bead with NO incoming and NO outgoing dependency edge.
  const hasOutgoing = new Set();
  const hasIncoming = new Set();
  for (const e of snapshot.edges || []) { hasOutgoing.add(e.from); hasIncoming.add(e.to); }
  if (beads.length > 1) {
    for (const b of beads) {
      if (!hasOutgoing.has(b.id) && !hasIncoming.has(b.id)) {
        gaps.push(`orphan packet '${b.id}' has no dependency edges — wire its blockers/dependents`);
      }
    }
  }

  // readiness: each bead must carry the build-agent payload.
  for (const b of beads) {
    const rg = readinessGaps(b);
    if (rg.length) gaps.push(`packet '${b.id}': ${rg.join('; ')}`);
  }

  // dangling: an edge endpoint with no bead (parse already drops these, but assert).
  const ids = new Set(beads.map((b) => b.id));
  for (const e of snapshot.edges || []) {
    if (!ids.has(e.from) || !ids.has(e.to)) gaps.push(`edge ${e.from}->${e.to} references a non-existent packet`);
  }

  return { gaps, hasGaps: gaps.length > 0 };
}

function digest(snapshot) {
  const index = buildIndex(snapshot);
  const lines = nonEpicBeads(index).map(
    (b) => `  - ${b.id}: ${b.title} [outcomes: ${(b.metadata?.provenance?.outcomeIds || []).join(',')}]`,
  );
  const edges = (snapshot.edges || []).map((e) => `  - ${e.from} -> ${e.to}`);
  return `PACKETS:\n${lines.join('\n') || '  (none)'}\nEDGES:\n${edges.join('\n') || '  (none)'}`;
}

/**
 * Build an EXPAND/AUDIT strategy parameterized on the structural-audit feedback signal.
 *
 * This is the ±structural-audit A/B (the human's "does a graph/audit catch missed edges?"
 * question), registered as two sweepable variants:
 *
 *   - auditMode:'on'  (default) — each iter: invoke -> PURE Tier-0 auditStructure over the
 *     current graph -> feed the structural gaps into the next prompt -> stop at fixpoint/max.
 *   - auditMode:'off' (the CONTROL) — SAME iteration budget (MAX_ITERS) and SAME expand
 *     prompts, but the structural audit NEVER runs and structural gaps are NEVER fed back.
 *     Each pass re-expands "blind" (told the current decomposition but no audit signal), so
 *     the A/B isolates whether the structural-audit signal actually improves coverage.
 *     There is no fixpoint short-circuit (no audit -> no fixpoint), so the control burns the
 *     full budget; audit-on can stop early at a fixpoint => audit-on performs <= as many
 *     invokes as audit-off given the same canned outputs.
 *
 * MODEL KNOB: the run reads `ctx.model` when present and falls back to the pinned MODEL.
 * The chosen model is passed to every ctx.invoke and recorded on the cost record. The judge's
 * model is held fixed elsewhere and is NOT read from ctx.model here.
 *
 * @param {{ name?: string, auditMode?: 'on'|'off' }} [opts]
 * @returns {import('../adapter.mjs').Strategy}
 */
export function makeExpandAudit({ name = 'expand-audit', auditMode = 'on' } = {}) {
  if (auditMode !== 'on' && auditMode !== 'off') {
    throw new Error(`makeExpandAudit: auditMode must be 'on' or 'off', got ${auditMode}`);
  }
  const auditOn = auditMode === 'on';

  return {
    name,
    deterministic: false,
    model: MODEL,
    effort: EFFORT,
    auditMode,

    async run(fixture, ctx) {
      if (!ctx || typeof ctx.invoke !== 'function') {
        throw new Error(`${name}.run: ctx.invoke is required`);
      }
      // MODEL KNOB: sweep value from ctx.model, else the pinned default.
      const model = ctx.model ?? MODEL;
      const start = process.hrtime.bigint();
      const outcomeIds = statedOutcomeIds(fixture);
      const planText = renderThinPlan(fixture);
      const contract = snapshotContract(outcomeIds);

      let outputTokens = 0;
      let usd = 0;
      let usdKnown = false;
      let agents = 0;

      let snapshot = { beads: [], edges: [], ready: [] };
      let lastGaps = [];

      for (let iter = 0; iter < MAX_ITERS; iter++) {
        const isFirst = iter === 0;
        // audit-off iterations re-expand without any structural-gap feedback (blind re-expand);
        // audit-on iterations get the prior pass's structural gaps to repair.
        const prompt = isFirst
          ? [
              'Decompose the following THIN plan into the FULL set of atomic build packets.',
              'Enumerate the LATENT work the plan never spells out, not just its stated outcomes.',
              '',
              planText,
              '',
              contract,
            ].join('\n')
          : auditOn
          ? [
              'Here is the CURRENT decomposition and the STRUCTURAL GAPS a deterministic audit found.',
              'Return the COMPLETE updated decomposition (keep good packets, add/repair to close the gaps,',
              'and add any latent packets still missing).',
              '',
              'CURRENT DECOMPOSITION:',
              digest(snapshot),
              '',
              'STRUCTURAL GAPS TO FIX:',
              lastGaps.map((g) => `  - ${g}`).join('\n'),
              '',
              planText,
              '',
              contract,
            ].join('\n')
          : [
              'Here is the CURRENT decomposition. Return the COMPLETE updated decomposition',
              '(keep good packets, and add any latent packets still missing).',
              '',
              'CURRENT DECOMPOSITION:',
              digest(snapshot),
              '',
              planText,
              '',
              contract,
            ].join('\n');

        const res = await ctx.invoke({
          prompt,
          system: JSON_ONLY_SYSTEM,
          model,
          maxTurns: 1,
          role: `${name}:iter${iter}`,
          fixtureName: fixture.name,
          signal: ctx.signal,
        });
        agents++;
        if (Number.isFinite(res.outputTokens)) outputTokens += res.outputTokens;
        if (res.usd !== null && Number.isFinite(res.usd)) { usd += res.usd; usdKnown = true; }

        const next = parseSnapshot(res.text);
        // Never regress: keep the richer graph if an iteration returns fewer packets.
        snapshot = next.beads.length >= snapshot.beads.length ? next : snapshot;

        // CONTROL: audit-off never runs the structural audit and never feeds gaps back.
        if (!auditOn) continue;

        const audit = auditStructure(snapshot);
        if (!audit.hasGaps) break; // FIXPOINT
        lastGaps = audit.gaps;
      }

      const wallClockSec = Number(process.hrtime.bigint() - start) / 1e9;
      return {
        snapshot,
        cost: {
          outputTokens,
          agents, // = number of expand invokes performed
          wallClockSec,
          usd: usdKnown ? usd : null,
          model,
          effort: EFFORT,
        },
      };
    },
  };
}

/** Back-compat default export: the audit-on variant under the original name. */
export default makeExpandAudit({ name: 'expand-audit', auditMode: 'on' });

/** The CONTROL variant for the ±structural-audit A/B (no audit signal). */
export const expandAuditNoAudit = makeExpandAudit({ name: 'expand-audit-noaudit', auditMode: 'off' });
