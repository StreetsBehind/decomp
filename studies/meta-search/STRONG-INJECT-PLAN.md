# STRONG-INJECT PLAN — the frontier-AUTHORED approve→execute seam scaffold (turnkey handoff)

> **Status: BUILT + PRE-REGISTERED + VALIDATED + GO (2026-06-28, Session-12); committed; ladder PENDING.** The
> lever the user RATIFIED after the Session-11 inject ladders (the prompt-level `--inject` was a NULL —
> `LADDER-RESULTS-C.md`; the `lifecycle-d1` no-op control proved a ≥60pp route-noise floor). Rule 2(e) left
> exactly one thesis-faithful unbuilt lever: supply the obligation as **enforcing CODE in the orchestration
> layer** (M-coh-2.5). **REALIZED DESIGN — refined by a codex×opus deliberation (`runs/deliberations/20260628T145619Z/`)
> and pre-registered in [`AMENDMENTS.md`](AMENDMENTS.md) §2026-06-28 — differs from the original recon below.** The
> admissible form is NOT a frontier-authored surface that *replaces* the cheap gate (that would be closer to the
> SCOPE-SHRINK boundary); it is a DETERMINISTIC, skeleton-derived **generic primitive** (`src/obligation-scaffold.mjs`)
> injected as an extra build module (`_obligation.mjs`) that the cheap coder must **WIRE** — testing the strictly
> weaker **WIRING** hypothesis. Whether this degenerates into substitution-in-disguise is exactly what the Clause-7
> **null-wiring ablation** (`gates/null-wiring-ablation.mjs`) detects (pass-clean ⇒ SCOPE-SHRINK). **Apparatus:**
> `obligation-scaffold.mjs`, `coevo-rung1.mjs --inject-code` (default-OFF byte-identical), `null-wiring-ablation.mjs`
> (+ perturbation adjunct, the operative discriminator here), smokes `inject-code-smoke.mjs` 32/32 +
> `null-wiring-ablation-smoke.mjs` 19/19. **Validated:** P0 5/5 GREEN, inject-smoke 39/39 (no regression),
> real-oracle co-location confirmed, fail-closed `scanOracleLeak` at generation, frozen tree untouched. **GO/NO-GO:
> GO** (mechanical null-wiring is non-constructible leak-clean → the perturbation adjunct substitutes and is
> leak-clean). **▶ NEXT: run the 5-cell inject-code ladder** (`--epics approval-d1..d4,lifecycle-d1 ... --inject-code
> --floor --retry 3 --k 8`, $0 ~5h) → per-cell parity (Clause 6) + ablation (Clause 7). **The original recon below
> (the "canonical execute / substitution" framing) is SUPERSEDED by the realized wiring design + pre-registration;
> kept for the design rationale.**

## The goal

For approval **execute-family** surfaces (`execute…`/`ship…`/`settle…` with their `create…`/`approve…`), have the
FROZEN orchestration layer provide a **canonical execute implementation** — authored from the PUBLIC contract —
that enforces approve→execute SoD + execute-idempotency, replacing the cheap pool's wrong/absent gate. The cheap
pool keeps authoring everything else (listing, other surfaces, tenancy, validation).

## Admissibility (load-bearing — keep it oracle-blind)

- The canonical execute is authored from **two PUBLIC sources only**: (a) the skeleton's DECLARED contract
  (`semanticRules`/`parseCrosscutRules` — the approve→execute ordering + idempotency clauses), and (b) the
  store/field **shapes discovered from the cheap pool's OWN `create…`/`approve…` surfaces** (surfaces-only,
  call-graph/store-reads — the Lever A / `container-recon.mjs` admissibility basis). **NEVER** read the held-out
  oracle (`epics/*/tests.mjs`); encode none of its scenarios/value-literals. The substitution is deterministic
  code synthesis from public inputs (no model route-back needed; if one is added, `scanOracleLeak` every prompt).
