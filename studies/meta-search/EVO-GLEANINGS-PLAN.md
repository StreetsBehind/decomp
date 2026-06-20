# Plan — integrating the 6 evo gleanings into the meta-search instrument

> **Status: DISPOSED 2026-06-19 — codex×opus deliberation CONVERGED (run `runs/deliberations/20260619T220547Z`,
> brief: [`DECISION-BRIEF.md`](../../runs/deliberations/20260619T220547Z/DECISION-BRIEF.md)).** All six gleanings
> **ADOPTED** (none rejected, none touches a frozen invariant); five carry concrete changes, #4 is re-sequenced.
> The converged disposition below is authoritative; the original PROPOSED body is retained beneath it for
> provenance. Anchors: [`DESIGN.md`](DESIGN.md) rev.3, [`FREEZE.md`](FREEZE.md), [`AMENDMENTS.md`](AMENDMENTS.md).

> ## ⟢ Converged disposition (2026-06-19)
>
> **All six ADOPTED. Verdicts + load-bearing deltas vs. the body below:**
> - **#1 ADOPT w/ changes** — trigger (b) internal-vs-headline is **inert until measured INTEG exists** → it would
>   silently never fire (false all-clear). **Reclassify (b) as a hard pre-P3 proxy↔real BLOCKER, not an in-loop
>   detector**; in-loop keep only (a) plateau→halt→report. Anti-abandonment = **K8 planted-positive discriminator**
>   (re-run the known-dominating genome; still discoverable ⇒ axis is fine, the lever just hasn't paid off ⇒ can't
>   claim "wrong axis" on a disappointing-but-correct front).
> - **#2 ADOPT w/ changes** — 2a now; **2b PRE now with CORE defined epoch-relative** (P1 CORE = the 2 anchor epics);
>   2b POST audit-only mid-run, kill only post-restart, **every re-eval charged to K5**, run once at the phase
>   boundary over survivors (never per-generation — that blows K5=250).
> - **#3 ADOPT w/ changes** — registry scaffolding now (default `mu_best`, **bit-identical**); active = restart-only.
>   **Frozen ablation set = exactly `{mu_best, pareto_per_cell}`** (exclude stochastic strategies — RNG confound);
>   **`pareto_per_cell` is parent *selection*, NOT the frozen per-cell insertion *veto*** (selection ≠ survival).
> - **#4 ADOPT w/ changes + RE-SEQUENCED** — split: **`eval_epoch` stamping (default 0, bit-identical) + the
>   trigger doc move to Batch 1** (you cannot retro-stamp logs you never tagged; stamp before any long run). Only
>   the **bump operation** stays Batch 2 (= a restart event + a **new FREEZE record**, never in-place amend). Bump
>   evidence = candidate-independent reproducible defect fixture + 2nd-oracle confirmation on lethal buckets.
> - **#5 ADOPT w/ changes** (NOT "as specified") — the plan's claim that `scorecard.mjs:46` is the *single*
>   aggregation site is exactly what the `rate()` bug disproves. **First task = full-tree enumeration** of every
>   `min/mean/best/per-run` K-reducer (not just the 3 named files), then assert each consumes `worstOfK`.
> - **#6 ADOPT w/ changes** — out-of-band only; event-trigger; **≤5 typed-gene proposals/trigger into the existing
>   §8 queue**; reported per-trigger spend ceiling; **read-scope = external sources + `agentic-workflow-optimization/`
>   ONLY** (NOT `okf/hybrid-builder-domain/`, logs, or candidates — K3 leak); admission clean-restart only.
>
> **Batch 1 (additive/audit, alongside P3 prep):** #5 (full-tree) · #2a · #2b PRE (epoch-relative CORE) · #1
> (report-only + pre-P3 hard gate) · #3 scaffolding · **#4 stamping+trigger doc (moved up)**.
> **Batch 2 (one trajectory-perturbing change per clean-restart epoch, in order):** #3 active ablation → #2b POST→kill
> → #4 bump operation → #6 ideator.
> **Highest-leverage first item: #5** (full-tree enumeration). **Cross-cutting rule:** ≤1 trajectory-perturbing
> change per restart epoch; label every trace `(eval_epoch, strategy)`; never read plateau across mixed
> strategies/epochs. Full rationale + 7-question answers: the DECISION-BRIEF.

---

> **Original PROPOSED body (provenance — superseded by the disposition above where they differ):**

## The freeze-safety frame (read first)

The frozen, void-on-change-after-P1 set is small and specific (FREEZE §2–3): the **weights vector**
`(1.0,1.0,0.1,0.0)`, the **per-cell non-inferiority veto definition**, the **parity test** (δ=0.05, α=0.05),
and the **TEST-set hash** (once committed). **None of the six gleanings touch any of these.** Each falls into
one of four interaction classes:

