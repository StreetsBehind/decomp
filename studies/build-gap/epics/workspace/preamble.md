All functions share one context object `ctx`:

- `ctx.session` — the authenticated caller: `{ userId, orgId, role }`, where `role` is `'member'` or `'admin'`.
- `ctx.db.users` — a Map from userId (string) to a user record `{ id, orgId, name, bio, role }`.
- `ctx.db.projects` — a Map from projectId (string) to a project record `{ id, orgId, name }`.
- `ctx.db.comments` — an array of comment records, each `{ id, projectId, authorId, orgId, body, createdAt }`.

The system is multi-tenant: every user, project, and comment belongs to an organization (`orgId`).
