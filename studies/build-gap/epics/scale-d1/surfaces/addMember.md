Implement adding a member to a project.

Write an ES module that exports a function:

  export function addMember(ctx, projectId, userId, role) { ... }

- Record that the user `userId` is a member of the project `projectId`, with the given `role`
  (`'member'` or `'admin'`).
- Return the created membership.
- If the project or the user does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
