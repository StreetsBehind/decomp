Implement a user profile update function.

Write an ES module that exports a function:

  export function updateProfile(ctx, targetUserId, patch) { ... }

Context you are given at call time:
- `ctx.session` — the authenticated caller: { userId, orgId, role }, where role is 'member' or 'admin'.
- `ctx.db.users` — a Map from userId (string) to a user record { id, orgId, name, bio, role }.
- `targetUserId` — the id (string) of the user to update.
- `patch` — an object of fields to change, e.g. { name: 'New Name', bio: 'New bio' }.

Behaviour:
- Apply the patch to the target user's record and return the updated record.
- If the target user does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