- Honor **"false repair worse than a miss"** (the Lever A revert principle): keep the substitution ONLY if it
  passes the behavioural seam check AND the surface still parses/exports/smokes; otherwise REVERT.

## Recon captured this session (so the new session doesn't redo it)

**Execution model** (`gates/lib/behaviour-run.mjs`): one shared `ctx = { session: {orgId,userId,role}, db: {} }`
— **`db` starts EMPTY**; surfaces lazily create their own stores. Flow: `rec = await create(ctx, INPUT)` →
`id = recId(rec)` (id/_id/requestId/releaseId/payoutId/expenseId or first non-empty string) → `approve(ctx, id)`
→ `exec(ctx, id)`. Seeds: REQUESTER `{orgId:'orgLB',userId:'reqLB',role:'member'}`, ADMIN (distinct)
`{userId:'admLB',role:'admin'}`, SOLO (self-approve) `{userId:'soloLB',role:'admin'}`, INPUT `{body/title/name/
description:'bodyLB'}`. Idempotency = `auditSize(ctx)` (any `/audit/i` store, else `db.auditLog`) must NOT grow on
the 2nd `exec`. SoD-A: exec with no approval must throw. SoD-B: exec when the only approval is the requester's own
must throw. A setup throw → INCONCLUSIVE (never a false violation).

**Declared shapes — approval-d1 skeleton.md (PUBLIC):** approvals live in **`ctx.db.approvals`**, an array of
`{ requestId, approverId }` (to approve: push; to test approved: find a matching record; `undefined ⇒ []`). Record
carries server-managed `status` `'pending'|'approved'|'executed'`. Tenancy `ctx.session.orgId`; `create…` sets
`status='pending'`, `requesterId`=caller; client may not supply `status`/`requesterId`/`orgId`/`id`. `execute…`
requires a valid approval recorded by a non-requester admin; idempotent; appends exactly one audit record.
**NOTE the diverse-template zoo:** approval-d2..d4 use OTHER nouns/stores (release/payout/expense; approvals may
be a record `status`+`approvedBy` field instead of an `approvals` array). The synthesis must discover the
convention per-epic from the cheap surfaces + the declared shapes, NOT hard-code `approvals`/`requestId`.

## Design — `src/seam-author.mjs` (mirror the other gates' signature)

`runSeamAuthor({ surfaces, files, skeleton, gate, behaviouralRunner, rebuild? })`:
1. `rules = semanticRules(skeleton)`; if no `approveExecute` → **no-op** (returns ranGate:false) — keeps
   quota/lifecycle/membership byte-identical (lifecycle/membership: `semanticRules→NONE`, verified Session-11).
2. `fams = executeFamilies(surfaces)` (already exported from `semantic-obligation.mjs`: create/approve/exec triads).
3. For each fam with `exec ∈ files`: run the behavioural check (`verifyBehavioural` + the injected
   `behaviouralRunner`). If SoD or idempotency is **violated**:
   a. **Discover shapes** from `files[create]`/`files[approve]`/`files[exec]` (surfaces-only): the record store
      name, the approval mechanism (separate `approvals`-style store vs record `status`+approver field), the audit
      store name, the id/requester/approver field names. Fall back to the skeleton's declared names.
   b. **Synthesize** a canonical `exec` body from the contract template + the discovered shapes: load record by
      id from its store (tenancy-scoped by `ctx.session.orgId`); assert a recorded approval by a **non-requester
      admin** (refuse otherwise); **idempotency**: if already `executed` (status or an existing audit entry for
      this id) → return without a 2nd audit append; else apply + append exactly one audit record + set
      `status='executed'`. (Template authored ONCE from the public clauses; slots filled from discovered shapes.)
   c. **Substitute** `files[exec]` = synthesized; **re-run** the behavioural check + a smoke
      (`gates/lib/smoke-run.mjs` / parse∧export). **Keep** only if the behavioural verdict improves to ok/ok AND
      the surface still smokes; else **REVERT** to the original.
