# Methods

The external methods for automatically optimizing agentic systems, grouped by
[what they optimize](/concepts/optimization-targets.md). Each card records: target, search strategy,
feedback signal, headline results, maturity/license, and relevance to this program.

# Prompt / instruction text

* [GEPA](gepa.md) - Reflective prompt evolution over a Pareto front; MIT, API-only deployable, up to 35× fewer rollouts than RL. The recommended optimizer for this program's M5.
* [MASS](mass.md) - Staged joint prompt+topology search; key lesson: prompts dominate topology, good topologies are rare. ICLR 2026.

# Modular modules

* [AgentSquare](agentsquare.md) - Search over Planning/Reasoning/Tool-use/Memory modules with an in-context surrogate; +17.2% over human designs.

# Workflow topology / graph

* [AFlow](aflow.md) - MCTS over code-represented workflows; MIT; cheap models beat GPT-4o at 4.55% of cost. ICLR 2025 Oral.
* [AgentSwift](agentswift.md) - Hierarchical MCTS guided by a trained 7B value model to cut the ~$60-per-eval cost.
* [EvoFlow](evoflow.md) - Niching evolution of a diverse population of heterogeneous cheap-model workflows; matches o1-preview at 12.4% cost.
* [AutoMaAS](automaas.md) - Cost-aware NAS over a query-conditioned architecture distribution with an operator lifecycle.
* [SEW](sew.md) - Self-evolving multi-agent workflows for code generation; studies workflow representation; +12% on LiveCodeBench.

# Full agent code / full system

* [ADAS](adas.md) - The foundational meta-agent-writes-code baseline; Apache-2.0; ICLR 2025.
* [OpenEvolve](openevolve.md) - Open-source AlphaEvolve; MAP-Elites + islands over code; Apache-2.0; fitness quality is everything.
* [AlphaEvolve](alphaevolve.md) - DeepMind's closed-source origin of the code-evolution line; real algorithmic discoveries.
* [CodeEvolve](codeevolve.md) - Open-source evolutionary coding agent (CVT-MAP-Elites); matches AlphaEvolve on 5/9 at ~10× lower cost.
* [SwarmAgentic](swarmagentic.md) - PSO building full agentic systems from scratch; EMNLP 2025; +261.8% over ADAS (low base — read the caveat).
* [AgentFactory](agentfactory.md) - Self-evolution via accumulated executable subagents (2026, recent — verify).

# Context-engineering skills

* [Meta Context Engineering](meta-context-engineering.md) - Bi-level evolution of context skills; directly challenges the "hand-crafted harness" assumption this program leans on (2026, recent — verify).
