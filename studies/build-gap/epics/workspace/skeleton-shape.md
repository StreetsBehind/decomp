## Shared contract (frozen — every surface MUST conform to this)

These decisions are fixed for the whole epic so the independently-built surfaces compose. Do not invent
your own variants.

### Shared data shapes
- **Membership lives in `ctx.db.members`** — an array of records `{ projectId, userId, role }`. There is
  one record per (project, user). To add a membership, push such a record (replacing any existing record
  for the same project+user). To test whether a user is a member of a project, look for a matching record
  in `ctx.db.members`. (If `ctx.db.members` is undefined, treat it as an empty array and create it.)
- Project records are `{ id, orgId, name }` in `ctx.db.projects`. Comment records are
  `{ id, projectId, authorId, orgId, body, createdAt }` in `ctx.db.comments`.
- New ids are unique non-empty strings.
