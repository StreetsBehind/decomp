---
type: Survey
title: A Survey of Self-Evolving Agents — What/When/How/Where to Evolve
description: TMLR-2026 survey organizing self-evolving agents along four interrogatives — what, when, how, and where to evolve.
resource: https://openreview.net/forum?id=CTr3bovS5F
tags: [survey, taxonomy, self-evolving, TMLR, 2026, recent-verify]
timestamp: 2026-06-16T00:00:00Z
---

> **Recency flag:** TMLR Survey Certification, published **2026-01-28**, at/after a January-2026 cutoff.
> Note: this is a *different paper* from the [EvoAgentX survey](/surveys/evoagentx-self-evolving-survey.md) —
> the two were easy to conflate.

- **Authors:** Huan-ang Gao, Jiayi Geng, Wenyue Hua, Mengkang Hu, et al. (XMUDeepLIT). TMLR 2026.

# One line
Organizes the self-evolving-agents literature along four interrogatives.

# Taxonomy (the four dimensions)
- **What to evolve** — agent components: models, memory, tools, architecture.
- **When to evolve** — intra-test-time adaptation vs inter-test-time adaptation.
- **How to evolve** — by signal/mechanism: scalar rewards vs textual feedback; single-agent vs
  multi-agent (maps onto this bundle's [feedback signals](/concepts/feedback-signals.md)).
- **Where to evolve** — application domains (coding, education, healthcare; full enumeration not
  extracted).

# Relevance to this program
The cleanest mental model for *placing* this program: it evolves **architecture + context** (the
skeleton), **inter-test-time** (offline, between runs), via **textual + executable feedback**, in the
**software-building** domain. The "how" dimension is where the program's distinctive
[non-gameable fitness](/synthesis/non-gameable-fitness-wedge.md) sits.

# Citations
[1] https://openreview.net/forum?id=CTr3bovS5F
[2] https://github.com/XMUDeepLIT/Awesome-Self-Evolving-Agents
