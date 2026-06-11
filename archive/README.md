# Archive — parked, not deleted

_Created 2026-06-11 during the unified-direction reshape. Everything here is **dormant, not dead**:
it produced real results, it is revivable, and the reasons it was parked are recorded below. Nothing in
this folder is on the live trunk, imported by live code, or run by `npm run selftest`. The forward
direction lives in [`../docs/`](../docs/) — start at [`../README.md`](../README.md) and
[`../docs/RECONCILIATION.md`](../docs/RECONCILIATION.md)._

---

## `edge-join/` — the model-facing edge-join mechanism

**What it is.** The apparatus that tried to recover dependency edges by having a model extract typed
`produces`/`consumes` interfaces per bead, then computing edges as a deterministic **join** over them:

- `extract-interfaces.mjs` — the per-bead model annotation pass (+ vocabulary canonicalizer)
- `annotator.mjs` — the injected live/stub annotator the extraction runs on
- `extraction-ab.mjs`, `extraction-ab-live.mjs`, `extraction-ab-v2.mjs` — the Step-2 contest harness
  (model `depends_on` vs extraction→join), precision-aware
- `join-ceiling.mjs` + `join-ceiling-experiment/` — the Step-1 ceiling tool + the hand annotation
- `extract-interfaces.selftest.mjs` — its selftest

**Why it's parked.** Proof-staircase **Step 2** was a decisive, replicated negative
([`../docs/STAIRCASE-RESULTS.md`](../docs/STAIRCASE-RESULTS.md)): a model's own `depends_on` beat the
extraction→join by **−17.6 pts (>1σ)**, across **both** haiku and sonnet annotators. The bottleneck is
structural (vocabulary alignment + over-wiring), not model strength. Separately, the build-tolerant
reframe ([`../docs/BUILD-TOLERANT-REFRAME.md`](../docs/BUILD-TOLERANT-REFRAME.md)) argues that whole
contest was over the **cheap quadrant** the build recovers for free — so even a *win* would have been on
a layer that doesn't need upfront discovery. The valuable layer (obligations / the lethal quadrant) was
promoted to the live trunk: [`../docs/OBLIGATIONS.md`](../docs/OBLIGATIONS.md).

**What was kept live (NOT here).** The proven **rulers** — `eval/build-completeness.mjs`
(`scoreEdgeCoverage`), `eval/join.mjs` (`scoreJoin`), `eval/lattice.mjs` — stay on the trunk (Step-0
mutation-tested, reused by the live partition endpoint and `ruler-mutation.selftest`). The join *scorer*
is a measurement instrument; only the model-facing *mechanism* is parked.

**Revival path (the named, untried fix).** `STAIRCASE-RESULTS.md` Step 2 fingers the cause and names the
move not yet tried: **dictionary-first canonicalization** — the model builds a resource dictionary
*first*, then beads reference dictionary ids, directly attacking the exact-match-join vocabulary
misalignment. To revive: `git mv archive/edge-join/*.mjs` back to `eval/` + `runner/` (restores the
relative imports), re-add `extract-interfaces` to `eval/selftest/run-all.mjs` and the `join-ceiling`
script to `package.json`, implement the dictionary pass, and re-run the Step-2 A/B. If the gap closes,
the line is back; if not, the reframe is insufficient as posed.

## `surface-discovery/` — the original three-layer design specs

`SURFACE-DISCOVERY-SPEC.md` + `CURATION-METHOD.md` — the full original design that framed edges as a join
over typed interfaces, seeded by a library of obligations, graded against a converged union. The
**obligations layer** of these specs is live and re-stated at
[`../docs/OBLIGATIONS.md`](../docs/OBLIGATIONS.md) (with section cross-references back into these files);
the **edge-join mechanism** they specify is parked with `edge-join/` above. Kept whole here for the full
lifecycle / curation / proof-staircase detail that the promoted doc condenses.
