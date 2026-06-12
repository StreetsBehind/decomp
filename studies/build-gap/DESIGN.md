# Build-stage study — the reframe: harness **shape** × task **size** → a *cohesive* epic

_Design note, 2026-06-12. Supersedes the M0 framing as the headline of the Build stage (M0 stays as the
bare-baseline floor). Read with [`RESULTS.md`](RESULTS.md) (the data so far) and
[`../../docs/PROPOSAL.md`](../../docs/PROPOSAL.md) (the north-star). This is the "what's it going to take"
document._

---

## 0. The question, sharpened

The north-star asks: _can a cheap/local model + the right harness match a frontier model?_ The user's
steer sharpens the Build-stage version of it to a **two-variable search with a cohesion constraint**:

> **What combination of (a) harness _shape_ and (b) task _size_ lets a cheap model produce an outcome
> comparable to a frontier model run _bare_ — measured not just per task, but as one cohesive epic?**

Two things change versus M0:

1. **The bar is `frontier-bare`, the contender is `cheap + harness`.** M0 measured `cheap-bare` vs
   `frontier-bare` and found the obligation gap is mostly _tier-independent_ (both skip authz/validation).
   That was the floor. The study now is a **search over the (size × harness) plane** for the region where
   `cheap+harness ≥ frontier-bare` at lower total cost. M0's finding is _good news_ for this search: if
   frontier-bare isn't much better than cheap-bare on the things that matter, the harness only has to beat
   a beatable bar.

2. **The unit of success is an _epic_, not a task.** A set of build sessions that each pass their own
   tests but do **not** assemble into one working, consistent system is a **failure**. Cohesion is a
   first-class outcome, co-equal with per-task pass-rate.

---

## 1. Why cohesion is THE crux (and the structural disadvantage of cheap building)

A frontier model building a whole epic in one context **wrote both sides of every seam** — it cannot
disagree with itself about an interface. The moment you decompose an epic into N tasks and build each in
its own session (which is exactly how you make a cheap model tractable, and how `/build-batch` already
works), you introduce failure modes that **no single-task oracle can see**:

- **Interface drift** — task A writes membership as `ctx.db.members: Map<projectId, Set<userId>>`; task B
  reads `project.members: userId[]`. Both pass their own unit tests; together they don't compose.
- **Cross-cutting fragmentation** — tenancy/authz must hold on _every_ surface. A per-task build naturally
  enforces it on _most_; the one task that forgets is a hole in the epic even though it's green.
- **Duplicated / contradictory logic** — two tasks each invent an auth check, differently.
- **Shared-type divergence** — `orgId` here, `tenantId` there.

This is precisely where the frontier model's whole-context build has a **structural** edge, and it is the
edge the harness must recover by other means. It also maps directly onto this repo's existing keystone
finding: the **lethal quadrant** (silent + expensive misses — authz/RLS, tenancy, consistency) found in
`KILL-TESTS.md` is _disproportionately cross-cutting_. The dangerous misses live at the seams. So
**cohesion is where the lethal quadrant lives**, and a study that only scores isolated tasks is blind to
the exact failures that matter most.

---

## 2. Measuring outcome at TWO levels (both deterministic, both free to grade)

### 2a. Per-task (the M0 metrics, unchanged)
`valid` (runnable) · `happy` (stated requirement) · `obligation` (the silently-missed guards). Grades a
single session's module against its two-bucket oracle.

### 2b. Epic cohesion (new) — three executable sub-metrics over the _assembled_ outputs
The N task outputs are written into one temp "repo" and graded by oracles that span modules:

1. **Wireability** — do the independently-built modules import and call each other without throwing? The
   floor: a seam that doesn't even link is a hard cohesion failure. (binary per seam → % of seams that link)
2. **Integration pass-rate** — end-to-end flows that import ≥2 modules and exercise a path no single task
   owns (e.g. _admin in org-A creates a project and adds a member → that member can comment, a user in
   org-B cannot list it or comment on it_). Catches interface drift and cross-module obligation holes.
3. **Cross-cutting uniformity** — for each cross-cutting obligation (tenancy, authz, mass-assignment), the
   fraction of _applicable surfaces_ that actually enforce it. One forgetful task drops this below 1.0
   **even when every task passes its own unit tests.**

**Why this finally makes the size axis informative.** M0's methodological catch was that bare per-task
obligations are floored at 0, so a bare size sweep is flat. Cross-cutting **uniformity** is _not_ floored:
it's a continuous fraction that moves with both chunk size and harness. The cohesion instrument is the
thing that lets task-size actually modulate a measurable outcome.

