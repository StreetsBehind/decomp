Implement tracker creation.

Write an ES module that exports a function:

  export function createTracker(ctx, input) { ... }

- `input` is `{ name }`.
- Create a new tracker record and add it to `ctx.db.trackers`, keyed by a new unique string id.
- Return the created tracker record.

Return ONLY the JavaScript module code. No prose, no markdown.
