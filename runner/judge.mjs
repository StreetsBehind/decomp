// The claude-backed bounded-judgment judge for generative-coverage in LIVE mode.
//
// CHARTER §5.3 Tier 1 / §6: generative completeness ("did the method enumerate the right
// things at all?") cannot be flagged by any invariant over what exists — it can only be
// MEASURED by reading the produced artifact and asking, per latent item, "is this covered?".
// That judgment is irreducibly non-deterministic, so it lives behind an INJECTED judge.
//
// scoreGenerativeCoverage (eval/generative-coverage.mjs) NEVER calls a model itself; it calls
// the judge we hand it. In MOCK mode the runner injects a deterministic stub (runner/mock-table.mjs);
// in LIVE mode it injects THIS — one bounded `claude -p` call per latent item, given only the
// item + the compact snapshot digest (one item's neighborhood worth of context, never a swarm).
//
// Bounded: ONE single-shot CLI call per item, tools off, JSON-only. The judge returns a TWO-PART
// verdict { presence, sufficiency, beadRef?, evidence } (with a derived alias covered===sufficiency);
// on any parse/transport failure it FAILS CLOSED ({presence:false, sufficiency:false} with the error
// as evidence) so a flaky judge can never silently inflate coverage.
//
// WHY TWO PARTS (calibration finding): the judge was conflating "a packet of the right scope EXISTS"
// with "the packet is COMPLETE enough to deliver the requirement" — marking a present-but-thin packet
// as NOT covered. The human chose to report BOTH:
//   presence    = a build packet / required edge of the RIGHT SCOPE exists, REGARDLESS of how
//                 complete its acceptance criteria are.
//   sufficiency = that packet/edge is specified well enough that BUILDING it would ACTUALLY deliver
//                 the target. sufficiency is false whenever presence is false.

const JUDGE_SYSTEM =
  'You are a meticulous build-readiness auditor. You are given a TARGET (a latent requirement ' +
  'or a required dependency edge) and a DIGEST of a decomposition (its build packets + edges). ' +
  'Return a TWO-PART verdict, keeping these two judgments STRICTLY SEPARATE:\n' +
  '  presence    = does a build packet (or, for an edge target, a realized dependency edge) of the ' +
  'RIGHT SCOPE EXIST in the decomposition? Judge ONLY whether something of the correct scope is ' +
  'there at all — IGNORE how complete or thin its acceptance criteria are.\n' +
  '  sufficiency = is that packet/edge specified WELL ENOUGH that BUILDING it would ACTUALLY deliver ' +
  'the target / realize that dependency? Be strict here: a present-but-thin packet (right scope, but ' +
  'too underspecified to build to the target) has presence:true but sufficiency:false.\n' +
  'sufficiency MUST be false whenever presence is false. A merely adjacent packet (wrong scope) is ' +
  'neither present nor sufficient.\n' +
  'Output ONLY a JSON object: {"presence": true|false, "sufficiency": true|false, ' +
  '"beadRef": "<bead id or empty>", "evidence": "<one sentence>"}.';

function renderDigest(digest) {
  const beads = (digest.beads || [])
    .map((b) => `  - ${b.id}: ${b.title} | AC: ${(b.acceptanceCriteria || []).join(' / ')} | files: ${(b.files || []).join(', ')}`)
    .join('\n');
  const edges = (digest.edges || []).map((e) => `  - ${e.from} -> ${e.to}`).join('\n');
  return `PACKETS:\n${beads || '  (none)'}\nEDGES (from depends-on to):\n${edges || '  (none)'}`;
}

function renderTarget(kind, target) {
  if (kind === 'requirement') {
    return `LATENT REQUIREMENT '${target.planKey || target.id}': ${target.description || ''}`;
  }
  return `REQUIRED EDGE '${target.fromPlanKey}' depends on '${target.toPlanKey}': ${target.why || ''}`;
}

