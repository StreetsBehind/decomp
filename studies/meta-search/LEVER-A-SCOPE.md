# Lever A — scoping diagnosis (what "generalize the seam past membership" actually is)

> **Run: 2026-06-23.** $0 dump-replay (`diag-seam-residual.mjs`, no gateway) over the committed ladder's raw
> draws (`runs/dump-ladder/`). Attributes the non-membership integration stall (approval/lifecycle/quota,
> i42–63, Δi −.50 — the axis Lever A targets per [`AMENDMENTS.md`](AMENDMENTS.md) 2026-06-23). Reads the
> verdict against the committed `--floor` worst-of-K: per cell, the gating (min-integration) **admissible**
> draw, the residual the deterministic seam-gate leaves, and its class.

## Method

For each of the 12 non-membership cells × 8 draws: apply the floor (`validate-surface`), run
`resolveSeamProfile` + the generalized seam-gate's **deterministic** Mode-A surgical-init (no model rebuild →
$0), grade raw vs after-seam with the frozen oracle, classify the residual with `census-classify`'s
form/semantics/incompetence taxonomy. The gating draw = min integration over admissible draws (matches the
committed worst-of-K).

## The finding — profile detection is NOT the gap; the residual is a 3-way mix

`resolveSeamProfile` resolves a writer/reader/store profile on **all 12 cells** (approval/approvals,
lifecycle/transitions, quota/ledger). So the "generalize the seam past membership" work is **already built at
the detection level** (`src/seam-gate.mjs`). The integration stall is NOT "the gate no-ops"; it is a mix of
residuals, only some of which Lever A can admissibly touch:

| cell | gating draw i_raw→i_seam | integration residual (oracle `why`) | class → owner |
|---|---|---|---|
| approval-d1 | 0→0 | `generateUniqueId is not defined` | coding-bug → **(B) repair-gate** |
| approval-d2 | 50→50 | `Not admin`; `release not approved` | over-authz **(B) contract** + approve→execute **(Lever B)** |
| approval-d3 | 33→33 | `Request not approved`; `payoutApprovals.get is not a function` | approve→execute **(Lever B)** + Map/Array drift **(A1)** |
| approval-d4 | 25→25 | `Unauthorized`; `Only admins can create releases` | over-authz **(B)** + approve→execute **(Lever B)** |
| lifecycle-d1 | 50→50 | `Doc is not published` | seam — **ambiguous (A vs Lever B ordering)** |
| lifecycle-d2 | 25→25 | `Doc is not published`; `orderTransitions.has is not a function` | seam + Map/Array drift **(A1)** |
| lifecycle-d3 | 25→25 | `ctx.db.transitions.get is not a function` | Map/Array drift **(A1)** |
| lifecycle-d4 | 38→38 | `ctx.db.docs.getOrDefault is not a function` | invented-method coding-bug → **(B) repair** |
| quota-d1 | 0→0 | `Wallet not found` | profile coverage gap: createWallet→withdraw seam **(A2)** |
| quota-d2 | 0→0 | `Only an admin may withdraw credit` | over-authz → **(B) contract** |
| quota-d3 | 8→8 | `withdraw the remaining 30 succeeds`; `the 50 is still there…`; `only 40 charged ⇒ 60 remains` | conservation **(Lever B)** |
| quota-d4 | 19→19 | conservation (as d3) + `Insufficient funds` | conservation **(Lever B)** |

### The partition of the 12 gating draws

- **Genuinely Lever-A admissible (surfaces-only seam):**
  - **A1 — deterministic cross-surface container-style reconciliation** for Map-vs-Array drift (the
    `.get/.has is not a function` residuals): **approval-d3, lifecycle-d2, lifecycle-d3**. The seam-gate
    already injects the writer's write-statements on a Mode-B drift route-back, but a `.get is not a function`
    is a *container-type* conflict (reader calls `.get()` on what the writer made an Array). Forcing the reader
    to the writer's container type is **surfaces-only and likely deterministic** ($0, no model) — the cleanest
    Lever-A win.
  - **A2 — the second (existence) seam** the quota profile does not model: `createWallet → {deposit,withdraw}`
    wallet-existence (`Wallet not found`, **quota-d1**). The profile's writer regex (`^deposit|grant|…`) misses
    `createWallet`; quota has *two* seams (existence + conservation), only one is wired. Adding the
    existence-seam pair is surfaces-only.
