Implement adding a member to a tracker.

Write an ES module that exports a function:

  export function addTrackerMember(ctx, trackerId, userId, role) { ... }

- Record that the user `userId` is a member of the tracker `trackerId`, with the given `role`
  (`'member'` or `'admin'`).
- Return the created membership.
- If the tracker or the user does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