/**
 * Build a claude-backed bounded judge bound to an injected invoke (so it is testable with a
 * stub invoke and shares the same CLI transport/auth as every strategy).
 * @param {(args:object)=>Promise<{text:string}>} invoke  e.g. claudeInvoke
 * @param {{ model?: string, signal?: AbortSignal }} [opts]
 * @returns {(q:{kind:string,target:object,snapshotDigest:object})=>Promise<{presence:boolean,sufficiency:boolean,beadRef?:string,evidence:string,covered:boolean}>}
 */
export function makeClaudeJudge(invoke, opts = {}) {
  if (typeof invoke !== 'function') throw new Error('makeClaudeJudge: invoke function is required');
  const model = opts.model || 'claude-sonnet-4-6';

  // GRADER-COST ACCOUNTING (FINDINGS §7): the judge dominated L1 spend (~600 calls) but was
  // invisible in the scorecards. Every attempt — including retries — is accumulated here; the
  // runner snapshots deltas around each scoring pass and reports them as `graderCost`,
  // SEPARATE from the method's cost record (grader cost is apparatus cost, never the policy's).
  const cost = { calls: 0, outputTokens: 0, usd: 0, wallClockSec: 0 };
  const billAttempt = (res) => {
    cost.calls++;
    if (res && Number.isFinite(res.outputTokens)) cost.outputTokens += res.outputTokens;
    if (res && res.usd !== null && Number.isFinite(res.usd)) cost.usd += res.usd;
    if (res && Number.isFinite(res.wallClockSec)) cost.wallClockSec += res.wallClockSec;
  };

  async function claudeJudge({ kind, target, snapshotDigest }) {
    const prompt = [
      renderTarget(kind, target),
      '',
      renderDigest(snapshotDigest),
      '',
      'For this TARGET, report BOTH presence (does a packet/edge of the right scope EXIST?) and ' +
        'sufficiency (would BUILDING it actually deliver the target?). Answer with the JSON object only.',
    ].join('\n');

    // A transport failure (e.g. a rate-limit when judge calls fan out concurrently) must NOT be
    // mistaken for a genuine "not covered" — that would silently DEFLATE coverage. Retry once with
    // a short backoff before failing closed.
    let res;
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await invoke({
          prompt,
          system: JUDGE_SYSTEM,
          model,
          maxTurns: 1,
          role: 'gen-judge',
          signal: opts.signal,
        });
        billAttempt(res);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        cost.calls++; // a failed attempt still happened (and may have cost upstream)
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
      }
    }
    if (lastErr) {
      // FAIL CLOSED after a retry: a persistent transport failure can never inflate either tree.
      return { presence: false, sufficiency: false, covered: false, evidence: `judge invoke failed (after retry): ${lastErr.message}` };
    }

    // Parse the JSON verdict; FAIL CLOSED on anything unparseable.
    let parsed = null;
    try {
      const t = (res && typeof res.text === 'string') ? res.text.trim() : '';
      const start = t.indexOf('{');
      const end = t.lastIndexOf('}');
      if (start !== -1 && end > start) parsed = JSON.parse(t.slice(start, end + 1));
    } catch {
      parsed = null;
    }
    if (!parsed || typeof parsed !== 'object') {
      return { presence: false, sufficiency: false, covered: false, evidence: 'judge returned no parseable verdict' };
    }
    const presence = parsed.presence === true;
    // sufficiency MUST be false whenever presence is false — enforce the contract here, never trust
    // a model that returns sufficiency:true with presence:false.
    const sufficiency = presence && parsed.sufficiency === true;
    return {
      presence,
      sufficiency,
      covered: sufficiency, // derived alias so any stray .covered reader still reads SUFFICIENCY
      beadRef: typeof parsed.beadRef === 'string' ? parsed.beadRef : undefined,
      evidence: typeof parsed.evidence === 'string' ? parsed.evidence : '',
    };
  }

  claudeJudge.cost = cost; // live accumulator — the runner reads/deltas this
  return claudeJudge;
}

export default { makeClaudeJudge };
