// Strategy: deterministic expander (the baseline to beat).
//
// Pure code: parse the lock -> pour beads per feature -> wire dependency edges
// (cross-feature) -> stamp provenance.planKey -> emit the snapshot.
// No LLM, no subagents: cost is { outputTokens: 0, agents: 0 }, variance ~0.
//
// Field names are dictated by the build-completeness oracle (eval/build-completeness.mjs):
//   metadata.provenance.planKey, metadata.concerns[], metadata.acceptanceCriteria[]
//   (1..6 to count ready), metadata.filesTouched[] (>=1), metadata.testPlanCases[] (>=1).
// Edge semantics: edges[].from DEPENDS ON edges[].to.

const beadId = (planKey) => `bead-${planKey}`;
const epicId = (app) => `epic-${app}`;

// Map a surface kind to a concrete file path for this planKey + stack.
function surfaceFile(planKey, surface, ext) {
  switch (surface) {
    case 'db-schema':
      return `src/db/schema.${ext}`;
    case 'api-route':
      return `src/routes/${planKey}.${ext}`;
    case 'ui-view':
      return `src/views/${planKey}.view.${ext}`;
    default:
      return `src/${planKey}.${ext}`;
  }
}

// Derive 1..6 concrete acceptance criteria from summary + surfaces.
function deriveAcceptanceCriteria(feature) {
  const acs = [];
  if (feature.summary) acs.push(`Implements: ${feature.summary}.`);
  for (const s of feature.surfaces || []) {
    if (s === 'db-schema') acs.push('Database schema/migration is created and applied.');
    else if (s === 'api-route') acs.push(`Exposes an API route for ${feature.planKey}.`);
    else if (s === 'ui-view') acs.push(`Renders the ${feature.planKey} view in the UI.`);
    else acs.push(`Provides the ${s} surface.`);
  }
  // Cap at 6 (oracle requires 1..6 to count as ready).
  return acs.slice(0, 6);
}

// Derive >=1 filesTouched from stack + surfaces.
function deriveFilesTouched(feature, ext) {
  const files = new Set();
  for (const s of feature.surfaces || []) files.add(surfaceFile(feature.planKey, s, ext));
  // Always at least one feature module file.
  files.add(`src/${feature.planKey}.${ext}`);
  return [...files];
}

// Derive >=1 testPlanCases from summary + surfaces.
function deriveTestPlanCases(feature) {
  const cases = [`${feature.planKey}: happy-path covering "${feature.summary || feature.planKey}".`];
  if ((feature.surfaces || []).includes('api-route')) {
    cases.push(`${feature.planKey}: API route returns the expected response.`);
  }
  return cases;
}

/** @type {import('../adapter.mjs').Strategy} */
export default {
  name: 'deterministic',
  deterministic: true,
  model: null,
  effort: null,

  async run(fixture, _ctx) {
    const start = process.hrtime.bigint();
    const lock = fixture.lock;
    const ext = lock?.stack?.lang === 'ts' ? 'ts' : 'js';

    // concern index: planKey -> [concernId, ...]
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
      const metadata = {
        provenance: { planKey: feature.planKey },
        acceptanceCriteria: deriveAcceptanceCriteria(feature),
        filesTouched: deriveFilesTouched(feature, ext),
        testPlanCases: deriveTestPlanCases(feature),
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

    // Realize every cross-feature dependency as an edge. from DEPENDS ON to.
    const edges = [];
    for (const dep of lock.crossFeatureDependencies || []) {
      edges.push({ from: beadId(dep.from), to: beadId(dep.to), kind: 'blocks' });
    }

    // ready: non-epic bead ids with no outgoing dependency edge.
    const hasOutgoing = new Set(edges.map((e) => e.from));
    const ready = beads
      .filter((b) => b.type !== 'epic' && !hasOutgoing.has(b.id))
      .map((b) => b.id);

    const wallClockSec = Number(process.hrtime.bigint() - start) / 1e9;

    return {
      snapshot: { beads, edges, ready },
      cost: { outputTokens: 0, agents: 0, wallClockSec },
    };
  },
};
