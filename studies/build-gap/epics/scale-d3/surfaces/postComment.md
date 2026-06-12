Implement posting a comment on a project.

Write an ES module that exports a function:

  export function postComment(ctx, projectId, body) { ... }

- Append a new comment, authored by the caller, to `ctx.db.comments`, and return it.
  A comment record has the shape `{ id, projectId, authorId, orgId, body, createdAt }`.
- Only a member of the project may post a comment on it; otherwise throw an Error.
- If the project does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
