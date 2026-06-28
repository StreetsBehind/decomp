---
type: Finding
status: confirmed
title: The obligation-supply boundary — prompt-supply fails the stateful approve→execute seam
description: Supplying the declared obligation in the build prompt clears stateless per-surface crosscuts but is a NULL for the stateful, cross-surface approve→execute/idempotency seam across the whole cheap route zoo — bounding the "supply the obligations" lever; that seam needs the obligation as enforcing CODE in the orchestration layer.
resource: studies/meta-search/LADDER-RESULTS-C.md
tags: [finding, meta-search, obligations, seam, M-coh-2.5, repo]
timestamp: 2026-06-28T00:00:00Z
---

A scope boundary on the program's central lever. [Obligation-blindness is tier-independent](/findings/obligation-blindness-tier-independent.md)
licenses the thesis with *"supply the obligations, not a bigger model."* The meta-search program bounds **where
that lever reaches** — and the boundary is the difference between a stateless requirement and a stateful seam.

# The two regimes
- **Stateless per-surface crosscuts** (authz, tenancy, input-validation, mass-assignment) — a requirement a single
  surface can satisfy locally. The obligation-contract / shape / contract gates clear these; supplying the
  obligation (in the contract or the prompt) is enough.
- **The stateful, cross-surface seam** — `approve→execute` ordering + `execute`-idempotency + audit-once. Its
  enforcement spans `create…→approve…→execute…` surfaces that are built **independently**, so no single surface
  sees the whole protocol. The cheap pool writes a structurally/behaviourally-present-but-**semantically-wrong**
  gate across the *entire* K=8 route zoo, even handed the declared rule — a variance-robust unanimous failure.

# The measurement (run C — the prompt-level inject is a NULL)
Appending the skeleton-**declared** obligation TEXT to each surface's first build prompt at authorship time
(`--inject`) did **not** clear the seam: all four approval cells still FAIL, integration i50–63 vs an
all-frontier settled baseline holding **i100**. (The `lifecycle-d1` no-op control swung ≥60pp on draw variance,
so the load-bearing read is the *unanimous wall*, not the per-cell deltas.) This refines the M0 lever:
**telling** the cheap coder the obligation is not enough for the stateful seam — the failure is not blindness to
the requirement but inability to *author* the multi-surface protocol correctly.

# The boundary implication
Where the cheap coder cannot author the seam, the obligation must be supplied as **enforcing CODE in the frozen
orchestration layer** — the M-coh-2.5 form of the [skeleton double dissociation](/findings/skeleton-double-dissociation.md)
and the [frozen-skeleton + retry](/findings/frozen-skeleton-plus-retry.md) result applied to a new, stateful
seam. The admissible realization (the "strong injection") supplies a **generic primitive** the cheap coder must
still **wire** (it tests the strictly weaker *wiring* hypothesis), not a frontier-authored surface.

# Open test (provisional — pending the ladder)
Whether the strong injection lifts the seam to parity is **not yet measured**. It is pre-registered with a
**null-wiring ablation** as the WIN-vs-SCOPE-SHRINK discriminator (a mechanical auto-wiring is non-constructible
leak-clean here → the perturbation adjunct is operative). Outcomes: cheap **wiring is load-bearing** and reaches
parity ⇒ a reliability WIN on the seam *via the wiring hypothesis*; the seam still walls unanimously ⇒
**SCOPE-SHRINK** — the stateful obligation seam requires frontier *authorship*, not cheap coding, which would
bound the cheap-vs-frontier thesis to the obligation classes the cheap coder can hold. Either way this is a
**reliability-half** result; cost dominance is separate and unproven.

# Why it matters
It bounds the program's central lever without refuting it: *supply the obligations* holds for the obligations a
single surface can satisfy, and meets its hardest test at the stateful cross-surface seam, where supplying the
**declaration** is a null and the open question is whether supplying the **enforcement primitive** (cheap wires
it) suffices. This is the falsifiable last lever on the reliability half — see the
[two-term fitness](/concepts/two-term-fitness-vs-reward-hacking.md) framing of obligation conformance.

# Citations
[1] studies/meta-search/LADDER-RESULTS-C.md (this repo) — run C, the prompt-level inject NULL
[2] studies/meta-search/LADDER-RESULTS-B.md (this repo) — the inject-OFF full-stack worst-of-K baseline
[3] studies/meta-search/LEVER-B-DIAGNOSTIC.md (this repo) — the $0 conditioned diagnostic that first read the (C)-leaning
[4] studies/meta-search/AMENDMENTS.md §2026-06-28 (this repo) — the strong-injection pre-registration + null-wiring ablation
[5] docs/PROPOSAL-HYBRID.md (this repo) — the M-coh-2.5 / frozen-skeleton provenance
