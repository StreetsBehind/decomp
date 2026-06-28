---
type: Finding
status: confirmed
title: The obligation-supply boundary — prompt-supply fails the stateful approve→execute seam
description: Supplying the declared obligation clears stateless per-surface crosscuts but is a NULL for the stateful, cross-surface approve→execute/idempotency seam across the whole cheap route zoo — at BOTH supply levels (prompt TEXT and a frontier-authored importable PRIMITIVE the cheap coder wires). The terminal strong-injection ladder is a SCOPE-SHRINK: cheap models wire the primitive but it is causally inert; the seam needs frontier AUTHORSHIP of the surface, not cheap wiring.
resource: studies/meta-search/LADDER-RESULTS-D.md
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

# The terminal measurement (run D — the strong injection is a SCOPE-SHRINK)
The strong injection RAN (`--inject-code`, the 5-cell terminal ladder; record `studies/meta-search/LADDER-RESULTS-D.md`).
**It does not lift the seam to parity** — all four approval cells wall (worst-of-K integration i50/75/50/69 vs the
all-frontier baseline holding i100). Critically, this is a **stronger** null than the prompt-inject: the cheap pool
**did** wire the primitive (8/8 approval draws import `_obligation.mjs` and call `enforceExecute`), so the failure
is not blindness. The pre-registered **Clause-7 perturbation adjunct** is decisive: on every parity-passing wired
route, neutralizing the primitive's admin / separation-of-duties / idempotency bindings flips **zero**
obligation-oracle tests — the injected primitive is **causally inert**; the routes that pass approve→execute pass
by their **own** re-implementation, not by delegating to the frontier-authored seam. The worst routes meanwhile
**botch the wiring outright** (`enforceExecute is not defined`). **Verdict: SCOPE-SHRINK** — the stateful obligation
seam requires frontier **authorship** of the surface, not a primitive the cheap coder wires; cheap models can
neither reliably wire it nor make it load-bearing where they do. This is a **reliability-half** result; cost
dominance is separate, unproven, and made *harder* by the lever (it adds orchestration cost with zero coding-token
savings). Rule 2(e) is exhausted; the lever menu is closed for approve→execute (the named successor — a
frontier-AUTHORED *surface* — is the thesis boundary, not another lever).

# Why it matters
It bounds the program's central lever without refuting it: *supply the obligations* holds for the obligations a
single surface can satisfy, and meets its hardest test at the stateful cross-surface seam — where supplying the
**declaration** is a null AND supplying the **enforcement primitive** (cheap wires it) is also a null, now
measured. The seam is the regime where the cheap-vs-frontier division of labour must move authorship of the
*surface* — not just the obligation — to the frontier; that crossing is the thesis boundary, so the reliability
claim is bounded to the obligation classes the cheap coder can hold. This is the falsifiable last lever on the
reliability half, exhausted — see the [two-term fitness](/concepts/two-term-fitness-vs-reward-hacking.md) framing
of obligation conformance.

# Citations
[1] studies/meta-search/LADDER-RESULTS-D.md (this repo) — run D, the strong-injection SCOPE-SHRINK (wiring null + Clause-7 inert-primitive)
[2] studies/meta-search/LADDER-RESULTS-C.md (this repo) — run C, the prompt-level inject NULL
[3] studies/meta-search/LADDER-RESULTS-B.md (this repo) — the inject-OFF full-stack worst-of-K baseline
[4] studies/meta-search/LEVER-B-DIAGNOSTIC.md (this repo) — the $0 conditioned diagnostic that first read the (C)-leaning
[5] studies/meta-search/AMENDMENTS.md §2026-06-28 (this repo) — the strong-injection pre-registration + null-wiring ablation
[6] docs/PROPOSAL-HYBRID.md (this repo) — the M-coh-2.5 / frozen-skeleton provenance
