// Strategy: EXPAND/AUDIT graph loop (CHARTER §5.1 hypothesis — determinism + bounded judgment).
//
// A DETERMINISTIC loop around a bounded judgment step:
//
//   for iter in 0..MAX:
//     invoke -> expand/add packets (given the plan + the current graph + the audit feedback)
//     run the AUDIT over the current graph and feed its gaps into the next expand prompt
//
// The loop / control-flow / invariant checks are DETERMINISTIC CODE. Only the expand step (and,
// for the generative-audit variant, one bounded audit invoke per iteration) is a model invoke.
// agents = number of invokes performed. outputTokens / usd summed across them.
//
// THE DE-CONFOUNDED A/B/C (FINDINGS §6.2). The L1 sweep conflated "audit signal" with
// "iteration count": audit-ON stopped at a STRUCTURAL fixpoint while half the latent work was
// still missing (structural completeness ≠ generative completeness, CHARTER §8), so audit-OFF
// simply out-iterated it. Fixed by making EVERY variant perform the SAME number of expand
// invokes (EXPAND_BUDGET — no fixpoint short-circuit) so the ONLY difference is the FEEDBACK
// SIGNAL fed to the next expand pass:
//
//   auditMode 'structural'  PURE Tier-0 invariants over the graph (acyclicity, orphans,
//                           readiness) — free, deterministic, but blind to missing latent work.
//   auditMode 'generative'  ONE bounded model invoke per iteration reads the PLAN + the current
//                           decomposition and names the latent work still missing. Sees ONLY the
//                           plan the method was given — NEVER the oracle manifest. Costs an
//                           invoke; directly tests "does an audit catch missed latent work?".
//   auditMode 'off'         no audit, no feedback — blind re-expansion (the control).
//
// The early-stop-at-fixpoint economy that L1's audit-ON exhibited is a STOPPING RULE, not an
// audit signal; it is deliberately removed here and belongs to the granularity/stopping-policy
// experiments (docs/RESEARCH-PROGRAM.md) as its own manipulated variable.

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
// EVERY variant performs exactly this many expand invokes (the equal-budget control).
const EXPAND_BUDGET = 3;

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

// ---- the GENERATIVE audit (one bounded invoke; sees ONLY the plan, never the oracle) -------

const GEN_AUDIT_SYSTEM =
  'You are a meticulous completeness auditor. You are given a PLAN and the CURRENT decomposition ' +
  'of that plan into build packets. Name the LATENT work a real build of this plan would need ' +
  'that NO current packet covers — missing packets, and missing dependency edges between the ' +
  'packets that DO exist. Be specific and actionable; do not restate covered work. ' +
  'Output ONLY a JSON object: {"gaps": ["<one specific missing packet or edge per entry>"]}.';

/** Parse the generative-audit reply into a string[] of gaps. Defensive; never throws. */
export function parseGapList(text) {
  if (typeof text !== 'string') return [];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return [];
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (obj && Array.isArray(obj.gaps)) {
      return obj.gaps.filter((g) => typeof g === 'string' && g.trim()).slice(0, 30);
    }
  } catch { /* fall through */ }
  return [];
}

/**
 * Build an EXPAND/AUDIT strategy parameterized on the FEEDBACK SIGNAL (see header comment).
 *
 * EQUAL-BUDGET CONTROL: every variant performs exactly EXPAND_BUDGET expand invokes — no
 * fixpoint short-circuit — so the A/B/C isolates the feedback signal, never the iteration
 * count. 'generative' additionally performs one bounded audit invoke between expands (billed:
 * agents/tokens/usd all count).
 *
 * MODEL KNOB: the run reads `ctx.model` when present and falls back to the pinned MODEL.
 * The generative audit runs on the SAME swept model (it is part of the method under test —
 * unlike the scoring judge, which is held fixed elsewhere and never read from ctx here).
 *
 * @param {{ name?: string, auditMode?: 'structural'|'generative'|'off'|'on' }} [opts]
 * @returns {import('../adapter.mjs').Strategy}
 */