- **Lever B / the (C) crux (5 cells):** approve→execute ordering (**approval-d2/d3/d4**) + conservation
  arithmetic (**quota-d3/d4**). These need a *semantic invariant* — the `modeCIssues` hook
  (`seam-gate.mjs:143`), which is exactly Lever B and the committed admissibility boundary: enforcing them
  requires encoding intended behavior, so they are **not** Lever A.
- **(B) levers already in the stack, gating on a non-seam axis:** repair-gate coding-bugs (**approval-d1**
  `generateUniqueId`, **lifecycle-d4** `getOrDefault`); contract-gate over-authz (**approval-d2/d4**, **quota-d2**
  `Only an admin…`). The seam is not the bottleneck on these draws — a (B) lift on the gating draw shifts which
  draw is the min.
- **Ambiguous (1 cell):** **lifecycle-d1** `Doc is not published` — could be transition-ordering (Lever B) or a
  drift/coverage seam (A). Disambiguated by the rebuild-replay below.

## What this does to the Lever-A plan

**Lever A is narrower than "generalize the seam" implied — and the (C) core is already visible.** Roughly:
**2–4 cells** are genuinely Lever-A-admissible (A1 drift reconciliation + A2 quota existence-seam); **5 cells**
are Lever-B semantics (approve→execute, conservation); the rest are **(B) levers already in the stack** gating
on the wrong axis. This is *good news for the A→B sequence*: it front-loads the (C) diagnosis (the semantic
residuals are already named) and bounds Lever A to two concrete, surfaces-only mechanisms.

### Recommended build sequence

1. **(micro, before coding) Confirm the Mode-B gap with a live-rebuild replay** on the drift draws (approval-d3,
   lifecycle-d2/d3) — this diagnosis ran **detection-only** (Mode-A surgical init; the Mode-B *model* route-back
   was disabled to stay $0/stationary), so the `.get/.has` residuals are AFTER Mode-A only. The ladder ran the
   full seam-gate (with rebuild) and still stalled at i42–63, which *suggests* a real Mode-B gap — confirm it
   before building, so A1 does not duplicate existing machinery. (Replay = `$0` free gateway, non-stationary, on
   the exact dumped draws.)
2. **A1 — deterministic cross-surface container-style reconciliation** in `seam-gate.mjs` (surfaces-only: read
   the writer's container type for the declared store, coerce the reader's access to match; no model, no
   intended-behavior literal).
3. **A2 — quota existence-seam** (`createWallet → withdraw/deposit`): extend the quota profile to the
   wallet-existence pair (surfaces-only verb/store coverage).
4. **Re-run the exact floor ladder** (`--ladder … --floor --retry 3 --k 8`) and read the pre-registered decision
   tree (AMENDMENTS.md 2026-06-23): lifecycle+quota integration rise within δ of baseline → (B) seam confirmed →
   CONTINUE; approval stays collapsed + smoke-clean → approval isolated on approve→execute → the clean Lever-B/(C)
   test.

## Admissibility check (the committed guard)

A1 and A2 read **only** the generated surfaces + the public declared store (container type, verb/store
reachability) — **no literal of intended behavior**. They pass the surfaces-only discriminator. The
approve→execute / conservation residuals do **not** (they require the semantic invariant) → they are Lever B,
by the committed boundary. No frozen invariant is touched; the seam-gate is a P2 lever.

## Caveat

