# Oracle #2 — the independent hand-authored grader (P3 prerequisite)

> **Status (2026-06-17): BUILT + GREEN.** `src/oracle2.mjs` + `gates/lib/oracle2-tests-d1.mjs` +
> `gates/g-oracle2.mjs`. The gate passes 7/7: no false positive on the reference, **K6 = 1.000 on both
> lethal buckets** (≥ 0.90 floor), oracle #1 ⇄ #2 **agree on all 16 frozen mutants**, and the second
> provenance class is shown to add lethal-bucket coverage oracle #1 lacks. Additive — the content-pinned
> `studies/build-gap/` tree (FREEZE §1, `1580944…`) is imported read-only and **verified untouched**.
> Re-run: `node studies/meta-search/gates/g-oracle2.mjs`.

## Why this exists — what it unblocks

The entire epic battery's ground truth is **one** `scale-oracle.mjs` template ("oracle #1"). A re-coded
*runner* over that same oracle inherits its exact correlated blind spots, so anything it grades is
generator-circular. The freeze therefore requires a **second, independently authored oracle** as a distinct
*provenance class* (DESIGN §6 G2, lines 329–331; §10 anti-rot, lines 469–475). It is the gate on:

1. **"confirmed" promotion (§10).** A record reaches `confirmed` only on recurrence across **≥2 distinct
   provenance classes**; before P3 the *only* generator-independent axis is a distinct hand-authored oracle.
   "confirmed" promotion (and therefore **knowledge-conditioning**, deferred in P2c for exactly this reason)
   was BLOCKED until this file exists. It now exists.
2. **The P3 sequestered-TEST grader.** P3 scores the frozen winner **once** on the ≥80-epic TEST set via a
   *separately-implemented grader whose ground truth is an independent hand-authored oracle* — "not merely a
   re-coded runner over the same `scale-oracle.mjs`, which would inherit the same correlated bug" (§6, lines
   366–367). Oracle #2 is that ground truth.

## The provenance-class boundary — shared *spec*, independent *mechanism*

Independence is meaningful only if the two oracles grade the **same obligations** by **different detection
logic**. The boundary is drawn precisely:

