# Archetype Premise Experiment — Design

> **⚠️ Headline superseded (2026-06-16) — read [`STATE.md`](../STATE.md) first.** This *Era-1* experiment
> validated the archetype premise for surface-discovery. The project's current goal is the hybrid
> cost-vs-reliability product ([`PROPOSAL-HYBRID.md`](PROPOSAL-HYBRID.md)). The findings remain valid as
> evidence; the archetype-mining headline they served is historical.

_Last updated: 2026-06-02. A controlled experiment to answer one question cheaply, **before** committing
resources to mining archetypes: **does priming a decomposer with authored archetypes help a weaker model
find more of the right surfaces and seam-questions — without anchoring it away from the seams a template
can't hold?** Read after [`OBLIGATIONS.md`](OBLIGATIONS.md) (the live obligations layer — the typed
lethal quadrant; full original detail in archived [`SURFACE-DISCOVERY-SPEC`](../archive/surface-discovery/SURFACE-DISCOVERY-SPEC.md)
§3/§6/§7 + [`CURATION-METHOD`](../archive/surface-discovery/CURATION-METHOD.md), the gate).
Artifacts live in [`../experiments/archetype-premise/`](../experiments/archetype-premise/)._

---

## 0. The one-line reframe (and why it matters)

The hypothesis as first stated — *"canonical archetypes as a method for discovering **edges**"* — is, taken
literally, the **forbidden** mechanism. Invariant 6.1 / curation C1 are explicit: **the library never stores
an edge**; edges are a deterministic *join* over typed `produces`/`consumes` interfaces. An archetype that
"discovers edges" is the confident-incompleteness ceiling the whole three-layer design exists to prevent
(§3.1: *worse* than today's quiet incompleteness).

So the premise is restated to be both testable and spec-legal:

> **Priming with authored archetypes raises the recall of the SURFACES and OBLIGATIONS (typed holes /
> open-questions) that the join then turns into edges — AND does not lower seam recall.**
> Surfaces and open-questions are the unit of discovery; edges are a downstream *consequence* of the join,
> never what the model emits.

This is a **premise-validation pass that sits across proof-staircase Step 2 (extraction A/B) and Step 3
(anti-anchoring A/B)**, run with **authored, untrusted** archetypes as a cold-start seed. A positive result
is **necessary-not-sufficient**: it licenses exactly *"hand-tuned archetype priming lifts covered recall
without anchoring on this fixture"* → a GO to fund the mining pipeline. It can **never** promote an archetype
to canon (that needs recurrence across ≥2 provenance classes — invariant 6).

---

## 1. Where your assumptions were right, wrong, or need reframing

You asked us to call these out. Verdicts from the red-team (each cites the spec):

| # | Your assumption | Verdict | The correction |
|---|---|---|---|
| 1 | Archetypes are a method for **discovering edges** | **NEEDS-REFRAME** | Measure surfaces/obligations; edges are the computed join's output, never the model's. (§0 above.) |
| 2 | Authored, logically-validated archetypes can **validate the premise** | **FLAWED** | They establish a **ceiling / necessary condition**, not sufficiency. A *positive* is an upper bound (you hand-tuned a prior you already knew the answers to); a *negative* is the cheap, real kill (if even hand-tuned archetypes don't lift, mined-and-weaker ones won't). Frame it as a ceiling probe. |
| 3 | Authored archetypes contain the right content | **NEEDS-REFRAME** | Enforce **C1 "no edge at intake"** as a literal pre-run lint. *(The validation already caught edge-smuggling in all 6 — see §3.)* |
| 4 | **Exclude opus** | **FLAWED (split the roles)** | Right to exclude opus as a *decomposer-under-test* (ceiling/headroom). But opus's natural job is the **union-builder + adversarial verifier** that *builds ground truth*. "Exclude opus from the arms" ✓; "exclude opus entirely" ✗ — that strands the ruler. Optionally also include opus as a *headroom* decomposer cell to map the cost/quality knee. |
| 5 | **Single session, one run each** is enough | **FLAWED** | Sessions run at ~45× the deterministic baseline's variance (CHARTER §8); FINDINGS ran K=3 and still called numbers directional. **K≥3, ideally 5.** "Single-session" is the *strategy*, not K=1. Cut models/fixtures before cutting K. |
| 6 | Improvement is measurable **without an oracle** | **NEEDS-REFRAME** | Frozen hand manifests already exist for 3 fixtures — don't eyeball. The real gap is (a) the **ruler is unproven** (Step 0 mutation-test not run) and (b) the oracle is **incomplete by construction** → route beyond-manifest finds to a verifier and *grow* the manifest. |
| 7 | A **synthetic mock plan** is adequate | **NEEDS-REFRAME** | "Big enough" is the right instinct — single-archetype fixtures (sso-greenfield) **structurally cannot exhibit seams**. You need a **multi-feature** plan. But a same-author plan re-introduces teach-to-the-test bias → author the manifest **blind**, by a second author, and make the seam set exactly what archetypes can't reach. |
| 8 (implicit) | A blind-vs-primed A/B cleanly attributes the lift to archetype **content** | **FLAWED** | Priming changes *content* **and** *token count / "think harder" nudging* at once. Add a **placebo arm** (equal-token generic advice). A2 must beat **A1**, not just A0. And grade against the **partitioned** manifest, never one aggregate number. |
| 9 (implicit) | This single big run is the right shape | **NEEDS-REFRAME** | The spec already decomposed it into a **cheapest-first staircase**. Run the two **free** gates (Step 0 ruler, Step 1 join-ceiling) before any model spend — Step 1 can kill the whole direction for $0. |

---

## 2. The experiment — three arms, two-sided verdict

Single-session strategy, identical prompts except for one inserted block (byte-identical otherwise):

| Arm | What it is | What it isolates |
|---|---|---|
| **A0 — BLIND** | The existing single-session prompt verbatim. No extra context. | The floor: what a model finds with no prior. **The permanent template-blind reference** (invariant 3) and the constant node set. **The only instrument that can detect anchoring.** |
| **A1 — PLACEBO** | A0 + a token-matched (±10%) block of *generic, plan-agnostic* decomposition advice (names no archetype, no typed resource, no obligation). | The **"more context / longer prompt" confound**. If A1 lifts as much as A2, the win is prompt length, not archetypes. |
| **A2 — PRIMED** | A0 + the **archetype injection block**: classify features → instantiate intrinsic surfaces → obligations rendered as a checklist of typed **questions** over this plan → state-probe sweep. **Pre-run C1 lint aborts if any line names a from→to pair.** | The marginal effect of **edge-free typed archetype priming** over both the blind floor and equal-token generic context. |

**Models:** `claude-sonnet-4-6` (primary, has headroom) + `claude-haiku-4-5` (cheap floor; priming should help *more* here if archetypes substitute for capability). Older tiers optional/report-only. **Opus is excluded from the arms** (ceiling) but **runs as the union-builder + adversarial verifier** that builds ground truth — a different role than any decomposer it grades.

**Repeats:** K≥3 per (arm × model) cell, ideally 5. A delta counts only if it exceeds ~1 pooled stddev across the K runs of the two arms compared.

### Metrics (measured on surfaces + seam-questions, never raw model-asserted edges)

| Metric | Pass condition |
|---|---|
| **Library-covered surface recall** (primary +) | `mean(A2) > mean(A1) > mean(A0)` by > ~1 pooled stddev. **A2 must beat the placebo.** |
| **Seam recall** (primary −, anchoring) | `mean(A2) ≥ mean(A0) − ε`. **Any statistically significant drop ⇒ the archetype version ANCHORS ⇒ REJECTED**, regardless of the covered lift. *This is the headline safety number.* |
| **Surface precision** (FP guard) | `A2 precision ≥ A0 − ε`. No buying recall by spraying resources. |
| **Open-question yield** on archetyped features | `mean(A2) > mean(A0)` AND the A2-only questions are verifier-confirmed ≥ ~0.8 (not hallucinated). |
| **Computed-edge recall via the join** (secondary) | On the **resource-mediated subset only** (Step-1 triage), nodes held constant: `A2 ≥ A0`, join precision not collapsing. *Corroborates; never overrides the primaries.* |

**The two-sided rule:** *covered recall UP **and** seam recall NOT-DOWN, jointly.* An aggregate-recall win that hides a seam regression is the exact failure the design forbids.

---

## 3. Authored archetypes — and what validating them already taught us

Six archetypes were authored to the spec's entry shape and **contrast-pair validated** (minimal host vs
saturated host; intrinsic ⇒ promote, contextual ⇒ demote to obligation, every uncertain case fails *safe*).
**All six came back REPAIRED** — the validator caught edge-smuggling in every one. That is itself a result:
it empirically confirms the spec's claim that authored archetypes are dangerous without the gate.

