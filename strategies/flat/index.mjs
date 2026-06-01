// Strategy: flat (deterministic CONTROL / strawman).
//
// Same per-feature beads as the deterministic expander BUT deliberately weak so the
// apparatus can show it losing:
//   - OMIT all crossFeatureDependencies edges (edges:[])  -> edgeCoverage fails
//   - OMIT testPlanCases + filesTouched from beads         -> buildReadiness fails
// Beads keep only acceptanceCriteria + provenance.planKey (+ concerns).
// Still schema-valid. This proves the battery discriminates between methods.

const beadId = (planKey) => `bead-${planKey}`;
const epicId = (app) => `epic-${app}`;

function deriveAcceptanceCriteria(feature) {
  const acs = [];
  if (feature.summary) acs.push(`Implements: ${feature.summary}.`);
  for (const s of feature.surfaces || []) {
    if (s === 'db-schema') acs.push('Database schema/migration is created and applied.');
    else if (s === 'api-route') acs.push(`Exposes an API route for ${feature.planKey}.`);
    else if (s === 'ui-view') acs.push(`Renders the ${feature.planKey} view in the UI.`);
    else acs.push(`Provides the ${s} surface.`);
  }
  return acs.slice(0, 6);
}

/** @type {import('../adapter.mjs').Strategy} */
export default {
  name: 'flat',
  deterministic: true,
  model: null,
  effort: null,

  async run(fixture, _ctx) {
    const start = process.hrtime.bigint();
    const lock = fixture.lock;

    const concernsByFeature = new Map();
    for (const c of lock.concerns || []) {
      for (const pk of c.appliesTo || []) {
        if (!concernsByFeature.has(pk)) concernsByFeature.set(pk, []);
        concernsByFeature.get(pk).push(c.id);
      }
    }

    const beads = [];
    const epic = epicId(lock.app);
    beads.push({
      id: epic,
      type: 'epic',
      title: lock.app,
      status: 'open',
      parent: null,
      metadata: { summary: lock.summary || lock.app },
    });

    for (const planKey of lock.featureOrder || []) {
      const feature = (lock.features || {})[planKey];
      if (!feature) continue;
      // Deliberately weak: only acceptanceCriteria + provenance.planKey (+ concerns).
      const metadata = {
        provenance: { planKey: feature.planKey },
        acceptanceCriteria: deriveAcceptanceCriteria(feature),
      };
      const concerns = concernsByFeature.get(planKey);
      if (concerns && concerns.length) metadata.concerns = concerns;

      beads.push({
        id: beadId(feature.planKey),
        type: 'task',
        title: feature.summary || feature.planKey,
        status: 'open',
        parent: epic,
        metadata,
      });
    }

    // Deliberately omit ALL dependency edges.
    const edges = [];
    // With no edges every non-epic bead looks "ready" — but the missing edges sink
    // edgeCoverage and the missing files/tests sink buildReadiness.
    const ready = beads.filter((b) => b.type !== 'epic').map((b) => b.id);

    const wallClockSec = Number(process.hrtime.bigint() - start) / 1e9;

    return {
      snapshot: { beads, edges, ready },
      cost: { outputTokens: 0, agents: 0, wallClockSec },
    };
  },
};
