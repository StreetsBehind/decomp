Implement updating a user profile.

Write an ES module that exports a function:

  export function updateProfile(ctx, targetUserId, patch) { ... }

- Apply `patch` (e.g. `{ name, bio }`) to the target user's record in `ctx.db.users` and return the
  updated record.
- If the target user does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
