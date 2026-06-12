Implement a function that posts a comment.

Write an ES module that exports a function:

  export function postComment(ctx, body) { ... }

Context you are given at call time:
- `ctx.session` — the authenticated caller: { userId, orgId, role }.
- `ctx.db.comments` — an array of comment records.
- `body` — the comment text (string).

Behaviour:
- Append a new comment, authored by the caller, to ctx.db.comments and return it.
  A comment record has the shape: { id, authorId, orgId, body, createdAt }.

Return ONLY the JavaScript module code. No prose, no markdown.