| Archetype | Representative smuggled edge that was caught → demoted to an obligation |
|---|---|
| `oidc-sso-login` | "persist Identity to a user record (writer→reader)" presupposed a sibling user-store → re-posed as *"does this plan persist Identity at all?"* |
| `team-membership-invites` | `invite-delivery` asserted as an intrinsic surface presupposed a sibling email feature → *"is there a delivery channel that consumes the accept-link?"* |
| `rbac-authorization` | (cleanest) no illegal edges; four **promised-but-dangling** obligations materialized so a reader can't back-fill a hardcoded sibling |
| `crud-resource` | `consumes:OwnerPrincipal` on every route — a **producer-less half-edge** hardcoding the auth→crud seam → ownership demoted to an obligation on the intrinsic routes |
| `file-upload` | `triggersOnUpload` / `scanThenPostprocess` hardcoded the upload→scan→postprocess **edge chain** + a derive sibling → all demoted to obligations; scan became a state-probe |
| `audit-logging` | actor obligation fixed at `edge-to-compute` (assumes an identity sibling) → flipped to `open-question`; the canonical *"who produces a security-action Event?"* obligation cleared as the legal seam generator |

Full entries + per-archetype findings: [`../experiments/archetype-premise/archetypes.json`](../experiments/archetype-premise/archetypes.json). All marked `provenance=expert-author, trust=UNTRUSTED, lifecycleState=provisional` — floor-only probes, never canon.

