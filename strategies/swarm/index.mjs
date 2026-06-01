// Strategy: agent swarm (the expensive, high-coverage end).
//
// Fan out: ONE invoke per STATED outcome — each decomposes that single outcome into its
// atomic packets. Then ONE final "verifier/integrator" invoke that receives the union of
// all packets and (a) dedupes, (b) wires the cross-packet dependency edges nobody could
// see while working a single outcome in isolation.
//
// agents = (#stated outcomes + 1). outputTokens / usd summed across ALL invokes.
// wallClockSec measured around the whole run with process.hrtime. Stochastic.
//
// The control-flow (which outcomes, how many invokes, the merge) is deterministic CODE;
// only each expand/integrate step is a model invoke.

import { parseSnapshot } from '../parse-snapshot.mjs';
import {
  JSON_ONLY_SYSTEM,
  snapshotContract,
  renderThinPlan,
  statedOutcomeIds,
} from '../prompt-contract.mjs';

const MODEL = 'claude-sonnet-4-6';
const EFFORT = 'high';

/** Merge per-outcome snapshots into one bead set (first id wins) + union of edges. */
function mergeSnapshots(snaps) {
  const beads = [];
  const byId = new Map();
  for (const s of snaps) {
    for (const b of s.beads || []) {
      if (byId.has(b.id)) continue;
      byId.set(b.id, b);
      beads.push(b);
    }
  }
  const ids = new Set(beads.map((b) => b.id));
  const edges = [];
  const edgeSeen = new Set();
  for (const s of snaps) {
    for (const e of s.edges || []) {
      if (!ids.has(e.from) || !ids.has(e.to)) continue;
      const k = `${e.from}->${e.to}`;
      if (edgeSeen.has(k)) continue;
      edgeSeen.add(k);
      edges.push(e);
    }
  }
  return { beads, edges, ids, edgeSeen };
}

/** Compact digest of the merged beads for the integrator prompt. */
function mergedDigest(merged) {
  return merged.beads
    .filter((b) => b.type !== 'epic')
    .map((b) => `  - ${b.id}: ${b.title} [outcomes: ${(b.metadata?.provenance?.outcomeIds || []).join(',')}]`)
    .join('\n');
}

/** @type {import('../adapter.mjs').Strategy} */
export default {
  name: 'swarm',
  deterministic: false,
  model: MODEL,
  effort: EFFORT,

  async run(fixture, ctx) {
    if (!ctx || typeof ctx.invoke !== 'function') {
      throw new Error('swarm.run: ctx.invoke is required');
    }
    const start = process.hrtime.bigint();
    // MODEL KNOB: sweep value from ctx.model, else the pinned default. Passed to every
    // ctx.invoke and recorded on the cost record. The judge's model is held fixed elsewhere.
    const model = ctx.model ?? MODEL;
    const outcomeIds = statedOutcomeIds(fixture);
    const planText = renderThinPlan(fixture);

    let outputTokens = 0;
    let usd = 0;
    let usdKnown = false;
    let agents = 0;

    const accrue = (res) => {
      agents++;
      if (Number.isFinite(res.outputTokens)) outputTokens += res.outputTokens;
      if (res.usd !== null && Number.isFinite(res.usd)) { usd += res.usd; usdKnown = true; }
    };

    // --- fan out: one invoke per stated outcome ---
    const perOutcome = [];
    for (const oid of outcomeIds) {
      const prompt = [
        `Decompose ONLY the work needed to achieve this single stated outcome: ${oid}.`,
        'Emit every atomic build packet that outcome requires (including the latent infrastructure',
        'it depends on, even if other outcomes share it — the integrator will dedupe).',
        '',
        planText,
        '',
        snapshotContract(outcomeIds),
      ].join('\n');

      const res = await ctx.invoke({
        prompt,
        system: JSON_ONLY_SYSTEM,
        model,
        maxTurns: 1,
        role: `swarm:${oid}`,
        fixtureName: fixture.name,
        signal: ctx.signal,
      });
      accrue(res);
      perOutcome.push(parseSnapshot(res.text));
    }

    // --- deterministic merge of the fan-out ---
    const merged = mergeSnapshots(perOutcome);

    // --- final integrator/verifier invoke: dedupe + wire cross-packet edges ---
    const integratePrompt = [
      'You are the integrator/verifier. Below is the UNION of build packets produced by',
      'per-outcome decomposers working in isolation. Produce the final merged decomposition:',
      'keep all distinct packets (drop exact duplicates), and WIRE the cross-packet dependency',
      'edges that no single-outcome worker could see (e.g. a callback handler depends on provider',
      'config; session middleware depends on the session store).',
      '',
      'MERGED PACKETS:',
      mergedDigest(merged) || '  (none)',
      '',
      planText,
      '',
      snapshotContract(outcomeIds),
    ].join('\n');

    const integ = await ctx.invoke({
      prompt: integratePrompt,
      system: JSON_ONLY_SYSTEM,
      model,
      maxTurns: 1,
      role: 'swarm:integrate',
      fixtureName: fixture.name,
      signal: ctx.signal,
    });
    accrue(integ);

    // The integrator's snapshot is authoritative when it returns beads; otherwise fall back
    // to the deterministic merge so a sloppy integrator can never lose the fan-out's coverage.
    const integrated = parseSnapshot(integ.text);
    const snapshot = integrated.beads.length
      ? integrated
      : { beads: merged.beads, edges: merged.edges, ready: merged.beads.filter((b) => b.type !== 'epic').map((b) => b.id) };

    const wallClockSec = Number(process.hrtime.bigint() - start) / 1e9;
    return {
      snapshot,
      cost: {
        outputTokens,
        agents, // = #outcomes + 1
        wallClockSec,
        usd: usdKnown ? usd : null,
        model,
        effort: EFFORT,
      },
    };
  },
};
