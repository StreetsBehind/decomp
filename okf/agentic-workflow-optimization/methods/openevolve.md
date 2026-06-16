---
type: Method
title: OpenEvolve — open-source AlphaEvolve
description: Open-source evolutionary coding agent that uses LLMs to iteratively rewrite whole program files toward a user-defined executable objective.
resource: https://github.com/codelion/openevolve
tags: [full-code, MAP-Elites, islands, open-source, deployable]
timestamp: 2026-06-16T00:00:00Z
---

- **Author / venue:** Asankhaya Sharma (`codelion`). HuggingFace community blog, **May 2025**;
  open-source repo. Not peer-reviewed.

# Optimizes
**Full program/code** — editable `EVOLVE-BLOCK-START/END` regions within full multi-language source
files; also demonstrated on prompt optimization. See
[optimization targets](/concepts/optimization-targets.md), target #4.

# Search strategy
**Quality-diversity (MAP-Elites) + island model with migration**, plus "double selection" (separate
elites for performance vs. inspiration). See [quality-diversity and Pareto](/concepts/quality-diversity-and-pareto.md).

# Feedback signal
**Scalar fitness from a user-supplied executable evaluation function** returning a metrics dict
(multi-objective supported); an "artifacts side-channel" feeds stderr/profiling/LLM feedback back into
generation.

# Results
Circle packing (n=26) sum-of-radii **2.634** vs AlphaEvolve's **2.635** (within ~0.04%); GPU kernel
**2.8× speedup**; function minimization **100×** faster convergence; **+23%** on a HotpotQA prompt-opt
demo. Per-iteration cost ~$0.01–0.60 depending on model.

# Maturity & deployability
**Deployable, Apache-2.0.** Library + CLI; works with any OpenAI-compatible API (OpenAI, Gemini, Ollama,
vLLM) — so usable with local and API-only models alike.

# Relevance to this program
The clearest demonstration that **fitness quality is everything**: OpenEvolve only works if the
user-supplied evaluation is a strong executable oracle — "fitness is gameable if poorly specified." That
is precisely this program's [non-gameable-fitness wedge](/synthesis/non-gameable-fitness-wedge.md): the
program already has the hard executable oracle most OpenEvolve users must build by hand.

# Citations
[1] https://huggingface.co/blog/codelion/openevolve
[2] https://github.com/codelion/openevolve
[3] AlphaEvolve (the system it implements) — [/methods/alphaevolve.md](/methods/alphaevolve.md)
