---
type: Concept
title: The evolutionary frame for workflow optimization
description: Treating agent-workflow optimization as an architecture search with genes, chromosomes, calibration, fitness, and operators.
tags: [frame, evolution, search, autoML]
timestamp: 2026-06-16T00:00:00Z
---

A useful way to read the whole field: automated optimization of agentic build-workflows is an
**evolutionary / architecture search**, inherited from evolutionary AutoML and the ADAS line.

# Vocabulary

| Term | Meaning | In an agentic build workflow |
|---|---|---|
| **Gene** | One configurable knob | model-per-role, agent count, topology (planner/coder/reviewer/tester), context strategy, tool set, sandbox policy, retry/verify loops, per-role prompt text |
| **Chromosome** | One fully-specified recipe | a complete workflow configuration (a `strategy` behind this repo's adapter contract) |
| **Calibration** | Running a recipe on real tasks | this repo's *battery* (`strategy × fixture × K`) |
| **Fitness** | The outcome measure | test-pass %, resolved rate, edit distance, token cost, latency — optionally blended with a conformance term |
| **Operators** | How new chromosomes are made | crossover, mutation, elitism, random injection |

# Why the frame holds up

The field's methods differ almost entirely along *which gene they evolve* and *which operator/signal
they use* — see [optimization targets](/concepts/optimization-targets.md) and
[feedback signals](/concepts/feedback-signals.md). The frame cleanly classifies every method in
[methods](/methods/index.md): [GEPA](/methods/gepa.md) mutates the prompt gene by NL reflection;
[AFlow](/methods/aflow.md) searches the topology gene by MCTS; [ADAS](/methods/adas.md) and
[OpenEvolve](/methods/openevolve.md) evolve the full-code gene; [AgentSquare](/methods/agentsquare.md)
recombines modular genes.

# Where the frame is incomplete

The frame says nothing about *whether the fitness is trustworthy*. The single biggest determinant of
whether a search produces real improvement vs. a [reward-hacked artifact](/concepts/two-term-fitness-vs-reward-hacking.md)
is the quality of the fitness function and its evaluation — which most papers treat as a given. That
gap is exactly where this repo's [findings](/findings/index.md) contribute.

# Citations

[1] ADAS / Meta Agent Search — [/methods/adas.md](/methods/adas.md)
[2] The prompt that framed this bundle (user, 2026-06-16): borrowed the genes/chromosome/calibration/fitness/operators vocabulary from evolutionary AutoML.
