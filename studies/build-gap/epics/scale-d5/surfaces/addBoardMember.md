Implement adding a member to a board.

Write an ES module that exports a function:

  export function addBoardMember(ctx, boardId, userId, role) { ... }

- Record that the user `userId` is a member of the board `boardId`, with the given `role`
  (`'member'` or `'admin'`).
- Return the created membership.
- If the board or the user does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
