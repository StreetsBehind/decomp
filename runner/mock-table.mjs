// Shared MOCK fixtures for the battery's zero-spend mode.
//
// CHARTER §6 / phase intent: before any real (paid) run, the whole matrix must run
// end-to-end against a DETERMINISTIC mock so the rig is de-risked at ZERO spend. This
// module produces, for any fixture's outcome-manifest, a canned `claude`-CLI response
// table (consumed by makeMockInvoke) PLUS a deterministic stub judge — generalizing the
// per-fixture verify table (runs/_verify/check-strategies-gen.mjs) so EVERY generative
// strategy runs on EVERY fixture with no model and no network.
//
// The canned snapshots exercise the PLUMBING; they are NOT findings. They are authored so
// the rig demonstrably discriminates in the RIGHT direction on a THIN plan:
//   deterministic (no invoke, under-pours on a thin lock)
//     < single-session (covers stated outcomes + SOME latent)
//     < expand-audit  (nearly ALL latent — one short)
//     <= swarm        (ALL latent requirements + edges)
//
// PURE: no clock, no randomness, no model, no I/O. Everything is derived from the manifest.

import { makeMockInvoke } from './model-client.mjs';

// Bead title === the latent planKey, so the stub judge (which keys on titles) scores
// coverage exactly like the per-fixture verify table did.
function bead(planKey, outcomeIds) {
  return {
    id: `b-${planKey}`,
    type: 'task',
    title: planKey,
    status: 'open',
    metadata: {
      provenance: { planKey, outcomeIds: outcomeIds.length ? outcomeIds : ['_'] },
      acceptanceCriteria: [`Implement ${planKey}.`],
      filesTouched: [`src/${planKey}.ts`],
      testPlanCases: [`${planKey}: happy path`],
    },
  };
}

/** planKey -> the stated outcome ids it serves, derived from the manifest. */
function outcomesByPlanKey(manifest) {
  const map = new Map();
  const add = (pk, oid) => {
    if (!pk) return;
    if (!map.has(pk)) map.set(pk, new Set());
    map.get(pk).add(oid);
  };
  // outcomes -> satisfiedByAnyOf planKeys carry that outcome id.
  for (const o of manifest.outcomes || []) {
    for (const pk of o.satisfiedByAnyOf || []) add(pk, o.id);
  }
  // a requirement that is no outcome's satisfier still needs SOME stated outcome id so
  // its bead is valid; attribute it to the first outcome (deterministic).
  const firstOutcome = (manifest.outcomes || [])[0];
  return { map, firstOutcome: firstOutcome ? firstOutcome.id : '_' };
}

/** Build a canned snapshot JSON string covering exactly `planKeys`. Edges from the manifest. */
function snapshotJson(planKeys, manifest, oByPk) {
  const present = new Set(planKeys);
  const beads = planKeys.map((pk) => {
    const oids = oByPk.map.has(pk) ? [...oByPk.map.get(pk)] : [oByPk.firstOutcome];
    return bead(pk, oids);
  });
  const edges = (manifest.requiredEdges || [])
    .filter((e) => present.has(e.fromPlanKey) && present.has(e.toPlanKey))
    .map((e) => ({ from: `b-${e.fromPlanKey}`, to: `b-${e.toPlanKey}`, kind: 'blocks' }));
  const hasOut = new Set(edges.map((e) => e.from));
  const ready = beads.filter((b) => !hasOut.has(b.id)).map((b) => b.id);
  return JSON.stringify({ beads, edges, ready });
}

/**
 * The LATENT planKey universe for a fixture: every requirement planKey, plus any planKey
 * that appears in an outcome's satisfiedByAnyOf (so stated outcomes are always coverable).
 * Deterministic order: requirements first (manifest order), then any extra outcome keys.
 */
function latentPlanKeys(manifest) {
  const seen = new Set();
  const keys = [];
  for (const r of manifest.requirements || []) {
    if (r.planKey && !seen.has(r.planKey)) { seen.add(r.planKey); keys.push(r.planKey); }
  }
  for (const o of manifest.outcomes || []) {
    for (const pk of o.satisfiedByAnyOf || []) {
      if (pk && !seen.has(pk)) { seen.add(pk); keys.push(pk); }
    }
  }
  return keys;
}

/** The stated-outcome satisfier planKeys (what a method MUST reach to cover the outcomes). */
function outcomeSatisfierKeys(manifest) {
  const seen = new Set();
  const keys = [];
  for (const o of manifest.outcomes || []) {
    for (const pk of o.satisfiedByAnyOf || []) {
      if (pk && !seen.has(pk)) { seen.add(pk); keys.push(pk); }
    }
  }
  return keys;
}

/**
 * Build the canned script-table entries for ONE fixture, keyed by `${fixture}::${role}`
 * so makeMockInvoke's composite-key resolution routes each invoke to its tier.
 *
 * Roles mocked (matching the strategies' invoke `role` tokens):
 *   single-session
 *   swarm:<outcomeId>   (one per stated outcome) + swarm:integrate
 *   expand-audit:iter0..iter<MAX>   (iter0 partial w/ a readiness gap to force a 2nd pass)
 */
