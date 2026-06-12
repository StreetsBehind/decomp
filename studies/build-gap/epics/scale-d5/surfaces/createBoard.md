Implement board creation.

Write an ES module that exports a function:

  export function createBoard(ctx, input) { ... }

- `input` is `{ name }`.
- Create a new board record and add it to `ctx.db.boards`, keyed by a new unique string id.
- Return the created board record.

Return ONLY the JavaScript module code. No prose, no markdown.