> **Lint caveat (from review):** a literal `from→to` regex is too weak — an obligation in prose ("the
> callback must validate the token") encodes a directed dependency without `A→B` syntax. The C1 lint needs a
> **semantic** check (a structured obligation grammar that forbids naming two concrete plan resources in a
> directional verb), hash-pinned with the block.

---

## 4. The stimulus — "Hearth," a thin multi-feature plan

[`../experiments/archetype-premise/hearth/plan.md`](../experiments/archetype-premise/hearth/plan.md) — a
greenfield B2B workspace, **thin** (states outcomes only; latent work lives only in the manifest). **8
features, 6 with a matching archetype + 2 deliberately without** (activity-feed/notifications, billing) so
the template-blind comparison has headroom and the "novelty gets no prior" behavior is exercised.

The manifest ([`hearth/outcome-manifest.partitioned.json`](../experiments/archetype-premise/hearth/outcome-manifest.partitioned.json))
extends the standard schema with a **partition tag on every edge**: **47 intra-feature (library-covered) +
37 seam (inter-feature)** = 84 edges, 46 requirements. The seams (auth→everything, RBAC enforced across every
resource, audit spanning features, billing gating membership, notifications fanning out from many events) are
the whole point — they are what a per-feature template **cannot** hold and the join must compute.

> **Contamination controls:** the plan was authored **blind to the archetype internals**; the manifest must
> be authored by a **second author**, the seam set made exactly what the archetypes can't reach, and an opus
> adversarial check must confirm the manifest is **not a relabeling** of the archetypes. Hash-pin the manifest
> + partition **before any run**.

---

## 5. Ground truth — frozen scaffold, then grown

1. **Scaffold:** the hand manifest above, partitioned and hash-pinned **before runs**. The method never sees it.
2. **Grow (co-evolution union, §5.1):** run the diverse **blind** generators (A0 × both models × K) + controls; pool proposed surfaces, canonicalize, dedup; **opus adversarially verifies** each (skeptic refutes). Verified items beyond the scaffold **grow** the manifest (a blind-found, confirmed surface is *manifest growth, not a miss*). Re-freeze to v2 **before** the primed arm is graded. Track the **confirmed-real-beyond-manifest rate** = a direct measure of the manifest's incompleteness.

This is why a positive result isn't circular: even the covered set isn't solely the author's mental model, and the seam set is provably not reachable by the prime.

---

## 6. Decision rule

Read the gates first, then the verdict:

- **Gate Step 0 (ruler):** delete a known edge ⇒ recall drops by exactly the localized amount; plant a fake ⇒ precision flags it. **Fail ⇒ STOP** — every downstream number is vibes.
- **Gate Step 1 (join-ceiling):** the resource-mediated fraction of Hearth's edges. High (≥~0.7) ⇒ edge metrics meaningful. Low **and** un-mediated edges intrinsic ⇒ the reframe needs a supplement; de-weight edge metrics. *Read the number; this can kill the direction for $0.*

| Outcome | Condition |
|---|---|
| **PREMISE VALIDATED — GO to invest in mining** | On ≥ the primary model (sonnet), across K≥3: covered recall **A2 > A1 > A0** by >~1 stddev, **AND** seam recall A2 not below A0, **AND** precision A2 not below A0, **AND** open-question yield A2 > A0 with A2-only questions verifier-confirmed ≥~0.8. *(A2>A1 rules out "just more context.")* |
| **INCONCLUSIVE** | A2 beats A0 but **not A1** (⇒ context length, not archetypes), OR the delta is inside pooled stddev at K=3 (⇒ raise K / add a fixture), OR Step 1 ceiling is low and the surface lift is marginal. |
| **FALSIFIED** | A2 does not raise covered recall over A0/A1, **OR** A2 raises covered recall but **lowers seam recall** (anchoring — an active REJECT of that archetype version even if the headline looks like a win). |

**Scope (state it up front):** validated ⇒ *necessary-not-sufficient* for the mined method; it buys a GO on mining, where the same gate (recurrence + audit + anchoring ratchet) is re-run on mined entries.

---

## 7. Apparatus — reuse vs build

**Reuse as-is:** `runner/battery.mjs` (matrix × K, fresh workspace, fixtureHash, mean+stddev, ledger);
`strategies/single-session` + `prompt-contract.mjs` (the A0 prompt); `parse-snapshot.mjs`;
`eval/build-completeness.mjs` `scoreEdgeCoverage` + `graph/build-graph.mjs`; `outcome-coverage`,
`generative-coverage` + `judge.mjs`; the mock invoke for **zero-spend dry-runs of the whole 3-arm matrix**;
hash-pinning / fresh-workspace guards.

**Build status (most were *fictional*; now mostly built):**

1. ~~**`single-session-primed` strategy.**~~ ✅ **DONE** (2026-06-02) — registered as three single-session variants: `single-session` (A0 blind), `single-session-placebo` (A1), `single-session-primed` (A2), sharing `strategies/single-session/core.mjs` (block injected between `renderThinPlan` and `snapshotContract`; A0/A1/A2 byte-identical except the block). The primed block is rendered from a pinned per-fixture arm spec (`experiments/arm-blocks/<fixture>.json`) + the authored archetype entries, and is **C1-linted before injection**. Arms self-skip on fixtures with no spec. Dry-run-verified through `battery:mock`. *(Placebo length-matching is a required pre-live content fix — see §8 + the sso-greenfield arm spec note.)*
2. ~~**produces/consumes annotation pass + a deterministic JOIN scorer.**~~ ✅ **DONE** (2026-06-02) — the join scorer (`eval/join.mjs`, mutation-tested) + the **live annotation pass** `eval/extract-interfaces.mjs` (per-bead local extraction over an INJECTED annotator — `runner/annotator.mjs` `makeClaudeAnnotator` live, stub for tests — a vocabulary-alignment canonicalizer, merge-by-planKey, node set held constant) + the Step-2 A/B `eval/extraction-ab.mjs` (Arm-1 model `depends_on` vs Arm-2 extraction→join). Selftest `eval/selftest/extract-interfaces.selftest.mjs` (20 assertions). Zero-spend pipeline demo on sso-greenfield (oracle annotation as stub): Arm-2 recovers **88.2% @ 100% precision** vs Arm-1 0% unwired. The **live A/B** (model annotator, spends money) is the gated next step — it measures whether a *model* extracts interfaces well enough to approach that ceiling.
3. ~~**Archetype artifact format + C1 intake lint.**~~ ✅ **DONE** (2026-06-02) — `eval/c1-lint.mjs`: a structural (field-level, faithful to CURATION C1) lint that rejects any entry storing an edge (`from`/`to`/`edge`/`dependsOn` field; illegal `resolvesTo`). The primed strategy `assertC1`s before injecting. Selftest `eval/selftest/c1-lint.selftest.mjs` (13 assertions) + confirms our 6 authored archetypes are C1-clean. *(Prose-level edge smuggling is out of deterministic scope — the bounded adversarial judge's job, per §3 caveat.)*
4. ~~**Manifest partition tags + a partitioned set-recall scorer.**~~ ✅ **DONE** (2026-06-02) — `scoreGenerativeCoverage` returns `edgeCoverageByPartition` (library-covered vs **seam** sufficiency recall) when the manifest tags edges; the runner emits it per-run on the scorecard + aggregates mean±stddev over K; `scorecard.schema.json` carries the optional field. Selftest `eval/selftest/partition-recall.selftest.mjs` (10 assertions). *(Inert on the current unpartitioned fixtures; live the moment a partitioned fixture — `hearth` — is registered.)*
5. ~~**Step 0 mutation harness**~~ ✅ **DONE** — pointed at `scoreEdgeCoverage` + the join scorer (NOT `catch-rate.mjs`). See `STAIRCASE-RESULTS.md`.
6. ~~**The open-question channel.**~~ ✅ **DONE** (2026-06-02) — `parse-snapshot.mjs` `coerceGaps`/`parseReply`; `snapshotContract(ids, {openQuestions:true})` (opt-in, so swarm/expand-audit prompts stay byte-identical); single-session returns `{snapshot, gaps, cost}`; adapter validates optional `gaps[]`; the runner already routed `result.gaps` to `scoreCatchRate`. Proven end-to-end in `eval/selftest/open-question-channel.selftest.mjs` (17 assertions): a surfaced question that matches a planted gap is now *counted*.
7. ~~**Fix the argv→stdin transport.**~~ ✅ **DONE** (2026-06-02) — `model-client.mjs` now pipes the prompt via stdin (`spawnCapture`, `-p` with no positional) instead of argv. Verified with `node tools/transport-smoke.mjs` (a 200 KB prompt — far past the argv limit — round-trips; non-zero exit + stderr + missing-binary all reject cleanly).

---

## 8. Open risks a null result must survive (from the adversarial review — verdict: SOUND-WITH-FIXES)

**A null is *not* interpretable as designed.** Before spending, add:

- **Manipulation check** — a deliberately *strong* archetype block (known to encode covered surfaces) must move A2, proving the channel *can* move. Otherwise a null might just mean "this authored block was weak."
- **Headroom / difficulty pre-flight** — run A0 at K≥3 first and confirm covered recall is materially <1 **and seam recall is materially >0 with variance**. If A0's seam recall floors near zero (FINDINGS: single-session wired ~18% of edges), **anchoring is unmeasurable** and invariant 4 passes *vacuously* — the fixture can't test the thing that matters. Treat a floored A0 seam recall as a **NO-GO**, not a pass.
- **Held-nodes-constant fix** — single-session enumerates *and* annotates in one pass, so priming changes the **packet set**, not just the derivation. Either split into two passes (freeze A0's nodes, run the produces/consumes pass per-arm over identical nodes) or report packet-count deltas and restrict scoring to shared-node-derivable surfaces. As written, `A2>A1>A0` can't be attributed to derivation vs enumeration.
- ~~**Strengthen the placebo** — equal *tokens* ≠ equal *structure*.~~ ✅ **DONE** (2026-06-02) — the A1 placebo IS now a **mismatched-archetype** block: real archetypes for *different* features (sso-greenfield: `file-upload` + `crud-resource`, off-topic for auth) rendered in the **identical structure** as the primed block and **length-matched** (~1.09× primed). So A1 holds *concreteness + structure + length* constant; **A2 > A1 isolates the archetype's content-FIT**, not "a concrete checklist focuses the model." This gives a richer 3-arm read: A2-vs-A0 (does the right archetype help at all?), A2-vs-A1 (content-fit vs any concrete archetype-shaped block?), A1-vs-A0 (does a *wrong* archetype help via concreteness or hurt via anchoring-to-wrong-domain?). *Trade-off:* this drops the pure-length-only neutral control — add it back as a 4th arm (the `placebo` free-text fallback in the arm spec) if you want to isolate raw length separately.
- **Pre-register the indeterminate branch** — `|covered delta| < 1 pooled stddev` = NO-GO (premise not demonstrated), not a soft pass. Bind GO/NO-GO to the named primary cell (sonnet) before seeing data.

---

## 9. Cost & the minimum decisive experiment

- **Free first:** Step 0 (ruler mutation-test) + Step 1 (lattice + join-ceiling on sso-greenfield's existing manifest). **If Step 1's ceiling is low, STOP — decisive, $0.**
- **Full decisive pass:** 3 arms × 2 models × K3–5 single-session ≈ 18–30 method runs. Method-side ~$3–7; **judge/verifier dominates** (~$25–55 historically) → budget **$30–70** all-in for one fixture.
- **Minimum decisive (cheapest GO/REJECT/NO-GO):** pay the free pure-code debt; then **one model (sonnet), 3 arms (A0/A1/A2), K=5 ≈ 15 runs**, gated behind the headroom pre-flight + manipulation check, scored on the two pure-code primaries (covered recall, seam recall) + precision. **~$10–20.** Add haiku, older tiers, the open-question verifier rate, and the second fixture only to resolve an INCONCLUSIVE.

---

## 10. Sequenced next steps

1. ~~**Step 0** — mutation-test the surface/edge ruler.~~ ✅ **DONE** (2026-06-02) — `eval/selftest/ruler-mutation.selftest.mjs`, 36 assertions; both the recall ruler (`scoreEdgeCoverage`, proven transitive) and the join ruler (`scoreJoin`, recall + precision) pass. Pointed at the edge scorer, not catch-rate. See [`STAIRCASE-RESULTS.md`](STAIRCASE-RESULTS.md).
2. ~~**Step 1** — resource lattice + join; read the ceiling on sso-greenfield.~~ ✅ **GO** (2026-06-02) — `eval/lattice.mjs` + `eval/join.mjs` + `npm run join-ceiling`: **ceiling 88.2%, precision 100%**, the 2 un-mediated edges are intrinsic ordering/containment (not lattice gaps). The reframe is alive.
3. ~~**Build §7.1–§7.6 + the placebo control.**~~ ✅ **DONE** (2026-06-02) — primed/placebo arms (placebo = length-matched **mismatched-archetype** control, §8), C1 lint, partition scorer, §7.2's live annotation pass + Step-2 A/B all built + self-tested (**238 selftest assertions**; `battery:mock` green). The full apparatus exists. **What now gates a live run is methodology/content + a human gate, not code:** registering the multi-feature **`hearth`** fixture (an **independent second author** writes its partitioned manifest — `experiments/archetype-premise/hearth/HEARTH-STATUS.md` — then lock/planted-gaps are scaffolded and the bundle is hash-pinned) and the **manipulation-check + headroom pre-flight** so a null is interpretable.
4. **Second author** writes Hearth's partitioned manifest blind; opus checks it's not a relabel; **hash-pin**.
5. **Pre-flight** A0 on Hearth (headroom + non-zero seam recall) + the **manipulation check**.
6. **Run the minimum decisive matrix** (sonnet, A0/A1/A2, K5); read the two-sided verdict. Expand only if INCONCLUSIVE.
