# Cross-cutting concepts

The ideas that organize the whole field and connect it to this repo's findings.

* [The evolutionary frame](evolutionary-frame.md) - Genes / chromosome / calibration / fitness / operators — the shared vocabulary for reading every method.
* [The optimization-target axis](optimization-targets.md) - What a method evolves: prompt text → modules → topology → full code, in rising order of cost.
* [Feedback signals](feedback-signals.md) - What guides the search: scalar reward, NL reflection, Pareto, novelty, or a learned value model.
* [Two-term fitness vs reward hacking](two-term-fitness-vs-reward-hacking.md) - The central hypothesis — performance plus a conformance term — and why this repo is an existence proof for it.
* [Quality-diversity and Pareto](quality-diversity-and-pareto.md) - MAP-Elites, islands, niching, and Pareto fronts — the machinery that stops a search collapsing to one local optimum.
* [Completeness and capture-recapture](completeness-and-capture-recapture.md) - No completeness guarantee exists; the only numeric lens is blind to shared blind spots — the constraint on every ensemble.
* [Eval cost, stochasticity, contamination](eval-cost-and-contamination.md) - Why evaluation, not the algorithm, is the binding constraint of the whole enterprise.
