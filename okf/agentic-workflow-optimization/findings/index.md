# Findings — what the `decomp` program has established

The empirical learnings of this repository, distilled from `docs/REPORT-2026-06-16.md` and its sources.
These are the "genes" and the "fitness" a future workflow search would build on, and several of them are
results the program can *contribute* to the field.

# The reframe — what to measure

* [The lethal quadrant](lethal-quadrant.md) - Completeness is cost-of-omission, not coverage; 37% of edges are silent+expensive, and uniform recall is censored by the cheap quadrant.
* [Build-as-discovery](build-as-discovery.md) - The build recovers most edges for free; spend upfront discovery only on the lethal quadrant. Decomposition = scaffold + generative fill + verification.
* [Completeness prior-art](completeness-prior-art.md) - No completeness guarantee exists anywhere; capture-recapture is the only numeric lens, and it is blind to shared blind spots.

# The measurements — cheap vs frontier on Build

* [Obligation-blindness is tier-independent](obligation-blindness-tier-independent.md) - Every model tier floors the same dangerous obligations; it's a spec/harness gap, not a model gap.
* [Frozen-skeleton + retry = bare opus at $0](frozen-skeleton-plus-retry.md) - The harness that closes the gap; skeleton fixes cohesion, retry fixes reliability, both necessary.
* [The size × harness crossover](size-harness-crossover.md) - The bar erodes with epic size while the contender stays flat — cheap+harness beats frontier per dollar above ~9 surfaces.
* [The skeleton double dissociation](skeleton-double-dissociation.md) - Shape buys integration, obligations buy uniformity; only both yield a cohesive epic — attribution/conformance made concrete.

# The negatives & cautions

* [The edge-join negative](edge-join-negative.md) - Model-extracted interfaces lose to a trivial baseline; a stronger model didn't fix a structural bottleneck.
* [The archetype premise](archetype-premise.md) - Accumulated patterns smuggle wrong assumptions without a curation gate — the case against naive accumulation loops.

# The infrastructure

* [The jnoccio gateway + retry lever](jnoccio-gateway.md) - The $0 free-model supply and the structural retry that makes the cheap tier usable.