| | **SHARED (the spec)** | **INDEPENDENT (the mechanism)** |
|---|---|---|
| Surfaces | the surface schema (fn + store names) via `domainsFor` — the apples-to-apples surface set | — |
| Obligations | the lethal quadrant: tenancy, authz, mass-assignment, the membership seam, cross-org isolation | — |
| Representation rule | never read `db[membersDb]`; membership established via add\*Member, observed via post\*/list\* | — |
| Bucket contract | `{ EXPECTS, happy, crosscut, integration }`, each `{ name, run(api) }` — a drop-in for `evaluateEpic` | — |
| **Detection** | — | **example-based** (oracle #1) vs **property-based + metamorphic + differential** (oracle #2) |
| **Inputs** | — | 4 fixed actors / orgs `org-1,org-2` (oracle #1) vs **seeded-random** actors over **3 orgs** `oa,ob,oc` (oracle #2) |
| **Relation** | — | concrete expected-value asserts (oracle #1) vs invariant / set-equality / state-no-op-delta / model-diff (oracle #2) |

Oracle #2 imports **`domainsFor` only** (the surface schema = spec). It does **not** import `buildOracle`
(oracle #1's detection logic). It lives under `studies/meta-search/`, never under the pinned `build-gap/`
tree, so adding it does not perturb the freeze hash.

## Per-obligation mechanism map (independence is per-cell, not just in aggregate)

| Bucket · obligation | Oracle #1 (example-based) | Oracle #2 (independent) |
|---|---|---|
| crosscut · tenancy@create | one caller `m1`, `orgId:'org-2'`, assert `p.orgId==='org-1'` | **property**: randomized caller×role × randomized adversarial `input.orgId` (foreign/garbage/absent), assert **stored** org == caller across 16 trials |
| crosscut · tenancy@list | seed `{org-1,org-2}`, assert one in / one out | **metamorphic set-equality**: randomized multi-org seed, assert listed set == *exactly* caller-org set (soundness **and** completeness) |
| crosscut · tenancy@addMember | one fixed cross-org throw | **property**: randomized org pairs A≠B + roles, assert throw |
| crosscut · authz@addMember | one member-role caller throw | **property + state-no-op**: randomized non-admin role, throw **and** the un-added target still cannot post |
| crosscut · authz@post | one non-member, assert throw + no record | **property + delta**: randomized non-member, throw **and** leaf-store count delta == 0 |
| crosscut · authz@updateProfile | `m1`→`m2` throw | **property**: randomized non-admin→other-user, throw + name invariant |
| crosscut · mass-assign@updateProfile | one fixed `{role,orgId,id}` patch | **property**: randomized *subset* of protected keys with adversarial values, assert all three invariant |
| integration · SEAM+ | `m1` added → `m1` posts | **differential vs model**: randomized member, added-then-post must succeed with correct author + exactly one persisted (never reads the member store) |
| integration · SEAM− | fixed `m2` refused | **property**: randomized same-org non-member refused + no-op |
| integration · ISO | fixed `x2` (org-2) | **property**: randomized foreign-org user neither sees (list) nor posts; randomized over all foreign orgs |

The randomized inputs defeat any surface that overfits oracle #1's fixed ids/orgs; the set-equality and
no-op-delta relations defeat assertion-specificity gaming.

## Validation results (`gates/g-oracle2.mjs`, 7/7 PASS)

- **No false positive.** The correct reference earns full marks under oracle #2: crosscut **7/7**,
  integration **3/3**, happy **4/4**.
- **K6 met with margin.** Kill-rate on the genuine single-obligation mutant battery: crosscut **1.000
  (10/10)**, integration **1.000 (6/6)** — both at the ceiling, ≥ the frozen floor **K6 = 0.90**.
- **Oracles agree.** For all **16** frozen mutants, oracle #1 and oracle #2 make the **same** lethal-bucket
  kill decision (no disagreement → the K6 "two oracles must not disagree" clause holds → the battery is
  trustworthy).

## Independence VALUE — not merely a second copy

Two "evasion" surfaces (correct under oracle #1's *fixed* scenarios in some respect, defective in general).
These are **independence evidence, NOT a defect claim** against the frozen oracle #1, and are **excluded
from the K6 agreement set**:

| evasion | oracle #1 lethal-kill | oracle #2 lethal-kill | reading |
|---|---|---|---|
| `evade_list_truncate_first` (returns only the *first* own-org record) | **miss** | **kill** | the clean win: a leak-of-omission that oracle #1 catches only in the low-weight **happy** bucket; oracle #2's set-equality completeness catches it in the lethal **crosscut** bucket |
| `evade_list_leak_nonorg2` (leaks every foreign org except literal `org-2`) | kill | kill | both catch it (oracle #1 via its ISO cross-org-visibility cell, which happens to use `org-2`) — reported honestly: this one does **not** distinguish the oracles |

The first case is the substantive demonstration: oracle #2 promotes an omission defect that oracle #1
under-weights into the lethal quadrant — the kind of coverage a genuinely independent provenance class adds.

## Determinism & additivity

- **Deterministic.** All randomness is the frozen mulberry32 RNG (`src/rng.mjs`), seeded per-cell by a fixed
  tag, forked off a never-advanced root → the battery is bit-reproducible and order-independent (required for
  a once-scored P3 TEST and the per-cell veto).
- **Additive / freeze-safe.** `git rev-parse HEAD:studies/build-gap` == `1580944…` (the FREEZE §1 pin);
  working tree under `build-gap/` is empty; P0 re-validated GREEN (oracle #2 touches no frozen path).

## What remains (toward P3)

- **D > 1 / diverse templates.** This validation is on the **scale-d1 anchor** (D=1), exactly as the frozen
  G2 validates oracle #1. `buildOracle2(domains)` is already general over any domain set; the **diverse epic
  templates** (the other P3 prerequisite — the generator currently emits only size-variants of one template)
  will each carry an oracle-#2 `tests.mjs` for the ≥80-epic TEST set spanning the `n_eff` seam-topology floor.
- **Wire into §10.** Use oracle #2 as the second provenance class in the `confirmed`-promotion rule, which
  also unblocks the deferred knowledge-conditioning mechanism (P2c §10).
- **P3 grader role.** Oracle #2 becomes the independent grader that scores the frozen winner once on the
  sequestered TEST.
