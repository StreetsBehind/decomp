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

### Cross-cutting rules (apply on EVERY surface they touch)
- **Tenancy:** a caller may only read or write records belonging to their own `ctx.session.orgId`. New
  records (projects, comments) are stamped with the caller's `orgId`, never a client-supplied one. A read
  (e.g. listing) returns only the caller's-org records. Operating across orgs throws.
- **Authorization:** `addMember` requires the caller to be an `admin`. `postComment` requires the caller
  to be a member of the project. `updateProfile` requires the caller to be the target user or an admin.
- **No mass-assignment:** `updateProfile` may change only `name` and `bio`; it must never let `patch` set
  `id`, `orgId`, or `role`.