4. Return `{ files, ranGate, substituted, reverted, leak:false, detail }` for worst-of-K attribution
   (grade an `afterSeamAuthor` point).

**Open design risk to resolve while building:** if the cheap `approve…` recorded the approval in a shape the
discovery can't find (seam drift), the canonical exec can't verify it → it will (correctly) REVERT (a miss, not a
false repair). Expect partial coverage on the first iteration; that's fine — measure it. A stronger v2 could also
re-author `approve…` so the triad shares its own store by construction, but that risks crossing "cheap does the
coding" if it grows beyond the minority seam (keep the seam surgical — execute surfaces only, ideally).

## Validate → wire → measure (Task #3)

1. **Smoke** `gates/seam-author-smoke.mjs`: (a) a deliberately seam-broken `executeRequest` fixture →
   `runSeamAuthor` substitutes → behavioural verdict flips to ok/ok; (b) a surface the synthesis would BREAK →
   reverts (original preserved); (c) **no-op** when `semanticRules→NONE` (lifecycle/membership byte-identical);
   (d) oracle-blind (no `tests.mjs` import; synthesized code carries no oracle literal). Reuse the
   `makeBehaviouralRunner` child-process pattern.
2. **Wire** opt-in in `coevo-rung1.mjs` (e.g. `--seamauthor`), composed AFTER `--semantic` (Lever B verify/repair
   first, then author the seam on what still fails). Default OFF = byte-identical (mirror `--inject`/`--semantic`).
   Add to the header + `out` meta. Grade `afterSeamAuthor`.
3. **P0 5/5 GREEN** (`node p0.mjs` — run to completion, the live smoke is network-slow ~2min; background it),
   frozen tree (`build-gap`/DESIGN/FREEZE) untouched, lever smokes green.
4. **Measure**: quick read on `--epics approval-d1,approval-d2` first; then the narrowed approval ladder
   (`--epics approval-d1,approval-d2,approval-d3,approval-d4,lifecycle-d1 … --seamauthor … --k 8`, $0, ~3.5h,
   BACKGROUND/harness-tracked). Compare FINAL worst-of-K approval integration vs `LADDER-RESULTS-B.md` (inject-OFF
   i50/50/33/44) and `LADDER-RESULTS-C.md` (prompt-inject). `lifecycle-d1` = the no-op control (stays a no-op).
   Read the variance-ROBUST signal (does approval still wall UNANIMOUSLY?), not the per-cell lift (noise floor
   ≥60pp). Write `LADDER-RESULTS-D.md`.

## Verdict logic (pre-registered)

- Canonical exec **clears** the approve→execute seam across the zoo (approval integration → within δ of baseline) →
  **the thesis HOLDS with the orchestration layer authoring the seam** (a sharpened, still-winning claim; the cost
  of the frontier-authored seam is an orchestration term, already in the cost model).
- Canonical exec **still walls unanimously** (the seam drift / shape-discovery can't reach it across routes) →
  **Rule 2(e) genuinely exhausted** → clean **(C)/SCOPE-SHRINK** (claim the win on the obligation classes the
  hybrid holds; approve→execute flagged as beyond even orchestration-authored injection on a non-stationary pool).

## Pointers

- Reuse: `src/semantic-obligation.mjs` (`semanticRules`, `executeFamilies`, `verifyBehavioural`,
  `makeBehaviouralRunner`), `src/container-recon.mjs` (surfaces-only shape discovery patterns),
  `gates/lib/{behaviour-run,smoke-run}.mjs`, `src/checker.mjs` (`scanOracleLeak`).
- Records: `LADDER-RESULTS-B.md` (inject-OFF baseline), `LADDER-RESULTS-C.md` (prompt-inject null + the noise-floor
  proof), `LEVER-B-DIAGNOSTIC.md`, `STATE.md` Session-11 banners.
