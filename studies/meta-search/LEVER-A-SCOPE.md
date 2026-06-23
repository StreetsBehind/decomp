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
