Implement a function that lists projects for the current user.

Write an ES module that exports a function:

  export function listProjects(ctx) { ... }

Context you are given at call time:
- `ctx.session` — the authenticated caller: { userId, orgId, role } (role is 'member' or 'admin').
- `ctx.db.projects` — a Map from projectId (string) to a project record { id, orgId, name }.

Behaviour:
- Return an array of the project records.

Return ONLY the JavaScript module code. No prose, no markdown.
