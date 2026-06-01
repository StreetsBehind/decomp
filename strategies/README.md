# Strategies — the methods under test

Every "way to decompose a plan" is a **strategy**: a module that implements one adapter contract so
the battery runner can run them all blind and compare them on equal footing.

## The adapter contract

A strategy module default-exports an object:

```js
export default {
  name: 'deterministic',          // unique id; matches the directory
  deterministic: true,            // true  -> runner uses K=1 (no variance to measure)
                                  // false -> runner uses K>=MIN_REPEATS and reports stddev
  model: null,                    // for LLM-backed strategies: pinned model id (else null)
  effort: null,                   // pinned effort/setting (else null)

  /**
   * Decompose one fixture into a bead graph.
   * @param {object} fixture  { name, lock, planMd, dir }  — `dir` is a FRESH empty workspace
   * @param {object} ctx      { signal }  — abort signal; future: token meter handle
   * @returns {Promise<{ snapshot: Snapshot, cost: CostRecord }>}
   *          snapshot conforms to schemas/snapshot.schema.json
   *          cost     conforms to schemas/cost-record.schema.json
   */
  async run(fixture, ctx) { /* ... */ }
}
```

### Rules a strategy must honor

- **Fresh workspace.** Write only inside `fixture.dir`. The runner gives you a clean one per run and
  reads your `snapshot` back; never depend on prior state.
- **Self-report cost honestly.** A pure-code strategy returns `{ outputTokens: 0, agents: 0 }`. An
  LLM strategy returns the real token + agent counts (this is the Cost axis — it is supposed to hurt).
- **Resolve by provenance, never by title.** Stamp `metadata.provenance.planKey` on every non-epic
  bead so the scorers can trace it back to the plan. Titles are not stable keys.
- **Reproducible if stochastic.** Pin model + effort + the exact prompt; the runner records them so a
  result can be re-derived.

## Registering a strategy

Add its module path to `registry.mjs`. The runner imports the registry and runs every entry against
every fixture.

## The comparison set (see CHARTER §5.1)

| dir | shape | role |
| --- | --- | --- |
| `deterministic/` | pure-code: parse -> pour -> wire -> score | the zero-variance, ~$0 baseline to beat |
| `single-session/` | one LLM agent, no subagents | the "just ask the model" baseline |
| _(planned)_ `swarm/` | many parallel agents + verifiers | the expensive, high-coverage end |
| _(planned)_ `expand-audit/` | alternate add-nodes / completeness-invariants to fixpoint | the determinism + bounded-judgment hypothesis |

`deterministic` and `single-session` ship as **stubs** that throw `NOT_IMPLEMENTED` — they define the
shape; a build-out slice fills each `run()`.