export function makeExpandAudit({ name = 'expand-audit', auditMode = 'structural' } = {}) {
  if (auditMode === 'on') auditMode = 'structural'; // back-compat alias
  if (!['structural', 'generative', 'off'].includes(auditMode)) {
    throw new Error(`makeExpandAudit: auditMode must be 'structural', 'generative' or 'off', got ${auditMode}`);
  }

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

      const bill = (res) => {
        agents++;
        if (Number.isFinite(res.outputTokens)) outputTokens += res.outputTokens;
        if (res.usd !== null && Number.isFinite(res.usd)) { usd += res.usd; usdKnown = true; }
      };

      let snapshot = { beads: [], edges: [], ready: [] };
      let lastGaps = []; // the feedback fed into the NEXT expand (mode-dependent)
      let gapsLabel = 'GAPS TO FIX';

      for (let iter = 0; iter < EXPAND_BUDGET; iter++) {
        const isFirst = iter === 0;
        const feedback = !isFirst && lastGaps.length
          ? [`${gapsLabel}:`, lastGaps.map((g) => `  - ${g}`).join('\n'), ''].join('\n')
          : '';
        const prompt = isFirst
          ? [
              'Decompose the following THIN plan into the FULL set of atomic build packets.',
              'Enumerate the LATENT work the plan never spells out, not just its stated outcomes.',
              '',
              planText,
              '',
              contract,
            ].join('\n')
          : [
              'Here is the CURRENT decomposition. Return the COMPLETE updated decomposition',
              '(keep good packets, add/repair to close any listed gaps, and add any latent',
              'packets still missing).',
              '',
              'CURRENT DECOMPOSITION:',
              digest(snapshot),
              '',
              feedback,
              planText,
              '',
              contract,
            ].filter((s) => s !== '').join('\n');

        const res = await ctx.invoke({
          prompt,
          system: JSON_ONLY_SYSTEM,
          model,
          maxTurns: 1,
          role: `${name}:iter${iter}`,
          fixtureName: fixture.name,
          signal: ctx.signal,
        });
        bill(res);

        const next = parseSnapshot(res.text);
        // Never regress: keep the richer graph if an iteration returns fewer packets.
        snapshot = next.beads.length >= snapshot.beads.length ? next : snapshot;

        // Produce the feedback for the NEXT expand. The last iteration's audit would feed
        // nothing, so skip it (saves an invoke in 'generative'; harmless in 'structural').
        if (iter === EXPAND_BUDGET - 1 || auditMode === 'off') continue;

        if (auditMode === 'structural') {
          const audit = auditStructure(snapshot);
          // NO fixpoint stop (equal-budget control): a clean audit just means no feedback.
          lastGaps = audit.hasGaps ? audit.gaps : [];
          gapsLabel = 'STRUCTURAL GAPS a deterministic audit found — FIX THESE';
        } else {
          const auditRes = await ctx.invoke({
            prompt: [
              planText,
              '',
              'CURRENT DECOMPOSITION:',
              digest(snapshot),
              '',
              'Name the latent work still missing. Answer with the JSON object only.',
            ].join('\n'),
            system: GEN_AUDIT_SYSTEM,
            model,
            maxTurns: 1,
            role: `${name}:audit${iter}`,
            fixtureName: fixture.name,
            signal: ctx.signal,
          });
          bill(auditRes);
          lastGaps = parseGapList(auditRes.text);
          gapsLabel = 'LATENT GAPS an auditor found — COVER THESE';
        }
      }

      const wallClockSec = Number(process.hrtime.bigint() - start) / 1e9;
      return {
        snapshot,
        cost: {
          outputTokens,
          agents, // = number of invokes performed (expands + generative audits)
          wallClockSec,
          usd: usdKnown ? usd : null,
          model,
          effort: EFFORT,
        },
      };
    },
  };
}

/** Back-compat default export: the structural-audit variant under the original name. */
export default makeExpandAudit({ name: 'expand-audit', auditMode: 'structural' });

/** The CONTROL variant (no audit signal, blind re-expansion, same expand budget). */
export const expandAuditNoAudit = makeExpandAudit({ name: 'expand-audit-noaudit', auditMode: 'off' });

/** The GENERATIVE-audit variant — "does a model audit catch missed latent work?" (FINDINGS §6.2). */
export const expandAuditGen = makeExpandAudit({ name: 'expand-audit-gen', auditMode: 'generative' });