| Class | Meaning | Freeze rule | Gleanings |
|---|---|---|---|
| **A — Documentation/process** | No code-path change | Safe anytime | #2a register, parts of #5 |
| **B — Measurement-layer audit/kill** | Operational, like §14 / K7 | Freeze-COMPATIBLE; logged in AMENDMENTS. *Mid-run it may only AUDIT/log; a new kill that changes which candidates survive waits for a clean restart* | #1 axis-check, #2b verifier, #5 lint |
| **C — Search-engine machinery (P2+)** | Changes search trajectory | **Clean-restart only** (§11 R2-10); additive scaffolding with default unchanged is bit-identical now | #3 strategy registry, #6 ideator |
| **D — Freeze-discipline formalization** | Makes the void-rule auditable | Safe; *strengthens* discipline | #4 eval-epoch |

The single cross-cutting risk the deliberation must stress-test: **a Class-B mechanism that silently changes a
live run's survivors breaks frozen-CORE comparability.** The mitigation throughout is the same — *mid-run these
mechanisms AUDIT and HALT-notify; they do not silently re-decide; promotion to an active kill happens only at a
clean-restart epoch.*

---

## #1 — Orthogonal-axis / tunnel-vision check  (Class B · highest leverage)

**What.** evo's optimize §6a: when structurally-distinct hypotheses plateau at the same score, or internal
signal is healthy while the headline metric is flat, the bottleneck is the *harness/metric/proxy*, not the next
lever. We have stacked five levers (checker → shape → contract → persistence → integration gate) on the **lever
axis** while every headline caveat lives on the **measurement axis** (opus-whole proxy, X-CUT sub-metric,
unmeasured INTEG, K=1 noise).

**Where it plugs in.** New DESIGN **§6b "measurement-axis check"**, enforced by the §14.2 watchdog *between
generations* and as a **mandatory between-phase gate**. Pre-registered, concrete triggers (no hand-waving):
- **(a) Plateau across distinct genotypes** — ≥3 Hamming-distinct genomes sit within δ (0.05) of the front-best
  fitness for ≥3 consecutive generations → fire.
- **(b) Internal-vs-headline divergence** — the in-loop reliability scalar improves while a *pre-designated
  independent signal* (measured INTEG, or the live-vs-proxy cost gap) stays flat or diverges → fire.