function entriesForFixture(fixtureName, manifest) {
  const oByPk = outcomesByPlanKey(manifest);
  const all = latentPlanKeys(manifest);
  const satisfiers = outcomeSatisfierKeys(manifest);
  const snap = (keys) => snapshotJson(keys, manifest, oByPk);

  // --- coverage tiers (authored to discriminate; NOT findings) ---
  // single-session: stated-outcome satisfiers + the first HALF of the latent extras.
  const extras = all.filter((k) => !satisfiers.includes(k));
  const halfExtras = extras.slice(0, Math.ceil(extras.length / 2));
  const SINGLE_KEYS = dedupe([...satisfiers, ...halfExtras]);
  // expand-audit: ALL latent except the LAST one (nearly complete — one short).
  const EXPAND_KEYS = all.length > 1 ? all.slice(0, all.length - 1) : all.slice();
  // swarm: ALL latent.
  const SWARM_KEYS = all.slice();

  const entries = {};
  entries[`${fixtureName}::single-session`] = snap(SINGLE_KEYS);

  // swarm fan-out: one invoke per stated outcome, each covering that outcome's satisfiers;
  // then an authoritative integrator returning the full set.
  for (const o of manifest.outcomes || []) {
    const keys = (o.satisfiedByAnyOf || []).slice();
    entries[`${fixtureName}::swarm:${o.id}`] = snap(keys.length ? keys : [all[0]].filter(Boolean));
  }
  entries[`${fixtureName}::swarm:integrate`] = snap(SWARM_KEYS);

  // expand-audit family: iter0 partial AND missing files/tests on one bead so the deterministic
  // structural audit fires with real gaps. iter1+ return the near-complete set. ALL THREE
  // feedback variants (structural / generative / off) share the SAME canned iter outputs —
  // keyed by the strategy NAME the variant carries — so the A/B/C is isolated to the feedback
  // signal, not the mock content. (Equal expand budgets are enforced by the strategy itself.)
  const partialKeys = dedupe([...satisfiers].slice(0, Math.max(1, Math.ceil(satisfiers.length / 2))));
  const iter0 = (() => {
    const obj = JSON.parse(snap(partialKeys.length ? partialKeys : [all[0]].filter(Boolean)));
    if (obj.beads.length) {
      obj.beads[0].metadata.filesTouched = [];
      obj.beads[0].metadata.testPlanCases = [];
    }
    return JSON.stringify(obj);
  })();
  for (const variant of ['expand-audit', 'expand-audit-gen', 'expand-audit-noaudit']) {
    entries[`${fixtureName}::${variant}:iter0`] = iter0;
    // cover iter1..iter9 (the expand budget is small; over-provision is harmless).
    for (let i = 1; i < 10; i++) entries[`${fixtureName}::${variant}:iter${i}`] = snap(EXPAND_KEYS);
  }
  // expand-audit-gen's bounded audit invokes: canned gap lists naming the still-missing latent
  // keys (iter0 audit sees the partial graph; later audits see the near-complete one).
  const missingAfterPartial = all.filter((k) => !partialKeys.includes(k));
  const missingAfterExpand = all.filter((k) => !EXPAND_KEYS.includes(k));
  for (let i = 0; i < 10; i++) {
    const missing = i === 0 ? missingAfterPartial : missingAfterExpand;
    entries[`${fixtureName}::expand-audit-gen:audit${i}`] =
      JSON.stringify({ gaps: missing.map((k) => `missing packet: ${k}`) });
  }

  return entries;
}

function dedupe(xs) {
  const seen = new Set();
  const out = [];
  for (const x of xs) if (!seen.has(x)) { seen.add(x); out.push(x); }
  return out;
}

/**
 * Build the full canned script-table across ALL fixtures, then wrap it in makeMockInvoke.
 * @param {Array<{name:string, manifest:object}>} fixtures
 * @returns {(args:object)=>Promise<object>} a deterministic, zero-spend invoke
 */
export function makeBatteryMockInvoke(fixtures) {
  const script = {};
  for (const fx of fixtures) Object.assign(script, entriesForFixture(fx.name, fx.manifest));
  // Canned cost numbers so the cost-axis math is deterministic (and visibly non-zero $0-spend).
  return makeMockInvoke(script, { defaultOutputTokens: 500, defaultUsd: 0.01 });
}

/**
 * Deterministic STUB judge for generative-coverage in MOCK mode (zero spend, zero variance).
 * Returns the SAME two-part verdict shape as the live judge: { presence, sufficiency, evidence,
 * covered:sufficiency }. Title-based logic decides PRESENCE: a requirement is present iff a bead is
 * TITLED with its planKey; an edge is present iff BOTH endpoints' planKeys are titles. (The canned
 * snapshots title every bead with its planKey, by construction.)
 *
 * NOTE: the mock sets sufficiency === presence by default — it does NOT exercise the
 * presence/sufficiency GAP (a present-but-thin packet). ONLY the live judge exercises that gap;
 * the stub exists to drive the PLUMBING at zero spend, not to find findings.
 * @returns {(q:{kind:string,target:object,snapshotDigest:object})=>Promise<{presence:boolean,sufficiency:boolean,covered:boolean,evidence:string}>}
 */
export function makeStubJudge() {
  const verdict = (present, evidence) => ({
    presence: present,
    sufficiency: present, // mock does not exercise the gap; sufficiency tracks presence by default
    covered: present, // derived alias === sufficiency
    evidence,
  });
  return async function stubJudge({ kind, target, snapshotDigest }) {
    const titles = new Set((snapshotDigest.beads || []).map((b) => b.title));
    if (kind === 'requirement') {
      const present = titles.has(target.planKey);
      return verdict(present, present ? `bead titled '${target.planKey}'` : `no bead titled '${target.planKey}'`);
    }
    const present = titles.has(target.fromPlanKey) && titles.has(target.toPlanKey);
    return verdict(present, present ? 'both edge endpoints present' : 'an edge endpoint absent');
  };
}

export default { makeBatteryMockInvoke, makeStubJudge };
