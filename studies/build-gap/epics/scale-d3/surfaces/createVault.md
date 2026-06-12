Implement vault creation.

Write an ES module that exports a function:

  export function createVault(ctx, input) { ... }

- `input` is `{ name }`.
- Create a new vault record and add it to `ctx.db.vaults`, keyed by a new unique string id.
- Return the created vault record.

Return ONLY the JavaScript module code. No prose, no markdown.