Detection-only ($0): Mode-A surgical init applied, Mode-B *model* route-back NOT replayed (hence i_raw == i_seam
on the gating draws — the deterministic init does not move these particular residuals). The attribution of
*residual class* is robust (it is the oracle's `why` on the dumped code); the split of the drift cells between
"existing Mode-B repair already handles it" vs "Lever A must strengthen it" is what step 1 above resolves.

---

## STEP 1 RESULT (2026-06-23, live-rebuild replay, `replay-seam.mjs`, $0 free gateway) — Mode-B gap CONFIRMED

Replayed the EXACT gating drift draws through the GENERALIZED seam-gate with a **live** free-gateway route-back
(the same config the ladder used: `{kind:'deterministic', repairDepth:2}`). Result table:

| cell/draw | profile resolved | gate detect | live route-back | grade Δ | drift residual after live gate |
|---|---|---|---|---|---|
| lifecycle-d3/d3 | `transitions` (w3/r3) | mism 1, rep 2 | rewrote advanceDoc+getPublic | **i25→25, c67→67 (0pp)** | `transitions.get`, **`articleTransitions.set`** still throw |
| lifecycle-d2/d8 | `transitions` (w2/r2) | mism 1, rep 2 | rewrote advanceDoc+getPublic | **i25→25, c60→60 (0pp)** | **`orderTransitions.has`** still throws |
| approval-d3/d2  | `approvals` (w3/r3)   | **mism 0, rep 0** | — (nothing detected) | **i33→33, c90→90 (0pp)** | **`payoutApprovals.get`** still throws |
| lifecycle-d1/d7 | `transitions` (w1/r1) | mism 1, rep 2 | rewrote advanceDoc+getPublic | **i50→50 (0pp)** | residual `Doc is not published` (NO `is not a function`) |

**Three load-bearing conclusions:**

1. **The Mode-B *model* route-back does NOT close container drift — CONFIRMED.** On lifecycle-d2/d3 the live
   gate rewrote surfaces with a real model and moved the grade **0pp**; the `.get/.set/.has is not a function`
   drift survives. So a deterministic A1 does **not** duplicate existing machinery — that machinery
   demonstrably fails on this exact residual. *(Second confirmation: the ladder ALSO ran `--shapegate`, whose
   model-routed shape-repair targets the same class — and the drift still survived the full ladder.)*

2. **The bigger gap is store RESOLUTION + COVERAGE, not just style coercion.** The actually-broken stores
   (`orderTransitions`, `articleTransitions`, `payoutApprovals`) are NOT the single store the gate resolves
   (`transitions`, `approvals`). `resolveSeamProfile` returns ONE declared store and mis-pairs writers/readers
   by index, so it is **blind** to the real seam on these multi-store topologies (approval-d3: **mism 0**).

3. **lifecycle-d1 is DISAMBIGUATED → NOT container drift.** Its residual is `Doc is not published`
   (ordering/published-state) with NO `is not a function` → it belongs to the Lever-B/ordering bucket, not A1.

**What the dumped code shows about the residual (read directly):** the drift is **genuine cross-surface
data-model divergence**, not a clean container-type flip — and the program ALREADY assessed+rejected a naive
deterministic map↔array rewrite (`src/shape-gate.mjs:103-112`: "irreducibly SEMANTIC … a mechanical rewrite
that guessed the key-field would risk a net-negative … until there is >n=1 evidence"):
- **quota-d1/d1 (`Wallet not found`) — CLEAN, deterministically fixable:** `createWallet` writes
  `ctx.db.wallets[id] = wallet` (**object-property** style) while `withdraw`/`deposit` read
  `ctx.db.wallets.get(id)` (Map; base store pre-seeded as a Map). Both existing gates MISS it (shape-gate only
  inspects *method calls*, not `X[k]=`; seam-gate resolves `ledger`, not `wallets`). Fix = `X[k]=v` →
  `X.set(k,v)`. **Mechanical, surfaces-only, no key-field guess.**
- **lifecycle-d2/d3, approval-d3 — STRUCTURAL divergence, NOT safely deterministic:** e.g. lifecycle-d2
  `createOrder` uses `orderTransitions` as a **Map<id, t[]>** while `advanceOrder`/`getFulfilled` use it as a
  **flat Array** (and `advanceOrder` overwrites the Map with an array); approval-d3 `approvePayout` uses
  `payoutApprovals` as a flat Array while `approveRelease` uses `.get`/`.put` (invalid). Reconciling these needs
  a key-field/grouping guess = the very net-negative the program's hard rule forbids.

---

## STEP 2 RESULT (2026-06-23) — Lever A built + $0-validated; reaches 3 cells, ZERO regressions

**Built:** `src/container-recon.mjs`, wired as a deterministic pre-pass into `runSeamGate` (non-membership path
only; membership delegates earlier → byte-identical). Two layers, both surfaces-only, no model:
- **(safe core)** object↔Map write/read reconciliation (`X[k]=v`→`X.set`, `X[k]`→`X.get`) + init-type matching,
  on canonically-Map stores — fixes the class all existing gates miss (quota-d1 `wallets`).
- **(guarded structural-flatten, RATIFIED 2026-06-23)** Map-of-arrays → flat-array on a store the PUBLIC
  contract declares an **array** (or strong array consensus): collapses `if(!X.has(k))X.set(k,[]); X.get(k).push(rec)`
  → `X ??= []; X.push(rec)` (idiom-1, no key-field guess) and the read idioms `X.get(k)||[]`→`X.filter(e=>e.K===k)`
  (key K derived from the surfaces' OWN record literals). **STRUCTURAL POST-CONDITION:** if any map method on the
  declared-array store survives the rewrite (a read-modify-write *writeback* `X.set(k, arr)`, or an invalid `.put`),
  the whole surface transform is **reverted** — a safe miss, honoring "a false repair is worse than a miss."

Validation bundle GREEN: `gates/container-recon-smoke.mjs` 16/16, seam-gate smoke 22/22 (membership
bit-identical, `recon=null`), **P0 5/5 GREEN**, frozen tree `studies/build-gap/` untouched. The live ladder path
(`coevo-rung1.mjs`) wires the `validate-surface` no-regress guard into the seam-gate call.

**$0 causal replay (`diag-lever-a.mjs`, deterministic recon OFF vs ON over the committed ladder draws,
worst-of-K=8, floor-admissible):**

```
quota-d1     worst-of-K integ  OFF 0%  → ON 25%   ▲ +25pp   (object-write→Map.set wallet seam)
lifecycle-d2 worst-of-K integ  OFF 25% → ON 50%   ▲ +25pp   (idiom-1 flatten of createOrder)
lifecycle-d4 worst-of-K integ  OFF 38% → ON 44%   ▲ +6pp    (idiom-1 flatten)
all 9 others                               0pp
LEVER-A $0 CAUSAL SUMMARY: 3 cells lifted, 0 regressed, 14 transforms applied
```

**Read:** Lever A causally lifts **3 cells, zero regressions**. The guarded flatten doubled-plus the reach (1→3)
over the safe core. The cells it does NOT reach — **lifecycle-d3 `advanceDoc` (RMW writeback) and approval-d3
`approveRelease` (invalid `.put`)** — are exactly the read-modify-write / genuinely-broken cases the
post-condition reverts as safe misses; they need a true semantic restructuring (the program-rejected
net-negative) or the model route-back (which STEP 1 showed fails). So Lever A is **correctly built, admissible,
and load-bearing on the reachable seam class**; the unreachable residual is route-incompetence on cross-surface
data-model consistency ((B) by Premise #2, not (C)). Lifts are partial-to-cell (lifecycle-d2 25→50, not →100)
because those draws carry OTHER residuals (ordering = Lever B; `getOrDefault` coding-bug = repair-gate) on top
of the seam. **→ proceed to STEP 3 (the exact floor ladder) with Lever A in the stack** — the pre-registered
decision-tree GO signal (lifecycle+quota integration rise) is partially met at $0.

---

**Decision (on-script, $0-validated before the 12h ladder):** build A as the **SAFE** deterministic transforms
only — multi-store seam coverage + Mode-A across ALL non-base stores + **object↔Map write-style reconciliation**
(`X[k]=v`→`X.set`), each **smoke-no-regress-guarded** (a transform ships only if the surface's own smoke errors
do not increase — honors "a false repair is worse than a miss"). The structural map-of-arrays↔flat-array flatten
is left OUT (program-rejected; net-negative risk). Then a **$0 dump-replay over all 12 non-membership cells**
measures causal lift BEFORE paying for the ladder. Per the AMENDMENTS.md 2026-06-23 decision tree, cells that the
SAFE lever cannot reach (the structural-divergence lifecycle/approval drift) are a legitimate pre-registered
outcome ("A mis-built / fails surfaces-only on those → NOT (C)"), and the run cleanly isolates *reachable*
(quota-wallet style) from *unreachable-without-restructuring* drift.