**On fire:** HALT-and-notify with an *axis report* (is the bottleneck the metric/proxy/harness?). The human (or
the deliberation) chooses: continue, switch axis, or bump an eval-epoch (#4) if a defect is confirmed.

**The timely application — a mandatory pre-P3 proxy↔real gate.** Before scoring the frozen winner on TEST,
this gate forces the question: *is the headline resting on the opus-whole proxy / X-CUT sub-metric / unmeasured
INTEG?* If yes, the routed baseline (STATE.md #3) and a measured-INTEG path are prerequisites, not afterthoughts.

**Validation.** A self-test that plants (a) a 3-distinct-genome plateau and (b) a healthy-internal/flat-headline
trace and asserts the check fires; a no-false-positive run on a genuinely-advancing front.

**Freeze.** Class B — touches no frozen invariant; logged in AMENDMENTS. (It only ever *halts/reports*; it never
re-decides survivors.)

**For deliberation:** which independent signal is the pre-registered "internal-vs-headline" probe? How to keep
the gate from becoming a rationalization to *abandon* a phase early (false "wrong axis")?

---

## #2 — Gaming-risk register + per-candidate verifier  (Class A + B)

**What.** evo keeps a living "Benchmark gaming risks" register (each risk mitigated by held-out / paired gate /
sanity assertion) and runs a `verifier` agent **pre and post every experiment** (leakage, subsetted-eval,
cache short-circuit, **score-reproducibility**). Our oracle-blindness defense is currently *episodic* (review
rounds + P0 gates).

**Where it plugs in.**
- **(2a) Living register** — new `GAMING-RISKS.md` consolidating DESIGN §8 ("Failure modes designed against")
  + the §2 anti-gaming constraints into one maintained table `{risk, vector, mitigation, gate, status}`, and
  **adding evo's named vectors not yet explicit**: subsetted-eval, cache short-circuit, score-irreproducibility,
  generic-hypothesis. (Oracle/test-set leakage we already cover via K3 §2.3.)
- **(2b) Per-candidate verifier** in the eval worker (`src/worker.mjs` / `src/evaluator.mjs`):
  - **PRE (conservative, add now):** assert the worker ran the **full frozen CORE battery** (all anchor epics ×
    surfaces × K runs — not a subset); assert the eval actually executed (no stale/cached scorecard). These only
    catch *broken* evals, already §4.5 hard-fails — so they are audit-grade and freeze-safe.
  - **POST (score-reproducibility):** re-run a surviving candidate's eval on a fresh logged seed set; require the
    **worst-of-K to reproduce within the K-run noise band** (reuse the credit restore-margin rule = 2× worst-of-K
    SE). Below band → flag "irreproducible."

**Freeze.** 2a = Class A. 2b PRE = Class B audit (safe now). 2b POST score-repro **hardens an existing WIN
condition** (§7 already requires "stable across seeds"), so as a P3-stage check it is freeze-safe; as a *mid-run
kill* it changes survivors → clean-restart only, and its re-eval cost must be **charged to the K5 budget** (like
credit-attribution reversions, §3).

**For deliberation:** does mid-run score-repro run as audit-only (log) or as a kill? Does the re-eval blow K5=250?

---

## #3 — Frontier strategy as a swappable, logged knob + ablation  (Class C)

**What.** evo exposes argmax / top_k / epsilon_greedy / softmax / **pareto_per_task** as a configured selection
strategy. Our parent-selection is hardcoded μ-best.

**Where it plugs in.** `src/loop.mjs:45` already has the hook: `const select = selectParents || (…topMu…)` —
and `src/map-elites.mjs:155` returns a `selectParents`. Add a **strategy registry** `{mu_best (default), top_k,
epsilon_greedy, softmax, pareto_per_cell}`. Note **`pareto_per_cell`** is the per-cell-specialist analog of
evo's `pareto_per_task` — it *keeps per-cell lethal-bucket specialists as parents*, complementing our per-cell
veto. **Default stays `mu_best`** → with the hook absent the path is **bit-identical to the frozen P0/K8 run**
(loop.mjs:42 guarantees this), so adding the registry is additive *now*.

**The point is the ablation.** In the P3 reproducibility battery (§7 "≥2 independent loop runs"), run the loop
under ≥2 strategies and require the **load-bearing-mutation identity and the scale-gate N to agree** across
strategies — a direct defense against "we overfit the search policy."

**Freeze.** Class C — a *changed active* strategy alters trajectory → clean-restart only (§11 R2-10). The
registry scaffolding (default unchanged) is additive now; the ablation is a P3 run.

**For deliberation:** pre-commit the default + the fixed ablation set + the agreement rule *before* running, or
it becomes search-policy shopping (p-hacking). Which strategies are in the frozen ablation set?

---

## #4 — Eval-epoch / fitness-defect rebaseline protocol  (Class D)

**What.** evo's `infra event --breaking` bumps an eval-epoch, excludes prior nodes from frontier/best, and
forces a rebaseline when the *fitness itself* is found wrong. **We hit this exactly** — the co-evo "rung-1
92/92" grader bug forced a re-grade of all 12 cells, done ad hoc.

**Where it plugs in.** **Net-new** (grep confirms no `epoch` field in `src/`). Add: an `eval_epoch` integer in
`src/config.mjs`, stamped on every `generation-log.jsonl` + candidate record; frontier/best/WIN filters exclude
prior epochs; a `bumpEpoch(reason, defectClass)` op that (a) requires a **pre-registered DEFECT trigger**, (b)
logs an AMENDMENTS pre-registration, (c) excludes prior-epoch nodes, (d) forces a fresh baseline re-measure.

**Pre-registered legitimate triggers (adopt evo's list):** score-formula bug; held-out / 2nd-oracle reveals
systematic gaming; instrumentation or oracle drift (a K6 regression). **NOT** a disappointing-but-correct result
(that is K1 — reported, never epoch-bumped).

**Relationship to the freeze.** This is the **disciplined form of "void rather than amend"** (FREEZE §2). It does
not weaken the freeze: a frozen-fitness defect → bump epoch + re-freeze a *corrected* fitness as a NEW
pre-registered run (new FREEZE record); prior-epoch results are excluded from any WIN. It mirrors the §11
clean-restart rule, but for fitness/oracle defects rather than gene admission.

**Freeze.** Class D — formalizes existing discipline; safe. The *only* risk is loophole abuse (peek → bad result
→ bump to escape). Guard: the trigger must be **defect-based, pre-registered, and the defect independently
confirmed** (ideally by the 2nd hand-authored oracle).

**For deliberation:** is "independent defect confirmation" strong enough to close the peek-then-redraw loophole?
What is the minimum evidence to authorize a bump?

---

## #5 — Aggregate-consistency lint (validates worst-of-K)  (Class A/B)

**What.** evo's rule: every decision path must see the *same* aggregate the decision uses; **never promote by
best-replicate**; noisy benches commit "lucky" winners. This independently *validates* our frozen worst-of-K
(§5) and targets a **real past footgun** — the `rate()` bug ([[coevo-grader-bug-and-baseline]]).

**Where it plugs in.** `src/scorecard.mjs:46 worstOfK(...)` is the single aggregation source. Add a standing
test/gate asserting that **every** decision path consumes that aggregate, never a per-run / best / mean value:
- frontier ranking, archive insertion (`perCellVetoOk` / `paretoDominates` in `src/archive.mjs` + `map-elites.mjs`),
  WIN check (§7), credit-attribution restore-margin (§3).
- A "no best-replicate" lint (static scan + a runtime assertion). **Coverage must include the side tracks** that
  carried the original footgun — `coevo-rung1.mjs`, `head-to-head.mjs`.

**Freeze.** Class A/B — enforces the already-frozen aggregation; touches no invariant; safe anytime. (Static
sibling of #2b's dynamic score-repro.)

**For deliberation:** is `scorecard.mjs` truly the only aggregation site, or do the co-evo / head-to-head tracks
re-aggregate independently (and thus need their own assertion)?

---

## #6 — Literature-ideator (open-world levers)  (Class C)

**What.** evo spawns ideator subagents that scan arXiv/web for untried techniques. Our lever-invention is
closed-world. This serves [[incompetence-is-the-target]] ("try a million combinations").

**Where it plugs in.** DESIGN §11 already specifies an **event-driven research arm** (fires on K4 collapse / K1 /
new method-card). Add a `literature-ideator` subagent (frontier — legitimate amortized R&D per §13/B4) that, on
trigger, scans external sources (arXiv/web + the `okf/agentic-workflow-optimization/` library) for cheap-reliability
/ output-QA techniques (self-repair, best-of-N, verification-guided decoding, test-generation, debate) and emits
**typed-gene proposals** (one-line failure-mode each) into the §8 bounded triage queue.

**Admission discipline (unchanged).** Every proposal → existing pipeline: encode as a typed gene preserving genome
validity → P0-style smoke → anti-gaming vet (judge untouched, can't-read-oracle, escalation charged) → **admit
only at a CLEAN RESTART** (§11 R2-10). The ideator only *proposes*; it never edits a live run. It reads *external*
literature, never our oracle/TEST, and its proposals pass the §2.3 oracle-token scan (K3).

**Freeze.** Class C — feeds the research arm; new genes admit at clean-restart only → **zero live-run freeze
impact.** Compatible with the §14 "won't-deviate" guarantee because proposal is out-of-band and admission is gated.

**For deliberation:** is a web-reading frontier ideator inside the autonomy contract? How tight is the
bounded-queue cap so this doesn't become unbounded scope creep?

---

## Sequencing

**Batch 1 — additive / zero-freeze-risk, do alongside P3 prep:**
- **#5** aggregate-consistency lint (hardens a known past bug; cheapest, highest certainty).
- **#2a** gaming-risk register (consolidation; pure doc).
- **#1** the axis-check spec **+ the mandatory pre-P3 proxy↔real gate** (the most timely single item — it directly
  governs whether P3's headline is real or proxy-bound).
- **#3** strategy-registry scaffolding (default `mu_best`, bit-identical) + **#2b PRE** guards (broken-eval hard-fails).

**Batch 2 — clean-restart / phase-boundary:**
- **#4** eval-epoch protocol (formalize *before* the next long unattended run — the grader-bug history makes this
  load-bearing for any RUN-FOR-DAYS execution).
- **#3** the strategy **ablation** run; **#2b POST** score-repro promoted to a kill; **#6** literature-ideator
  (fires on K1/K4 — most relevant once P3 risks a null).

**Highest leverage, most timely:** **#1** (pre-P3 proxy↔real gate), **#4** (eval-epoch, given long-run history),
**#5** (lint the past footgun).

## Non-goals (explicit)
- **Not** adopting evo as our engine — separate question, [`EVO-HQ-EVALUATION.md`](EVO-HQ-EVALUATION.md).
- **Not** changing any frozen invariant (weights / per-cell veto / δ-α / TEST-hash). If a gleaning ever seemed to
  require that, it is rejected, not amended.
- **Not** building yet — this is the artifact the next-session deliberation disposes of.

## Consolidated questions for the deliberation
1. **#1** — which pre-registered independent signal anchors the internal-vs-headline trigger, and how do we stop
   the axis-check from licensing premature phase-abandonment?
2. **#2b** — mid-run score-reproducibility: audit-only vs kill? Re-eval cost vs the K5=250 cap?
3. **#3** — what is the *frozen* strategy ablation set + agreement rule, pre-committed to avoid policy-shopping?
4. **#4** — minimum independent evidence to authorize an eval-epoch bump (closing the peek-then-redraw loophole)?
5. **#5** — single aggregation site, or do the co-evo / head-to-head tracks need their own assertions?
6. **#6** — is a web-reading frontier ideator inside the §14 "won't-deviate" autonomy contract, and what caps it?
7. **Cross-cutting** — do any two gleanings interact badly (e.g., #3 strategy change + #1 plateau trigger both
   perturbing the front), and what is the right batching/ordering across clean-restart boundaries?
