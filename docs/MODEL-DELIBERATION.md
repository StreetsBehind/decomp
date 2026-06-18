# GPT 5.5 x Opus deliberation scaffold

This repo can run a structured two-model back-and-forth to hash out next steps
without turning model chatter directly into source changes.

Tool:

    node tools/model-deliberation.mjs

Default mode is dry-run, which writes the same artifact shape without model
spend. Live mode defaults to the local Codex CLI for the GPT side, so it can use
the ChatGPT/Codex subscription login instead of an OpenAI API key. Opus still
uses the local claude CLI.

## What it produces

Each run writes under runs/deliberations/<timestamp>/:

- manifest.json: models, context files, timing, token/cost metadata when available
- turn-*.md: each model response
- transcript.md: full back-and-forth
- brief.md: lightweight review brief plus transcript

runs/ is gitignored, so deliberation output stays scratch until a human promotes
a conclusion into STATE.md, studies/*/NEXT-*.md, or another tracked decision doc.

## Default question

The default prompt asks whether the next research step should be:

- go deeper to find the erosion frontier
- move toward freeze
- do a smaller preparatory action first

That default is based on the current STATE.md and
studies/meta-search/COEVO-RUNG1-PROGRESS.md handoff.

## Dry run

    npm run deliberate:dry

This proves paths, artifact writing, and package wiring without calling either
provider.

## Live run

Prerequisites:

- Codex CLI is logged in. The default binary path is
  /home/cstaulbee/.openclaw/npm/node_modules/@openai/codex/bin/codex.js.
- The claude CLI is logged in and can run claude-opus-4-8.
- You are comfortable spending tokens on both services.

Run:

    npm run deliberate:live

Focused question:

    npm run deliberate:live -- --question "Should we run membership d4/d5 before freezing, or freeze now?"

Model overrides:

    npm run deliberate:live -- --openai-model gpt-5.5 --claude-model claude-opus-4-8

If Codex exposes GPT 5.5 under a different model id, pass it via --openai-model
or set OPENAI_MODEL.

Optional API mode:

    OPENAI_API_KEY=... npm run deliberate:live -- --openai-provider api

API mode is useful for service accounts, but it is not the ChatGPT subscription
path.

## Protocol

The turns alternate:

1. GPT 5.5 proposes a decision frame and concrete next action.
2. Opus attacks assumptions, weak evidence, and experiment design.
3. GPT 5.5 revises or defends the plan.
4. Opus gives a final critique and recommendation.

Keep this as a decision-support tool. Do not auto-apply edits from either model.
The useful artifact is a small, reviewable decision brief, not a transcript dump.
