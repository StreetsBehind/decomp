---
okf_version: "0.1"
---

# Automated Optimization of AI-Agent Software-Building Workflows

> **Orientation — this is reference material, not the repo's goal.** The `decomp` project's current north
> star is the **hybrid cost-vs-reliability product** (`../../STATE.md`, `../../docs/PROPOSAL-HYBRID.md`):
> a system where a frontier model orchestrates and lightweight models do all the coding, beating
> all-frontier on cost at equal reliability. Automated workflow-search (the M5 horizon distilled here) is
> a **tool that comes after** the system is shown to work, not the deliverable. Here the non-gameable
> fitness is the **instrument** that proves the reliability gate; the **system is the product**.

A distilled knowledge bundle covering (a) the external research field of **automatically
searching/optimizing agentic workflows** for building software, and (b) the empirical
**findings of this repository's `decomp` research program**, plus (c) the **synthesis** that
connects them.

Compiled 2026-06-16 from primary sources (read and verified — see each concept's `# Citations`)
and from the repo's own artifacts (`docs/REPORT-2026-06-16.md`, `docs/FINDINGS.md`,
`docs/KILL-TESTS.md`, `docs/PROPOSAL.md`, `studies/build-gap/`). Numbers attributed to a paper
are quoted from that paper; numbers attributed to the repo are from its run artifacts.

The organizing thesis: automated agentic-workflow optimization is best understood as an
**evolutionary architecture search** — genes (the configurable knobs of a workflow), a
chromosome (one workflow recipe), calibration (running it on real tasks), and a fitness
function (the outcome measure). The field's open weakness is the fitness function: most methods
optimize a single, gameable, contaminatable benchmark scalar. This repo's contribution is a
**non-gameable executable fitness with a lethal-quadrant conformance term.**

# Sections

* [concepts](concepts/index.md) - The cross-cutting ideas: the evolutionary frame, the optimization-target axis, feedback signals, two-term fitness vs reward hacking, quality-diversity/Pareto search, the completeness lens, and eval cost/contamination.
* [methods](methods/index.md) - The external methods under one roof: GEPA, ADAS, AFlow, AgentSquare, AgentSwift, SwarmAgentic, AutoMaAS, OpenEvolve, AlphaEvolve, CodeEvolve, SEW, EvoFlow, MASS, AgentFactory, Meta-Context-Engineering.
* [surveys](surveys/index.md) - The landscape papers and the one skeptical critique that bounds the whole enterprise.
* [findings](findings/index.md) - What the `decomp` program in this repo has empirically established.
* [synthesis](synthesis/index.md) - Where the field and this repo meet: workflow-search is the program's M5, the non-gameable fitness is the wedge, and a concrete first experiment.
