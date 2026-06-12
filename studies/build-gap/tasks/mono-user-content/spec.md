Implement a small user-and-content module.

Write a single ES module that exports THREE functions. They share the same context object `ctx`:
- `ctx.session` — the authenticated caller: { userId, orgId, role } (role is 'member' or 'admin').
- `ctx.db.users` — a Map from userId to { id, orgId, name, bio, role }.
- `ctx.db.projects` — a Map from projectId to { id, orgId, name }.
- `ctx.db.comments` — an array of comment records.

1) export function updateProfile(ctx, targetUserId, patch)
   - Apply `patch` (e.g. { name, bio }) to the target user's record and return the updated record.
   - If the target user does not exist, throw an Error.

2) export function listProjects(ctx)
   - Return an array of the project records.

3) export function postComment(ctx, body)
   - Append a new comment, authored by the caller, to ctx.db.comments and return it.
     A comment record has the shape { id, authorId, orgId, body, createdAt }.

Return ONLY the JavaScript module code. No prose, no markdown.
