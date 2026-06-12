Implement channel creation.

Write an ES module that exports a function:

  export function createChannel(ctx, input) { ... }

- `input` is `{ name }`.
- Create a new channel record and add it to `ctx.db.channels`, keyed by a new unique string id.
- Return the created channel record.

Return ONLY the JavaScript module code. No prose, no markdown.
