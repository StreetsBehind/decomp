Implement project creation.

Write an ES module that exports a function:

  export function createProject(ctx, input) { ... }

- `input` is `{ name }`.
- Create a new project record and add it to `ctx.db.projects`, keyed by a new unique string id.
- Return the created project record.

Return ONLY the JavaScript module code. No prose, no markdown.
