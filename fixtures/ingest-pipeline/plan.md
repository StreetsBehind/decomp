# ingest-pipeline — plan

We receive data as files that land in an inbox location, and we need a dependable batch pipeline
that turns those files into clean, loaded warehouse records. The pipeline runs over a set of files
as one batch: pick them up, check them, drop the records that are not trustworthy, remove
duplicates, load what remains, and tell a person if something went wrong.

## Intent

The stages run in order, and order matters: we cannot de-duplicate records we have not parsed, and
we cannot load records we have not validated and de-duplicated. A single bad record should not take
down the whole batch — the pipeline should set it aside and keep going with the good ones.

De-duplication has to consider not just duplicates *within* a single batch but also records we have
already seen in previous runs. And the load step must be idempotent: if the same file is processed
again — because a run was retried, or a file was re-dropped — the warehouse must end up in the same
state, not with doubled rows.

When a run fails, silence is the worst outcome. Someone needs to be alerted, with enough context to
understand what failed and pick up from there.

## What "good" looks like

- Dropped files get picked up and ingested.
- Bad records are rejected without poisoning the batch.
- Duplicates — within the batch and against history — are not loaded twice.
- Valid, de-duplicated records land in the warehouse, and re-running the same input is a no-op.
- A failed run alerts a human with actionable context.

The supporting machinery every dependable pipeline needs is for the team to work out; this plan
states the outcomes and the ordering, not the task list.