---

## 3. The size axis = seam count (the U-curve we're hunting)

At the epic level, "task size" is **how finely you decompose** — chunks per epic:

| chunk size | # tasks (seams) | per-task difficulty | cohesion risk |
|---|---|---|---|
| small (1 surface/task) | many | low (cheap models win) | **high** (many seams to drift) |
| large (whole epic/task) | one | high (cheap models break) | low (one context, no seams) |

So total **cost-of-omission** is a **U** in chunk size: small chunks are easy-but-fragmented, big chunks
are cohesive-but-too-hard-for-cheap. There is an **interior optimum**, and crucially **the optimum moves
with the harness** — a strong cohesion lever (e.g. a frozen shared contract) flattens the cohesion-risk
side and lets you decompose _finer_ (smaller, cheaper, more-reliable chunks) without paying a seam tax.

**The deliverable of this stage:** for each tier × harness, the chunk size `s*` that minimizes total
cost-of-omission. That `s*` is exactly the instruction the **decompose** stage needs ("emit chunks of size
≈ s\*"). This closes the loop the proposal drew between stages.

---

## 4. The lever menu, split by scope

M0 showed the per-task levers; cohesion needs a _different_ set. The research is which levers, at what
size, close the gap to `frontier-bare`.

### 4a. Per-task levers (lift one session's quality)
- **Retry / best-of-K** — re-sample on invalid/failed; the cheap-vs-frontier _reliability_ gap. (cheap)
- **Assignment / priming** — name the obligations in the spec. (cheap; M1)
- **Per-task checker + re-prompt** — run a guard, feed the failure back. The proposal's strongest single
  lever (a cheap checker guarding a cheap generator).
- **Sub-decomposition** — split a too-big chunk before building.

### 4b. Cohesion levers (make N sessions compose) — _the new frontier of the study_
- **Shared contract / skeleton-first** _(hypothesised strongest)_ — generate the shared types + function
  signatures + the membership/record representations **once**, freeze them, and inject the same contract
  into every task build. This is what `/vision`'s "frozen skeleton" does; here we measure its cohesion
  payoff in dollars. It directly kills interface drift because both sides of every seam are handed the
  same shape.
- **Cross-cutting obligation contract** — inject the tenancy/authz/mass-assignment rules _uniformly_ into
  every applicable task (the obligations library at epic scope), so the cross-cutting concern can't
  fragment.
- **Integration gate + repair** — after assembly, run the integration/consistency oracle; route each
  failure back to the offending task for a fix. Epic-level verification (the strongest lever, applied at
  the seam).
- **Context-carry (sequential) vs isolated (parallel)** — let each task see prior tasks' outputs. A
  _shape_ knob: trades cost/latency for coherence. The two extremes bracket the harness-shape axis.
- **Keystone-first ordering** — build the most-depended-on surface first as the anchor; conform the rest.
- **Integrator pass** — a final cheap reconciliation session that sees all pieces and only fixes seams.

"Harness **shape**" (the user's word) = _which_ of these are active, _composed how_ (e.g. skeleton-first +
parallel-isolated + integration-gate is a different shape than sequential-carry + integrator-pass), and at
_what granularity_ they run. The study maps shape → outcome, not just lever-present/absent.

---

## 5. The apparatus to build (and its anchors)

```
epic fixture ──► decompose into N task specs (fixed; the size knob picks the chunking)
                      │
       ┌──────────────┴───────────────┐
   FRONTIER-WHOLE                 CHEAP-ISOLATED  (+ optional cohesion levers)
   one frontier call,            N cheap calls, each sees 1 chunk
   sees the whole epic           (the harness re-supplies what the shared context would have)
   = THE BAR                          = THE CONTENDER
       │                                  │
       └──────────────┬───────────────────┘
              assemble outputs into one temp repo
                      │
        multi-module oracle: per-task buckets  +  wireability  +  integration  +  cross-cutting uniformity
```

Pieces needed (none exist yet beyond the single-module M0 sandbox):

1. **Epic fixture** — `studies/build-gap/epics/<name>/`: a shared domain model, K connected surfaces, ≥2
   cross-cutting obligations, small enough to build _whole_ in one frontier call (so the bar is real) yet
   rich enough to _fragment_ under decomposition. (Concrete proposal in §6.)
2. **Multi-module sandbox** — extend `lib/sandbox.mjs` to accept a _set_ of named modules (a `{files}`
   map), write them as a mini repo, and run oracles that `import` across them. Output contract: the
   frontier-whole call emits `{ "files": { "<name>.mjs": "..." } }`; each cheap-isolated call emits one
   named module; the assembler merges them under the fixture's agreed file names.
3. **Cohesion oracle** — three test buckets that span modules: `wire`, `integration`, `crosscut`
   (per-obligation uniformity), in addition to each surface's own `happy`/`obligation`.
4. **Orchestration** — `epic-run.mjs`: run the two anchors and any lever set, assemble, grade, and emit
   the per-task **and** cohesion metrics with cost. Mirrors `run.mjs`'s tier/cost plumbing.

The cost shape is friendly: frontier-whole = 1 big call; cheap-isolated = N free calls; oracles are free.
So a full cohesion sweep is **cheap to run**, which is why this is the right place to invest.

---

## 6. The concrete first epic fixture — `workspace` (multi-tenant project workspace)

Shared model: `ctx.session {userId, orgId, role∈{member,admin}}`, `ctx.db.{users,projects,members,comments}`.
Five surfaces (the natural decomposition units, each a candidate chunk):

| surface | happy | cross-cutting obligation(s) |
|---|---|---|
| `createProject(ctx, {name})` | creates a project in caller's org | tenancy (stamps caller orgId) |
| `listProjects(ctx)` | returns projects | **tenancy** (only caller's org) |
| `addMember(ctx, projectId, userId, role)` | adds a membership | **authz** (admin only), tenancy (same org) |
| `postComment(ctx, projectId, body)` | appends a comment | **authz** (must be a member), tenancy |
| `updateProfile(ctx, userId, patch)` | patches a user | authz (self-or-admin), **mass-assignment** |

**The built-in interface-drift trap:** `addMember` _writes_ membership and `postComment` _reads_ it. Two
isolated cheap sessions must independently agree on the membership representation or `postComment` can't
tell who's a member — they pass their own unit tests and fail integration. The **skeleton lever** (freeze
the membership shape) is exactly the fix, so this fixture _discriminates_ between harness shapes.

**Integration flows (cross-module):** admin-A creates a project + adds member-A → member-A can comment,
non-member-A cannot, user-B (other org) can neither list nor comment. **Cross-cutting uniformity:** across
{create, list, addMember, postComment}, the fraction enforcing tenancy; across the three mutations, the
fraction enforcing authz.

---

## 7. The milestone ladder (cheapest-first; each can kill the next)

- **M0 — bare per-task floor.** _Done; opus added this session_ — confirms tier-independence at the top of
  the ladder, not just the sonnet proxy. (`run.mjs --transport claude` now sweeps sonnet **and** opus.)
- **M-coh-0 — anchors. ✅ DONE (2026-06-12).** frontier-whole (bar) vs cheap-isolated-bare. **C1 CONFIRMED:**
  a cohesion gap opens even where per-task quality is fine (happy 90–100% everywhere; X-CUT/integ collapse
  for all but opus). opus-whole-bare is the only *bare* cohesive epic ($0.25); sonnet-whole-bare is NOT
  (29% X-CUT). See RESULTS M-coh-0.
- **M-coh-1 — the skeleton lever. ✅ DONE.** Frozen-contract injection takes the free pool 31%→100% X-CUT
  (when wired); reliability (invalid chunks) capped epic-pass at 60%.
- **M-coh-1.5 — stack retry. ✅ DONE. C2 CONFIRMED.** `cheap-skeleton-retry` = **5/5 cohesive epics at $0**,
  matching opus-bare on every metric. Levers orthogonal: skeleton=cohesion, retry=reliability, both needed.
- **M-coh-2 — ablate the skeleton** (shape-only vs obligations-only) + the integration-gate+repair lever.
- **M-coh-2.5 — skeleton provenance (NEW, the crux):** cheap- vs frontier- vs hand-generated skeleton. Is
  the win "all free" or "one amortizable frontier call + N free builds"? (RESULTS "crux caveat".)
- **M-coh-3 — the size × harness surface.** Scale the epic UP past one frontier context; find where
  opus-whole degrades and whether skeleton+cheap holds. Output `(s*, harness*)` for decompose.
- **M-coh-4 — verdict.** The Build-stage row of the proposal's stage-by-stage map. _Partial verdict already
  in hand: given a skeleton, cheap+retry meets opus-bare on epic cohesion at ~$0; open on skeleton
  provenance + scale._

---

## 8. What success looks like (the falsifiable claims)

- **C1 (cohesion gap exists): ✅ CONFIRMED (M-coh-0).** Per-task happy 90–100% everywhere, yet X-CUT/integ
  collapse for everything except opus-whole; cheap-isolated lands 31% X-CUT / 27% integ / 0 epics.
- **C2 (a lever closes it): ✅ CONFIRMED (M-coh-1.5).** skeleton + retry over free isolated chunks = 5/5
  cohesive epics at $0 = the opus-bare bar. Conditional on a correct skeleton (see provenance caveat).
- **C3 (interior optimum): OPEN — M-coh-3.** Reframed: not only "optimal chunk size" but "at what epic size
  does monolithic-frontier break, and does skeleton+cheap hold past it?" The instrument exists; the sweep
  is next.

C1 and C2 hold, so the reframe is alive and the leading harness shape is identified (frozen-skeleton +
retry). The remaining deliverable is the size×harness surface + the skeleton-provenance accounting — i.e.
*how much* frontier (if any) the harness still needs, and at what epic scale the cheap harness wins
outright. That concrete recommendation is the thing nobody currently has.

---

## 9. Resuming & parallelizing the next milestones (start here in a fresh session)

**Baseline state:** C1+C2 confirmed; instrument committed + mutation-tested (`npm run selftest` → suite
`epic-oracle`). The harness is now **fixture-agnostic**: `epic-run.mjs --epic <name>` loads
`epics/<name>/` and `--skeleton-file <path>` overrides the injected skeleton — so the three follow-on
tracks **add** files/fixtures rather than editing the core or the oracle.

**Do they depend on one another?** They are three *orthogonal cuts on the same confirmed base*, and **none
hard-depends on another's finding**:

| track | the question it answers | touches | spend |
|---|---|---|---|
| **M-coh-2** (ablate) | *why* the skeleton works — shape-clause vs obligations-clause; + integration-gate lever | new `skeleton-*.md` under workspace + `--skeleton-file`; a new lever fn | ~free |
| **M-coh-2.5** (provenance) | *where* the skeleton comes from — cheap vs frontier vs hand-generated, and does it amortize | a small `gen-skeleton.mjs` → feeds `--skeleton-file`; reuses everything else | a few frontier calls |
| **M-coh-3** (scale) | *how far* it holds — at what epic SIZE does monolithic-frontier break, does cheap+skeleton hold past it | NEW `epics/<bigger>/` fixtures (each a mutation-tested oracle) + a chunk composer | larger frontier-whole calls |

**Verdict: YES, parallelizable across sessions** — they share no finding-level dependency. To parallelize
safely:
1. **Branch/worktree each track off the committed baseline** (the `Agent` tool's `isolation:"worktree"`
   is built for this). Don't run two tracks in the same working tree.
2. **Keep every edit ADDITIVE:** new fixtures = new `epics/<name>/` dirs; new harness behaviour = new
   `CONDITION_DEFS` keys or a new lever file; new runs = `runs/mcoh-<epic>-…`. **Do NOT refactor
   `epic-run.mjs`'s core or `tests.mjs`/the sandbox on a track branch** — any shared-core change must land
   as a *coordinated baseline commit first*, then the tracks rebase. (The `--epic`/`--skeleton-file`
   parameterization was done precisely to remove the last forced shared-core edit.)
3. **Each track owns its own RESULTS subsection** to avoid prose merge conflicts.

**One soft coupling:** M-coh-2's mechanism result would *focus* 2.5 and 3 (if the obligations-clause
dominates, provenance/scale center on generating/preserving *that*). Cheap to run M-coh-2 first if
sequential; safe to run blind and reconcile if parallel. **If resourcing two in parallel, pick M-coh-3
(the headline crossover) + M-coh-2.5 (the crux on whether frontier is eliminated or merely amortized);**
fold M-coh-2 in or run it first-and-fast.

**New-fixture contract (for M-coh-3 authors):** `epics/<name>/` needs `preamble.md`, `surfaces/<s>.md`
per surface, optional `skeleton.md`, and `tests.mjs` exporting `EXPECTS` (surface list + order) + `happy`
+ `crosscut` + `integration` buckets, each test taking the assembled `api`. **Mutation-test it before
trusting any model numbers** — clone the `tools/epic-oracle-selftest.mjs` pattern (correct → full marks;
a drift mutant → integration drops alone; a no-guards mutant → crosscut collapses while happy stays green).

**Per-track resume kit:** read this DESIGN (§0, §4 levers, §7 ladder, this §9) + RESULTS "M-coh"; memory
pointer [[research-pivot-cheap-vs-frontier]].
</content>
